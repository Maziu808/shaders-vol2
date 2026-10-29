# shaders, vol. 2

Five looping GLSL shaders by [@formatt_studio](https://www.instagram.com/formatt_studio/). Free to take, copy and learn from.

Every piece loops **exactly**: time only enters as `θ = TAU · uPhase`, with `uPhase` going from 0 to 1 over the loop, so the last frame flows straight back into the first. That makes them handy as phone wallpapers, VJ loops, website backgrounds or a way to learn GLSL.

## The five pieces

| Shader | Loop | What it is | Technique |
|---|---|---|---|
| **GYROID** | 9 s | An endless room of translucent sheets | A ray passes through a gyroid surface and gathers light near its walls; the camera travels exactly two periods per loop |
| **INK** | 10 s | A drop that blooms into chaos and back | Domain warping with FBM noise; time travels a circle through noise space |
| **BREATH** | 8 s | A sphere that breathes out into ridges | Raymarched sphere displaced by ridged noise; the displacement amplitude breathes |
| **VEIL** | 10 s | Aurora curtains that unfold | Four FBM-waved curves with fine vertical rays |
| **ECHO** | 12 s | Three wavefronts that collide in a flash | Three radial emitters with integer-frequency ripples and a growing front |

Each one ships with its own colour palette (Jade, Monochrome, Magenta lava, Green-pink aurora, Glacier). All were designed for portrait 1080×1920 at 30 fps.

### Bonus: the sun

`sun-remotion/` holds the sun from the story series. It is a full Remotion + three.js scene (several shader layers plus post-processing), not a single-pass shader, so it has no Shadertoy version. See [`sun-remotion/README.md`](sun-remotion/README.md).

<!-- Shadertoy links go here once published -->

## What's inside

```
glsl/               standalone WebGL1 fragment shaders, palette included: copy and use
shadertoy/          the same shaders adapted for Shadertoy (mainImage, iTime, iResolution)
sun-remotion/       the sun loop: a Remotion + three.js scene (not a single-pass shader)
remotion-template/  minimal Remotion project to render the loops as video
src/                sources: common.glsl (shared header) + one file per piece
tools/              build script and a tiny local viewer
```

Phone wallpapers (MP4, 1080×1920, seamless loop, no text) are in the [Releases](../../releases) page.

## How to use

### Shadertoy

Open [shadertoy.com/new](https://www.shadertoy.com/new), replace the Image tab with a file from `shadertoy/` and press play. Make the preview tall (9:16) for the intended framing. The loop length is the `DURATION` constant at the top.

### WebGL / three.js

Each file in `glsl/` is a complete fragment shader (the shared header is already prepended, since WebGL1 has no `#include`). It needs two uniforms:

| Uniform | Type | Value |
|---|---|---|
| `uRes` | `vec2` | canvas size in pixels |
| `uPhase` | `float` | loop phase, 0..1: `(seconds / loopSeconds) % 1`, or `frame / totalFrames` |

Draw a full-screen triangle or quad with it. In three.js, use a `ShaderMaterial` on a full-screen plane and pass `uRes` and `uPhase` as uniforms; in WebGL2 / three.js with `glslVersion: THREE.GLSL3` you would also swap `gl_FragColor` for an `out vec4`.

To change the colours, edit the `uMid` and `uHigh` constants near the top of the file (RGB, 0..1). Black always stays black.

### Remotion

```bash
cd remotion-template
npm install
npm run dev
```

The `ShaderLoop` composition takes two props: `shader` (`gyroid`, `ink`, `breath`, `veil` or `echo`) and `durationInFrames` (0 = one exact loop; longer values repeat the loop). Render with `npm run render`. On Windows, the config uses the ANGLE renderer, which avoids black frames.

### Editing the sources

Edit `src/*.glsl` (or palettes in `src/pieces.json`), then rebuild `glsl/` and `shadertoy/` with Node:

```bash
node tools/build.mjs
```

To preview locally, serve the repo root (for example `python -m http.server`) and open `tools/viewer.html?s=gyroid`. Add `&mode=glsl` to test the standalone file instead of the Shadertoy one.

## License

- **Code** (everything in this repository): [MIT](LICENSE). Use it anywhere, commercial work included; just keep the copyright notice.
- **Videos and wallpapers** (Releases): [CC BY-NC 4.0](LICENSE-MEDIA.md). Personal use and sharing with credit, no commercial use.

## Credits

Made by [@formatt_studio](https://www.instagram.com/formatt_studio/). If you use these, a tag is always appreciated.
