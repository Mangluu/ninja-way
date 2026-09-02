// A coarse walk grid over the village and an A* on it, so a tap across the
// map routes around houses instead of walking into a wall and giving up.
//
// ponytail: one-metre cells, eight-way moves, string-pulled afterwards. No
// dynamic obstacles (crates are pushed, villagers drift out of the way).

import { bound, inside } from './collide'

export function buildNav(blockers, world, cell = 1) {
  const w = Math.ceil((world.maxX - world.minX) / cell) + 1
  const h = Math.ceil((world.maxZ - world.minZ) / cell) + 1
  const solid = new Uint8Array(w * h)
  const PAD = 0.55   // half the character, so paths keep their shoulders clear
  for (const b of blockers) {
    const r = bound(b) + PAD
    const x0 = Math.max(0, Math.floor((b.x - r - world.minX) / cell)), x1 = Math.min(w - 1, Math.ceil((b.x + r - world.minX) / cell))
    const z0 = Math.max(0, Math.floor((b.z - r - world.minZ) / cell)), z1 = Math.min(h - 1, Math.ceil((b.z + r - world.minZ) / cell))
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
      if (inside(world.minX + gx * cell, world.minZ + gz * cell, b, PAD)) solid[gz * w + gx] = 1
    }
  }
  return { w, h, cell, solid, minX: world.minX, minZ: world.minZ }
}

const toCell = (nav, x, z) => [Math.round((x - nav.minX) / nav.cell), Math.round((z - nav.minZ) / nav.cell)]
const toWorld = (nav, gx, gz) => ({ x: nav.minX + gx * nav.cell, z: nav.minZ + gz * nav.cell })
const free = (nav, gx, gz) => gx >= 0 && gz >= 0 && gx < nav.w && gz < nav.h && !nav.solid[gz * nav.w + gx]

// nearest free cell, spiralling out, for targets that land inside something
function nearestFree(nav, gx, gz) {
  if (free(nav, gx, gz)) return [gx, gz]
  for (let r = 1; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
    if (free(nav, gx + dx, gz + dz)) return [gx + dx, gz + dz]
  }
  return null
}

function lineFree(nav, a, b) {
  // sample the segment a little finer than a cell
  const [ax, az] = a, [bx, bz] = b
  const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * 2) + 1
  for (let i = 0; i <= n; i++) {
    const t = i / n
    if (!free(nav, Math.round(ax + (bx - ax) * t), Math.round(az + (bz - az) * t))) return false
  }
  return true
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]

// Returns world waypoints from `from` to `to`, or null if unreachable.
export function findPath(nav, from, to) {
  const s = nearestFree(nav, ...toCell(nav, from.x, from.z))
  const g = nearestFree(nav, ...toCell(nav, to.x, to.z))
  if (!s || !g) return null
  if (lineFree(nav, s, g)) return [toWorld(nav, ...g)]
  const key = (x, z) => z * nav.w + x
  const open = [{ x: s[0], z: s[1], f: 0 }]
  const gScore = new Map([[key(s[0], s[1]), 0]])
  const came = new Map()
  const closed = new Set()
  const heur = (x, z) => Math.hypot(x - g[0], z - g[1])
  let guard = 0
  while (open.length && guard++ < 60000) {
    // ponytail: linear scan for the best node; the grid is small enough
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i
    const cur = open.splice(bi, 1)[0]
    const ck = key(cur.x, cur.z)
    if (closed.has(ck)) continue
    closed.add(ck)
    if (cur.x === g[0] && cur.z === g[1]) {
      const cells = [[cur.x, cur.z]]
      let k = ck
      while (came.has(k)) { const p = came.get(k); cells.push(p); k = key(p[0], p[1]) }
      cells.reverse()
      // string pulling: keep only the corners that need turning at
      const out = [cells[0]]
      let anchor = 0
      for (let i = 2; i < cells.length; i++) {
        if (!lineFree(nav, cells[anchor], cells[i])) { out.push(cells[i - 1]); anchor = i - 1 }
      }
      out.push(cells[cells.length - 1])
      return out.slice(1).map(([x, z]) => toWorld(nav, x, z))
    }
    for (const [dx, dz, cost] of DIRS) {
      const nx = cur.x + dx, nz = cur.z + dz
      if (!free(nav, nx, nz)) continue
      // no cutting corners through a solid cell
      if (dx && dz && (!free(nav, cur.x + dx, cur.z) || !free(nav, cur.x, cur.z + dz))) continue
      const nk = key(nx, nz)
      const ng = gScore.get(ck) + cost
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng)
        came.set(nk, [cur.x, cur.z])
        open.push({ x: nx, z: nz, f: ng + heur(nx, nz) })
      }
    }
  }
  return null
}

// runnable check: a wall with a gap must be routed through the gap
if (import.meta.env?.DEV && typeof window === 'undefined') {
  const nav = buildNav([{ x: 0, z: 5, r: 3 }, { x: 5, z: 5, r: 1.5 }], { minX: -10, maxX: 10, minZ: 0, maxZ: 10 })
  const p = findPath(nav, { x: 0, z: 0 }, { x: 0, z: 10 })
  console.assert(p && p.length > 1, 'path should bend around the wall', p)
}
