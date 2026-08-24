// ─────────────────────────────────────────────────────────────────────────────
// THE HIDDEN VILLAGE — data. Subtle by design: no life-story narration, just a
// fun world with discoverable projects, all orbiting one glowing landmark: SAHLOKA.
// ─────────────────────────────────────────────────────────────────────────────

export const profile = {
  name: 'SHIVANG GUPTA',
  handle: 'Mangluu',
  title: 'World-builder · XR researcher · D.Sc @ Tampere',
  links: {
    sahloka: 'https://sahloka.com',
    github: 'https://github.com/Mangluu',
    linkedin: 'https://www.linkedin.com/in/i-am-manglu/',
    email: 'mailto:shivangzephyr@gmail.com',
  },
}

// The palette — one cohesive Japanese-village set used everywhere.
export const C = {
  vermilion: '#bb3323', vermilionLite: '#e5543f',
  indigo: '#2a4b7c', indigoDeep: '#1b2e4e',
  celadon: '#5fa88a',
  wood: '#b5835a', woodDark: '#7a5638',
  washi: '#efe7d6',
  sumi: '#2b2823',
  gold: '#e6b24d', goldLite: '#ffd98a',
  orange: '#e8752c', orangeLite: '#ff9a4d',
  steel: '#9fb0c4',
  sakura: '#e8a9b8', sakuraDeep: '#d98ca0',
  leaf: '#6f8f5f', leafDark: '#4e6b4a',
  stone: '#9a958a', stoneDark: '#6f6b62',
  roof: '#8496c9',
  grass: '#6d7a4f', dirt: '#b89a6c',
}

// Environment — a golden-hour dusk. Warm, cel-shades beautifully, makes gold glow.
// Environment — a moonlit night. The village is dark enough that the lanterns
// you light are genuinely the light source, not decoration on top of daylight.
export const ENV = {
  skyTop: '#070d22',
  skyMid: '#111c3d',
  skyBottom: '#26314f',
  fog: '#101a33',
  fogNear: 14,
  fogFar: 105,
  sun: '#aabfe8',          // moonlight, not sunlight
  ground: '#2f3a30',
  moon: '#dce8ff',
}

// SAHLOKA — the star everything orbits. On a hill at the far end, always visible.
export const SAHLOKA = {
  name: 'SAHLOKA',
  blurb: 'A living world where AI residents lead their own lives — and you drop in to watch, befriend, and join them. It remembers you. The one I am betting everything on.',
  link: 'https://sahloka.com',
  x: 0, z: 74, y: 4, // raised on the hill
}

// Discoverable project spots — glowing lanterns you wander up to. Optional, not a tour.
export const projects = [
  {
    id: 'passage', name: 'Passage', tag: 'b_hack 2026 · Winner',
    blurb: 'How safe and free will you be abroad — specific to who you are, every fact sourced and dated. Provenance over plausibility.',
    link: 'https://mangluu.github.io/passage/', cta: 'Open Passage', color: C.celadon,
    x: -7, z: 16,
  },
  {
    id: 'visbaltic', name: 'VisBaltic', tag: 'b_hack 2025 · Winner',
    blurb: 'An open, source-cited map of how climate change is reshaping the Baltic Sea — and real initiatives to act on it. Turning scary data into action.',
    link: 'https://mangluu.github.io/visbaltic/', cta: 'Open VisBaltic', color: C.celadon,
    x: 8, z: 24,
  },
  {
    id: 'sayit', name: 'Say It, Slay It', tag: 'Game Jam · Leiden · Winner',
    blurb: 'Shout something ridiculous, the AI forges it into a weapon, and you fling it at a friend. A game that is useless without human creativity — then it won a jam.',
    link: 'https://github.com/Mangluu/Say-It-Slay-It', cta: 'See the code', color: C.vermilionLite,
    x: -9, z: 34,
  },
  {
    id: 'explaindb', name: 'ExplainDB', tag: 'Aalto AI Hackathon',
    blurb: 'Talk to your database like you talk to ChatGPT — but better: graphs, recommendations, plain language. 48 hours, 2 developers, a lot of pizza.',
    link: 'https://github.com/Mangluu/ExplainDB', cta: 'View on GitHub', color: C.indigo,
    x: 9, z: 40,
  },
  {
    id: 'haptics', name: 'Virtual Playing, Real Touch', tag: 'CHI 2026 · Barcelona',
    blurb: 'My PhD work on the haptics of musical instruments — play virtual instruments and feel how touch changes VR. Watching people get competitive with it was the best part.',
    link: 'https://dl.acm.org/doi/full/10.1145/3772363.3799160', cta: 'The research', color: C.gold,
    x: -8, z: 50,
  },
  {
    id: 'overleaf', name: 'overleaf-comments-export', tag: '★ Most-starred tool',
    blurb: 'Export Overleaf comments and tracked changes to clean Markdown + JSON. A small sharp tool that scratched my own itch — and others’ too.',
    link: 'https://github.com/Mangluu/overleaf-comments-export', cta: 'View on GitHub', color: C.gold,
    x: 8, z: 58,
  },
]

