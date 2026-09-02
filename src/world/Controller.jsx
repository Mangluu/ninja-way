import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Ninja from './Ninja'
import { WORLD, C } from '../data/content'
import { groundHeight, PICK } from './layout'
import { findPath } from './nav'
import { resolve, bound } from './collide'
import { footstep, doubleJump } from '../sound.js'

const SPEED = 6, SPRINT = 10.5, CHAR_R = 0.45
const DASH_SPEED = 16, DASH_TIME = 0.32
const EMBER_COUNT = 18
const JUMP = 8.4
const GRAV_UP = 18          // lighter going up…
const GRAV_DOWN = 30        // …heavier coming down: the classic platformer arc
const CUT = 0.5             // let go early and the rise is halved, once
const COYOTE = 0.12         // still jumpable this long after leaving the ground
const BUFFER = 0.15         // a jump pressed this early still fires on landing
const AIR_CONTROL = 0.35    // you can steer in the air, but not pivot on a dime
const PITCH_MIN = 0.06, PITCH_MAX = 1.05
const FOV = 52, FOV_SPRINT = 58
const DUST_COUNT = 4
const TAP_PX = 8            // a finger that moves less than this is a tap, not a look
const TAP_MS = 450
const TAU = Math.PI * 2
// how long each one-shot holds the feet still
const LOCK = { Throw: 0.34, Interact: 0.45, PickUp: 0.55, Cheer: 1.1, Dodge_Forward: DASH_TIME }

const shortAngle = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }
const clamp = THREE.MathUtils.clamp

