import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'
import { groundHeight, PICK } from './layout'
import { shing } from '../sound.js'

// Shuriken.
//
// You always know what you are about to hit: a marker floats over the thing
// in front of you that a star would go to, and the HUD names it. F (or the
// button) throws at that; tapping a thing throws at that thing. Nothing is
// picked for you at a distance you cannot see.
//
// The arm winds up first, the star leaves the hand a third of a second later,
// and the next throw waits for the cooldown, so mashing the key produces a
// rhythm of throws rather than a stream of stars that never land.
//
// ponytail: aimed stars fly straight and hit by arrival distance; a free
// throw arcs under gravity and dies where it lands. No ricochets.

const POOL = 6
const SPEED = 32
const AIM_RANGE = 14          // how far the marker will pick a target
const AIM_CONE = 0.5          // radians either side of the camera's forward
const COOLDOWN = 0.5          // seconds between throws
const RELEASE = 0.3           // seconds after the throw starts that the star leaves the hand
export const THROW_RANGE = 16 // a tap on something further than this walks instead
const TAU = Math.PI * 2
const shortAngle = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }

// A four-point star. Also left stuck in a target once it has been hit.
export function Star({ scale = 1, ...p }) {
  return (
    <group scale={scale} {...p}>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} rotation={[0, r, 0]} castShadow>
          <boxGeometry args={[0.52, 0.025, 0.11]} />
          <meshToonMaterial gradientMap={gradientMap} color={C.steel} emissive={C.steel} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.035, 10]} />
        <meshToonMaterial gradientMap={gradientMap} color={C.sumi} />
      </mesh>
    </group>
  )
}

