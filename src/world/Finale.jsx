import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { C, SAHLOKA } from '../data/content'
import { gateZs, entranceGate } from './layout'

// The order the fire takes them: the entrance torii first, then every gate up
// the avenue toward the hill, then the hill itself.
const GATES = [entranceGate.z, ...[...gateZs].reverse()]
const HOLD = 1.1          // real seconds the world holds still before the fire runs
const SPREAD = 0.26       // gate to gate
const LAST = HOLD + GATES.length * SPREAD

export default function Finale({ active = false }) {
  const t = useRef(0)
  const rings = useRef([])
  const lights = useRef([])
  const { scene } = useThree()
  const base = useRef(null)
  const hill = useRef()

  const gates = useMemo(() => GATES.map((z, i) => ({ z, at: HOLD + i * SPREAD })), [])

  useFrame((st, dt) => {
    if (!active) { t.current = 0; return }
    if (!base.current && scene.fog) base.current = { near: scene.fog.near, far: scene.fog.far, color: scene.fog.color.clone() }
    t.current += dt
    const T = t.current

    gates.forEach((g, i) => {
      const k = THREE.MathUtils.clamp((T - g.at) / 0.55, 0, 1)
      const flare = Math.sin(Math.min(k, 1) * Math.PI)      // catch, then settle
      const ring = rings.current[i], lt = lights.current[i]
      if (ring) {
        ring.visible = k > 0
        ring.scale.setScalar(0.4 + k * 1.5)
        ring.material.opacity = flare * 0.9 + (k >= 1 ? 0.25 : 0)
      }
      if (lt) lt.intensity = flare * 46 + (k >= 1 ? 2.5 : 0)
    })

    if (hill.current) {
      const k = THREE.MathUtils.clamp((T - LAST) / 0.8, 0, 1)
      const settle = THREE.MathUtils.clamp((T - LAST - 1.4) / 3, 0, 1)
      hill.current.intensity = k * 34 * (1 - settle * 0.78)
    }

    // The fog opens once the fire reaches the hill — the stars were always
    // there, the village just could not see them.
    if (scene.fog && base.current) {
      const k = THREE.MathUtils.clamp((T - LAST) / 3.2, 0, 1)
      const e = k * k * (3 - 2 * k)
      scene.fog.far = THREE.MathUtils.lerp(base.current.far, 460, e)
      scene.fog.near = THREE.MathUtils.lerp(base.current.near, 90, e)
      scene.fog.color.copy(base.current.color).lerp(new THREE.Color('#04060f'), e)
      if (scene.background?.isColor) scene.background.lerp(new THREE.Color('#04060f'), e * 0.6)
    }
  })

  if (!active) return null
  return (
    <group>
      {gates.map((g, i) => (
        <group key={g.z} position={[0, 0.2, g.z]}>
          <mesh ref={(m) => (rings.current[i] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[1.6, 3.4, 40]} />
            <meshBasicMaterial color={C.vermilionLite} transparent opacity={0} side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
          <pointLight ref={(m) => (lights.current[i] = m)} color={C.vermilionLite} intensity={0} distance={26} decay={2} position={[0, 3, 0]} />
        </group>
      ))}
      {/* the hill takes the fire last, then settles */}
      <pointLight ref={hill} color={C.orangeLite} intensity={0} distance={90} decay={2} position={[SAHLOKA.x, 14, SAHLOKA.z]} />
    </group>
  )
}
