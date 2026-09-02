import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { C } from '../data/content'
import { toonify } from '../lib/gltf'
import { groundHeight, petSpawn } from './layout'
import { resolve } from './collide'
import { purr } from '../sound.js'

// Kurama, a fox kit. It waits by the entrance gate until someone says hello,
// then it is yours. It keeps to your heel, gallops to catch up, goes round
// things rather than through them, hops when you jump, and greets you when
// you come back. Hold E and it comes in to be petted, nuzzling, with hearts.
// Hold out a rice ball and it trots over and eats from your hand. Whistle and
// it comes running. Once the seal breaks it glows.

const URL = `${import.meta.env.BASE_URL}models/fox.glb`
const SCALE = 0.3
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

export default function Pet({ playerRef, api, item, befriended = false, freed = false, blockers = [], state, onBond }) {
  const root = useRef(), inner = useRef()
  const { scene, animations } = useGLTF(URL, false)
  const { actions, mixer } = useAnimations(animations, inner)
  const pos = useRef(new THREE.Vector3(petSpawn.x, 0, petSpawn.z))
  const yaw = useRef(2.6)
  const playing = useRef(null)
  const busyUntil = useRef(0)
  const nextFidget = useRef(3)
  const speed = useRef(0)
  const mode = useRef('wait')          // wait | follow | come | petted | feeding
  const spot = useRef(new THREE.Vector3())
  const feedDone = useRef(null)
  const feedTimer = useRef(0)
  const petTick = useRef(0)
  const wasFar = useRef(false)
  const greetAt = useRef(-99)
  const wasAir = useRef(false)
  const stall = useRef({ d: Infinity, t: 0 })
  const hearts = useRef([])
  const heartState = useMemo(() => Array.from({ length: 14 }, () => ({ t: 1, x: 0, y: 0, z: 0, vx: 0, vz: 0 })), [])
  const heartNext = useRef(0)
  const heartMat = useMemo(() => new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false, toneMapped: false }), [])
  const blockersRef = useRef(blockers); blockersRef.current = blockers
  const onBondRef = useRef(onBond); onBondRef.current = onBond
  const tmp = useMemo(() => ({ x: 0, z: 0 }), [])

  useEffect(() => { toonify(scene) }, [scene])
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh || !o.material.emissive) return
      const warm = o.material.name === 'Main' || o.material.name === 'Main_Light'
      o.material.emissive.set(freed && warm ? C.orange : '#000000')
      o.material.emissiveIntensity = freed && warm ? 0.45 : 0
    })
  }, [scene, freed])
  useEffect(() => { if (befriended && mode.current === 'wait') mode.current = 'follow' }, [befriended])

  useEffect(() => {
    for (const n of ['Gallop_Jump', 'Eating', 'Jump_ToIdle', 'Idle_2_HeadLow']) {
      const a = actions[n]; if (!a) continue
      a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false
    }
    const done = (e) => {
      busyUntil.current = 0
      if (e.action === actions.Eating) {
        // dinner over: back to heel, with a hop
        if (feedDone.current) { const f = feedDone.current; feedDone.current = null; f(true) }
        mode.current = 'follow'
        playing.current = null
        hop(); burst(3)
      }
    }
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

  const burst = (n, spread = 0.5) => {
    for (let i = 0; i < n; i++) {
      const h = heartState[heartNext.current++ % heartState.length]
      h.t = -i * 0.12
      h.x = pos.current.x + (Math.random() - 0.5) * spread
      h.y = pos.current.y + 0.7 + Math.random() * 0.2
      h.z = pos.current.z + (Math.random() - 0.5) * spread
      h.vx = (Math.random() - 0.5) * 0.5; h.vz = (Math.random() - 0.5) * 0.5
    }
  }

  const hop = () => { if (performance.now() / 1000 > busyUntil.current) play('Gallop_Jump', true, 1.1) }

  // the spot just in front of the player, where petting and feeding happen
  const frontOf = (p, d = 1.2) => spot.current.set(p.x + Math.sin(p.facing || 0) * d, 0, p.z + Math.cos(p.facing || 0) * d)

  useEffect(() => {
    api.current = {
      pos: pos.current,
      hop,
      petStart: () => { if (mode.current === 'feeding') return; frontOf(playerRef.current, 1.15); mode.current = 'petted'; petTick.current = 0 },
      petStop: () => { if (mode.current !== 'petted') return; mode.current = 'follow'; hop(); burst(3) },
      feed: () => new Promise((res) => {
        frontOf(playerRef.current, 1.25)
        if (feedDone.current) feedDone.current(false)
        feedDone.current = res
        feedTimer.current = performance.now() / 1000 + 7   // it always gets its dinner, even if the way is blocked
        mode.current = 'feeding'
      }),
      come: () => { if (mode.current === 'follow' || mode.current === 'wait') { mode.current = 'come'; busyUntil.current = 0 } },
    }
    return () => { api.current = null }
  }, [api, playerRef])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const now = performance.now() / 1000
    const p = playerRef.current
    const st = state ? state.current : null
    const busy = now < busyUntil.current
    const toPlayer = { dx: p.x - pos.current.x, dz: p.z - pos.current.z }
    const dPlayer = Math.hypot(toPlayer.dx, toPlayer.dz)
    const m = mode.current
    let want = yaw.current
    let moving = false

    // where it wants to be
    let tx = null, tz = null, arrive = 0.6
    if (m === 'follow' || m === 'come') {
      const f = p.facing || 0
      // at your heel: behind and a little to your left
      tx = p.x - Math.sin(f) * 1.9 + Math.cos(f) * 1.1
      tz = p.z - Math.cos(f) * 1.9 - Math.sin(f) * 1.1
      arrive = m === 'come' ? 0.7 : 1.0
    } else if (m === 'petted' || m === 'feeding') { tx = spot.current.x; tz = spot.current.z; arrive = 0.45 }

    if (tx != null && !busy) {
      const dx = tx - pos.current.x, dz = tz - pos.current.z, d = Math.hypot(dx, dz)
      if (dPlayer > 45) { pos.current.set(tx, 0, tz); speed.current = 0; stall.current.d = Infinity }
      else if (d > arrive) {
        const rush = m === 'come' ? 14 : 13
        const target = THREE.MathUtils.clamp((d - arrive * 0.5) * 1.9, 1.8, rush)
        speed.current += (target - speed.current) * Math.min(1, dt * 6)
        const stepLen = Math.min(speed.current * dt, d)
        const px = pos.current.x, pz = pos.current.z
        tmp.x = px + (dx / d) * stepLen; tmp.z = pz + (dz / d) * stepLen
        resolve(tmp, blockersRef.current, 0.35)
        pos.current.x = tmp.x; pos.current.z = tmp.z
        tmp.x = px; tmp.z = pz
        want = Math.atan2(dx, dz)
        moving = true
        // stuck behind something, or simply left behind: it does not know the
        // way, so it appears at your heel
        const gained = Math.hypot(pos.current.x - tmp.x, pos.current.z - tmp.z)
        if (gained > stepLen * 0.5) stall.current.t = 0; else stall.current.t += dt
        if ((stall.current.t > 1.2 && dPlayer > 6) || dPlayer > 16) { pos.current.set(tx, 0, tz); stall.current.t = 0 }
      } else {
        speed.current *= Math.exp(-8 * dt)
        stall.current.d = Infinity
        if (m === 'come') { mode.current = 'follow'; hop() }
      }
    }

    // things it does when it gets there
    if (m === 'petted') {
      if (!moving) {
        petTick.current += dt
        if (petTick.current > 0.35) {
          petTick.current = 0
          burst(1, 0.7)
          if (Math.random() < 0.5) { try { purr() } catch {} }
          if (onBondRef.current) onBondRef.current(0.35)
          if (!busy) play(Math.random() < 0.6 ? 'Idle_2_HeadLow' : 'Idle_2', true, 1.3)
        }
      }
    } else if (m === 'feeding') {
      if (!moving && playing.current !== 'Eating' && feedDone.current) { play('Eating', true, 1.25); burst(4) }
      // it could not get there in time: it still gets its dinner, and goes back to heel
      if (now > feedTimer.current && feedDone.current) { const f = feedDone.current; feedDone.current = null; f(true); mode.current = 'follow'; playing.current = null; busyUntil.current = 0 }
    }

    // greetings and games
    if (m === 'follow' || m === 'wait') {
      const far = dPlayer > 10
      if (wasFar.current && !far && befriended && now - greetAt.current > 20 && (!st || !st.sprinting)) { greetAt.current = now; hop(); burst(2) }
      wasFar.current = far
      if (st) {
        const air = !!st.airborne
        if (air && !wasAir.current && st.vy > 3 && dPlayer < 6 && befriended) hop()
        wasAir.current = air
      }
    }

    if (!moving && dPlayer < 10) want = Math.atan2(toPlayer.dx, toPlayer.dz)   // it looks at you when it is not going somewhere
    yaw.current += shortAngle(yaw.current, want) * Math.min(1, dt * (moving ? 9 : 3))
    pos.current.y = groundHeight(pos.current.x, pos.current.z)

    if (!busy && m !== 'petted' && m !== 'feeding') {
      if (moving) {
        if (speed.current > 5.5) play('Gallop', false, THREE.MathUtils.clamp(speed.current / 9, 0.9, 1.6))
        else play('Walk', false, THREE.MathUtils.clamp(speed.current / 3.2, 0.7, 1.6))
      } else if (now > nextFidget.current) {
        nextFidget.current = now + 5 + Math.random() * 7
        play(Math.random() < 0.5 ? 'Idle_2_HeadLow' : 'Idle_2', true)
      } else if (playing.current !== 'Idle' && playing.current !== 'Idle_2') play('Idle')
    } else if (!busy && m === 'petted' && moving) play('Walk', false, 1.2)
    else if (!busy && m === 'feeding' && moving) play('Walk', false, 1.3)

    if (root.current) {
      root.current.position.copy(pos.current)
      root.current.rotation.y = yaw.current
    }
    if (item) { item.x = pos.current.x; item.z = pos.current.z }

    for (let i = 0; i < heartState.length; i++) {
      const h = heartState[i], hm = hearts.current[i]
      if (!hm) continue
      if (h.t >= 1) { hm.visible = false; continue }
      h.t += dt * 0.75
      if (h.t < 0) { hm.visible = false; continue }
      h.x += h.vx * dt; h.z += h.vz * dt; h.y += dt * 0.9
      hm.visible = true
      hm.position.set(h.x, h.y, h.z)
      const s = 0.22 + h.t * 0.16
      hm.scale.set(s, s, 1)
      hm.material.opacity = Math.sin(Math.min(h.t, 1) * Math.PI)
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
