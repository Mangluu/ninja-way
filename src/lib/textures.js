// ─────────────────────────────────────────────────────────────────────────────
// Procedural texture engine.
//
// Adapted from KAGE by Meng To (https://github.com/MengTo/kage), used with the
// author's permission. Credit is given in the project README.
//
// Every material in this village is drawn at runtime on a <canvas> from noise —
// there are no image files. That keeps the whole world a few kilobytes and lets
// the wood, plaster, roof tile and paper share one coherent hand.
// ─────────────────────────────────────────────────────────────────────────────


const clamp  = (v, a, b) => v < a ? a : (v > b ? b : v);
const sat    = v => clamp(v, 0, 1);
const lerp   = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = sat((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const easeOut= t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const TAU    = Math.PI * 2;
/* frame-rate independent damping */
const damp   = (cur, to, rate, dt) => lerp(cur, to, 1 - Math.exp(-rate * dt));

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/* classic 2-D gradient noise */
function noise2D(seed) {
  const rnd = mulberry32(seed), p = new Uint8Array(256), perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const X = xi & 255, Y = yi & 255, xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const g = (h, dx, dy) => { const q = G[h & 7]; return q[0] * dx + q[1] * dy; };
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u),
                lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u), v);
  };
}
function fbm(n, x, y, oct, lac, gain) {
  let a = .5, f = 1, s = 0, m = 0;
  for (let i = 0; i < (oct || 4); i++) { s += a * n(x * f, y * f); m += a; a *= (gain || .5); f *= (lac || 2); }
  return s / m;                                    /* −1 … 1 */
}

/* ------------------------------------------------------------ 1 · canvas */
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const hex = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';

/* stacked, up-scaled value noise — 30× faster than a per-pixel fbm and
   indistinguishable once it is multiplied under a dark base colour */
function fbmCanvas(W, H, seed, octaves, baseCells, contrast) {
  const out = cvs(W, H), o = out.getContext('2d');
  o.fillStyle = '#808080'; o.fillRect(0, 0, W, H);
  let cells = baseCells || 3, alpha = 1;
  for (let i = 0; i < (octaves || 5); i++) {
    const n = cvs(cells, cells), nx = n.getContext('2d');
    const im = nx.createImageData(cells, cells), d = im.data, r = mulberry32(seed + i * 977);
    for (let k = 0; k < cells * cells; k++) {
      const v = 128 + (r() - .5) * 255 * (contrast || 1);
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = clamp(v, 0, 255); d[k * 4 + 3] = 255;
    }
    nx.putImageData(im, 0, 0);
    o.globalAlpha = alpha;
    o.globalCompositeOperation = i === 0 ? 'source-over' : 'overlay';
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.drawImage(n, 0, 0, W, H);
    cells *= 2; alpha *= .62;
  }
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  return out;
}

/* height → tangent-space normal map (blur first, then Sobel) */
function normalFromHeight(hc, strength) {
  const W = hc.width, H = hc.height;
  const b = cvs(W, H), bx = b.getContext('2d');
  bx.filter = 'blur(1.1px)'; bx.drawImage(hc, 0, 0); bx.filter = 'none';
  const src = bx.getImageData(0, 0, W, H).data;
  const out = cvs(W, H), ox = out.getContext('2d');
  const im = ox.createImageData(W, H), d = im.data;
  const at = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
  const s = strength || 2.4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = (at(x + 1, y) - at(x - 1, y)) * s;
    const gy = (at(x, y + 1) - at(x, y - 1)) * s;
    let nx = -gx, ny = gy, nz = 1;
    const il = 1 / Math.hypot(nx, ny, nz);
    const i = (y * W + x) * 4;
    d[i]     = (nx * il * .5 + .5) * 255;
    d[i + 1] = (ny * il * .5 + .5) * 255;
    d[i + 2] = (nz * il * .5 + .5) * 255;
    d[i + 3] = 255;
  }
  ox.putImageData(im, 0, 0);
  return out;
}

/* ------------------------------------------------------- 2 · surfaces */
/* long, wet, board-formed concrete — the sanctuary walls */
function texWall() {
  const W = 1024, H = 1024;
  const c = cvs(W, H), x = c.getContext('2d');
  x.fillStyle = '#10161a'; x.fillRect(0, 0, W, H);

  /* mottling */
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .82;
  x.drawImage(fbmCanvas(W, H, 41, 6, 3, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* board-form seams every sixth */
  const rnd = mulberry32(7);
  for (let i = 1; i < 6; i++) {
    const y = (H / 6) * i;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y - 1.5, W, 3);
    x.fillStyle = 'rgba(190,205,205,.05)'; x.fillRect(0, y + 2, W, 2);
  }
  /* form-tie dimples */
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const cx2 = (W / 4) * (j + .5) + (rnd() - .5) * 14, cy = (H / 6) * (i + .5);
    const g = x.createRadialGradient(cx2, cy, 1, cx2, cy, 11);
    g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(.7, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx2, cy, 11, 0, TAU); x.fill();
  }
  /* rain streaks running the full height */
  for (let i = 0; i < 190; i++) {
    const sx = rnd() * W, w = .6 + rnd() * 3.4, top = rnd() * H * .5, len = H * (.4 + rnd() * .7);
    const g = x.createLinearGradient(0, top, 0, top + len);
    const dark = rnd() > .45;
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.25, dark ? 'rgba(0,0,0,.20)' : 'rgba(170,195,200,.045)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(sx, top, w, len);
  }
  /* fine tooth */
  x.globalAlpha = .16; x.globalCompositeOperation = 'overlay';
  x.drawImage(fbmCanvas(512, 512, 91, 3, 128, 1.4), 0, 0, W, H);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* height for the normal map: seams + streaks only */
  const h = cvs(W, H), hx = h.getContext('2d');
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  hx.globalAlpha = .5; hx.drawImage(fbmCanvas(W, H, 41, 5, 6, 1), 0, 0); hx.globalAlpha = 1;
  for (let i = 1; i < 6; i++) { hx.fillStyle = '#2a2a2a'; hx.fillRect(0, (H / 6) * i - 2, W, 4); }
  return { map: c, normal: normalFromHeight(h, 2.0) };
}

