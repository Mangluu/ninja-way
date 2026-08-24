import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'
import { groundHeight } from './layout'

function M({ color, emissive, emissiveIntensity = 0 }) {
  return <meshToonMaterial color={color} gradientMap={gradientMap} emissive={emissive || '#000'} emissiveIntensity={emissiveIntensity} />
}
const ink = (t = 0.028) => <Outlines thickness={t} color={C.sumi} />

// Three villagers, built as archetypes rather than three copies with different
// hats: the cook is wide and low, the rival is lean and leaning back, the
// sensei is tall and stooped over a book. You should know which is which from
// the far side of the square.

const LOOK = {
  cook:   { robe: '#b8563a', accent: C.washi, hair: C.sumi, height: 0.86, width: 1.22 },
  rival:  { robe: '#3f5d7a', accent: C.vermilion, hair: C.sumi, height: 1.0, width: 0.94 },
  sensei: { robe: '#4a4238', accent: C.goldLite, hair: '#c9c4bb', height: 1.08, width: 1.0 },
}

export default function Villager({ kind = 'cook', anchor = [0, 0], radius = 3 }) {
  const rig = useRef(), body = useRef(), armL = useRef(), armR = useRef()
  const legL = useRef(), legR = useRef()
  const look = LOOK[kind] || LOOK.cook

  // a slow loop around their own patch, so the square is never still
  const route = useMemo(() => {
    const seed = anchor[0] * 7.3 + anchor[1] * 3.1
    return { seed, speed: 0.16 + (Math.abs(Math.sin(seed)) * 0.1) }
  }, [anchor])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime * route.speed + route.seed
    const x = anchor[0] + Math.cos(t) * radius
    const z = anchor[1] + Math.sin(t * 0.8) * radius * 0.6
    if (rig.current) {
      rig.current.position.set(x, groundHeight(x, z), z)
      // face the way they are drifting
      const nx = anchor[0] + Math.cos(t + 0.05) * radius
      const nz = anchor[1] + Math.sin((t + 0.05) * 0.8) * radius * 0.6
      rig.current.rotation.y = Math.atan2(nx - x, nz - z)
    }
    const sw = Math.sin(s.clock.elapsedTime * 3.4 + route.seed)
    if (legL.current) legL.current.rotation.x = sw * 0.32
    if (legR.current) legR.current.rotation.x = -sw * 0.32
    if (body.current) body.current.position.y = Math.abs(sw) * 0.035

    if (kind === 'sensei') {
      // holds the book up, turns a page now and then, never looks at you
      if (armL.current) armL.current.rotation.x = -1.15
      if (armR.current) armR.current.rotation.x = -1.05
      if (body.current) body.current.rotation.x = 0.2
    } else if (kind === 'rival') {
      // arms folded, leaning back
      if (armL.current) armL.current.rotation.x = -1.3
      if (armR.current) armR.current.rotation.x = -1.3
      if (body.current) body.current.rotation.x = -0.1
    } else {
      if (armL.current) armL.current.rotation.x = -sw * 0.3
      if (armR.current) armR.current.rotation.x = sw * 0.3
    }
  })

  const h = look.height
  return (
    <group ref={rig}>
      <group ref={legL} position={[-0.14 * look.width, 0.55 * h, 0]}>
        <mesh position={[0, -0.27 * h, 0]} castShadow><capsuleGeometry args={[0.11, 0.36 * h, 4, 8]} /><M color={C.indigoDeep} /></mesh>
      </group>
      <group ref={legR} position={[0.14 * look.width, 0.55 * h, 0]}>
        <mesh position={[0, -0.27 * h, 0]} castShadow><capsuleGeometry args={[0.11, 0.36 * h, 4, 8]} /><M color={C.indigoDeep} /></mesh>
      </group>

      <group ref={body}>
        <mesh position={[0, 0.9 * h, 0]} castShadow>
          <capsuleGeometry args={[0.3 * look.width, 0.4 * h, 6, 12]} />
          <M color={look.robe} />{ink()}
        </mesh>
        <mesh position={[0, 0.62 * h, 0]} castShadow>
          <coneGeometry args={[0.4 * look.width, 0.46 * h, 12]} />
          <M color={look.robe} />{ink()}
        </mesh>
        <mesh position={[0, 0.82 * h, 0]}>
          <cylinderGeometry args={[0.31 * look.width, 0.31 * look.width, 0.1, 12]} />
          <M color={look.accent} />
        </mesh>

        <group ref={armL} position={[-0.33 * look.width, 1.05 * h, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow><capsuleGeometry args={[0.09, 0.3, 4, 8]} /><M color={look.robe} /></mesh>
        </group>
        <group ref={armR} position={[0.33 * look.width, 1.05 * h, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow><capsuleGeometry args={[0.09, 0.3, 4, 8]} /><M color={look.robe} /></mesh>
        </group>

        <mesh position={[0, 1.4 * h, 0.02]} castShadow>
          <sphereGeometry args={[0.26, 14, 14]} />
          <M color={C.washi} />{ink(0.024)}
        </mesh>
        {[-0.085, 0.085].map((x) => (
          <mesh key={x} position={[x, 1.42 * h, 0.23]}>
            <sphereGeometry args={[0.026, 6, 6]} />
            <meshBasicMaterial color={C.sumi} />
          </mesh>
        ))}

        {kind === 'cook' && (
          <>
            {/* headband, and a ladle he never puts down */}
            <mesh position={[0, 1.56 * h, 0.02]}><boxGeometry args={[0.46, 0.09, 0.46]} /><M color={C.washi} /></mesh>
            <mesh position={[0.42, 0.86 * h, 0.1]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.022, 0.022, 0.5, 6]} /><M color={C.woodDark} /></mesh>
            <mesh position={[0.55, 0.72 * h, 0.1]}><sphereGeometry args={[0.09, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><M color={C.steel} /></mesh>
          </>
        )}
        {kind === 'rival' && (
          [-0.13, 0.02, 0.15].map((x, i) => (
            <mesh key={i} position={[x, 1.6 * h - Math.abs(x) * 0.4, -0.02]} rotation={[0.25, 0, x * 2]} castShadow>
              <coneGeometry args={[0.1, 0.24, 5]} />
              <M color={look.hair} />
            </mesh>
          ))
        )}
        {kind === 'sensei' && (
          <>
            <mesh position={[0, 1.55 * h, -0.04]} castShadow><sphereGeometry args={[0.235, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} /><M color={look.hair} /></mesh>
            {/* the book, held up, permanently at the same page */}
            <mesh position={[0, 0.94 * h, 0.36]} rotation={[0.5, 0, 0]} castShadow>
              <boxGeometry args={[0.36, 0.05, 0.28]} />
              <M color={C.washi} />{ink(0.02)}
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}
