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
