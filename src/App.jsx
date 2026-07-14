import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './world/Scene'
import Controller from './world/Controller'
import Effects from './effects'
import { Intro, Hud, Prompt, Fade } from './ui'
import { projects, SAHLOKA, ENV } from './data/content'
import { blockers } from './world/layout'
import { initAudio, ping, cheer, whoosh, startAmbient } from './sound.js'
import './styles.css'

// dev-only: expose the r3f state so the offscreen render loop can be driven for testing
function DevHook() {
  const three = useThree()
  useEffect(() => { if (import.meta.env.DEV) window.__three = three }, [three])
  return null
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [near, setNear] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  const flash = (t) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 1500) }

  const interactables = useMemo(() => ([
    ...projects.map((p) => ({ ...p, r: 3.8, type: 'project' })),
    { id: 'sahloka', type: 'sahloka', name: SAHLOKA.name, blurb: SAHLOKA.blurb, link: SAHLOKA.link, x: SAHLOKA.x, z: SAHLOKA.z, r: 16 },
  ]), [])

  const act = () => {
    if (!near) return
    if (near.type === 'sahloka') { try { whoosh() } catch {}; setLeaving(true); setTimeout(() => { window.location.href = near.link }, 1100) }
    else { try { ping() } catch {}; window.open(near.link, '_blank', 'noopener') }
  }

  const enter = () => { try { initAudio(); startAmbient() } catch {}; setEntered(true) }

  // interact + hidden winks (subtle, only if you look): F = SIUUU, Konami = believe it
  useEffect(() => {
    if (!entered) return
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    const seq = []
    const h = (e) => {
      if (e.code === 'KeyE' || e.code === 'Enter') act()
      if (e.code === 'KeyF') { try { cheer() } catch {}; flash('SIUUU') }
      seq.push(e.code); if (seq.length > konami.length) seq.shift()
      if (seq.join() === konami.join()) { try { cheer() } catch {}; flash('believe it') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [entered, near])

  return (
    <>
      <Canvas
        shadows dpr={[1, 2]} camera={{ position: [0, 6, -11], fov: 52, near: 0.1, far: 400 }}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      >
        <color attach="background" args={[ENV.skyBottom]} />
        <fog attach="fog" args={[ENV.fog, 22, 135]} />
        <DevHook />
        <Suspense fallback={null}>
          <Scene />
          <Controller spawn={[0, 0, -2]} blockers={blockers} interactables={interactables} onProximity={setNear} />
          <Effects />
        </Suspense>
      </Canvas>

      {!entered && <Intro onEnter={enter} />}
      {entered && <Hud />}
      {entered && <Prompt near={near} onAct={act} />}
      {toast && <div className="toast">{toast}</div>}
      <Fade on={leaving} />
    </>
  )
}
