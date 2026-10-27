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
uniform vec3  uMid;    // palette: mid tone
uniform vec3  uHigh;   // palette: high tone

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
