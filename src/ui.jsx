import { useEffect, useRef } from 'react'
import { profile, projects, SAHLOKA, QUESTS, SECRETS, BIO, questProgress, completion } from './data/content'

export function Intro({ onEnter, onJournal, touch }) {
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="kicker">A hidden village · a portfolio you can play</div>
        <h1>{profile.name}</h1>
        <p className="tagline">{profile.title}</p>
        <button className="enter-btn" onClick={onEnter}>Enter the village →</button>
        <div className="legend">
          <span><b>{touch ? 'Joystick' : 'WASD'}</b> or {touch ? 'tap' : 'click'} the ground to walk</span>
          <span><b>Drag</b> to look</span>
          <span><b>{touch ? '✦' : 'F'}</b> throws a shuriken at what the marker shows</span>
          <span><b>{touch ? '⤳' : 'C'}</b> dash · <b>{touch ? '⤒' : 'Space'}</b> jump, twice</span>
        </div>
        <p className="hint-sm">Light the lanterns. Find what is hidden. Watch what he becomes.</p>
        <div className="intro-links">
          <button className="link-btn" onClick={onJournal}>In a hurry? Open the dossier</button>
          <a href={profile.links.github} target="_blank" rel="noopener">GitHub ↗</a>
          <a href={profile.links.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
        </div>
      </div>
    </div>
  )
}

export function Hud({ muted, onToggleMute, lit = 0, lanterns = 0, found = 0, scrolls = 0, raining = false, rank, pct = 0, rice = 0, onJournal, touch, compass, aimLabel }) {
  return (
    <>
      <div className="chip">
        <span className="dot" /> {profile.name} · <span className="muted">@{profile.handle}</span>
      </div>

      <button className="tally" onClick={onJournal} title="Journal (Q)">
        {rank && <span className="rank" title={rank.note}>{rank.name}</span>}
        <span className={lit === lanterns ? 'done' : ''}>🏮 {lit}/{lanterns}</span>
        <span className={found === scrolls ? 'done' : ''}>📜 {found}/{scrolls}</span>
        {rice > 0 && <span className="done">🍙 {rice}</span>}
        <span className={pct === 100 ? 'done' : ''}>⛩ {pct}%</span>
        {raining && <span className="rain-on">🌧 raining</span>}
      </button>

      {/* the compass: pointed at the nearest thing still to do */}
      <div className="compass">
        <span className="arrow" ref={(el) => { if (compass) compass.current.arrow = el }}>▲</span>
        <span className="label" ref={(el) => { if (compass) compass.current.label = el }}>…</span>
      </div>

      <div className="top-right">
        <button className="round-btn" onClick={onJournal} aria-label="Open the journal" title="Journal (Q)">📖</button>
        <button
          className="round-btn sound-btn"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* what a throw would hit right now; filled in from the render loop */}
      <div className="aim">
        <span className="aim-key">{touch ? '✦' : 'F'}</span>
        <span className="aim-verb">throw at</span>
        <b ref={aimLabel} />
      </div>

      {!touch && (
        <div className="controls">
          <b>WASD</b> or click to walk &nbsp; <b>space</b> ×2 jump &nbsp; <b>C</b> dash &nbsp; <b>E</b> interact &nbsp; <b>F</b> throw &nbsp; <b>Q</b> journal &nbsp; <b>P</b> photo
        </div>
      )}
    </>
  )
}

export function Prompt({ near, onAct }) {
  if (!near) return null
  const isSahloka = near.type === 'sahloka'
  return (
    <div className={`prompt ${isSahloka ? 'prompt-sahloka' : ''}`}>
      <div className="prompt-tag">{isSahloka ? 'THE SUMMIT' : near.tag}</div>
      <div className="prompt-name">{near.name}</div>
      <p className="prompt-blurb">{near.blurb}</p>
      <button className={`prompt-btn ${isSahloka ? 'gold' : ''}`} onClick={onAct}>
        {isSahloka ? 'Enter Sahloka ⛩' : (near.cta || 'Open')} <span className="key">E</span>
      </button>
    </div>
  )
}

