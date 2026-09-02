import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'
import { woodBoards } from '../lib/materials'
import { groundHeight } from './layout'
import { crateHit } from '../sound.js'

// Stacks of crates that scatter when you run through them.
//
// There is no prompt and no key: the reward is entirely physical, which is what
// makes it worth doing more than once — unlike a row of identical "press E"
// props. Deliberately not a physics engine; a dozen boxes with velocity, spin,
// gravity and a floor is indistinguishable from one at this scale.
//
// ponytail: crates only collide with the ground and the player, not each other —
// upgrade to real physics only if stacking behaviour ever matters.

const SIZE = 0.62
const GRAV = 22
const REST_EPS = 0.35

export default function Crates({ stacks, playerRef, onScatter, api }) {
  const meshes = useRef([])
  const onScatterRef = useRef(onScatter); onScatterRef.current = onScatter

  // A star or a kick from outside: shove everything near the point.
  useEffect(() => {
    if (!api) return
    api.current = {
      hit: (x, z, power = 1) => {
        let any = false
        for (const c of crates) {
          const dx = c.pos.x - x, dz = c.pos.z - z, d = Math.hypot(dx, dz)
          if (d > 1.9) continue
          const k = (1 - d / 1.9) * (4 + power * 3)
          c.vel.x += (dx / (d || 1)) * k; c.vel.z += (dz / (d || 1)) * k
          c.vel.y += 3 + Math.random() * 2
          c.spin.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10)
          if (c.resting && onScatterRef.current) onScatterRef.current()
          c.resting = false; any = true
        }
        if (any) try { crateHit(1) } catch {}
        return any
      },
    }
    return () => { api.current = null }
  })
  const tex = woodBoards(1, 1)

  const crates = useMemo(() => {
    const out = []
    stacks.forEach((s, si) => {
      // a rough pyramid: three on the bottom, two, then one
      const rows = [[-0.7, 0, 0.7], [-0.35, 0.35], [0]]
      rows.forEach((row, ri) => row.forEach((dx, ci) => {
        const x = s.x + dx * SIZE * 1.05 + (Math.random() - 0.5) * 0.04
        const z = s.z + (Math.random() - 0.5) * 0.35
        const y = groundHeight(x, z) + SIZE / 2 + ri * SIZE
        out.push({
          id: `${si}-${ri}-${ci}`,
          home: new THREE.Vector3(x, y, z),
          pos: new THREE.Vector3(x, y, z),
          vel: new THREE.Vector3(),
          rot: new THREE.Euler(0, Math.random() * 0.6 - 0.3, 0),
          spin: new THREE.Vector3(),
          resting: true,
        })
      }))
    })
    return out
  }, [stacks])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const p = playerRef?.current
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i]
      const m = meshes.current[i]
      if (!m) continue

      // a fast player shoulders them out of the way
      if (p && p.speed > 2.2) {
        const dx = c.pos.x - p.x, dz = c.pos.z - p.z
        const d = Math.hypot(dx, dz)
        if (d < 1.15 && Math.abs(c.pos.y - p.y) < 2) {
          // Clamped and capped: dividing by the raw distance blows up at contact
          // range and launched crates halfway across the village.
          const push = Math.min((p.speed * 0.26 + 1.1) / Math.max(d, 0.7), 6.5)
          c.vel.x += (dx / (d || 1)) * push
          c.vel.z += (dz / (d || 1)) * push
          c.vel.y += 2.2 + Math.random() * 1.3
          c.spin.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9)
          if (c.resting && onScatterRef.current) onScatterRef.current()
          c.resting = false
          try { crateHit(0.9) } catch {}
        }
      }

      if (c.resting) continue

      c.vel.y -= GRAV * dt
      c.pos.addScaledVector(c.vel, dt)
      c.rot.x += c.spin.x * dt
      c.rot.y += c.spin.y * dt
      c.rot.z += c.spin.z * dt

      const floor = groundHeight(c.pos.x, c.pos.z) + SIZE / 2
      if (c.pos.y <= floor) {
        c.pos.y = floor
        if (Math.abs(c.vel.y) > 1.2) {
          try { crateHit(Math.min(Math.abs(c.vel.y) / 9, 1) * 0.7) } catch {}
          c.vel.y = -c.vel.y * 0.32          // bounce
          c.vel.x *= 0.72; c.vel.z *= 0.72
          c.spin.multiplyScalar(0.6)
        } else {
          c.vel.set(0, 0, 0)
          c.spin.set(0, 0, 0)
          // settle flat rather than resting on a corner
          c.rot.x = Math.round(c.rot.x / (Math.PI / 2)) * (Math.PI / 2)
          c.rot.z = Math.round(c.rot.z / (Math.PI / 2)) * (Math.PI / 2)
          if (Math.hypot(c.vel.x, c.vel.z) < REST_EPS) c.resting = true
        }
      }

      m.position.copy(c.pos)
      m.rotation.copy(c.rot)
    }
  })

  return (
    <group>
      {crates.map((c, i) => (
        <mesh
          key={c.id}
          ref={(el) => (meshes.current[i] = el)}
          position={c.home}
          rotation={c.rot}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[SIZE, SIZE, SIZE]} />
          <meshToonMaterial gradientMap={gradientMap} color={C.wood} map={tex.map} normalMap={tex.normalMap} />
        </mesh>
      ))}
    </group>
  )
}
