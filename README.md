# The Ninja Way — Shivang Gupta's 3D portfolio 🥷

A walkable 3D hero's-journey portfolio built with React + Three.js
([react-three-fiber](https://docs.pmnd.rs/react-three-fiber)). You start in
Greater Noida, cross **THE SNAP**, walk the winning streak, migrate to Finland,
and climb to the **Sahloka** summit. Every trophy is a place you can step into.

**Controls:** `WASD` move · drag to look · scroll to glide · `E` enter a memory ·
`F` for a surprise ⚽ · ↑↑↓↓←→←→BA for another 🍥

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

## Make it yours

Everything you'd want to change lives in **one file**:
[`src/data/content.js`](src/data/content.js) — your bio, the five sagas (and
their colour palettes), the project shrines, the trophies and the story markers.
Add a shrine by dropping an object into the `shrines` array with an `x` / `z`
position and a `saga`; the world places and lights it automatically.

The world itself: `src/world/` — `World.jsx` (sky, fog, ground, colour grade),
`Player.jsx` (movement + interaction), `Structures.jsx` (shrines, trophies,
gates, beacon).

## Deploy (GitHub Pages, free)

`vite.config.js` uses a relative `base`, so it works at either URL:

- **Project page** → push this folder as a repo (e.g. `Mangluu/shivang`), and it
  serves at `mangluu.github.io/shivang/`.
- **User page** → put it in a repo named `mangluu.github.io` for `mangluu.github.io/`.

A GitHub Actions workflow is included at `.github/workflows/deploy.yml`. After
the first push, go to **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Every push to `main` then builds and deploys automatically.

Believe it. 🍥
