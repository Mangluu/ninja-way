import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { C } from '../data/content'
import { toonify } from '../lib/gltf'
import { groundHeight, petSpawn } from './layout'

// Kurama, a fox kit. It sits by the entrance gate until someone says hello,
// then it is yours: it trots behind you, gallops to catch up, sniffs about
// when you stop, hops when you pet it and eats out of your hand. Once the
// seal breaks it glows.

const URL = `${import.meta.env.BASE_URL}models/fox.glb`
const SCALE = 0.3
const FOLLOW = 2.4          // how close it keeps
const FADE = 0.2
const TAU = Math.PI * 2
const shortAngle = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }

// a heart, drawn once
function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d')
  x.translate(32, 30); x.scale(1.15, 1.15)
  x.beginPath()
  x.moveTo(0, 14)
  x.bezierCurveTo(-22, -4, -12, -22, 0, -10)
  x.bezierCurveTo(12, -22, 22, -4, 0, 14)
  x.closePath()
  x.fillStyle = '#ff6f9c'; x.fill()
  x.lineWidth = 3; x.strokeStyle = '#fff1f5'; x.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

export default function Pet({ playerRef, api, item, befriended = false, freed = false }) {
  const root = useRef(), inner = useRef()
  const { scene, animations } = useGLTF(URL, false)
  const { actions, mixer } = useAnimations(animations, inner)
  const pos = useRef(new THREE.Vector3(petSpawn.x, 0, petSpawn.z))
  const yaw = useRef(2.6)
  const playing = useRef(null)
  const busyUntil = useRef(0)
  const nextFidget = useRef(3)
  const speed = useRef(0)
  const hearts = useRef([])
  const heartState = useMemo(() => Array.from({ length: 10 }, () => ({ t: 1, x: 0, y: 0, z: 0, vx: 0, vz: 0 })), [])
  const heartNext = useRef(0)
  const heartMat = useMemo(() => new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false, toneMapped: false }), [])

  useEffect(() => { toonify(scene) }, [scene])
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh || !o.material.emissive) return
      const warm = o.material.name === 'Main' || o.material.name === 'Main_Light'
      o.material.emissive.set(freed && warm ? C.orange : '#000000')
      o.material.emissiveIntensity = freed && warm ? 0.45 : 0
    })
  }, [scene, freed])

  useEffect(() => {
    for (const n of ['Gallop_Jump', 'Eating', 'Jump_ToIdle', 'Idle_2_HeadLow']) {
      const a = actions[n]; if (!a) continue
      a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false
    }
    const done = () => { busyUntil.current = 0 }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }, [actions, mixer])

  const play = (name, once = false, scale = 1) => {
    const a = actions[name]; if (!a) return
    if (playing.current === name && !once) { a.timeScale = scale; return }
    const from = playing.current && actions[playing.current]
    a.reset(); a.timeScale = scale
    if (from && from !== a) from.fadeOut(FADE)
    a.fadeIn(FADE).play()
    playing.current = name
    if (once) busyUntil.current = performance.now() / 1000 + a.getClip().duration / scale - 0.1
  }

  const burst = (n) => {
    for (let i = 0; i < n; i++) {
      const h = heartState[heartNext.current++ % heartState.length]
      h.t = -i * 0.12
      h.x = pos.current.x + (Math.random() - 0.5) * 0.5
      h.y = pos.current.y + 0.7 + Math.random() * 0.2
      h.z = pos.current.z + (Math.random() - 0.5) * 0.5
      h.vx = (Math.random() - 0.5) * 0.5; h.vz = (Math.random() - 0.5) * 0.5
    }
  }

  useEffect(() => {
    api.current = {
      pet: () => { play('Gallop_Jump', true, 1.1); burst(6) },
      eat: () => { play('Eating', true, 1.2); burst(4) },
      pos: pos.current,
    }
    return () => { api.current = null }
  }, [api])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const now = performance.now() / 1000
    const p = playerRef.current
    const busy = now < busyUntil.current
    const dx = p.x - pos.current.x, dz = p.z - pos.current.z, d = Math.hypot(dx, dz)
    let want = yaw.current
    let moving = false

    if (befriended && !busy) {
      if (d > 45) { pos.current.set(p.x - Math.sin(p.facing) * 2, 0, p.z - Math.cos(p.facing) * 2) }
      else if (d > FOLLOW + 0.5) {
        const target = THREE.MathUtils.clamp((d - FOLLOW) * 1.8, 2.2, 13)
        speed.current += (target - speed.current) * Math.min(1, dt * 6)
        const stepLen = Math.min(speed.current * dt, d - FOLLOW)
        pos.current.x += (dx / d) * stepLen; pos.current.z += (dz / d) * stepLen
        want = Math.atan2(dx, dz)
        moving = true
      } else speed.current *= Math.exp(-6 * dt)
    }
    if (!moving && d < 10) want = Math.atan2(dx, dz)   // looks at you when it is not going somewhere
    yaw.current += shortAngle(yaw.current, want) * Math.min(1, dt * (moving ? 8 : 3))
    pos.current.y = groundHeight(pos.current.x, pos.current.z)

    if (!busy) {
      if (moving) {
        if (speed.current > 5.5) play('Gallop', false, THREE.MathUtils.clamp(speed.current / 9, 0.9, 1.6))
        else play('Walk', false, THREE.MathUtils.clamp(speed.current / 3.2, 0.7, 1.6))
      } else if (now > nextFidget.current) {
        nextFidget.current = now + 5 + Math.random() * 7
        play(Math.random() < 0.5 ? 'Idle_2_HeadLow' : 'Idle_2', true)
      } else if (playing.current !== 'Idle' && playing.current !== 'Idle_2') play('Idle')
    }

    if (root.current) {
      root.current.position.copy(pos.current)
      root.current.rotation.y = yaw.current
    }
    if (item) { item.x = pos.current.x; item.z = pos.current.z }

    for (let i = 0; i < heartState.length; i++) {
      const h = heartState[i], m = hearts.current[i]
      if (!m) continue
      if (h.t >= 1) { m.visible = false; continue }
      h.t += dt * 0.75
      if (h.t < 0) { m.visible = false; continue }
      h.x += h.vx * dt; h.z += h.vz * dt; h.y += dt * 0.9
      m.visible = true
      m.position.set(h.x, h.y, h.z)
      const s = 0.22 + h.t * 0.16
      m.scale.set(s, s, 1)
      m.material.opacity = Math.sin(Math.min(h.t, 1) * Math.PI)
    }
  })

  return (
    <>
      <group ref={root} position={[petSpawn.x, 0, petSpawn.z]} rotation={[0, 2.6, 0]}>
        <group ref={inner} scale={SCALE}>
          <primitive object={scene} />
        </group>
        {freed && <pointLight position={[0, 0.6, 0]} color={C.orange} intensity={1.6} distance={5} decay={2} />}
      </group>
      {heartState.map((_, i) => (
        <sprite key={i} ref={(el) => (hearts.current[i] = el)} visible={false} material={heartMat.clone()} />
      ))}
    </>
  )
}

useGLTF.preload(URL, false)
