// Builds glsl/ (standalone WebGL) and shadertoy/ from src/.
// Run from the repo root: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const common = read("src/common.glsl");
const pieces = JSON.parse(read("src/pieces.json"));
const vec3 = (c) => `vec3(${c.map((n) => n.toFixed(2)).join(", ")})`;
const LICENSE = "// shaders, vol. 2 — by @formatt_studio · https://www.instagram.com/formatt_studio/\n// License: MIT (see LICENSE)\n";

mkdirSync("glsl", { recursive: true });
mkdirSync("shadertoy", { recursive: true });

for (const p of pieces) {
  const body = read(`src/${p.id}.glsl`);
  const palette =
    `const vec3  uMid  = ${vec3(p.mid)};  // palette "${p.palette}": mid tone\n` +
    `const vec3  uHigh = ${vec3(p.high)};  // palette "${p.palette}": high tone`;
  const head = common.replace(/uniform vec3  uMid;.*\nuniform vec3  uHigh;.*/, palette);
  if (head === common) throw new Error("palette uniforms not found in common.glsl");

  // Standalone: needs only uRes (vec2, pixels) and uPhase (0..1).
  writeFileSync(`glsl/${p.id}.glsl`, `${LICENSE}// Uniforms: uRes (vec2, canvas size in px), uPhase (float, 0..1 = frame / ${p.frames})\n\n${head}\n${body}`);

  // Shadertoy: no uniforms or precision; uPhase derived from iTime keeps the loop exact.
  const toy = head
    .replace("precision highp float;\n", "")
    .replace(/uniform vec2  uRes;.*\nuniform float uPhase;.*/,
      `const float DURATION = ${p.seconds}.0;           // seconds per loop\n` +
      `#define uRes   iResolution.xy\n#define uPhase fract(iTime / DURATION)`);
  const toyBody = body
    .replace("void main() {", "void mainImage(out vec4 fragColor, in vec2 fragCoord) {")
    .replace(/gl_FragCoord/g, "fragCoord")
    .replace(/gl_FragColor/g, "fragColor");
  writeFileSync(`shadertoy/${p.id}.glsl`, `${LICENSE}// Shadertoy version: paste into the Image tab. Designed for portrait (9:16).\n\n${toy}\n${toyBody}`);
  console.log(`built ${p.id}`);
}
