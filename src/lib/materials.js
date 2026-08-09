import * as THREE from 'three'
import { texWood, texStone, texRoof, texWall, texFloor, texLacquer, texShoji, fbmCanvas } from './textures'

// Bridges the procedural canvases into three.js textures, generated once and
// shared. Each call site clones the shared texture so it can set its own tiling
// without re-drawing the (fairly expensive) canvas.

const built = new Map()
const once = (key, make) => {
  if (!built.has(key)) built.set(key, make())
  return built.get(key)
}

// kage's textures were painted for a moonlit night, so they are dark and
// strongly tinted. A colour map multiplies the material colour, which would
// double-darken our dusk palette. This rebalances a map to sit around white and
// mostly-grey, so it contributes grain, seams and tile detail while our own
// colours stay in charge.
function neutralize(canvas, target = 0.87, desat = 0.6, flatten = 0) {
  const w = canvas.width, h = canvas.height
  const ctx = canvas.getContext('2d')
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
  const mean = sum / (d.length / 4) / 255
  const gain = mean > 0.01 ? (target / mean) : 1
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    for (let c = 0; c < 3; c++) {
      const mixed = d[i + c] * (1 - desat) + lum * desat   // pull toward grey
      let v = mixed * gain
      if (flatten) v = v * (1 - flatten) + target * 255 * flatten  // compress contrast
      d[i + c] = Math.max(0, Math.min(255, v))
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function wrap(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

// A generator returns { map, normal, rough } canvases; we keep colour + normal
// (MeshToonMaterial has no roughness channel — the cel ramp does that job).
function makeSet(key, gen, opt = {}) {
  return once(key, () => {
    const r = gen()
    const c = r && r.map ? r : { map: r }
    return {
      map: wrap(neutralize(c.map, opt.target ?? 0.87, opt.desat ?? 0.6, opt.flatten ?? 0), true),
      normalMap: c.normal ? wrap(c.normal, false) : null,
    }
  })
}

// Memoised per (surface, tiling) so repeated renders reuse one texture instead
// of cloning a new one every frame.
function tiled(key, set, rx, ry) {
  return once(`${key}@${rx}x${ry}`, () => {
    const out = { map: set.map.clone() }
    out.map.repeat.set(rx, ry)
    out.map.needsUpdate = true
    if (set.normalMap) {
      out.normalMap = set.normalMap.clone()
      out.normalMap.repeat.set(rx, ry)
      out.normalMap.needsUpdate = true
    }
    return out
  })
}

// ── the village surfaces ─────────────────────────────────────────────────────
export const woodBoards = (rx = 1, ry = 1) => tiled('woodBoards', makeSet('woodBoards', () => texWood(3, { boards: 7 })), rx, ry)
export const woodPost = (rx = 1, ry = 1) => tiled('woodPost', makeSet('woodPost', () => texWood(29, { boards: 0 })), rx, ry)
export const stone = (rx = 1, ry = 1) => tiled('stone', makeSet('stone', () => texStone(11, {})), rx, ry)
export const roofTile = (rx = 1, ry = 1) => tiled('roofTile', makeSet('roofTile', () => texRoof()), rx, ry)
export const plaster = (rx = 1, ry = 1) => tiled('plaster', makeSet('plaster', () => texWall()), rx, ry)
export const groundMat = (rx = 1, ry = 1) => tiled('ground', makeSet('ground', () => ({ map: fbmCanvas(512, 512, 7, 5, 4, 0.6) }), { desat: 1, flatten: 0.72 }), rx, ry)
export const floorSlab = (rx = 1, ry = 1) => tiled('floorSlab', makeSet('floorSlab', () => texFloor()), rx, ry)
export const lacquer = (rx = 1, ry = 1) => tiled('lacquer', makeSet('lacquer', () => texLacquer()), rx, ry)
export const shoji = (rx = 1, ry = 1) => tiled('shoji', makeSet('shoji', () => ({ map: texShoji() })), rx, ry)