// Input comes from three places and all of them land here: the keyboard, the
// touch joystick and buttons (through `input`, a ref the DOM controls write
// into), and taps on the world itself. A tap on the ground walks you there,
// along a path that goes around things; a tap on a thing is handed up through
// `onTap` for the app to throw at or walk to. Nobody has to know WASD.
export default function Controller({ freed = false, spawn = [0, 0, -2], blockers = [], camObstacles = [], interactables = [], onProximity, onTap, input, playerRef, lit = 0, state, nav }) {
  const rig = useRef()        // world position + facing
  const flipRig = useRef()    // somersault, *inside* facing so the axis is always "forward"
  const pickGroup = useRef()  // invisible cylinders, one per interactable, for taps
  const marker = useRef()     // the ring where a tap told him to go
  const { camera, gl, raycaster } = useThree()
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // the camera steers around what would fill the screen: buildings and canopies
  const camBlockers = useMemo(() => [...blockers.filter((b) => bound(b) >= 1.8), ...camObstacles], [blockers, camObstacles])

  const pos = useRef(new THREE.Vector3(spawn[0], 0, spawn[2]))
  const vel = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0.3)
  const facing = useRef(0)
  const faceTarget = useRef(null)
  const dist = useRef(7)
  const charY = useRef(0)
  const vy = useRef(0)
  const grounded = useRef(true)
  const wasGrounded = useRef(true)
  const coyote = useRef(0)
  const buffered = useRef(0)
  const jumps = useRef(0)
  const spacePrev = useRef(false)
  const dashPrev = useRef(false)
  const dash = useRef(null)   // { until, dx, dz }
  const flip = useRef(1)
  const step = useRef(0)
  const shake = useRef(0)
  const keys = useRef({})
  const drag = useRef(null)
  const walk = useRef(null)   // { pts, i, stop, best, stall }
  const ownState = useRef({ moving: false, speed: 0, sprinting: false, airborne: false, vy: 0, landedAt: 0, oneShot: null, oneShotAt: 0, justJumped: false })
  const moveState = state || ownState
  const nearestId = useRef(undefined)
  const onTapRef = useRef(onTap); onTapRef.current = onTap
  const navRef = useRef(nav); navRef.current = nav
  const ndc = useMemo(() => new THREE.Vector2(), [])

  const lookAt = useRef(new THREE.Vector3(spawn[0], 1.45, spawn[2]))
  const camPos = useRef(new THREE.Vector3())

  // The second jump is a clone assist: a copy flashes into being underneath and
  // you push off it. It reads as gaining height off something.
  const clone = useRef()
  const cloneT = useRef(1)
  const clonePos = useRef(new THREE.Vector3())

  const embers = useRef([])
  const emberState = useRef(Array.from({ length: EMBER_COUNT }, () => ({ t: 1, x: 0, y: 0, z: 0, vx: 0, vz: 0 })))
  const emberNext = useRef(0)
  const emberGap = useRef(0)

  const dust = useRef([])
  const dustState = useRef(Array.from({ length: DUST_COUNT }, () => ({ t: 1, x: 0, y: 0, z: 0 })))
  const dustNext = useRef(0)
  const puff = (x, y, z) => {
    if (reduced) return
    const slot = dustState.current[dustNext.current % DUST_COUNT]
    slot.t = 0; slot.x = x; slot.y = y; slot.z = z
    dustNext.current++
  }

  // Walk to a point along the nav grid. `stop` is how close counts as arrived:
  // tight for a patch of ground, looser for a thing you want to stand beside.
  const walkTo = (x, z, stop = 0.45) => {
    const to = { x: clamp(x, WORLD.minX, WORLD.maxX), z: clamp(z, WORLD.minZ, WORLD.maxZ) }
    const pts = (navRef.current && findPath(navRef.current, pos.current, to)) || [to]
    walk.current = { pts, i: 0, stop, best: Infinity, stall: 0 }
  }
  useEffect(() => { if (input) input.current.walkTo = walkTo }, [input])

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault() }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    const el = gl.domElement

    // A tap: the pick cylinders first, then the ground. The ground is met at
    // y = 0 and refined once against the terrain height there.
    const tap = (cx, cy) => {
      const r = el.getBoundingClientRect()
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = pickGroup.current ? raycaster.intersectObjects(pickGroup.current.children, false) : []
      if (hits.length) {
        const item = hits[0].object.userData.item
        if (onTapRef.current) onTapRef.current(item, Math.hypot(pos.current.x - item.x, pos.current.z - item.z))
        return
      }
      const o = raycaster.ray.origin, d = raycaster.ray.direction
      if (d.y >= -1e-4) return
      let t = -o.y / d.y
      let x = o.x + d.x * t, z = o.z + d.z * t
      const h = groundHeight(x, z)
      if (h > 0) { t = (h - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t }
      walkTo(x, z)
    }

    // One pointer at a time, tracked by id, so a second finger (the joystick)
    // never hijacks the look.
    const pd = (e) => {
      if (drag.current) return
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false }
    }
    const pm = (e) => {
      const g = drag.current
      if (!g || e.pointerId !== g.id) return
      const dx = e.clientX - g.x, dy = e.clientY - g.y
      g.x = e.clientX; g.y = e.clientY
      if (!g.moved) {
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > TAP_PX) g.moved = true
        else return
      }
      yaw.current -= dx * 0.005
      pitch.current = clamp(pitch.current + dy * 0.004, PITCH_MIN, PITCH_MAX)
    }
    const pu = (e) => {
      const g = drag.current
      if (!g || e.pointerId !== g.id) return
      drag.current = null
      if (!g.moved && e.type === 'pointerup' && performance.now() - g.t < TAP_MS) tap(e.clientX, e.clientY)
    }
    const wheel = (e) => { dist.current = clamp(dist.current + e.deltaY * 0.01, 4, 13); e.preventDefault() }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    window.addEventListener('pointercancel', pu)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up)
      el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl, camera, raycaster, ndc])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const now = performance.now() / 1000
    const st = moveState.current
    const k = keys.current
    const inp = input ? input.current : null
    const joy = inp ? inp.joy : null

    // a one-shot in progress holds the feet, for as long as it needs
    const lock = st.oneShot ? (LOCK[st.oneShot] || 0) : 0
    const locked = st.oneShot && now - st.oneShotAt < lock

    let dz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    let dx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const jm = joy ? Math.hypot(joy.x, joy.y) : 0
    if (!dz && !dx && jm > 0.08) { dx = joy.x; dz = -joy.y }
    let manual = dx !== 0 || dz !== 0
    let sprinting = !!(k.ShiftLeft || k.ShiftRight) || jm > 0.92
    if (manual) walk.current = null
    // moving again ends a throw or a cheer once the meaningful part is over
    if (manual && st.oneShot && !locked && st.oneShot !== 'Dodge_Forward') st.oneShot = null
    if (locked) { dx = 0; dz = 0; manual = false }

    const fwd = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current))
    const right = new THREE.Vector3(-Math.cos(yaw.current), 0, Math.sin(yaw.current))
    const move = new THREE.Vector3().addScaledVector(fwd, dz).addScaledVector(right, dx)

    // Walking to a tapped point: waypoint to waypoint, jogging, breaking into a
    // run if it is far, giving up quietly if something has blocked the way.
    if (!manual && !locked && walk.current) {
      const w = walk.current
      const tgt = w.pts[w.i]
      const wx = tgt.x - pos.current.x, wz = tgt.z - pos.current.z, wd = Math.hypot(wx, wz)
      const last = w.i === w.pts.length - 1
      if (wd < (last ? w.stop : 0.7)) {
        if (last) walk.current = null
        else { w.i++; w.best = Infinity; w.stall = 0 }
      } else {
        move.set(wx / wd, 0, wz / wd)
        const remaining = wd + (w.pts.length - 1 - w.i) * 3
        sprinting = remaining > 9
        if (wd < w.best - 0.02) { w.best = wd; w.stall = 0 } else if ((w.stall += dt) > 0.8) walk.current = null
      }
    }

    // the dash: a short burst along the facing, on C or the button
    const dashNow = !!k.KeyC || !!(inp && inp.dash)
    if (inp) inp.dash = false
    if (dashNow && !dashPrev.current && grounded.current && !st.oneShot) {
      const ang = move.lengthSq() > 0.001 ? Math.atan2(move.x, move.z) : facing.current
      dash.current = { until: now + DASH_TIME, dx: Math.sin(ang), dz: Math.cos(ang) }
      st.oneShot = 'Dodge_Forward'; st.oneShotAt = now
      facing.current = ang
      puff(pos.current.x, charY.current, pos.current.z)
      try { footstep() } catch {}
    }
    dashPrev.current = dashNow
    const dashing = dash.current && now < dash.current.until
    if (dash.current && !dashing) dash.current = null

    const maxSpeed = (sprinting ? SPRINT : SPEED) * (freed ? 1.38 : 1)
    const moving = move.lengthSq() > 0.001
    if (move.lengthSq() > 1) move.normalize()     // keys give unit axes; the stick is analogue

    if (dashing) {
      vel.current.set(dash.current.dx * DASH_SPEED, 0, dash.current.dz * DASH_SPEED)
    } else {
      // Air control is deliberately weaker: you can adjust a jump, not rewrite it.
      const accel = grounded.current ? 14 : 14 * AIR_CONTROL
      vel.current.lerp(move.multiplyScalar(maxSpeed), 1 - Math.exp(-accel * dt))
    }

    const np = pos.current.clone().addScaledVector(vel.current, dt)
    np.x = clamp(np.x, WORLD.minX, WORLD.maxX)
    np.z = clamp(np.z, WORLD.minZ, WORLD.maxZ)
    // twice, so a corner between two things settles instead of jittering
    resolve(np, blockers, CHAR_R); resolve(np, blockers, CHAR_R)
    pos.current.copy(np)

    // ── vertical ──────────────────────────────────────────────────────────────
    const groundY = groundHeight(np.x, np.z)
    const spaceNow = (!!k.Space || !!(inp && inp.jump)) && !locked
    const pressed = spaceNow && !spacePrev.current
    const released = !spaceNow && spacePrev.current

    coyote.current = grounded.current ? COYOTE : Math.max(0, coyote.current - dt)
    buffered.current = pressed ? BUFFER : Math.max(0, buffered.current - dt)

    if (buffered.current > 0 && (grounded.current || coyote.current > 0) && jumps.current === 0) {
      vy.current = JUMP
      jumps.current = 1
      buffered.current = 0
      coyote.current = 0
      st.justJumped = true
      if (st.oneShot !== 'Dodge_Forward') st.oneShot = null
      puff(np.x, groundY, np.z)
    } else if (pressed && !grounded.current && jumps.current <= (freed ? 2 : 1)) {
      vy.current = JUMP * (jumps.current === 1 ? 0.92 : 0.80)
      jumps.current += 1
      flip.current = 0
      cloneT.current = 0
      clonePos.current.set(np.x, charY.current - 0.15, np.z)
      st.justJumped = true
      try { doubleJump() } catch {}
      puff(np.x, charY.current, np.z)
    }
    spacePrev.current = spaceNow

    if (released && vy.current > 0) vy.current *= CUT

    const fallSpeed = vy.current
    vy.current -= (vy.current > 0 ? GRAV_UP : GRAV_DOWN) * dt
    charY.current += vy.current * dt
    if (charY.current <= groundY) { charY.current = groundY; vy.current = 0 }
    grounded.current = charY.current <= groundY + 0.01
    if (grounded.current) jumps.current = 0

    if (grounded.current && !wasGrounded.current && fallSpeed < -3) {
      const power = Math.min(Math.abs(fallSpeed) / JUMP, 1)
      st.landedAt = performance.now()
      if (!reduced) shake.current = Math.min(shake.current + power * 0.2, 0.28)
      puff(np.x, groundY, np.z)
      try { footstep() } catch {}
      if (flip.current < 0.55) flip.current = 1
    }
    wasGrounded.current = grounded.current

    // ── pose ──────────────────────────────────────────────────────────────────
    if (inp && inp.face != null) { faceTarget.current = inp.face; inp.face = null }
    if (moving && !dashing) { facing.current += shortAngle(facing.current, Math.atan2(move.x, move.z)) * (1 - Math.exp(-10 * dt)); faceTarget.current = null }
    else if (faceTarget.current != null) {
      const d = shortAngle(facing.current, faceTarget.current)
      facing.current += d * (1 - Math.exp(-18 * dt))
      if (Math.abs(d) < 0.03) faceTarget.current = null
    }
    if (flip.current < 1) flip.current = Math.min(1, flip.current + dt * 1.7)

    if (rig.current) {
      rig.current.position.set(np.x, charY.current, np.z)
      rig.current.rotation.y = facing.current
    }
    if (flipRig.current) flipRig.current.rotation.x = flip.current < 1 ? -flip.current * TAU : 0

    st.moving = moving && grounded.current && !dashing
    st.speed = vel.current.length()
    st.sprinting = st.moving && (sprinting || st.speed > SPEED * 1.15)
    st.airborne = !grounded.current
    st.vy = vy.current
    if (playerRef) {
      playerRef.current.x = np.x; playerRef.current.y = charY.current; playerRef.current.z = np.z
      playerRef.current.speed = vel.current.length()
      playerRef.current.facing = facing.current
      playerRef.current.grounded = grounded.current
    }

    if (moving && grounded.current && !dashing) {
      step.current += dt * (0.9 + vel.current.length() * 0.12)
      if (step.current > 0.34) { step.current = 0; try { footstep() } catch {} }
    }

    // the ring on the ground he is walking toward
    if (marker.current) {
      const w = walk.current
      marker.current.visible = !!w
      if (w) {
        const end = w.pts[w.pts.length - 1]
        marker.current.position.set(end.x, groundHeight(end.x, end.z) + 0.05, end.z)
        marker.current.scale.setScalar(1 + Math.sin(performance.now() * 0.008) * 0.12)
      }
    }

    // The clone: snaps in solid under your feet, then thins out and sinks as
    // you leave it behind. This is what the second jump pushes off.
    if (clone.current) {
      if (cloneT.current >= 1) {
        clone.current.visible = false
      } else {
        cloneT.current = Math.min(cloneT.current + dt * 2.4, 1)
        const kk = cloneT.current
        clone.current.visible = true
        clone.current.position.set(clonePos.current.x, clonePos.current.y - kk * 0.9, clonePos.current.z)
        clone.current.rotation.y = facing.current
        clone.current.scale.setScalar(0.92 + kk * 0.3)
        const fade = (1 - kk) * 0.6
        clone.current.traverse((o) => { if (o.isMesh) o.material.opacity = fade })
      }
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

    // ── ember trail (cloak state), and dash trail always ──────────────────────
    if (freed || dashing) {
      emberGap.current -= dt
      if (emberGap.current <= 0 && (moving || !grounded.current || dashing)) {
        emberGap.current = dashing ? 0.02 : 0.04
        const e = emberState.current[emberNext.current % EMBER_COUNT]
        e.t = 0
        e.x = np.x + (Math.random() - 0.5) * 0.45
        e.y = charY.current + 0.3 + Math.random() * 0.55
        e.z = np.z + (Math.random() - 0.5) * 0.45
        e.vx = (Math.random() - 0.5) * 0.6
        e.vz = (Math.random() - 0.5) * 0.6
        emberNext.current++
      }
    }
    for (let i = 0; i < EMBER_COUNT; i++) {
      const e = emberState.current[i], m = embers.current[i]
      if (!m) continue
      if (e.t >= 1) { m.visible = false; continue }
      e.t = Math.min(e.t + dt * 0.85, 1)
      e.x += e.vx * dt; e.z += e.vz * dt; e.y += dt * 1.15
      m.visible = true
      m.position.set(e.x, e.y, e.z)
      const k3 = (1 - e.t) * 0.13 + 0.02
      m.scale.setScalar(k3)
      m.material.opacity = Math.sin((1 - e.t) * Math.PI * 0.85) * 0.9
      m.material.color.set(freed ? C.orangeLite : C.washi)
    }

    // ── camera ────────────────────────────────────────────────────────────────
    const horiz = Math.cos(pitch.current) * dist.current
    let cx = np.x - Math.sin(yaw.current) * horiz
    let cz = np.z - Math.cos(yaw.current) * horiz
    let cy = charY.current + 1.5 + Math.sin(pitch.current) * dist.current
    const cp = resolve({ x: cx, z: cz }, camBlockers, 0.8)
    cx = cp.x; cz = cp.z
    cy = Math.max(cy, groundHeight(cx, cz) + 1.2)
    camPos.current.set(cx, cy, cz)
    camera.position.lerp(camPos.current, 1 - Math.exp(-8 * dt))
    lookAt.current.lerp({ x: np.x, y: charY.current + 1.45, z: np.z }, 1 - Math.exp(-10 * dt))
    camera.lookAt(lookAt.current)
    // the lens opens up a little at speed
    const wantFov = (sprinting && moving) || dashing ? FOV_SPRINT : FOV
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix() }
    if (shake.current > 0.001) {
      shake.current *= Math.exp(-7 * dt)
      camera.position.x += (Math.random() - 0.5) * shake.current
      camera.position.y += (Math.random() - 0.5) * shake.current
      camera.position.z += (Math.random() - 0.5) * shake.current
    }

    // nearest thing wins, except the pet, which is always underfoot and only
    // gets the prompt when nothing else is in reach
    let near = null, best = Infinity, pet = null
    for (const it of interactables) {
      if (!it.r) continue
      const d = Math.hypot(np.x - it.x, np.z - it.z)
      if (d >= it.r) continue
      if (it.type === 'pet') { pet = it; continue }
      if (d < best) { best = d; near = it }
    }
    if (!near) near = pet
    const id = near ? near.id : null
    if (id !== nearestId.current) { nearestId.current = id; onProximity && onProximity(near) }
  })

  return (
    <>
      <group ref={rig} position={[spawn[0], 0, spawn[2]]}>
        <group ref={flipRig}>
          <Ninja state={moveState} lit={lit} freed={freed} playerRef={playerRef} />
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
      </group>

      {/* where a tap sent him */}
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color={C.goldLite} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* tap volumes: never drawn, only raycast */}
      <group ref={pickGroup}>
        {interactables.map((it) => {
          const [r, h] = PICK[it.type] || [1, 1.6]
          return (
            <mesh key={it.id} position={[it.x, groundHeight(it.x, it.z) + h / 2, it.z]} userData={{ item: it }} visible={false}>
              <cylinderGeometry args={[r, r, h, 8]} />
              <meshBasicMaterial />
            </mesh>
          )
        })}
      </group>

      <group>
        {Array.from({ length: EMBER_COUNT }).map((_, i) => (
          <mesh key={`e${i}`} ref={(el) => (embers.current[i] = el)} visible={false}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial color={C.orangeLite} transparent opacity={0} depthWrite={false}
              blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
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
