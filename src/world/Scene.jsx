import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { C, ENV, WORLD, projects } from '../data/content'
import { gradientMap } from '../lib/toon'
import { groundMat, stone } from '../lib/materials'
import { House, StoneLantern, LanternPost, Scroll, Bell, Taiko, FallenPetals } from './props'
import { useNature, useArch, Prop, Instanced } from './props3d'
import { houses, sakura, pines, forest, rocks, grass, flowers, bushes, mushrooms, fences, stream, bridge, lilies, camp, pathLanterns, hangingLanterns, scrolls, bell, shrine, crateStacks, taiko, villagers, targets, groundHeight } from './layout'
import { Target } from './Shuriken'
import SahlokaGate from './SahlokaGate'
import Atmosphere from './Atmosphere'
import LightBudget from './LightBudget'
import LanternField from './LanternField'
import Kurama from './Kurama'
import Finale from './Finale'
import Villager from './Villager'
import Crates from './Crates'

function Toon(p) { return <meshToonMaterial gradientMap={gradientMap} {...p} /> }
const MID_Z = (WORLD.minZ + WORLD.maxZ) / 2

// ── Gradient night sky (unaffected by fog) ───────────────────────────────────
function Sky() {
  const uniforms = useMemo(() => ({
    top: { value: new THREE.Color(ENV.skyTop) },
    mid: { value: new THREE.Color(ENV.skyMid) },
    bottom: { value: new THREE.Color(ENV.skyBottom) },
  }), [])
  return (
    <mesh scale={[600, 600, 600]}>
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

// ── The moon, sitting where the key light comes from ────────────────────────
function Moon() {
  return (
    <group position={[260, 300, -120]}>
      <mesh>
        <sphereGeometry args={[24, 24, 24]} />
        <meshBasicMaterial color={ENV.moon} toneMapped={false} fog={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[46, 20, 20]} />
        <meshBasicMaterial color={ENV.moon} transparent opacity={0.10} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
    </group>
  )
}

// ── Distant mountains (silhouette depth, fades into fog) ─────────────────────
function Mountains() {
  const items = useMemo(() => {
    const a = []
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2
      const r = 150 + (i % 4) * 16
      a.push({ x: Math.cos(ang) * r, z: MID_Z + Math.sin(ang) * r * 0.95, h: 44 + (i % 5) * 12, w: 38 + (i % 3) * 12, rot: ang })
    }
    return a
  }, [])
  return items.map((m, i) => (
    <mesh key={i} position={[m.x, -8, m.z]} rotation={[0, m.rot, 0]}>
      <coneGeometry args={[m.w, m.h, 5]} />
      <meshToonMaterial gradientMap={gradientMap} color={i % 2 ? C.indigoDeep : C.indigo} flatShading />
    </mesh>
  ))
}

// ── Drifting sakura petals ───────────────────────────────────────────────────
function Petals({ count = 200 }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 70, z: WORLD.minZ + Math.random() * (WORLD.maxZ - WORLD.minZ), y: Math.random() * 20,
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
    <group position={[x, groundHeight(x, z), z]}>
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

// ── A cherry tree that sways, and shakes when told to ────────────────────────
function SakuraTree({ bundle, kind, x, z, s, seed, shookAt }) {
  const g = useRef()
  useFrame((st) => {
    if (!g.current) return
    const t = st.clock.elapsedTime
    let sway = Math.sin(t * 0.8 + seed) * 0.02
    if (shookAt) {
      const dt = (performance.now() - shookAt) / 1000
      if (dt < 2.5) sway += Math.sin(dt * 13) * Math.exp(-dt * 1.8) * 0.09
    }
    g.current.rotation.z = sway
    g.current.rotation.x = sway * 0.6
  })
  return (
    <group position={[x, groundHeight(x, z), z]}>
      <group ref={g}>
        <Prop bundle={bundle} name={kind} x={0} z={0} y={-groundHeight(x, z)} s={s} rot={seed * 1.3} />
      </group>
      <group scale={1.9} position={[0, 1.2, 0]}><FallenPetals shookAt={shookAt} count={34} /></group>
    </group>
  )
}

// ── The cook's fire ──────────────────────────────────────────────────────────
function Camp({ bundle }) {
  const light = useRef()
  useFrame((st) => { if (light.current) light.current.intensity = 3.2 + Math.sin(st.clock.elapsedTime * 11) * 0.5 + Math.sin(st.clock.elapsedTime * 23) * 0.3 })
  return (
    <group>
      <Prop bundle={bundle} name="campfire_logs" x={camp.x} z={camp.z} s={3.2} />
      <Prop bundle={bundle} name="campfire_stones" x={camp.x} z={camp.z} s={3.2} />
      <Prop bundle={bundle} name="pot_large" x={camp.x + 1.8} z={camp.z - 0.6} s={3} rot={0.4} />
      <Prop bundle={bundle} name="pot_small" x={camp.x + 2.4} z={camp.z + 0.9} s={3} rot={1.1} />
      <Prop bundle={bundle} name="log_large" x={camp.x - 0.4} z={camp.z + 2.6} s={3} rot={0.2} />
      <Prop bundle={bundle} name="log_stack" x={camp.x + 3} z={camp.z + 2.2} s={2.8} rot={0.9} />
      <mesh position={[camp.x, groundHeight(camp.x, camp.z) + 0.45, camp.z]}>
        <coneGeometry args={[0.32, 0.8, 7]} />
        <meshBasicMaterial color={C.orangeLite} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <pointLight ref={light} position={[camp.x, groundHeight(camp.x, camp.z) + 1.1, camp.z]} color={C.orange} intensity={3.2} distance={11} decay={2} />
    </group>
  )
}

// ── The stream and the bridge over it ────────────────────────────────────────
function Stream({ bundle }) {
  const mat = useRef()
  useFrame((st) => { if (mat.current) mat.current.emissiveIntensity = 0.3 + Math.sin(st.clock.elapsedTime * 1.3) * 0.08 })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, stream.z]} receiveShadow>
        <planeGeometry args={[WORLD.maxX - WORLD.minX, stream.halfWidth * 2]} />
        <meshToonMaterial ref={mat} gradientMap={gradientMap} color="#3b6a99" emissive="#1b3a5c" emissiveIntensity={0.3} transparent opacity={0.86} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, stream.z + side * (stream.halfWidth + 0.35)]}>
          <planeGeometry args={[WORLD.maxX - WORLD.minX, 0.7]} />
          <Toon color={C.dirt} />
        </mesh>
      ))}
      <Prop bundle={bundle} name="bridge_wood" x={bridge.x} z={bridge.z} y={-groundHeight(bridge.x, bridge.z) - 0.02} s={bridge.s} rot={Math.PI / 2} />
      {lilies.map((l, i) => <Prop key={i} bundle={bundle} name={i % 2 ? 'lily_large' : 'lily_small'} x={l.x} z={l.z} y={0.06} s={3} rot={i * 1.7} />)}
    </group>
  )
}

