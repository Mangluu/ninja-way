import { profile } from './data/content'

export function Intro({ onEnter }) {
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="kicker">A hidden village · an interactive world</div>
        <h1>{profile.name}</h1>
        <p className="tagline">{profile.title}</p>
        <button className="enter-btn" onClick={onEnter}>Enter the village →</button>
        <p className="hint-sm">WASD / arrows to move · drag to look · scroll to zoom</p>
        <div className="intro-links">
          <a href={profile.links.github} target="_blank" rel="noopener">GitHub ↗</a>
          <a href={profile.links.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
          <span className="in-a-hurry">in a hurry? the essentials are one click away</span>
        </div>
      </div>
    </div>
  )
}

export function Hud({ muted, onToggleMute, lit = 0, lanterns = 0, found = 0, scrolls = 0, raining = false }) {
  return (
    <>
      <div className="chip">
        <span className="dot" /> {profile.name} · <span className="muted">@{profile.handle}</span>
      </div>

      <div className="tally">
        <span className={lit === lanterns ? 'done' : ''}>🏮 {lit}/{lanterns}</span>
        <span className={found === scrolls ? 'done' : ''}>📜 {found}/{scrolls}</span>
        {raining && <span className="rain-on">🌧 raining</span>}
      </div>

      <button
        className="sound-btn"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <div className="controls">
        <b>WASD</b> move &nbsp; <b>space</b> jump &nbsp; <b>drag</b> look &nbsp; <b>E</b> interact &nbsp; <b>R</b> rain &nbsp; <b>P</b> photo
      </div>
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
      {near.note && <p className="prompt-note">“{near.note}”</p>}
      <button className={`prompt-btn ${isSahloka ? 'gold' : ''}`} onClick={onAct}>
        {isSahloka ? 'Enter Sahloka ⛩' : (near.cta || 'Open')} <span className="key">E</span>
      </button>
    </div>
  )
}

export function Fade({ on }) {
  return <div className={`fade ${on ? 'fade-on' : ''}`} />
}
