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
  { x: -6, z: 28, s: 1.15, seed: 3 }, { x: 7, z: 38, s: 1.25, seed: 4 },
  { x: -5, z: 52, s: 1.2, seed: 5 }, { x: 6, z: 58, s: 1.05, seed: 6 },
  { x: -3, z: 66, s: 1.35, seed: 7 },
]

export const pines = [
  { x: 15, z: 20, s: 1.2 }, { x: -16, z: 34, s: 1.4 }, { x: 16, z: 44, s: 1.1 },
  { x: -17, z: 52, s: 1.3 }, { x: 17, z: 61, s: 1.2 }, { x: -15, z: 12, s: 1.0 },
]

export const rocks = [
  { x: 3, z: 3, s: 0.9, rot: 0.4 }, { x: -3, z: 20, s: 0.7, rot: 1.1 },
  { x: 4, z: 33, s: 1.1, rot: 0.2 }, { x: -4, z: 47, s: 0.8, rot: 2.0 },
  { x: 3.5, z: 60, s: 0.9, rot: 0.7 },
]

// Stone lanterns lining the path (pairs).
export const pathLanterns = [4, 14, 24, 34, 44, 54, 63].flatMap((z) => [
  { x: -2.4, z }, { x: 2.4, z },
])

export const hangingLanterns = [
  { x: 8, z: 8, color: C.vermilion }, { x: -8, z: 20, color: C.vermilion },
  { x: 9, z: 42, color: C.vermilion }, { x: -9, z: 54, color: C.gold },
]

// Circles the player cannot walk into. (Hill is NOT a blocker — it's climbable, see groundHeight.)
export const blockers = houses.map((h) => ({ x: h.x, z: h.z, r: 2.4 }))

// The Sahloka hill as a smooth height field so the player can walk UP to the gate.
export const HILL = { x: SAHLOKA.x, z: SAHLOKA.z, top: 4.5, rTop: 7, rBot: 15 }
export function groundHeight(x, z) {
  const d = Math.hypot(x - HILL.x, z - HILL.z)
  if (d <= HILL.rTop) return HILL.top
  if (d >= HILL.rBot) return 0
  const t = (HILL.rBot - d) / (HILL.rBot - HILL.rTop) // 0..1 up the slope
  return HILL.top * (t * t * (3 - 2 * t)) // smoothstep
}