// A few quiet personality notes — surfaced softly, never as a timeline.
export const facts = [
  'Hackathon teams named Akatsuki and METAvengers. Casting my life as Naruto and Marvel for years.',
  'Fell for the metaverse watching Ready Player One — before it existed.',
  'The best part is always the people. The tech is just the excuse.',
]

// World bounds (XZ). Forward toward Sahloka is +Z.
export const WORLD = { minX: -22, maxX: 22, minZ: -8, maxZ: 82 }

// ── The rank ladder ─────────────────────────────────────────────────────────
// Every lantern you light changes the character. The four named ranks are the
// milestones; the lanterns between them still shift something smaller, so no
// lantern feels like it did nothing. Someone who lights one and leaves still
// sees a coherent shinobi — someone who lights all six watches him become
// somebody.
export const RANKS = [
  { at: 0, name: 'Academy', note: 'No plate. Nobody yet.' },
  { at: 1, name: 'Genin', note: 'The plate is fitted to the band.' },
  { at: 3, name: 'Chūnin', note: 'Hood down. He stopped hiding.' },
  { at: 5, name: 'Jōnin', note: 'Orange. He is not asking permission.' },
  { at: 6, name: 'Kage', note: 'The seal is broken. Nothing here is closed to him.' },
]

export function rankFor(lit) {
  let r = RANKS[0]
  for (const k of RANKS) if (lit >= k.at) r = k
  return r
}

// ── What the village says about him ─────────────────────────────────────────
// All three talk about the player in the third person, so the portfolio keeps
// working without anyone stopping to deliver a CV. The sensei reads the room
// out loud and never looks up from his book.
export const VILLAGER_LINES = {
  cook: [
    'That one comes in after every trip. Talks about the team the whole way through. Never once about the trophy.',
    'He told me the tech is only ever the excuse. The best part is the people. Then he ordered a second bowl.',
    'Two of those Baltic contests, two wins. You would think he would lead with that. He leads with the group chat.',
  ],
  rival: [
    'Luck. You shout something ridiculous at a laptop and it wins a jam in Leiden. That is not skill, that is a good week.',
    'Twice at the Baltic thing. Nobody wins that twice. So it is the teams he picks. Obviously.',
    'Ask him about the Aalto one. Second place, that one. ...He tells people that himself, actually. Which is somehow worse.',
    'He named a team Akatsuki. Grown man. Named a team Akatsuki.',
  ],
  sensei: [
    'He fell for the idea of another world before there was a word for it. Watched a film about it, and never quite came back.',
  ],
}

// The sensei narrates whatever rank the player has actually reached.
export function senseiProgress(lit) {
  if (lit >= 6) return 'All six lit. Something on the hill has noticed him. I would not go up there tonight.'
  if (lit >= 5) return 'Orange, now. He has stopped asking permission. That happens around the fifth.'
  if (lit >= 3) return 'The hood is down. He has stopped hiding, which is harder than any of the climbing.'
  if (lit >= 1) return 'The plate is on the band. One lantern lit. A start is not nothing.'
  return 'An academy student passes. He has lit nothing at all. The village stays exactly as dark as he found it.'
}
