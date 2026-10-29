import { AbsoluteFill } from "remotion";
import { SolarScene } from "./Sun/SolarScene";

export const SunComposition: React.FC = () => (
  // Pure black background — makes the corona and sun glow pop
  <AbsoluteFill style={{ backgroundColor: "#000000" }}>
    <SolarScene />
  </AbsoluteFill>
);
