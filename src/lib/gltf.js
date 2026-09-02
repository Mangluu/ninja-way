import * as THREE from 'three'
import { gradientMap } from './toon'

// Everything loaded from a GLB is re-skinned to the same cel shading as the
// procedural props, so a Kenney tree, a KayKit character and a hand-built
// lantern all sit in one drawing. Materials are swapped in place, once.

// Kenney's flat palette, retuned for a moonlit village. Anything not listed
// keeps its own colour.
export const NIGHT = {
  // Kenney nature kit
  leafsFall: '#e8a2b6',      // the "autumn" canopies become sakura
  leafsGreen: '#5f8f5a',
  leafsDark: '#2f4a3a',
  woodBirch: '#b39a78',
  woodBarkDark: '#5a3f2a',
  wood: '#8a6440',
  woodDark: '#5e4430',
  woodInner: '#c9a97a',
  dirt: '#a88a5e',
  dirtDark: '#7a6444',
  grass: '#6d7a4f',
  stone: '#9a958a',
  stoneDark: '#6f6b62',
  water: '#4a7fae',
  colorPurple: '#a58ad4',
  colorRed: '#d9534f',
  colorYellow: '#e6c15a',
  colorTan: '#d8c39a',
  _defaultMat: '#d8d0c0',
  // Quaternius temples (flat colours)
  Main: '#b7382a',
  Walls: '#e9dfc9',
  Stone: '#8d8a80',
}

const cache = new WeakMap()

export function toonify(root, { recolor = NIGHT, shadows = true, tint, emissive, emissiveIntensity = 0 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return
    if (shadows) { o.castShadow = true; o.receiveShadow = true }
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const out = mats.map((m) => {
      if (!m) return m
      const key = `${m.uuid}|${tint || ''}|${emissive || ''}`
      let t = cache.get(m)?.[key]
      if (!t) {
        const color = new THREE.Color(m.color || '#ffffff')
        if (recolor && m.name && recolor[m.name]) color.set(recolor[m.name])
        if (tint) color.multiply(new THREE.Color(tint))
        t = new THREE.MeshToonMaterial({
          color, map: m.map || null, gradientMap,
          transparent: !!m.transparent, opacity: m.opacity ?? 1,
          alphaTest: m.alphaTest || 0, side: m.side ?? THREE.FrontSide,
          emissive: emissive ? new THREE.Color(emissive) : new THREE.Color('#000000'),
          emissiveIntensity,
        })
        t.name = m.name
        if (t.map) t.map.colorSpace = THREE.SRGBColorSpace
        const bag = cache.get(m) || {}; bag[key] = t; cache.set(m, bag)
      }
      return t
    })
    o.material = Array.isArray(o.material) ? out : out[0]
  })
  return root
}

// Show exactly these prop nodes inside a character rig and hide the rest of a
// known set. KayKit ships every weapon in the file, parented to hand slots.
export function showProps(root, visible, known) {
  root.traverse((o) => { if (known.includes(o.name)) o.visible = visible.includes(o.name) })
}