export function Fade({ on }) {
  return <div className={`fade ${on ? 'fade-on' : ''}`} />
}

// A scroll, unrolled at the edge of the screen. It does not stop the world:
// you can keep walking while you read, and it rolls itself up after a while.
export function ScrollCard({ card, onClose }) {
  if (!card) return null
  return (
    <div className="scroll-toast" key={card.at} role="status">
      <div className="scroll-rod top" />
      <div className="scroll-body">
        <div className="scroll-kicker">a scroll, unrolled</div>
        <p className="scroll-text">{card.note}</p>
        <button className="scroll-close" onClick={onClose}>roll it up</button>
      </div>
      <div className="scroll-rod bottom" />
    </div>
  )
}

// The beat where the sixth gate catches. A wash of light, not a cut.
export function Flash() {
  return <div className="seal-flash" aria-hidden />
}

// Everything the world has been building toward, stated plainly and then got
// out of the way of.
export function TitleCard({ on, onPhoto, onClose }) {
  useEffect(() => {
    if (!on) return
    const t = setTimeout(onClose, 9000)
    const k = () => onClose()
    window.addEventListener('keydown', k)
    return () => { clearTimeout(t); window.removeEventListener('keydown', k) }
  }, [on, onClose])
  if (!on) return null
  return (
    <div className="title-card" role="status">
      <div className="title-card-inner">
        <p className="tc-kicker">The seal is broken</p>
        <h1 className="tc-name">Shivang Gupta</h1>
        <p className="tc-rank">Kage</p>
        <p className="tc-note">
          The village is lit. The fox at your side burns bright. Sprint is faster, the air holds you
          three times, and nothing here is closed to you.
        </p>
        <div className="tc-actions">
          <button className="tc-btn" onClick={onPhoto}>Take a photo ⌗</button>
          <button className="tc-btn tc-ghost" onClick={onClose}>Keep walking →</button>
        </div>
      </div>
    </div>
  )
}