export default function Shuriken({ api, playerRef, state, input, targets = [], aimTypes, onHit, aimLabel }) {
  const { camera } = useThree()
  const meshes = useRef([])
  const sparks = useRef([])
  const marker = useRef()
  const next = useRef(0)
  const lastThrow = useRef(-9)
  const pending = useRef(null)     // { item, heading, at }
  const aim = useRef(null)
  const tick = useRef(0)
  const dir = useMemo(() => new THREE.Vector3(), [])
  const targetsRef = useRef(targets); targetsRef.current = targets
  const onHitRef = useRef(onHit); onHitRef.current = onHit
  const stars = useMemo(() => Array.from({ length: POOL }, () => ({
    live: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), item: null,
    dist: 0, flown: 0, spark: 1, sparkPos: new THREE.Vector3(),
  })), [])

  const free = () => stars.find((s) => !s.live)

  // Start a throw: turn, wind up, and remember to let go in a moment.
  const begin = (item, heading) => {
    const now = performance.now() / 1000
    if (now - lastThrow.current < COOLDOWN || !free()) return false
    lastThrow.current = now
    const p = playerRef.current
    const face = item ? Math.atan2(item.x - p.x, item.z - p.z) : heading
    if (input) input.current.face = face
    if (state) { state.current.oneShot = 'Throw'; state.current.oneShotAt = now }
    pending.current = { item, heading: face, at: now + RELEASE }
    return true
  }

  const launch = ({ item, heading }) => {
    const p = playerRef.current
    const s = free(); if (!s || !p) return
    if (p.hand) s.pos.copy(p.hand); else s.pos.set(p.x, p.y + 1.15, p.z)
    s.item = item
    if (item) {
      const [, h] = PICK[item.type] || [1, 1.5]
      s.vel.set(item.x - s.pos.x, groundHeight(item.x, item.z) + h * 0.6 - s.pos.y, item.z - s.pos.z)
      s.dist = s.vel.length()
      s.vel.normalize().multiplyScalar(SPEED)
    } else {
      s.vel.set(Math.sin(heading) * SPEED * 0.8, 3.5, Math.cos(heading) * SPEED * 0.8)
      s.dist = Infinity
    }
    s.flown = 0
    s.live = true
    try { shing() } catch {}
  }

  useEffect(() => {
    api.current = {
      throwAt: (item) => begin(item, 0),
      throwForward: () => {
        if (aim.current) return begin(aim.current, 0)
        camera.getWorldDirection(dir)
        return begin(null, Math.atan2(dir.x, dir.z))
      },
      aim: () => aim.current,
    }
    return () => { api.current = null }
  }, [camera])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const now = performance.now() / 1000
    const p = playerRef.current

    // what a throw would go to right now: nearest aimable thing inside the
    // cone ahead of the camera
    if (tick.current++ % 3 === 0 && p) {
      camera.getWorldDirection(dir)
      const camYaw = Math.atan2(dir.x, dir.z)
      let best = null, bs = Infinity
      for (const it of targetsRef.current) {
        if (aimTypes && !aimTypes.has(it.type)) continue
        const dx = it.x - p.x, dz = it.z - p.z, d = Math.hypot(dx, dz)
        if (d > AIM_RANGE || d < 0.8) continue
        const off = Math.abs(shortAngle(camYaw, Math.atan2(dx, dz)))
        if (off > AIM_CONE) continue
        const score = d + off * 8
        if (score < bs) { bs = score; best = it }
      }
      if (best !== aim.current) {
        aim.current = best
        if (aimLabel?.current) {
          aimLabel.current.textContent = best ? best.name : ''
          aimLabel.current.parentElement.classList.toggle('on', !!best)
        }
      }
    }
    if (marker.current) {
      const a = aim.current
      marker.current.visible = !!a
      if (a) {
        const [, h] = PICK[a.type] || [1, 1.5]
        marker.current.position.set(a.x, groundHeight(a.x, a.z) + h + 0.45 + Math.sin(now * 5) * 0.08, a.z)
        marker.current.rotation.y = now * 2.2
      }
    }

    // let go once the arm is through the wind-up
    if (pending.current && now >= pending.current.at) { launch(pending.current); pending.current = null }

    for (let i = 0; i < POOL; i++) {
      const s = stars[i], m = meshes.current[i], sp = sparks.current[i]
      if (m) {
        m.visible = s.live
        if (s.live) {
          if (!s.item) s.vel.y -= 14 * dt
          s.pos.addScaledVector(s.vel, dt)
          s.flown += SPEED * dt
          m.position.copy(s.pos)
          m.rotation.y += dt * 28
          let hit = null
          if (s.item) {
            if (s.flown >= s.dist) hit = s.item
          } else {
            for (const it of targetsRef.current) {
              const [r, h] = PICK[it.type] || [1, 1.5]
              const gy = groundHeight(it.x, it.z)
              if (Math.hypot(s.pos.x - it.x, s.pos.z - it.z) < r + 0.2 && s.pos.y > gy - 0.2 && s.pos.y < gy + h + 0.4) { hit = it; break }
            }
            if (!hit && s.pos.y <= groundHeight(s.pos.x, s.pos.z) + 0.05) { s.live = false; s.spark = 0; s.sparkPos.copy(s.pos) }
          }
          if (hit) {
            s.live = false
            s.spark = 0
            s.sparkPos.copy(s.pos)
            onHitRef.current && onHitRef.current(hit)
          }
        }
      }
      if (sp) {
        if (s.spark >= 1) { sp.visible = false; continue }
        s.spark = Math.min(1, s.spark + dt * 4)
        sp.visible = true
        sp.position.copy(s.sparkPos)
        sp.scale.setScalar(0.25 + s.spark * 1.1)
        sp.material.opacity = (1 - s.spark) * 0.9
      }
    }
  })

  return (
    <group>
      {stars.map((_, i) => (
        <group key={`s${i}`} ref={(el) => (meshes.current[i] = el)} visible={false}>
          <Star />
        </group>
      ))}
      {stars.map((_, i) => (
        <mesh key={`k${i}`} ref={(el) => (sparks.current[i] = el)} visible={false}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={C.goldLite} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* the aim marker: a slow gold ring with a chevron, over whatever F would hit */}
      <group ref={marker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.42, 24]} />
          <meshBasicMaterial color={C.goldLite} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.3, 4]} />
          <meshBasicMaterial color={C.goldLite} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

// A straw target on a post, turned toward the entrance path. Rocks back when
// struck and keeps the star that did it.
export function Target({ position = [0, 0, 0], hit = false, hitAt = 0 }) {
  const board = useRef()
  const face = Math.atan2(2 - position[0], 2 - position[2])
  useFrame(() => {
    if (!board.current) return
    let k = 0
    if (hitAt) {
      const dt = (performance.now() - hitAt) / 1000
      if (dt < 1.6) k = Math.sin(dt * 11) * Math.exp(-dt * 3.2) * 0.45
    }
    board.current.rotation.x = -k
  })
  return (
    <group position={position} rotation={[0, face, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.2, 7]} />
        <meshToonMaterial gradientMap={gradientMap} color={C.woodDark} />
      </mesh>
      <group ref={board} position={[0, 1.2, 0]}>
        {[[0.55, C.washi, 0], [0.38, C.vermilion, 0.02], [0.2, C.washi, 0.04], [0.08, C.vermilion, 0.06]].map(([r, col, dz], i) => (
          <mesh key={i} position={[0, 0.35, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow={i === 0}>
            <cylinderGeometry args={[r, r, 0.06, 20]} />
            <meshToonMaterial gradientMap={gradientMap} color={col} emissive={hit ? col : '#000000'} emissiveIntensity={hit ? 0.25 : 0} />
          </mesh>
        ))}
        {hit && <Star position={[0.16, 0.42, 0.11]} rotation={[Math.PI / 2, 0, 0.5]} scale={0.8} />}
      </group>
    </group>
  )
}
