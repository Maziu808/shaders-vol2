import { Composition } from "remotion";
import { SHADERS } from "./shaders.gen";
import { ShaderLoop, type ShaderLoopProps } from "./ShaderLoop";

// One composition: pick the shader and the loop length in frames.
// durationInFrames 0 = the shader's own loop length (exact loop).
const defaultProps: ShaderLoopProps = { shader: "gyroid", durationInFrames: 0 };

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ShaderLoop"
    component={ShaderLoop}
    defaultProps={defaultProps}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={SHADERS.gyroid.frames}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames || SHADERS[props.shader].frames,
    })}
  />
);
