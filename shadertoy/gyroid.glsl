// shaders, vol. 2 — by @formatt_studio · https://www.instagram.com/formatt_studio/
// License: MIT (see LICENSE)
// Shadertoy version: paste into the Image tab. Designed for portrait (9:16).

// ─────────────────────────────────────────────────────────────
// common.glsl — shared header for every shader in vol. 2
// Prepended to each piece at build time (WebGL1 has no #include).
//
// Loop rule: time ONLY enters as θ = TAU * uPhase,
// with uPhase = frame / N  (0 ≤ uPhase < 1). Anything time-based
// uses cos(θ) / sin(θ) or integer multiples → exact loop.
// ─────────────────────────────────────────────────────────────

const float DURATION = 9.0;           // seconds per loop
#define uRes   iResolution.xy
#define uPhase fract(iTime / DURATION)
const vec3  uMid  = vec3(0.05, 0.16, 0.12);  // palette "Jade": mid tone
const vec3  uHigh = vec3(0.62, 0.86, 0.66);  // palette "Jade": high tone

const float TAU = 6.28318530718;

// ── Noise ────────────────────────────────────────────────────
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i),                  hash31(i + vec3(1,0,0)), u.x),
        mix(hash31(i + vec3(0,1,0)),    hash31(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(hash31(i + vec3(0,0,1)),    hash31(i + vec3(1,0,1)), u.x),
        mix(hash31(i + vec3(0,1,1)),    hash31(i + vec3(1,1,1)), u.x), u.y),
    u.z);
}

float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return v;
}

// Circular offset: walking a circle through noise space comes back
// to exactly the same point → noise that loops.
vec3 loopOffset(float radius) {
  float th = TAU * uPhase;
  return vec3(cos(th), sin(th), 0.0) * radius;
}

// ── Colour: gradient map ─────────────────────────────────────
// Maps luminance v ∈ [0,1] through black → mid → high → white.
// Black stays black. mid and high come in as uniforms (uMid, uHigh):
// the palette is picked outside, without touching the shader.
vec3 tint(float v, vec3 mid, vec3 high) {
  v = clamp(v, 0.0, 1.0);
  vec3 c = mix(vec3(0.0), mid, smoothstep(0.0, 0.35, v));
  c = mix(c, high, smoothstep(0.3, 0.75, v));
  return mix(c, vec3(1.0), smoothstep(0.75, 1.0, v) * 0.85);
}

// ── Finish: scanlines and vignette ───────────────────────────
vec3 finish(vec3 col, vec2 frag) {
  vec2 uv = frag / uRes;
  col *= 0.94 + 0.06 * sin(frag.y * 3.14159);                            // scanlines
  col *= smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.0, 0.75)));  // vignette
  return clamp(col, 0.0, 1.0);
}

// Centred coordinates: y ∈ [-0.5, 0.5], x ∈ [-0.28, 0.28] in portrait
vec2 centered(vec2 frag) { return (frag - 0.5 * uRes) / uRes.y; }

// GYROID — an infinite room of translucent sheets
// 9 s · 270 frames · peak (the cavity opens up) at 6.0 s
//
// Gyroid: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = 0.
// Instead of stopping at the first wall (opaque → you only see one),
// the ray PASSES THROUGH the walls and gathers light near them:
// translucent sheets, many layers, a feeling of an endless room.
//
// Loop: the pattern repeats every 2π, so the camera moves forward
// exactly 2 periods in z per loop.

const float SCALE  = 6.0;               // cells per unit
const float PERIOD = TAU / SCALE;       // one gyroid period
const float MAXD   = 9.0 * PERIOD;      // ray reach (≈ 9 cells)

float wall(float th) {                  // sheet thickness: thinnest at 2/3 of the loop
  return 0.10 - 0.07 * cos(th - TAU * 2.0 / 3.0);
}

float gyroid(vec3 p) {                  // ∈ [-1.5, 1.5]
  vec3 q = p * SCALE;
  return dot(sin(q), cos(q.yzx));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = centered(fragCoord.xy);
  float th = TAU * uPhase;
  float t  = wall(th);

  // Camera: on the axis of a free channel (x = π/2 / SCALE, y = 0), moves along z
  // and rolls one full turn.
  vec3 ro = vec3(1.5707963 / SCALE, 0.0, uPhase * PERIOD * 2.0);
  float c = cos(th), s = sin(th);
  vec3 rd = normalize(vec3(mat2(c, -s, s, c) * p * 1.6, 1.0));

  float d = 0.0, glow = 0.0;
  for (int i = 0; i < 140; i++) {
    float g = abs(gyroid(ro + rd * d));
    float sheet = exp(-g / t * 2.0);                   // 1 on the sheet
    glow += sheet * exp(-d / MAXD * 3.0) * 0.045 * (0.03 / t);  // black fog; ÷t keeps brightness steady
    d += max((g - 0.04) / SCALE * 0.3, 0.012 / SCALE); // never stops
    if (d > MAXD) break;
  }

  vec3 col = tint(pow(glow, 1.3), uMid, uHigh);
  col += vec3(exp(-length(p) * 22.0) * 0.5);           // vanishing point
  fragColor = vec4(finish(col, fragCoord.xy), 1.0);
}
