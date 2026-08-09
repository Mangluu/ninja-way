import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Shinobi from './Shinobi'
import { WORLD, C } from '../data/content'
import { groundHeight } from './layout'
import { footstep } from '../sound.js'

const SPEED = 6, SPRINT = 10, CHAR_R = 0.45, JUMP = 7.2, GRAVITY = 20
const PITCH_MIN = 0.06, PITCH_MAX = 1.05
const DUST_COUNT = 4

const shortAngle = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d }

export default function Controller({ spawn = [0, 0, -2], blockers = [], interactables = [], onProximity }) {
  const rig = useRef()
  const { camera, gl } = useThree()
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  const pos = useRef(new THREE.Vector3(spawn[0], 0, spawn[2]))
  const vel = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0.42)
  const facing = useRef(0)
  const dist = useRef(9)
  const charY = useRef(0)
  const vy = useRef(0)
  const grounded = useRef(true)
  const wasGrounded = useRef(true)
  const step = useRef(0)
  const shake = useRef(0)
  const keys = useRef({})
  const drag = useRef(null)
  const moveState = useRef({ moving: false, speed: 0 })
  const nearestId = useRef(undefined)

  // Camera aims at a smoothed target, never at raw player state — that's what
  // keeps the view calm while the character bobs, lands and turns.
  const lookAt = useRef(new THREE.Vector3(spawn[0], 1.3, spawn[2]))
  const camPos = useRef(new THREE.Vector3())

  // Landing dust: a tiny fixed pool of expanding rings, reused round-robin.
  const dust = useRef([])
  const dustState = useRef(Array.from({ length: DUST_COUNT }, () => ({ t: 1, x: 0, y: 0, z: 0 })))
  const dustNext = useRef(0)

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault() }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    const el = gl.domElement
    const pd = (e) => { drag.current = { x: e.clientX, y: e.clientY } }
    const pm = (e) => {
      if (!drag.current) return
      yaw.current -= (e.clientX - drag.current.x) * 0.005
      pitch.current = THREE.MathUtils.clamp(pitch.current + (e.clientY - drag.current.y) * 0.004, PITCH_MIN, PITCH_MAX)
      drag.current = { x: e.clientX, y: e.clientY }
    }
    const pu = () => { drag.current = null }
    const wheel = (e) => { dist.current = THREE.MathUtils.clamp(dist.current + e.deltaY * 0.01, 5, 16); e.preventDefault() }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up)
      el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu); el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const k = keys.current
    const dz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const dx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const maxSpeed = (k.ShiftLeft || k.ShiftRight) ? SPRINT : SPEED

    const fwd = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current))
    const right = new THREE.Vector3(-Math.cos(yaw.current), 0, Math.sin(yaw.current))
    const move = new THREE.Vector3().addScaledVector(fwd, dz).addScaledVector(right, dx)
    const moving = move.lengthSq() > 0.001
    if (moving) move.normalize()

    vel.current.lerp(move.multiplyScalar(maxSpeed), 1 - Math.exp(-12 * dt))

    const np = pos.current.clone().addScaledVector(vel.current, dt)
    np.x = THREE.MathUtils.clamp(np.x, WORLD.minX, WORLD.maxX)
    np.z = THREE.MathUtils.clamp(np.z, WORLD.minZ, WORLD.maxZ)
    for (const b of blockers) {
      const ddx = np.x - b.x, ddz = np.z - b.z
      const d = Math.hypot(ddx, ddz), min = b.r + CHAR_R
      if (d < min && d > 1e-4) { const push = (min - d) / d; np.x += ddx * push; np.z += ddz * push }
    }
    pos.current.copy(np)

    // vertical: gravity + jump, riding the hill height field
    const groundY = groundHeight(np.x, np.z)
    if (k.Space && grounded.current) vy.current = JUMP
    const fallSpeed = vy.current
    vy.current -= GRAVITY * dt
    charY.current += vy.current * dt
    if (charY.current <= groundY) { charY.current = groundY; vy.current = 0 }
    grounded.current = charY.current <= groundY + 0.01

    // Landing: the moment airborne becomes grounded, sell the impact.
    if (grounded.current && !wasGrounded.current && fallSpeed < -4) {
      const power = Math.min(Math.abs(fallSpeed) / JUMP, 1)
      if (!reduced) {
        shake.current = Math.min(shake.current + power * 0.22, 0.3)
        const slot = dustState.current[dustNext.current % DUST_COUNT]
        slot.t = 0; slot.x = np.x; slot.y = groundY; slot.z = np.z
        dustNext.current++
      }
      try { footstep() } catch {}
    }
    wasGrounded.current = grounded.current

    if (moving) facing.current += shortAngle(facing.current, Math.atan2(move.x, move.z)) * (1 - Math.exp(-10 * dt))
    if (rig.current) { rig.current.position.set(np.x, charY.current, np.z); rig.current.rotation.y = facing.current }
    moveState.current.moving = moving && grounded.current
    moveState.current.speed = vel.current.length()

    // footsteps
    if (moving && grounded.current) {
      step.current += dt * (0.9 + vel.current.length() * 0.12)
      if (step.current > 0.34) { step.current = 0; try { footstep() } catch {} }
    }

    // advance the dust rings
    for (let i = 0; i < DUST_COUNT; i++) {
      const s = dustState.current[i], m = dust.current[i]
      if (!m) continue
      if (s.t >= 1) { m.visible = false; continue }
      s.t = Math.min(s.t + dt * 1.8, 1)
      m.visible = true
      m.position.set(s.x, s.y + 0.04, s.z)
      const k2 = 0.5 + s.t * 2.6
      m.scale.set(k2, k2, k2)
      m.material.opacity = (1 - s.t) * 0.45
    }

    // ── camera: orbit on yaw + pitch, then keep it out of the scenery ──
    const horiz = Math.cos(pitch.current) * dist.current
    let cx = np.x - Math.sin(yaw.current) * horiz
    let cz = np.z - Math.cos(yaw.current) * horiz
    let cy = charY.current + 1.4 + Math.sin(pitch.current) * dist.current

    // don't let buildings swallow the camera
    for (const b of blockers) {
      const ddx = cx - b.x, ddz = cz - b.z
      const d = Math.hypot(ddx, ddz), min = b.r + 0.8
      if (d < min && d > 1e-4) { const push = (min - d) / d; cx += ddx * push; cz += ddz * push }
    }
    // and never sink below the ground it's flying over
    cy = Math.max(cy, groundHeight(cx, cz) + 1.3)

    camPos.current.set(cx, cy, cz)
    camera.position.lerp(camPos.current, 1 - Math.exp(-8 * dt))

    // smoothed aim point (decoupled from the character's bob/land)
    lookAt.current.lerp({ x: np.x, y: charY.current + 1.3, z: np.z }, 1 - Math.exp(-10 * dt))
    camera.lookAt(lookAt.current)

    // impact shake, layered on top as a temporary modifier
    if (shake.current > 0.001) {
      shake.current *= Math.exp(-7 * dt)
      camera.position.x += (Math.random() - 0.5) * shake.current
      camera.position.y += (Math.random() - 0.5) * shake.current
      camera.position.z += (Math.random() - 0.5) * shake.current
    }

    // proximity
    let near = null, best = Infinity
    for (const it of interactables) {
      const d = Math.hypot(np.x - it.x, np.z - it.z)
      if (d < it.r && d < best) { best = d; near = it }
    }
    const id = near ? near.id : null
    if (id !== nearestId.current) { nearestId.current = id; onProximity && onProximity(near) }
  })

  return (
    <>
      <group ref={rig} position={[spawn[0], 0, spawn[2]]}><Shinobi state={moveState} /></group>
      <group>
        {Array.from({ length: DUST_COUNT }).map((_, i) => (
          <mesh key={i} ref={(el) => (dust.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0.5, 0.72, 24]} />
            <meshBasicMaterial color={C.washi} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </>
  )
}
