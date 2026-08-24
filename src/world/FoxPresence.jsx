import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/content'
import { pines, sakura, pathLanterns, groundHeight } from './layout'

// Something is watching.
//
// It is never introduced and never explained. After the first lantern, a pair
// of eyes opens in the treeline for a moment — but only while you are standing
// outside lantern light, so it always reads as your own fault for wandering.
// They hold for a breath and are gone before you can be sure.
//
// The frequency climbs with every lantern, so the village feels more watched
// the further you get, and the reveal at the summit lands as relief rather
// than as a jump scare.

const EYE = '#ff2d18'

export default function FoxPresence({ lit = 0, litIds, playerRef }) {
  const eyes = useRef()
  const glow = useRef()
  const state = useRef({ next: 6, t: 1, x: 0, y: 0, z: 0, look: 0 })

  // it hides in the treeline, never on the path
  const spots = useMemo(() => {
    const trees = [...pines, ...sakura]
    return trees.map((t) => ({ x: t.x, z: t.z }))
  }, [])

  useFrame((s, dt) => {
    const g = state.current
    const p = playerRef?.current
    if (!eyes.current || !p) return

    // fade whatever is currently showing
    if (g.t < 1) {
      g.t = Math.min(g.t + dt * 1.15, 1)
      // open fast, hold, then vanish
      const a = g.t < 0.18 ? g.t / 0.18 : (g.t > 0.62 ? Math.max(0, 1 - (g.t - 0.62) / 0.38) : 1)
      eyes.current.visible = true
      eyes.current.position.set(g.x, g.y, g.z)
      eyes.current.rotation.y = g.look
      eyes.current.children.forEach((c) => { if (c.material) c.material.opacity = a })
      if (glow.current) glow.current.material.opacity = a * 0.22
      return
    }
    eyes.current.visible = false

    if (lit < 1) return

    // are you standing in the dark? only lit lanterns count as safety
    let inLight = false
    for (const l of pathLanterns) {
      if (!litIds?.has(l.id)) continue
      if (Math.hypot(p.x - l.x, p.z - l.z) < 11) { inLight = true; break }
    }
    if (inLight) { g.next = Math.max(g.next, 3); return }

    g.next -= dt
    if (g.next > 0) return

    // it appears more often the deeper you get
    const gap = Math.max(4.5, 15 - lit * 1.8)
    g.next = gap + Math.random() * gap * 0.6

    // pick a tree in the middle distance — close enough to read, far enough to doubt
    const candidates = spots.filter((sp) => {
      const d = Math.hypot(p.x - sp.x, p.z - sp.z)
      return d > 13 && d < 42
    })
    if (!candidates.length) return
    const spot = candidates[(Math.random() * candidates.length) | 0]

    g.x = spot.x
    g.z = spot.z
    g.y = groundHeight(spot.x, spot.z) + 1.5
    g.look = Math.atan2(p.x - spot.x, p.z - spot.z)   // it is looking at you
    g.t = 0
  })

  return (
    <group ref={eyes} visible={false} renderOrder={6}>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshBasicMaterial color={EYE} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={glow} position={[0, 0, -0.05]}>
        <planeGeometry args={[1.5, 0.7]} />
        <meshBasicMaterial
          color={EYE}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
