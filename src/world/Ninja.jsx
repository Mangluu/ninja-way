import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { C } from '../data/content'
import { toonify, showProps } from '../lib/gltf'
import { Star } from './Shuriken'

const HOODED = `${import.meta.env.BASE_URL}models/ninja_hooded.glb`
const BARE = `${import.meta.env.BASE_URL}models/ninja.glb`
const PROPS = ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']
const SCALE = 0.9
// three strips dots from node names on load, so 'hand.r' arrives as 'handr'
const find = (root, name) => root.getObjectByName(name) || root.getObjectByName(name.replace(/\./g, ''))
const key = (name) => name.replace(/\./g, '')
const FADE = 0.14

// Which clip to play is decided every frame from the controller's state. One-
// shots (throw, interact, pick up, cheer, dash) win while they run; otherwise
// air, then movement, then idle.
function pick(st, playing) {
  if (st.oneShot) return st.oneShot
  if (st.airborne) return st.vy > 0.5 && playing === 'Jump_Start' ? 'Jump_Start' : (st.justJumped ? 'Jump_Start' : 'Jump_Idle')
  if (st.landedAt && performance.now() - st.landedAt < 220 && !st.moving) return 'Jump_Land'
  if (st.moving) return st.sprinting ? 'Running_A' : 'Walking_A'
  return 'Idle'
}

