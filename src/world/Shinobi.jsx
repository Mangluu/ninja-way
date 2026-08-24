import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'

function M({ color, emissive, emissiveIntensity = 0 }) {
  return <meshToonMaterial color={color} gradientMap={gradientMap} emissive={emissive || '#000'} emissiveIntensity={emissiveIntensity} />
}
const ink = (t = 0.03) => <Outlines thickness={t} color={C.sumi} />

// Shinobi Shivang.
//
// `state` is a ref: { moving, speed, sprinting, airborne } set by the controller.
// `lit` is how many lanterns are burning, and it drives everything about how he
// looks. He starts as an academy nobody — hood up, cloth band, no plate — and
// earns his way up. The milestones:
//
//   1  Genin   the metal plate is fitted to the band
//   3  Chūnin  the hood comes down; he stops hiding
//   5  Jōnin   orange
//
// The lanterns in between still move something smaller so none of them feels
// wasted. The whisker marks and the gold eyes are there from the first frame,
// long before anything explains them.
export default function Shinobi({ state, lit = 0 }) {
  const legL = useRef(), legR = useRef(), armL = useRef(), armR = useRef()
  const body = useRef(), scarf = useRef(), hood = useRef()
  const phase = useRef(0)

  const hasPlate = lit >= 1
  const hoodDown = lit >= 3
  const isJonin = lit >= 5
  const sealed = lit >= 6

  // the smaller in-between beats
  const scarfColor = lit >= 2 ? C.vermilionLite : C.vermilion
  const eyeGlow = lit >= 4 ? C.goldLite : C.gold
  const sleeve = isJonin ? C.orange : C.indigo

  useFrame((s, dt) => {
    const st = state.current || { moving: false, speed: 0 }
    const t = s.clock.elapsedTime
    if (st.moving) {
      phase.current += dt * (6 + st.speed * 1.4)
      const sw = Math.sin(phase.current)
      const amp = st.sprinting ? 0.75 : 0.55
      if (legL.current) legL.current.rotation.x = sw * amp
      if (legR.current) legR.current.rotation.x = -sw * amp
      if (st.sprinting) {
        // arms pinned back, chest low
        const back = 2.35
        if (armL.current) armL.current.rotation.x += (back - armL.current.rotation.x) * 0.16
        if (armR.current) armR.current.rotation.x += (back - armR.current.rotation.x) * 0.16
        if (body.current) {
          body.current.position.y = Math.abs(Math.sin(phase.current)) * 0.05
          body.current.rotation.x += (0.44 - body.current.rotation.x) * 0.14
        }
        if (scarf.current) scarf.current.rotation.x = -1.15 - Math.sin(t * 9) * 0.12
      } else {
        if (armL.current) armL.current.rotation.x = -sw * amp * 0.8
        if (armR.current) armR.current.rotation.x = sw * amp * 0.8
        if (body.current) { body.current.position.y = Math.abs(Math.sin(phase.current)) * 0.06; body.current.rotation.x = 0.14 }
        if (scarf.current) scarf.current.rotation.x = -0.5 - Math.sin(t * 6) * 0.15
      }
    } else {
      const breathe = Math.sin(t * 1.6) * 0.5 + 0.5
      const damp = (r, to) => (r.rotation.x += (to - r.rotation.x) * 0.1)
      if (legL.current) damp(legL.current, 0)
      if (legR.current) damp(legR.current, 0)
      if (armL.current) damp(armL.current, 0.05)
      if (armR.current) damp(armR.current, 0.05)
      if (body.current) { body.current.position.y += (breathe * 0.02 - body.current.position.y) * 0.1; body.current.rotation.x += (0 - body.current.rotation.x) * 0.1 }
      if (scarf.current) scarf.current.rotation.x = -0.2 + Math.sin(t * 1.5) * 0.1
    }
    // the hood settles back onto the shoulders rather than snapping
    if (hood.current) {
      const target = hoodDown ? -1.35 : -0.25
      hood.current.rotation.x += (target - hood.current.rotation.x) * 0.08
      const py = hoodDown ? 1.44 : 1.62
      const pz = hoodDown ? -0.24 : -0.04
      hood.current.position.y += (py - hood.current.position.y) * 0.08
      hood.current.position.z += (pz - hood.current.position.z) * 0.08
    }
  })

  return (
    <group>
      {/* legs (pivot at hip) */}
      <group ref={legL} position={[-0.16, 0.62, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow><capsuleGeometry args={[0.12, 0.42, 4, 8]} /><M color={C.indigoDeep} />{ink(0.02)}</mesh>
        <mesh position={[0, -0.6, 0.06]} castShadow><boxGeometry args={[0.2, 0.1, 0.34]} /><M color={C.sumi} /></mesh>
      </group>
      <group ref={legR} position={[0.16, 0.62, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow><capsuleGeometry args={[0.12, 0.42, 4, 8]} /><M color={C.indigoDeep} />{ink(0.02)}</mesh>
        <mesh position={[0, -0.6, 0.06]} castShadow><boxGeometry args={[0.2, 0.1, 0.34]} /><M color={C.sumi} /></mesh>
      </group>

      {/* body group (bobs) */}
      <group ref={body} position={[0, 0, 0]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.42, 6, 12]} />
          <M color={C.indigo} />{ink(0.03)}
        </mesh>

        {/* Jōnin: the orange goes on as a vest over the robe, not a repaint */}
        {isJonin && (
          <>
            <mesh position={[0, 0.99, 0.14]} castShadow>
              <boxGeometry args={[0.4, 0.5, 0.22]} />
              <M color={C.orange} emissive={C.orange} emissiveIntensity={0.12} />{ink(0.025)}
            </mesh>
            <mesh position={[0, 1.19, 0]}>
              <cylinderGeometry args={[0.31, 0.31, 0.08, 12]} />
              <M color={C.orangeLite} emissive={C.orange} emissiveIntensity={0.2} />
            </mesh>
          </>
        )}

        <mesh position={[0, 0.66, 0]} castShadow>
          <coneGeometry args={[0.42, 0.5, 12]} />
          <M color={C.indigoDeep} />{ink(0.03)}
        </mesh>
        <mesh position={[0, 0.86, 0]}><cylinderGeometry args={[0.32, 0.32, 0.12, 12]} /><M color={C.vermilion} emissive={C.vermilion} emissiveIntensity={0.25} /></mesh>

        {/* arms */}
        <group ref={armL} position={[-0.34, 1.12, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow><capsuleGeometry args={[0.1, 0.34, 4, 8]} /><M color={sleeve} /></mesh>
          <mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.1, 8, 8]} /><M color={C.washi} /></mesh>
        </group>
        <group ref={armR} position={[0.34, 1.12, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow><capsuleGeometry args={[0.1, 0.34, 4, 8]} /><M color={sleeve} /></mesh>
          <mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.1, 8, 8]} /><M color={C.washi} /></mesh>
        </group>

        {/* scarf */}
        <group position={[0, 1.2, -0.1]} ref={scarf}>
          <mesh position={[0, -0.25, -0.15]} castShadow><boxGeometry args={[0.22, 0.6, 0.04]} /><M color={scarfColor} emissive={C.vermilion} emissiveIntensity={lit >= 2 ? 0.35 : 0.2} /></mesh>
          <mesh position={[0.12, -0.5, -0.28]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.16, 0.4, 0.04]} /><M color={C.vermilion} /></mesh>
        </group>

        <mesh position={[0, 1.28, 0]}><cylinderGeometry args={[0.22, 0.24, 0.18, 12]} /><M color={C.vermilion} /></mesh>

        {/* head */}
        <mesh position={[0, 1.5, 0.02]} castShadow>
          <sphereGeometry args={[0.29, 16, 16]} />
          <M color={C.washi} />{ink(0.025)}
        </mesh>
        <mesh position={[0, 1.52, 0.22]}><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshBasicMaterial color={C.sumi} /></mesh>

        {/* eyes — gold from the very first frame */}
        <mesh position={[-0.09, 1.52, 0.26]}><sphereGeometry args={[0.032, 8, 8]} /><meshBasicMaterial color={eyeGlow} /></mesh>
        <mesh position={[0.09, 1.52, 0.26]}><sphereGeometry args={[0.032, 8, 8]} /><meshBasicMaterial color={eyeGlow} /></mesh>

        {/* three marks a cheek. Nothing explains them yet. */}
        {[-1, 1].map((side) =>
          [0, 1, 2].map((i) => (
            <mesh
              key={`${side}-${i}`}
              position={[side * (0.155 + i * 0.006), 1.475 - i * 0.042, 0.243]}
              rotation={[0, side * -0.5, side * (0.16 - i * 0.14)]}
            >
              <boxGeometry args={[0.105, 0.016, 0.012]} />
              <meshBasicMaterial color={C.sumi} />
            </mesh>
          ))
        )}

        {/* hair, only once the hood is off the head */}
        {hoodDown && [-0.14, 0, 0.14].map((x, i) => (
          <mesh key={i} position={[x, 1.71 - Math.abs(x) * 0.5, -0.02]} rotation={[0.2, 0, x * 1.6]} castShadow>
            <coneGeometry args={[0.11, 0.26, 5]} />
            <M color={C.sumi} />
          </mesh>
        ))}

        {/* hood — rides up over the head, or back on the shoulders */}
        <group ref={hood} position={[0, 1.62, -0.04]} rotation={[-0.25, 0, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.36, 0.5, 12, 1, true]} />
            <M color={C.indigoDeep} />{ink(0.03)}
          </mesh>
        </group>

        {/* the band. Cloth at first; the plate is fitted when you make genin. */}
        <mesh position={[0, 1.66, 0.12]}><boxGeometry args={[0.5, 0.09, 0.06]} /><M color={hasPlate ? C.indigoDeep : C.sumi} /></mesh>
        {hasPlate && (
          <mesh position={[0, 1.665, 0.155]}>
            <boxGeometry args={[0.3, 0.105, 0.03]} />
            <M color={C.steel} emissive={C.steel} emissiveIntensity={sealed ? 0.5 : 0.25} />
            {ink(0.02)}
          </mesh>
        )}
      </group>
    </group>
  )
}
