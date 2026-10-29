import { useCurrentFrame, useVideoConfig } from "remotion";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import {
  coronaFlamesVertexShader,
  coronaFlamesFragmentShader,
  LOOP_DURATION,
} from "./shaders";

// Plano 2D frente a la cámara, centrado en el Sol. En coordenadas polares dibuja
// la orla de fuego exterior: lenguas de longitud variable + espículas finas que
// laman el espacio. u_disk_radius = radio proyectado del disco en este plano.
const PLANE_SIZE = 3.9; // headroom para lenguas largas sin recorte en el borde del plano
const DISK_RADIUS = 1.07; // justo en la silueta proyectada (~1.08); depthTest oculta lo interior

export const SolarCoronaFlames: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_loop_duration: { value: LOOP_DURATION },
      u_disk_radius: { value: DISK_RADIUS },
      u_plane_size: { value: PLANE_SIZE },
    }),
    [],
  );

  if (matRef.current) matRef.current.uniforms.u_time.value = time;

  return (
    <mesh renderOrder={6}>
      <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={coronaFlamesVertexShader}
        fragmentShader={coronaFlamesFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
