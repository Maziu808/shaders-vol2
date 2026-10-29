// ─────────────────────────────────────────────────────────────────────────────
// SOLAR VFX SHADERS  —  HDR output, designed for bloom post-processing
// All time animations are circular (cos/sin) to guarantee seamless 150 s loop
// ─────────────────────────────────────────────────────────────────────────────

export const LOOP_DURATION = 150.0;

// ─────────────────────────────────────────────
// PHOTOSPHERE (sun surface) — ultra-detailed HDR
// ─────────────────────────────────────────────

export const sunVertexShader = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vPosition;
  varying vec3  vViewDirection;

  void main() {
    vUv            = uv;
    vNormal        = normalize(normalMatrix * normal);
    vPosition      = position;
    vec4 mvPos     = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-mvPos.xyz);
    gl_Position    = projectionMatrix * mvPos;
  }
`;

export const sunFragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform float u_loop_duration;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vPosition;
  varying vec3  vViewDirection;

  float hash(vec3 p) {
    p  = fract(p * 0.3183099 + vec3(0.1));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float valueNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),
      f.z);
  }

  float fbm4(vec3 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  float fbm3(vec3 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  float fbm2(vec3 p){float v=0.0,a=0.5;for(int i=0;i<2;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  // ridged: convierte FBM en hilos/filamentos finos (picos donde n≈0.5) → "dibujo del fuego"
  float ridge(float n){ n = 1.0 - abs(2.0 * n - 1.0); return n * n; }

  // Vector FBM (3 canales decorrelacionados) → campo de desplazamiento para domain-warp.
  // El warp es de gran escala → 2 octavas bastan (más barato, look idéntico).
  vec3 fbm2v(vec3 p){
    return vec3(fbm2(p),
                fbm2(p + vec3(31.4, 11.7, 47.1)),
                fbm2(p + vec3(57.2, 83.9, 19.3)));
  }

  // Color por TEMPERATURA — paleta tomada de la referencia (HDR para el bloom):
  // granate profundo → rojo → naranja → naranja brillante → amarillo-blanco
  vec3 fireColor(float h){
    vec3 k0 = vec3(0.015, 0.0008, 0.0000); // sombra casi negra
    vec3 k1 = vec3(0.120, 0.0060, 0.0008); // granate profundo
    vec3 k2 = vec3(0.430, 0.0300, 0.0025); // rojo intenso
    vec3 k3 = vec3(1.250, 0.2200, 0.0120); // naranja-rojo
    vec3 k4 = vec3(3.800, 1.1500, 0.0900); // naranja brillante (profundo)
    vec3 k5 = vec3(9.000, 5.0000, 1.4000); // amarillo-blanco caliente
    vec3 c = mix(k0, k1, smoothstep(0.00, 0.16, h));
    c = mix(c, k2, smoothstep(0.14, 0.40, h));
    c = mix(c, k3, smoothstep(0.40, 0.66, h));
    c = mix(c, k4, smoothstep(0.62, 0.95, h));
    c = mix(c, k5, smoothstep(1.05, 1.45, h));
    return c;
  }

  void main() {
    float ratio    = u_time / u_loop_duration;
    float angle    = ratio * 6.28318530718;
    vec3  tw       = vec3(cos(angle)*0.07, sin(angle)*0.07, 0.0);
    // Hervor de superficie MUY VIVO: 3 circunferencias (2×, 4×, 6× ciclos/loop) → morfea rápido y
    // de forma compleja, además de girar la malla. Frecuencias DOBLADAS respecto al loop de 45s
    // para conservar la velocidad real del hervor ahora que el loop dura 90s. Periódicas → sin costura.
    vec3  twF      = vec3(cos(3.0 * angle + 2.1), -sin(3.0 * angle + 2.1), 0.0) * 0.26
                   + vec3(cos(6.0 * angle + 0.7), sin(6.0 * angle + 0.7), 0.0) * 0.18
                   + vec3(cos(9.0 * angle), -sin(9.0 * angle), 0.0) * 0.10;

    float cosTheta = max(dot(normalize(vNormal), normalize(vViewDirection)), 0.001);

    float edge = 1.0 - cosTheta;                 // 0 centro → 1 silueta

    // ── COORDENADA DE FLUJO (domain-warp encadenado) ─────────────────────────
    // Doble warp (warp del warp) → caos orgánico SIN repetición ni patrón.
    vec3 wp0 = vPosition * 2.4 + tw;
    vec3 q   = fbm2v(wp0);
    vec3 r   = fbm2v(wp0 + 3.2 * q + vec3(5.2, 1.3, 8.7));
    vec3 fp  = vPosition + (r - 0.5) * 0.95;      // posición arrastrada por la corriente

    // ── MAPA DE ACTIVIDAD (heterogeneidad: grandes zonas furiosas vs calmadas) ─
    float activity = fbm2(vPosition * 1.1 + r * 0.7 + tw * 0.4);
    activity = smoothstep(0.36, 0.74, activity);   // más bimodal → regiones con carácter

    // ── FILAMENTOS DE FUEGO multiescala sobre el flujo (ridged afinado) ───────
    float f1 = pow(ridge(fbm3(fp * 8.0  + tw)),        2.2);  // plumas grandes (giran con la malla, lentas)
    float f2 = pow(ridge(fbm3(fp * 18.0 + twF * 1.0)), 2.8);  // venas medias (se mueven más)
    float f3 = pow(ridge(fbm3(fp * 38.0 + twF * 1.7)), 3.4);  // hebras finas (hierven mucho)
    float f4 = pow(ridge(fbm2(fp * 72.0 + twF * 2.4)), 3.8);  // chispas muy finas (fbm2: el difuminado las suaviza igual)
    float fireDetail = f1 * 0.62 + f2 * 0.44 + f3 * 0.30 + f4 * 0.18;

    // Granulación base (cuerpo convectivo) + micro grano
    float gran  = fbm3(fp * 11.0 + tw);
    float micro = valueNoise(vPosition * 90.0 + twF * 3.0);

    // Cuerpo: granulación + filamentos, modulado por la heterogeneidad y el grano
    float body = gran * 0.22 + fireDetail * 1.00;    // más filamento, menos base lisa
    body *= (0.22 + 1.55 * activity);                // calmadas muy oscuras, furiosas brillantes
    body *= 0.82 + 0.36 * micro;

    // ── PERFIL RADIAL: centro frío (umbra) / borde caliente (anillo) ──────────
    // Frontera umbra→anillo ORGÁNICA: la dibuja el propio fuego, no un círculo.
    float edgeN   = edge
                  + (fbm2(vPosition * 3.0 + r * 1.0 + tw) - 0.5) * 0.44  // ondulación grande
                  + (fireDetail - 0.20) * 0.22;                          // lenguas entran y ROMPEN el anillo
    float rimRamp = smoothstep(0.04, 0.52, edgeN);
    float ring    = pow(rimRamp, 1.5);                    // empuja el brillo hacia el anillo
    float heat    = body * (0.03 + 0.85 * ring);          // centro casi negro, anillo encendido

    // Umbra viva: brasas MUY tenues en el centro (no negro plano)
    heat += (1.0 - rimRamp) * (fireDetail * 0.05 + 0.008);

    // ── LIMBO ARDIENTE — el fuego se intensifica hacia el borde ───────────────
    // Espículas: orla fina de chorros radiales pegada a la silueta
    float spic     = pow(ridge(fbm2(vPosition * 46.0 + tw * 3.0)), 2.2);
    float spicules = spic * pow(edge, 3.5);

    heat += pow(edge, 2.6) * (0.32 + 0.62 * fireDetail);  // banda del anillo, más estrecha
    heat += pow(edge, 5.2) * (0.40 + 0.95 * spicules);    // borde caliente + espículas
    // cresta de la silueta MODULADA por filamentos → se rompe, no dibuja un círculo limpio
    heat += pow(edge, 12.0) * (0.18 + 0.78 * fireDetail) * (0.55 + 0.90 * spicules);

    // ── COLOR por TEMPERATURA (paleta de la referencia) ──────────────────────
    vec3 color = fireColor(heat);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─────────────────────────────────────────────
// CHROMOSPHERE halo (thin reddish ring above surface)
// ─────────────────────────────────────────────

export const chromoVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vPosition;

  void main() {
    vNormal        = normalize(normalMatrix * normal);
    vPosition      = position;
    vec4 mvPos     = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-mvPos.xyz);
    gl_Position    = projectionMatrix * mvPos;
  }
`;

