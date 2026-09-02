// Solid things are circles { x, z, r } or boxes { x, z, hw, hd, rot } (half
// width along the box's own x, half depth along its z, yaw in radians). The
// same shapes serve the player, the camera and the walk grid, so what you
// cannot walk through you also cannot path through or see through.

export const bound = (b) => (b.r != null ? b.r : Math.hypot(b.hw, b.hd))

// Push a point out of one blocker so it sits at least `radius` away.
export function pushOut(p, b, radius) {
  const dx = p.x - b.x, dz = p.z - b.z
  if (b.r != null) {
    const d = Math.hypot(dx, dz), min = b.r + radius
    if (d >= min || d < 1e-4) return false
    const k = (min - d) / d
    p.x += dx * k; p.z += dz * k
    return true
  }
  // into the box's frame (rotate by -yaw), find the nearest point on it
  const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0)
  let lx = dx * c - dz * s, lz = dx * s + dz * c
  const qx = Math.max(-b.hw, Math.min(b.hw, lx)), qz = Math.max(-b.hd, Math.min(b.hd, lz))
  const ex = lx - qx, ez = lz - qz
  const d2 = ex * ex + ez * ez
  if (d2 > 0) {
    if (d2 >= radius * radius) return false
    const d = Math.sqrt(d2), k = (radius - d) / d
    lx += ex * k; lz += ez * k
  } else {
    // inside: leave through the nearest face
    const px = b.hw - Math.abs(lx) + radius, pz = b.hd - Math.abs(lz) + radius
    if (px < pz) lx += (lx < 0 ? -1 : 1) * px
    else lz += (lz < 0 ? -1 : 1) * pz
  }
  p.x = b.x + lx * c + lz * s
  p.z = b.z - lx * s + lz * c
  return true
}

export function resolve(p, blockers, radius) {
  for (const b of blockers) pushOut(p, b, radius)
  return p
}

// Is a point within `pad` of a blocker? Used to paint the walk grid.
export function inside(x, z, b, pad = 0) {
  const dx = x - b.x, dz = z - b.z
  if (b.r != null) return dx * dx + dz * dz < (b.r + pad) * (b.r + pad)
  const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0)
  const lx = dx * c - dz * s, lz = dx * s + dz * c
  return Math.abs(lx) < b.hw + pad && Math.abs(lz) < b.hd + pad
}

// runnable check: a point inside a rotated box comes out through a face, and
// a point beside a circle is left alone
if (import.meta.env?.DEV && typeof window === 'undefined') {
  const p = { x: 0.2, z: 0.1 }
  pushOut(p, { x: 0, z: 0, hw: 1, hd: 0.5, rot: 0.3 }, 0.4)
  console.assert(!inside(p.x, p.z, { x: 0, z: 0, hw: 1, hd: 0.5, rot: 0.3 }, 0.39), 'should be outside the box', p)
  const q = { x: 3, z: 0 }
  console.assert(!pushOut(q, { x: 0, z: 0, r: 1 }, 0.4) && q.x === 3, 'far point untouched')
}
