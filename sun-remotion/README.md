# sun-remotion

The sun from the *sun* story series by [@formatt_studio](https://www.instagram.com/formatt_studio/): a dark core with a blazing rim, filaments of fire and a flame corona.

**This is a Remotion + three.js scene, not a single-pass shader.** It is several GLSL shaders drawn as separate layers, plus post-processing. If you were expecting one fragment shader to paste into Shadertoy, this is not that (yet).

## What's in it

| File | Layer |
|---|---|
| `src/Sun/shaders.ts` | All the GLSL (about 500 lines): photosphere, chromosphere, flame corona, haze, background nebula |
| `src/Sun/SolarSurface.tsx` | Photosphere (r = 1) and chromosphere (r = 1.02) spheres |
| `src/Sun/SolarCoronaFlames.tsx` | Outer ring of flames, a 2D polar plane |
| `src/Sun/SolarAtmosphere.tsx` | Full-screen haze that blends the sun into the background |
| `src/Sun/SolarBackground.tsx` | Nebula and stars |
| `src/Sun/SolarScene.tsx` | Camera, tone mapping and post-processing (two Blooms, colour grade, vignette, film grain) |

The loop is 150 s at 30 fps (4500 frames) and closes exactly: every time term is periodic over the loop. `LOOP_DURATION` in `shaders.ts` must stay equal to frames / fps in `src/Root.tsx`.

## Run it

```bash
cd sun-remotion
npm install
npm run dev      # Remotion Studio
npm run render   # out/sun.mp4, 1920x1080
```

- Renders use the ANGLE (hardware GPU) renderer, set in `remotion.config.ts`. Software GL is 20-40x slower.
- The Studio preview is slow (a few fps) because the shaders are heavy. Judge the motion from a rendered MP4.
- `npm run still` writes one frame, but stills do not follow `--frame` (they all come out at t = 0). Videos are fine. The cause is that the shader time uniform is assigned through a ref that is still `null` on the first render of a fresh page.

## License

MIT, see the root `LICENSE`. Rendered videos: CC BY-NC 4.0, see `LICENSE-MEDIA.md`.