// The journal slides in from the side and leaves the world running behind it.
// Someone in a hurry gets the bio, the links and every project with nothing
// hidden behind the game; someone playing gets the same page with their
// progress and every scroll they have found.
export function Journal({ open, save, scrollsFound = [], onClose, onReset }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.code === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  const { got, total, pct } = completion(save)
  return (
    <div className="journal-wrap">
      <div className="journal" role="dialog" aria-modal="false" aria-label="Journal and dossier">
        <header className="q-head">
          <div>
            <div className="q-kicker">Dossier</div>
            <h2>{profile.name}</h2>
            <p className="q-title">{profile.title}</p>
          </div>
          <button className="q-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="q-links">
          <a href={profile.links.sahloka} target="_blank" rel="noopener">Sahloka ↗</a>
          <a href={profile.links.github} target="_blank" rel="noopener">GitHub ↗</a>
          <a href={profile.links.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
          <a href={profile.links.email}>Email ↗</a>
        </div>

        <div className="q-bio">{BIO.map((p, i) => <p key={i}>{p}</p>)}</div>

        <section>
          <div className="q-sec"><span>Quests</span><span className="q-pct">{got}/{total} · {pct}%</span></div>
          <div className="q-bar"><i style={{ width: `${pct}%` }} /></div>
          <ul className="q-list">
            {QUESTS.map((q) => {
              const p = questProgress(save, q), t = q.total || 1, done = p >= t
              return (
                <li key={q.name} className={done ? 'done' : ''}>
                  <span className="q-check">{done ? '✓' : ''}</span>
                  <span className="q-name">{q.name}</span>
                  <span className="q-count">{t > 1 ? `${p}/${t}` : ''}</span>
                  <span className="q-hint">{q.hint}</span>
                </li>
              )
            })}
            {SECRETS.map((s) => {
              const done = save.done.has(s.id)
              return (
                <li key={s.id} className={`secret ${done ? 'done' : ''}`}>
                  <span className="q-check">{done ? '✓' : ''}</span>
                  <span className="q-name">{done ? s.name : 'Secret · ???'}</span>
                  <span className="q-count" />
                  <span className="q-hint">{s.hint}</span>
                </li>
              )
            })}
          </ul>
        </section>

        {scrollsFound.length > 0 && (
          <section>
            <div className="q-sec"><span>Scrolls</span><span className="q-pct">{scrollsFound.length} found</span></div>
            <ul className="s-list">
              {scrollsFound.map((s) => <li key={s.id}>“{s.note}”</li>)}
            </ul>
          </section>
        )}

        <section>
          <div className="q-sec"><span>Projects</span><span className="q-pct">{save.seen.size}/{projects.length} found in the village</span></div>
          <ul className="p-list">
            {projects.map((p) => (
              <li key={p.id} className={save.seen.has(p.id) ? 'seen' : ''}>
                <span className="p-dot" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
                <div className="p-body">
                  <div className="p-top"><b>{p.name}</b><span className="p-tag">{p.tag}</span></div>
                  <p>{p.blurb}</p>
                </div>
                <a className="p-link" href={p.link} target="_blank" rel="noopener">{p.cta} ↗</a>
              </li>
            ))}
            <li className="sahloka">
              <span className="p-dot gold" />
              <div className="p-body">
                <div className="p-top"><b>{SAHLOKA.name}</b><span className="p-tag">The summit</span></div>
                <p>{SAHLOKA.blurb}</p>
              </div>
              <a className="p-link gold" href={SAHLOKA.link} target="_blank" rel="noopener">Enter Sahloka ⛩</a>
            </li>
          </ul>
        </section>

        <footer className="q-foot">
          <span>Progress is saved in this browser.</span>
          <button className="q-reset" onClick={onReset}>Start over</button>
        </footer>
      </div>
    </div>
  )
}

// A thumb stick and three buttons. The stick writes a unit vector into `input`
// every move; the controller reads it each frame alongside the keyboard.
function Joystick({ input }) {
  const knob = useRef()
  const active = useRef(null)
  const R = 44
  const set = (dx, dy) => {
    const m = Math.hypot(dx, dy), k = m > R ? R / m : 1
    dx *= k; dy *= k
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    input.current.joy.x = dx / R
    input.current.joy.y = dy / R
  }
  return (
    <div
      className="joy"
      onPointerDown={(e) => {
        if (active.current) return
        active.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
      }}
      onPointerMove={(e) => { if (active.current && active.current.id === e.pointerId) set(e.clientX - active.current.x, e.clientY - active.current.y) }}
      onPointerUp={(e) => { if (active.current && active.current.id === e.pointerId) { active.current = null; set(0, 0) } }}
      onPointerCancel={(e) => { if (active.current && active.current.id === e.pointerId) { active.current = null; set(0, 0) } }}
    >
      <div className="knob" ref={knob} />
    </div>
  )
}

export function TouchControls({ input, onThrow, onDash }) {
  return (
    <div className="touch-ui" onContextMenu={(e) => e.preventDefault()}>
      <Joystick input={input} />
      <div className="touch-btns">
        <button className="tbtn" aria-label="Dash" onPointerDown={(e) => { e.preventDefault(); onDash() }}>⤳</button>
        <button className="tbtn" aria-label="Throw a shuriken" onPointerDown={(e) => { e.preventDefault(); onThrow() }}>✦</button>
        <button
          className="tbtn big" aria-label="Jump"
          onPointerDown={(e) => { e.preventDefault(); input.current.jump = true; try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} }}
          onPointerUp={() => { input.current.jump = false }}
          onPointerCancel={() => { input.current.jump = false }}
        >⤒</button>
      </div>
    </div>
  )
}
