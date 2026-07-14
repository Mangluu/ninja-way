import { useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Stars, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { sagas, shrines, trophies, markers, football, PATH } from '../data/content.js'
import { Shrine, Trophy, Marker, Football } from './Structures.jsx'
import Player from './Player.jsx'

// Precompute saga palettes as THREE.Colors so we can lerp cheaply each frame.
const SP = sagas.map((s) => ({
  z: s.z,
  fog: new THREE.Color(s.palette.fog),
  ground: new THREE.Color(s.palette.ground),
  top: new THREE.Color(s.palette.skyTop),
  bottom: new THREE.Color(s.palette.skyBottom),
  accent: new THREE.Color(s.palette.accent),
  fogNear: s.palette.fogNear,
  fogFar: s.palette.fogFar,
}))
const smooth = (t) => t * t * (3 - 2 * t)

function paletteAt(z, out) {
  let a = SP[0]
  let b = SP[0]
  if (z <= SP[0].z) { a = b = SP[0] }
  else if (z >= SP[SP.length - 1].z) { a = b = SP[SP.length - 1] }
  else {
    for (let i = 0; i < SP.length - 1; i++) {
      if (z >= SP[i].z && z <= SP[i + 1].z) { a = SP[i]; b = SP[i + 1]; break }
    }
  }
  const t = a === b ? 0 : smooth((z - a.z) / (b.z - a.z))
  out.fog.copy(a.fog).lerp(b.fog, t)
  out.ground.copy(a.ground).lerp(b.ground, t)
  out.top.copy(a.top).lerp(b.top, t)
  out.bottom.copy(a.bottom).lerp(b.bottom, t)
  out.accent.copy(a.accent).lerp(b.accent, t)
  out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * t
  out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * t
  return out
}

const skyVert = `varying vec3 vpos; void main(){ vpos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const skyFrag = `varying vec3 vpos; uniform vec3 top; uniform vec3 bottom;
  void main(){ float h = normalize(vpos).y*0.5+0.5; vec3 c = mix(bottom, top, pow(clamp(h,0.0,1.0),0.7)); gl_FragColor = vec4(c,1.0); }`

// Owns the color grade: sky gradient, fog, ground tint and key lighting all lerp
// with the player's position along the path.
function Stage({ zRef, snapped }) {
  const { scene } = useThree()
  const ground = useRef()
  const key = useRef()
  const hemi = useRef()
  const skyMat = useRef()
  const P = useMemo(
    () => ({ fog: new THREE.Color(), ground: new THREE.Color(), top: new THREE.Color(), bottom: new THREE.Color(), accent: new THREE.Color(), fogNear: 10, fogFar: 80 }),
    [],
  )
  const skyUniforms = useMemo(() => ({ top: { value: new THREE.Color('#1a0630') }, bottom: { value: new THREE.Color('#ff7a59') } }), [])

  useMemo(() => {
    scene.fog = new THREE.Fog('#767b87', 10, 65)
    scene.background = P.fog
  }, [scene, P])

  useFrame(() => {
    const p = paletteAt(zRef.current, P)
    scene.fog.color.copy(p.fog)
    scene.fog.near = p.fogNear
    scene.fog.far = p.fogFar
    if (ground.current) ground.current.color.copy(p.ground)
    if (skyMat.current) {
      skyMat.current.uniforms.top.value.copy(p.top)
      skyMat.current.uniforms.bottom.value.copy(p.bottom)
    }
    const boost = snapped ? 1.18 : 1
    if (key.current) { key.current.color.copy(p.accent); key.current.intensity = 1.15 * boost }
    if (hemi.current) { hemi.current.color.copy(p.top); hemi.current.groundColor.copy(p.ground); hemi.current.intensity = 0.65 * boost }
  })

  return (
    <>
      <mesh scale={800}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial ref={skyMat} side={THREE.BackSide} depthWrite={false} uniforms={skyUniforms} vertexShader={skyVert} fragmentShader={skyFrag} />
      </mesh>

      <hemisphereLight ref={hemi} intensity={0.65} />
      <directionalLight ref={key} position={[12, 24, 6]} intensity={1.15} />
      <ambientLight intensity={0.22} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (PATH.zStart + PATH.zEnd) / 2]}>
        <planeGeometry args={[500, 700]} />
        <meshStandardMaterial ref={ground} color="#4a4a44" roughness={0.96} metalness={0} />
      </mesh>

      <Grid
        position={[0, 0.01, (PATH.zStart + PATH.zEnd) / 2]}
        args={[500, 700]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#1b6ec2"
        sectionSize={12}
        sectionThickness={1.1}
        sectionColor="#ff4fd8"
        fadeDistance={95}
        fadeStrength={2}
        infiniteGrid
      />

      {/* central path ribbon */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, (PATH.zStart + PATH.zEnd) / 2]}>
        <planeGeometry args={[6, PATH.zEnd - PATH.zStart]} />
        <meshStandardMaterial color="#0b0d14" emissive="#ffffff" emissiveIntensity={0.06} roughness={0.4} />
      </mesh>
      {[-3, 3].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.03, (PATH.zStart + PATH.zEnd) / 2]}>
          <planeGeometry args={[0.14, PATH.zEnd - PATH.zStart]} />
          <meshBasicMaterial color="#ff2e4d" toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

function Aurora({ zRef }) {
  const g = useRef()
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime
    // only visible near the Finland saga (z ≈ 178) — otherwise it floats in every scene
    const prox = THREE.MathUtils.clamp(1 - Math.abs(zRef.current - 178) / 60, 0, 1)
    g.current.visible = prox > 0.01
    g.current.children.forEach((m, i) => {
      m.material.opacity = (0.16 + 0.13 * Math.sin(t * 0.5 + i * 1.3)) * prox
      m.position.x = Math.sin(t * 0.15 + i) * 7
    })
  })
  return (
    <group ref={g} position={[0, 44, 178]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 5 - 8, i * 3, i * -7]} rotation={[0, 0, 0.18 * i - 0.25]}>
          <planeGeometry args={[42, 55]} />
          <meshBasicMaterial color={i % 2 ? '#6effc0' : '#a06bff'} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function World({ started, snapped, report, onOpen, onSnap, nearId }) {
  const zRef = useRef(PATH.zStart)
  return (
    <>
      <Stage zRef={zRef} snapped={snapped} />
      <Stars radius={300} depth={80} count={3200} factor={4} saturation={0} fade speed={0.4} />
      <Aurora zRef={zRef} />

      {shrines.map((s) => (
        <Shrine key={s.id} data={s} near={nearId === s.id} />
      ))}
      {trophies.map((t, i) => (
        <Trophy key={i} data={t} />
      ))}
      {markers.map((m) => (
        <Marker key={m.id} data={m} />
      ))}
      <Football pos={football} />

      {started && <Player zRef={zRef} report={report} onOpen={onOpen} onSnap={onSnap} />}
    </>
  )
}
