import { useVideoConfig } from "remotion";
import { useMemo } from "react";
import * as THREE from "three";
import { atmosphereVertexShader, atmosphereFragmentShader } from "./shaders";

// Capa de NEBLINA frontal para integrar el Sol con el fondo.
// Plano a z=0 dimensionado para cubrir el encuadre (cámara z=2.6, FOV 60°):
//   alto visible = 2 · 2.6 · tan(30°) ≈ 3.00 ; ancho = alto · aspect.
// depthTest=false + renderOrder alto → siempre por delante de todo. NormalBlending = veil.
const PLANE_H = 3.02;

export const SolarAtmosphere: React.FC = () => {
  const { width, height } = useVideoConfig();
  const aspect = width / height;
  const planeW = PLANE_H * aspect;

  const uniforms = useMemo(
    () => ({ u_aspect: { value: aspect } }),
    [aspect],
  );

  return (
    <mesh renderOrder={50}>
      <planeGeometry args={[planeW, PLANE_H]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
};
