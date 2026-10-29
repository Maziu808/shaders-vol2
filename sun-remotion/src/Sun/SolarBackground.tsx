import { useCurrentFrame, useVideoConfig } from "remotion";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { nebulaBgVertexShader, nebulaBgFragmentShader, LOOP_DURATION } from "./shaders";

export const SolarBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_loop_duration: { value: LOOP_DURATION },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (matRef.current) matRef.current.uniforms.u_time.value = time;

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[20, 16, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaBgVertexShader}
        fragmentShader={nebulaBgFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};
