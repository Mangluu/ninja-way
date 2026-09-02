// Progress lives in this browser. Eight sets, stored as arrays. Nothing else.
const KEYS = ['lit', 'found', 'seen', 'heard', 'hit', 'done', 'food', 'fed']
const STORE = 'ninja-way:save:v1'

export function loadSave() {
  const s = Object.fromEntries(KEYS.map((k) => [k, new Set()]))
  try {
    const j = JSON.parse(localStorage.getItem(STORE))
    if (j) for (const k of KEYS) s[k] = new Set(Array.isArray(j[k]) ? j[k] : [])
  } catch {}
  return s
}

export function persistSave(s) {
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, [...s[k]]])))) } catch {}
}

export function clearSave() {
  try { localStorage.removeItem(STORE) } catch {}
}
