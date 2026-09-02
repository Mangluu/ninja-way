import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, SAHLOKA } from '../data/content'
import { gradientMap } from '../lib/toon'
import { StoneLantern } from './props'
import { Prop } from './props3d'
import { HILL, avenue, entranceGate, temple } from './layout'

function Gold({ intensity = 1.4, color = C.gold }) {
  return <meshToonMaterial gradientMap={gradientMap} color={color} emissive={color} emissiveIntensity={intensity} />
}

const TOP = HILL.top
const _wp = new THREE.Vector3()

// The grand glowing gate itself (custom so it can emit light / bloom).
function GrandGate() {
  const portal = useRef(), glow = useRef(), ring1 = useRef(), ring2 = useRef(), ring3 = useRef(), beam = useRef()
  const floats = useRef([])
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    if (portal.current) { const k = 1 + Math.sin(t * 1.4) * 0.05; portal.current.scale.set(k, k, k); portal.current.material.opacity = (0.7 + Math.sin(t * 2.1) * 0.14) * THREE.MathUtils.smoothstep(portal.current.getWorldPosition(_wp).distanceTo(s.camera.position), 3, 9) }
    // These additive planes are big enough to fill the screen if the camera gets
    // close. Fade them out by camera distance so approaching never whites out.
    const near = (m, full, from, to) => {
      if (!m) return
      const d = m.getWorldPosition(_wp).distanceTo(s.camera.position)
      m.material.opacity = full * THREE.MathUtils.smoothstep(d, from, to)
    }
    if (glow.current) { const g = 1 + Math.sin(t * 1.1) * 0.09; glow.current.scale.set(g, g, 1) }
    near(glow.current, 0.34 + Math.sin(t * 1.6) * 0.08, 6, 22)
    near(beam.current, 0.22, 10, 34)
    if (ring1.current) ring1.current.rotation.z += dt * 0.5
    if (ring2.current) ring2.current.rotation.z -= dt * 0.32
    if (ring3.current) { ring3.current.rotation.x += dt * 0.4; ring3.current.rotation.y += dt * 0.25 }
    if (beam.current) beam.current.material.opacity = 0.2 + Math.sin(t * 1.3) * 0.06
    floats.current.forEach((m, i) => { if (m) { const a = t * 0.3 + i * 1.7; m.position.set(Math.cos(a) * 5.5, 5 + Math.sin(t * 0.8 + i) * 1.2 + i * 0.3, Math.sin(a) * 5.5) } })
  })

  return (
    <group position={[0, TOP, 0]}>
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, 5, 0]} castShadow><cylinderGeometry args={[0.4, 0.5, 10, 14]} /><Gold intensity={1.1} /></mesh>
      ))}
      <mesh position={[0, 7, 0]} castShadow><boxGeometry args={[7.6, 0.6, 0.7]} /><Gold intensity={1.1} /></mesh>
      <mesh position={[0, 9.4, 0]} castShadow><boxGeometry args={[9.2, 0.7, 1.0]} /><Gold intensity={1.3} /></mesh>
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} position={[x, 9.65, 0]} rotation={[0, 0, x < 0 ? 0.2 : -0.2]}><boxGeometry args={[1.4, 0.5, 1.05]} /><Gold intensity={1.3} /></mesh>
      ))}
      <mesh position={[0, 9.9, 0]}><boxGeometry args={[0.8, 0.5, 1.1]} /><Gold intensity={1.6} /></mesh>
      <mesh position={[0, 8.2, 0.1]}><boxGeometry args={[1.0, 1.0, 0.15]} /><Gold intensity={1.8} color={C.goldLite} /></mesh>

      <mesh ref={portal} position={[0, 5, 0]}>
        <circleGeometry args={[3.4, 56]} />
        <meshBasicMaterial color={C.goldLite} transparent opacity={0.78} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={glow} position={[0, 5, -0.1]}>
        <planeGeometry args={[16, 16]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.34} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring1} position={[0, 5, 0.05]}><torusGeometry args={[3.7, 0.1, 8, 72]} /><meshBasicMaterial color={C.goldLite} toneMapped={false} /></mesh>
      <mesh ref={ring2} position={[0, 5, 0.05]}><torusGeometry args={[4.3, 0.06, 8, 72]} /><meshBasicMaterial color={C.vermilionLite} toneMapped={false} transparent opacity={0.8} /></mesh>
      <mesh ref={ring3} position={[0, 5, 0]}><torusGeometry args={[4.9, 0.04, 8, 64]} /><meshBasicMaterial color={C.goldLite} toneMapped={false} transparent opacity={0.5} /></mesh>

      <mesh ref={beam} position={[0, 46, 0]}><cylinderGeometry args={[3.6, 1.4, 56, 28, 1, true]} /><meshBasicMaterial color={C.goldLite} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>

      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} ref={(el) => (floats.current[i] = el)}><icosahedronGeometry args={[0.18, 0]} /><meshBasicMaterial color={i % 2 ? C.goldLite : C.vermilionLite} toneMapped={false} /></mesh>
      ))}

      <pointLight position={[0, 6, 1]} color={C.gold} intensity={9} distance={40} decay={2} />
    </group>
  )
}

export default function SahlokaGate({ arch }) {
  const steps = Math.round((HILL.rBot - HILL.rTop) / 1.1)
  return (
    <group>
      {/* the entrance gate and the avenue: real torii, vermilion lacquer */}
      <Prop bundle={arch} name="torii" x={0} z={entranceGate.z} s={entranceGate.s} paint={C.vermilion} />
      {avenue.map((g, i) => <Prop key={i} bundle={arch} name="torii" x={0} z={g.z} s={g.s} paint={`#${new THREE.Color(C.vermilion).lerp(new THREE.Color(C.gold), i / 5).getHexString()}`} />)}

      {/* a temple looms behind the gate: the world on the other side */}
      <Prop bundle={arch} name="temple" x={temple.x} z={temple.z} s={temple.s} rot={Math.PI} />

      <group position={[SAHLOKA.x, 0, SAHLOKA.z]}>
        {/* hill */}
        <mesh position={[0, TOP / 2, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[HILL.rTop, HILL.rBot, TOP, 48]} />
          <meshToonMaterial gradientMap={gradientMap} color={C.leafDark} />
        </mesh>
        <mesh position={[0, TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[HILL.rTop, 40]} />
          <meshToonMaterial gradientMap={gradientMap} color={C.leaf} />
        </mesh>
        <mesh position={[0, TOP + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6.4, 7.6, 56]} />
          <meshBasicMaterial color={C.gold} transparent opacity={0.4} toneMapped={false} />
        </mesh>

        {/* steps up the south face */}
        {Array.from({ length: steps }).map((_, i) => (
          <mesh key={i} position={[0, TOP - 0.25 - i * (TOP / steps), -HILL.rTop - i * 1.1]} receiveShadow castShadow>
            <boxGeometry args={[4.6 - i * 0.08, 0.5, 1.15]} />
            <meshToonMaterial gradientMap={gradientMap} color={C.stone} />
          </mesh>
        ))}

        <StoneLantern position={[-6, TOP, -4]} scale={1.4} />
        <StoneLantern position={[6, TOP, -4]} scale={1.4} />
        <StoneLantern position={[-6.5, TOP, 3]} scale={1.3} />
        <StoneLantern position={[6.5, TOP, 3]} scale={1.3} />

        <GrandGate />
      </group>
    </group>
  )
}
