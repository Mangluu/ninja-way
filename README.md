# The Ninja Way 🥷

A shinobi village you can play, in the browser. Walk it, light the lanterns, throw shuriken, find what is hidden, and see who he becomes. It is a portfolio, and it is also a small game, and it works the same on a phone as on a desk.

**Live → [mangluu.github.io/ninja-way](https://mangluu.github.io/ninja-way/)**

## How to play

| | Desktop | Phone |
|---|---|---|
| Move | `WASD` / arrows, or click the ground | joystick, or tap the ground |
| Look | drag | drag |
| Throw a shuriken | click a thing, or `F` at what the marker shows | tap a thing, or the ✦ button |
| Dash | `C` | the ⤳ button |
| Jump (twice) | `Space` | the ⤒ button |
| Interact | `E` or the prompt | the prompt |
| Quest log and dossier | `Q` or the 📖 button | the 📖 button |
| Photo mode · rain · mute | `P` · `R` · `M` | |

A compass at the top of the screen always points at the nearest thing left to do, and a marker floats over whatever a throw would hit. Villagers speak in bubbles over their heads, scrolls unroll at the edge of the screen, and the journal is a drawer, so nothing ever covers the world. Progress is saved in the browser. Someone in a hurry can open the dossier from the start screen and get the bio, the links and every project without walking anywhere.

## What there is to do

- Six projects on glowing plinths. Walk up, read the card, open the link.
- Six stone lanterns. Every one changes the character, from academy student to Kage. The sixth breaks a seal.
- Five hidden scrolls, three villagers who talk about him, a shrine bell, a taiko drum, cherry trees to shake, crates to sprint through.
- A training ground of five straw targets by the entrance, for the shuriken.
- The summit gate to Sahloka, at the top of the torii avenue.
- Two secrets.

## Built with

- **React + [react-three-fiber](https://docs.pmnd.rs/react-three-fiber)** on Three.js / WebGL
- Cel/toon shading (`MeshToonMaterial` + gradient ramp) with inverted-hull outlines
- Post-processing via `@react-three/postprocessing` — N8AO ambient occlusion (skipped on phones), selective bloom, AgX tone-mapping, SMAA
- A custom third-person controller: keyboard, touch joystick and tap-to-walk all feed one movement loop; jump + gravity with coyote time; a climbable height-field; soft collision; proximity interactions; tap picking through invisible volumes
- A synthesized adaptive score and synth SFX. No audio files.
- **License-clean art**: CC0 models for the characters and the landscape, procedural KAGE-textured buildings and lanterns, no audio files

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

## Structure

- `src/App.jsx` — state, the save, quests, the one `perform()` every interaction routes through
- `src/data/content.js` — profile, projects, ranks, villager lines, quests, bio
- `src/save.js` — progress in `localStorage`
- `src/ui.jsx` — intro, HUD, prompt, panels, quest log, touch controls
- `src/world/` — `Scene.jsx` (the valley) · `layout.js` (where everything stands) · `nav.js` (the walk grid and A*) · `props3d.jsx` (model loading and instancing) · `props.jsx` (houses, lanterns, bell, drum) · `Ninja.jsx` (the character and its animation state) · `Villager.jsx` · `Controller.jsx` (movement, camera, taps, dash) · `Shuriken.jsx` (aim, stars, targets) · `Kurama.jsx` · `Finale.jsx` · `SahlokaGate.jsx`
- `public/models/` — the CC0 models, see `LICENSES.md` there
- `src/effects.jsx` — the post-processing stack
- `src/sound.js`, `src/music.js` — the audio

## Deploy

Ships to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (`vite.config.js` uses a relative `base`).

## Credits

The character and the villagers are the [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) by Kay Lousberg. The trees, rocks, meadow, fences, bridge and camp are from the [Kenney Nature Kit](https://kenney.nl/assets/nature-kit). The torii and temples are by Quaternius and the shrine by Kay Lousberg, both via [Poly Pizza](https://poly.pizza). All CC0. Details in `public/models/LICENSES.md`.

The procedural texture engine — the runtime-generated wood, stone, plaster, roof
tile, lacquer and paper that the houses and lanterns are drawn with — and the curved
temple-roof geometry are adapted from **[KAGE](https://github.com/MengTo/kage)**
by **[Meng To](https://github.com/MengTo)**, used with his kind permission.
Thank you.
