// BREATH — «Math that breathes»
// 8 s · 240 frames · peak (bursts into filaments) at 4.0 s
//
// A raymarched sphere whose surface is displaced by "ridged" noise
// (sharp crests → filaments). The amplitude breathes with a periodic
// bell curve; the noise turns around a circle → exact loop.

float sdBreath(vec3 p, float amp) {
  vec3 o = loopOffset(0.8);
  float r = 1.0 - abs(vnoise(normalize(p) * 2.5 + o) * 2.0 - 1.0);   // ridged
  float spikes = pow(r, 5.0);
  return (length(p) - 0.42 - spikes * amp) * 0.45;
}

void main() {
  vec2 p = centered(gl_FragCoord.xy);
  float th = TAU * uPhase;
  float amp = 0.005 + 0.24 * (0.5 - 0.5 * cos(th));

  vec3 ro = vec3(0.0, 0.0, -2.4);
  vec3 rd = normalize(vec3(p, 1.15));

  float d = 0.0, h;
  vec3 pos;
  for (int i = 0; i < 100; i++) {
    pos = ro + rd * d;
    h = sdBreath(pos, amp);
    if (h < 0.0006 || d > 4.0) break;
    d += h;
  }

  vec3 col = vec3(0.0);
  if (d < 4.0) {
    vec2 e = vec2(0.0015, 0.0);
    vec3 n = normalize(vec3(
      sdBreath(pos + e.xyy, amp) - sdBreath(pos - e.xyy, amp),
      sdBreath(pos + e.yxy, amp) - sdBreath(pos - e.yxy, amp),
      sdBreath(pos + e.yyx, amp) - sdBreath(pos - e.yyx, amp)));
    float rim  = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
    float key  = max(dot(n, normalize(vec3(-0.5, 0.7, -0.4))), 0.0);
    col = tint(0.05 + 0.18 * key + 0.85 * rim, uMid, uHigh);
  }
  gl_FragColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}
