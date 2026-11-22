/* FROGGER - arcade remake. Hand-drawn sprites, synthesized audio. No ROM data. */
(function () {
"use strict";
const W = 224, H = 256, T = 8, HZ = 60.606061;
const HOP_FRAMES = 9, HOP_STEP = 2, HOP_PX = 16;
const TIME_TICKS = 60, TICK_FRAMES = 30, WARN_TICKS = 20, LIVES0 = 3, EXTRA_AT = 20000;
const view = document.getElementById("game");
const vctx = view.getContext("2d");
const off = document.createElement("canvas"); off.width = W; off.height = H;
const octx = off.getContext("2d");
const img = octx.createImageData(W, H), fb = new Uint32Array(img.data.buffer);

const rgb = h => { const n = parseInt(h.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
const COL = {
  k: rgb("#000000"), blu: rgb("#0000ff"), mag: rgb("#e03ed9"), red: rgb("#e00000"),
  grn: rgb("#1dc300"), org: rgb("#e03e00"), cyn: rgb("#00c3d9"), yel: rgb("#e0e000"),
  wht: rgb("#f7f7ff"), pnk: rgb("#e03ed9"), pur: rgb("#8500d9"), dgr: rgb("#2a8a00"),
  brn: rgb("#c35b45"), pnk2: rgb("#e03ed9"), sky: rgb("#3c3cff"), navy: rgb("#000047"),
  log: rgb("#c35b45"), logHi: rgb("#e08a62"), logDk: rgb("#855b45"), bush: rgb("#1dc300"),
  veh: rgb("#c3c3d9"), lime: rgb("#85e000"), dirt: rgb("#e03e00")
};

/* row tops, 16 px bands */
const Y_SCORE = 0, Y_HOME = 16, Y_BUSH = 24, Y_LAND = 32;
const Y_RIV = [48, 64, 80, 96, 112], Y_MED = 128;
const Y_ROAD = [144, 160, 176, 192, 208], Y_WALK = 224, Y_STAT = 240;
const BAY_X = [6, 54, 102, 150, 198], BAY_W = 20; /* 20 px notched bays, 48 px centers, measured from MAME */
/* River objects wrap on a 256 px period (W+32), matching MAME group spacing:
   4 turtle packs every 64 px with 16 px water gaps; 2 long logs every 128 px. */
const RIVER_PERIOD = 256;

function cls(c) { fb.fill(c); }
function pset(x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) fb[y * W + x] = c; }
function fillR(x, y, w, h, c) {
  x |= 0; y |= 0;
  for (let j = 0; j < h; j++) {
    const yy = y + j; if (yy < 0 || yy >= H) continue;
    const row = yy * W;
    for (let i = 0; i < w; i++) { const xx = x + i; if (xx >= 0 && xx < W) fb[row + xx] = c; }
  }
}

/* ---------- sprites: letter pixels, hand-drawn to match the arcade look ---------- */
/* . empty  g green  d dark green  w white  r red  y yellow  o orange  c cyan  m magenta  p pink  b blue  n brown  k black */
const CM = { g: "grn", d: "dgr", w: "wht", r: "red", y: "yel", o: "org", c: "cyn", m: "mag", p: "pnk2", b: "blu", n: "brn", k: "k", u: "pur", s: "sky", v: "veh", i: "lime", e: "dirt", a: "logDk" };
function pack(s) { return s.trim().split(/\s+/); }
const SPR = {
  frogU: pack(`
................ ................ ...g..yy..g..... ..gg.yyyy.gg.... ..g.iiiiii.g.... .gg.iyyyyi.gg... .g...iiii...g... .....iiii....... ...g..ii..g..... ...g......g..... ................ ................ ................ ................ ................ ................`),
  frogU2: pack(`
................ ................ ....g.yy.g...... ...g.yyyy.g..... ..g.iiiiii.g.... .g..iyyyyi..g... g....iiii....g.. .....iiii....... ....g.ii.g...... ................ ................ ................ ................ ................ ................ ................`),
  frogD: pack(`
................ ................ ...g......g..... ...g..ii..g..... .....iiii....... .g...iiii...g... .gg.iyyyyi.gg... ..g.iiiiii.g.... ..gg.yyyy.gg.... ...g..yy..g..... ................ ................ ................ ................ ................ ................`),
  frogL: pack(`
................ ................ ....ggg......... ...giiiig.g..... ..giiiiiigg..... .gyyiiiiii...... .gyyiiiiii...... ..giiiiiigg..... ...giiiig.g..... ....ggg......... ................ ................ ................ ................ ................ ................`),
  frogR: pack(`
................ ................ .........ggg.... .....g.giiiig... .....ggiiiiiig.. ......iiiiiiyg.. ......iiiiiiyg.. .....ggiiiiiig.. .....g.giiiig... .........ggg.... ................ ................ ................ ................ ................ ................`),
  ladyU: pack(`
................ ................ ...p..cc..p..... ..pp.cccc.pp.... ..p.cccccc.p.... .pp.c.ccc.pp.... .p...cccc...p... .....cccc....... ...p..cc..p..... ...p......p..... ................ ................ ................ ................ ................ ................`),
  carY: pack(`
................ .............rr. .......yyy...rr. .....yyyyyy..rr. ..ggyyyyyyyyy... .uuuuyyyrrryy... ..ggyyyyyyyyy... .....yyyyyy..rr. .......yyy...rr. .............rr. ................ ................ ................ ................ ................ ................`),
  carP: pack(`
................ ................ ................ .pppp.....pppp.. ppcccc...ccccpp. ppccccpccccccpp. ppppppppppppppp. .iipp.....ppii.. ................ ................ ................ ................ ................ ................ ................ ................`),
  dozer: pack(`
................ ................ .rvrv......g.... .rvrv....vvvvg.. .rvrv.vvvvvvvggg .rvrv.vvggvvvggg .rvrv.vvvvvvvggg .rvrv....vvvvg.. .rvrv......g.... ................ ................ ................ ................ ................ ................ ................`),
  racer: pack(`
................ .rr............. .rr..vvvv....... .rr.vvvvvv...... ....vvvvvvvvgg.. ....vvvgggggggg. ....vvvvvvvvgg.. .rr.vvvvvv...... .rr..vvvv....... .rr............. ................ ................ ................ ................ ................ ................`),
  truck: pack(`
...........................
...........................
...........................
......gg...........gg......
.vvvvvvvvvvvvvvvvvvvrrv....
vvvvvvvvvvvvvvvvvvvvvrrvgg.
vvvvvvvvvvvvvvvvvvvvvrrvgg.
.vvvvvvvvvvvvvvvvvvvrrv....
......gg...........gg......
...........................
...........................
...........................
...........................
...........................
...........................
...........................`),
  turt: pack(`
................ ................ .....g....g..... ...g.rrrrrr.g... ..g.rrrrrrrr.g.. ...rrrvvvvrrr... ...rrrrrrrrrr... ..g.rrrrrrrr.g.. ...g......g..... ................ ................ ................ ................ ................ ................ ................`),
  turtDive: pack(`
................ ................ ................ ......g..g...... .....gggggg..... ......gvvv...... .......gg....... ................ ................ ................ ................ ................ ................ ................ ................ ................`),
  turtDown: pack(`
................ ................ ................ ................ ................ ......g..g...... .......gg....... ................ ................ ................ ................ ................ ................ ................ ................ ................`),
  turtR: pack(`
................ ................ .....g....g..... ...g.rrrrrr.g... ..g.rrrrrrrr.g.. ...rrrvvvvrrr... ...rrrrrrrrrr... ..g.rrrrrrrr.g.. ...g......g..... ................ ................ ................ ................ ................ ................ ................`),
  turtRDive: pack(`
................ ................ ................ ......g..g...... .....gggggg..... ......gvvv...... .......gg....... ................ ................ ................ ................ ................ ................ ................ ................ ................`),
  turtRDown: pack(`
................ ................ ................ ................ ................ ......g..g...... .......gg....... ................ ................ ................ ................ ................ ................ ................ ................ ................`),
  croc: pack(`
................................................
......................................n.........
................n.n.n.n.n.n.........nn.n........
.....n........nnnnnnnnnnnnnnn.....nnn...n.......
....nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn.w.n.......
..nnnnnnnnnnnnnnnvnvnvnvnnnnnnnnnnnnn...nn......
.nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn.w...n.....
nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn.....n.....
.................vv.vv.vv.vv.v.....vv.vv........
................................................
................................................
................................................
................................................
................................................
................................................
................................................`),
  snake: pack(`
................................ ................................ .iiii........................... iiiiiii...iiii.................. .iiiiiiiiiiiii.....iiii......... ...iiiiiiii.....iiiiiiii....ii.. ...............iiiiiii....iiii.. ..................ii.........i.. ................................ ................................ ................................ ................................ ................................ ................................ ................................ ................................`),
  otter: pack(`
................ ................ ..........nn.... ........nnnnn... .....nnnnnnnn... ..nnnnnnnnnnn... .nnnnn...vv..... ..nn....v.vv.... ..............v. ................ ................ ................ ................ ................ ................ ................`),
  fly: pack(`
.c..e... .cccec.. ..ceec.. .cccecc. ..e..c.. ........ ........ ........`),
  homeFrog: pack(`
................ ................ ....g.yy.g...... ...gg....gg..... ...g.g..g.g..... ..gg..rr..gg.... ..g..ccccc.g.... .....ccrcc...... ......ccc....... ................ ................ ................ ................ ................ ................ ................`),
  homeCroc: pack(`
................ ................ ..........ee.... ........eee..... .......ee.ee.... .....eeee..e.... ....eeeeeeee.... ...eeee..eee.... ..eee.....ee.... .ee.........e... ................ ................ ................ ................ ................ ................`),
  splat: pack(`
......g.......g. .g...ggg...g.... ..g.g...g.g..... ...g.g.g.g...... g...ggggg...g... ..g.ggggg.g..... ...gg...gg...... .g..g.g.g..g.... ....g...g....... .g.........g.... ................ ................ ................ ................ ................ ................`),
  splash: pack(`
......c......c.. .c...ccc...c.... ..c.c...c.c..... c...ccccc...c... ..c.ccccc.c..... ...cc...cc...... .c..c.c.c..c.... ....c...c....... .c.........c.... ................ ................ ................ ................ ................ ................ ................`)

};

function blit(spr, x, y, flipX, flipY) {
  x |= 0; y |= 0;
  const h = spr.length, w = spr[0].length;
  for (let j = 0; j < h; j++) {
    const row = spr[flipY ? h - 1 - j : j];
    const yy = y + j; if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < w; i++) {
      const ch = row[flipX ? w - 1 - i : i];
      if (!ch || ch === ".") continue;
      const key = CM[ch]; if (!key) continue;
      const xx = x + i; if (xx < 0 || xx >= W) continue;
      fb[yy * W + xx] = COL[key];
    }
  }
}
function blitRep(spr, x, y, n) {
  const w = spr[0].length;
  for (let i = 0; i < n; i++) blit(spr, x + i * w, y);
}

/* ---------- font ---------- */
function glyph(ch) { return (window.FFONT && window.FFONT[ch]) || window.FFONT[" "] || [0,0,0,0,0,0,0,0]; }
function text(str, x, y, c, sp) {
  sp = sp == null ? 8 : sp;
  x |= 0; y |= 0;
  for (let i = 0; i < str.length; i++) {
    const g = glyph(str[i]);
    for (let r = 0; r < 8; r++) {
      const bits = g[r], yy = y + r; if (yy < 0 || yy >= H) continue;
      for (let b = 0; b < 8; b++) if (bits & (0x80 >> b)) {
        const xx = x + i * sp + b; if (xx >= 0 && xx < W) fb[yy * W + xx] = c;
      }
    }
  }
}
function textC(str, y, c) { text(str, (W - str.length * 8) >> 1, y, c); }
function scoreStr(n) { n = Math.max(0, Math.min(99990, n | 0)); return String(n).padStart(5, "0"); }

/* ---------- audio (AY-style squares + noise, 3 voices) ---------- */
try { ["frog_muted", "frog_muted_v2", "muted"].forEach(k => localStorage.removeItem(k)); } catch (_) {}
let muted = false, unlocked = false, AC = null, master = null, musicOn = false;
function audio() {
  if (!AC) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    AC = new Ctor();
    master = AC.createGain();
    master.gain.value = muted ? 0 : 0.28;
    master.connect(AC.destination);
  }
  if (AC.state === "suspended") AC.resume().catch(() => {});
  if (!unlocked) {
    try { const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0); unlocked = true; } catch (_) {}
  }
}
const quiet = () => !AC || muted || (state === "attract" && attractMode !== "demo") || demoSilent;
let demoSilent = true;
function tone(freq, dur, type, vol, slide) {
  if (quiet() || !AC) return;
  const t0 = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(Math.max(20, freq), t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
  g.gain.setValueAtTime(vol == null ? 0.12 : vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol, freq) {
  if (quiet() || !AC) return;
  const n = (AC.sampleRate * dur) | 0, buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  let acc = 0, s = 1;
  for (let i = 0; i < n; i++) { s ^= s << 13; s ^= s >> 17; s ^= s << 5; d[i] = ((s & 255) / 128 - 1) * (1 - i / n); }
  const src = AC.createBufferSource(); src.buffer = buf;
  const g = AC.createGain(), f = AC.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq || 800; f.Q.value = 0.7;
  g.gain.value = vol == null ? 0.2 : vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
}

/* note helpers: midi to hz */
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
let song = null, songT = 0, songI = [0, 0], songWait = [0, 0];
function playSong(name) { song = SONGS[name] || null; songT = 0; songI = [0, 0]; songWait = [0, 0]; musicOn = !!song; }
function stopSong() { song = null; musicOn = false; }
function tickMusic() {
  if (!song || quiet() || !AC) return;
  for (let v = 0; v < 2; v++) {
    const tr = song[v]; if (!tr || !tr.length) continue;
    if (songWait[v] > 0) { songWait[v]--; continue; }
    if (songI[v] >= tr.length) {
      if (song.loop) songI[v] = 0; else continue;
    }
    const ev = tr[songI[v]++];
    const note = ev[0], frames = ev[1], vol = ev[2] || 0.07;
    songWait[v] = frames;
    if (note > 0) tone(hz(note), frames / HZ * 0.95, "square", vol);
  }
}

/* Compact songs: [midi, frames] (frames at 60.6 Hz). Transcribed to sound like the arcade themes. */
const SONGS = {
  /* Note-accurate from the MAME WAV, F# major, 8/12-frame grid at 60.606 Hz. Square wave like the AY-3-8910. */
  start: {
    loop: false,
    0: [[70,8],[66,24],[70,8],[66,24],[71,16],[70,16],[68,16],[71,16],[70,16],[68,16],[75,16],[73,8],[71,8],[70,8],[68,8],[66,16]],
    1: [[58,8],[54,24],[58,8],[54,24],[59,16],[58,16],[56,16],[59,16],[58,16],[56,16],[63,16],[61,8],[59,8],[58,8],[56,8],[54,16]]
  },
  main: {
    loop: true,
    0: [
      /* opening motto over the ostinato */
      [70,8],[66,24],[70,8],[66,24],[71,16],[70,16],[68,16],[71,16],[70,16],[68,16],[75,16],[73,8],[71,8],[70,8],[68,8],[66,16],
      [0,16],[78,16],[0,16],[78,24],[77,8],[0,24]
    ],
    1: [
      /* looping accompaniment transcribed from the park-median WAV: A#3 C#3 A#3 F#3, then G#/C# and B cells */
      [58,8],[49,8],[58,12],[54,12],[58,8],[49,8],[58,12],[54,12],
      [56,8],[61,8],[49,12],[61,12],[51,8],[61,8],[53,12],[61,12],
      [58,8],[49,8],[58,12],[54,12],[58,8],[49,8],[58,12],[54,12],
      [59,8],[51,8],[59,12],[54,12],[59,8],[51,8],[59,12],[54,12],
      [56,8],[61,8],[49,12],[61,12],[56,8],[61,8],[49,12],[61,12]
    ]
  },
  home: {
    loop: false,
    0: [[66,6],[68,6],[70,6],[71,6],[73,12],[70,8],[73,8],[70,6],[66,6],[78,16]],
    1: [[54,6],[56,6],[58,6],[59,6],[61,12],[58,8],[61,8],[58,6],[54,6],[66,16]]
  },
  clear: {
    loop: false,
    0: [[66,6],[68,6],[70,6],[71,6],[73,12],[70,8],[73,8],[70,6],[66,6],[78,12],[77,8],[75,6],[73,12],[78,6],[70,6],[68,6],[73,16],[66,8],[73,24],[70,6],[68,6],[66,6],[65,6],[78,20],[80,6],[78,6],[77,6],[75,12]],
    1: [[54,6],[56,6],[58,6],[59,6],[61,12],[58,8],[61,8],[58,6],[54,6],[66,12],[65,8],[63,6],[61,12],[66,6],[58,6],[56,6],[61,16],[54,8],[61,24],[58,6],[56,6],[54,6],[53,6],[66,20],[68,6],[66,6],[65,6],[63,12]]
  },
  over: {
    loop: false,
    0: [[73,12],[71,12],[70,12],[68,16],[66,24],[61,24]],
    1: [[61,12],[59,12],[58,12],[56,16],[54,24],[49,24]]
  }
};

function sfx(name) {
  if (quiet() && name !== "coin") { if (name !== "coin") return; }
  if (!AC && name === "coin") audio();
  if (!AC) return;
  if (name === "hop") { tone(520, 0.05, "square", 0.1); tone(740, 0.07, "square", 0.09); }
  else if (name === "coin") { tone(880, 0.07, "square", 0.12); tone(1175, 0.12, "square", 0.1); }
  else if (name === "road") { noise(0.28, 0.28, 600); tone(180, 0.3, "square", 0.08, 60); }
  else if (name === "water") { noise(0.35, 0.22, 300); tone(220, 0.25, "triangle", 0.08, 80); }
  else if (name === "time") { tone(880, 0.08, "square", 0.1); }
  else if (name === "extra") { tone(660, 0.08, "square", 0.1); tone(880, 0.1, "square", 0.1); tone(1175, 0.16, "square", 0.1); }
  else if (name === "lady") { tone(784, 0.08, "square", 0.1); tone(988, 0.12, "square", 0.1); }
  else if (name === "fly") { tone(1046, 0.06, "square", 0.08); tone(1318, 0.1, "square", 0.08); }
  else if (name === "land") { tone(392, 0.06, "square", 0.07); }
}

/* ---------- high scores ---------- */
const KEY = "frogger_scores_v1";
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
function defaultScores() {
  return [["AAA", 4630], ["BBB", 2050], ["CCC", 1970], ["DDD", 1580], ["EEE", 1270]];
}
let scores;
try { scores = JSON.parse(localStorage.getItem(KEY)); } catch (e) { scores = null; }
if (!Array.isArray(scores) || scores.length < 5) scores = defaultScores();
scores = scores.slice(0, 5).map(e => [String(e[0] || "AAA").slice(0, 3), e[1] | 0]);
while (scores.length < 5) scores.push(["   ", 0]);

/* ---------- input ---------- */
const keys = {};
const dirs = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", a: "L", s: "D", d: "R", W: "U", A: "L", S: "D", D: "R" };
let padDir = null, startHeld = false, coinHeld = false;
function onAny() { audio(); }
addEventListener("keydown", e => {
  onAny();
  if (dirs[e.key]) { keys[dirs[e.key]] = true; e.preventDefault(); }
  if (e.key === " " || e.key === "Enter" || e.key === "1") { startHeld = true; e.preventDefault(); }
  if (e.key === "5") { coinHeld = true; e.preventDefault(); }
  if (e.key === "m" || e.key === "M") { toggleMute(); e.preventDefault(); }
});
addEventListener("keyup", e => {
  if (dirs[e.key]) keys[dirs[e.key]] = false;
  if (e.key === " " || e.key === "Enter" || e.key === "1") startHeld = false;
  if (e.key === "5") coinHeld = false;
});
const pad = document.getElementById("pad");
pad.querySelectorAll(".dpad-btn[data-dir]").forEach(btn => {
  const d = btn.getAttribute("data-dir");
  const down = ev => { ev.preventDefault(); onAny(); padDir = d; btn.classList.add("active"); try { if (ev.pointerId != null) btn.setPointerCapture(ev.pointerId); } catch (_) {} };
  const up = ev => { if (ev) ev.preventDefault(); if (padDir === d) padDir = null; btn.classList.remove("active"); };
  btn.addEventListener("pointerdown", down);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => btn.addEventListener(t, up));
  btn.addEventListener("touchstart", down, { passive: false });
  ["touchend", "touchcancel"].forEach(t => btn.addEventListener(t, up, { passive: false }));
});
function bindAct(id, flag) {
  const el = document.getElementById(id);
  el.addEventListener("pointerdown", e => { e.preventDefault(); onAny(); if (flag === "start") startHeld = true; else coinHeld = true; el.classList.add("active"); try { el.setPointerCapture(e.pointerId); } catch (_) {} });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => el.addEventListener(t, () => { if (flag === "start") startHeld = false; else coinHeld = false; el.classList.remove("active"); }));
}
bindAct("btn-start", "start");
bindAct("btn-coin", "coin");
view.addEventListener("pointerdown", () => onAny());

