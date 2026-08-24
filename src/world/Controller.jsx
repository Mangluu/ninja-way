import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Shinobi from './Shinobi'
import { WORLD, C } from '../data/content'
import { groundHeight } from './layout'
import { footstep, doubleJump } from '../sound.js'

const SPEED = 6, SPRINT = 10, CHAR_R = 0.45
const JUMP = 8.0
const GRAV_UP = 18          // lighter going up…
const GRAV_DOWN = 30        // …heavier coming down: the classic platformer arc
const CUT = 0.45            // releasing jump early keeps this much upward speed
const COYOTE = 0.12         // still jumpable this long after leaving the ground
const BUFFER = 0.15         // a jump pressed this early still fires on landing
const AIR_CONTROL = 0.35    // you can steer in the air, but not pivot on a dime
const PITCH_MIN = 0.06, PITCH_MAX = 1.05
const DUST_COUNT = 4
const TAU = Math.PI * 2

const shortAngle = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }

export default function Controller({ spawn = [0, 0, -2], blockers = [], interactables = [], onProximity, playerRef, lit = 0 }) {
  const rig = useRef()        // world position + facing
  const flipRig = useRef()    // somersault, *inside* facing so the axis is always "forward"
  const squash = useRef()     // landing squash / take-off stretch
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
  const coyote = useRef(0)
  const buffered = useRef(0)
  const jumps = useRef(0)
  const spacePrev = useRef(false)
  const flip = useRef(1)
  const squashT = useRef(1)
  const step = useRef(0)
  const shake = useRef(0)
  const keys = useRef({})
  const drag = useRef(null)
  const moveState = useRef({ moving: false, speed: 0 })
  const nearestId = useRef(undefined)

  const lookAt = useRef(new THREE.Vector3(spawn[0], 1.3, spawn[2]))
  const camPos = useRef(new THREE.Vector3())

  // The second jump is a clone assist: a copy flashes into being underneath and
  // you push off it. It reads as gaining height off something, which a
  // somersault never did — that just said "spinning".
  const clone = useRef()
  const cloneT = useRef(1)
  const clonePos = useRef(new THREE.Vector3())

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
    const sprinting = k.ShiftLeft || k.ShiftRight
    const maxSpeed = sprinting ? SPRINT : SPEED

    const fwd = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current))
    const right = new THREE.Vector3(-Math.cos(yaw.current), 0, Math.sin(yaw.current))
    const move = new THREE.Vector3().addScaledVector(fwd, dz).addScaledVector(right, dx)
    const moving = move.lengthSq() > 0.001
    if (moving) move.normalize()

    // Air control is deliberately weaker: you can adjust a jump, not rewrite it.
    const accel = grounded.current ? 12 : 12 * AIR_CONTROL
    vel.current.lerp(move.multiplyScalar(maxSpeed), 1 - Math.exp(-accel * dt))

    const np = pos.current.clone().addScaledVector(vel.current, dt)
    np.x = THREE.MathUtils.clamp(np.x, WORLD.minX, WORLD.maxX)
    np.z = THREE.MathUtils.clamp(np.z, WORLD.minZ, WORLD.maxZ)
    for (const b of blockers) {
      const ddx = np.x - b.x, ddz = np.z - b.z
      const d = Math.hypot(ddx, ddz), min = b.r + CHAR_R
      if (d < min && d > 1e-4) { const push = (min - d) / d; np.x += ddx * push; np.z += ddz * push }
    }
    pos.current.copy(np)

    // ── vertical ──────────────────────────────────────────────────────────────
    const groundY = groundHeight(np.x, np.z)
    const spaceNow = !!k.Space
    const pressed = spaceNow && !spacePrev.current

    // Coyote time and jump buffering: the two things that make a jump feel fair
    // rather than mistimed. You can jump just after stepping off, and a press
    // slightly too early still fires the moment you land.
    coyote.current = grounded.current ? COYOTE : Math.max(0, coyote.current - dt)
    buffered.current = pressed ? BUFFER : Math.max(0, buffered.current - dt)

    if (buffered.current > 0 && (grounded.current || coyote.current > 0) && jumps.current === 0) {
      vy.current = JUMP
      jumps.current = 1
      buffered.current = 0
      coyote.current = 0
      squashT.current = 0
    } else if (pressed && !grounded.current && jumps.current === 1) {
      vy.current = JUMP * 0.92
      jumps.current = 2
      flip.current = 0
      cloneT.current = 0
      clonePos.current.set(np.x, charY.current - 0.15, np.z)
      try { doubleJump() } catch {}
      if (!reduced) {
        const slot = dustState.current[dustNext.current % DUST_COUNT]
        slot.t = 0; slot.x = np.x; slot.y = charY.current; slot.z = np.z
        dustNext.current++
      }
    }
    spacePrev.current = spaceNow

    // Release early and the rise is cut short — hold the key for height.
    if (!spaceNow && vy.current > 0) vy.current *= Math.pow(CUT, dt * 60)

    const fallSpeed = vy.current
    vy.current -= (vy.current > 0 ? GRAV_UP : GRAV_DOWN) * dt
    charY.current += vy.current * dt
    if (charY.current <= groundY) { charY.current = groundY; vy.current = 0 }
    grounded.current = charY.current <= groundY + 0.01
    if (grounded.current) jumps.current = 0

    if (grounded.current && !wasGrounded.current && fallSpeed < -3) {
      const power = Math.min(Math.abs(fallSpeed) / JUMP, 1)
      squashT.current = 0
      if (!reduced) {
        shake.current = Math.min(shake.current + power * 0.2, 0.28)
        const slot = dustState.current[dustNext.current % DUST_COUNT]
        slot.t = 0; slot.x = np.x; slot.y = groundY; slot.z = np.z
        dustNext.current++
      }
      try { footstep() } catch {}
      flip.current = 1          // never land mid-somersault
    }
    wasGrounded.current = grounded.current

    // ── pose ──────────────────────────────────────────────────────────────────
    if (moving) facing.current += shortAngle(facing.current, Math.atan2(move.x, move.z)) * (1 - Math.exp(-10 * dt))
    if (flip.current < 1) flip.current = Math.min(1, flip.current + dt * 2.4)
    if (squashT.current < 1) squashT.current = Math.min(1, squashT.current + dt * 5)

    if (rig.current) {
      rig.current.position.set(np.x, charY.current, np.z)
      rig.current.rotation.y = facing.current
    }
    // The somersault lives inside the facing group, so it is always a forward
    // roll regardless of which way the character happens to be pointing. That
    // was the old bug: rotating the same group that carried facing meant the
    // flip axis changed with your last direction of travel.
    // a short tuck as he pushes off the clone, rather than a full roll
    if (flipRig.current) {
      flipRig.current.rotation.x = flip.current < 1 ? Math.sin(flip.current * Math.PI) * 0.55 : 0
    }
    if (squash.current && !reduced) {
      const s = 1 - Math.sin(squashT.current * Math.PI) * 0.16
      squash.current.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6)
    }

    moveState.current.moving = moving && grounded.current
    moveState.current.speed = vel.current.length()
    moveState.current.sprinting = moving && grounded.current && sprinting
    moveState.current.airborne = !grounded.current
    if (playerRef) {
      playerRef.current.x = np.x; playerRef.current.y = charY.current; playerRef.current.z = np.z
      playerRef.current.speed = vel.current.length()
    }

    if (moving && grounded.current) {
      step.current += dt * (0.9 + vel.current.length() * 0.12)
      if (step.current > 0.34) { step.current = 0; try { footstep() } catch {} }
    }

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

    // ── camera ────────────────────────────────────────────────────────────────
    const horiz = Math.cos(pitch.current) * dist.current
    let cx = np.x - Math.sin(yaw.current) * horiz
    let cz = np.z - Math.cos(yaw.current) * horiz
    let cy = charY.current + 1.4 + Math.sin(pitch.current) * dist.current
    for (const b of blockers) {
      const ddx = cx - b.x, ddz = cz - b.z
      const d = Math.hypot(ddx, ddz), min = b.r + 0.8
      if (d < min && d > 1e-4) { const push = (min - d) / d; cx += ddx * push; cz += ddz * push }
    }
    cy = Math.max(cy, groundHeight(cx, cz) + 1.3)
    camPos.current.set(cx, cy, cz)
    camera.position.lerp(camPos.current, 1 - Math.exp(-8 * dt))
    lookAt.current.lerp({ x: np.x, y: charY.current + 1.3, z: np.z }, 1 - Math.exp(-10 * dt))
    camera.lookAt(lookAt.current)
    if (shake.current > 0.001) {
      shake.current *= Math.exp(-7 * dt)
      camera.position.x += (Math.random() - 0.5) * shake.current
      camera.position.y += (Math.random() - 0.5) * shake.current
      camera.position.z += (Math.random() - 0.5) * shake.current
    }

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
      <group ref={rig} position={[spawn[0], 0, spawn[2]]}>
        <group ref={flipRig}>
          <group ref={squash}>
            <Shinobi state={moveState} lit={lit} />
          </group>
        </group>
      </group>
      {/* the clone — a suggestion of him, not a second character */}
      <group ref={clone} visible={false}>
        <mesh position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.3, 0.42, 6, 12]} />
          <meshBasicMaterial color={C.indigo} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 1.5, 0.02]}>
          <sphereGeometry args={[0.29, 12, 12]} />
          <meshBasicMaterial color={C.washi} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <coneGeometry args={[0.42, 0.5, 12]} />
          <meshBasicMaterial color={C.indigoDeep} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

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