/* wet slate paving — big slabs, tight joints, standing water */
function texFloor() {
  const W = 1024, H = 1024;
  const c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(23);
  x.fillStyle = '#0a0f12'; x.fillRect(0, 0, W, H);
  const N = 4, S = W / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = .82 + rnd() * .36;
    x.fillStyle = hex(12 * t, 17 * t, 20 * t);
    x.fillRect(i * S + 1.5, j * S + 1.5, S - 3, S - 3);
  }
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .55;
  x.drawImage(fbmCanvas(W, H, 63, 6, 4, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  /* joints */
  x.strokeStyle = 'rgba(0,0,0,.72)'; x.lineWidth = 3;
  for (let i = 0; i <= N; i++) {
    x.beginPath(); x.moveTo(i * S, 0); x.lineTo(i * S, H); x.stroke();
    x.beginPath(); x.moveTo(0, i * S); x.lineTo(W, i * S); x.stroke();
  }
  /* height map: joints recessed, grain */
  const h = cvs(W, H), hx = h.getContext('2d');
  hx.fillStyle = '#8c8c8c'; hx.fillRect(0, 0, W, H);
  hx.globalAlpha = .35; hx.drawImage(fbmCanvas(W, H, 63, 5, 8, 1), 0, 0); hx.globalAlpha = 1;
  hx.strokeStyle = '#303030'; hx.lineWidth = 5;
  for (let i = 0; i <= N; i++) {
    hx.beginPath(); hx.moveTo(i * S, 0); hx.lineTo(i * S, H); hx.stroke();
    hx.beginPath(); hx.moveTo(0, i * S); hx.lineTo(W, i * S); hx.stroke();
  }
  /* roughness: mostly glass, drier patches where the rain missed */
  const r = cvs(512, 512), rx = r.getContext('2d');
  rx.fillStyle = '#1c1c1c'; rx.fillRect(0, 0, 512, 512);
  rx.globalAlpha = .95; rx.globalCompositeOperation = 'lighten';
  rx.drawImage(fbmCanvas(512, 512, 77, 4, 3, 1.5), 0, 0);
  rx.globalAlpha = 1; rx.globalCompositeOperation = 'source-over';
  return { map: c, normal: normalFromHeight(h, 1.5), rough: r };
}

/* --------------------------------------------------- temple timber · cedar
   Boards, not a noise field. Three things make sawn wood read as wood and
   none of them is fbm:

     1 · ring geometry. A plank is a flat cut through a round log, so the
         rings meet the face as two branches either side of the pith, and
         wherever the cut runs shallow across a ring the branches close into
         the cathedral arch everyone recognises. Solving the circle for it —
         x = pith ± √(r² − d(y)²), with the cut depth d wandering down the
         board — hands over the arches for free. Drawn strokes only ever give
         stripes, which is what the first pass here did, and stripes on a
         column read as brushed metal.
     2 · the boards themselves. Joints, and a different tone on either side of
         one. A wall with no joint in it is a wall of plastic.
     3 · pores, so the face has tooth rather than a painted finish.

   Broad fbm overlays used to do the work here and they are exactly why the
   hall looked like it was standing under a cloud: at this camera distance a
   noise blotch is dirt, and dirt is not grain. Everything below is structure.

   boards:0 gives a single timber for the columns, sills and rails, which are
   each one stick of wood and must not carry a joint. */
function texWood(seed, opt) {
  const o = opt || {}, W = 512, H = 512;
  const c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d');
  const r = cvs(W, H), rx = r.getContext('2d');
  const rnd = mulberry32(seed || 3);
  const base = o.base || [30, 23, 19];
  x.fillStyle = hex(base[0], base[1], base[2]); x.fillRect(0, 0, W, H);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  rx.fillStyle = o.rough || '#d6d6d6'; rx.fillRect(0, 0, W, H);

  /* board layout — widths jittered, then normalised so the run closes on the
     tile edge and the map still wraps */
  const nb = o.boards === undefined ? 7 : o.boards;
  const cuts = [0];
  if (nb > 0) {
    const ws = []; let sum = 0;
    for (let i = 0; i < nb; i++) { const v = .70 + rnd() * .60; ws.push(v); sum += v; }
    let acc = 0;
    ws.forEach(v => { acc += v / sum * W; cuts.push(acc); });
  } else cuts.push(W);

  const stroke = (pts, ctx, style, w) => {
    if (pts.length < 2) return;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
  };

  for (let b = 0; b < cuts.length - 1; b++) {
    const x0 = cuts[b], x1 = cuts[b + 1], bw = x1 - x0;
    /* every board came off a different part of the log */
    const tone = .80 + rnd() * .44;
    const pith = x0 + bw * (rnd() * 2.8 - .9);        /* usually outside it */
    const d0 = bw * (.12 + rnd() * 1.7);              /* how deep the cut ran */
    const amp = bw * (.10 + rnd() * .40);
    const per = 1 + ((rnd() * 2) | 0), ph = rnd() * TAU;
    const dAt = y => d0 + Math.sin(y / H * TAU * per + ph) * amp;
    const gap = 2.4 + rnd() * 5.0;                    /* ring spacing */

    [x, hx, rx].forEach(d => { d.save(); d.beginPath(); d.rect(x0, 0, bw, H); d.clip(); });
    x.fillStyle = hex(base[0] * tone, base[1] * tone, base[2] * tone);
    x.fillRect(x0, 0, bw, H);

    for (let k = 1; k * gap < bw * 3.4 + d0 + amp; k++) {
      const rr = k * gap * (.88 + rnd() * .24);
      const dark = .42 + rnd() * .38, wide = .8 + rnd() * 1.9;
      for (const side of [-1, 1]) {
        let pts = [];
        const flush = () => {
          /* latewood: a narrow dark band, with the pale earlywood just inside */
          stroke(pts, x, 'rgba(0,0,0,' + dark.toFixed(2) + ')', wide);
          stroke(pts, hx, 'rgba(0,0,0,' + (dark * .8).toFixed(2) + ')', wide);
          stroke(pts.map(q => [q[0] + side * (wide + .6), q[1]]), x,
                 'rgba(150,120,96,' + (dark * .30).toFixed(2) + ')', wide * .7);
          pts = [];
        };
        for (let y = -3; y <= H + 3; y += 3) {
          const d = dAt(y), q = rr * rr - d * d;
          if (q <= 0) { flush(); continue; }
          pts.push([pith + side * Math.sqrt(q), y]);
        }
        flush();
      }
    }
    /* pores — the open tooth of cedar, elongated along the grain */
    for (let i = 0; i < 220; i++) {
      const px2 = x0 + rnd() * bw, py = rnd() * H, ln = 1.5 + rnd() * 6;
      x.fillStyle = 'rgba(0,0,0,' + (.10 + rnd() * .22) + ')';
      x.fillRect(px2, py, .7 + rnd() * .7, ln);
      hx.fillStyle = 'rgba(0,0,0,.22)'; hx.fillRect(px2, py, .8, ln);
    }
    /* the odd knot, where a branch left the trunk */
    if (rnd() > .55) {
      const kx = x0 + bw * (.2 + rnd() * .6), ky = rnd() * H, kr = 2.5 + rnd() * 5;
      for (let i = 5; i >= 1; i--) {
        const t = i / 5;
        x.strokeStyle = 'rgba(0,0,0,' + (.5 - t * .25).toFixed(2) + ')'; x.lineWidth = 1.1;
        x.beginPath(); x.ellipse(kx, ky, kr * t * 1.5, kr * t * 2.4, 0, 0, TAU); x.stroke();
        hx.strokeStyle = 'rgba(0,0,0,.30)'; hx.lineWidth = 1.1;
        hx.beginPath(); hx.ellipse(kx, ky, kr * t * 1.5, kr * t * 2.4, 0, 0, TAU); hx.stroke();
      }
    }
    /* checking: the splits a dried board opens, always along the grain */
    for (let i = 0; i < 5; i++) {
      const sx = x0 + rnd() * bw, sy = rnd() * H, ln = 20 + rnd() * 120;
      const pts = [];
      for (let y = sy; y < sy + ln; y += 6) pts.push([sx + Math.sin(y * .07) * 1.4, y]);
      stroke(pts, x, 'rgba(0,0,0,.62)', .7 + rnd() * 1.2);
      stroke(pts, hx, 'rgba(0,0,0,.55)', .7 + rnd() * 1.2);
    }
    [x, hx, rx].forEach(d => d.restore());

    /* the joint, and the board edge that catches light beside it */
    if (nb > 0) {
      x.fillStyle = 'rgba(0,0,0,.80)'; x.fillRect(x1 - 1.1, 0, 2.2, H);
      x.fillStyle = 'rgba(158,130,106,.14)'; x.fillRect(x1 + 1.1, 0, 1.1, H);
      hx.fillStyle = 'rgba(0,0,0,.85)'; hx.fillRect(x1 - 1.3, 0, 2.6, H);
      hx.fillStyle = 'rgba(255,255,255,.35)'; hx.fillRect(x1 + 1.3, 0, 1.6, H);
      rx.fillStyle = 'rgba(255,255,255,.5)'; rx.fillRect(x1 - 1.6, 0, 3.2, H);
    }
  }

  /* soot, running down the boards rather than pooling in clouds — this is the
     one weathering pass, and it follows the grain because water does */
  for (let i = 0; i < 90; i++) {
    const sx = rnd() * W, top = rnd() * H, ln = H * (.15 + rnd() * .5);
    const g = x.createLinearGradient(0, top, 0, top + ln);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.3, 'rgba(0,0,0,' + (.10 + rnd() * .16) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(sx, top, .8 + rnd() * 3.4, ln);
  }
  return { map: c, normal: normalFromHeight(h, o.relief || 2.4), rough: r };
}

/* ------------------------------------------------------------ cut granite
   The lanterns are carved out of one block, so this is a monolith face and
   not coursed masonry: no joints, no bond pattern. What sells it instead is
   grain and wear —

     1 · the speckle. Three mineral populations at three tones: pale feldspar,
         mid quartz, black mica. A granite without visible crystal is grey
         plastic, and it is the one thing a colour ramp cannot fake.
     2 · the chisel. Parallel bruising left by a point on a dressed face, each
         mark a dark gouge with a lit shoulder below it.
     3 · pitting and fracture, and moss keyed to *those* — moss grows where
         water sits, which is the low ground, so it is read out of the height
         field rather than dropped on as its own cloud. That cloud is what
         made this look like weather rather than stone. */
function texStone(seed, opt) {
  const o = opt || {}, W = 512, H = 512;
  const c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d');
  const r = cvs(W, H), rx = r.getContext('2d');
  const rnd = mulberry32(seed || 17);
  const base = o.base || [46, 51, 53];
  x.fillStyle = hex(base[0], base[1], base[2]); x.fillRect(0, 0, W, H);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  rx.fillStyle = '#e8e8e8'; rx.fillRect(0, 0, W, H);

  /* 1 · crystal */
  const speck = (n, fill, smin, smax, hgt) => {
    for (let i = 0; i < n; i++) {
      const s = smin + rnd() * (smax - smin), px = rnd() * W, py = rnd() * H;
      x.fillStyle = fill(rnd);
      x.beginPath(); x.ellipse(px, py, s, s * (.55 + rnd() * .85), rnd() * TAU, 0, TAU); x.fill();
      if (hgt) {
        hx.fillStyle = hgt;
        hx.beginPath(); hx.ellipse(px, py, s, s * .8, 0, 0, TAU); hx.fill();
      }
    }
  };
  speck(3400, q => 'rgba(206,210,204,' + (.06 + q() * .20) + ')', .6, 2.8, 'rgba(255,255,255,.13)');
  speck(2000, q => 'rgba(126,136,134,' + (.07 + q() * .20) + ')', .8, 3.4, null);
  speck(1300, q => 'rgba(8,10,12,'     + (.14 + q() * .38) + ')', .5, 2.4, 'rgba(0,0,0,.16)');

  /* 2 · the chisel */
  for (let i = 0; i < 220; i++) {
    const py = rnd() * H, px = rnd() * W, len = 5 + rnd() * 24, ang = -.26 + rnd() * .52;
    [[x, 'rgba(0,0,0,.22)', 'rgba(210,216,212,.08)'], [hx, 'rgba(0,0,0,.34)', 'rgba(255,255,255,.26)']]
      .forEach(([d, dk, lt]) => {
        d.save(); d.translate(px, py); d.rotate(ang);
        d.fillStyle = dk; d.fillRect(0, 0, len, 1.5);
        d.fillStyle = lt; d.fillRect(0, 1.5, len, 1.0);
        d.restore();
      });
  }
  /* 3 · pitting and fracture */
  for (let i = 0; i < 260; i++) {
    const px = rnd() * W, py = rnd() * H, rr = .8 + rnd() * rnd() * 5;
    const g = x.createRadialGradient(px - rr * .3, py - rr * .3, rr * .1, px, py, rr);
    g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(.7, 'rgba(0,0,0,.16)');
    g.addColorStop(1, 'rgba(198,204,198,.10)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill();
    hx.fillStyle = 'rgba(0,0,0,.40)'; hx.beginPath(); hx.arc(px, py, rr * .8, 0, TAU); hx.fill();
  }
  for (let i = 0; i < 16; i++) {
    let px = rnd() * W, py = rnd() * H, a = rnd() * TAU;
    const pts = [[px, py]];
    for (let k = 0; k < 24; k++) {
      a += (rnd() - .5) * .9; px += Math.cos(a) * 9; py += Math.sin(a) * 9;
      pts.push([px, py]);
    }
    [[x, 'rgba(0,0,0,.46)'], [hx, 'rgba(0,0,0,.55)']].forEach(([d, st]) => {
      d.beginPath(); d.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(q => d.lineTo(q[0], q[1]));
      d.strokeStyle = st; d.lineWidth = .7 + rnd() * .9; d.stroke();
    });
  }

  /* moss, read out of the low ground of the height field */
  const hd = hx.getImageData(0, 0, W, H).data;
  const im = x.getImageData(0, 0, W, H), rm = rx.getImageData(0, 0, W, H);
  const amt = o.moss === undefined ? 1 : o.moss;
  for (let i = 0; i < W * H; i++) {
    const t = clamp((.5 - hd[i * 4] / 255) * 4.2, 0, 1) * amt;
    if (t <= 0) continue;
    const j = i * 4;
    im.data[j]     = lerp(im.data[j],     30, t * .75);
    im.data[j + 1] = lerp(im.data[j + 1], 44, t * .95);
    im.data[j + 2] = lerp(im.data[j + 2], 28, t * .85);
    /* moss is matte — through the same buffer, because a fillRect per pixel
       is a quarter of a million canvas calls and costs more than the rest of
       this generator put together */
    rm.data[j] = rm.data[j + 1] = rm.data[j + 2] = lerp(rm.data[j], 255, t * .5);
  }
  x.putImageData(im, 0, 0); rx.putImageData(rm, 0, 0);
  return { map: c, normal: normalFromHeight(h, o.relief || 3.2), rough: r };
}

/* ------------------------------------------- weathered vermilion · the gate
   Not a red cylinder. The gate is a painted timber that has stood out in the
   weather: the lacquer has crazed into a fine net, flaked off the edges back to
   the black wood underneath, and run in streaks where the rain came down it.
   So the wood is drawn first and the paint is laid over it at less than full
   coverage — the grain has to read *through* the red, which is what stops it
   looking like plastic. */
function texLacquer() {
  const W = 512, H = 512;
  const wood = texWood(131, { base: [34, 22, 17], boards: 0 });
  const c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d');
  const r = cvs(W, H), rx = r.getContext('2d');
  const rnd = mulberry32(5);
  x.drawImage(wood.map, 0, 0);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  rx.fillStyle = '#8c8c8c'; rx.fillRect(0, 0, W, H);   /* lacquer half-holds a sheen */

  /* the coat */
  x.globalAlpha = .80; x.fillStyle = '#7c1610'; x.fillRect(0, 0, W, H);
  x.globalAlpha = 1;
  /* pull the grain back through it */
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = .42;
  x.drawImage(wood.map, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  /* uneven pigment: the brush left it thicker in places */
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .5;
  x.drawImage(fbmCanvas(W, H, 313, 5, 3, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* craquelure — a wandering net of hairline cracks in the paint film */
  for (let i = 0; i < 190; i++) {
    let px = rnd() * W, py = rnd() * H, a = rnd() * TAU;
    x.strokeStyle = 'rgba(24,8,6,' + (.28 + rnd() * .4) + ')';
    hx.strokeStyle = 'rgba(0,0,0,.42)';
    x.lineWidth = hx.lineWidth = .5 + rnd() * .7;
    x.beginPath(); hx.beginPath(); x.moveTo(px, py); hx.moveTo(px, py);
    for (let k = 0; k < 5 + rnd() * 9; k++) {
      a += (rnd() - .5) * 1.5; px += Math.cos(a) * (5 + rnd() * 9); py += Math.sin(a) * (5 + rnd() * 9);
      x.lineTo(px, py); hx.lineTo(px, py);
    }
    x.stroke(); hx.stroke();
  }

  /* flaking: islands where the coat has lifted, showing the burnt wood, each
     with the pale shoulder of paint still standing at its edge */
  for (let i = 0; i < 40; i++) {
    const px = rnd() * W, py = rnd() * H, rad = 2 + rnd() * rnd() * 17;
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * TAU, rr = rad * (.55 + rnd() * .75);
      pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr]);
    }
    const path = d => {
      d.beginPath(); d.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) {
        const p = pts[k], q = pts[(k + 1) % pts.length];
        d.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      d.closePath();
    };
    x.save(); path(x); x.clip(); x.drawImage(wood.map, 0, 0);
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, W, H); x.restore();
    path(x); x.strokeStyle = 'rgba(196,110,76,.30)'; x.lineWidth = 1.2; x.stroke();
    path(hx); hx.fillStyle = 'rgba(0,0,0,.34)'; hx.fill();
    hx.strokeStyle = 'rgba(255,255,255,.30)'; hx.lineWidth = 1.6; hx.stroke();
    path(rx); rx.fillStyle = 'rgba(240,240,240,.75)'; rx.fill();   /* bare wood, matte */
  }

  /* rain running down the column */
  for (let i = 0; i < 120; i++) {
    const sx = rnd() * W, w = .6 + rnd() * 2.6, top = rnd() * H, len = H * (.2 + rnd() * .6);
    const g = x.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.3, rnd() > .5 ? 'rgba(12,4,4,.24)' : 'rgba(210,150,120,.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(sx, top, w, len);
  }
  rx.globalAlpha = .6; rx.globalCompositeOperation = 'multiply';
  rx.drawImage(fbmCanvas(W, H, 401, 4, 6, 1.2), 0, 0);
  rx.globalAlpha = 1; rx.globalCompositeOperation = 'source-over';
  return { map: c, normal: normalFromHeight(h, 2.2), rough: r };
}

/* the shoji screen the sun burns through */
function texShoji() {
  const W = 1024, H = 768, c = cvs(W, H), x = c.getContext('2d');
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(228,222,206,.055)'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(10,8,7,.88)';
  const cols = 12, rows = 9;
  x.lineWidth = 5;
  for (let i = 1; i < cols; i++) { x.beginPath(); x.moveTo(W / cols * i, 0); x.lineTo(W / cols * i, H); x.stroke(); }
  for (let j = 1; j < rows; j++) { x.beginPath(); x.moveTo(0, H / rows * j); x.lineTo(W, H / rows * j); x.stroke(); }
  x.lineWidth = 13; x.strokeStyle = 'rgba(8,6,5,.95)';
  x.strokeRect(0, 0, W, H);
  x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
  return c;
}

/* one maple leaf, white on transparent — tinted per instance */
function texLeaf() {
  const S = 128, c = cvs(S, S), x = c.getContext('2d');
  x.translate(S / 2, S * .92); x.scale(S / 2.2, -S / 2.2);
  x.beginPath();
  const lobes = 5, spread = 1.9;
  for (let i = 0; i < lobes; i++) {
    const a = -spread / 2 + spread * (i / (lobes - 1)) + Math.PI / 2;
    const len = i === 2 ? .96 : (i === 1 || i === 3 ? .82 : .60);
    const wob = .17;
    x.moveTo(0, .02);
    x.lineTo(Math.cos(a - wob) * len * .55, Math.sin(a - wob) * len * .55);
    x.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    x.lineTo(Math.cos(a + wob) * len * .55, Math.sin(a + wob) * len * .55);
    x.closePath();
  }
  x.fillStyle = '#fff'; x.fill();
  x.lineWidth = .05; x.strokeStyle = '#fff'; x.stroke();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  const rnd = mulberry32(3);
  for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(rnd() * S, rnd() * S, rnd() * 3, 0, TAU); x.fill(); }
  return c;
}