function Rig({ url, state, lit, freed, playerRef }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url, false)
  const { actions, mixer } = useAnimations(animations, group)
  const playing = useRef(null)
  const hand = useMemo(() => new THREE.Vector3(), [])
  const capeMat = useMemo(() => new THREE.MeshToonMaterial({ color: C.orange, emissive: C.orange, emissiveIntensity: 0.25 }), [])
  const naruto = useRef({ k: 0, bones: [] })
  useEffect(() => { if (import.meta.env.DEV) window.__naruto = naruto.current }, [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const tmpQ2 = useMemo(() => new THREE.Quaternion(), [])

  // re-skin once per loaded scene; the file is shared, the swap is in place
  useEffect(() => {
    toonify(scene)
    scene.traverse((o) => { if (o.isMesh && o.name === 'Rogue_Cape') { o.material = capeMat; o.castShadow = true } })
  }, [scene, capeMat])

  // rank dressing: knife at genin, cape at jōnin, an ember glow once freed
  useEffect(() => {
    const show = []
    if (lit >= 1 && lit < 5) show.push('Knife')
    showProps(scene, show, PROPS)
    scene.traverse((o) => { if (o.name === 'Rogue_Cape') o.visible = lit >= 5 })
  }, [scene, lit])
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh || o.material === capeMat) return
      o.material.emissive.set(freed ? C.orange : '#000000')
      o.material.emissiveIntensity = freed ? 0.18 : 0
    })
  }, [scene, freed, capeMat])

  useEffect(() => {
    // one-shots do not loop and hold their last frame until released
    for (const name of ['Throw', 'Interact', 'PickUp', 'Cheer', 'Dodge_Forward', 'Jump_Start', 'Jump_Land']) {
      const a = actions[name]; if (!a) continue
      a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true
    }
    const done = (e) => { const st = state.current; if (st.oneShot && e.action === actions[st.oneShot]) st.oneShot = null }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }, [actions, mixer, state])

  useFrame((_, dt) => {
    const st = state.current
    if (!naruto.current.bones.length && !naruto.current.tried) { naruto.current.tried = true; captureRun() }
    const next = pick(st, playing.current)
    if (next !== playing.current) {
      const from = playing.current && actions[playing.current]
      const to = actions[next]
      if (to) {
        to.reset()
        to.timeScale = next === 'Throw' ? 1.7 : next === 'Interact' || next === 'PickUp' ? 1.35 : next === 'Dodge_Forward' ? 1.2 : 1
        if (from && from !== to) from.fadeOut(FADE)
        to.fadeIn(FADE).play()
        playing.current = next
      }
    }
    // feet keep pace with the ground: scale the cycle to the actual speed
    const walk = actions.Walking_A, run = actions.Running_A
    if (walk) walk.timeScale = THREE.MathUtils.clamp(st.speed / 3.6, 0.6, 1.8)
    if (run) run.timeScale = THREE.MathUtils.clamp(st.speed / 6.5, 0.8, 1.6)
    st.justJumped = false
    // arms back, chest down: the run everyone is here for
    const nr = naruto.current
    const wantK = st.sprinting && !st.airborne ? 1 : 0
    nr.k += (wantK - nr.k) * Math.min(1, dt * 7)
    if (nr.k > 0.01 && nr.bones.length) {
      scene.getWorldQuaternion(tmpQ2).invert()   // world → model space
      for (const { bone, target } of nr.bones) {
        bone.parent.getWorldQuaternion(tmpQ).premultiply(tmpQ2).invert()   // model → parent local
        tmpQ.multiply(target)
        bone.quaternion.slerp(tmpQ, nr.k)
      }
    }
    // the throwing hand, in world space, for the star to leave from
    if (playerRef && st.handBone) { st.handBone.getWorldPosition(hand); playerRef.current.hand = hand }
    // a held crouch: pause the pick-up at its lowest point until let go
    const pickUp = actions.PickUp
    if (pickUp && st.oneShot === 'PickUp') {
      if (st.hold && pickUp.time > 0.5 && !pickUp.paused) pickUp.paused = true
      if (!st.hold && pickUp.paused) pickUp.paused = false
    } else if (pickUp && pickUp.paused) pickUp.paused = false
    if (st.riceInHand) st.riceInHand.visible = !!st.showRice
    // show a star in hand while the arm winds up
    if (st.starInHand) st.starInHand.visible = playing.current === 'Throw' && (actions.Throw?.time || 0) < 0.42
  })

  // The Naruto run. On the first frame, before any clip has moved him, read
  // where each arm and the chest rest, and work out the rotation that takes
  // them to pinned straight back and leaning in. Applied over the run cycle
  // every frame while sprinting, so the legs keep running and the arms stop
  // swinging.
  const captureRun = () => {
    const names = ['upperarm.l', 'lowerarm.l', 'hand.l', 'upperarm.r', 'lowerarm.r', 'hand.r', 'chest', 'head']
    const bones = Object.fromEntries(names.map((n) => [n, find(scene, n)]))
    if (!bones['upperarm.l'] || !bones.chest || !bones.head) return
    scene.updateWorldMatrix(true, true)
    const inv = scene.getWorldQuaternion(new THREE.Quaternion()).invert()
    const q = (b) => b.getWorldQuaternion(new THREE.Quaternion()).premultiply(inv)          // model-space orientation
    const p = (b) => scene.worldToLocal(b.getWorldPosition(new THREE.Vector3()))            // model-space position
    const dir = (a, b) => p(bones[b]).sub(p(bones[a])).normalize()
    const aim = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize())
    const out = []
    const Rl = aim(dir('upperarm.l', 'lowerarm.l'), new THREE.Vector3(0.3, -0.22, -0.93))
    const Rr = aim(dir('upperarm.r', 'lowerarm.r'), new THREE.Vector3(-0.3, -0.22, -0.93))
    const Rc = aim(dir('chest', 'head'), new THREE.Vector3(0, 0.82, 0.57))
    const Rh = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35)   // eyes back up the road
    out.push({ bone: bones['upperarm.l'], target: Rl.clone().multiply(q(bones['upperarm.l'])) })
    out.push({ bone: bones['lowerarm.l'], target: Rl.clone().multiply(q(bones['lowerarm.l'])) })
    out.push({ bone: bones['upperarm.r'], target: Rr.clone().multiply(q(bones['upperarm.r'])) })
    out.push({ bone: bones['lowerarm.r'], target: Rr.clone().multiply(q(bones['lowerarm.r'])) })
    out.push({ bone: bones.chest, target: Rc.clone().multiply(q(bones.chest)) })
    out.push({ bone: bones.head, target: Rh.clone().multiply(Rc).multiply(q(bones.head)) })
    naruto.current.bones = out
  }

  // find the hand bone once and hang a star holder on it
  useEffect(() => {
    const st = state.current
    st.handBone = find(scene, 'handslot.r') || find(scene, 'hand.r')
    if (st.handBone && !st.handBone.getObjectByName('starInHand')) {
      const holder = new THREE.Group(); holder.name = 'starInHand'; holder.visible = false
      holder.rotation.set(Math.PI / 2, 0, 0)
      st.handBone.add(holder)
      st.starInHand = holder
    } else if (st.handBone) st.starInHand = st.handBone.getObjectByName('starInHand')
    if (st.handBone && !st.handBone.getObjectByName('riceInHand')) {
      const rice = new THREE.Group(); rice.name = 'riceInHand'; rice.visible = false
      rice.position.set(0, 0.12, 0.1); rice.rotation.set(Math.PI / 2, 0, 0)
      const ball = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.27, 3), new THREE.MeshToonMaterial({ color: '#fbf7ee' }))
      ball.scale.set(1, 1, 0.62); ball.castShadow = true
      const nori = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.1, 3), new THREE.MeshToonMaterial({ color: C.sumi }))
      nori.position.set(0, -0.08, 0.06); nori.scale.set(1.02, 1, 0.64)
      rice.add(ball); rice.add(nori)
      st.handBone.add(rice)
      st.riceInHand = rice
    } else if (st.handBone) st.riceInHand = st.handBone.getObjectByName('riceInHand')
  }, [scene, state])

  return (
    <group ref={group} scale={SCALE}>
      <primitive object={scene} />
    </group>
  )
}

// The star that sits in the hand is a portal-less clone of the projectile
// mesh; it is parented to the bone in the effect above, so it renders here
// only to be adopted.
function StarInHand({ state }) {
  const ref = useRef()
  useEffect(() => {
    const st = state.current
    const tryAdopt = () => { if (st.starInHand && ref.current && ref.current.parent !== st.starInHand) st.starInHand.add(ref.current) }
    const id = setInterval(tryAdopt, 200)
    return () => clearInterval(id)
  }, [state])
  return <group ref={ref} scale={0.9}><Star /></group>
}

export default function Ninja({ state, lit = 0, freed = false, playerRef }) {
  const url = lit >= 3 ? BARE : HOODED
  return (
    <>
      <Rig key={url} url={url} state={state} lit={lit} freed={freed} playerRef={playerRef} />
      <StarInHand state={state} />
    </>
  )
}

useGLTF.preload(HOODED, false)
