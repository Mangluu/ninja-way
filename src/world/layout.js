import { C, SAHLOKA, WORLD } from '../data/content'

// ─────────────────────────────────────────────────────────────────────────────
// The valley. A path runs along x = 0 from the entrance gate at the south end
// (z ≈ -8) up the torii avenue to the summit at z = 126. The village sits
// either side of the path; a stream crosses it at z = 44; a forest closes the
// valley on three sides so the edge of the world is trees, not a wall.
//
// Coordinates are hand-placed. Scatter (grass, flowers, rocks, forest) is
// seeded so it is the same on every visit.
// ─────────────────────────────────────────────────────────────────────────────

// deterministic random, so the meadow never reshuffles between reloads
function rng(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export const houses = [
  { x: -16, z: 12, rot: 0.3, tone: C.washi },
  { x: 17, z: 20, rot: -0.4, tone: '#e3d3b6' },
  { x: -18, z: 34, rot: 0.12, tone: C.washi },
  { x: 26, z: 30, rot: -0.6, tone: '#e0cdae' },
  { x: 18, z: 50, rot: -0.2, tone: '#e0cdae' },
  { x: -25, z: 48, rot: 0.5, tone: C.washi },
  { x: -17, z: 66, rot: 0.2, tone: C.washi },
  { x: 19, z: 78, rot: -0.3, tone: '#e3d3b6' },
  { x: -18, z: 92, rot: 0.15, tone: C.washi },
  { x: 18, z: 100, rot: -0.22, tone: '#e0cdae' },
]

// Cherry trees you can shake. Individually drawn (they sway and drop blossom).
export const sakura = [
  { x: -7, z: 4, s: 4.2, kind: 'tree_default_fall', seed: 1 },
  { x: 9, z: 14, s: 4.6, kind: 'tree_detailed_fall', seed: 2 },
  { x: -11, z: 28, s: 4.0, kind: 'tree_oak_fall', seed: 3 },
  { x: 14, z: 44, s: 4.4, kind: 'tree_default_fall', seed: 4 },
  { x: -9, z: 60, s: 4.3, kind: 'tree_fat_fall', seed: 5 },
  { x: 13, z: 72, s: 3.9, kind: 'tree_detailed_fall', seed: 6 },
  { x: -12, z: 84, s: 4.5, kind: 'tree_default_fall', seed: 7 },
  { x: 10, z: 96, s: 4.1, kind: 'tree_oak_fall', seed: 8 },
  { x: 24, z: 60, s: 4.6, kind: 'tree_detailed_fall', seed: 9 },
  { x: -26, z: 76, s: 4.2, kind: 'tree_fat_fall', seed: 10 },
]

// Pines inside the valley, then a forest that closes it. Instanced.
const PINE_KINDS = ['tree_pineTallA', 'tree_pineTallB', 'tree_pineTallC', 'tree_pineTallD', 'tree_pineRoundA', 'tree_pineDefaultA']
const DARK_KINDS = ['tree_default_dark', 'tree_detailed_dark', 'tree_tall_dark', 'tree_oak_dark', 'tree_pineTallB', 'tree_pineTallD']
const pineList = []
{
  const r = rng(11)
  const spots = [[22, 8], [-22, 22], [24, 40], [-24, 38], [28, 52], [-28, 58], [23, 70], [-23, 74], [26, 88], [-25, 100], [22, 108], [-21, 112], [16, 116], [-15, 118], [-30, 14], [31, 22], [-32, 66], [33, 82]]
  spots.forEach(([x, z], i) => pineList.push({ x: x + (r() - 0.5) * 2, z: z + (r() - 0.5) * 2, s: 4 + r() * 2.5, rot: r() * 6.28, kind: PINE_KINDS[i % PINE_KINDS.length] }))
}
export const pines = pineList

export const forest = []
{
  const r = rng(23)
  const push = (x, z) => forest.push({ x, z, s: 4.5 + r() * 3.5, rot: r() * 6.28, kind: DARK_KINDS[Math.floor(r() * DARK_KINDS.length)] })
  // two ragged rows down each side of the valley
  for (let z = WORLD.minZ + 2; z < WORLD.maxZ; z += 3.6) {
    for (const side of [-1, 1]) {
      push(side * (31 + r() * 3) + (r() - 0.5), z + (r() - 0.5) * 2)
      push(side * (36 + r() * 4), z + 1.8 + (r() - 0.5) * 2)
    }
  }
  // the south wall behind the entrance, and the ridge behind the summit
  for (let x = WORLD.minX; x <= WORLD.maxX; x += 3.4) {
    if (Math.abs(x) > 5) push(x + (r() - 0.5) * 1.5, WORLD.minZ + 1 + r() * 2)
    push(x + (r() - 0.5) * 1.5, 142 + r() * 6)
  }
}

export const rocks = []
{
  const r = rng(37)
  const KINDS = ['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD', 'rock_tallA', 'rock_tallB', 'stone_largeA', 'stone_largeB']
  const spots = [[4, 3], [-4, 20], [6, 33], [-5, 47], [7, 51], [-6, 63], [8, 69], [-7, 81], [6, 93], [-5, 101], [20, 14], [-21, 27], [23, 45], [-22, 55], [21, 64], [-24, 86], [26, 96], [-28, 104], [-15, 6], [16, 8]]
  spots.forEach(([x, z], i) => rocks.push({ x, z, s: 2.2 + r() * 2.2, rot: r() * 6.28, kind: KINDS[i % KINDS.length] }))
}

// meadow: grass tufts and flowers along the path and under the trees
export const grass = [], flowers = [], bushes = [], mushrooms = []
{
  const r = rng(51)
  const GRASS = ['grass', 'grass_large', 'grass_leafs', 'grass_leafsLarge']
  const FLOWER = ['flower_purpleA', 'flower_purpleB', 'flower_redA', 'flower_redB', 'flower_yellowA', 'flower_yellowB']
  const BUSH = ['plant_bush', 'plant_bushDetailed', 'plant_bushLarge', 'plant_bushSmall']
  const SHROOM = ['mushroom_red', 'mushroom_redGroup', 'mushroom_tan', 'mushroom_tanGroup']
  for (let i = 0; i < 520; i++) {
    // most along the path edges, the rest anywhere in the valley
    const onPath = r() < 0.55
    const x = onPath ? (r() < 0.5 ? -1 : 1) * (2.7 + r() * 4) : (r() - 0.5) * 56
    const z = WORLD.minZ + 6 + r() * (104 - 6)
    if (Math.abs(z - 44) < 3 && Math.abs(x) < 40) continue   // not in the stream
    grass.push({ x, z, s: 1.7 + r() * 1.3, rot: r() * 6.28, kind: GRASS[Math.floor(r() * GRASS.length)] })
  }
  for (let i = 0; i < 150; i++) {
    const x = (r() - 0.5) * 54, z = WORLD.minZ + 8 + r() * 96
    if (Math.abs(z - 44) < 3 || Math.abs(x) < 2.6) continue
    flowers.push({ x, z, s: 2.0 + r() * 1.0, rot: r() * 6.28, kind: FLOWER[Math.floor(r() * FLOWER.length)] })
  }
  for (let i = 0; i < 34; i++) {
    const x = (r() < 0.5 ? -1 : 1) * (8 + r() * 20), z = WORLD.minZ + 8 + r() * 96
    if (Math.abs(z - 44) < 3) continue
    bushes.push({ x, z, s: 2.6 + r() * 1.6, rot: r() * 6.28, kind: BUSH[Math.floor(r() * BUSH.length)] })
  }
  sakura.forEach((t, i) => { for (let k = 0; k < 2; k++) mushrooms.push({ x: t.x + (r() - 0.5) * 4, z: t.z + 1.5 + r() * 2, s: 2.2 + r(), rot: r() * 6.28, kind: SHROOM[(i + k) % SHROOM.length] }) })
}

// fences: a run along the training ground, and a few around the cook's camp
export const fences = []
{
  for (let i = 0; i < 7; i++) fences.push({ x: 17.5, z: -7 + i * 2.3, rot: Math.PI / 2, s: 2.3, kind: i === 3 ? 'fence_gate' : 'fence_simple' })
  for (let i = 0; i < 4; i++) fences.push({ x: 20 + i * 2.3, z: 16.5, rot: 0, s: 2.3, kind: 'fence_simple' })
  for (let i = 0; i < 3; i++) fences.push({ x: 4.5 + i * 2.3, z: 23.5, rot: 0, s: 2.3, kind: 'fence_simpleHigh' })
}

// the stream and its bridge
export const stream = { z: 44, halfWidth: 2.2 }
export const bridge = { x: 0, z: 44, s: 4.6 }
export const lilies = [{ x: -6, z: 43.2 }, { x: 9, z: 44.8 }, { x: -14, z: 44.5 }, { x: 20, z: 43.5 }, { x: -27, z: 44.2 }, { x: 31, z: 44.6 }]

// the cook's camp: a fire, pots, a log to sit on
export const camp = { x: 9.5, z: 20 }

// Stone lanterns lining the path. Each carries an id so it can be lit. They
// keep clear of the torii avenue (gates at gateZs below).
export const pathLanterns = [
  { id: 'lantern-0', x: -3.4, z: 10 },
  { id: 'lantern-1', x: 3.4, z: 26 },
  { id: 'lantern-2', x: -3.4, z: 38 },
  { id: 'lantern-3', x: 3.4, z: 54 },
  { id: 'lantern-4', x: -3.4, z: 72 },
  { id: 'lantern-5', x: 3.4, z: 90 },
]

// Hidden scrolls — tucked off the path, behind things, for people who wander.
export const scrolls = [
  { id: 'scroll-0', x: -23, z: 6, note: 'The best part is always the people. The tech is just the excuse.' },
  { id: 'scroll-1', x: 25, z: 38, note: 'Provenance over plausibility. Refuse, don’t invent.' },
  { id: 'scroll-2', x: -27, z: 60, note: 'Ship the thing. A demo beats a description.' },
  { id: 'scroll-3', x: 27, z: 84, note: 'Build worlds that remember the people in them.' },
  { id: 'scroll-4', x: -30, z: 108, note: 'Every gate you walk through was once a wall.' },
]

// Rice balls on little plates, left out around the village. The fox knows.
export const onigiri = [
  { id: 'rice-0', x: 11.5, z: 23.5 },
  { id: 'rice-1', x: -20, z: 36.5 },
  { id: 'rice-2', x: -7.5, z: 47 },
  { id: 'rice-3', x: 22, z: 81 },
  { id: 'rice-4', x: 3, z: 102 },
]

// Where the fox kit sits until someone makes friends with it.
export const petSpawn = { x: -3.6, z: -4.5 }

// The shrine bell, with the shrine itself behind it.
export const bell = { id: 'bell', x: -9, z: 50 }
export const shrine = { x: -12, z: 52.5, rot: Math.PI / 2 + 0.35, s: 1.7 }

export const hangingLanterns = [
  { x: 10, z: 8, color: C.vermilion }, { x: -10, z: 30, color: C.vermilion },
  { x: 12, z: 62, color: C.vermilion }, { x: -11, z: 88, color: C.gold },
]

// The hill as a smooth height field so the player can walk UP to the gate,
// plus the bridge deck, which lifts you a step over the water.
export const HILL = { x: SAHLOKA.x, z: SAHLOKA.z, top: 5, rTop: 9, rBot: 20 }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export function groundHeight(x, z) {
  let h = 0
  const d = Math.hypot(x - HILL.x, z - HILL.z)
  if (d <= HILL.rTop) h = HILL.top
  else if (d < HILL.rBot) { const t = (HILL.rBot - d) / (HILL.rBot - HILL.rTop); h = HILL.top * (t * t * (3 - 2 * t)) }
  if (Math.abs(x - bridge.x) < 2.6) h += 0.32 * smooth(bridge.z - 3.2, bridge.z - 1.6, z) * (1 - smooth(bridge.z + 1.6, bridge.z + 3.2, z))
  return h
}

// Crate stacks — knock them over by running through them, or put a star in one.
export const crateStacks = [
  { x: -8, z: 20 },
  { x: 12, z: 56 },
  { x: -9, z: 74 },
]

// The great drum, in the square.
export const taiko = { id: 'taiko', x: 10, z: 30 }

// Training targets, left of the path as you come through the entrance (+x is
// screen-left when facing down the path). Straw boards on posts, each turned
// toward the path so a new arrival sees them face on.
export const targets = [
  { id: 'target-0', x: 20, z: -4 },
  { id: 'target-1', x: 23, z: 0 },
  { id: 'target-2', x: 25, z: 4.5 },
  { id: 'target-3', x: 24, z: 9.5 },
  { id: 'target-4', x: 21, z: 13.5 },
]

// The torii avenue up to the hill, largest nearest the summit, and the
// entrance gate. The finale lights them in this order, entrance first.
export const gateZs = [104, 95, 86, 77, 68, 59]
export const entranceGate = { z: -8, s: 1.45 }
export const avenue = gateZs.map((z, i) => ({ z, s: 1.3 - i * 0.05 }))
export const temple = { x: 0, z: 136, s: 3.4 }

// Tap and throw pick volumes per interactable type: [radius, height]. A tap
// inside one of these cylinders means that thing, not the ground under it.
export const PICK = {
  project: [1.0, 2.5], lantern: [0.75, 1.7], scroll: [0.8, 1.4], villager: [2.2, 2.3],
  taiko: [1.4, 2.3], tree: [1.7, 5.5], bell: [1.5, 3.0], target: [0.9, 2.1], crate: [1.3, 1.9], sahloka: [4.5, 12],
}

// Quaternius torii: the posts stand 1.57 units either side of centre at
// scale 1, measured from the mesh.
export function toriiPosts(x, z, scale) {
  const half = 1.57 * scale
  return [{ x: x - half, z, r: 0.32 * scale }, { x: x + half, z, r: 0.32 * scale }]
}
export const gateBlockers = [
  ...toriiPosts(0, entranceGate.z, entranceGate.s),
  ...avenue.flatMap((g) => toriiPosts(0, g.z, g.s)),
]

// Three villagers. The cook keeps his fire, the rival holds the square, the
// sensei sits under a cherry tree and reads.
export const villagers = [
  { id: 'cook', kind: 'cook', name: 'The ramen cook', x: 7.5, z: 19, facing: -1.2 },
  { id: 'rival', kind: 'rival', name: 'A rival', x: -12, z: 58, facing: 1.4 },
  { id: 'sensei', kind: 'sensei', name: 'The sensei', x: 11.5, z: 75.5, facing: -1.9 },
]

// Everything solid the player can bump into: circles { x, z, r } and boxes
// { x, z, hw, hd, rot }, sized from the meshes. Built from the prop lists
// rather than hand-maintained, so adding a tree or a fence automatically adds
// its collider. The hill and the bridge deck are terrain, handled by
// groundHeight. Crates are absent: knocking those about is the point.
export const blockers = [
  ...houses.map((h) => ({ x: h.x, z: h.z, hw: 2.15, hd: 1.95, rot: h.rot })),
  ...sakura.map((t) => ({ x: t.x, z: t.z, r: 0.14 * t.s })),
  ...pines.map((t) => ({ x: t.x, z: t.z, r: 0.12 * t.s })),
  ...forest.filter((t) => Math.abs(t.x) < 34.5 || t.z < WORLD.minZ + 4 || t.z > 140).map((t) => ({ x: t.x, z: t.z, r: 0.2 * t.s })),
  ...rocks.map((r) => ({ x: r.x, z: r.z, r: 0.45 * r.s })),
  ...bushes.map((b) => ({ x: b.x, z: b.z, r: 0.25 * b.s })),
  ...pathLanterns.map((l) => ({ x: l.x, z: l.z, r: 0.42 })),
  ...hangingLanterns.map((l) => ({ x: l.x, z: l.z, r: 0.28 })),
  ...scrolls.map((s) => ({ x: s.x, z: s.z, r: 0.42 })),
  // Kenney fences run along the back edge of their tile, not through the middle
  ...fences.map((f) => { const off = -0.465 * f.s; return { x: f.x + off * Math.sin(f.rot), z: f.z + off * Math.cos(f.rot), hw: 0.5 * f.s, hd: 0.1 * f.s, rot: f.rot } }),
  { x: bell.x, z: bell.z, r: 1.25 },
  { x: shrine.x, z: shrine.z, r: 1.3 },
  { x: taiko.x, z: taiko.z, r: 1.2 },
  // the camp: fire, pots, the log seat, the wood pile
  { x: camp.x, z: camp.z, r: 1.0 },
  { x: camp.x + 1.8, z: camp.z - 0.6, r: 0.75 },
  { x: camp.x + 2.4, z: camp.z + 0.9, r: 0.5 },
  { x: camp.x - 0.4, z: camp.z + 2.6, hw: 1.5, hd: 0.85, rot: 0.2 },
  { x: camp.x + 3, z: camp.z + 2.2, r: 0.9 },
  { x: temple.x, z: temple.z, r: 4.4 },
  // the bridge rails; the deck between them is walkable
  { x: bridge.x - 2.05, z: bridge.z, hw: 0.15, hd: 2.4, rot: 0 },
  { x: bridge.x + 2.05, z: bridge.z, hw: 0.15, hd: 2.4, rot: 0 },
  // the summit: the golden gate's posts and the plateau lanterns
  { x: SAHLOKA.x - 3, z: SAHLOKA.z, r: 0.6 },
  { x: SAHLOKA.x + 3, z: SAHLOKA.z, r: 0.6 },
  ...[[-6, -4], [6, -4], [-6.5, 3], [6.5, 3]].map(([dx, dz]) => ({ x: SAHLOKA.x + dx, z: SAHLOKA.z + dz, r: 0.5 })),
  ...targets.map((t) => ({ x: t.x, z: t.z, r: 0.5 })),
  // people are solid too
  ...villagers.map((v) => ({ x: v.x, z: v.z, r: 0.7 })),
]