// ─────────────────────────────────────────────
// NEBULA BACKGROUND — dark reddish sky dome
// Large BackSide sphere; NormalBlending so it sets the background colour
// ─────────────────────────────────────────────

export const nebulaBgVertexShader = /* glsl */ `
  varying vec3 vPosition;

  void main() {
    vPosition   = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nebulaBgFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform float u_loop_duration;

  varying vec3 vPosition;

  float hash(vec3 p){p=fract(p*0.3183099+vec3(0.1));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float valueNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm4(vec3 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  float fbm3(vec3 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  float fbm2(vec3 p){float v=0.0,a=0.5;for(int i=0;i<2;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}

  void main() {
    float ratio = u_time / u_loop_duration;
    float angle = ratio * 6.28318;
    vec3  tw    = vec3(cos(angle) * 0.04, sin(angle) * 0.04, 0.0);

    vec3 dir = normalize(vPosition);

    // C3 — nebula base con más contraste entre volutas (smoothstep más estrecho)
    float n1     = fbm3(dir * 2.2 + tw);
    float n2     = fbm2(dir * 5.5 - tw * 1.3);
    float nebula = n1 * 0.62 + n2 * 0.38;

    // Fondo casi negro — mínima nebulosa base omnidireccional
    vec3  base = vec3(0.0003, 0.0000, 0.0000);
    vec3  wisp = vec3(0.0030, 0.0003, 0.0000);
    float t    = smoothstep(0.45, 0.68, nebula);
    vec3  color = mix(base, wisp, t);

    // ── Halo mínimo — solo sugiere calor solar, muy reducido ──────────────────
    float haloFactor = clamp(-dir.x * 0.28 + dir.y * 0.22 + 0.48, 0.0, 1.0);
    float haloMask   = haloFactor * haloFactor * haloFactor;
    color += vec3(0.012, 0.001, 0.000) * haloMask;

    // ── Glow del Sol que SANGRA al espacio circundante (integración) ──────────
    // Máximo en la dirección del Sol (-z, centro de pantalla) y se desvanece hacia
    // los lados. Queda oculto tras el disco → solo se ve como halo difuso pegado al borde.
    float sunGlow = smoothstep(0.78, 1.0, -dir.z);
    sunGlow = pow(sunGlow, 2.2);
    color += vec3(0.070, 0.020, 0.005) * sunGlow;

    // ── Upper-left nebula cloud — más concentrada y pronunciada ──────────────
    float ulFactor = clamp(-dir.x * 0.55 + dir.y * 0.55 + 0.35, 0.0, 1.0);
    float ulMask   = smoothstep(0.0, 0.80, ulFactor);
    ulMask         = ulMask * ulMask * ulMask;

    float cStr  = fbm3(dir * 1.3 + vec3(0.50, 0.15, 0.0) + tw * 0.4);
    float cMid  = fbm3(dir * 3.2 + vec3(1.10, 0.55, 0.0) + tw * 0.75);
    float cFine = fbm2(dir * 7.5 + vec3(2.30, 1.50, 0.0) + tw * 1.3);
    float cloud = cStr * 0.52 + cMid * 0.30 + cFine * 0.18;

    // Cuerpo de la nube: rojo oscuro profundo
    float cloudBase = cloud * cloud * 2.2;
    color += vec3(0.55, 0.034, 0.003) * cloudBase * ulMask;

    // Núcleos calientes: más brillantes y definidos
    float cloudHot = smoothstep(0.48, 0.82, cloud);
    cloudHot       = cloudHot * cloudHot;
    color += vec3(2.20, 0.180, 0.015) * cloudHot * ulMask;

    float cloudC = cloudBase;

    // ── Wisp secundario — inferior-derecha, muy sutil ────────────────────────
    float loFactor = clamp(dir.x * 0.38 - dir.y * 0.50 + 0.08, 0.0, 1.0);
    float loMask   = smoothstep(0.0, 0.80, loFactor) * 0.18;
    float loCloud  = fbm2(dir * 2.2 + vec3(-0.9, -0.6, 0.0) + tw * 0.45);
    color += vec3(0.008, 0.001, 0.000) * loCloud * loMask;

    // ── Stars: two-layer system — many small + few large ────────────────────

    // Capa 1: muchas estrellas pequeñas (~9% de celdas)
    vec3  sCell    = floor(dir * 500.0);
    float cellSeed = hash(sCell);
    float hasStar  = step(0.91, cellSeed);

    vec2  jitter   = vec2(hash(sCell + vec3(31.7, 0.0, 0.0)),
                          hash(sCell + vec3(0.0,  23.1, 0.0)));
    vec3  sFrac    = fract(dir * 500.0);
    float starDist = length(sFrac.xy - jitter);
    float starGlow = exp(-starDist * starDist * 120.0) * hasStar;
    float sBright  = hash(sCell + vec3(7.3, 0.0, 0.0)) * 0.60 + 0.40;

    // Capa 2: pocas estrellas más grandes y brillantes (~2.5% de celdas)
    vec3  sCell2   = floor(dir * 200.0);
    float seed2    = hash(sCell2);
    float hasStar2 = step(0.975, seed2);
    vec2  jit2     = vec2(hash(sCell2 + vec3(55.1, 0.0, 0.0)),
                          hash(sCell2 + vec3(0.0,  44.2, 0.0)));
    vec3  sFrac2   = fract(dir * 200.0);
    float dist2    = length(sFrac2.xy - jit2);
    float glow2    = exp(-dist2 * dist2 * 40.0) * hasStar2;
    float bright2  = hash(sCell2 + vec3(12.5, 0.0, 0.0)) * 0.50 + 0.70;

    // Nebulosa translúcida: atenúa pero no elimina (máx 40% de sombra)
    float nebulaD  = clamp(cloudC * ulMask * 0.45, 0.0, 0.40);
    color += vec3(0.85, 0.78, 0.62) * starGlow * sBright  * (1.0 - nebulaD);
    color += vec3(1.00, 0.92, 0.72) * glow2    * bright2  * (1.0 - nebulaD);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const chromoFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  uniform float u_loop_duration;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vPosition;

  float hash(vec3 p) {
    p  = fract(p * 0.3183099 + vec3(0.1));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float valueNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm3(vec3 p) {
    float v=0.0, a=0.5;
    for (int i=0; i<3; i++) { v += a*valueNoise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    float cosA = max(dot(vNormal, vViewDirection), 0.001);
    float rim  = 1.0 - cosA;

    float angle = (u_time / u_loop_duration) * 6.28318;
    // Múltiplos ENTEROS del loop → drift periódico (antes 1.3/1.1/0.7… no cerraban la costura)
    vec3  tw1   = vec3(cos(angle) * 0.15, sin(angle) * 0.15, cos(angle * 2.0) * 0.10);
    vec3  tw2   = vec3(cos(angle * 2.0) * 0.10, sin(angle * 3.0) * 0.10, 0.0);

    // Frecuencia mayor → más llamas pequeñas y distribuidas
    float nBase = fbm3(vPosition * 8.0 + tw1);
    float nFire = fbm3(vec3(vPosition.x * 16.0, vPosition.y * 2.8, vPosition.z * 16.0) + tw2);
    // Textura fina para rugosidad del anillo
    float nFine = fbm3(vPosition * 28.0 - tw1 * 1.5);
    // Capa extra de variación media para irregularidad del borde
    float nMid  = fbm3(vPosition * 10.0 + tw2 * 0.8);

    // más bimodal (más ceros) → la orla se rompe en espículas, no en un aro continuo
    float flameFactor = clamp(nBase * nFire * 3.4 - 0.30, 0.0, 1.0);
    float spikePow = mix(8.0, 2.0, flameFactor);
    float flameRim = pow(rim, spikePow);

    // Campana de rim modulada por nMid → anillo irregular, no geométrico
    float bell     = smoothstep(0.0, 0.50, rim) * smoothstep(1.0, 0.65, rim);
    float ringTex  = nFine * 0.25 + nMid * 0.35 + 0.40;
    float baseRing = bell * bell * ringTex;

    // Naranja puro: HDR reducido para no lavar el detalle de fuego de la fotosfera
    vec3 coreColor  = vec3(2.80, 0.10, 0.005);
    vec3 flameColor = vec3(1.40, 0.06, 0.004);
    vec3 color = mix(flameColor, coreColor, smoothstep(0.3, 0.8, rim));

    float alpha = baseRing * 0.32 + flameRim * flameFactor * 0.70;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// ─────────────────────────────────────────────
// CORONA FLAMES — orla de fuego exterior (plano 2D polar, lenguas + espículas)
// Plano frente a cámara; lenguas de longitud variable que lamen el espacio.
// ─────────────────────────────────────────────

export const coronaFlamesVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const coronaFlamesFragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform float u_loop_duration;
  uniform float u_disk_radius;
  uniform float u_plane_size;

  varying vec2 vUv;

  float hash(vec3 p){p=fract(p*0.3183099+vec3(0.1));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float valueNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm3(vec3 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*valueNoise(p);p*=2.1;a*=0.5;}return v;}
  float ridge(float n){ n=1.0-abs(2.0*n-1.0); return n*n; }

  vec3 fireColor(float h){
    vec3 k0=vec3(0.015,0.0008,0.0000);
    vec3 k1=vec3(0.120,0.0060,0.0008);
    vec3 k2=vec3(0.430,0.0300,0.0025);
    vec3 k3=vec3(1.250,0.2200,0.0120);
    vec3 k4=vec3(3.800,1.1500,0.0900);
    vec3 k5=vec3(9.000,5.0000,1.4000);
    vec3 c=mix(k0,k1,smoothstep(0.00,0.16,h));
    c=mix(c,k2,smoothstep(0.14,0.40,h));
    c=mix(c,k3,smoothstep(0.40,0.66,h));
    c=mix(c,k4,smoothstep(0.66,0.90,h));
    c=mix(c,k5,smoothstep(0.92,1.20,h));
    return c;
  }

  void main(){
    vec2 p = (vUv - 0.5) * u_plane_size;       // mundo XY centrado en el Sol
    float wr = length(p);
    float diskR = u_disk_radius;
    float h = wr - diskR;                        // altura sobre el limbo
    if (h <= 0.0) discard;                       // dentro del disco → lo dibuja la fotosfera
    if (h > 0.75) discard;                       // sin bruma ancha, el fuego no llega más allá → ahorro GPU

    float ratio = u_time / u_loop_duration;
    float angle = ratio * 6.28318;
    vec2  dir = p / max(wr, 1e-4);               // dirección unidad (periódica en el círculo)

    // TIEMPO CIRCULAR: camino cerrado en el ruido → animación SIN salto en la costura del loop.
    // 3 ciclos/loop para conservar la velocidad real de la orla con el loop de 150s.
    vec2 tflow = vec2(cos(3.0 * angle), sin(3.0 * angle));

    // Deriva angular (domain-warp tangencial) → orla irregular que SE RETUERCE despacio
    float aw   = fbm3(vec3(dir * 4.0 + tflow * 0.30, 0.0)) - 0.5;
    vec2  tang = vec2(-dir.y, dir.x);
    vec2  dirH = normalize(dir + tang * aw * 0.60);

    // LONGITUD de llama por ángulo: las lenguas VIAJAN alrededor del limbo con el tiempo
    float tongue = pow(fbm3(vec3(dirH * 2.2 + tflow * 0.16, 0.0)), 1.7);  // contraste alto → unas disparan lejos
    float spike  = fbm3(vec3(dirH * 7.0 + tflow * 0.30, 0.0));
    float flameLen = 0.02 + tongue * 0.48 + spike * 0.13;            // de ~0 (huecos) a ~0.63

    // Caída radial: alcanza más lejos en el espacio (se apaga gradual hacia la punta)
    float radial = pow(1.0 - smoothstep(0.0, flameLen, h), 1.20);

    // PELOS: ridged de alta frecuencia + leve deriva temporal → hebras que tiemblan/laman
    float hair  = pow(ridge(fbm3(vec3(dirH * 22.0 + tflow * 0.50, h * 6.0))), 1.9);
    float hair2 = pow(ridge(fbm3(vec3(dirH * 48.0 + tflow * 0.80, h * 11.0))), 1.5);
    float flameSharp = radial * (0.10 + 1.00 * hair + 0.50 * hair2);

    // DIFUMINAR la corona exterior un 60%: versión BLANDA (sin hebras finas, bordes suaves)
    // mezclada con la nítida → la orla queda difusa/glow pero conserva la forma de las lenguas.
    float radialSoft = pow(1.0 - smoothstep(0.0, flameLen * 1.12, h), 1.55);
    float flameSoft  = radialSoft * (0.30 + 0.28 * tongue);
    float flame = mix(flameSharp, flameSoft, 0.60);

    // Bruma MUY pegada al limbo: solo para que el fuego no corte en seco contra el disco.
    // ELIMINADO el glow ancho ("corona" del borde) — la integración con el fondo se hace aparte
    // (glow del fondo + capa de neblina), no con un halo en la propia orla.
    float hazeN  = 0.55 + 0.45 * fbm3(vec3(dir * 3.0 + tflow * 0.22, 0.0));
    float hazeIn = exp(-h * 11.0) * hazeN;

    float intensity = flame + hazeIn * 0.18;
    intensity *= smoothstep(0.0, 0.020, h);   // arranque algo más suave (acompaña al difuminado)

    // Temperatura: naranja tenue en la base, rojo profundo en la punta (sin blanco).
    // Caída más suave en h → las lenguas largas siguen visibles (rojas) lejos del limbo.
    float heat = intensity * (0.82 - h * 1.25);
    vec3 col = fireColor(clamp(heat, 0.0, 0.95));
    float alpha = clamp(intensity, 0.0, 1.0);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// ─────────────────────────────────────────────
// ATMÓSFERA / NEBLINA — capa frontal a pantalla completa para INTEGRAR el Sol con el fondo.
// Veil cálido tenue: más denso en el espacio profundo, ligero sobre el Sol (no apaga el fuego).
// Sube los negros y suaviza el corte duro Sol↔fondo. NormalBlending, ~6–15% de opacidad.
// ─────────────────────────────────────────────

export const atmosphereVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float u_aspect;

  varying vec2 vUv;

  void main(){
    vec2  c = (vUv - 0.5) * vec2(u_aspect, 1.0);   // coords centradas, corregidas de aspecto
    float d = length(c);

    // Más neblina lejos del centro (espacio profundo), menos sobre el Sol → no lava el fuego.
    float radial = smoothstep(0.10, 0.95, d);
    float alpha  = mix(0.080, 0.218, radial);      // +45%: ~8% sobre el Sol → ~22% espacio profundo

    // Tinte cálido oscuro: integra con la nebulosa rojiza y el calor del Sol.
    vec3 haze = vec3(0.115, 0.045, 0.022);

    gl_FragColor = vec4(haze, alpha);
  }
`;
