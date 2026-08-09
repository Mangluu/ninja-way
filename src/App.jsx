import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import Scene from './world/Scene'
import Controller from './world/Controller'
import Effects from './effects'
import { Intro, Hud, Prompt, Fade } from './ui'
import { projects, SAHLOKA, ENV } from './data/content'
import { blockers, pathLanterns, scrolls, bell } from './world/layout'
import { initAudio, ping, cheer, whoosh, startAmbient, setMuted, lightUp, bellRing, collect } from './sound.js'
import { startMusic, setMusicIntensity } from './music.js'
import './styles.css'

// The score follows the climb: quiet in the village, full arrangement at the gate.
// Lighting lanterns lifts it too, so the world answers what you do.
function MusicDirector({ lit, total }) {
  const { camera } = useThree()
  const tick = useRef(0)
  useFrame(() => {
    if (tick.current++ % 20) return
    const d = Math.hypot(camera.position.x - SAHLOKA.x, camera.position.z - SAHLOKA.z)
    const climb = THREE.MathUtils.clamp(1 - (d - 14) / 62, 0, 1)   // 0 at the gate mouth, 1 at the summit
    const warmth = total ? (lit / total) * 0.3 : 0
    setMusicIntensity(Math.min(1, climb + warmth))
  })
  return null
}

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
  const [muted, setMutedState] = useState(false)
  const [lit, setLit] = useState(() => new Set())
  const [found, setFound] = useState(() => new Set())
  const [photo, setPhoto] = useState(false)
  const [raining, setRaining] = useState(false)
  const [rungAt, setRungAt] = useState(0)
  const toastTimer = useRef()

  const flash = (t) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600) }

  const toggleMute = () => setMutedState((m) => { const next = !m; try { setMuted(next) } catch {} ; return next })

  // Lanterns and scrolls drop out of the list once dealt with, so the prompt
  // never offers something that has already been done.
  const interactables = useMemo(() => ([
    ...projects.map((p) => ({ ...p, r: 3.8, type: 'project' })),
    ...pathLanterns.filter((l) => !lit.has(l.id)).map((l) => ({
      id: l.id, type: 'lantern', name: 'Stone lantern', tag: 'UNLIT',
      blurb: 'Cold and dark. Light it, and the village warms a little.',
      cta: 'Light it', x: l.x, z: l.z, r: 2.8,
    })),
    ...scrolls.filter((s) => !found.has(s.id)).map((s) => ({
      id: s.id, type: 'scroll', name: 'A hidden scroll', tag: 'FOUND SOMETHING',
      blurb: 'Someone left this here.', note: s.note,
      cta: 'Read it', x: s.x, z: s.z, r: 2.8,
    })),
    { id: 'bell', type: 'bell', name: 'Shrine bell', tag: 'SUZU',
      blurb: 'Heavy, cold bronze. It wants to be struck.', cta: 'Ring it', x: bell.x, z: bell.z, r: 3.4 },
    { id: 'sahloka', type: 'sahloka', name: SAHLOKA.name, blurb: SAHLOKA.blurb, link: SAHLOKA.link, x: SAHLOKA.x, z: SAHLOKA.z, r: 16 },
  ]), [lit, found])

  const act = () => {
    if (!near) return
    switch (near.type) {
      case 'lantern':
        setLit((s) => { const n = new Set(s); n.add(near.id); return n })
        try { lightUp() } catch {}
        break
      case 'scroll':
        setFound((s) => { const n = new Set(s); n.add(near.id); return n })
        try { collect() } catch {}
        flash(near.note)
        break
      case 'bell':
        try { bellRing() } catch {}
        setRungAt(performance.now())
        break
      case 'sahloka':
        try { whoosh() } catch {}
        setLeaving(true)
        setTimeout(() => { window.location.href = near.link }, 1100)
        break
      default:
        try { ping() } catch {}
        window.open(near.link, '_blank', 'noopener')
    }
  }

  const enter = () => { try { initAudio(); startAmbient(); startMusic() } catch {}; setEntered(true) }

  useEffect(() => {
    if (!entered) return
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    const seq = []
    const h = (e) => {
      if (e.code === 'KeyE' || e.code === 'Enter') act()
      if (e.code === 'KeyM') toggleMute()
      if (e.code === 'KeyP') setPhoto((p) => !p)
      if (e.code === 'KeyR') setRaining((r) => !r)
      if (e.code === 'Escape') setPhoto(false)
      if (e.code === 'KeyF') { try { cheer() } catch {}; flash('SIUUU') }
      seq.push(e.code); if (seq.length > konami.length) seq.shift()
      if (seq.join() === konami.join()) { try { cheer() } catch {}; flash('believe it') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [entered, near])

  const totals = { lanterns: pathLanterns.length, scrolls: scrolls.length }

  return (
    <>
      <Canvas
        shadows dpr={[1, 2]} performance={{ min: 0.5 }}
        camera={{ position: [0, 6, -11], fov: 52, near: 0.1, far: 400 }}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      >
        <color attach="background" args={[ENV.skyBottom]} />
        <fog attach="fog" args={[ENV.fog, 22, 135]} />
        <DevHook />
        <MusicDirector lit={lit.size} total={pathLanterns.length} />
        {/* drops resolution instead of dropping frames on weaker GPUs */}
        <AdaptiveDpr pixelated={false} />
        <Suspense fallback={null}>
          <Scene lit={lit} found={found} rungAt={rungAt} raining={raining} />
          <Controller spawn={[0, 0, -2]} blockers={blockers} interactables={interactables} onProximity={setNear} />
          <Effects />
        </Suspense>
      </Canvas>

      {!entered && <Intro onEnter={enter} />}
      {entered && !photo && (
        <Hud
          muted={muted} onToggleMute={toggleMute}
          lit={lit.size} lanterns={totals.lanterns}
          found={found.size} scrolls={totals.scrolls}
          raining={raining}
        />
      )}
      {entered && !photo && <Prompt near={near} onAct={act} />}
      {entered && photo && <div className="photo-hint">photo mode · <b>P</b> or <b>Esc</b> to exit</div>}
      {toast && !photo && <div className="toast">{toast}</div>}
      <Fade on={leaving} />
    </>
  )
}
