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

  useFrame(() => {
    const st = state.current
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
    // the throwing hand, in world space, for the star to leave from
    if (playerRef && st.handBone) { st.handBone.getWorldPosition(hand); playerRef.current.hand = hand }
    // show a star in hand while the arm winds up
    if (st.starInHand) st.starInHand.visible = playing.current === 'Throw' && (actions.Throw?.time || 0) < 0.42
  })

  // find the hand bone once and hang a star holder on it
  useEffect(() => {
    const st = state.current
    st.handBone = scene.getObjectByName('handslot.r') || scene.getObjectByName('hand.r')
    if (st.handBone && !st.handBone.getObjectByName('starInHand')) {
      const holder = new THREE.Group(); holder.name = 'starInHand'; holder.visible = false
      holder.rotation.set(Math.PI / 2, 0, 0)
      st.handBone.add(holder)
      st.starInHand = holder
    } else if (st.handBone) st.starInHand = st.handBone.getObjectByName('starInHand')
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
