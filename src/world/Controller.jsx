import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Shinobi from './Shinobi'
import { WORLD } from '../data/content'
import { groundHeight } from './layout'
import { footstep } from '../sound.js'

const SPEED = 6, SPRINT = 10, CHAR_R = 0.45, JUMP = 7.2, GRAVITY = 20
const shortAngle = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d }

export default function Controller({ spawn = [0, 0, -2], blockers = [], interactables = [], onProximity }) {
  const rig = useRef()
  const { camera, gl } = useThree()
  const pos = useRef(new THREE.Vector3(spawn[0], 0, spawn[2]))
  const vel = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const facing = useRef(0)
  const dist = useRef(9)
  const charY = useRef(0)
  const vy = useRef(0)
  const grounded = useRef(true)
  const step = useRef(0)
  const keys = useRef({})
  const drag = useRef(null)
  const moveState = useRef({ moving: false, speed: 0 })
  const nearestId = useRef(undefined)

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault() }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    const el = gl.domElement
    const pd = (e) => { drag.current = { x: e.clientX } }
    const pm = (e) => { if (drag.current) { yaw.current -= (e.clientX - drag.current.x) * 0.005; drag.current = { x: e.clientX } } }
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
    const right = new THREE.Vector3(-Math.cos(yaw.current), 0, Math.sin(yaw.current)) // screen-right
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
    vy.current -= GRAVITY * dt
    charY.current += vy.current * dt
    if (charY.current <= groundY) { charY.current = groundY; vy.current = 0 }
    grounded.current = charY.current <= groundY + 0.01

    if (moving) facing.current += shortAngle(facing.current, Math.atan2(move.x, move.z)) * (1 - Math.exp(-10 * dt))
    if (rig.current) { rig.current.position.set(np.x, charY.current, np.z); rig.current.rotation.y = facing.current }
    moveState.current.moving = moving && grounded.current
    moveState.current.speed = vel.current.length()

    // footsteps
    if (moving && grounded.current) {
      step.current += dt * (0.9 + vel.current.length() * 0.12)
      if (step.current > 0.34) { step.current = 0; try { footstep() } catch {} }
    }

    // third-person camera
    const cx = np.x - Math.sin(yaw.current) * dist.current
    const cz = np.z - Math.cos(yaw.current) * dist.current
    const cy = charY.current + 3.4 + dist.current * 0.25
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.exp(-8 * dt))
    camera.lookAt(np.x, charY.current + 1.3, np.z)

    // proximity
    let near = null, best = Infinity
    for (const it of interactables) {
      const d = Math.hypot(np.x - it.x, np.z - it.z)
      if (d < it.r && d < best) { best = d; near = it }
    }
    const id = near ? near.id : null
    if (id !== nearestId.current) { nearestId.current = id; onProximity && onProximity(near) }
  })

  return <group ref={rig} position={[spawn[0], 0, spawn[2]]}><Shinobi state={moveState} /></group>
}