let startEdge = false, coinEdge = false, prevStart = false, prevCoin = false;
let dirHeld = false;
function currentDir() {
  if (keys.U || padDir === "U") return "U";
  if (keys.D || padDir === "D") return "D";
  if (keys.L || padDir === "L") return "L";
  if (keys.R || padDir === "R") return "R";
  return null;
}
function pollEdges() {
  startEdge = startHeld && !prevStart; prevStart = startHeld;
  coinEdge = coinHeld && !prevCoin; prevCoin = coinHeld;
  const dir = currentDir();
  if (!dir) dirHeld = false;
}
function hopWanted() {
  /* Arcade stick: one discrete hop per press. Must release to hop again.
     A held dpad otherwise auto-hops off a safe turtle into open water. */
  const dir = currentDir();
  if (!dir) { dirHeld = false; return null; }
  if (dirHeld) return null;
  dirHeld = true;
  return dir;
}

/* ---------- level data ---------- */
/* counts: road[5] {n,w,fast?}  river[5] {n, kind, dive?}  kinds: turt, short, long, mid, croc */
function tier(level) {
  const t = ((level - 1) % 5);
  /* Object counts from MAME RAM lane dumps, levels 1-5. */
  const tables = [
    { road: [[2,27],[1,16],[3,16],[3,16],[3,16]], river: [[3,"mid"],[4,"turt",1],[2,"long"],[3,"short"],[4,"turt",1]], swimCroc: 0, snake: 0, otter: 0, homeCroc: 0, lady: 0 },
    { road: [[3,27],[2,16],[4,16],[4,16],[4,16]], river: [[3,"mid"],[5,"turt",1],[1,"long"],[3,"short"],[3,"turt",1]], swimCroc: 1, snake: 1, otter: 0, homeCroc: 1, lady: 1 },
    { road: [[3,27],[2,16],[5,16],[4,16],[4,16]], river: [[2,"mid"],[4,"turt",1],[1,"long"],[3,"short"],[3,"turt",1]], swimCroc: 1, snake: 1, otter: 0, homeCroc: 1, lady: 1 },
    { road: [[4,27],[3,16],[4,16],[4,16],[4,16]], river: [[2,"mid"],[3,"turt",1],[1,"long"],[2,"short"],[3,"turt",1]], swimCroc: 1, snake: 1, otter: 1, homeCroc: 1, lady: 1 },
    { road: [[3,27],[4,16],[5,16],[4,16],[5,16]], river: [[1,"mid"],[3,"turt",1],[1,"long"],[2,"short"],[2,"turt",1]], swimCroc: 1, snake: 1, otter: 1, homeCroc: 1, lady: 1 }
  ];
  return tables[t];
}
function speeds(level, boosted) {
  /* Per-lane rates from MAME object X over 60-frame dumps. Control 0x10|N = 1 px every N frames.
     Level 2 mid-board swaps the whole table (not only the racers). Levels 3-5 start on later tables.
     Level 1 racer boost (not seen before a life reset) goes 1/3 -> 1 px/frame after 30 ticks. */
  const L = ((level - 1) % 5) + 1;
  const L1 = {
    road: [1/2, 1/3, 1/4, 1/5, 1/6],
    river: [1/3, 1/2, 1, 1/6, 1/2],
    dirRoad: [-1, 1, -1, 1, -1],
    dirRiv:  [1, -1, 1, 1, -1]
  };
  if (L === 1) {
    if (!boosted) return L1;
    const s = { road: L1.road.slice(), river: L1.river.slice(), dirRoad: L1.dirRoad.slice(), dirRiv: L1.dirRiv.slice() };
    s.road[1] = 1; /* racer boost */
    return s;
  }
  if (L === 2 && !boosted) return L1;
  if (L === 2 && boosted) return {
    road: [1/3, 4/3, 1/2, 1/3, 1/2],
    river: [1/2, 1/3, 1/2, 1/5, 3/5],
    dirRoad: [-1, 1, -1, 1, -1],
    dirRiv:  [1, -1, 1, 1, 1] /* bottom turtles reverse */
  };
  if (L === 3) return {
    road: [1/3, 4/5, 13/30, 1/3, 1/2],
    river: [1/2, 1/3, 1/2, 1/5, 1/5],
    dirRoad: [-1, 1, 1, 1, -1], /* pinks run right */
    dirRiv:  [1, -1, 1, 1, 1]
  };
  if (L === 4) return {
    road: [1/3, 6/5, 1/2, 1/3, 1/2],
    river: [1/2, 1/3, 1/2, 1/5, 1/3],
    dirRoad: [-1, -1, -1, 1, -1], /* racers run left */
    dirRiv:  [1, -1, 1, 1, 1]
  };
  /* level 5. Racer c=01 measured poorly with 4 cars; treat as 1 px/frame. */
  return {
    road: [1/2, 1, 1/3, 1/2, 1/3],
    river: [1/2, 1/2, 1/3, 1/4, 1/2],
    dirRoad: [-1, 1, -1, 1, -1],
    dirRiv:  [1, -1, 1, 1, -1]
  };
}