/* the night sky itself: black at altitude, going to the fog colour at the
   horizon so the backdrop and the depth cue meet without a seam */
function texSky() {
  const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(6,10,15)');    g.addColorStop(.34, 'rgb(13,22,31)');
  g.addColorStop(.66, 'rgb(17,26,34)'); g.addColorStop(.88, 'rgb(24,35,42)');
  g.addColorStop(1, 'rgb(14,22,28)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  /* cloud, and a low warm bloom off the valley behind the ridge */
  x.globalAlpha = .34; x.globalCompositeOperation = 'overlay';
  x.drawImage(fbmCanvas(W, H, 313, 5, 3, .9), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const wg = x.createRadialGradient(W * .68, H * .95, 4, W * .68, H * .95, W * .44);
  wg.addColorStop(0, 'rgba(150,66,26,.30)'); wg.addColorStop(.5, 'rgba(96,44,22,.12)');
  wg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = wg; x.fillRect(0, 0, W, H);
  /* a scatter of stars, faint enough to survive the bloom */
  const rnd = mulberry32(881);
  for (let i = 0; i < 420; i++) {
    const sx = rnd() * W, sy = rnd() * H * .78, r = .5 + rnd() * rnd() * 1.7;
    x.fillStyle = 'rgba(214,232,240,' + (.12 + rnd() * .42) * (1 - sy / H) + ')';
    x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
  }
  return c;
}

/* the wooded ridge the valley closes with — black, ragged, mostly fog */
function texRidge() {
  const W = 2048, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const n = noise2D(1207), rnd = mulberry32(1207);
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= W; i += 4) {
    const t = i / W;
    const ridge = .46 + .30 * (fbm(n, t * 2.4, .5, 4, 2.1, .55) * .5 + .5)
                      + .16 * (fbm(n, t * 7.5, 3.1, 3, 2.2, .5) * .5 + .5);
    x.lineTo(i, H - ridge * H * .84);
  }
  x.lineTo(W, H); x.closePath();
  x.fillStyle = '#050809'; x.fill();
  /* conifer spikes along the crest so the silhouette reads as forest */
  x.fillStyle = '#050809';
  for (let i = 0; i < 460; i++) {
    const px = rnd() * W, t = px / W;
    const ridge = .46 + .30 * (fbm(n, t * 2.4, .5, 4, 2.1, .55) * .5 + .5)
                      + .16 * (fbm(n, t * 7.5, 3.1, 3, 2.2, .5) * .5 + .5);
    const by = H - ridge * H * .84, hh = 8 + rnd() * 30, ww = 3 + rnd() * 6;
    x.beginPath(); x.moveTo(px, by - hh); x.lineTo(px + ww, by + 4); x.lineTo(px - ww, by + 4);
    x.closePath(); x.fill();
  }
  return c;
}

/* glazed roof tile — half-round caps running down the slope, weathered */
function texRoof() {
  const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d');
  x.fillStyle = '#151c20'; x.fillRect(0, 0, W, H);
  hx.fillStyle = '#606060'; hx.fillRect(0, 0, W, H);
  const ribs = 14, s = W / ribs;
  for (let i = 0; i < ribs; i++) {
    const g = x.createLinearGradient(i * s, 0, (i + 1) * s, 0);
    g.addColorStop(0, 'rgba(0,0,0,.62)');  g.addColorStop(.30, 'rgba(148,178,192,.13)');
    g.addColorStop(.66, 'rgba(84,110,124,.05)'); g.addColorStop(1, 'rgba(0,0,0,.62)');
    x.fillStyle = g; x.fillRect(i * s, 0, s, H);
    x.fillStyle = 'rgba(0,0,0,.50)'; x.fillRect(i * s - 3, 0, 6, H);
    x.fillStyle = 'rgba(168,196,208,.09)'; x.fillRect(i * s - 1.2, 0, 1.6, H);
    /* the half-round cap itself, as height: the valley between two tiles is
       the only reason a tiled roof reads as tiled at this distance */
    const hg = hx.createLinearGradient(i * s, 0, (i + 1) * s, 0);
    hg.addColorStop(0, '#2c2c2c'); hg.addColorStop(.5, '#eaeaea'); hg.addColorStop(1, '#2c2c2c');
    hx.fillStyle = hg; hx.fillRect(i * s, 0, s, H);
  }
  /* the courses running down the slope — each tile overlaps the one below */
  const rnd = mulberry32(211);
  for (let y = 0; y < H; y += H / 9) {
    x.fillStyle = 'rgba(0,0,0,.34)'; x.fillRect(0, y, W, 3.5);
    hx.fillStyle = 'rgba(0,0,0,.55)'; hx.fillRect(0, y, W, 3.5);
    hx.fillStyle = 'rgba(255,255,255,.28)'; hx.fillRect(0, y + 3.5, W, 2);
    for (let i = 0; i < 26; i++) {                     /* chipped, mossed edges */
      x.fillStyle = rnd() > .5 ? 'rgba(0,0,0,.30)' : 'rgba(96,116,92,.10)';
      x.fillRect(rnd() * W, y + 1, 2 + rnd() * 9, 2 + rnd() * 3);
    }
  }
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .46;
  x.drawImage(fbmCanvas(256, 256, 211, 5, 3, 1), 0, 0, W, H);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  hx.globalAlpha = .3; hx.drawImage(fbmCanvas(256, 256, 213, 4, 16, 1.2), 0, 0, W, H);
  hx.globalAlpha = 1;
  return { map: c, normal: normalFromHeight(h, 2.2) };
}

/* -------------------------------------------------------- the blood moon
   A real lunar disc, not a glow sprite and not a noise field. Three things do
   the work, in this order of importance:

     1 · the maria. The dark seas are the Moon's signature and they are not
         fbm — they are a handful of large, lobed, soft-edged basins in a
         layout everyone has known since childhood. Drawn at their real
         near-side positions and blurred, they are what makes the disc read as
         the Moon at a glance instead of as a planet.
     2 · the ray systems. Fine bright streaks thrown out of Tycho and
         Copernicus, straight across the maria. Nothing else on the surface
         looks like this, so nothing else identifies it as fast.
     3 · the craters, thickest in the bright highlands, each with a rim lit
         from the same side as the rest of the frame.

   The tint is measured off the reference plate, not invented: a blood moon
   sits at G/R ≈ B/R ≈ .48 — a rose red with green and blue level. Grading it
   as an orange (blue well under green) is what makes a CG moon read as a
   fireball, and that is what this was doing. The disc is authored here in
   near-neutral albedo and the colour is applied once, on the material. */
function texMoon() {
  const S = 512, c = cvs(S, S), x = c.getContext('2d');
  const R = S / 2 - 1, rnd = mulberry32(91);
  const px = (u, v) => [S / 2 + u * R, S / 2 + v * R];        /* disc coords */

  x.beginPath(); x.arc(S / 2, S / 2, R, 0, TAU); x.closePath();
  x.save(); x.clip();

  /* highland base. The reference disc is very slightly brighter at the limb,
     not darker — during totality the rim keeps its forward scatter — so this
     ramp opens outward instead of falling off. */
  const g = x.createRadialGradient(S * .46, S * .44, S * .05, S / 2, S / 2, R);
  g.addColorStop(0, 'rgb(150,150,150)'); g.addColorStop(.55, 'rgb(158,158,158)');
  g.addColorStop(.86, 'rgb(178,178,178)'); g.addColorStop(1, 'rgb(196,196,196)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);

  /* fine highland mottle */
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .5;
  x.drawImage(fbmCanvas(256, 256, 517, 6, 4, 1.1), 0, 0, S, S);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* --- 1 · the maria, at their near-side places (u right, v down) --------- */
  const seas = [
    [-.52, -.06, .46, .80],   /* Oceanus Procellarum */
    [-.26, -.38, .31, .92],   /* Imbrium             */
    [ .13, -.31, .20, .88],   /* Serenitatis         */
    [ .30, -.08, .23, .84],   /* Tranquillitatis     */
    [ .45,  .12, .15, .78],   /* Fecunditatis        */
    [ .27,  .27, .12, .74],   /* Nectaris            */
    [ .57, -.30, .12, .95],   /* Crisium, the one that stands on its own */
    [-.27,  .30, .19, .70],   /* Nubium              */
    [-.47,  .25, .13, .72],   /* Humorum             */
  ];
  const sea = cvs(S, S), sx = sea.getContext('2d');
  seas.forEach(([u, v, rad, dk]) => {
    /* a basin is a cluster of lobes, never a circle */
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU, off = rnd() * rad * .66;
      const [bx, by] = px(u + Math.cos(a) * off, v + Math.sin(a) * off * .8);
      const rr = rad * R * (.30 + rnd() * .46);
      const bg = sx.createRadialGradient(bx, by, rr * .2, bx, by, rr);
      bg.addColorStop(0, 'rgba(0,0,0,' + (dk * .14).toFixed(3) + ')');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      sx.fillStyle = bg; sx.beginPath(); sx.arc(bx, by, rr, 0, TAU); sx.fill();
    }
  });
  /* a sea is dark, not black: the real mare/highland contrast is about 4:3,
     and anything heavier turns the disc into a skull */
  x.save(); x.filter = 'blur(9px)'; x.globalAlpha = .90;
  x.drawImage(sea, 0, 0); x.restore();
  /* mottle riding on top of the basins so their floors are not flat washes */
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .18;
  x.drawImage(fbmCanvas(256, 256, 811, 4, 11, 1.2), 0, 0, S, S);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* --- 2 · ray systems, thrown clear across the disc ---------------------- */
  const ray = cvs(S, S), rx2 = ray.getContext('2d');
  [[-.10, .54, 150, 1], [-.28, -.07, 80, .6], [-.46, -.04, 60, .45]].forEach(([u, v, n, str]) => {
    const [ox, oy] = px(u, v);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, len = R * (.30 + rnd() * rnd() * 1.3);
      /* start clear of the crater — rays converging on a point read as a
         lens flare, and the real ones begin outside the ejecta blanket */
      const t0 = R * (.08 + rnd() * .06);
      const p0 = [ox + Math.cos(a) * t0, oy + Math.sin(a) * t0];
      const p1 = [ox + Math.cos(a) * len, oy + Math.sin(a) * len];
      const rg = rx2.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
      rg.addColorStop(0, 'rgba(255,255,255,' + (.085 * str).toFixed(3) + ')');
      rg.addColorStop(.4, 'rgba(255,255,255,' + (.055 * str).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      rx2.strokeStyle = rg; rx2.lineWidth = .8 + rnd() * 2.4; rx2.lineCap = 'round';
      rx2.beginPath(); rx2.moveTo(p0[0], p0[1]);
      rx2.quadraticCurveTo(ox + Math.cos(a + .06) * len * .55, oy + Math.sin(a + .06) * len * .55,
                           p1[0], p1[1]);
      rx2.stroke();
    }
  });
  x.save(); x.filter = 'blur(2.4px)'; x.globalCompositeOperation = 'lighter';
  x.globalAlpha = .62; x.drawImage(ray, 0, 0); x.restore();

  /* --- 3 · the crater field ----------------------------------------------
     A crater is not a ring. Stroked with a gradient running across it, the
     same circle gives a rim lit on the sun side and thrown into shadow on the
     other — which is the read — where a radial ring gives a bubble. */
  const inSea = (u, v) => seas.some(([su, sv, rad]) =>
    Math.hypot(u - su, (v - sv) * 1.15) < rad * .82);
  for (let i = 0; i < 620; i++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * .97;
    const u = Math.cos(a) * rr, v = Math.sin(a) * rr;
    /* the seas are young and nearly unmarked — that contrast is the point */
    if (inSea(u, v) && rnd() > .12) continue;
    const [cx2, cy] = px(u, v);
    const big = rnd() > .975;
    const r = (1 + rnd() * rnd() * rnd() * (big ? 34 : 11)) * (S / 512);
    const fade = .55 + .45 * Math.sqrt(Math.max(0, 1 - rr * rr));   /* limb falloff */
    /* foreshortened toward the limb, like anything on a sphere */
    const sq = Math.sqrt(Math.max(0, 1 - rr * rr)) * .72 + .28;
    x.save(); x.translate(cx2, cy); x.rotate(Math.atan2(v, u)); x.scale(sq, 1);
    x.rotate(-Math.atan2(v, u));                       /* keep the sun direction */
    const rimW = Math.max(.8, r * .26);
    const lg = x.createLinearGradient(-r, -r, r, r);   /* sun sits up-left */
    lg.addColorStop(0, 'rgba(255,255,255,' + (.34 * fade).toFixed(3) + ')');
    lg.addColorStop(.5, 'rgba(255,255,255,0)');
    lg.addColorStop(1, 'rgba(0,0,0,' + (.38 * fade).toFixed(3) + ')');
    x.strokeStyle = lg; x.lineWidth = rimW;
    x.beginPath(); x.arc(0, 0, Math.max(.6, r - rimW * .5), 0, TAU); x.stroke();
    if (r > 3) {                                        /* the floor it encloses */
      const fg = x.createLinearGradient(-r, -r, r, r);
      fg.addColorStop(0, 'rgba(0,0,0,' + (.21 * fade).toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(255,255,255,' + (.07 * fade).toFixed(3) + ')');
      x.fillStyle = fg; x.beginPath(); x.arc(0, 0, r - rimW, 0, TAU); x.fill();
    }
    if (r > 13) {                                       /* central peak */
      x.fillStyle = 'rgba(255,255,255,' + (.14 * fade).toFixed(3) + ')';
      x.beginPath(); x.arc(-r * .04, -r * .04, r * .11, 0, TAU); x.fill();
    }
    x.restore();
  }

  /* surface tooth: genuinely fine, or it just adds another layer of cloud
     and the basins disappear under it */
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .13;
  x.drawImage(fbmCanvas(S, S, 977, 2, 210, 1.3), 0, 0, S, S);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* the terminator side: the disc is not lit dead-on */
  const sh = x.createRadialGradient(S * .40, S * .38, S * .18, S * .52, S * .56, S * .72);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.30)');
  x.fillStyle = sh; x.fillRect(0, 0, S, S);
  x.restore();

  /* a one-pixel feather on the limb so it is a moon in air, not a cut disc */
  const fe = x.createRadialGradient(S / 2, S / 2, R - 2.5, S / 2, S / 2, R);
  fe.addColorStop(0, 'rgba(0,0,0,1)'); fe.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = fe; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'source-over';
  return c;
}

/* soft round falloff — haze, embers, glows */
function texGlow(inner, mid) {
  const S = 256, c = cvs(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner || 'rgba(255,255,255,1)');
  g.addColorStop(.28, mid || 'rgba(255,255,255,.36)');
  g.addColorStop(.62, 'rgba(255,255,255,.07)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return c;
}

/* one wisp — a round mote, not a streak. The whole read is a hard bright
   point sitting in a soft halo, so the falloff is deliberately uneven: almost
   all of the light is spent inside the first eighth of the radius and the rest
   is a wide, very faint bloom. A smooth gradient across the full radius gives
   an evenly lit blob with no centre to it. */
function texWisp() {
  const S = 128, c = cvs(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0,   'rgba(255,255,255,1)');      /* the point itself */
  g.addColorStop(.07, 'rgba(236,250,250,.92)');
  g.addColorStop(.16, 'rgba(190,230,238,.40)');
  g.addColorStop(.34, 'rgba(132,192,212,.13)');
  g.addColorStop(.62, 'rgba(88,146,172,.035)');
  g.addColorStop(1,   'rgba(70,120,142,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return c;
}

/* ---------------------------------------------- 3 · the foreground cut-outs
   These are the "transparent PNG" layers: painted at high resolution with
   a ragged alpha edge, then hung in front of the type as real geometry so
   they parallax and sway.                                                */
function texGrassCutout(seed, opt) {
  opt = opt || {};
  const W = opt.w || 2048, H = opt.h || 1024;
  const c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(seed), n = noise2D(seed * 13 + 5);

  /* --- silhouette ------------------------------------------------- */
  const crest = opt.crest !== undefined ? opt.crest : .46;
  const peak  = opt.peak  !== undefined ? opt.peak  : .60;
  const wide  = opt.wide  !== undefined ? opt.wide  : .40;
  const prof = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const t = i / W;
    let m = Math.exp(-Math.pow((t - crest) / wide, 2) * 2.1);
    m += .46 * Math.exp(-Math.pow((t - crest - (opt.crest2 || .40)) / (wide * .62), 2) * 3.1);
    m += .30 * Math.exp(-Math.pow((t - crest + (opt.crest3 || .46)) / (wide * .70), 2) * 3.4);
    const g = fbm(n, t * 4.2, .5, 4, 2.05, .52) * .5 + .5;
    prof[i] = m * (.80 + .38 * g);
  }
  let pk = 0; for (let i = 0; i < W; i++) pk = Math.max(pk, prof[i]);
  for (let i = 0; i < W; i++) prof[i] *= H * peak / pk;
  const surf = i => H - prof[clamp(i | 0, 0, W - 1)];

  /* --- body ------------------------------------------------------- */
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i < W; i += 3) x.lineTo(i, surf(i));
  x.lineTo(W, surf(W - 1)); x.lineTo(W, H); x.closePath();
  const bg = x.createLinearGradient(0, H - H * peak, 0, H);
  bg.addColorStop(0, '#1a2416'); bg.addColorStop(.38, '#0e150c'); bg.addColorStop(1, '#040604');
  x.fillStyle = bg; x.fill();
  x.save(); x.clip();
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = .5;
  x.drawImage(fbmCanvas(1024, 512, seed + 3, 5, 3, 1), 0, 0, W, H);
  x.restore();
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

  /* --- blades ----------------------------------------------------- */
  const LIGHT = opt.light || [-.42, -.91];            /* light comes from up-left */
  const N = opt.blades || 15000;
  const blades = [];
  for (let k = 0; k < N; k++) {
    const i = (rnd() * W) | 0;
    const s = surf(i);
    /* bias the population toward the silhouette so the edge stays ragged */
    const depth = Math.pow(rnd(), 2.3);
    const by = s + depth * (H - s) + (rnd() - .5) * 6;
    if (by > H + 20) continue;
    blades.push({ i: i, by: by, depth: depth, r: rnd(), r2: rnd(), r3: rnd() });
  }
  blades.sort((a, b) => a.by - b.by);                 /* far (high) first */

  const LEN = (opt.len || 46) * (W / 2048);
  for (let k = 0; k < blades.length; k++) {
    const b = blades[k];
    const bx = b.i + (b.r - .5) * 5;
    const grow = 1 - .52 * b.depth;
    const len = LEN * (.36 + 1.05 * b.r2 * b.r2) * grow;
    let lean = (b.r3 - .5) * 1.5 + (opt.wind || .16);
    /* blades on the sunward flank lean into frame */
    const tipx = bx + lean * len * .95, tipy = b.by - len;
    const cx2 = bx + lean * len * .30, cy2 = b.by - len * .62;
    const w = (.9 + 1.9 * b.r) * grow * (W / 2048);

    /* shade: facing the key light, plus exposure to the sky at the crest */
    const dx = tipx - bx, dy = tipy - b.by, il = 1 / Math.hypot(dx, dy);
    const ndl = sat((-(dx * il) * LIGHT[0] - (dy * il) * LIGHT[1]) * .5 + .5);
    const open = Math.pow(1 - b.depth, 1.35);
    let l = .10 + .46 * open + .34 * ndl * open;
    const warm = sat(open * 1.25 - .42) * (opt.warm !== undefined ? opt.warm : 1);
    const r = (10 + 78 * l + 44 * warm) * (opt.tintR || 1);
    const g = (16 + 106 * l + 24 * warm) * (opt.tintG || 1);
    const bl = (12 + 80 * l + 16 * warm) * (opt.tintB || 1);
    x.fillStyle = hex(r, g, bl);
    x.beginPath();
    x.moveTo(bx - w, b.by);
    x.quadraticCurveTo(cx2 - w * .35, cy2, tipx, tipy);
    x.quadraticCurveTo(cx2 + w * .35, cy2, bx + w, b.by);
    x.closePath(); x.fill();
  }

  /* --- grade: red bounce from the sun, cold sky on the crest ------- */
  x.globalCompositeOperation = 'source-atop';
  const rb = x.createLinearGradient(opt.bounceFrom || W, 0, opt.bounceTo || 0, 0);
  rb.addColorStop(0, 'rgba(180,40,16,.24)'); rb.addColorStop(.55, 'rgba(140,32,14,.07)'); rb.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = rb; x.fillRect(0, 0, W, H);
  const sk = x.createLinearGradient(0, H - H * peak * 1.05, 0, H);
  sk.addColorStop(0, 'rgba(146,182,180,.13)'); sk.addColorStop(.5, 'rgba(0,0,0,0)'); sk.addColorStop(1, 'rgba(0,0,0,.70)');
  x.fillStyle = sk; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  return c;
}

/* wet foreground boulders */
function texRockCutout(seed, opt) {
  opt = opt || {};
  const W = opt.w || 1536, H = opt.h || 1024;
  const c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(seed), n = noise2D(seed * 7 + 11);
  const blobs = opt.blobs || [[.30, .70, .40, .34], [.66, .82, .38, .28], [.46, .96, .52, .34]];

  blobs.forEach((b, bi) => {
    const cx2 = b[0] * W, cy = b[1] * H, rx = b[2] * W * .5, ry = b[3] * H * .8;
    x.beginPath();
    for (let a = 0; a <= 128; a++) {
      const t = a / 128 * TAU;
      const k = 1 + .17 * fbm(n, Math.cos(t) * 1.7 + bi * 9, Math.sin(t) * 1.7, 4, 2.1, .55);
      const px = cx2 + Math.cos(t) * rx * k, py = cy + Math.sin(t) * ry * k;
      a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.closePath();
    const g = x.createLinearGradient(cx2 - rx, cy - ry, cx2 + rx * .4, cy + ry);
    const s = 1 - bi * .16;
    g.addColorStop(0, hex(30 * s, 39 * s, 40 * s));
    g.addColorStop(.42, hex(14 * s, 19 * s, 20 * s));
    g.addColorStop(1, hex(6, 9, 9));
    x.fillStyle = g; x.fill();
    x.save(); x.clip();
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = .62;
    x.drawImage(fbmCanvas(768, 512, seed + bi * 31, 6, 4, 1.1), 0, 0, W, H);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    /* facets */
    for (let f = 0; f < 26; f++) {
      x.beginPath();
      const fx = cx2 + (rnd() - .5) * rx * 2, fy = cy + (rnd() - .5) * ry * 1.6;
      x.moveTo(fx, fy);
      for (let v = 0; v < 3; v++) x.lineTo(fx + (rnd() - .5) * rx * .8, fy + (rnd() - .5) * ry * .6);
      x.closePath();
      x.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.030)' : 'rgba(0,0,0,.14)';
      x.fill();
    }
    /* wet highlight along the upper rim */
    x.lineWidth = 3 + rnd() * 4; x.strokeStyle = 'rgba(178,206,206,.20)';
    x.beginPath();
    for (let a = 0; a <= 60; a++) {
      const t = Math.PI + a / 60 * Math.PI * .78;
      const k = 1 + .17 * fbm(n, Math.cos(t) * 1.7 + bi * 9, Math.sin(t) * 1.7, 4, 2.1, .55);
      const px = cx2 + Math.cos(t) * rx * k * .97, py = cy + Math.sin(t) * ry * k * .97;
      a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.stroke();
    x.restore();
  });

  /* a little moss where they meet the ground */
  x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2600; i++) {
    const px = rnd() * W, py = H - Math.pow(rnd(), 1.7) * H * .5;
    x.fillStyle = 'rgba(' + (40 + rnd() * 40 | 0) + ',' + (60 + rnd() * 46 | 0) + ',34,' + (.05 + rnd() * .22) + ')';
    x.fillRect(px, py, 1.6 + rnd() * 2.4, 3 + rnd() * 9);
  }
  const rb = x.createLinearGradient(W, 0, 0, 0);
  rb.addColorStop(0, 'rgba(190,48,22,.16)'); rb.addColorStop(.7, 'rgba(0,0,0,0)');
  x.fillStyle = rb; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  return c;
}

/* a maple bough leaning into the top of frame */
function texBranchCutout(seed) {
  const W = 1536, H = 1024;
  const c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(seed);
  const leaves = [];

  function bough(px, py, ang, len, wid, depth) {
    const steps = 7;
    let cx2 = px, cy = py, a = ang;
    x.beginPath(); x.moveTo(cx2, cy);
    for (let s = 0; s < steps; s++) {
      a += (rnd() - .5) * .30;
      cx2 += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps;
      x.lineTo(cx2, cy);
    }
    x.lineCap = 'round'; x.lineWidth = wid;
    x.strokeStyle = 'rgba(' + (26 + depth * 5 | 0) + ',' + (22 + depth * 4 | 0) + ',' + (22 + depth * 4 | 0) + ',1)';
    x.stroke();
    if (depth < 4 && len > 34) {
      const k = depth === 0 ? 3 : 2;
      for (let i = 0; i < k; i++) bough(cx2, cy, a + (rnd() - .5) * 1.25, len * (.58 + rnd() * .18), wid * .58, depth + 1);
    } else {
      for (let i = 0; i < 9; i++)
        leaves.push([cx2 + (rnd() - .5) * 78, cy + (rnd() - .5) * 78, rnd() * TAU, 12 + rnd() * 20, rnd()]);
    }
  }
  bough(W * 1.02, H * .06, Math.PI * .78, 420, 26, 0);
  bough(W * .86, -H * .02, Math.PI * .62, 330, 18, 1);

  const leafImg = texLeaf();
  const tint = cvs(128, 128), tx = tint.getContext('2d');
  leaves.forEach(l => {
    tx.clearRect(0, 0, 128, 128);
    tx.drawImage(leafImg, 0, 0);
    tx.globalCompositeOperation = 'source-in';
    const v = l[4];
    tx.fillStyle = hex(96 + v * 96, 14 + v * 22, 16 + v * 18);
    tx.fillRect(0, 0, 128, 128);
    tx.globalCompositeOperation = 'source-over';
    x.save(); x.translate(l[0], l[1]); x.rotate(l[2]);
    x.globalAlpha = .78 + v * .22;
    x.drawImage(tint, -l[3], -l[3], l[3] * 2, l[3] * 2);
    x.restore();
  });
  x.globalAlpha = 1;
  return c;
}

export {
  mulberry32, noise2D, fbm, cvs, fbmCanvas, normalFromHeight,
  texWall, texFloor, texWood, texStone, texLacquer, texShoji, texLeaf,
  texSky, texRidge, texRoof, texMoon, texGlow, texWisp,
  texGrassCutout, texRockCutout, texBranchCutout,
}
