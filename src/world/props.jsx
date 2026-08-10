import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Outlines } from '@react-three/drei'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'
import { woodBoards, woodPost, stone, roofTile, plaster, lacquer, mapOnly } from '../lib/materials'
import { roofGeo } from '../lib/geometry'

// One roof shell shared by every house — built on first use, never per-instance.
let _houseRoof
const houseRoof = () => (_houseRoof || (_houseRoof = roofGeo(2.5, 2.3, 0.65, 1.30, 0.15, 0.30)))

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
          <Toon color={color} {...lacquer(1, 2)} />
          {ink()}
        </mesh>
      ))}
      {/* nuki (lower beam) */}
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[3.7, 0.32, 0.34]} />
        <Toon color={color} {...lacquer(3, 1)} />
        {ink()}
      </mesh>
      {/* kasagi (top beam) with slight upturn caps */}
      <mesh position={[0, 3.75, 0]} castShadow>
        <boxGeometry args={[4.5, 0.34, 0.5]} />
        <Toon color={color} {...lacquer(4, 1)} />
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
        <Toon color={C.stoneDark} {...stone(2, 1)} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.7, 2.8]} />
        <Toon color={tone} {...plaster(1, 1)} />
      </mesh>
      {/* corner timbers */}
      {[[-1.55, 1.35], [1.55, 1.35], [-1.55, -1.35], [1.55, -1.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.25, z]} castShadow>
          <boxGeometry args={[0.18, 1.75, 0.18]} />
          <Toon color={C.woodDark} {...woodPost(1, 2)} />
        </mesh>
      ))}
      {/* temple roof — eaves sag along each run and lift at the corners */}
      {/* No inverted-hull outline here: on this swept shell the hull inflates along
          the mixed top/underside normals and swallows the roof entirely. */}
      <mesh geometry={houseRoof()} position={[0, 2.12, 0]} castShadow receiveShadow>
        <Toon color={C.roof} {...mapOnly(roofTile(2, 2))} />
      </mesh>
      {/* ridge finial */}
      <mesh position={[0, 3.55, 0]}>
        <boxGeometry args={[0.18, 0.4, 0.18]} />
        <Toon color={C.gold} emissive={C.gold} emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// ── Stone lantern — dark until someone lights it ─────────────────────────────
export function StoneLantern({ position = [0, 0, 0], scale = 1, lit = true }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.34, 0.4, 0.24, 8]} /><Toon color={C.stone} {...stone(1, 1)} /></mesh>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.12, 0.14, 0.7, 8]} /><Toon color={C.stone} {...stone(1, 1)} /></mesh>
      <mesh position={[0, 0.98, 0]} castShadow><cylinderGeometry args={[0.3, 0.26, 0.14, 8]} /><Toon color={C.stoneDark} /></mesh>
      {/* light box — cold and grey while unlit, then it catches */}
      <mesh position={[0, 1.22, 0]}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <Toon color={lit ? C.washi : '#6c6a63'} emissive={lit ? C.goldLite : '#000000'} emissiveIntensity={lit ? 2.4 : 0} />
      </mesh>
      {lit && <pointLight position={[0, 1.22, 0]} color={C.goldLite} intensity={1.6} distance={7} decay={2} />}
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.44, 0.34, 4]} /><Toon color={C.stoneDark} {...stone(1, 1)} />{ink(0.02)}</mesh>
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
export function Sakura({ position = [0, 0, 0], scale = 1, seed = 0, shookAt = 0 }) {
  const canopy = useRef()
  useFrame((s) => {
    if (!canopy.current) return
    const t = s.clock.elapsedTime
    let sway = Math.sin(t * 0.8 + seed) * 0.05
    // a shake rings out and settles
    if (shookAt) {
      const dt = (performance.now() - shookAt) / 1000
      if (dt < 2.5) sway += Math.sin(dt * 13) * Math.exp(-dt * 1.8) * 0.22
    }
    canopy.current.rotation.z = sway
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
        <Toon color={C.woodDark} {...woodPost(1, 1)} />
      </mesh>
      <group ref={canopy}>
        {blobs.map(([x, y, z, r, col], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
            <Toon color={col} flatShading />
          </mesh>
        ))}
      </group>
      <FallenPetals shookAt={shookAt} />
    </group>
  )
}

// Blossom shaken loose: a burst that tumbles down and fades, reused each shake.
function FallenPetals({ shookAt = 0, count = 26 }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 2.6,
    z: (Math.random() - 0.5) * 2.6,
    y: 1.6 + Math.random() * 1.4,
    fall: 0.9 + Math.random() * 0.9,
    drift: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 5,
    s: 0.10 + Math.random() * 0.07,
  })), [count])

  useFrame(() => {
    if (!mesh.current) return
    if (!shookAt) { mesh.current.visible = false; return }
    const dt = (performance.now() - shookAt) / 1000
    if (dt > 4) { mesh.current.visible = false; return }
    mesh.current.visible = true
    seeds.forEach((p, i) => {
      const y = p.y - dt * p.fall
      dummy.position.set(p.x + Math.sin(dt * 1.6 + p.drift) * 0.5, Math.max(y, 0.02), p.z + Math.cos(dt * 1.2 + p.drift) * 0.4)
      dummy.rotation.set(dt * p.spin, dt * p.spin * 0.6, p.drift)
      dummy.scale.setScalar(p.s * Math.max(0, 1 - dt / 4))
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={C.sakura} side={THREE.DoubleSide} transparent opacity={0.95} />
    </instancedMesh>
  )
}

// ── Pine ─────────────────────────────────────────────────────────────────────
export function Pine({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 1, 7]} /><Toon color={C.woodDark} {...woodPost(1, 1)} /></mesh>
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
      <Toon color={C.stone} flatShading {...stone(1, 1)} />
    </mesh>
  )
}


