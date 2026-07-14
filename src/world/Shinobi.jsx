import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'

function M({ color, emissive, emissiveIntensity = 0 }) {
  return <meshToonMaterial color={color} gradientMap={gradientMap} emissive={emissive || '#000'} emissiveIntensity={emissiveIntensity} />
}
const ink = (t = 0.03) => <Outlines thickness={t} color={C.sumi} />

// Shinobi Shivang. `state` is a ref: { moving, speed } set by the controller.
export default function Shinobi({ state }) {
  const legL = useRef(), legR = useRef(), armL = useRef(), armR = useRef()
  const body = useRef(), scarf = useRef()
  const phase = useRef(0)

  useFrame((s, dt) => {
    const st = state.current || { moving: false, speed: 0 }
    const t = s.clock.elapsedTime
    if (st.moving) {
      phase.current += dt * (6 + st.speed * 1.4)
      const sw = Math.sin(phase.current)
      const amp = 0.55
      if (legL.current) legL.current.rotation.x = sw * amp
      if (legR.current) legR.current.rotation.x = -sw * amp
      if (armL.current) armL.current.rotation.x = -sw * amp * 0.8
      if (armR.current) armR.current.rotation.x = sw * amp * 0.8
      if (body.current) { body.current.position.y = Math.abs(Math.sin(phase.current)) * 0.06; body.current.rotation.x = 0.14 }
      if (scarf.current) scarf.current.rotation.x = -0.5 - Math.sin(t * 6) * 0.15
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
        {/* torso / robe */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.42, 6, 12]} />
          <M color={C.indigo} />{ink(0.03)}
        </mesh>
        {/* robe skirt */}
        <mesh position={[0, 0.66, 0]} castShadow>
          <coneGeometry args={[0.42, 0.5, 12]} />
          <M color={C.indigoDeep} />{ink(0.03)}
        </mesh>
        {/* belt */}
        <mesh position={[0, 0.86, 0]}><cylinderGeometry args={[0.32, 0.32, 0.12, 12]} /><M color={C.vermilion} emissive={C.vermilion} emissiveIntensity={0.25} /></mesh>

        {/* arms (pivot at shoulder) */}
        <group ref={armL} position={[-0.34, 1.12, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow><capsuleGeometry args={[0.1, 0.34, 4, 8]} /><M color={C.indigo} /></mesh>
          <mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.1, 8, 8]} /><M color={C.washi} /></mesh>
        </group>
        <group ref={armR} position={[0.34, 1.12, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow><capsuleGeometry args={[0.1, 0.34, 4, 8]} /><M color={C.indigo} /></mesh>
          <mesh position={[0, -0.46, 0]}><sphereGeometry args={[0.1, 8, 8]} /><M color={C.washi} /></mesh>
        </group>

        {/* scarf trailing back */}
        <group position={[0, 1.2, -0.1]} ref={scarf}>
          <mesh position={[0, -0.25, -0.15]} castShadow><boxGeometry args={[0.22, 0.6, 0.04]} /><M color={C.vermilionLite} emissive={C.vermilion} emissiveIntensity={0.2} /></mesh>
          <mesh position={[0.12, -0.5, -0.28]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.16, 0.4, 0.04]} /><M color={C.vermilion} /></mesh>
        </group>

        {/* neck scarf wrap */}
        <mesh position={[0, 1.28, 0]}><cylinderGeometry args={[0.22, 0.24, 0.18, 12]} /><M color={C.vermilion} /></mesh>

        {/* head */}
        <mesh position={[0, 1.5, 0.02]} castShadow>
          <sphereGeometry args={[0.29, 16, 16]} />
          <M color={C.washi} />{ink(0.025)}
        </mesh>
        {/* face shadow under hood */}
        <mesh position={[0, 1.52, 0.22]}><sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshBasicMaterial color={C.sumi} /></mesh>
        {/* eyes */}
        <mesh position={[-0.09, 1.52, 0.26]}><sphereGeometry args={[0.032, 8, 8]} /><meshBasicMaterial color={C.goldLite} /></mesh>
        <mesh position={[0.09, 1.52, 0.26]}><sphereGeometry args={[0.032, 8, 8]} /><meshBasicMaterial color={C.goldLite} /></mesh>
        {/* hood */}
        <mesh position={[0, 1.62, -0.04]} rotation={[-0.25, 0, 0]} castShadow>
          <coneGeometry args={[0.36, 0.5, 12, 1, true]} />
          <M color={C.indigoDeep} />{ink(0.03)}
        </mesh>
        {/* headband knot (gold) */}
        <mesh position={[0, 1.66, 0.12]}><boxGeometry args={[0.5, 0.09, 0.06]} /><M color={C.gold} emissive={C.gold} emissiveIntensity={0.5} /></mesh>
      </group>
    </group>
  )
}
