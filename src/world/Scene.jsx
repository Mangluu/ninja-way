import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, ENV, projects } from '../data/content'
import { gradientMap } from '../lib/toon'
import { Torii, House, StoneLantern, LanternPost, Sakura, Pine, Rock } from './props'
import { houses, sakura, pines, rocks, pathLanterns, hangingLanterns } from './layout'
import SahlokaGate from './SahlokaGate'

function Toon(p) { return <meshToonMaterial gradientMap={gradientMap} {...p} /> }

// ── Gradient dusk sky (unaffected by fog) ────────────────────────────────────
function Sky() {
  const uniforms = useMemo(() => ({
    top: { value: new THREE.Color(ENV.skyTop) },
    mid: { value: new THREE.Color(ENV.skyMid) },
    bottom: { value: new THREE.Color(ENV.skyBottom) },
  }), [])
  return (
    <mesh scale={[300, 300, 300]}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        side={THREE.BackSide} fog={false} depthWrite={false} uniforms={uniforms}
        vertexShader={`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
          void main(){
            float h = normalize(vP).y;
            vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h,0.0,1.0),0.6)) : mix(mid, bottom, clamp(-h*2.2,0.0,1.0));
            gl_FragColor = vec4(c, 1.0);
          }`}
      />
    </mesh>
  )
}

// ── Distant misty mountains (silhouette depth, fades into fog) ────────────────
function Mountains() {
  const items = useMemo(() => {
    const a = []
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2
      const r = 78 + (i % 4) * 9
      a.push({ x: Math.cos(ang) * r, z: 36 + Math.sin(ang) * r * 0.9, h: 26 + (i % 5) * 7, w: 22 + (i % 3) * 7, rot: ang })
    }
    return a
  }, [])
  return items.map((m, i) => (
    <mesh key={i} position={[m.x, -5, m.z]} rotation={[0, m.rot, 0]}>
      <coneGeometry args={[m.w, m.h, 5]} />
      <meshToonMaterial gradientMap={gradientMap} color={i % 2 ? C.indigoDeep : C.indigo} flatShading />
    </mesh>
  ))
}

// ── Drifting sakura petals ───────────────────────────────────────────────────
function Petals({ count = 120 }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 60, z: Math.random() * 84 - 8, y: Math.random() * 20,
    s: 0.09 + Math.random() * 0.08, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 2,
    fall: 0.6 + Math.random() * 0.8, drift: Math.random() * 6,
  })), [count])
  useFrame((st, dt) => {
    if (!mesh.current) return
    const t = st.clock.elapsedTime
    data.forEach((p, i) => {
      p.y -= p.fall * dt
      if (p.y < 0) { p.y = 18 + Math.random() * 4 }
      dummy.position.set(p.x + Math.sin(t * 0.6 + p.drift) * 1.4, p.y, p.z)
      dummy.rotation.set(p.rot + t * p.spin, t * p.spin * 0.7, p.rot)
      dummy.scale.setScalar(p.s)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={C.sakura} side={THREE.DoubleSide} transparent opacity={0.9} />
    </instancedMesh>
  )
}

// ── Discoverable project waypoint ────────────────────────────────────────────
function ProjectSpot({ x, z, color }) {
  const orb = useRef(), ringRef = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (orb.current) { orb.current.position.y = 1.7 + Math.sin(t * 1.6 + x) * 0.15; orb.current.rotation.y = t * 0.6 }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.5
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.4, 0.55, 0.7, 8]} /><Toon color={C.stoneDark} /></mesh>
      <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.5, 0.42, 0.1, 8]} /><Toon color={C.stone} /></mesh>
      <mesh ref={orb} position={[0, 1.7, 0]}>
        <icosahedronGeometry args={[0.36, 0]} />
        <meshToonMaterial gradientMap={gradientMap} color={color} emissive={color} emissiveIntensity={2.2} />
      </mesh>
      <mesh ref={ringRef} position={[0, 1.7, 0]}>
        <torusGeometry args={[0.6, 0.03, 8, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} color={color} intensity={2.4} distance={7} decay={2} />
    </group>
  )
}

export default function Scene() {
  return (
    <>
      <Sky />
      <Mountains />
      <Petals />

      {/* lighting: warm key sun + sky fill */}
      <hemisphereLight args={[ENV.skyTop, ENV.ground, 0.55]} />
      <ambientLight intensity={0.14} />
      <directionalLight
        position={[18, 30, -8]} intensity={2.4} color={ENV.sun} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
        shadow-camera-near={1} shadow-camera-far={110}
        shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45}
      />

      {/* ground + path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 34]} receiveShadow>
        <planeGeometry args={[130, 150]} />
        <Toon color={ENV.ground} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 30]} receiveShadow>
        <planeGeometry args={[4.4, 78]} />
        <Toon color={C.dirt} />
      </mesh>

      {/* entrance torii */}
      <Torii position={[0, 0, -5]} scale={1.5} />

      {/* village */}
      {houses.map((h, i) => <House key={i} position={[h.x, 0, h.z]} rotation={[0, h.rot, 0]} tone={h.tone} />)}
      {sakura.map((s, i) => <Sakura key={i} position={[s.x, 0, s.z]} scale={s.s} seed={s.seed} />)}
      {pines.map((p, i) => <Pine key={i} position={[p.x, 0, p.z]} scale={p.s} />)}
      {rocks.map((r, i) => <Rock key={i} position={[r.x, 0, r.z]} scale={r.s} rotation={[0, r.rot, 0]} />)}
      {pathLanterns.map((l, i) => <StoneLantern key={i} position={[l.x, 0, l.z]} scale={0.85} />)}
      {hangingLanterns.map((l, i) => <LanternPost key={i} position={[l.x, 0, l.z]} color={l.color} />)}

      {/* discoverable projects */}
      {projects.map((p) => <ProjectSpot key={p.id} x={p.x} z={p.z} color={p.color} />)}

      {/* the star */}
      <SahlokaGate />
    </>
  )
}
