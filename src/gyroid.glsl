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

void main() {
  vec2 p = centered(gl_FragCoord.xy);
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
  gl_FragColor = vec4(finish(col, gl_FragCoord.xy), 1.0);
}