// A shadow that follows the player: a tight frustum stays crisp everywhere in
// a valley this size, where one covering the whole map would smear.
function FollowLight({ playerRef }) {
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const p = playerRef?.current
    if (!light.current || !p) return
    light.current.position.set(p.x + 18, 30, p.z - 8)
    target.position.set(p.x, 0, p.z)
    target.updateMatrixWorld()
  })
  return (
    <>
      <directionalLight
        ref={light} intensity={0.85} color={ENV.sun} castShadow target={target}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-near={1} shadow-camera-far={90}
        shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={34} shadow-camera-bottom={-34}
      />
      <primitive object={target} />
    </>
  )
}

export default function Scene({ sealBroken = false, freed = false, lit, found, rungAt = 0, raining = false, playerRef, taikoAt = 0, shaken = {}, hit, struck = {}, onScatter, cratesApi, bubbles = {}, rivalHitAt = 0 }) {
  const litCount = lit?.size || 0
  const nature = useNature()
  const arch = useArch()
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <>
      <LightBudget />
      <Sky />
      <Stars radius={320} depth={80} count={2600} factor={3.2} saturation={0.1} fade speed={0.3} />
      <Moon />
      <Mountains />
      <Petals count={reduced ? 40 : 200} />

      {/* lighting: a cool moon key, kept low so lantern light reads */}
      <hemisphereLight args={[ENV.skyTop, ENV.ground, 0.32]} />
      <ambientLight intensity={0.1} />
      <FollowLight playerRef={playerRef} />

      {/* ground + path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, MID_Z]} receiveShadow>
        <planeGeometry args={[220, 280]} />
        <Toon color={ENV.ground} {...groundMat(1, 1)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 48]} receiveShadow>
        <planeGeometry args={[4.4, 122]} />
        <Toon color={C.dirt} {...stone(2, 54)} />
      </mesh>
      <Stream bundle={nature} />

      {/* the valley: forest, pines, rocks, meadow */}
      <Instanced bundle={nature} items={forest} />
      <Instanced bundle={nature} items={pines} />
      <Instanced bundle={nature} items={rocks} />
      <Instanced bundle={nature} items={grass} />
      <Instanced bundle={nature} items={flowers} />
      <Instanced bundle={nature} items={bushes} />
      <Instanced bundle={nature} items={mushrooms} />
      <Instanced bundle={nature} items={fences} />
      {sakura.map((t, i) => <SakuraTree key={i} bundle={nature} kind={t.kind} x={t.x} z={t.z} s={t.s} seed={t.seed} shookAt={shaken[`tree-${i}`] || 0} />)}

      {/* village */}
      {houses.map((h, i) => <House key={i} position={[h.x, groundHeight(h.x, h.z), h.z]} rotation={[0, h.rot, 0]} tone={h.tone} scale={1.15} />)}
      <LanternField lanterns={pathLanterns} lit={lit} />
      {hangingLanterns.map((l, i) => <LanternPost key={i} position={[l.x, groundHeight(l.x, l.z), l.z]} color={l.color} scale={1.15} />)}
      <Camp bundle={nature} />
      <Prop bundle={arch} name="shrine" x={shrine.x} z={shrine.z} rot={shrine.rot} s={shrine.s} />

      {/* things to find and do */}
      {scrolls.map((sc) => <Scroll key={sc.id} position={[sc.x, groundHeight(sc.x, sc.z), sc.z]} found={!!found?.has(sc.id)} />)}
      <Bell position={[bell.x, groundHeight(bell.x, bell.z), bell.z]} rungAt={rungAt} />
      <Crates stacks={crateStacks} playerRef={playerRef} onScatter={onScatter} api={cratesApi} />
      <Taiko position={[taiko.x, groundHeight(taiko.x, taiko.z), taiko.z]} hitAt={taikoAt} />
      {targets.map((t) => <Target key={t.id} position={[t.x, groundHeight(t.x, t.z), t.z]} hit={!!hit?.has(t.id)} hitAt={struck[t.id] || 0} />)}

      {/* discoverable projects */}
      {projects.map((p) => <ProjectSpot key={p.id} x={p.x} z={p.z} color={p.color} />)}

      {villagers.map((v) => (
        <Villager key={v.id} kind={v.kind} name={v.name} anchor={[v.x, v.z]} facing={v.facing} playerRef={playerRef}
          say={bubbles[v.kind]} hitAt={v.kind === 'rival' ? rivalHitAt : 0} />
      ))}

      <Kurama lit={litCount} playerRef={playerRef} freed={freed} />
      <Finale active={sealBroken} />

      <Atmosphere raining={raining} />

      {/* the star */}
      <SahlokaGate arch={arch} />
    </>
  )
}
