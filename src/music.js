import { musicBus } from './sound.js'

// ─────────────────────────────────────────────────────────────────────────────
// An original adaptive score, synthesised live — no audio files, nothing sampled.
//
// It is written to grow. The village hums; as you climb toward the Sahloka gate
// the arrangement stacks up underneath you — strings, then bass, then taiko,
// then the melody, then a choir and a doubled octave over the top, with a gong
// on the downbeat once you are at the summit. That build is the whole point:
// the music should make arriving somewhere feel like arriving somewhere.
//
// Built on the "yo" pentatonic scale, the mode behind a lot of Japanese folk
// music, which is why it sits naturally against a shinobi village.
// ─────────────────────────────────────────────────────────────────────────────

const BPM = 80
const SPB = 60 / BPM
const STEP = SPB / 2           // eighth notes
const LOOKAHEAD = 0.25

const D = 146.83
const SCALE = [1, 9 / 8, 4 / 3, 3 / 2, 5 / 3]      // D E G A B
const note = (deg, oct = 0) => D * SCALE[((deg % 5) + 5) % 5] * Math.pow(2, oct + Math.floor(deg / 5))

// 16-step patterns; null is a rest.
const KOTO   = [0, null, 2, null, 3, null, 2, null, 4, null, 3, null, 2, null, 0, null]
const MELODY = [7, null, null, 6, 5, null, null, 7, 8, null, null, 7, 5, null, null, null]
const TAIKO  = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0]
const TAIKO_BIG = [2, 0, 1, 0, 1, 0, 2, 0, 2, 0, 1, 1, 1, 2, 1, 1]   // driving, at the summit
const BASS = [0, 0, 3, 4]      // one root per bar, four-bar cycle

let bus = null
let timer = null
let step = 0
let nextTime = 0
let intensity = 0
let level = 0

export function startMusic() {
  if (bus) return
  bus = musicBus()
  nextTime = bus.ctx.currentTime + 0.1
  drone()
  timer = setInterval(schedule, 40)
}

export function stopMusic() {
  if (timer) clearInterval(timer)
  timer = null
}

export function setMusicIntensity(v) {
  intensity = Math.max(0, Math.min(1, v))
}

function drone() {
  const { ctx, gain } = bus
  const t = ctx.currentTime
  ;[D / 2, (D / 2) * (3 / 2)].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = i ? 0.05 : 0.075
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07 + i * 0.03
    const lg = ctx.createGain()
    lg.gain.value = 0.6
    lfo.connect(lg).connect(o.detune)
    lfo.start(t)
    o.connect(g).connect(gain)
    o.start(t)
  })
  gain.gain.setTargetAtTime(1, t, 1.5)
}

function pluck(f, t, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(f, t)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 6, t)
  lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.5)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
  o.connect(lp).connect(g).connect(gain)
  o.start(t); o.stop(t + 1.2)
}

function flute(f, t, dur, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f, t)
  const vib = ctx.createOscillator()
  vib.frequency.value = 5.2
  const vg = ctx.createGain()
  vg.gain.value = 3.5
  vib.connect(vg).connect(o.detune)
  vib.start(t); vib.stop(t + dur + 0.3)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.09)
  g.gain.setValueAtTime(amp, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
  o.connect(g).connect(gain)
  o.start(t); o.stop(t + dur + 0.3)
}

// Low brass — a detuned saw pair under a moving filter. This is the weight.
function brass(f, t, dur, amp) {
  const { ctx, gain } = bus
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 2.2, t)
  lp.frequency.linearRampToValueAtTime(f * 5.5, t + dur * 0.35)
  lp.frequency.linearRampToValueAtTime(f * 2.4, t + dur)
  lp.Q.value = 3
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.05)
  g.gain.setValueAtTime(amp, t + dur * 0.75)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2)
  lp.connect(g).connect(gain)
  ;[-7, 7].forEach((cents) => {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = cents
    o.connect(lp)
    o.start(t); o.stop(t + dur + 0.25)
  })
}

// A wide, breathy stack — the "choir" that opens up near the summit.
function choir(f, t, dur, amp) {
  const { ctx, gain } = bus
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = f * 4
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + dur * 0.4)   // slow swell
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6)
  lp.connect(g).connect(gain)
  ;[-11, 0, 11].forEach((cents) => {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = cents
    const vib = ctx.createOscillator()
    vib.frequency.value = 4.4
    const vg = ctx.createGain(); vg.gain.value = 4
    vib.connect(vg).connect(o.detune)
    vib.start(t); vib.stop(t + dur + 0.6)
    o.connect(lp)
    o.start(t); o.stop(t + dur + 0.6)
  })
}

function taiko(t, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(160, t)
  o.frequency.exponentialRampToValueAtTime(50, t + 0.22)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
  o.connect(g).connect(gain)
  o.start(t); o.stop(t + 0.46)

  const n = ctx.createBufferSource()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  n.buffer = buf
  const ng = ctx.createGain(); ng.gain.value = amp * 0.5
  n.connect(ng).connect(gain)
  n.start(t)
}

// A struck gong: bright noise wash over inharmonic partials, very long tail.
function gong(t, amp) {
  const { ctx, gain } = bus
  ;[188, 271, 402, 597, 913].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(f, t)
    const g = ctx.createGain()
    const a = amp * (1 - i * 0.15)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(a, 0.005), t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5)
    o.connect(g).connect(gain)
    o.start(t); o.stop(t + 4.6)
  })
  const n = ctx.createBufferSource()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2)
  n.buffer = buf
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.7
  const ng = ctx.createGain(); ng.gain.value = amp * 0.55
  n.connect(bp).connect(ng).connect(gain)
  n.start(t)
}

function schedule() {
  if (!bus) return
  const { ctx } = bus
  level += (intensity - level) * 0.06

  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const i = step % 16
    const bar = Math.floor(step / 16)
    const t = nextTime
    const L = level

    // strings — the village
    if (L > 0.12 && KOTO[i] !== null) pluck(note(KOTO[i], 1), t, 0.05 + L * 0.05)

    // bass — one root per bar, the floor under everything
    if (L > 0.30 && i === 0) brass(note(BASS[bar % 4], -1), t, SPB * 3.4, 0.06 + L * 0.07)

    // drums — the climb
    if (L > 0.45) {
      const pat = L > 0.8 ? TAIKO_BIG : TAIKO
      const hit = pat[i]
      if (hit) taiko(t, (hit === 2 ? 0.16 : 0.09) + L * 0.14)
    }

    // melody — the gate
    if (L > 0.60 && MELODY[i] !== null) {
      flute(note(MELODY[i], 0), t, STEP * 1.6, 0.05 + L * 0.07)
      // doubled an octave up once you are really there
      if (L > 0.85) flute(note(MELODY[i], 1), t, STEP * 1.5, 0.03 + L * 0.03)
    }

    // choir — opens the top end
    if (L > 0.74 && i === 0) choir(note(BASS[bar % 4], 1), t, SPB * 3.2, 0.035 + L * 0.03)

    // gong — the arrival
    if (L > 0.88 && i === 0 && bar % 4 === 0) gong(t, 0.13)

    // answering low pluck keeps the bottom moving
    if (L > 0.5 && i === 8) pluck(note(BASS[bar % 4], 0), t, 0.07)

    nextTime += STEP
    step++
  }
}
