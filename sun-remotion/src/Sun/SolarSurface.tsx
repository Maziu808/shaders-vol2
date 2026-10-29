import { useCurrentFrame, useVideoConfig } from "remotion";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import {
  sunVertexShader,
  sunFragmentShader,
  chromoVertexShader,
  chromoFragmentShader,
  LOOP_DURATION,
} from "./shaders";

// Giro lento del Sol: exactamente 1 vuelta por loop (2π en ratio 0→1) → eje Y vertical.
// Es la velocidad más lenta posible sin romper la costura del bucle.
const spinY = (time: number) => (time / LOOP_DURATION) * Math.PI * 2;

const Photosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_loop_duration: { value: LOOP_DURATION },
    }),
    [],
  );

  if (matRef.current) matRef.current.uniforms.u_time.value = time;

  return (
    <mesh renderOrder={10} rotation={[0, spinY(time), 0]}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={sunVertexShader}
        fragmentShader={sunFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

// Chromospheric halo — thin hot pink/red layer just above the photosphere
const Chromosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_loop_duration: { value: LOOP_DURATION },
    }),
    [],
  );

  if (matRef.current) matRef.current.uniforms.u_time.value = time;

  return (
    <mesh renderOrder={11} rotation={[0, spinY(time), 0]}>
      <sphereGeometry args={[1.02, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={chromoVertexShader}
        fragmentShader={chromoFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export const SolarSurface: React.FC = () => (
  <>
    <Photosphere />
    <Chromosphere />
  </>
);
