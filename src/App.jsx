import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import Scene from './world/Scene'
import Controller from './world/Controller'
import Shuriken, { THROW_RANGE } from './world/Shuriken'
import Effects from './effects'
import { Intro, Hud, Prompt, Fade, TitleCard, Flash, Journal, ScrollCard, TouchControls } from './ui'
import { projects, SAHLOKA, ENV, WORLD, rankFor, VILLAGER_LINES, senseiProgress, QUESTS, questProgress, completion } from './data/content'
import { blockers, gateBlockers, pathLanterns, scrolls, bell, taiko, sakura, villagers, targets, crateStacks, HILL } from './world/layout'
import { buildNav } from './world/nav'
import { initAudio, ping, cheer, whoosh, startAmbient, setMuted, lightUp, bellRing, collect, taikoHit, rustle, startBreathing, foxRoar, gateCatch, crateHit } from './sound.js'
import { startMusic, setMusicIntensity } from './music.js'
import { loadSave, persistSave, clearSave } from './save.js'
import './styles.css'

// What a star can set off. Scrolls are picked up by hand; people are walked
// to (the rival will take a star, and has words about it).
const THROWABLE = new Set(['lantern', 'bell', 'taiko', 'tree', 'target', 'crate', 'project', 'villager'])
// What the aim marker will choose on its own: things that visibly react.
const AIM_TYPES = new Set(['lantern', 'bell', 'taiko', 'tree', 'target', 'crate'])
const RIVAL_HIT = ['Oi.', 'Cute.', 'You will need more than that.', 'Was that meant to hit?']
const isTouch = () => (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window
const nowS = () => performance.now() / 1000

// The score follows the climb: quiet in the village, full arrangement at the
// gate. Lighting lanterns lifts it too, so the world answers what you do.
function MusicDirector({ lit, total, freed }) {
  const { camera } = useThree()
  const tick = useRef(0)
  useFrame(() => {
    if (tick.current++ % 20) return
    const d = Math.hypot(camera.position.x - SAHLOKA.x, camera.position.z - SAHLOKA.z)
    const climb = THREE.MathUtils.clamp(1 - (d - HILL.rBot) / 95, 0, 1)
    const warmth = total ? (lit / total) * 0.3 : 0
    setMusicIntensity(freed ? 1 : Math.min(1, climb + warmth))
  })
  return null
}

// dev-only: expose the r3f state so the offscreen render loop can be driven for testing
function DevHook() {
  const three = useThree()
  useEffect(() => { if (import.meta.env.DEV) window.__three = three }, [three])
  return null
}

// Points the HUD compass at the nearest thing still to do. Writes straight to
// the DOM every few frames rather than through React state.
function ObjectiveTracker({ objectives, playerRef, compass }) {
  const { camera } = useThree()
  const tick = useRef(0)
  const dir = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (tick.current++ % 6) return
    const el = compass.current
    if (!el.arrow || !el.label) return
    const p = playerRef.current
    let best = null, bd = Infinity
    for (const o of objectives) {
      const d = Math.hypot(o.x - p.x, o.z - p.z)
      if (d < bd) { bd = d; best = o }
    }
    if (!best) { el.arrow.style.opacity = 0; el.label.textContent = 'Nothing left to find. Village complete.'; return }
    camera.getWorldDirection(dir)
    const bearing = Math.atan2(best.x - p.x, best.z - p.z) - Math.atan2(dir.x, dir.z)
    el.arrow.style.opacity = 1
    el.arrow.style.transform = `rotate(${-bearing}rad)`
    el.label.textContent = `${best.name} · ${Math.round(bd)} m`
  })
  return null
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [near, setNear] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [notice, setNotice] = useState(null)
  const [muted, setMutedState] = useState(false)
  const [save, setSave] = useState(loadSave)
  const [photo, setPhoto] = useState(false)
  const [raining, setRaining] = useState(false)
  const [rungAt, setRungAt] = useState(0)
  const [taikoAt, setTaikoAt] = useState(0)
  const [shaken, setShaken] = useState({})
  const [struck, setStruck] = useState({})
  const [bubbles, setBubbles] = useState({})       // { kind: { line, at } } — what each villager is saying
  const [card, setCard] = useState(null)           // an unrolled scroll, at the edge of the screen
  const [rivalHitAt, setRivalHitAt] = useState(0)
  const [journal, setJournal] = useState(false)
  // A returning Kage picks up where the seal broke, without replaying it.
  const [sealBroken, setSealBroken] = useState(() => save.lit.size >= 6)
  const [sealNow, setSealNow] = useState(false)
  const [freed, setFreed] = useState(() => save.lit.size >= 6)
  const [crowned, setCrowned] = useState(false)
  const touch = useMemo(isTouch, [])
  const heard = useRef({})
  const toastTimer = useRef(), noticeTimer = useRef(), cardTimer = useRef()
  const saveRef = useRef(save); saveRef.current = save
  const playerRef = useRef({ x: 0, y: 0, z: -2, speed: 0, facing: 0 })
  const input = useRef({ joy: { x: 0, y: 0 }, jump: false, dash: false, face: null, walkTo: null })
  // the character's animation state, shared by the controller, the rig and the app
  const anim = useRef({ moving: false, speed: 0, sprinting: false, airborne: false, vy: 0, landedAt: 0, oneShot: null, oneShotAt: 0, justJumped: false })
  const shuriken = useRef(null)
  const cratesApi = useRef(null)
  const compass = useRef({ arrow: null, label: null })
  const aimLabel = useRef(null)
  const lit = save.lit, found = save.found

  const mark = useCallback((key, id) => setSave((s) => {
    if (s[key].has(id)) return s
    return { ...s, [key]: new Set(s[key]).add(id) }
  }), [])
  useEffect(() => { persistSave(save) }, [save])
  // dev-only: the offscreen test loop drives the game through these
  useEffect(() => { if (import.meta.env.DEV) window.__game = { anim, input, shuriken, playerRef, cratesApi, saveRef } }, [])
  useEffect(() => { document.body.classList.toggle('touch', touch) }, [touch])

  // project pedestals are solid too
  const allBlockers = useMemo(() => ([
    ...blockers,
    ...gateBlockers,
    ...projects.map((p) => ({ x: p.x, z: p.z, r: 0.6 })),
  ]), [])
  const nav = useMemo(() => buildNav(allBlockers, WORLD), [allBlockers])
  // canopies the camera should not sit inside
  const camObstacles = useMemo(() => sakura.map((t) => ({ x: t.x, z: t.z, r: 0.42 * t.s })), [])

  const flash = (t) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600) }
  const note = (t) => { setNotice(t); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(null), 4200) }
  const showCard = (c) => { setCard(c); clearTimeout(cardTimer.current); cardTimer.current = setTimeout(() => setCard(null), 9000) }
  const toggleMute = () => setMutedState((m) => { const next = !m; try { setMuted(next) } catch {} ; return next })

  // Start a short animation and do the thing when the hand gets there.
  const reach = (kind, ms, fn) => {
    anim.current.oneShot = kind
    anim.current.oneShotAt = nowS()
    setTimeout(fn, ms)
  }

  // Lanterns, scrolls and targets drop out of the list once dealt with, so the
  // prompt never offers something that has already been done. Crates have no
  // prompt radius: they are only ever thrown at or run through.
  const interactables = useMemo(() => ([
    ...projects.map((p) => ({ ...p, r: 3.8, type: 'project' })),
    ...pathLanterns.filter((l) => !lit.has(l.id)).map((l) => ({
      id: l.id, type: 'lantern', name: 'Stone lantern', tag: 'UNLIT',
      blurb: 'Cold and dark. Light it, and the village warms a little.',
      cta: 'Light it', x: l.x, z: l.z, r: 2.8,
    })),
    ...scrolls.filter((s) => !found.has(s.id)).map((s) => ({
      id: s.id, type: 'scroll', name: 'A hidden scroll', tag: 'FOUND SOMETHING',
      blurb: 'Tied with a red cord, and clearly meant to be found.', note: s.note,
      cta: 'Pick it up', x: s.x, z: s.z, r: 2.8,
    })),
    ...targets.filter((t) => !save.hit.has(t.id)).map((t) => ({
      id: t.id, type: 'target', name: 'Training target', tag: 'TRAINING GROUND',
      blurb: 'Straw over wood, turned toward the path. Put a star in it.',
      cta: 'Throw a shuriken', x: t.x, z: t.z, r: 3.2,
    })),
    ...crateStacks.map((c, i) => ({ id: `crate-${i}`, type: 'crate', name: 'Crate stack', x: c.x, z: c.z, r: 0 })),
    ...villagers.map((v) => ({
      id: v.id, type: 'villager', kind: v.kind, name: v.name, tag: 'SOMEONE HERE',
      blurb: v.kind === 'sensei' ? 'Reading. Or pretending to.' : 'Looks like they have something to say.',
      cta: 'Listen', x: v.x, z: v.z, r: 4.2,
    })),
    { id: 'taiko', type: 'taiko', name: 'The great drum', tag: 'TAIKO',
      blurb: 'Hide stretched over a barrel the size of a person. Hit it.', cta: 'Strike it', x: taiko.x, z: taiko.z, r: 3.2 },
    ...sakura.map((t, i) => ({
      id: `tree-${i}`, type: 'tree', name: 'Cherry tree', tag: 'IN BLOSSOM',
      blurb: 'Heavy with blossom. A good shake would bring it down.', cta: 'Shake it', x: t.x, z: t.z, r: 3.2,
    })),
    { id: 'bell', type: 'bell', name: 'Shrine bell', tag: 'SUZU',
      blurb: 'Heavy, cold bronze. It wants to be struck.', cta: 'Ring it', x: bell.x, z: bell.z, r: 3.4 },
    { id: 'sahloka', type: 'sahloka', name: SAHLOKA.name, blurb: SAHLOKA.blurb, link: SAHLOKA.link, x: SAHLOKA.x, z: SAHLOKA.z, r: 18 },
  ]), [lit, found, save.hit])
  const throwables = useMemo(() => interactables.filter((i) => THROWABLE.has(i.type) && (i.type !== 'villager' || i.kind === 'rival')), [interactables])

  // What the compass can point at: everything not yet done, with a name.
  const objectives = useMemo(() => {
    const o = []
    projects.forEach((p) => { if (!save.seen.has(p.id)) o.push({ name: p.name, x: p.x, z: p.z }) })
    pathLanterns.forEach((l) => { if (!save.lit.has(l.id)) o.push({ name: 'Stone lantern', x: l.x, z: l.z }) })
    scrolls.forEach((s) => { if (!save.found.has(s.id)) o.push({ name: 'Hidden scroll', x: s.x, z: s.z }) })
    villagers.forEach((v) => { if (!save.heard.has(v.kind)) o.push({ name: v.name, x: v.x, z: v.z }) })
    targets.forEach((t) => { if (!save.hit.has(t.id)) o.push({ name: 'Training target', x: t.x, z: t.z }) })
    if (!save.done.has('bell')) o.push({ name: 'Shrine bell', x: bell.x, z: bell.z })
    if (!save.done.has('taiko')) o.push({ name: 'Great drum', x: taiko.x, z: taiko.z })
    if (!save.done.has('tree')) sakura.forEach((t) => o.push({ name: 'Cherry tree', x: t.x, z: t.z }))
    if (!save.done.has('crates')) crateStacks.forEach((c) => o.push({ name: 'Crate stack', x: c.x, z: c.z }))
    if (!save.done.has('summit')) o.push({ name: 'The summit', x: SAHLOKA.x, z: SAHLOKA.z })
    return o
  }, [save])

  const lightLantern = (item) => {
    const s = saveRef.current
    if (s.lit.has(item.id)) return
    const n = s.lit.size + 1
    const before = rankFor(n - 1), after = rankFor(n)
    if (after.name !== before.name) setTimeout(() => { try { cheer() } catch {} ; flash(after.name) }, 260)
    if (n === 3) setTimeout(() => { try { startBreathing() } catch {} }, 1400)
    if (n === 5) setTimeout(() => { try { bellRing(0.8) } catch {} ; setRungAt(performance.now()) }, 2200)
    if (n === 6) {
      setSealBroken(true); setSealNow(true)
      for (let i = 0; i < 7; i++) setTimeout(() => { try { gateCatch(i) } catch {} }, 1100 + i * 260)
      setTimeout(() => { try { foxRoar() } catch {} }, 2700)
      setTimeout(() => setFreed(true), 4000)
      setTimeout(() => setCrowned(true), 7400)
    }
    mark('lit', item.id)
    try { lightUp() } catch {}
  }

  const say = (kind, line) => setBubbles((b) => ({ ...b, [kind]: { line, at: performance.now() } }))

  // One function for every interaction, whether you pressed E next to the
  // thing (via 'act', with a reach animation first) or hit it with a star
  // (via 'throw', immediately).
  const perform = (item, via = 'act') => {
    if (!item) return
    const s = saveRef.current
    const byHand = via === 'act'
    switch (item.type) {
      case 'lantern':
        if (byHand) reach('Interact', 380, () => lightLantern(item)); else lightLantern(item)
        break
      case 'scroll':
        if (!byHand) break
        reach('PickUp', 520, () => {
          mark('found', item.id)
          try { collect() } catch {}
          showCard({ note: item.note, at: performance.now() })
        })
        break
      case 'villager': {
        if (!byHand) {
          if (item.kind === 'rival') { setRivalHitAt(performance.now()); say('rival', RIVAL_HIT[Math.floor(Math.random() * RIVAL_HIT.length)]) }
          break
        }
        // the sensei reads the room; the others work through their own lines
        let line
        if (item.kind === 'sensei') {
          const i = heard.current.sensei || 0
          line = i === 0 ? senseiProgress(s.lit.size) : VILLAGER_LINES.sensei[(i - 1) % VILLAGER_LINES.sensei.length]
          heard.current.sensei = i + 1
        } else {
          const pool = VILLAGER_LINES[item.kind] || []
          const i = heard.current[item.kind] || 0
          line = pool[i % pool.length]
          heard.current[item.kind] = i + 1
        }
        reach('Interact', 220, () => { try { ping() } catch {} ; mark('heard', item.kind); say(item.kind, line) })
        break
      }
      case 'taiko': {
        const hit = () => { try { taikoHit(byHand ? 1.1 : 0.9) } catch {} ; setTaikoAt(performance.now()); mark('done', 'taiko') }
        if (byHand) reach('Interact', 300, hit); else hit()
        break
      }
      case 'tree': {
        const shake = () => { try { rustle() } catch {} ; setShaken((m) => ({ ...m, [item.id]: performance.now() })); mark('done', 'tree') }
        if (byHand) reach('Interact', 320, shake); else shake()
        break
      }
      case 'bell': {
        const ring = () => { try { bellRing(byHand ? 1 : 0.85) } catch {} ; setRungAt(performance.now()); mark('done', 'bell') }
        if (byHand) reach('Interact', 300, ring); else ring()
        break
      }
      case 'target':
        if (!byHand) {
          try { crateHit(0.9) } catch {}
          setStruck((m) => ({ ...m, [item.id]: performance.now() }))
          mark('hit', item.id)
        } else if (shuriken.current) shuriken.current.throwAt(item)
        break
      case 'crate':
        if (!byHand && cratesApi.current) cratesApi.current.hit(item.x, item.z, 1)
        break
      case 'sahloka':
        if (!byHand) break
        try { whoosh() } catch {}
        setLeaving(true)
        setTimeout(() => { window.location.href = item.link }, 1100)
        break
      case 'project':
        mark('seen', item.id)
        try { ping() } catch {}
        if (!byHand) note(`${item.name} · discovered`)
        else window.open(item.link, '_blank', 'noopener')   // a link only ever opens on a deliberate press
        break
      default:
        break
    }
  }
  const act = () => { if (near && !anim.current.oneShot) perform(near, 'act') }

  // A tap on a thing: throw at it if a star can reach, otherwise walk over.
  // A project you have already found is walked to, so the card comes up.
  const onTap = (item, dist) => {
    const s = saveRef.current
    const known = item.type === 'project' && s.seen.has(item.id)
    const canThrow = THROWABLE.has(item.type) && (item.type !== 'villager' || item.kind === 'rival') && !known
    if (canThrow && dist <= THROW_RANGE && shuriken.current && shuriken.current.throwAt(item)) return
    if (item.type === 'crate') return
    if (input.current.walkTo) input.current.walkTo(item.x, item.z, item.type === 'sahloka' ? 7 : 1.7)
  }

  // Standing next to a project counts as finding it; standing at the gate
  // counts as the climb.
  useEffect(() => {
    if (!near) return
    if (near.type === 'project') mark('seen', near.id)
    if (near.type === 'sahloka') mark('done', 'summit')
  }, [near, mark])

  // Quest completion: a cheer, a notice, and the village complete card when
  // the last one lands. Skips the mount, so a restored save is quiet.
  const doneBefore = useRef(null)
  useEffect(() => {
    const now = new Set(QUESTS.filter((q) => questProgress(save, q) >= (q.total || 1)).map((q) => q.name))
    if (doneBefore.current) {
      const fresh = [...now].filter((n) => !doneBefore.current.has(n))
      if (fresh.length) {
        try { cheer() } catch {}
        note(`Quest complete · ${fresh[0]}`)
        if (!anim.current.oneShot && playerRef.current.grounded !== false) { anim.current.oneShot = 'Cheer'; anim.current.oneShotAt = nowS() }
        if (now.size === QUESTS.length) setTimeout(() => { try { bellRing(); cheer() } catch {} ; flash('Village complete') }, 900)
      }
    }
    doneBefore.current = now
  }, [save])

  const enter = () => {
    try {
      initAudio(); startAmbient(); startMusic()
      if (saveRef.current.lit.size >= 3) startBreathing()
    } catch {}
    setEntered(true)
    const s = saveRef.current
    if (!s.seen.size && !s.lit.size && !s.hit.size) {
      setTimeout(() => note(touch ? 'Drag to look. Tap the ground to walk, tap a thing to throw a star at it.' : 'Click the ground to walk. Click a thing, or press F, to throw a star at it.'), 1400)
    }
  }

  const reset = () => {
    if (!window.confirm('Start over? This clears your progress in the village.')) return
    clearSave()
    window.location.reload()
  }

  useEffect(() => {
    if (!entered) return
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    const seq = []
    const h = (e) => {
      if (e.repeat) return   // holding a key is one press, not sixty
      if (e.code === 'Escape') { setPhoto(false); setJournal(false); setCard(null); return }
      if (e.code === 'KeyQ') { setJournal((q) => !q); return }
      if (journal) return
      if (e.code === 'KeyE' || e.code === 'Enter') act()
      if (e.code === 'KeyF' && shuriken.current) shuriken.current.throwForward()
      if (e.code === 'KeyM') toggleMute()
      if (e.code === 'KeyP') setPhoto((p) => !p)
      if (e.code === 'KeyR') setRaining((r) => !r)
      if (e.code === 'KeyX') { try { cheer() } catch {}; flash('SIUUU'); mark('done', 'siuuu'); if (!anim.current.oneShot) { anim.current.oneShot = 'Cheer'; anim.current.oneShotAt = nowS() } }
      seq.push(e.code); if (seq.length > konami.length) seq.shift()
      if (seq.join() === konami.join()) { try { cheer() } catch {}; flash('believe it'); mark('done', 'konami') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [entered, near, journal])

  const totals = { lanterns: pathLanterns.length, scrolls: scrolls.length }
  const hudOn = entered && !photo && !crowned
  const scrollsFound = scrolls.filter((s) => save.found.has(s.id))

  return (
    <>
      <Canvas
        shadows dpr={[1, touch ? 1.5 : 2]} performance={{ min: 0.5 }}
        camera={{ position: [0, 5, -10], fov: 52, near: 0.1, far: 800 }}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      >
        <color attach="background" args={[ENV.skyBottom]} />
        <fog attach="fog" args={[ENV.fog, 30, 230]} />
        <DevHook />
        <MusicDirector lit={lit.size} total={pathLanterns.length} freed={sealBroken} />
        <AdaptiveDpr pixelated={false} />
        <ObjectiveTracker objectives={objectives} playerRef={playerRef} compass={compass} />
        <Suspense fallback={null}>
          <Scene
            sealBroken={sealBroken} freed={freed} lit={lit} found={found} rungAt={rungAt} raining={raining}
            playerRef={playerRef} taikoAt={taikoAt} shaken={shaken} hit={save.hit} struck={struck}
            onScatter={() => mark('done', 'crates')} cratesApi={cratesApi} bubbles={bubbles} rivalHitAt={rivalHitAt}
          />
          <Controller
            spawn={[0, 0, -2]} blockers={allBlockers} camObstacles={camObstacles} interactables={interactables} nav={nav} state={anim}
            onProximity={setNear} onTap={onTap} input={input} playerRef={playerRef} lit={lit.size} freed={freed}
          />
          <Shuriken api={shuriken} playerRef={playerRef} state={anim} input={input} targets={throwables} aimTypes={AIM_TYPES}
            onHit={(it) => perform(it, 'throw')} aimLabel={aimLabel} />
          <Effects />
        </Suspense>
      </Canvas>

      {!entered && <Intro onEnter={enter} onJournal={() => setJournal(true)} touch={touch} />}
      {hudOn && (
        <Hud
          muted={muted} onToggleMute={toggleMute}
          lit={lit.size} lanterns={totals.lanterns} rank={rankFor(lit.size)}
          found={found.size} scrolls={totals.scrolls}
          raining={raining} pct={completion(save).pct}
          onJournal={() => setJournal(true)} touch={touch} compass={compass} aimLabel={aimLabel}
        />
      )}
      {hudOn && <Prompt near={near} onAct={act} />}
      {hudOn && touch && (
        <TouchControls input={input} onThrow={() => shuriken.current && shuriken.current.throwForward()} onDash={() => { input.current.dash = true }} />
      )}
      {hudOn && <ScrollCard card={card} onClose={() => setCard(null)} />}
      <Journal open={journal} save={save} scrollsFound={scrollsFound} onClose={() => setJournal(false)} onReset={reset} />
      {entered && photo && <button className="photo-hint" onClick={() => setPhoto(false)}>photo mode · <b>P</b>, <b>Esc</b> or tap to exit</button>}
      {toast && !photo && <div className="toast">{toast}</div>}
      {notice && !photo && <div className="notice">{notice}</div>}
      {sealNow && <Flash />}
      <TitleCard on={crowned && !photo} onPhoto={() => { setPhoto(true); setCrowned(false) }} onClose={() => setCrowned(false)} />
      <Fade on={leaving} />
    </>
  )
}
