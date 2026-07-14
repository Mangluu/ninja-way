import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'

// Shared toon material as a helper element.
function Toon({ color, emissive, emissiveIntensity = 0, flatShading = false, ...p }) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={gradientMap}
      emissive={emissive || '#000000'}
      emissiveIntensity={emissiveIntensity}
      {...p}
    />
  )
}

const INK = C.sumi
const ink = (t = 0.03) => <Outlines thickness={t} color={INK} />

// ── Torii gate ──────────────────────────────────────────────────────────────
export function Torii({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], color = C.vermilion }) {
  return (
    <group position={position} scale={scale} rotation={rotation}>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 2, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.22, 4, 12]} />
          <Toon color={color} />
          {ink()}
        </mesh>
      ))}
      {/* nuki (lower beam) */}
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[3.7, 0.32, 0.34]} />
        <Toon color={color} />
        {ink()}
      </mesh>
      {/* kasagi (top beam) with slight upturn caps */}
      <mesh position={[0, 3.75, 0]} castShadow>
        <boxGeometry args={[4.5, 0.34, 0.5]} />
        <Toon color={color} />
        {ink()}
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 3.86, 0]} rotation={[0, 0, x < 0 ? 0.18 : -0.18]} castShadow>
          <boxGeometry args={[0.7, 0.24, 0.52]} />
          <Toon color={color} />
        </mesh>
      ))}
      <mesh position={[0, 4.02, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.6]} />
        <Toon color={C.sumi} />
      </mesh>
    </group>
  )
}

// ── Village house with a tiered upturned roof ────────────────────────────────
export function House({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, tone = C.washi }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* plinth */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.6, 0.4, 3.2]} />
        <Toon color={C.stoneDark} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.7, 2.8]} />
        <Toon color={tone} />
      </mesh>
      {/* corner timbers */}
      {[[-1.55, 1.35], [1.55, 1.35], [-1.55, -1.35], [1.55, -1.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.25, z]} castShadow>
          <boxGeometry args={[0.18, 1.75, 0.18]} />
          <Toon color={C.woodDark} />
        </mesh>
      ))}
      {/* eave slab */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[4.4, 0.2, 4.0]} />
        <Toon color={C.roof} />
        {ink(0.035)}
      </mesh>
      {/* hip roof (4-sided pyramid) */}
      <mesh position={[0, 2.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.9, 1.4, 4]} />
        <Toon color={C.roof} />
        {ink(0.04)}
      </mesh>
      {/* ridge finial */}
      <mesh position={[0, 3.55, 0]}>
        <boxGeometry args={[0.18, 0.4, 0.18]} />
        <Toon color={C.gold} emissive={C.gold} emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// ── Stone lantern (glowing) ──────────────────────────────────────────────────
export function StoneLantern({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.34, 0.4, 0.24, 8]} /><Toon color={C.stone} /></mesh>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.12, 0.14, 0.7, 8]} /><Toon color={C.stone} /></mesh>
      <mesh position={[0, 0.98, 0]} castShadow><cylinderGeometry args={[0.3, 0.26, 0.14, 8]} /><Toon color={C.stoneDark} /></mesh>
      {/* light box */}
      <mesh position={[0, 1.22, 0]}><boxGeometry args={[0.42, 0.42, 0.42]} /><Toon color={C.washi} emissive={C.goldLite} emissiveIntensity={2.4} /></mesh>
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.44, 0.34, 4]} /><Toon color={C.stoneDark} />{ink(0.02)}</mesh>
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[0.08, 8, 8]} /><Toon color={C.stone} /></mesh>
    </group>
  )
}

// ── Hanging paper lantern on a post (glowing) ────────────────────────────────
export function LanternPost({ position = [0, 0, 0], color = C.vermilion, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 2.4, 8]} /><Toon color={C.woodDark} /></mesh>
      <mesh position={[0.35, 2.3, 0]} castShadow><boxGeometry args={[0.9, 0.08, 0.08]} /><Toon color={C.woodDark} /></mesh>
      <group position={[0.7, 1.95, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.28, 12, 10]} />
          <Toon color={color} emissive={color} emissiveIntensity={1.8} />
          {ink(0.02)}
        </mesh>
        <mesh scale={[1.02, 0.55, 1.02]}><sphereGeometry args={[0.29, 12, 4]} /><Toon color={C.sumi} wireframe opacity={0.25} transparent /></mesh>
        <pointLight color={color} intensity={2.2} distance={5} decay={2} />
      </group>
    </group>
  )
}

// ── Sakura tree (gently swaying) ─────────────────────────────────────────────
export function Sakura({ position = [0, 0, 0], scale = 1, seed = 0 }) {
  const canopy = useRef()
  useFrame((s) => {
    if (canopy.current) canopy.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.8 + seed) * 0.05
  })
  const blobs = [
    [0, 2.1, 0, 1.3, C.sakura],
    [0.9, 1.9, 0.3, 0.95, C.sakuraDeep],
    [-0.8, 2.0, -0.4, 0.9, C.sakura],
    [0.2, 2.7, -0.5, 0.85, C.sakura],
    [-0.3, 2.5, 0.7, 0.8, C.sakuraDeep],
  ]
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.16, 0.28, 1.9, 7]} />
        <Toon color={C.woodDark} />
      </mesh>
      <group ref={canopy}>
        {blobs.map(([x, y, z, r, col], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
            <Toon color={col} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── Pine ─────────────────────────────────────────────────────────────────────
export function Pine({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 1, 7]} /><Toon color={C.woodDark} /></mesh>
      {[[1.0, 1.3, 1.1], [1.75, 1.0, 0.85], [2.4, 0.7, 0.62]].map(([y, r, h], i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <coneGeometry args={[r, h, 8]} />
          <Toon color={i === 2 ? C.leaf : C.leafDark} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ── Rock ──────────────────────────────────────────────────────────────────────
export function Rock({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} scale={[scale, scale * 0.7, scale]} rotation={rotation} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
      <Toon color={C.stone} flatShading />
    </mesh>
  )
}