// ── A scroll to find, resting on a small stone ───────────────────────────────
export function Scroll({ position = [0, 0, 0], found = false }) {
  const g = useRef()
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime
    g.current.rotation.y = t * 0.5
    g.current.position.y = 0.75 + Math.sin(t * 1.4 + position[0]) * 0.07
  })
  if (found) return null
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.34, 0.42, 0.36, 6]} /><Toon color={C.stone} {...stone(1, 1)} /></mesh>
      <group ref={g} position={[0, 0.75, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.46, 10]} />
          <Toon color={C.washi} emissive={C.goldLite} emissiveIntensity={0.5} />
        </mesh>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.08, 8]} />
            <Toon color={C.vermilion} emissive={C.vermilion} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.8, 0]} color={C.goldLite} intensity={1.1} distance={4} decay={2} />
    </group>
  )
}

// ── The shrine bell (suzu) — ring it ─────────────────────────────────────────
export function Bell({ position = [0, 0, 0], rungAt = 0 }) {
  const b = useRef()
  // Swings itself from the moment it was struck, so ringing costs no re-renders.
  useFrame(() => {
    if (!b.current) return
    if (!rungAt) { b.current.rotation.x = 0; return }
    const dt = (performance.now() - rungAt) / 1000
    b.current.rotation.x = Math.sin(dt * 8.5) * Math.exp(-dt * 1.5) * 0.34
  })
  return (
    <group position={position}>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 2.7, 8]} />
          <Toon color={C.woodDark} {...woodPost(1, 2)} />
        </mesh>
      ))}
      <mesh position={[0, 2.78, 0]} castShadow><boxGeometry args={[2.7, 0.2, 0.22]} /><Toon color={C.woodDark} {...woodPost(2, 1)} />{ink(0.025)}</mesh>
      <group ref={b} position={[0, 2.68, 0]}>
        <mesh position={[0, -0.55, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.46, 0.95, 14]} />
          <Toon color={C.gold} emissive={C.gold} emissiveIntensity={0.35} />
          {ink(0.03)}
        </mesh>
        <mesh position={[0, -1.06, 0]}><sphereGeometry args={[0.13, 10, 10]} /><Toon color={C.goldLite} emissive={C.gold} emissiveIntensity={0.6} /></mesh>
      </group>
    </group>
  )
}


// ── The great drum (taiko) — struck, not rung ────────────────────────────────
export function Taiko({ position = [0, 0, 0], hitAt = 0 }) {
  const head = useRef()
  const body = useRef()
  useFrame(() => {
    if (!hitAt) { if (head.current) head.current.scale.set(1, 1, 1); return }
    const dt = (performance.now() - hitAt) / 1000
    const k = dt < 1.4 ? Math.sin(dt * 26) * Math.exp(-dt * 4.5) : 0
    if (head.current) head.current.scale.set(1 + k * 0.05, 1 - k * 0.5, 1 + k * 0.05)
    if (body.current) body.current.position.y = 1.15 + k * 0.03
  })
  return (
    <group position={position}>
      {/* stand */}
      {[-1.0, 1.0].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, x < 0 ? 0.16 : -0.16]} castShadow>
          <boxGeometry args={[0.2, 1.15, 0.2]} />
          <Toon color={C.woodDark} {...woodPost(1, 1)} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]} castShadow><boxGeometry args={[2.5, 0.22, 0.7]} /><Toon color={C.woodDark} {...woodPost(2, 1)} />{ink(0.02)}</mesh>

      <group ref={body} position={[0, 1.15, 0]}>
        {/* barrel, laid on its side so the head faces you */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.78, 0.78, 1.0, 20]} />
          <Toon color={C.woodDark} {...woodBoards(2, 1)} />
          {ink(0.03)}
        </mesh>
        {/* the struck head */}
        <mesh ref={head} position={[0, 0, 0.51]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.79, 0.79, 0.04, 20]} />
          <Toon color={C.washi} emissive={C.washi} emissiveIntensity={0.12} />
        </mesh>
        {/* tack ring */}
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.54]}>
              <sphereGeometry args={[0.045, 6, 6]} />
              <Toon color={C.gold} emissive={C.gold} emissiveIntensity={0.4} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
