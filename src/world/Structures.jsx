import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'

// Floating billboard label (in-world text, no DOM — keeps the game feel + perf).
function Label({ children, y = 3, color = '#fff', size = 0.5, width = 9 }) {
  return (
    <Billboard position={[0, y, 0]}>
      <Text
        fontSize={size}
        color={color}
        maxWidth={width}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={size * 0.04}
        outlineColor="#05060a"
      >
        {children}
      </Text>
    </Billboard>
  )
}

// A monument you walk up to and "enter". big:true = Sahloka, the summit centerpiece.
export function Shrine({ data, near }) {
  const crystal = useRef()
  const big = !!data.big
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (crystal.current) {
      crystal.current.position.y = Math.sin(t * 1.1 + data.z) * 0.15 + (big ? 3.4 : 2.2)
      crystal.current.rotation.y = t * (big ? 0.25 : 0.5)
      crystal.current.rotation.x = big ? t * 0.12 : 0
    }
  })
  const c = data.color
  const ei = near ? (big ? 2.6 : 2.2) : 1.2
  return (
    <group position={[data.x, 0, data.z]}>
      {/* base disc */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[big ? 3 : 1.5, big ? 3.6 : 1.9, 0.3, 32]} />
        <meshStandardMaterial color="#0e1018" metalness={0.5} roughness={0.5} emissive={c} emissiveIntensity={near ? 0.6 : 0.18} />
      </mesh>

      {/* torii-style frame (two pillars + crossbeam) */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (big ? 2.4 : 1.3), (big ? 4 : 2.6) / 2 + 0.3, 0]}>
          <boxGeometry args={[0.28, big ? 4 : 2.6, 0.28]} />
          <meshStandardMaterial color="#12141d" metalness={0.6} roughness={0.4} emissive={c} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[0, (big ? 4 : 2.6) + 0.4, 0]}>
        <boxGeometry args={[big ? 5.6 : 3.2, 0.32, 0.32]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={near ? 1.4 : 0.7} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* floating crystal / world */}
      <group ref={crystal}>
        <mesh>
          <icosahedronGeometry args={[big ? 2 : 0.85, big ? 1 : 0]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={ei} metalness={0.3} roughness={0.15} flatShading />
        </mesh>
        {big && (
          <mesh rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[3.3, 0.07, 16, 90]} />
            <meshBasicMaterial color={c} toneMapped={false} />
          </mesh>
        )}
      </group>

      {near && <pointLight color={c} distance={big ? 26 : 16} intensity={big ? 5 : 3} position={[0, 3, 0]} />}

      <Label y={big ? 8 : 4.4} color={near ? '#ffffff' : c} size={big ? 1 : 0.5} width={big ? 14 : 9}>
        {data.name}
      </Label>
      <Label y={big ? 6.9 : 3.6} color="#cdd4e0" size={big ? 0.46 : 0.3} width={big ? 14 : 9}>
        {data.tag}
      </Label>
    </group>
  )
}

// Smaller win markers — a rotating gold cup with a label.
export function Trophy({ data }) {
  const g = useRef()
  useFrame((s) => {
    if (g.current) g.current.rotation.y = s.clock.elapsedTime * 0.8
  })
  const gold = '#ffd24a'
  return (
    <group position={[data.x, 0, data.z]}>
      <group ref={g} position={[0, 1.3, 0]}>
        {/* bowl */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.45, 0.28, 0.55, 20]} />
          <meshStandardMaterial color={gold} metalness={1} roughness={0.22} emissive="#ffae00" emissiveIntensity={0.45} />
        </mesh>
        {/* stem */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.35, 12]} />
          <meshStandardMaterial color={gold} metalness={1} roughness={0.25} />
        </mesh>
        {/* base */}
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.12, 20]} />
          <meshStandardMaterial color={gold} metalness={1} roughness={0.3} emissive="#ffae00" emissiveIntensity={0.3} />
        </mesh>
      </group>
      <Label y={2.5} color={gold} size={0.34}>
        {data.label}
      </Label>
      <Label y={2.05} color="#cdd4e0" size={0.26}>
        {data.year}
      </Label>
    </group>
  )
}