/* ---------- game state ---------- */
let state = "attract", attractMode = "rank", attractT = 0, frame = 0;
let credits = 0, score = 0, lives = LIVES0, level = 1, extraAwarded = false;
let timeLeft = TIME_TICKS, tickAcc = 0, timeFrozen = 0;
let homes = [0, 0, 0, 0, 0]; /* 0 empty, 1 frog, 2 fly, 3 croc */
let frog, hop, lady, flyT = 0, crocT = 0, objects = [], snakes = [], otters = [];
let deathT = 0, deathKind = "road", clearT = 0, homeFlash = 0;
let entry = null, demo = false, racerBoost = false, warnAcc = 0;
let maxFwd = 0; /* highest row reached this life, for hop scoring */

function addScore(n) {
  if (demo) return;
  score += n;
  if (score > 99990) score = score % 100000;
  if (!extraAwarded && score >= EXTRA_AT) { extraAwarded = true; lives++; sfx("extra"); }
}

function resetFrog() {
  frog = { x: (W - 16) >> 1, y: Y_WALK, face: "U", alive: true, onPlat: null, lady: false };
  hop = null;
  dirHeld = false;
  maxFwd = Y_WALK;
  timeLeft = TIME_TICKS;
  tickAcc = 0;
  racerBoost = false;
  timeFrozen = 32;
  lady = null;
}

