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
