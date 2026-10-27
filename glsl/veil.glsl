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
const vec3  uMid  = vec3(0.04, 0.30, 0.16);  // palette "Green-pink aurora": mid tone
const vec3  uHigh = vec3(0.98, 0.62, 0.70);  // palette "Green-pink aurora": high tone

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

// VEIL — «No one has ever photographed it»
// 10 s · 300 frames · peak (the curtain unfolds) at 5.0 s
//
// Aurora: a curtain is a curve x = f(y) waved by FBM. We sample
// several shifted layers; each one leaves fine vertical rays that
// fade towards the bottom. The noise travels a circle
// (loopOffset) → exact loop.

void main() {
  vec2 p = centered(gl_FragCoord.xy);
  float th = TAU * uPhase;
  float open = 0.5 - 0.5 * cos(th);
  vec3 o = loopOffset(0.7);

  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    float fold = (fbm(vec3(p.y * 2.2, k * 3.1, 0.0) + o) - 0.5) * (0.25 + 0.55 * open);
    float x = p.x - fold - (k - 1.5) * 0.06 * (1.0 + open);
    float curtain = exp(-x * x * 900.0);                       // the fabric
    float rays = 0.6 + 0.4 * vnoise(vec3(p.x * 220.0, k, 0.0) + o * 3.0);
    float hang = smoothstep(-0.45, 0.1, p.y) * smoothstep(0.48, 0.25, p.y);
    col += vec3(curtain * rays * hang * (0.35 + 0.15 * k / 3.0));
  }
  col *= 0.6 + 0.8 * open;
  col = tint(col.r, uMid, uHigh);
  gl_FragColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}
