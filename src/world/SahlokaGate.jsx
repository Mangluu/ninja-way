import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, SAHLOKA } from '../data/content'
import { gradientMap } from '../lib/toon'
import { Torii, StoneLantern } from './props'

function Gold({ intensity = 1.4, color = C.gold }) {
  return <meshToonMaterial gradientMap={gradientMap} color={color} emissive={color} emissiveIntensity={intensity} />
}

const TOP = 4.5

// The grand glowing gate itself (custom so it can emit light / bloom).
function GrandGate() {
  const portal = useRef(), glow = useRef(), ring1 = useRef(), ring2 = useRef(), ring3 = useRef(), beam = useRef()
  const floats = useRef([])
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    if (portal.current) { const k = 1 + Math.sin(t * 1.4) * 0.05; portal.current.scale.set(k, k, k); portal.current.material.opacity = 0.7 + Math.sin(t * 2.1) * 0.14 }
    if (glow.current) { const g = 1 + Math.sin(t * 1.1) * 0.09; glow.current.scale.set(g, g, 1); glow.current.material.opacity = 0.34 + Math.sin(t * 1.6) * 0.08 }
    if (ring1.current) ring1.current.rotation.z += dt * 0.5
    if (ring2.current) ring2.current.rotation.z -= dt * 0.32
    if (ring3.current) { ring3.current.rotation.x += dt * 0.4; ring3.current.rotation.y += dt * 0.25 }
    if (beam.current) beam.current.material.opacity = 0.2 + Math.sin(t * 1.3) * 0.06
    floats.current.forEach((m, i) => { if (m) { const a = t * 0.3 + i * 1.7; m.position.set(Math.cos(a) * 5.5, 5 + Math.sin(t * 0.8 + i) * 1.2 + i * 0.3, Math.sin(a) * 5.5) } })
  })

  return (
    <group position={[0, TOP, 0]}>
      {/* posts */}
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, 5, 0]} castShadow><cylinderGeometry args={[0.4, 0.5, 10, 14]} /><Gold intensity={1.1} /></mesh>
      ))}
      {/* nuki */}
      <mesh position={[0, 7, 0]} castShadow><boxGeometry args={[7.6, 0.6, 0.7]} /><Gold intensity={1.1} /></mesh>
      {/* kasagi + upturned caps */}
      <mesh position={[0, 9.4, 0]} castShadow><boxGeometry args={[9.2, 0.7, 1.0]} /><Gold intensity={1.3} /></mesh>
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} position={[x, 9.65, 0]} rotation={[0, 0, x < 0 ? 0.2 : -0.2]}><boxGeometry args={[1.4, 0.5, 1.05]} /><Gold intensity={1.3} /></mesh>
      ))}
      <mesh position={[0, 9.9, 0]}><boxGeometry args={[0.8, 0.5, 1.1]} /><Gold intensity={1.6} /></mesh>
      {/* gakuzuka tablet */}
      <mesh position={[0, 8.2, 0.1]}><boxGeometry args={[1.0, 1.0, 0.15]} /><Gold intensity={1.8} color={C.goldLite} /></mesh>

      {/* portal */}
      <mesh ref={portal} position={[0, 5, 0]}>
        <circleGeometry args={[3.4, 56]} />
        <meshBasicMaterial color={C.goldLite} transparent opacity={0.78} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={glow} position={[0, 5, -0.1]}>
        <planeGeometry args={[16, 16]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.34} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* rings */}
      <mesh ref={ring1} position={[0, 5, 0.05]}><torusGeometry args={[3.7, 0.1, 8, 72]} /><meshBasicMaterial color={C.goldLite} toneMapped={false} /></mesh>
      <mesh ref={ring2} position={[0, 5, 0.05]}><torusGeometry args={[4.3, 0.06, 8, 72]} /><meshBasicMaterial color={C.vermilionLite} toneMapped={false} transparent opacity={0.8} /></mesh>
      <mesh ref={ring3} position={[0, 5, 0]}><torusGeometry args={[4.9, 0.04, 8, 64]} /><meshBasicMaterial color={C.goldLite} toneMapped={false} transparent opacity={0.5} /></mesh>

      {/* beam */}
      <mesh ref={beam} position={[0, 34, 0]}><cylinderGeometry args={[3.6, 1.1, 58, 28, 1, true]} /><meshBasicMaterial color={C.goldLite} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>

      {/* floating wisps */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} ref={(el) => (floats.current[i] = el)}><icosahedronGeometry args={[0.18, 0]} /><meshBasicMaterial color={i % 2 ? C.goldLite : C.vermilionLite} toneMapped={false} /></mesh>
      ))}

      <pointLight position={[0, 6, 1]} color={C.gold} intensity={9} distance={34} decay={2} />
    </group>
  )
}

export default function SahlokaGate() {
  // A torii avenue leading up the path to the summit (vermilion → gold).
  const avenue = useMemo(() => {
    const out = []
    for (let i = 0; i < 6; i++) {
      const localZ = -16 - i * 6
      const s = 1.0 + i * 0.12
      const col = new THREE.Color(C.vermilion).lerp(new THREE.Color(C.gold), i / 5)
      out.push({ localZ, s, color: `#${col.getHexString()}` })
    }
    return out
  }, [])

  return (
    <group position={[SAHLOKA.x, 0, SAHLOKA.z]}>
      {/* hill */}
      <mesh position={[0, TOP / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[7, 15, TOP, 40]} />
        <meshToonMaterial gradientMap={gradientMap} color={C.leafDark} />
      </mesh>
      <mesh position={[0, TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 36]} />
        <meshToonMaterial gradientMap={gradientMap} color={C.leaf} />
      </mesh>
      {/* glow ring on plateau */}
      <mesh position={[0, TOP + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 6.6, 48]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* steps */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, TOP - 0.28 - i * 0.5, -7 - i * 0.95]} receiveShadow castShadow>
          <boxGeometry args={[4.2 - i * 0.12, 0.5, 1.05]} />
          <meshToonMaterial gradientMap={gradientMap} color={C.stone} />
        </mesh>
      ))}

      {/* torii avenue up the path */}
      {avenue.map((a, i) => <Torii key={i} position={[0, 0, a.localZ]} scale={a.s} color={a.color} />)}

      {/* flanking lanterns up the approach + on the plateau */}
      {[-18, -30, -42].map((z, i) => (
        <group key={i}>
          <StoneLantern position={[-2.6, 0, z]} scale={1} />
          <StoneLantern position={[2.6, 0, z]} scale={1} />
        </group>
      ))}
      <StoneLantern position={[-5, TOP, -4]} scale={1.3} />
      <StoneLantern position={[5, TOP, -4]} scale={1.3} />
      <StoneLantern position={[-5.5, TOP, 2]} scale={1.2} />
      <StoneLantern position={[5.5, TOP, 2]} scale={1.2} />

      <GrandGate />
    </group>
  )
}
