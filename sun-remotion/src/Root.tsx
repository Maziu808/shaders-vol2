import "./index.css";
import { Composition } from "remotion";
import { SunComposition } from "./SunComposition";

const FPS = 30;

// 150 s x 30 fps = 4500 frames: seamless loop. Must match LOOP_DURATION in
// Sun/shaders.ts, otherwise the loop stops closing.
const LOOP_FRAMES = 4500;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SunLoop"
    component={SunComposition}
    durationInFrames={LOOP_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
