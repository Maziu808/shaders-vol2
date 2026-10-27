// shaders, vol. 2 — by @formatt_studio · https://www.instagram.com/formatt_studio/
// License: MIT (see LICENSE)
// Uniforms: uRes (vec2, canvas size in px), uPhase (float, 0..1 = frame / 300)

// ─────────────────────────────────────────────────────────────
// common.glsl — shared header for every shader in vol. 2
// Prepended to each piece at build time (WebGL1 has no #include).
//
// Loop rule: time ONLY enters as θ = TAU * uPhase,
// with uPhase = frame / N  (0 ≤ uPhase < 1). Anything time-based
// uses cos(θ) / sin(θ) or integer multiples → exact loop.
// ─────────────────────────────────────────────────────────────
precision highp float;

uniform vec2  uRes;    // 1080 × 1920
uniform float uPhase;  // 0..1, loop phase
const vec3  uMid  = vec3(0.15, 0.15, 0.14);  // palette "Monochrome": mid tone
const vec3  uHigh = vec3(0.95, 0.94, 0.90);  // palette "Monochrome": high tone

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

// INK — «It's not ink. It's GLSL.»
// 10 s · 300 frames · peak (maximum chaos) at 5.0 s
//
// Domain warping: noise bends the coordinates used to read another
// noise. Time enters through loopOffset() (a circle in noise space)
// and the amount of chaos follows a periodic bell curve.

void main() {
  vec2 p = centered(gl_FragCoord.xy);
  float th = TAU * uPhase;
  float bloom = 0.5 - 0.5 * cos(th);           // 0 at frame 0, 1 at 5 s

  vec3 o = loopOffset(0.9);
  vec3 q = vec3(p * 3.0, 0.0);
  vec2 warp = vec2(fbm(q + o), fbm(q + o + vec3(5.2, 1.3, 2.8))) - 0.5;
  float n = fbm(q + vec3(warp * 4.0, 0.0) + o * 0.6) - 0.5;

  float radius = 0.08 + 0.17 * bloom;
  float field  = length(p + warp * 0.25 * bloom) + n * (0.04 + 0.22 * bloom);
  float ink    = smoothstep(radius, radius - 0.012, field);

  // Filaments: inner edges of the blot
  float edge = smoothstep(0.02, 0.0, abs(fract(n * 6.0) - 0.5) - 0.45) * ink;
  vec3 col = tint(ink * 0.55 + edge * 0.35, uMid, uHigh);
  gl_FragColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}