// Story props that set the scene along the path.
export function Marker({ data }) {
  const t = data.type
  return (
    <group position={[data.x, 0, data.z]}>
      {t === 'pc' && <RetroPC />}
      {t === 'sign' && <Sign />}
      {t === 'stage' && <Stage2 />}
      {t === 'gate' && <Gate red={data.z < 100} />}
      {t === 'beacon' && <Beacon />}
      <Label y={t === 'gate' ? 6.2 : t === 'beacon' ? 8 : 3} color="#e8ecf3" size={t === 'gate' || t === 'beacon' ? 0.42 : 0.32} width={11}>
        {data.label}
      </Label>
    </group>
  )
}

function RetroPC() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 1, 0.8]} />
        <meshStandardMaterial color="#20242e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.25, 0.1]}>
        <boxGeometry args={[1.2, 0.9, 0.15]} />
        <meshStandardMaterial color="#0a0c12" emissive="#37a2ff" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

function Sign() {
  return (
    <group>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2, 8]} />
        <meshStandardMaterial color="#2a2f3a" />
      </mesh>
      <mesh position={[0, 1.9, 0]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[2.2, 0.9, 0.1]} />
        <meshStandardMaterial color="#12141d" emissive="#ff4fd8" emissiveIntensity={0.35} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Stage2() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2.4, 2.6, 0.4, 32]} />
        <meshStandardMaterial color="#15171f" roughness={0.8} emissive="#ff2e4d" emissiveIntensity={0.12} />
      </mesh>
      <spotLight position={[0, 8, 0]} angle={0.5} penumbra={0.6} intensity={12} distance={16} color="#ffffff" target-position={[0, 0, 0]} />
      <mesh position={[0, 4, -1.2]}>
        <coneGeometry args={[1.6, 8, 24, 1, true]} />
        <meshBasicMaterial color="#fff2c0" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Gate({ red }) {
  const c = red ? '#ff2e4d' : '#6effc0'
  return (
    <group>
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, 3, 0]}>
          <boxGeometry args={[0.5, 6, 0.5]} />
          <meshStandardMaterial color="#0e1018" emissive={c} emissiveIntensity={0.8} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[8.4, 0.7, 0.7]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} toneMapped={false} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[7.2, 0.35, 0.5]} />
        <meshStandardMaterial color="#0e1018" emissive={c} emissiveIntensity={0.6} />
      </mesh>
      <pointLight color={c} distance={22} intensity={3} position={[0, 4, 0]} />
    </group>
  )
}

function Beacon() {
  const ring = useRef()
  useFrame((s) => {
    if (ring.current) ring.current.rotation.z = s.clock.elapsedTime * 0.6
  })
  return (
    <group>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.35, 0.6, 12, 16]} />
        <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 18, 0]}>
        <coneGeometry args={[0.7, 24, 16, 1, true]} />
        <meshBasicMaterial color="#ff4fd8" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.08, 12, 60]} />
        <meshBasicMaterial color="#ffd24a" toneMapped={false} />
      </mesh>
      <pointLight color="#ff4fd8" distance={30} intensity={4} position={[0, 6, 0]} />
    </group>
  )
}

// Ronaldo easter egg — press F for a SIUUU.
export function Football({ pos }) {
  const b = useRef()
  useFrame((s) => {
    if (b.current) b.current.position.y = 0.7 + Math.abs(Math.sin(s.clock.elapsedTime * 2)) * 0.3
  })
  return (
    <mesh ref={b} position={[pos.x, 0.7, pos.z]}>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.1} flatShading emissive="#111" emissiveIntensity={0.4} />
    </mesh>
  )
}
