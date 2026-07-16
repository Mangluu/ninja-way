# The Ninja Way 🥷

A walkable 3D portfolio, built as a stylized shinobi village you explore in the browser. Wander the village, find projects as glowing waypoints, and climb the torii avenue to the summit gate.

**Live → [mangluu.github.io/ninja-way](https://mangluu.github.io/ninja-way/)**

**Controls:** `WASD` / arrows to move · drag to look · scroll to zoom · `Space` to jump · `E` to interact

## Built with

- **React + [react-three-fiber](https://docs.pmnd.rs/react-three-fiber)** on Three.js / WebGL
- Cel/toon shading (`MeshToonMaterial` + gradient ramp) with inverted-hull outlines
- Post-processing via `@react-three/postprocessing` — N8AO ambient occlusion, selective bloom, AgX tone-mapping, SMAA
- A custom third-person controller: movement, jump + gravity, a climbable height-field, soft collision, and proximity-based interactions
- **All 3D art is original / procedural** — no third-party model assets, so it's license-clean anywhere on the web

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

## Structure

- `src/data/content.js` — projects, palette, world config
- `src/world/` — `Scene.jsx` (sky, fog, lights, layout) · `props.jsx` (village structures) · `Shinobi.jsx` (the character) · `Controller.jsx` (movement + camera) · `SahlokaGate.jsx` (the summit)
- `src/effects.jsx` — the post-processing stack

## Deploy

Ships to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (`vite.config.js` uses a relative `base`).