function wrapX(x, span, period) {
  const p = period || (W + span);
  x %= p;
  if (x < 0) x += p;
  return x;
}
/* Visible X copies of a wrapping river object (period 256, so a log can
   sit on both edges at once). Cars have no period and are drawn once. */
function wrapCopies(x, period) {
  if (!period) return [x];
  return [x, x - period, x + period];
}
function overlapX(fx0, fx1, ox, ow, period) {
  for (const s of wrapCopies(ox, period)) {
    if (!(fx1 <= s || fx0 >= s + ow)) return s;
  }
  return null;
}

function makeLaneObjects() {
  objects = [];
  const cfg = tier(level), sp = speeds(level, false);
  const roadKind = ["truck", "racer", "carP", "dozer", "carY"];
  for (let i = 0; i < 5; i++) {
    const [n, w] = cfg.road[i];
    const dir = sp.dirRoad[i];
    const spd = sp.road[i] * dir;
    const y = Y_ROAD[i];
    const kind = roadKind[i];
    const gap = (W + 40) / n;
    for (let k = 0; k < n; k++) {
      objects.push({ typ: "car", kind, x: k * gap - 20, y, w, h: 16, vx: spd, lane: "road" + i, laneI: i });
    }
  }
  for (let i = 0; i < 5; i++) {
    const row = cfg.river[i];
    const n = row[0], kind = row[1], dive = row[2];
    const dir = sp.dirRiv[i];
    const spd = sp.river[i] * dir;
    const y = Y_RIV[i];
    /* Tile widths from MAME: short 6*8, mid 8*8, long 12*8, turtle pack 6*8.
       Visible bodies measure ~6 px tighter because of rounded caps; collision
       uses the full tile so the frog can stand on those caps, as in the arcade. */
    const widthFor = kind === "turt" ? 48 : kind === "short" ? 48 : kind === "long" ? 96 : 64;
    const count = Math.max(n, 0);
    const gap = RIVER_PERIOD / Math.max(count, 1);
    for (let k = 0; k < count; k++) {
      if (kind === "turt") {
        const diving = !!dive && (k === count - 1 || (count > 3 && k === 0));
        const color = (i === 1) ? "red" : "grn"; /* top turtle row is red, bottom is green */
        objects.push({ typ: "turt", x: k * gap, y, w: 48, h: 16, vx: spd, dive: diving ? (k * 40) % 240 : -1, lane: "riv" + i, laneI: i, n: 3, color, period: RIVER_PERIOD });
      } else {
        objects.push({ typ: "log", x: k * gap, y, w: widthFor, h: 16, vx: spd, lane: "riv" + i, laneI: i, period: RIVER_PERIOD });
      }
    }
    if (i === 0 && cfg.swimCroc) {
      objects.push({ typ: "croc", x: W * 0.6, y, w: 48, h: 16, vx: spd, jaw: true, lane: "riv" + i, laneI: i, period: RIVER_PERIOD });
    }
  }
  snakes = [];
  otters = [];
  if (cfg.snake) {
    snakes.push({ x: 8, y: Y_MED, w: 32, h: 12, vx: 0.5 + level * 0.04, dir: 1 });
  }
  if (cfg.otter) {
    otters.push({ x: -24, y: Y_RIV[2], w: 16, h: 12, vx: 0.85, t: 0 });
  }
}

