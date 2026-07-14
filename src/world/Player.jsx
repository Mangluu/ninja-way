import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shrines, sagas, PATH } from '../data/content.js'

const EYE = 1.7
const SPEED = 14
const SPRINT = 1.9
const ACTIVATE = 5.5
const SENS = 0.0026

// First-person controller: WASD/arrows to move, DRAG to look (no Pointer Lock —
// works in every browser and never drifts). Reports nearest shrine / saga /
// progress to <App>, and fires onSnap() the first time you cross THE SNAP gate.
export default function Player({ zRef, report, onOpen, onSnap }) {
  const { camera, gl } = useThree()
  const keys = useRef({})
  const rot = useRef({ yaw: Math.PI, pitch: 0 }) // yaw=π → face +Z into the scene
  const drag = useRef({ on: false, x: 0, y: 0 })
  const nearest = useRef(null)
  const snapped = useRef(false)
  const last = useRef({ nearId: null, sagaIndex: -1, prog: -1 })
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const move = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    camera.position.set(0, EYE, PATH.zStart)
    if (import.meta.env.DEV) window.__cam = camera // dev-only teleport hook
    const el = gl.domElement
    el.style.cursor = 'grab'

    const kd = (e) => { keys.current[e.code] = true }
    const ku = (e) => {
      keys.current[e.code] = false
      if ((e.code === 'KeyE' || e.code === 'Enter') && nearest.current) onOpen(nearest.current)
    }
    const pd = (e) => { drag.current = { on: true, x: e.clientX, y: e.clientY }; el.style.cursor = 'grabbing' }
    const pm = (e) => {
      if (!drag.current.on) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      rot.current.yaw -= dx * SENS
      rot.current.pitch = THREE.MathUtils.clamp(rot.current.pitch - dy * SENS, -1.15, 1.15)
    }
    const pu = () => { drag.current.on = false; el.style.cursor = 'grab' }
    const wheel = (e) => {
      camera.getWorldDirection(fwd)
      fwd.y = 0
      fwd.normalize()
      camera.position.addScaledVector(fwd, e.deltaY > 0 ? 2.5 : -2.5)
    }

    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      el.removeEventListener('wheel', wheel)
    }
  }, [camera, gl, fwd, onOpen])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const k = keys.current

    camera.rotation.set(rot.current.pitch, rot.current.yaw, 0, 'YXZ')
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    right.crossVectors(fwd, camera.up).normalize()

    move.set(0, 0, 0)
    if (k.KeyW || k.ArrowUp) move.add(fwd)
    if (k.KeyS || k.ArrowDown) move.sub(fwd)
    if (k.KeyD || k.ArrowRight) move.add(right)
    if (k.KeyA || k.ArrowLeft) move.sub(right)
    if (move.lengthSq() > 0) {
      move.normalize()
      camera.position.addScaledVector(move, SPEED * (k.ShiftLeft || k.ShiftRight ? SPRINT : 1) * dt)
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -PATH.halfWidth, PATH.halfWidth)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, PATH.zStart, PATH.zEnd)
    camera.position.y = EYE

    const z = camera.position.z
    zRef.current = z

    if (!snapped.current && z >= sagas[1].z) {
      snapped.current = true
      onSnap()
    }

    let nid = null
    let nd = Infinity
    let ns = null
    for (const s of shrines) {
      const reach = s.big ? 11 : ACTIVATE
      const d = Math.hypot(s.x - camera.position.x, s.z - z)
      if (d < reach && d < nd) { nd = d; nid = s.id; ns = s }
    }
    nearest.current = ns

    let si = 0
    for (let i = 0; i < sagas.length; i++) if (z >= sagas[i].z - 22) si = i

    const prog = Math.round(((z - PATH.zStart) / (PATH.zEnd - PATH.zStart)) * 100)
    if (nid !== last.current.nearId || si !== last.current.sagaIndex || prog !== last.current.prog) {
      last.current = { nearId: nid, sagaIndex: si, prog }
      report({ nearId: nid, sagaIndex: si, prog })
    }
  })

  return null
}
