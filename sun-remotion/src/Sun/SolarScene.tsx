import { useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  HueSaturation,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SolarSurface } from "./SolarSurface";
import { SolarBackground } from "./SolarBackground";
import { SolarCoronaFlames } from "./SolarCoronaFlames";
import { SolarAtmosphere } from "./SolarAtmosphere";

// ── Camera: z=2.6 with FOV 60° → sun (r=1) fills ~75% of frame height
// ── ALL corona spheres must have radius < 2.6 so camera stays outside them
const SceneSetup: React.FC = () => {
  const { camera, gl } = useThree();

  camera.position.set(0, 0, 2.6);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov  = 60;
    camera.near = 0.01;
    camera.far  = 200;
    camera.updateProjectionMatrix();
  }

  gl.toneMapping         = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.27;

  return null;
};

export const SolarScene: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas width={width} height={height} gl={{ alpha: false, antialias: false, powerPreference: "high-performance" }}>
      <SceneSetup />

      <SolarBackground />
      <SolarSurface />
      <SolarCoronaFlames />
      <SolarAtmosphere />

      <EffectComposer multisampling={0}>
        {/* Bloom de altas luces — glow nítido del fuego, sin requemar. */}
        <Bloom
          mipmapBlur
          luminanceThreshold={0.62}
          luminanceSmoothing={0.22}
          intensity={0.30}
          radius={0.10}
        />
        {/* DIFUMINADO (difusión soft-focus ~51% = +45%) — umbral ~0 → difumina TODO el cuadro,
            suaviza el detalle clínico del Sol y sangra su luz al fondo = integración. */}
        <Bloom
          mipmapBlur
          luminanceThreshold={0.0}
          luminanceSmoothing={0.7}
          intensity={0.51}
          radius={0.62}
          levels={5}
        />

        {/* ── PASE DE COHESIÓN (sobre todo el cuadro → una sola imagen, no Sol + fondo) ── */}

        {/* Grado de color global: ligera unificación tonal (la calidez ya viene de la neblina). */}
        <HueSaturation hue={0.0} saturation={-0.066} />
        <BrightnessContrast brightness={-0.022} contrast={0.077} />

        {/* (Aberración cromática eliminada: partía las estrellas en colores R/G/B). */}

        {/* Viñeta: une los bordes del encuadre y centra la mirada en el Sol. */}
        <Vignette eskil={false} offset={0.32} darkness={0.55} />

        {/* Grano de película: iguala la nitidez Sol/fondo → "misma película" (el unificador clave). */}
        <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.17} />
      </EffectComposer>
    </ThreeCanvas>
  );
};