function startLevel(newBoard) {
  if (newBoard) homes = [0, 0, 0, 0, 0];
  makeLaneObjects();
  resetFrog();
  flyT = 90 + ((frame * 17) % 200);
  if (tier(level).homeCroc) maybeHomeCroc();
  if (!demo) playSong("start");
}

function maybeHomeCroc() {
  if (!tier(level).homeCroc) return;
  const empty = [];
  homes.forEach((h, i) => { if (h === 0) empty.push(i); });
  /* Leave at least one open bay, and only on levels that use a home croc. */
  if (empty.length <= 1) return;
  if (((frame + level * 13) % 3) === 0) {
    homes[empty[frame % empty.length]] = 3;
    crocT = 180 + (frame % 90);
  }
}

function maybeFly() {
  if (homes.some(h => h === 2)) return;
  const empty = [];
  homes.forEach((h, i) => { if (h === 0) empty.push(i); });
  if (!empty.length) return;
  homes[empty[(frame >> 3) % empty.length]] = 2;
  flyT = 180 + (frame % 120);
}

function startGame(isDemo) {
  demo = !!isDemo;
  demoSilent = isDemo;
  score = 0;
  lives = LIVES0;
  level = 1;
  extraAwarded = false;
  attractT = 0;
  state = "play";
  startLevel(true);
  if (!isDemo) { playSong("start"); timeFrozen = 48; }
  else timeFrozen = 20;
}

/* ---------- movement / collisions ---------- */
function platformAt(x, y) {
  /* frog 16x16 cell, centered 10 px hitbox (x+3..x+13), mid-row sample at y+8 */
  const fx0 = x + 3, fx1 = x + 13, fy = y + 8;
  let found = null;
  for (const o of objects) {
    if (o.lane && o.lane.slice(0, 3) !== "riv") continue;
    if (fy < o.y || fy >= o.y + 16) continue;
    const seg = overlapX(fx0, fx1, o.x, o.w, o.period);
    if (seg === null) continue;
    if (o.typ === "turt" && o.dive >= 160 && o.dive <= 210) continue; /* fully submerged */
    if (o.typ === "croc") {
      /* mouth is the leading 12 px in the direction of travel, on the overlapping copy */
      const mouth0 = o.vx > 0 ? seg + o.w - 12 : seg;
      const mouth1 = mouth0 + 12;
      if (fx1 > mouth0 && fx0 < mouth1) return { kill: "croc", o };
    }
    found = o;
  }
  return found ? { o: found } : null;
}

function carHit(x, y) {
  const fx0 = x + 3, fx1 = x + 13, fy0 = y + 3, fy1 = y + 13;
  for (const o of objects) {
    if (!o.typ || o.typ !== "car") continue;
    if (fy1 <= o.y + 2 || fy0 >= o.y + 14) continue;
    if (fx1 <= o.x + 1 || fx0 >= o.x + o.w - 1) continue;
    return true;
  }
  return false;
}

function snakeHit(x, y) {
  const fx0 = x + 3, fx1 = x + 13, fy0 = y + 4, fy1 = y + 12;
  for (const s of snakes) {
    if (fy1 < s.y || fy0 > s.y + s.h) continue;
    if (fx1 < s.x || fx0 > s.x + s.w) continue;
    return true;
  }
  return false;
}
function otterHit(x, y) {
  const fx0 = x + 3, fx1 = x + 13, fy0 = y + 4, fy1 = y + 12;
  for (const ot of otters) {
    if (fy1 < ot.y || fy0 > ot.y + ot.h) continue;
    if (fx1 < ot.x || fx0 > ot.x + ot.w) continue;
    return true; /* mouth / body deadly in this remake if overlapping the otter sprite */
  }
  return false;
}

function inRiver(y) { return y < Y_MED && y >= Y_RIV[0]; }
function inRoad(y) { return y >= Y_ROAD[0] && y < Y_WALK; }
function inHomeRow(y) { return y === Y_LAND; }

function beginHop(dir) {
  if (!frog.alive || hop) return;
  const dx = dir === "L" ? -HOP_PX : dir === "R" ? HOP_PX : 0;
  const dy = dir === "U" ? -HOP_PX : dir === "D" ? HOP_PX : 0;
  const nx = frog.x + dx, ny = frog.y + dy;
  if (ny > Y_WALK || ny < Y_LAND) return;
  if (nx < -2 || nx > W - 14) {
    if (!inRiver(frog.y) && !inRiver(ny)) return; /* blocked at sides on land */
  }
  hop = { dir, t: HOP_FRAMES, sx: frog.x, sy: frog.y, nx, ny };
  frog.face = dir;
  if (!demo) sfx("hop");
  if (dir === "U" && ny < maxFwd) {
    maxFwd = ny;
    addScore(10);
  }
}

function finishHop() {
  frog.x = hop.nx; frog.y = hop.ny; hop = null;
  /* home? */
  if (inHomeRow(frog.y)) {
    const cx = frog.x + 8;
    let bay = -1;
    for (let i = 0; i < 5; i++) if (cx >= BAY_X[i] && cx < BAY_X[i] + BAY_W) bay = i;
    if (bay < 0 || homes[bay] === 1) { die("bush"); return; }
    if (homes[bay] === 3) { die("croc"); return; }
    let bonus = 50 + timeLeft * 10;
    if (homes[bay] === 2) { bonus += 200; if (!demo) sfx("fly"); }
    if (frog.lady) { bonus += 200; if (!demo) sfx("lady"); }
    homes[bay] = 1;
    addScore(bonus);
    frog.lady = false;
    lady = null;
    homeFlash = 24;
    if (homes.every(h => h === 1)) {
      addScore(1000);
      state = "clear";
      clearT = 180;
      if (!demo) playSong("clear");
    } else {
      if (!demo) playSong("home");
      resetFrog();
      maybeHomeCroc();
    }
    return;
  }
  checkHazards();
}

function die(kind) {
  if (!frog.alive) return;
  frog.alive = false;
  deathKind = kind;
  deathT = 70;
  state = "dying";
  stopSong();
  if (!demo) sfx(kind === "water" || kind === "croc" ? "water" : "road");
}

function checkHazards() {
  if (!frog.alive) return;
  const x = frog.x, y = frog.y;
  if (x + 8 < 4 || x + 8 > W - 4) {
    if (inRiver(y)) { die("water"); return; }
  }
  if (inRoad(y) && carHit(x, y)) { die("road"); return; }
  if ((y === Y_MED || y === Y_WALK || (snakes.length && Math.abs(y - snakes[0].y) < 12)) && snakeHit(x, y)) { die("road"); return; }
  if (inRiver(y)) {
    if (otterHit(x, y)) { die("croc"); return; }
    const p = platformAt(x, y);
    if (!p) { die("water"); return; }
    if (p.kill) { die("croc"); return; }
    frog.onPlat = p.o;
    /* lady frog pickup */
    if (lady && !frog.lady && Math.abs((x + 8) - (lady.x + 8)) < 12 && Math.abs(y - lady.y) < 10) {
      frog.lady = true;
      if (!demo) sfx("lady");
    }
  } else frog.onPlat = null;
}

