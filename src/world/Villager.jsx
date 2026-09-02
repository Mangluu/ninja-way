import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Html } from '@react-three/drei'
import * as THREE from 'three'
import { toonify, showProps } from '../lib/gltf'
import { groundHeight } from './layout'

// Three villagers from the same pack as the ninja, each dressed and posed as
// their part: the cook with his mug by the fire, the rival bare-fisted in the
// square, the sensei sat under a tree with a book. When they speak, the line
// hangs over their head in the world rather than covering the screen.

const M = `${import.meta.env.BASE_URL}models/`
const KINDS = {
  cook: {
    url: `${M}cook.glb`, idle: 'Idle', talk: 'Cheer', fidget: 'Use_Item', turns: true, bubble: 2.9,
    show: ['Mug', 'Barbarian_Hat'], hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Barbarian_Cape'],
  },
  rival: {
    url: `${M}rival.glb`, idle: 'Unarmed_Idle', talk: 'Unarmed_Melee_Attack_Punch_A', hit: 'Hit_A', turns: true, bubble: 2.9,
    show: ['Knight_Cape'], hide: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet'],
  },
  sensei: {
    url: `${M}sensei.glb`, idle: 'Sit_Floor_Idle', talk: 'Spellcast_Long', turns: false, bubble: 2.1,
    show: ['Spellbook_open', 'Mage_Hat'], hide: ['Spellbook', '1H_Wand', '2H_Staff', 'Mage_Cape'],
  },
}
const SCALE = 0.9
const BUBBLE_MS = 7500
const TAU = Math.PI * 2
const shortAngle = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d }

export default function Villager({ kind = 'cook', name, anchor = [0, 0], facing = 0, playerRef, say, hitAt = 0 }) {
  const cfg = KINDS[kind] || KINDS.cook
  const rig = useRef(), inner = useRef()
  const { scene, animations } = useGLTF(cfg.url, false)
  const { actions, mixer } = useAnimations(animations, inner)
  const playing = useRef(null)
  const yaw = useRef(facing)
  const busyUntil = useRef(0)
  const nextFidget = useRef(performance.now() + 4000 + Math.random() * 6000)
  const [shown, setShown] = useState(false)
  const lastSay = useRef(0), lastHit = useRef(0)
  const y = useMemo(() => groundHeight(anchor[0], anchor[1]), [anchor])

  useEffect(() => { toonify(scene); showProps(scene, cfg.show, [...cfg.show, ...cfg.hide]) }, [scene, cfg])

  useEffect(() => {
    for (const n of [cfg.talk, cfg.fidget, cfg.hit]) {
      const a = n && actions[n]; if (!a) continue
      a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false
    }
    const done = () => { busyUntil.current = 0 }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }, [actions, mixer, cfg])

  // the bubble shows for a while after each new line
  useEffect(() => {
    if (!say || say.at === lastSay.current) return
    lastSay.current = say.at
    setShown(true)
    const t = setTimeout(() => setShown(false), BUBBLE_MS)
    return () => clearTimeout(t)
  }, [say])

  const play = (name, once = false) => {
    const a = actions[name]; if (!a) return
    if (playing.current === name && !once) return
    const from = playing.current && actions[playing.current]
    a.reset()
    if (from && from !== a) from.fadeOut(0.2)
    a.fadeIn(0.2).play()
    playing.current = name
    if (once) busyUntil.current = performance.now() + a.getClip().duration * 1000
  }

  useFrame((_, dt) => {
    const now = performance.now()
    // react: a fresh line, a shuriken, or an idle fidget
    if (say && say.at !== (rig.current?.userData.saidAt || 0)) { rig.current.userData.saidAt = say.at; play(cfg.talk, true) }
    if (cfg.hit && hitAt && hitAt !== lastHit.current) { lastHit.current = hitAt; play(cfg.hit, true) }
    if (cfg.fidget && now > nextFidget.current && now > busyUntil.current) { nextFidget.current = now + 7000 + Math.random() * 8000; play(cfg.fidget, true) }
    if (now > busyUntil.current && playing.current !== cfg.idle) play(cfg.idle)

    // turn to face whoever comes close, then drift back
    if (rig.current) {
      let want = facing
      const p = playerRef?.current
      if (cfg.turns && p) {
        const dx = p.x - anchor[0], dz = p.z - anchor[1]
        if (Math.hypot(dx, dz) < 9) want = Math.atan2(dx, dz)
      }
      yaw.current += shortAngle(yaw.current, want) * Math.min(1, dt * 3)
      rig.current.rotation.y = yaw.current
    }
  })

  return (
    <group ref={rig} position={[anchor[0], y, anchor[1]]} rotation={[0, facing, 0]}>
      <group ref={inner} scale={SCALE}>
        <primitive object={scene} />
      </group>
      {shown && say && (
        <Html position={[0, cfg.bubble, 0]} center distanceFactor={11} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
          <div className="bubble">
            <div className="bubble-who">{name}</div>
            <div className="bubble-line">“{say.line}”</div>
          </div>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload(KINDS.cook.url, false)
useGLTF.preload(KINDS.rival.url, false)
useGLTF.preload(KINDS.sensei.url, false)
