// ECHO — «This sound doesn't exist»
// 12 s · 360 frames · peak (the three fronts collide at the centre) at 6.0 s
//
// Three emitters in a triangle. Each one sends out a wavefront whose
// radius grows with the phase; halfway through the loop all three reach
// the centre at once → flash. The front fades out by the end of the
// loop, so the radius jumping back to 0 is never seen. Underneath,
// standing waves with an integer time frequency.

const float D = 0.24;   // distance from each emitter to the centre

void main() {
  vec2 p = centered(gl_FragCoord.xy);
  float th = TAU * uPhase;

  float R    = 2.0 * D * uPhase;           // front radius: D halfway through the loop
  float fade = 1.0 - uPhase;
  float waves = 0.0, fronts = 0.0, dots = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = TAU * float(i) / 3.0 + 1.5708;
    vec2  e = vec2(cos(a), sin(a)) * D;
    float r = length(p - e);
    waves  += sin(r * 140.0 - th * 3.0) / (1.0 + r * 14.0);
    fronts += exp(-pow((r - R) / 0.006, 2.0)) * fade;
    dots   += exp(-r * 90.0);
  }

  float flash = pow(0.5 - 0.5 * cos(th), 12.0) * exp(-length(p) * 9.0);
  vec3 col = tint(abs(waves) * 0.12 + fronts * 0.9 + dots + flash * 1.4, uMid, uHigh);
  gl_FragColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}