function applyLaneSpeed(o) {
  const sp = speeds(level, racerBoost);
  if (o.lane && o.lane.slice(0, 4) === "road") {
    const i = o.laneI;
    o.vx = sp.road[i] * sp.dirRoad[i];
  } else if (o.lane && o.lane.slice(0, 3) === "riv") {
    const i = o.laneI;
    o.vx = sp.river[i] * sp.dirRiv[i];
  }
}
function stepObjects() {
  for (const o of objects) {
    applyLaneSpeed(o);
    o.x = wrapX(o.x + o.vx, o.w, o.period);
    if (o.typ === "turt" && o.dive >= 0) {
      o.dive = (o.dive + 1) % 256;
    }
  }
  for (const s of snakes) {
    s.x += s.vx * s.dir;
    if (s.x < -40) s.dir = 1;
    if (s.x > W) s.dir = -1;
    /* sometimes crawl onto a log */
    if (level >= 3 && (frame % 400) === 200) s.y = (s.y === Y_MED) ? Y_RIV[2] : Y_MED;
  }
  for (const ot of otters) {
    ot.x += ot.vx;
    ot.t++;
    if (ot.x > W + 20) { ot.x = -30; ot.y = Y_RIV[1 + (frame % 3)]; ot.vx = 0.7 + (level * 0.05); }
  }
  if (lady) {
    const host = objects.find(o => o === lady.host) || objects.find(o => o.typ === "log" && o.y === Y_RIV[3]);
    if (host) { lady.x = host.x + Math.min(12, host.w - 16); lady.y = host.y; lady.host = host; }
    else lady = null;
  } else if (!frog.lady && tier(level).lady && (frame % 360) === 80) {
    const logs = objects.filter(o => o.typ === "log" && (o.y === Y_RIV[3] || o.y === Y_RIV[2]));
    if (logs.length) lady = { x: logs[0].x, y: logs[0].y, host: logs[0] };
  }
}

function stepFrog() {
  if (!frog.alive) return;
  if (hop) {
    hop.t--;
    const gone = HOP_FRAMES - hop.t;
    if (gone <= 8) {
      const dx = hop.dir === "L" ? -HOP_STEP : hop.dir === "R" ? HOP_STEP : 0;
      const dy = hop.dir === "U" ? -HOP_STEP : hop.dir === "D" ? HOP_STEP : 0;
      frog.x += dx; frog.y += dy;
    }
    if (hop.t <= 0) finishHop();
    return;
  }
  if (frog.onPlat) {
    frog.x += frog.onPlat.vx;
    if (frog.x + 8 < 4 || frog.x + 8 > W - 4) { die("water"); return; }
  }
  const want = hopWanted();
  if (want && !demo) beginHop(want);
  if (!hop) checkHazards();
}

function demoAI() {
  if (hop || !frog.alive || timeFrozen > 0) return;
  if (frame % 18 !== 0) return;
  /* try to go up if the next cell is safe-ish */
  const ny = frog.y - 16;
  if (ny >= Y_HOME) {
    if (inHomeRow(ny)) {
      const cx = frog.x + 8;
      for (let i = 0; i < 5; i++) {
        if (homes[i] === 0 || homes[i] === 2) {
          const bx = BAY_X[i] + 8;
          if (Math.abs(cx - bx) <= 8) { beginHop("U"); return; }
          beginHop(cx < bx ? "R" : "L"); return;
        }
      }
    }
    if (inRiver(ny) || inRiver(frog.y)) {
      const p = platformAt(frog.x, ny);
      if (p && !p.kill) { beginHop("U"); return; }
      const pL = platformAt(frog.x - 16, frog.y), pR = platformAt(frog.x + 16, frog.y);
      if (pR) beginHop("R"); else if (pL) beginHop("L");
      return;
    }
    if (inRoad(ny) || inRoad(frog.y) || frog.y === Y_WALK || frog.y === Y_MED) {
      if (!carHit(frog.x, ny) && !carHit(frog.x, ny + 4)) { beginHop("U"); return; }
      if (!carHit(frog.x - 16, frog.y)) beginHop("L");
      else if (!carHit(frog.x + 16, frog.y)) beginHop("R");
    }
  }
}

/* ---------- update ---------- */
function update() {
  frame++;
  pollEdges();
  if (coinEdge) { credits = Math.min(99, credits + 1); sfx("coin"); audio(); }
  if (demo && startEdge && state === "play") {
    if (credits <= 0) credits = 1;
    credits--;
    startGame(false);
    return;
  }
  if (state === "attract") {
    attractT++;
    if (startEdge) {
      if (credits <= 0) credits = 1;
      credits--;
      startGame(false);
      return;
    }
    /* cycle attract pages */
    if (attractMode === "rank" && attractT > 240) { attractMode = "table"; attractT = 0; }
    else if (attractMode === "table" && attractT > 300) { attractMode = "demo"; attractT = 0; startGame(true); }
    else if (attractMode === "demo") {
      demoAI();
      playTick(true);
      if (state === "over" || attractT > 900) { state = "attract"; attractMode = "rank"; attractT = 0; demo = false; stopSong(); }
    }
    tickMusic();
    return;
  }
  if (state === "entry") {
    updateEntry();
    return;
  }
  if (state === "over") {
    if (demo) { state = "attract"; attractMode = "rank"; attractT = 0; demo = false; stopSong(); return; }
    if (--attractT <= 0) { state = "attract"; attractMode = "rank"; attractT = 0; }
    if (startEdge) { state = "attract"; attractT = 0; attractMode = "rank"; }
    tickMusic();
    return;
  }
  if (demo && state === "play") {
    attractT++;
    if (attractT > 900) { state = "attract"; attractMode = "rank"; attractT = 0; demo = false; stopSong(); return; }
  }
  if (state === "clear") {
    clearT--;
    tickMusic();
    if (clearT <= 0) {
      level++;
      startLevel(true);
      state = "play";
      if (!demo) playSong("start");
    }
    return;
  }
  if (state === "dying") {
    deathT--;
    if (deathT <= 0) {
      if (demo) { state = "over"; attractT = 1; return; }
      lives--;
      if (lives <= 0) {
        if (score > scores[4][1]) {
          state = "entry";
          entry = { pos: 0, ch: [0, 0, 0], blink: 0 };
        } else {
          state = "over"; attractT = 180;
          playSong("over");
        }
      } else {
        resetFrog();
        state = "play";
        if (!demo) playSong("start");
      }
    }
    return;
  }
  playTick(false);
}

function playTick(isDemoTick) {
  if (timeFrozen > 0) { timeFrozen--; stepObjects(); tickMusic(); return; }
  /* mid-board racer speedup after about 15 seconds */
  if (TIME_TICKS - timeLeft >= 30) racerBoost = true; /* L1 racers 1/3->1; L2 full table swap, measured */
  stepObjects();
  if (demo || isDemoTick) demoAI();
  stepFrog();
  /* timer */
  if (frog.alive && state === "play") {
    tickAcc++;
    if (tickAcc >= TICK_FRAMES) {
      tickAcc = 0;
      timeLeft--;
      if (timeLeft <= 0) die("time");
    }
    if (timeLeft <= WARN_TICKS && timeLeft > 0) {
      warnAcc++;
      if (warnAcc >= 20) { warnAcc = 0; if (!demo) sfx("time"); }
    }
    flyT--;
    if (flyT <= 0) { maybeFly(); flyT = 240; }
    /* fly expires */
    if (homes.includes(2) && flyT === 40) homes = homes.map(h => h === 2 ? 0 : h);
    if (crocT > 0) crocT--;
    if (homes.includes(3) && crocT <= 0) homes = homes.map(h => h === 3 ? 0 : h);
  }
  /* start jingle hands off to main theme */
  if (musicOn && song === SONGS.start && songI[0] >= (SONGS.start[0].length)) playSong("main");
  tickMusic();
}

