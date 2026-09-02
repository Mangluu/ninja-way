import * as THREE from 'three'

// A cel-shading gradient map: hard steps instead of smooth shading. This single
// texture, fed to MeshToonMaterial everywhere, is what makes the world read
// "anime/stylized" instead of "flat primitive".
// At night the floor drops: shadows should read as dark, just never as holes.
// The darkest band is still lifted off zero: a ramp that bottoms out at black crushes
// every surface facing away from the sun into silhouette, which is what made the
// temple roofs read as holes. A floor keeps shadowed faces readable and coloured.
const SHADOW_FLOOR = 0.48

function makeGradient(steps) {
  const data = new Uint8Array(steps)
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    data[i] = Math.round((SHADOW_FLOOR + (1 - SHADOW_FLOOR) * t) * 255)
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

// 4-band cel ramp — soft enough to keep form, hard enough to read as toon.
export const gradientMap = makeGradient(4)

// Tiny helper to darken/lighten a hex for outline / accent derivation.
export function shade(hex, amt) {
  const c = new THREE.Color(hex)
  c.offsetHSL(0, 0, amt)
  return `#${c.getHexString()}`
}
