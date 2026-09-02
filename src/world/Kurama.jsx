import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/content'
import { groundHeight, HILL } from './layout'

const SEGS = 9          // segments per tail
const TAILS = 9         // it is in the name

// One tail: a nested chain, so each segment's bend compounds into the next and
// the whole thing whips like rope instead of swinging like a stick.
function TailChain({ seg, idx, refs, mat }) {
  if (seg >= SEGS) return null
  const t = seg / SEGS
  const r = 0.44 * (1 - t * 0.80)
  const last = seg === SEGS - 1
  return (
    <group ref={(m) => (refs.current[idx * SEGS + seg] = m)} position={[0, 0, seg === 0 ? 0 : -1.06]}>
      <mesh position={[0, 0, -0.53]} rotation={[Math.PI / 2, 0, 0]} material={mat}>
        <capsuleGeometry args={[r, 0.92, 3, 7]} />
      </mesh>
      {last && (
        <mesh position={[0, 0, -1.12]} scale={[1, 1, 1.7]}>
          <sphereGeometry args={[r * 1.3, 10, 10]} />
          <meshBasicMaterial color="#c96a2a" toneMapped={false} />
        </mesh>
      )}
      <TailChain seg={seg + 1} idx={idx} refs={refs} mat={mat} />
    </group>
  )
}

export default function Kurama({ lit = 0, playerRef, freed = false }) {
  const root = useRef()
  const segRefs = useRef([])
  const eyes = useRef()

  // Near-black fur that only reads through its own emissive glow — at night,
  // against fog, that is what makes it a presence rather than a model.
  const fur = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a1206', emissive: new THREE.Color('#d1500f'),
    emissiveIntensity: 0.25, roughness: 1, metalness: 0, fog: false,
  }), [])

  // It wakes as the village lights. Nothing at zero, fully lit at six.
  const wake = Math.min(lit / 6, 1)

  useFrame((st, dt) => {
    const time = st.clock.elapsedTime
    const glow = freed ? 1.5 : 0.30 + wake * 0.85
    fur.emissiveIntensity += (glow - fur.emissiveIntensity) * Math.min(dt * 2, 1)
    if (eyes.current) eyes.current.children.forEach((e) => { e.material.opacity = 0.45 + wake * 0.55 })

    // Travelling wave down each tail, phase-offset per tail so the nine never
    // move as one — that synchrony is what makes fake tails look fake.
    const amp = 0.05 + wake * 0.10 + (freed ? 0.06 : 0)
    for (let i = 0; i < TAILS; i++) {
      for (let s = 0; s < SEGS; s++) {
        const m = segRefs.current[i * SEGS + s]
        if (!m) continue
        const ph = time * (0.75 + wake * 0.5) - s * 0.55 + i * 0.82
        m.rotation.x = (s === 0 ? 0.02 : -(0.012 + s * 0.016)) + Math.sin(ph) * amp
        m.rotation.y = Math.cos(ph * 0.72) * amp * 0.8
      }
    }

    if (!root.current) return
    if (freed) {
      // Chibi companion: pads along behind you, keeping its distance.
      const p = playerRef?.current
      if (!p || p.x === undefined) return
      const cur = root.current.position
      const dx = p.x - cur.x, dz = p.z - cur.z
      const d = Math.hypot(dx, dz)
      if (d > 2.6) {
        const k = Math.min(dt * 2.2, 1) * ((d - 2.4) / d)
        cur.x += dx * k; cur.z += dz * k
      }
      cur.y += (groundHeight(cur.x, cur.z) + 0.1 - cur.y) * Math.min(dt * 6, 1)
      if (d > 0.4) {
        const want = Math.atan2(dx, dz)
        let diff = ((want - root.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI
        root.current.rotation.y += diff * Math.min(dt * 4, 1)
      }
      root.current.scale.setScalar(THREE.MathUtils.lerp(root.current.scale.x, 0.24, Math.min(dt * 1.1, 1)))
    } else {
      // Looming beyond the hill: breathing, with a slow shift of weight.
      root.current.position.y = 1.5 + Math.sin(time * 0.34) * 0.42
      root.current.rotation.y = Math.PI - 0.42 + Math.sin(time * 0.11) * 0.05
      root.current.scale.setScalar(THREE.MathUtils.lerp(root.current.scale.x, 6.5, Math.min(dt * 2, 1)))
    }
  })

  const tails = useMemo(() => Array.from({ length: TAILS }, (_, i) => {
    const k = (i - (TAILS - 1) / 2) / ((TAILS - 1) / 2)   // -1 .. 1
    const jitter = Math.sin(i * 2.7) * 0.07
    return { i, yaw: k * 1.18 + jitter, pitch: 0.66 - Math.abs(k) * 0.34 + jitter * 0.5 }
  }), [])

  return (
    <group ref={root} position={[HILL.x - 27, 1, HILL.z + 12]} rotation={[0, Math.PI, 0]}>
      {/* long body, chest up, weight on the forelegs */}
      <mesh position={[0, 1.85, -0.4]} scale={[1.45, 1.45, 2.85]} material={fur}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>
      <mesh position={[0, 2.20, 1.65]} scale={[1.30, 1.34, 1.20]} material={fur}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>
      {/* neck, angled up — without it the head reads as a lump on the shoulders */}
      <mesh position={[0, 2.85, 2.45]} rotation={[0.75, 0, 0]} scale={[0.62, 1, 0.62]} material={fur}>
        <capsuleGeometry args={[0.5, 0.95, 3, 10]} />
      </mesh>

      <group position={[0, 3.25, 3.15]} rotation={[-0.08, 0, 0]}>
        <mesh scale={[0.78, 0.74, 0.90]} material={fur}>
          <sphereGeometry args={[1, 16, 14]} />
        </mesh>
        {/* the long snout is the whole reason it reads fox and not bear */}
        <mesh position={[0, -0.16, 1.02]} rotation={[Math.PI / 2, 0, 0]} material={fur}>
          <coneGeometry args={[0.27, 1.95, 10]} />
        </mesh>
        <mesh position={[0, -0.16, 1.92]}>
          <sphereGeometry args={[0.10, 8, 8]} />
          <meshBasicMaterial color="#120709" toneMapped={false} />
        </mesh>
        {/* tall ears carry the silhouette at distance */}
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.66, -0.10]} rotation={[-0.20, 0, x * 0.42]} material={fur}>
            <coneGeometry args={[0.24, 1.55, 8]} />
          </mesh>
        ))}
        <group ref={eyes}>
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, 0.10, 0.50]} scale={[1, 0.55, 1]}>
              <sphereGeometry args={[0.135, 10, 10]} />
              <meshBasicMaterial color="#ff2d18" transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* slim forelegs planted, haunches bunched behind */}
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} position={[x, 0.70, 1.70]} scale={[0.28, 1.05, 0.28]} material={fur}>
          <sphereGeometry args={[1, 8, 8]} />
        </mesh>
      ))}
      {[-0.88, 0.88].map((x) => (
        <mesh key={x} position={[x, 0.78, -1.55]} scale={[0.46, 0.92, 1.00]} material={fur}>
          <sphereGeometry args={[1, 10, 10]} />
        </mesh>
      ))}

      {/* the nine */}
      <group position={[0, 2.05, -2.5]}>
        {tails.map(({ i, yaw, pitch }) => (
          <group key={i} rotation={[pitch, yaw, 0]}>
            <TailChain seg={0} idx={i} refs={segRefs} mat={fur} />
          </group>
        ))}
      </group>
    </group>
  )
}