function updateEntry() {
  entry.blink++;
  const want = hopWanted();
  if (!entry._rel) {
    if (want === "U") { entry.ch[entry.pos] = (entry.ch[entry.pos] + 1) % ALPHA.length; entry._rel = true; }
    if (want === "D") { entry.ch[entry.pos] = (entry.ch[entry.pos] + ALPHA.length - 1) % ALPHA.length; entry._rel = true; }
    if (want === "L" && entry.pos > 0) { entry.pos--; entry._rel = true; }
    if (want === "R" && entry.pos < 2) { entry.pos++; entry._rel = true; }
  }
  if (!want) entry._rel = false;
  if (startEdge) {
    if (entry.pos < 2) entry.pos++;
    else {
      const name = entry.ch.map(i => ALPHA[i]).join("");
      scores.push([name, score]);
      scores.sort((a, b) => b[1] - a[1]);
      scores.length = 5;
      try { localStorage.setItem(KEY, JSON.stringify(scores)); } catch (_) {}
      state = "over"; attractT = 180; playSong("over");
    }
  }
}

/* ---------- render ---------- */
function drawBackground() {
  cls(COL.k);
  /* river */
  fillR(0, Y_HOME, W, Y_MED - Y_HOME, COL.navy);
  /* purple brick banks, matching the arcade median and sidewalk */
  function bank(y0) {
    const a = rgb("#8500d9"), b = rgb("#0000d9"), c = rgb("#e000d9");
    for (let j = 0; j < 16; j++) {
      for (let x = 0; x < W; x++) {
        const cell = ((x >> 2) & 1) ^ ((j >> 2) & 1);
        let col = cell ? a : b;
        if (j % 4 === 0) col = c;
        pset(x, y0 + j, col);
      }
    }
  }
  bank(Y_MED);
  bank(Y_WALK);
  /* Textured green hedge (y=24-46) with orange stipple and dark notched bays. */
  const bushC = COL.bush, dirtC = COL.dirt;
  /* Hand-designed 8x8 stipple in the arcade colors, not a pixel copy of the tiles. */
  const stipple = [
    0b10000100,
    0b00010001,
    0b01000010,
    0b00001000,
    0b10010000,
    0b00100010,
    0b01000100,
    0b00010001
  ];
  for (let y = Y_BUSH; y <= 46; y++) {
    for (let x = 0; x < W; x++) {
      const bit = (stipple[(y - Y_BUSH) & 7] >> (x & 7)) & 1;
      pset(x, y, bit ? dirtC : bushC);
    }
  }
  /* Five 20 px U-notches; navy shows through, with an orange lip. */
  for (let i = 0; i < 5; i++) {
    const x0 = BAY_X[i], x1 = x0 + BAY_W - 1;
    for (let y = 31; y <= 46; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x === x0 || x === x1 || y === 31) pset(x, y, dirtC);
        else pset(x, y, COL.navy);
      }
    }
    pset(x0, 31, bushC); pset(x1, 31, bushC);
    pset(x0 + 1, 31, dirtC); pset(x1 - 1, 31, dirtC);
    pset(x0, 32, dirtC); pset(x1, 32, dirtC);
    for (let x = x0; x <= x1; x++) pset(x, 46, dirtC);
    if (x0 > 0) pset(x0 - 1, 46, dirtC);
    if (x1 < W - 1) pset(x1 + 1, 46, dirtC);
    const st = homes[i];
    if (st === 1) blit(SPR.homeFrog, x0 + 2, Y_BUSH + 6);
    else if (st === 2) blit(SPR.fly, x0 + 6, Y_LAND + 4);
    else if (st === 3) blit(SPR.homeCroc, x0 + 2, Y_BUSH + 8);
  }

}

function drawLogBody(lx, ly, lw) {
  const lh = 10;
  const body = COL.log || COL.brn, hi = COL.logHi || rgb("#e08a62"), ring = rgb("#7a2c1c");
  fillR(lx + 2, ly, lw - 4, lh, body);
  fillR(lx, ly + 2, lw, lh - 4, body);
  fillR(lx + 3, ly + 1, lw - 6, 2, hi);
  for (let rx = lx + 6; rx < lx + lw - 4; rx += 8) fillR(rx, ly, 2, lh, ring);
  fillR(lx, ly + 3, 2, lh - 6, body);
  fillR(lx + lw - 2, ly + 3, 2, lh - 6, body);
}
function drawObjects() {
  for (const o of objects) {
    if (o.typ === "car") {
      const spr = SPR[o.kind] || SPR.carY;
      blit(spr, o.x | 0, o.y, o.vx < 0);
      continue;
    }
    for (const sx of wrapCopies(o.x, o.period)) {
      if (sx + o.w < -16 || sx > W + 16) continue;
      if (o.typ === "log") {
        drawLogBody(sx | 0, o.y + 3, o.w);
      } else if (o.typ === "turt") {
        const phase = o.dive < 0 ? 0 : o.dive;
        let spr = SPR.turt;
        if (phase > 140 && phase < 200) spr = SPR.turtDive;
        if (phase >= 160 && phase <= 210) spr = SPR.turtDown;
        const flip = o.vx < 0;
        const hidden = phase >= 175 && phase <= 205;
        const ix = sx | 0;
        if (!hidden) {
          blit(spr, ix, o.y, flip);
          blit(spr, ix + 16, o.y, flip);
          blit(spr, ix + 32, o.y, flip);
        } else {
          pset(ix + 6, o.y + 8, COL.veh);
          pset(ix + 22, o.y + 7, COL.veh);
          pset(ix + 38, o.y + 8, COL.veh);
        }
      } else if (o.typ === "croc") {
        blit(SPR.croc, sx | 0, o.y, o.vx < 0);
      }
    }
  }
  for (const s of snakes) blit(SPR.snake, s.x | 0, s.y, s.dir < 0);
  for (const ot of otters) blit(SPR.otter, ot.x | 0, ot.y, ot.vx < 0);
  if (lady && !frog.lady) blit(SPR.ladyU, lady.x | 0, lady.y);
}

function drawFrog() {
  if (!frog) return;
  if (!frog.alive) {
    blit(deathKind === "water" || deathKind === "croc" ? SPR.splash : SPR.splat, frog.x | 0, frog.y);
    return;
  }
  const hopping = hop && hop.t > 1 && hop.t < 9;
  let spr = SPR.frogU;
  if (frog.face === "D") spr = SPR.frogD;
  else if (frog.face === "L") spr = SPR.frogL;
  else if (frog.face === "R") spr = SPR.frogR;
  else if (hopping) spr = SPR.frogU2;
  blit(spr, frog.x | 0, frog.y);
  if (frog.lady) blit(SPR.ladyU, frog.x | 0, frog.y - 4);
}

function drawHud() {
  text("1-UP", 8, 1, COL.wht);
  text(scoreStr(demo ? 0 : score), 8, 9, COL.red);
  text("HI-SCORE", 80, 1, COL.wht);
  const hi = Math.max(scores[0][1], demo ? 0 : score);
  text(scoreStr(hi), 96, 9, COL.red);
  /* lives as tiny frogs */
  const showL = Math.max(0, (state === "play" || state === "dying" || state === "clear" ? lives - 1 : 0));
  for (let i = 0; i < Math.min(showL, 6); i++) blit(SPR.homeFrog, 4 + i * 16, Y_STAT);
  /* time bar sits in the bottom 8 px and shrinks toward TIME at lower right */
  const showPlayHud = !(state === "attract" && attractMode !== "demo");
  if (showPlayHud) {
  text("TIME", W - 32, Y_STAT + 8, COL.yel);
  const barW = 144, barX = 40, barY = Y_STAT + 8;
  const frac = Math.max(0, timeLeft) / TIME_TICKS;
  const w = Math.max(0, (barW * frac) | 0);
  const col = timeLeft <= WARN_TICKS ? COL.red : COL.grn;
  if (w) fillR(barX + (barW - w), barY, w, 8, col);
  }
  if (state === "attract" || state === "over") text("CREDIT " + String(credits).padStart(2, "0"), W - 80, Y_STAT + 8, COL.cyn);
}


