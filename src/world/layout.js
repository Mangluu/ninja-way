import { C, SAHLOKA } from '../data/content'

// Hand-placed village. Path runs along x≈0 toward Sahloka (+Z).
export const houses = [
  { x: -9, z: 10, rot: 0.3, tone: C.washi },
  { x: 10, z: 15, rot: -0.4, tone: '#e3d3b6' },
  { x: -12, z: 23, rot: 0.12, tone: C.washi },
  { x: 11, z: 31, rot: -0.2, tone: '#e0cdae' },
  { x: -11, z: 45, rot: 0.2, tone: C.washi },
  { x: 12, z: 49, rot: -0.3, tone: '#e3d3b6' },
  { x: -13, z: 57, rot: 0.15, tone: C.washi },
  { x: 11, z: 62, rot: -0.22, tone: '#e0cdae' },
]

export const sakura = [
  { x: -4, z: 5, s: 1.1, seed: 1 }, { x: 5, z: 12, s: 1.3, seed: 2 },
  { x: -8, z: 27, s: 1.15, seed: 3 }, { x: 12, z: 37, s: 1.25, seed: 4 },
  { x: -5, z: 52, s: 1.2, seed: 5 }, { x: 12, z: 57, s: 1.05, seed: 6 },
  { x: -12, z: 63, s: 1.35, seed: 7 },
]

export const pines = [
  { x: 15, z: 20, s: 1.2 }, { x: -16, z: 34, s: 1.4 }, { x: 16, z: 44, s: 1.1 },
  { x: -17, z: 52, s: 1.3 }, { x: 17, z: 61, s: 1.2 }, { x: -15, z: 12, s: 1.0 },
]

export const rocks = [
  { x: 3, z: 3, s: 0.9, rot: 0.4 }, { x: -3, z: 20, s: 0.7, rot: 1.1 },
  { x: 4, z: 33, s: 1.1, rot: 0.2 }, { x: -4, z: 47, s: 0.8, rot: 2.0 },
  { x: 5.5, z: 51, s: 0.9, rot: 0.7 },
]

// Stone lanterns lining the path (pairs). Each carries an id so it can be lit.
//
// These z values deliberately avoid the torii avenue leading to the summit,
// which stands at z = 28, 34, 40, 46, 52 and 58. The old spacing put a lantern
// at z=34 directly inside a torii post, so every position here keeps at least
// three units of clearance from a gate.
export const pathLanterns = [
  { id: 'lantern-0', x: -2.4, z: 8 },
  { id: 'lantern-1', x: 2.4, z: 19 },
  { id: 'lantern-2', x: -2.4, z: 31 },
  { id: 'lantern-3', x: 2.4, z: 43 },
  { id: 'lantern-4', x: -2.4, z: 55 },
]

// Hidden scrolls — tucked off the path, behind things, for people who wander.
export const scrolls = [
  { id: 'scroll-0', x: -14, z: 6,  note: 'The best part is always the people. The tech is just the excuse.' },
  { id: 'scroll-1', x: 15, z: 27,  note: 'Provenance over plausibility. Refuse, don’t invent.' },
  { id: 'scroll-2', x: -16, z: 41, note: 'Ship the thing. A demo beats a description.' },
  { id: 'scroll-3', x: 16, z: 55,  note: 'Build worlds that remember the people in them.' },
  { id: 'scroll-4', x: -18, z: 50,  note: 'Every gate you walk through was once a wall.' },
]

// The shrine bell, just off the path near the middle of the village.
export const bell = { id: 'bell', x: -5.5, z: 30 }

export const hangingLanterns = [
  { x: 8, z: 8, color: C.vermilion }, { x: -8, z: 20, color: C.vermilion },
  { x: 15, z: 40, color: C.vermilion }, { x: -9, z: 54, color: C.gold },
]



// The Sahloka hill as a smooth height field so the player can walk UP to the gate.
export const HILL = { x: SAHLOKA.x, z: SAHLOKA.z, top: 4.5, rTop: 7, rBot: 15 }
export function groundHeight(x, z) {
  const d = Math.hypot(x - HILL.x, z - HILL.z)
  if (d <= HILL.rTop) return HILL.top
  if (d >= HILL.rBot) return 0
  const t = (HILL.rBot - d) / (HILL.rBot - HILL.rTop) // 0..1 up the slope
  return HILL.top * (t * t * (3 - 2 * t)) // smoothstep
}

// Crate stacks — knock them over by running through them. No prompt, no key.
export const crateStacks = [
  { x: -6, z: 14 },
  { x: 7, z: 34 },
  { x: -6, z: 44 },
]

// The great drum, off the path in the village square.
export const taiko = { id: 'taiko', x: 6, z: 22 }

// Gate posts along the approach, plus the entrance torii.
export const gateBlockers = [
  ...toriiPosts(0, -5, 1.5),
  ...Array.from({ length: 6 }, (_, i) => toriiPosts(0, SAHLOKA.z - 16 - i * 6, 1.0 + i * 0.12)).flat(),
]

// Everything solid the player can bump into. Built from the prop lists rather
// than hand-maintained, so adding a tree or a lantern automatically adds its
// collider. The hill is deliberately absent — it is walkable terrain, handled
// by groundHeight below. Crates are absent too: knocking those about is the
// point, so they are pushed rather than blocked.
export const blockers = [
  ...houses.map((h) => ({ x: h.x, z: h.z, r: 2.4 })),
  ...sakura.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.s })),
  ...pines.map((t) => ({ x: t.x, z: t.z, r: 0.34 * t.s })),
  ...rocks.map((r) => ({ x: r.x, z: r.z, r: 0.62 * r.s })),
  ...pathLanterns.map((l) => ({ x: l.x, z: l.z, r: 0.42 })),
  ...hangingLanterns.map((l) => ({ x: l.x, z: l.z, r: 0.28 })),
  ...scrolls.map((s) => ({ x: s.x, z: s.z, r: 0.42 })),
  { x: bell.x, z: bell.z, r: 1.25 },
  { x: taiko.x, z: taiko.z, r: 1.2 },
]

// Torii posts block, but the gap between them does not — you walk through a gate.
export function toriiPosts(x, z, scale) {
  const half = 1.5 * scale
  return [{ x: x - half, z, r: 0.3 * scale }, { x: x + half, z, r: 0.3 * scale }]
}
