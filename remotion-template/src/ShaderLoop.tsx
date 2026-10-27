import { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SHADERS } from "./shaders.gen";

export type ShaderLoopProps = { shader: string; durationInFrames: number };

const VERTEX = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}";

type GlState = { gl: WebGLRenderingContext; u: (n: string) => WebGLUniformLocation | null };

const compile = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader => {
  const s = gl.createShader(type);
  if (!s) throw new Error("Could not create shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`GLSL: ${gl.getShaderInfoLog(s)}`);
  return s;
};

const initGl = (canvas: HTMLCanvasElement, frag: string): GlState => {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error("WebGL not available");
  const prog = gl.createProgram();
  if (!prog) throw new Error("Could not create WebGL program");
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`Link: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);
  // One triangle that covers the whole screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  return { gl, u: (n) => gl.getUniformLocation(prog, n) };
};

export const ShaderLoop: React.FC<ShaderLoopProps> = ({ shader }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<GlState | null>(null);
  const entry = SHADERS[shader];
  if (!entry) throw new Error(`Unknown shader "${shader}". Options: ${Object.keys(SHADERS).join(", ")}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!glRef.current) glRef.current = initGl(canvas, entry.frag);
    const { gl, u } = glRef.current;
    // Phase repeats every loop: the shader's own length gives one seamless loop per cycle
    gl.viewport(0, 0, width, height);
    gl.uniform1f(u("uPhase"), (frame % entry.frames) / entry.frames);
    gl.uniform2f(u("uRes"), width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, [frame, durationInFrames, width, height, entry]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