function drawLogo(x, y) {
  /* Hand-drawn FROGGER wordmark, arcade-colored block letters. */
  const letters = {
    F: ["######","#.....","#.....","#####.","#.....","#.....","#....."],
    R: ["######","#....#","#....#","#####.","#..#..","#...#.","#....#"],
    O: [".####.","#....#","#....#","#....#","#....#","#....#",".####."],
    G: [".#####","#.....","#.....","#..###","#....#","#....#",".####."],
    E: ["######","#.....","#.....","#####.","#.....","#.....","######"]
  };
  const cols = [COL.grn, COL.yel, COL.red, COL.cyn, COL.pnk, COL.org, COL.wht];
  const word = "FROGGER";
  let xx = x;
  for (let i = 0; i < word.length; i++) {
    const g = letters[word[i]];
    const c = cols[i];
    for (let j = 0; j < 7; j++) for (let k = 0; k < 6; k++) if (g[j][k] === "#") {
      pset(xx + k * 2, y + j * 2, c);
      pset(xx + k * 2 + 1, y + j * 2, c);
      pset(xx + k * 2, y + j * 2 + 1, c);
      pset(xx + k * 2 + 1, y + j * 2 + 1, c);
    }
    xx += 14;
  }
}
function drawAttract() {
  if (attractMode === "demo" && frog) {
    drawBackground();
    drawObjects();
    drawFrog();
    drawHud();
    return;
  }
  /* Attract menus are a blue upper half and a black lower half, no playfield. */
  cls(COL.k);
  fillR(0, 0, W, 128, COL.navy);
  drawHud();
  if (attractMode === "rank") {
    textC("SCORE RANKING", 56, COL.yel);
    const suf = ["ST", "ND", "RD", "TH", "TH"];
    for (let i = 0; i < 5; i++) {
      const y = 80 + i * 16;
      text((i + 1) + " " + suf[i] + "  " + scores[i][0] + "  " + scoreStr(scores[i][1]), 24, y, COL.wht);
    }
    textC("ARCADE REMAKE", 200, COL.wht);
  } else if (attractMode === "table") {
    drawLogo(63, 36);
    textC("-POINT TABLE-", 72, COL.wht);
    text("10 PTS FOR EACH STEP", 16, 96, COL.yel);
    text("50 PTS FOR EVERY FROG", 16, 112, COL.yel);
    text("ARRIVED HOME SAFELY", 16, 124, COL.red);
    text("1000 PTS BY SAVING FROGS", 16, 144, COL.yel);
    text("INTO FIVE HOMES", 16, 156, COL.red);
    text("PLUS BONUS", 16, 176, COL.wht);
    text("10 PTS X REMAINING SECOND", 16, 188, COL.red);
    if ((frame >> 5) & 1) textC(credits ? "PUSH START BUTTON" : "INSERT COIN", 216, COL.cyn);
  }
}

function drawPlay() {
  drawBackground();
  drawObjects();
  drawFrog();
  drawHud();
  if (state === "clear") {
    textC("ARRIVED HOME SAFELY", 120, COL.yel);
  }
  if (state === "over") {
    textC("GAME OVER", Y_MED + 4, COL.red);
  }
  if (state === "entry") {
    fillR(16, 88, W - 32, 80, COL.k);
    textC("GREAT SCORE", 96, COL.yel);
    textC("ENTER INITIALS", 112, COL.wht);
    const s = entry.ch.map(i => ALPHA[i]).join("");
    for (let i = 0; i < 3; i++) {
      const x = 88 + i * 16;
      const c = (i === entry.pos && (entry.blink >> 3) & 1) ? COL.yel : COL.grn;
      text(s[i], x, 136, c);
      if (i === entry.pos) fillR(x, 146, 8, 2, COL.yel);
    }
  }
}

function render() {
  if (state === "attract") drawAttract();
  else drawPlay();
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.imageSmoothingEnabled = false;
  vctx.clearRect(0, 0, view.width, view.height);
  octx.putImageData(img, 0, 0);
  vctx.drawImage(off, 0, 0, view.width, view.height);
}

/* ---------- mute / fit ---------- */
const muteBtn = document.getElementById("btn-mute");
function toggleMute() { muted = !muted; audio(); if (master) master.gain.value = muted ? 0 : 0.28; muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON"; }
muteBtn.addEventListener("click", e => { e.stopPropagation(); toggleMute(); });
muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON";
["pointerdown", "touchstart", "touchend", "click", "keydown"].forEach(t => addEventListener(t, () => audio(), { capture: true, passive: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && AC && AC.state !== "running") { try { AC.resume().catch(() => {}); } catch (_) {} } });
addEventListener("pageshow", () => { if (AC && AC.state !== "running") { try { AC.resume().catch(() => {}); } catch (_) {} } });

function fit() {
  const touch = matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle("touch", touch);
  const land = matchMedia("(orientation: landscape)").matches;
  const vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  let aw = vw - 8, ah = vh - 44;
  if (touch) { if (land) aw = vw - 2 * 150; else ah = vh - 40 - 190; }
  const s = Math.max(1, Math.min(aw / W, ah / H));
  const cw = Math.floor(s * W), ch = Math.floor(s * H);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  view.style.width = cw + "px"; view.style.height = ch + "px";
  view.width = Math.round(cw * dpr); view.height = Math.round(ch * dpr);
  document.documentElement.style.setProperty("--cw", cw + "px");
}
addEventListener("resize", fit);
addEventListener("orientationchange", () => { fit(); setTimeout(fit, 350); });
if (window.visualViewport) visualViewport.addEventListener("resize", fit);
fit();

window.__frog = {
  get state() { return { state, score, lives, level, timeLeft, homes: homes.slice(), credits, demo, frame, racerBoost, frog: frog && { x: frog.x, y: frog.y, alive: frog.alive, onPlat: frog.onPlat && { typ: frog.onPlat.typ, x: frog.onPlat.x, y: frog.onPlat.y, w: frog.onPlat.w, vx: frog.onPlat.vx, dive: frog.onPlat.dive }, lady: frog.lady } }; },
  start: () => startGame(false),
  demo: () => startGame(true),
  setLevel: n => { level = n; startLevel(true); state = "play"; demo = false; },
  park: (y, x) => { if (frog) { frog.y = y; frog.x = (x == null ? 104 : x); hop = null; frog.alive = true; frog.onPlat = null; } },
  setHomes: arr => { homes = arr.slice(); },
  boost: v => { racerBoost = !!v; },
  hop: d => beginHop(d),
  showAttract: m => { state = "attract"; attractMode = m || "table"; demo = false; },
  canvas: off,
  thaw: () => { timeFrozen = 0; },
  objects: () => objects.map(o => ({ typ: o.typ, kind: o.kind, x: o.x, y: o.y, w: o.w, h: o.h, vx: o.vx, lane: o.lane, dive: o.dive, n: o.n, period: o.period })),
  snakes: () => snakes.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h, vx: s.vx * s.dir })),
  otters: () => otters.map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h, vx: o.vx })),
  platformAt: (x, y) => { const p = platformAt(x, y); return p && { kill: p.kill || null, typ: p.o && p.o.typ, x: p.o && p.o.x, y: p.o && p.o.y, w: p.o && p.o.w, vx: p.o && p.o.vx, dive: p.o && p.o.dive }; },
  Y: { Y_SCORE, Y_HOME, Y_BUSH, Y_LAND, Y_RIV, Y_MED, Y_ROAD, Y_WALK, Y_STAT, BAY_X, BAY_W, W, H, HOP_FRAMES, HOP_PX, RIVER_PERIOD },
  setTime: n => { timeLeft = n; tickAcc = 0; },
  revive: () => { if (frog) { frog.alive = true; state = "play"; deathT = 0; } }
};

/* ---------- loop ---------- */
let last = performance.now(), acc = 0; const STEP = 1000 / HZ;
function loop(t) {
  acc += Math.min(250, t - last); last = t;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
