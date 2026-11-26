// LONEWOLF OS · Network update (v2.5)
// Radial Network hub, XP tracks (uni/gym/reading/writing/life), Daily Ops, Breach minigame, Exam bosses,
// Heist mode, Infiltration timer, Audio Intel, WOLFSHELL, Life Ops, encrypted Vault, Cipher Lab,
// Field Manual (ethical hacking tips) and the glitch screensaver. Talks to app.js only through window.LW.
{
const $ = s => document.querySelector(s);
const esc = s => LW.esc(s);
const day = () => LW.today();
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sfx = n => window.SFX && SFX.play(n);
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const plain = s => String(s || '').replace(/\*\*|__|`/g, '').replace(/^#+\s*/gm, '').trim();
const dkey = d => d.toISOString().slice(0, 10);
const daysBack = n => { const out = [], d = new Date(); d.setDate(d.getDate() - (n - 1)); for (let i = 0; i < n; i++) { out.push(dkey(d)); d.setDate(d.getDate() + 1); } return out; };
const local = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const fmt = s => { s = Math.max(0, Math.round(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

// ================= state (lives in LW.S.x so it syncs) =================
function X() {
  const s = LW.S, x = (s.x ||= {});
  for (const k of ['tx', 'tg', 'tl', 'min', 'cnt', 'tasks', 'habits', 'hlog', 'heist', 'snap', 'opsPaid', 'seen', 'manual', 'reset', 'sess', 'dg', 'dl', 'deb', 'books', 'prs', 'ink', 'badges', 'wrapSeen']) x[k] ||= {};
  x.jr ||= { items: {} }; x.jr.items ||= {};
  return x;
}
const cntDay = (d = day()) => (X().cnt[d] ||= {});
const NODE_OF = { focusMin: 'focus', task: 'tasks', habit: 'habits', journal: 'journal' };
function mark(k) { const now = Date.now(); cntDay()['v:' + k] = now; X().seen[k] = now; }
function count(k, n = 1) { const c = cntDay(); c[k] = Math.max(0, (c[k] || 0) + n); if (n > 0) mark(NODE_OF[k] || k); LW.save(); }
function visit(k) { mark(k); LW.save(true); }
const rst = k => X().reset[k] || 0;
const usedToday = k => (cntDay()['v:' + k] || 0) > rst(k);
const seenEver = k => (X().seen[k] || 0) > rst(k);
function clearMark(keys) { const now = Date.now(); keys.forEach(k => { X().reset[k] = now; }); LW.save(); }
// ---- session ledger: every logged / timed / answered session is its own record, so it can be undone ----
const liveRecs = o => Object.entries(o || {}).filter(([, v]) => v && !v.del);
function sessOn(d, fn) { return liveRecs(X().sess).map(([id, s]) => Object.assign({ id }, s)).filter(s => (!d || s.d === d) && (!fn || fn(s))); }
const minDay = (d = day()) => { const r = {}; sessOn(d).forEach(s => { r[s.tr] = (r[s.tr] || 0) + (s.m || 0); }); return r; };
function addSession(tr, m, xp, src, extra, msg, d) {
  d = d || day(); const id = uid();
  X().sess[id] = Object.assign({ d, tr, m: m || 0, xp: xp || 0, src, t: Date.now() }, extra || {});
  if (tr === 'uni' && m) LW.bump('x');
  if (xp) addT(tr, xp, msg, d); else LW.save();
  return id;
}
function delSession(id, quiet) {
  const s = X().sess[id]; if (!s || s.del) return;
  s.del = 1; s.t = Date.now();
  if (s.xp) addT(s.tr, -s.xp, quiet ? null : 'Session removed', s.d); else LW.save();
}
function migrateMin() { // turn the old per-day minute totals into undoable records
  const x = X(); let n = 0;
  Object.entries(x.min || {}).forEach(([d, r]) => Object.entries(r || {}).forEach(([tr, m]) => { const id = `L-${d}-${tr}`; if (m > 0 && !x.sess[id]) { x.sess[id] = { d, tr, m, xp: tr === 'uni' ? Math.round(m / 2) : m, src: 'legacy', t: 1 }; n++; } }));
  if (n) LW.save(true);
}

// ================= XP TRACKS =================
const LAD = names => [0, 100, 300, 700, 1300, 2200, 3500].map((x, i) => [x, names[i]]);
const TRACKS = {
  uni: { name: 'UNI', long: 'University', c: '#3dff9a', get ranks() { return LW.RANKS; } },
  gym: { name: 'GYM', long: 'Gym & training', c: '#ff7a2e', ranks: LAD(['Bootloader', 'Overclocked', 'Hardened', 'Titanium Core', 'Juggernaut', 'Apex Rig', 'Unbreakable']) },
  read: { name: 'READ', long: 'Reading (your own books)', c: '#36d6ff', ranks: LAD(['Lurker', 'Archivist', 'Decryptor', 'Librarian', 'Data Hoarder', 'Oracle', 'The Archive']) },
  write: { name: 'WRITE', long: 'Writing (your own stories)', c: '#c77dff', ranks: LAD(['Scribbler', 'Ghostwriter', 'Storyteller', 'Wordsmith', 'Narrator', 'Author', 'Myth Maker']) },
  life: { name: 'LIFE', long: 'Life ops, habits, tasks', c: '#ffc24a', ranks: LAD(['Civilian', 'Operative', 'Handler', 'Fixer', 'Ghost', 'Mastermind', 'Legend']) }
};
const TR = Object.keys(TRACKS);
const xpOf = t => { if (t === 'uni') return LW.S.xp || 0; const x = X(); const g = x.tg[t] != null ? x.tg[t] : (x.tx[t] || 0); return Math.max(0, g - (x.tl[t] || 0)); };
function rankIn(t, xp) { const L = TRACKS[t].ranks; let r = L[0], nx = null; for (let i = 0; i < L.length; i++) if (xp >= L[i][0]) { r = L[i]; nx = L[i + 1] || null; } return { base: r[0], name: r[1], next: nx, pct: nx ? Math.min(100, (xp - r[0]) / (nx[0] - r[0]) * 100) : 100 }; }
// ---- daily XP ledger + Signal model ----
let XPDAY = null;
function recordDay(t, n, d) { const x = X(), k = n > 0 ? 'dg' : 'dl', r = (x[k][d] ||= {}); r[t] = (r[t] || 0) + Math.abs(n); }
LW.onXP = n => recordDay('uni', n, XPDAY || day());
const FORM = [0, 60, 180, 400, 750, 1200, 1800];          // rank thresholds on the last 30 active days
const TARGET7 = { uni: 350, gym: 240, read: 210, write: 200, life: 140 };  // a "full" 7-day signal
const SEASON = () => (X().season ||= { mode: 'semester', paused: {}, ranges: {}, t: 0 });
const isPaused = t => !!(SEASON().paused || {})[t];
const pausedOn = (t, d) => ((SEASON().ranges || {})[t] || []).some(([f, to]) => d >= f && (!to || d <= to));
const dayNet = (d, t) => Math.max(0, ((X().dg[d] || {})[t] || 0) - ((X().dl[d] || {})[t] || 0));
function activeDays(t, n) { const out = [], d = new Date(); for (let i = 0; i < 400 && out.length < n; i++) { const k = dkey(d); if (!pausedOn(t, k)) out.push(k); d.setDate(d.getDate() - 1); } return out; }
const sumNet = (t, n) => activeDays(t, n).reduce((a, d) => a + dayNet(d, t), 0);
const sig = t => { const v = sumNet(t, 7); return { v, pct: Math.min(100, v / TARGET7[t] * 100) }; };
function formRank(t) {
  const v = sumNet(t, 30), names = TRACKS[t].ranks.map(r => r[1]); let i = 0;
  FORM.forEach((x, k) => { if (v >= x) i = k; });
  const nx = i < FORM.length - 1 ? [FORM[i + 1], names[i + 1]] : null;
  return { v, i, name: names[i], next: nx, pct: nx ? (v - FORM[i]) / (nx[0] - FORM[i]) * 100 : 100 };
}
const todayXP = t => dayNet(day(), t);
function setPaused(t, on) {
  const s = SEASON(); s.paused ||= {}; s.ranges ||= {};
  if (!!s.paused[t] === !!on) return;
  const r = (s.ranges[t] ||= []);
  if (on) { s.paused[t] = 1; r.push([day(), null]); }
  else {
    delete s.paused[t];
    const last = r[r.length - 1];
    if (last && !last[1]) { const y = new Date(); y.setDate(y.getDate() - 1); const yd = dkey(y); if (yd < last[0]) r.pop(); else last[1] = yd; }
    setTimeout(() => LW.ops.onWake && LW.ops.onWake(t), 50);
  }
  s.t = Date.now(); LW.save(); LW.topbar();
}
function setMode(mode) { const s = SEASON(); s.mode = mode; s.t = Date.now(); setPaused('uni', mode === 'holidays'); LW.save(); LW.topbar(); }
LW.topbarHook = () => {
  const el = $('#rankName'); if (!el || !LW.S) return false;
  if (isPaused('uni')) { el.textContent = 'UNI asleep'; $('#xpTxt').textContent = SEASON().mode === 'holidays' ? 'holidays' : 'paused'; $('#xpBar').style.width = '0%'; return true; }
  const f = formRank('uni'), s = sig('uni');
  el.textContent = f.name; $('#xpTxt').textContent = `+${todayXP('uni')} today`; $('#xpBar').style.width = s.pct + '%';
  return true;
};
function addT(t, n, msg, d) {
  if (!n) return;
  if (t === 'uni') { XPDAY = d || null; LW.addXP(n, msg); XPDAY = null; LW.save(); return; }
  recordDay(t, n, d || day());
  const before = formRank(t).name;
  const x = X(); if (x.tg[t] == null) x.tg[t] = x.tx[t] || 0;
  if (n > 0) x.tg[t] += n; else x.tl[t] = (x.tl[t] || 0) - n;
  x.tx[t] = xpOf(t);
  const after = formRank(t).name;
  if (msg) LW.toast(`${TRACKS[t].name} ${n > 0 ? '+' : ''}${n} XP · ${msg}`, n < 0);
  if (n > 0 && after !== before) setTimeout(() => { LW.toast(`${TRACKS[t].name} RANK UP // ${after}`); sfx('rankup'); }, 1600);
  LW.save();
}
const trSel = (id, val) => `<select class="sel" id="${id}">${TR.map(t => `<option value="${t}"${t === val ? ' selected' : ''}>${TRACKS[t].name} · ${TRACKS[t].long}</option>`).join('')}</select>`;
const trDot = t => `<i class="tdot" style="background:${TRACKS[t].c}"></i>`;
function tracksHTML(hidePaused) {
  return TR.filter(t => !(hidePaused && isPaused(t))).map(t => {
    const c = TRACKS[t].c, s = sig(t), f = formRank(t);
    if (isPaused(t)) return `<div class="trk paused"><b style="color:${c}">${TRACKS[t].name}</b><div class="xb2"><i style="width:${s.pct}%;background:${c};opacity:.3"></i></div><small>asleep</small><span class="rn">frozen at ${esc(f.name)} · archive ${xpOf(t)}</span></div>`;
    const td = todayXP(t);
    return `<div class="trk"><b style="color:${c}">${TRACKS[t].name}</b><div class="xb2" title="7-day signal: ${s.v} / ${TARGET7[t]} XP"><i style="width:${s.pct}%;background:${c}"></i></div><small style="${td ? `color:${c}` : ''}">${td ? '+' + td : '0'} today</small><span class="rn">${esc(f.name)} · signal ${s.v}/${TARGET7[t]} · archive ${xpOf(t)}</span></div>`;
  }).join('');
}

// sync merge (called by rig.js mergeState)
LW.mergeOps = (out, a, b) => {
  const A = a.x || {}, B = b.x || {}; if (!a.x && !b.x) return;
  const o = out.x = JSON.parse(JSON.stringify(A));
  const sub = k => (o[k] ||= {});
  const G = x => Object.assign({}, x.tx || {}, x.tg || {});
  const ga = G(A), gb = G(B); sub('tg'); sub('tl'); sub('tx');
  new Set([...Object.keys(ga), ...Object.keys(gb), ...Object.keys(B.tl || {})]).forEach(k => {
    o.tg[k] = Math.max(ga[k] || 0, gb[k] || 0);
    o.tl[k] = Math.max((A.tl || {})[k] || 0, (B.tl || {})[k] || 0);
    o.tx[k] = Math.max(0, o.tg[k] - o.tl[k]);
  });
  ['min', 'cnt'].forEach(K => Object.entries(B[K] || {}).forEach(([d, r]) => { const t = (sub(K)[d] ||= {}); Object.entries(r || {}).forEach(([k, v]) => { t[k] = Math.max(t[k] || 0, v || 0); }); }));
  ['tasks', 'habits'].forEach(K => Object.entries(B[K] || {}).forEach(([id, v]) => { const cur = sub(K)[id]; if (!cur || (v.t || 0) > (cur.t || 0)) o[K][id] = v; }));
  Object.entries(B.hlog || {}).forEach(([d, r]) => { const t = (sub('hlog')[d] ||= {}); Object.entries(r || {}).forEach(([id, v]) => { if (!t[id] || (v.t || 0) > (t[id].t || 0)) t[id] = v; }); });
  Object.entries(B.heist || {}).forEach(([k, v]) => { sub('heist')[k] = Math.max(o.heist[k] || 0, v || 0); });
  ['opsPaid', 'manual'].forEach(K => Object.entries(B[K] || {}).forEach(([k, v]) => { if (v) sub(K)[k] = v; }));
  ['seen', 'reset'].forEach(K => Object.entries(B[K] || {}).forEach(([k, v]) => { sub(K)[k] = Math.max(o[K][k] || 0, v || 0); }));
  Object.entries(B.snap || {}).forEach(([k, v]) => { if (!sub('snap')[k] || (v.d > o.snap[k].d)) o.snap[k] = v; });
  o.jr ||= { items: {} }; o.jr.items ||= {};
  const bj = B.jr || {};
  if (!o.jr.ver && bj.ver) { o.jr.ver = bj.ver; o.jr.salt = bj.salt; }
  Object.entries(bj.items || {}).forEach(([id, v]) => { const cur = o.jr.items[id]; if (!cur || (v.t || 0) > (cur.t || 0)) o.jr.items[id] = v; });
  ['sess', 'books', 'prs', 'ink'].forEach(K => Object.entries(B[K] || {}).forEach(([id, v]) => { const cur = sub(K)[id]; if (!cur || (v.t || 0) > (cur.t || 0)) o[K][id] = v; }));
  ['dg', 'dl'].forEach(K => Object.entries(B[K] || {}).forEach(([d, r]) => { const t = (sub(K)[d] ||= {}); Object.entries(r || {}).forEach(([k, v]) => { t[k] = Math.max(t[k] || 0, v || 0); }); }));
  Object.entries(B.deb || {}).forEach(([d, r]) => { const t = (sub('deb')[d] ||= {}); Object.entries(r || {}).forEach(([q, v]) => { if (!t[q] || (v.t || 0) > (t[q].t || 0)) t[q] = v; }); });
  ['badges', 'wrapSeen'].forEach(K => Object.entries(B[K] || {}).forEach(([k, v]) => { if (v) sub(K)[k] = v; }));
  ['season', 'notif'].forEach(K => { if (B[K] && (!o[K] || (B[K].t || 0) > (o[K].t || 0))) o[K] = B[K]; });
};

// ================= NETWORK HUB (radial) =================
const P = (d, attrs = '') => `<path class="ic" d="${d}" ${attrs}/>`;
const ICON = {
  intel: P('M5 3h10l4 4v14H5z M9 11h6 M9 15h6 M9 7h3'),
  breach: P('M7 2.5h10v19H7z M10.5 18h3'),
  code: P('M3 5h18v14H3z M7 10l3 2-3 2 M12.5 15h4.5'),
  targets: P('M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0z M12 2.5v5 M12 16.5v5 M2.5 12h5 M16.5 12h5'),
  life: P('M4 4h16v16H4z M8 12.5l3 3 5-6.5'),
  vault: P('M5.5 11h13v10h-13z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2.5'),
  cipher: P('M3.5 14.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0 M9.5 12L19 2.5 M15 6.5l2.5 2.5 M17.2 4.3l2.3 2.3'),
  focus: P('M19 13a7 7 0 1 1-14 0 7 7 0 0 1 14 0z M12 9v4l2.5 2 M10 2.5h4')
};
const tab = v => () => LW.go(v);
const BR = [
  { id: 'intel', name: 'INTEL', sub: 'notes · audio · AI · insights', nodes: [
    { k: 'intel', n: 'Intel notes', d: 'Mission cards for the current module', run: tab('intel') },
    { k: 'audio', n: 'Audio Intel', d: 'Your notes read aloud (bus mode)', run: () => openOp('audio') },
    { k: 'ask', n: 'Ask AI', d: 'Claude, Gemini, ChatGPT, Copilot', run: () => { visit('ask'); $('#handBtn').click(); } },
    { k: 'insights', n: 'Insights', d: 'Patterns found in your own data', run: () => openOp('insights') }] },
  { id: 'breach', name: 'BREACH', sub: 'cards · minigame · ops', nodes: [
    { k: 'burner', n: 'Burner', d: 'Spaced-repetition flashcards', run: () => LW.burn() },
    { k: 'breach', n: 'Breach', d: 'Hack the node chain before the trace hits 100%', run: () => openOp('breach') },
    { k: 'ops', n: 'Daily Ops', d: '3 fresh missions every day', run: () => openOp('ops') }] },
  { id: 'code', name: 'CODE', sub: 'terminal · blackbook · shell', nodes: [
    { k: 'terminal', n: 'Terminal', d: 'Run real PHP and Python', run: tab('terminal') },
    { k: 'blackbook', n: 'Blackbook', d: 'Write code blind, get a diff', run: tab('blackbook') },
    { k: 'shell', n: 'WOLFSHELL', d: 'Command line for your whole rig', run: () => openOp('shell') }] },
  { id: 'targets', name: 'TARGETS', sub: 'bosses · heist · bounties · wrapped', nodes: [
    { k: 'boss', n: 'Exam Bosses', d: 'Drain each exam\'s HP before exam day', run: () => openOp('boss') },
    { k: 'heist', n: 'Heist', d: 'Timed mock exam with a weak-spot radar', run: () => openOp('heist') },
    { k: 'bounties', n: 'Weekly Bounties', d: '3 big challenges a week, with badges', run: () => openOp('bounties') },
    { k: 'log', n: 'Breach log', d: 'Rank, heatmap, node grid', run: tab('log') },
    { k: 'wrapped', n: 'Weekly Wrapped', d: 'Your leaked weekly report', run: () => openOp('wrapped') }] },
  { id: 'life', name: 'LIFE OPS', sub: 'debrief · tasks · habits · gym', nodes: [
    { k: 'debrief', n: 'Debrief', d: 'Daily field report: one tap per question', run: () => openOp('debrief') },
    { k: 'tasks', n: 'Tasks', d: 'Personal missions with XP', run: () => openOp('tasks') },
    { k: 'habits', n: 'Habits', d: 'Daily checks with streaks', run: () => openOp('habits') },
    { k: 'gymlab', n: 'Gym Lab', d: 'Splits, personal records, progress', run: () => openOp('gymlab') },
    { k: 'tracks', n: 'Tracks & Seasons', d: 'Signal, form ranks, session log (undo)', run: () => openOp('tracks') }] },
  { id: 'vault', name: 'ARCHIVE', sub: 'library · ink · journal', nodes: [
    { k: 'library', n: 'Library', d: 'Read PDFs like a real book, with bookmarks', run: () => openOp('library') },
    { k: 'ink', n: 'Ink Log', d: 'Word counts from your .docx, daily goals', run: () => openOp('ink') },
    { k: 'journal', n: 'Journal', d: 'PIN-locked, encrypted on this device', run: () => openOp('journal') },
    { k: 'jlock', n: 'Lock vault', d: 'Wipe the key from memory', run: () => { lockVault(); visit('jlock'); LW.toast('Vault locked'); renderHub(); } }] },
  { id: 'cipher', name: 'CIPHER LAB', sub: 'crypto · passwords · manual', nodes: [
    { k: 'cipher', n: 'Ciphers', d: 'Caesar (brute force), Vigenère, Atbash', run: () => openOp('cipher', 'ciphers') },
    { k: 'encode', n: 'Encode', d: 'Base64, hex, binary, URL', run: () => openOp('cipher', 'encode') },
    { k: 'hash', n: 'Hash', d: 'SHA family + the avalanche effect', run: () => openOp('cipher', 'hash') },
    { k: 'pass', n: 'Password Forge', d: 'Generate and test passwords', run: () => openOp('cipher', 'pass') },
    { k: 'manual', n: 'Field Manual', d: 'Ethical hacking & secure coding tips', run: () => openOp('manual') }] },
  { id: 'focus', name: 'FOCUS', sub: 'lock-in · infiltration · saver', nodes: [
    { k: 'lockin', n: 'LOCK-IN', d: 'Full HUD mode: missions, timer, comms', run: () => LW.lockin && LW.lockin.setup() },
    { k: 'focus', n: 'Infiltration', d: 'Focus timer: leave the app and stealth breaks', run: () => openOp('focus') },
    { k: 'saver', n: 'Screensaver', d: 'Glitch clock for idle time', run: () => openOp('saver') }] }
];
const CX = 500, CY = 500, RI = 150, RO = 240;
const pol = (r, deg) => { const a = deg * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
const LAYOUT = {
  3: { p: [[300, 0], [372, -9], [372, 9]], e: [[-1, 0], [0, 1], [0, 2]] },
  4: { p: [[300, 0], [368, -10], [368, 10], [436, -12]], e: [[-1, 0], [0, 1], [0, 2], [1, 3]] },
  5: { p: [[300, 0], [368, -10], [368, 10], [436, -13], [436, 13]], e: [[-1, 0], [0, 1], [0, 2], [1, 3], [2, 4]] }
};
let SEL = Math.max(0, BR.findIndex(b => b.id === local.get('lw-br')));
function nodeCls(k) { return usedToday(k) ? 'today' : seenEver(k) ? 'seen' : 'never'; }
function renderHub() {
  const host = $('#netHub'); if (!host) return;
  let svg = `<svg class="hub" viewBox="28 28 944 944" role="group" aria-label="Network hub">`;
  svg += `<circle class="ring2" cx="${CX}" cy="${CY}" r="${RO + 20}"/><circle class="ring2" cx="${CX}" cy="${CY}" r="470"/>`;
  BR.forEach((b, i) => {
    const th = -90 + i * 45, L = LAYOUT[b.nodes.length];
    const pts = L.p.map(([r, d]) => pol(r, th + d));
    L.e.forEach(([f, t]) => {
      const a = f < 0 ? pol(RO, th) : pts[f], z = pts[t];
      const lit = usedToday(b.nodes[t].k);
      svg += `<line class="edge${lit ? ' lit' : ''}" x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>`;
    });
    b.nodes.forEach((n, j) => {
      const [x, y] = pts[j];
      svg += `<g class="nd ${nodeCls(n.k)}${i === SEL ? ' sel' : ''}" data-b="${i}" data-n="${j}" tabindex="0" role="button" aria-label="${esc(n.n)}"><circle class="h" cx="${x}" cy="${y}" r="24"/><circle class="c" cx="${x}" cy="${y}" r="${i === SEL ? 18 : 15}"/><title>${esc(n.n)}: ${esc(n.d)}</title></g>`;
      if (i === SEL) svg += `<text class="nnum ${nodeCls(n.k)}" x="${x}" y="${y + 6}" text-anchor="middle">${j + 1}</text>`;
    });
  });
  BR.forEach((b, i) => {
    const th = -90 + i * 45, a0 = th - 22.5 + 1.6, a1 = th + 22.5 - 1.6;
    const [x1, y1] = pol(RO, a0), [x2, y2] = pol(RO, a1), [x3, y3] = pol(RI, a1), [x4, y4] = pol(RI, a0);
    const [ix, iy] = pol((RI + RO) / 2, th);
    svg += `<g class="seg${i === SEL ? ' on' : ''}" data-seg="${i}" tabindex="0" role="button" aria-label="${b.name}"><path d="M${x1} ${y1}A${RO} ${RO} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${RI} ${RI} 0 0 0 ${x4} ${y4}Z"/><g transform="translate(${ix - 21} ${iy - 21}) scale(1.75)">${ICON[b.id]}</g></g>`;
  });
  const B = BR[SEL];
  const done = B.nodes.filter(n => usedToday(n.k)).length;
  svg += `<circle class="ctr" cx="${CX}" cy="${CY}" r="${RI - 12}"/><text class="cname" x="${CX}" y="${CY - 6}" text-anchor="middle">${B.name}</text><text class="csub" x="${CX}" y="${CY + 22}" text-anchor="middle">${esc(B.sub)}</text><text class="csub" x="${CX}" y="${CY + 46}" text-anchor="middle" style="fill:${done ? 'var(--go)' : '#7d8c99'}">${done}/${B.nodes.length} active today</text></svg>`;
  const op = opsState();
  host.innerHTML = `<div class="hubw">${svg}</div><div class="hubside">
    <div class="hud"><h3>OPERATOR // HADES</h3>${tracksHTML()}</div>
    <div class="hud"><h3>${B.name}</h3><div class="blist">${B.nodes.map((n, j) => `<div class="bwrap"><button class="bnode" data-b="${SEL}" data-n="${j}"><i class="dt ${nodeCls(n.k)}">${j + 1}</i><div><b>${esc(n.n)}</b><span>${esc(n.d)}</span></div></button>${nodeCls(n.k) !== 'never' ? `<button class="brst" data-rst="${n.k}" title="Clear this mark" aria-label="Clear mark on ${esc(n.n)}">↺</button>` : ''}</div>`).join('')}</div>
    ${B.nodes.some(n => nodeCls(n.k) !== 'never') ? `<button class="btn sm" data-rstb="${SEL}" style="margin-top:10px">↺ Clear ${B.name} marks</button>` : ''}</div>
    <div class="hud"><h3>DAILY OPS ${op.done}/3${op.paid ? ' ✓' : ''}</h3><div class="hubleg"><span><i style="background:var(--go)"></i>used today</span><span><i style="background:#f4f7f9"></i>used before</span><span><i style="background:#050607"></i>not tried yet</span></div><p class="mut" style="margin:8px 0 0">Tap a segment to switch branch. Tap a node to open it. ← → keys rotate. ↺ clears a mark (opened by mistake). Clearing only resets the dot: XP and progress stay.</p><button class="btn sm red" id="rstAll" style="margin-top:10px">Clear ALL network marks</button></div></div>`;
}
function pick(i, silent) { SEL = (i + BR.length) % BR.length; local.set('lw-br', BR[SEL].id); if (!silent) sfx('tick'); renderHub(); }
let rstArm = 0;
document.addEventListener('click', e => {
  if (!e.target.closest('#netHub')) return;
  const r1 = e.target.closest('[data-rst]'); if (r1) { clearMark([r1.dataset.rst]); sfx('tick'); LW.toast('Mark cleared'); return renderHub(); }
  const rb = e.target.closest('[data-rstb]'); if (rb) { clearMark(BR[+rb.dataset.rstb].nodes.map(n => n.k)); sfx('tick'); LW.toast(BR[+rb.dataset.rstb].name + ' marks cleared'); return renderHub(); }
  if (e.target.id === 'rstAll') {
    if (!rstArm) { rstArm = 1; e.target.textContent = 'Click again to clear every dot'; setTimeout(() => { rstArm = 0; const b = $('#rstAll'); if (b) b.textContent = 'Clear ALL network marks'; }, 3500); return; }
    rstArm = 0; clearMark(BR.flatMap(b => b.nodes.map(n => n.k))); sfx('glitch'); LW.toast('All marks cleared'); return renderHub();
  }
  const s = e.target.closest('[data-seg]'); if (s) return pick(+s.dataset.seg);
  const n = e.target.closest('[data-n]'); if (n) { const b = BR[+n.dataset.b], node = b.nodes[+n.dataset.n]; sfx('granted'); node.run(); }
});
document.addEventListener('keydown', e => {
  if (!$('#v-net').classList.contains('on')) return;
  if (e.target.matches('input,textarea,select')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick(SEL + 1); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick(SEL - 1); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('svg [data-seg], svg [data-n]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});
LW.onView('net', renderHub);
['intel', 'blackbook', 'terminal', 'log'].forEach(v => LW.onView(v, () => visit(v)));
LW.onView('burner', () => visit('burner'));

// ================= OP PAGE ROUTER =================
let CUR = null;
const PAGES = {};
const onOp = id => $('#v-op').classList.contains('on') && CUR && (!id || CUR.id === id);
function openOp(id, arg) { CUR = { id, arg }; visit(id === 'cipher' ? (arg === 'pass' ? 'pass' : arg === 'encode' ? 'encode' : arg === 'hash' ? 'hash' : 'cipher') : id === 'tracks' && arg === 'log' ? 'session' : id === 'journal' && arg === 'new' ? 'jnew' : id); if ($('#v-op').classList.contains('on')) showOp(); else LW.go('op'); }
function showOp() {
  audioStop();
  if (!CUR || !PAGES[CUR.id]) return LW.go('net');
  const p = PAGES[CUR.id];
  $('#opTitle').textContent = p.t; $('#opSub').textContent = p.s || '';
  const host = $('#opBody'); host.innerHTML = '';
  const b = document.createElement('div'); host.append(b);   // a fresh container per visit, so slow pages can't overwrite the next one
  p.r(b, CUR.arg);
  $('#v-op').scrollTop = 0;
}
LW.onView('op', showOp);
new MutationObserver(() => { if (!$('#v-op').classList.contains('on')) audioStop(); }).observe($('#v-op'), { attributes: true, attributeFilter: ['class'] });
$('#opBack').addEventListener('click', () => LW.go('net'));
const page = (id, t, s, r) => { PAGES[id] = { t, s, r }; };

// ================= DAILY OPS =================
const OPS_POOL = [
  { k: 'cards', g: 'uni', tr: 'uni', n: 15, t: 'Burn 15 flashcards', v: () => ((LW.S.days[day()] || {}).cards || 0), go: () => LW.burn() },
  { k: 'drills', g: 'uni', tr: 'uni', n: 1, t: 'Crack 1 Blackbook drill', v: () => ((LW.S.days[day()] || {}).drills || 0), go: () => LW.go('blackbook') },
  { k: 'missions', g: 'uni', tr: 'uni', n: 1, t: 'Clear 1 Terminal mission', v: () => ((LW.S.days[day()] || {}).missions || 0), go: () => LW.go('terminal') },
  { k: 'breach', g: 'uni', tr: 'uni', n: 1, t: 'Run 1 Breach', v: () => cntDay().breach || 0, go: () => openOp('breach') },
  { k: 'heist', g: 'uni', tr: 'uni', n: 1, t: 'Pull off 1 Heist', v: () => cntDay().heist || 0, go: () => openOp('heist') },
  { k: 'audio', g: 'uni', tr: 'uni', n: 1, t: 'Finish 1 Audio Intel node', v: () => cntDay().audio || 0, go: () => openOp('audio') },
  { k: 'focus', g: 'life', n: 25, t: 'Stay hidden 25 min (Infiltration)', v: () => sessOn(day(), x => x.src === 'focus' || x.src === 'lockin').reduce((a, x) => a + x.m, 0), go: () => openOp('focus') },
  { k: 'habit', g: 'life', n: 2, t: 'Check off 2 habits', v: () => cntDay().habit || 0, go: () => openOp('habits') },
  { k: 'task', g: 'life', n: 1, t: 'Complete 1 Life Ops task', v: () => cntDay().task || 0, go: () => openOp('tasks') },
  { k: 'read', g: 'life', tr: 'read', n: 15, t: 'Read 15 pages of your own book', v: () => sessOn(day(), x => x.tr === 'read').reduce((a, x) => a + (x.pages || Math.round((x.m || 0) / 2)), 0), go: () => openOp('library') },
  { k: 'gym', g: 'life', tr: 'gym', n: 30, t: 'Train for 30 min (answer it in Debrief)', v: () => minDay().gym || 0, go: () => openOp('debrief') },
  { k: 'manual', g: 'any', n: 1, t: 'Study 1 Field Manual entry', v: () => cntDay().manual || 0, go: () => openOp('manual') },
  { k: 'cipher', g: 'any', n: 1, t: 'Crack something in the Cipher Lab', v: () => cntDay().cipher || 0, go: () => openOp('cipher', 'ciphers') },
  { k: 'shell', g: 'any', n: 5, t: 'Run 5 WOLFSHELL commands', v: () => cntDay().shell || 0, go: () => openOp('shell') },
  { k: 'write', g: 'any', tr: 'write', n: 300, t: 'Write 300 words (Ink Log / Debrief)', v: () => sessOn(day(), x => x.tr === 'write').reduce((a, x) => a + (x.words || 0), 0), go: () => openOp('ink') }
];
function opsFor(d) {
  let h = 2166136261; for (const ch of d) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const r = () => (h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296;
  const avail = OPS_POOL.filter(o => !(o.tr && isPaused(o.tr)));
  const from = (g, skip) => { let a = avail.filter(o => (g === 'any' || o.g === g) && !skip.includes(o)); if (!a.length) a = avail.filter(o => !skip.includes(o)); return a[Math.floor(r() * a.length)]; };
  const ex = SEASON().mode === 'exams';
  const a = from('uni', []), b = from(ex ? 'uni' : 'life', [a]), c = from('any', [a, b]);
  return [a, b, c];
}
function opsState() {
  const list = opsFor(day()).map(o => ({ o, v: Math.min(o.n, o.v()), done: o.v() >= o.n }));
  return { list, done: list.filter(x => x.done).length, paid: !!X().opsPaid[day()] };
}
function opsStreak() { let n = 0; const d = new Date(); if (!X().opsPaid[dkey(d)]) d.setDate(d.getDate() - 1); while (X().opsPaid[dkey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
function claimOps() {
  const st = opsState(); if (st.done < 3 || st.paid) return;
  X().opsPaid[day()] = 1; sfx('breach');
  addT('uni', 40, 'DAILY OPS CLEARED'); setTimeout(() => addT('life', 20, 'Ops bonus'), 1200);
}
function opsHTML(compact) {
  const st = opsState();
  return `<div class="opsl">${st.list.map((x, i) => `<button class="opi${x.done ? ' done' : ''}" data-op="${i}" style="text-align:left"><span class="ck">${x.done ? '✓' : i + 1}</span><b>${esc(x.o.t)}</b><span class="mut">${x.v}/${x.o.n}</span><div class="meter"><i style="width:${x.v / x.o.n * 100}%"></i></div></button>`).join('')}</div>
  <div class="row2" style="margin-top:12px;justify-content:space-between"><span class="mut">${st.paid ? '✓ Cleared today. Streak ' + opsStreak() + 'd' : st.done === 3 ? 'All clear. Claim your payout.' : 'Clear all 3 for +40 UNI and +20 LIFE.'}${compact ? '' : ' · new ops at 04:00'}</span>${st.done === 3 && !st.paid ? '<button class="btn go" data-claim>Claim payout</button>' : ''}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-claim]'); if (c) { claimOps(); refreshAll(); return; }
  const b = e.target.closest('[data-op]'); if (b) { const o = opsFor(day())[+b.dataset.op]; o && o.go(); }
});
page('ops', 'Daily Ops', 'Three missions, rebuilt every day. One uni, one life, one wildcard.', body => {
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>TODAY</h3>${opsHTML()}</div><div class="box"><h3>OPS STREAK</h3><div class="big">${opsStreak()}d</div><p class="mut">Days in a row with all 3 ops cleared.</p><div class="row2" style="margin-top:10px">${daysBack(14).map(d => `<i title="${d}" style="width:18px;height:18px;border-radius:4px;background:${X().opsPaid[d] ? 'var(--go)' : 'var(--line)'}"></i>`).join('')}</div></div></div>`;
});

// ================= shared: module + card helpers =================
async function modulePicker(id, val) {
  const mods = LW.modules();
  const cur = val || (LW.MOD && LW.MOD.id) || (mods[0] || {}).id;
  return `<select class="sel" id="${id}">${mods.map(m => `<option value="${esc(m.id)}"${m.id === cur ? ' selected' : ''}>${esc(m.code)} · ${esc(m.name)}</option>`).join('')}</select>`;
}
function weakFirst(mod, n) {
  const st = ((LW.S.mods[mod.id] || {}).cards) || {};
  return shuffle(mod.cards.slice()).sort((a, b) => ((st[a.id] || {}).b || 1) - ((st[b.id] || {}).b || 1)).slice(0, n);
}
function mcq(card, mod) {
  const others = shuffle(mod.cards.filter(c => c.id !== card.id && plain(c.a) !== plain(card.a))).slice(0, 3).map(c => plain(c.a));
  const opts = shuffle([plain(card.a), ...others]);
  return { card, q: plain(card.q), opts, ans: opts.indexOf(plain(card.a)), node: card.node };
}
const optBtns = q => `<div class="opts">${q.opts.map((o, i) => `<button class="opt" data-o="${i}"><kbd>${i + 1}</kbd>${esc(clip(o, 260))}</button>`).join('')}</div>`;

// ================= BREACH MINIGAME =================
let G = null;
page('breach', 'Breach', 'Answer to hack each node. Wrong answers and time raise the trace. Hit 100% and you\'re caught.', async (body, arg) => {
  if (G && G.tick) clearInterval(G.tick);
  G = null;
  body.innerHTML = `<div class="box" style="max-width:820px"><div class="row2">${await modulePicker('bMod', arg)}<button class="btn go" id="bGo">▶ Start breach</button></div><p class="mut" style="margin-top:10px">8 nodes · 4 options each · keys 1–4 work. Weak cards come first. Each correct answer also counts toward your card contract.</p></div><div id="bArena"></div>`;
  if (!body.isConnected) return;
  $('#bGo').onclick = async () => {
    const mod = await LW.getModule($('#bMod').value);
    if (!mod || mod.cards.length < 4) return LW.toast('Need at least 4 cards in this module', true);
    const qs = weakFirst(mod, 8).map(c => mcq(c, mod));
    G = { mod, qs, i: 0, ok: 0, trace: 0, t0: Date.now(), lock: false, over: false };
    sfx('uplink'); drawBreach();
    G.tick = setInterval(() => {
      if (!G || G.over) return;
      if (!onOp('breach')) { clearInterval(G.tick); G = null; return; }
      G.trace += 0.7; paintTrace(); if (G.trace >= 100) endBreach(false);
    }, 1000);
  };
});
function paintTrace() { const b = $('#bTrace'); if (b) { b.style.width = Math.min(100, G.trace) + '%'; $('#bTraceN').textContent = Math.min(100, Math.round(G.trace)) + '%'; } }
function drawBreach() {
  const n = G.qs.length, W = 800, xs = i => 50 + i * (700 / Math.max(1, n - 1)), ys = i => i % 2 ? 140 : 60;
  let svg = `<svg viewBox="0 0 ${W} 200">`;
  for (let i = 0; i < n - 1; i++) svg += `<line class="be${i < G.ok ? ' ok' : ''}" x1="${xs(i)}" y1="${ys(i)}" x2="${xs(i + 1)}" y2="${ys(i + 1)}"/>`;
  for (let i = 0; i < n; i++) svg += `<circle class="bn${i < G.i ? ' ok' : ''}${i === G.i && !G.over ? ' cur' : ''}" cx="${xs(i)}" cy="${ys(i)}" r="16"/>`;
  svg += '</svg>';
  const q = G.qs[G.i];
  $('#bArena').innerHTML = `<div class="box bgame" style="max-width:820px;margin-top:14px">${svg}<div class="trace">TRACE <div class="bar3"><i id="bTrace" style="width:${Math.min(100, G.trace)}%"></i></div><b id="bTraceN">${Math.min(100, Math.round(G.trace))}%</b></div>` +
    (G.over ? '' : `<div class="qbox"><p class="mut">NODE ${G.i + 1}/${n}</p><p class="q">${esc(q.q)}</p>${optBtns(q)}</div>`) + '</div>';
}
function answerBreach(k) {
  if (!G || G.over || G.lock) return;
  const q = G.qs[G.i], btns = [...document.querySelectorAll('#bArena .opt')];
  G.lock = true;
  btns[q.ans] && btns[q.ans].classList.add('ok');
  if (k === q.ans) { G.ok++; sfx('granted'); LW.bump('card'); }
  else { btns[k] && btns[k].classList.add('bad'); G.trace += 22; sfx('denied'); paintTrace(); const a = $('#bArena .box'); a.classList.remove('flash-red'); void a.offsetWidth; a.classList.add('flash-red'); }
  setTimeout(() => {
    if (!G || G.over) return;
    G.lock = false;
    if (G.trace >= 100) return endBreach(false);
    if (k === q.ans) G.i++;
    else { G.qs.push(G.qs.splice(G.i, 1)[0]); } // missed node comes back at the end
    if (G.i >= G.qs.length) return endBreach(true);
    drawBreach();
  }, k === q.ans ? 450 : 1500);
}
function endBreach(win) {
  G.over = true; clearInterval(G.tick); drawBreach();
  const xp = G.ok * 3 + (win ? 30 + (G.trace < 50 ? 10 : 0) : 0);
  count('breach'); sfx(win ? 'breach' : 'denied');
  if (xp) addT('uni', xp, win ? 'BREACH COMPLETE' : 'TRACED · partial data');
  $('#bArena .box').insertAdjacentHTML('beforeend', `<div style="margin-top:14px"><div class="big" style="color:${win ? 'var(--go)' : 'var(--red)'}">${win ? 'ACCESS GRANTED' : 'TRACED'}</div><p class="mut">${G.ok} nodes hacked · trace ${Math.min(100, Math.round(G.trace))}% · ${Math.round((Date.now() - G.t0) / 1000)}s</p><div class="row2"><button class="btn go" id="bAgain">Run it again</button><button class="btn" onclick="LW.go('net')">Back to Network</button></div></div>`);
  $('#bAgain').onclick = () => $('#bGo').click();
}
document.addEventListener('click', e => { const o = e.target.closest('#bArena .opt'); if (o) answerBreach(+o.dataset.o); });
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select') || !/^[1-4]$/.test(e.key)) return;
  if (onOp('breach') && G && !G.over) answerBreach(+e.key - 1);
  if (onOp('heist') && H && !H.over && H.qs[H.i] && H.qs[H.i].opts) answerHeist(+e.key - 1);
});

// ================= EXAM BOSSES =================
function mastery(mod) {
  const st = LW.S.mods[mod.id] || {}, cs = st.cards || {};
  const parts = [];
  if (mod.cards.length) parts.push([.5, mod.cards.reduce((a, c) => a + (((cs[c.id] || {}).b || 1) - 1), 0) / (mod.cards.length * 4)]);
  if (mod.nodes.length) parts.push([.2, mod.nodes.filter(n => ((st.nodes || {})[n.id] || {}).hacked).length / mod.nodes.length]);
  if (mod.drills.length) parts.push([.15, mod.drills.filter(d => ((st.drills || {})[d.id] || 0) >= 90).length / mod.drills.length]);
  if (mod.challenges.length) parts.push([.15, mod.challenges.filter(c => (st.chal || {})[c.id]).length / mod.challenges.length]);
  const w = parts.reduce((a, p) => a + p[0], 0);
  return w ? parts.reduce((a, p) => a + p[0] * p[1], 0) / w : 0;
}
page('boss', 'Exam Bosses', 'Every exam is a target. Cards, drills, missions and hacked nodes deal damage. Drain the HP before exam day.', async body => {
  body.innerHTML = '<p class="mut">Scanning targets…</p>';
  const rows = [];
  for (const m of LW.modules()) {
    let mod; try { mod = await LW.getModule(m.id); } catch (e) { continue; }
    const hp = Math.round((1 - mastery(mod)) * 1000);
    const ex = (LW.S.exams || {})[m.id];
    const days = ex ? Math.ceil((new Date(ex + 'T09:00') - new Date()) / LW.DAY) : null;
    const sn = X().snap[m.id];
    if (!sn || sn.d !== day()) X().snap[m.id] = { d: day(), hp };
    rows.push({ m, mod, hp, days, dmg: Math.max(0, X().snap[m.id].hp - hp) });
  }
  LW.save(true);
  rows.sort((a, b) => (a.days == null) - (b.days == null) || (a.days ?? 0) - (b.days ?? 0));
  body.innerHTML = `<div class="opgrid">${rows.map(r => {
    const dead = r.hp <= 0, gone = r.days != null && r.days < 0;
    const pace = r.days > 0 ? Math.ceil(r.hp / r.days) : r.hp;
    return `<div class="boss${dead ? ' dead' : ''}"><div class="bt"><b>${esc(r.m.code)}</b><span class="pill${r.days != null && r.days <= 7 && r.days >= 0 ? ' red' : ''}">${r.days == null ? 'no exam date' : gone ? 'exam passed' : r.days === 0 ? 'EXAM TODAY' : 'exam in ' + r.days + 'd'}</span></div>
      <span class="mut">${esc(r.m.name)}</span>
      <div class="hp"><i style="width:${r.hp / 10}%"></i></div>
      <div class="st"><span>HP<b>${r.hp}/1000</b></span><span>Damage today<b style="color:var(--go)">${r.dmg}</b></span><span>Needed/day<b>${dead ? '—' : r.days == null ? 'set date' : pace}</b></span></div>
      ${dead ? '<b style="color:var(--go)">TARGET NEUTRALISED</b>' : `<div class="row2"><button class="btn go sm" data-att="burn" data-m="${esc(r.m.id)}">Burn cards</button><button class="btn sm" data-att="breach" data-m="${esc(r.m.id)}">Breach</button><button class="btn sm" data-att="heist" data-m="${esc(r.m.id)}">Heist</button><button class="btn sm" data-att="bb" data-m="${esc(r.m.id)}">Drills</button></div>`}
    </div>`;
  }).join('') || '<p class="mut">No modules yet.</p>'}</div><p class="mut" style="margin-top:14px">HP = 1000 × what you haven't mastered yet (card boxes 50%, hacked nodes 20%, drills ≥90% 15%, missions 15%). Set exam dates in Rig.</p>`;
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-att]'); if (!b) return;
  const id = b.dataset.m, a = b.dataset.att;
  if (a === 'burn') return LW.burn(id);
  if (a === 'bb') { await LW.loadModule(id); return LW.go('blackbook'); }
  openOp(a, id);
});

// ================= HEIST (timed mock exam) =================
let H = null;
page('heist', 'Heist', 'Timed mock exam: 7 multiple-choice + 3 recall questions in 8 minutes. You get a radar of your weak nodes at the end.', async (body, arg) => {
  if (H && H.tick) clearInterval(H.tick);
  H = null;
  body.innerHTML = `<div class="box" style="max-width:820px"><div class="row2">${await modulePicker('hMod', arg)}<button class="btn go" id="hGo">▶ Start heist</button></div><p class="mut" style="margin-top:10px">Best score here: <b id="hBest"></b>. The timer doesn't stop. Recall questions: type your answer, reveal, then mark yourself honestly.</p></div><div id="hArena"></div>`;
  if (!body.isConnected) return;
  const best = () => { $('#hBest').textContent = (X().heist[$('#hMod').value] || 0) + '%'; };
  best(); $('#hMod').onchange = best;
  $('#hGo').onclick = async () => {
    const mod = await LW.getModule($('#hMod').value);
    if (!mod || mod.cards.length < 4) return LW.toast('Need at least 4 cards in this module', true);
    const pick = weakFirst(mod, 10);
    const qs = pick.map((c, i) => i < 7 ? mcq(c, mod) : { card: c, q: plain(c.q), recall: true, node: c.node });
    H = { mod, qs: shuffle(qs), i: 0, res: [], end: Date.now() + 8 * 60e3, over: false };
    sfx('uplink'); drawHeist();
    H.tick = setInterval(() => {
      if (!H || H.over) return;
      if (!onOp('heist')) { clearInterval(H.tick); H = null; return; }
      const left = (H.end - Date.now()) / 1000; const t = $('#hTime'); if (t) t.textContent = fmt(left);
      if (left <= 0) endHeist();
    }, 500);
  };
});
function drawHeist() {
  const q = H.qs[H.i], n = H.qs.length;
  $('#hArena').innerHTML = `<div class="box" style="max-width:820px;margin-top:14px"><div class="row2" style="justify-content:space-between"><span class="mut">Q ${H.i + 1}/${n} · ${q.recall ? 'RECALL' : 'MULTIPLE CHOICE'}</span><b id="hTime" style="font:20px var(--wide)">${fmt((H.end - Date.now()) / 1000)}</b></div><div class="bar3" style="margin:8px 0 14px"><i style="width:${H.i / n * 100}%;background:var(--amber)"></i></div><div class="qbox"><p class="q">${esc(q.q)}</p>` +
    (q.recall ? `<textarea class="inp" id="hRec" placeholder="Type your answer from memory…"></textarea><div class="row2" style="margin-top:8px"><button class="btn" id="hRev">Reveal answer</button></div><div id="hAns"></div>` : optBtns(q)) + '</div></div>';
  if (q.recall) {
    setTimeout(() => $('#hRec') && $('#hRec').focus(), 50);
    $('#hRev').onclick = () => {
      $('#hAns').innerHTML = `<div class="out">${esc(plain(q.card.a))}</div><div class="row2" style="margin-top:8px"><button class="btn go" data-hr="1">✓ Got it</button><button class="btn red" data-hr="0">✕ Missed</button></div>`;
      $('#hRev').disabled = true;
    };
  }
}
function nextHeist(ok) {
  const q = H.qs[H.i]; H.res.push({ node: q.node, ok });
  sfx(ok ? 'granted' : 'denied');
  H.i++;
  if (H.i >= H.qs.length) return endHeist();
  setTimeout(drawHeist, 350);
}
function answerHeist(k) {
  if (!H || H.over || H.lock) return;
  const q = H.qs[H.i], btns = [...document.querySelectorAll('#hArena .opt')];
  H.lock = true; btns[q.ans] && btns[q.ans].classList.add('ok'); if (k !== q.ans && btns[k]) btns[k].classList.add('bad');
  setTimeout(() => { H.lock = false; nextHeist(k === q.ans); }, k === q.ans ? 300 : 1100);
}
document.addEventListener('click', e => {
  const o = e.target.closest('#hArena .opt'); if (o) return answerHeist(+o.dataset.o);
  const r = e.target.closest('[data-hr]'); if (r && H && !H.over) nextHeist(r.dataset.hr === '1');
});
function endHeist() {
  H.over = true; clearInterval(H.tick);
  const total = H.qs.length, ok = H.res.filter(r => r.ok).length, score = Math.round(ok / total * 100);
  const prev = X().heist[H.mod.id] || 0;
  if (score > prev) X().heist[H.mod.id] = score;
  count('heist');
  addT('uni', Math.round(score * 0.4) + (score > prev ? 15 : 0), score > prev ? 'HEIST · new best' : 'HEIST complete');
  sfx(score >= 70 ? 'breach' : 'denied');
  const by = {};
  H.qs.forEach((q, i) => { const r = H.res[i]; const k = q.node || '?'; (by[k] ||= { ok: 0, n: 0 }).n++; if (r && r.ok) by[k].ok++; });
  const nodes = Object.entries(by).map(([id, v]) => { const n = H.mod.nodes.find(x => x.id === id); return { id, code: n ? n.code : id, name: n ? n.name : '', pct: Math.round(v.ok / v.n * 100), v }; }).sort((a, b) => a.pct - b.pct);
  $('#hArena').innerHTML = `<div class="opgrid" style="margin-top:14px;max-width:1000px"><div class="box"><h3>RESULT</h3><div class="big" style="color:${score >= 70 ? 'var(--go)' : score >= 50 ? 'var(--amber)' : 'var(--red)'}">${score}%</div><p class="mut">${ok}/${total} correct${H.res.length < total ? ` · ${total - H.res.length} unanswered (time)` : ''} · best ${Math.max(prev, score)}%</p><div class="row2" style="margin-top:10px"><button class="btn go" onclick="document.getElementById('hGo').click()">New heist</button></div></div>
    <div class="box"><h3>WEAK-SPOT RADAR</h3>${radar(nodes)}</div>
    <div class="box"><h3>PATCH THESE NODES</h3>${nodes.filter(n => n.pct < 100).map(n => `<div class="row2" style="justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><span><b style="font-weight:500">${esc(n.code)}</b> <span class="mut">${esc(clip(n.name, 40))}</span></span><span class="row2"><span class="pill red">${n.pct}%</span><button class="btn sm" data-patch="${esc(n.id)}">Open</button></span></div>`).join('') || '<p class="mut">Clean sweep. No weak nodes this run.</p>'}</div></div>`;
}
function radar(nodes) {
  if (nodes.length < 3) return `<div class="mut">${nodes.map(n => `${esc(n.code)}: ${n.pct}%`).join('<br>') || '—'}<br><br>(Radar needs 3+ nodes.)</div>`;
  const ns = nodes.slice(0, 8), N = ns.length, c = 130, R = 95;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  let s = `<svg class="radar" viewBox="0 0 260 260" style="width:100%;max-width:300px">`;
  [.25, .5, .75, 1].forEach(f => { s += `<polygon points="${ns.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="#1f272d"/>`; });
  ns.forEach((n, i) => { const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 18); s += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#1f272d"/><text x="${lx}" y="${ly + 4}" text-anchor="middle">${esc(clip(n.code, 8))}</text>`; });
  s += `<polygon points="${ns.map((n, i) => pt(i, R * Math.max(.04, n.pct / 100)).join(',')).join(' ')}" fill="rgba(255,194,74,.18)" stroke="#ffc24a" stroke-width="2"/></svg>`;
  return s;
}
document.addEventListener('click', async e => { const b = e.target.closest('[data-patch]'); if (!b || !H) return; await LW.loadModule(H.mod.id); LW.openNode(b.dataset.patch); });

// ================= INFILTRATION (focus timer) =================
const F = { on: false };
const Amb = (() => {
  let nodes = [], blipT = 0;
  function start() {
    const c = window.SFX && SFX.ac(); if (!c) return;
    stop();
    const g = c.createGain(); g.gain.value = 0; g.connect(c.destination);
    g.gain.linearRampToValueAtTime(0.5 * SFX.volume(), c.currentTime + 2);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 160; lfo.connect(lg).connect(f.frequency);
    const ng = c.createGain(); ng.gain.value = 0.16; n.connect(f).connect(ng).connect(g);
    const dr = [55, 82.4, 110.3].map((fr, i) => { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = fr; o.detune.value = i * 4; og.gain.value = [0.05, 0.03, 0.012][i]; o.connect(og).connect(g); o.start(); return o; });
    n.start(); lfo.start();
    nodes = [g, n, lfo, ...dr];
    const blip = () => {
      if (!nodes.length) return;
      const o = c.createOscillator(), bg = c.createGain(), t = c.currentTime;
      o.frequency.value = [1320, 1760, 1480, 1980][rnd(4)]; o.type = 'sine';
      bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.012, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(bg).connect(g); o.start(t); o.stop(t + 0.3);
      blipT = setTimeout(blip, 2500 + Math.random() * 6000);
    };
    blipT = setTimeout(blip, 3000);
  }
  function stop() { clearTimeout(blipT); nodes.forEach(nd => { try { nd.stop ? nd.stop() : nd.disconnect(); } catch (e) {} }); nodes = []; }
  return { start, stop, get on() { return nodes.length > 0; } };
})();
let wake = null;
async function wakeOn() { try { wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; } }
function wakeOff() { try { wake && wake.release(); } catch (e) {} wake = null; }
function focusStart(min, tr, strict, amb) {
  Object.assign(F, { on: true, min, tr, strict, amb, end: Date.now() + min * 60e3, start: Date.now(), hiddenAt: 0 });
  local.set('lw-focus-pref', JSON.stringify({ min, tr, strict, amb }));
  sfx('uplink'); if (amb) Amb.start(); wakeOn();
  F.tick = setInterval(focusTick, 500);
  if (onOp('focus')) PAGES.focus.r($('#opBody'));
}
function focusStop(msg, bad) {
  clearInterval(F.tick); F.on = false; Amb.stop(); wakeOff();
  if (msg) LW.toast(msg, bad);
  if (onOp('focus')) PAGES.focus.r($('#opBody'));
}
function focusTick() {
  if (!F.on) return;
  const left = (F.end - Date.now()) / 1000;
  const t = $('#fTime'); if (t) { t.textContent = fmt(left); $('#fArc').style.strokeDashoffset = String(100 - Math.max(0, left) / (F.min * 60) * 100); }
  if (left <= 0) {
    const m = F.min, tr = F.tr;
    focusStop(); sfx('breach');
    count('focusMin', m);
    addSession(tr, m, m, 'focus', null, `INFILTRATION COMPLETE · ${m} min undetected`);
    if (onOp('focus')) $('#opBody').insertAdjacentHTML('afterbegin', `<div class="box" style="border-color:var(--go2);margin-bottom:14px"><b style="color:var(--go)">✓ ${m} min logged to ${TRACKS[tr].name}.</b> <span class="mut">Take 5. Water, stretch, eyes off the screen.</span></div>`);
  }
}
document.addEventListener('visibilitychange', () => {
  if (!F.on) return;
  if (document.hidden) F.hiddenAt = Date.now();
  else if (F.hiddenAt) {
    const away = Date.now() - F.hiddenAt; F.hiddenAt = 0;
    if (F.strict && away > 10000 && Date.now() < F.end) { sfx('denied'); focusStop(`STEALTH BROKEN · you left for ${Math.round(away / 1000)}s. No XP.`, true); }
  }
});
page('focus', 'Infiltration', 'Focus timer. Pick a track, go dark. Strict stealth: leaving the app for more than 10 seconds breaks the run.', body => {
  if (F.on) {
    body.innerHTML = `<div class="box" style="max-width:520px;margin:0 auto;text-align:center"><span class="pill" style="border-color:${TRACKS[F.tr].c};color:${TRACKS[F.tr].c}">${TRACKS[F.tr].name} · ${F.min} min${F.strict ? ' · strict' : ''}</span>
      <div class="fring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f272d" stroke-width="1.6"/><circle id="fArc" cx="18" cy="18" r="15.9" fill="none" stroke="${TRACKS[F.tr].c}" stroke-width="1.6" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg><div><div class="tm" id="fTime">${fmt((F.end - Date.now()) / 1000)}</div><div class="tl">undetected</div></div></div>
      <div class="row2" style="justify-content:center"><button class="btn" id="fAmb">${Amb.on ? '🔊 Ambience on' : '🔈 Ambience off'}</button><button class="btn red" id="fAbort">Abort (no XP)</button></div></div>`;
    $('#fAbort').onclick = () => { sfx('denied'); focusStop('Run aborted', true); };
    $('#fAmb').onclick = () => { Amb.on ? Amb.stop() : Amb.start(); $('#fAmb').textContent = Amb.on ? '🔊 Ambience on' : '🔈 Ambience off'; };
    focusTick(); return;
  }
  let pref = {}; try { pref = JSON.parse(local.get('lw-focus-pref') || '{}'); } catch (e) {}
  body.innerHTML = `<div class="opgrid" style="max-width:900px"><div class="box"><h3>SET UP THE RUN</h3>
    <label class="mut">Track</label>${trSel('fTr', pref.tr || 'uni')}
    <label class="mut" style="display:block;margin-top:10px">Duration</label><div class="chips" id="fDur">${[15, 25, 45, 60, 90].map(m => `<button class="chip${(pref.min || 25) === m ? ' on' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
    <label class="row2"><input type="checkbox" id="fStrict" ${pref.strict === false ? '' : 'checked'}> Strict stealth (leaving the app fails the run)</label>
    <label class="row2" style="margin-top:6px"><input type="checkbox" id="fAmbC" ${pref.amb ? 'checked' : ''}> Ambience (synth drone + data blips)</label>
    <button class="btn go" id="fGo" style="margin-top:14px;width:100%">▶ Go dark</button></div>
    <div class="box"><h3>TODAY</h3>${TR.map(t => `<div class="row2" style="justify-content:space-between;padding:4px 0"><span>${trDot(t)}${TRACKS[t].name}</span><b>${minDay()[t] || 0} min</b></div>`).join('')}<p class="mut" style="margin-top:8px">1 XP per minute to the track you pick. The screen stays awake while the run is on.</p></div></div>`;
  let min = pref.min || 25;
  $('#fDur').onclick = e => { const b = e.target.closest('[data-min]'); if (!b) return; min = +b.dataset.min; document.querySelectorAll('#fDur .chip').forEach(c => c.classList.toggle('on', c === b)); };
  $('#fGo').onclick = () => focusStart(min, $('#fTr').value, $('#fStrict').checked, $('#fAmbC').checked);
});

// ================= AUDIO INTEL =================
const A = { q: [], i: 0, playing: false, node: null, mod: null };
function mdToSpeech(md) {
  return String(md || '').replace(/```[\s\S]*?```/g, '\n(code example skipped.)\n').replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, '')
    .replace(/\|/g, ', ').replace(/^#{1,6}\s*(.*)$/gm, '$1.').replace(/\*\*|__|\*|_/g, '').replace(/^\s*[-+]\s+/gm, '').replace(/^>\s?/gm, '');
}
function sentences(t) { return t.split(/\n+/).flatMap(l => l.match(/[^.!?]+[.!?]*\s*/g) || []).map(s => s.trim()).filter(s => s.length > 1); }
function speakNext() {
  if (!A.playing) return;
  if (!onOp('audio')) { audioStop(); return; }
  if (A.i >= A.q.length) {
    A.playing = false; paintAudio();
    count('audio'); addT('uni', 5, 'AUDIO INTEL absorbed');
    const st = (LW.S.mods[A.mod.id] ||= { nodes: {}, cards: {}, drills: {}, chal: {} }); const ns = (st.nodes[A.node.id] ||= {}); ns.read = 1; ns.t = Date.now(); LW.save();
    return;
  }
  const u = new SpeechSynthesisUtterance(A.q[A.i]);
  u.rate = +(local.get('lw-tts-rate') || 1);
  const vn = local.get('lw-tts-voice'); const v = speechSynthesis.getVoices().find(x => x.name === vn); if (v) u.voice = v;
  u.onend = () => { if (!A.playing) return; A.i++; paintAudio(); speakNext(); };
  u.onerror = () => { A.playing = false; paintAudio(); };
  speechSynthesis.speak(u);
}
function audioStop() { A.playing = false; try { speechSynthesis.cancel(); } catch (e) {} }
function paintAudio() {
  document.querySelectorAll('#aText .sent').forEach((s, i) => s.classList.toggle('on', i === A.i && A.playing));
  const cur = document.querySelector('#aText .sent.on'); cur && cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const b = $('#aPlay'); if (b) b.textContent = A.playing ? '⏸ Pause' : A.i > 0 && A.i < A.q.length ? '▶ Resume' : '▶ Play';
}
page('audio', 'Audio Intel', 'Your Intel notes, read aloud. Good for the bus, the gym or tired eyes. Code blocks are skipped.', async body => {
  audioStop();
  if (!('speechSynthesis' in window)) { body.innerHTML = '<p class="mut">This browser has no text-to-speech.</p>'; return; }
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>SOURCE</h3>${await modulePicker('aMod', A.mod && A.mod.id)}<div class="blist" id="aNodes" style="margin-top:10px;max-height:52vh;overflow:auto"></div></div>
    <div class="box"><h3 id="aTitle">PICK A NODE</h3><div class="row2"><button class="btn go" id="aPlay" disabled>▶ Play</button><button class="btn" id="aStop">■ Stop</button>
    <select class="sel" id="aRate">${[0.8, 0.9, 1, 1.15, 1.3, 1.5].map(r => `<option value="${r}"${+(local.get('lw-tts-rate') || 1) === r ? ' selected' : ''}>${r}×</option>`).join('')}</select><select class="sel" id="aVoice" style="max-width:220px"></select></div>
    <div class="atext" id="aText" style="margin-top:12px"><p class="mut">Choose a node on the left.</p></div></div></div>`;
  if (!body.isConnected) return;
  const fillVoices = () => { const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); const cur = local.get('lw-tts-voice'); const sel = $('#aVoice'); if (!sel) return; sel.innerHTML = '<option value="">Default voice</option>' + vs.map(v => `<option${v.name === cur ? ' selected' : ''}>${esc(v.name)}</option>`).join(''); };
  fillVoices(); speechSynthesis.onvoiceschanged = fillVoices;
  const list = async () => {
    A.mod = await LW.getModule($('#aMod').value);
    const st = (LW.S.mods[A.mod.id] || {}).nodes || {};
    $('#aNodes').innerHTML = A.mod.nodes.map(n => `<button class="bnode" data-an="${esc(n.id)}"><i class="dt ${(st[n.id] || {}).read ? 'seen' : 'never'}"></i><div><b>${esc(n.code)}</b><span>${esc(clip(n.name, 60))}</span></div></button>`).join('') || '<p class="mut">No nodes.</p>';
  };
  await list(); $('#aMod').onchange = list;
  $('#aNodes').onclick = e => {
    const b = e.target.closest('[data-an]'); if (!b) return;
    audioStop(); A.node = A.mod.nodes.find(n => n.id === b.dataset.an);
    A.q = sentences(A.node.code + '. ' + A.node.name + '.\n' + mdToSpeech(A.node.md)); A.i = 0;
    $('#aTitle').textContent = A.node.code;
    $('#aText').innerHTML = A.q.map((s, i) => `<span class="sent" data-si="${i}">${esc(s)}</span> `).join('');
    $('#aPlay').disabled = false; paintAudio();
  };
  $('#aText').onclick = e => { const s = e.target.closest('[data-si]'); if (!s) return; audioStop(); A.i = +s.dataset.si; A.playing = true; paintAudio(); speakNext(); };
  $('#aPlay').onclick = () => { if (A.playing) { audioStop(); paintAudio(); return; } if (A.i >= A.q.length) A.i = 0; A.playing = true; paintAudio(); speakNext(); };
  $('#aStop').onclick = () => { audioStop(); A.i = 0; paintAudio(); };
  $('#aRate').onchange = e => local.set('lw-tts-rate', e.target.value);
  $('#aVoice').onchange = e => local.set('lw-tts-voice', e.target.value);
});

// ================= LIFE OPS: tasks, habits, tracks =================
const live = o => Object.entries(o).filter(([, v]) => !v.del);
page('tasks', 'Tasks', 'Personal missions. Each one completed pays +15 XP to its track.', body => {
  const tasks = live(X().tasks);
  const open_ = tasks.filter(([, t]) => !t.done).sort((a, b) => (a[1].due || '9') < (b[1].due || '9') ? -1 : 1);
  const done = tasks.filter(([, t]) => t.done).sort((a, b) => b[1].done - a[1].done).slice(0, 12);
  const row = ([id, t]) => { const late = !t.done && t.due && t.due < day(); return `<div class="task${t.done ? ' done' : ''}"><button class="tk" data-tk="${id}" aria-label="Toggle">${t.done ? '✓' : ''}</button><div><span class="tt">${trDot(t.tr)}${esc(t.title)}</span><small>${TRACKS[t.tr] ? TRACKS[t.tr].name : ''}${t.due ? ` · ${late ? '<b style="color:var(--red)">overdue</b> ' : 'due '}${esc(t.due)}` : ''}</small></div><button class="btn sm" data-tdel="${id}" aria-label="Delete">✕</button></div>`; };
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>NEW TASK</h3><input class="inp" id="tT" placeholder="e.g. Finish SSWD mini project form page" maxlength="140"><div class="row2" style="margin-top:8px">${trSel('tTr', local.get('lw-ttr') || 'life')}<input class="inp" type="date" id="tD" style="width:auto;margin:0"></div><button class="btn go" id="tAdd" style="margin-top:10px;width:100%">＋ Add task</button></div>
    <div class="box"><h3>ACTIVE (${open_.length})</h3>${open_.map(row).join('') || '<p class="mut">Nothing pending. Add one on the left.</p>'}</div>
    <div class="box"><h3>DONE</h3>${done.map(row).join('') || '<p class="mut">Nothing completed yet.</p>'}</div></div>`;
  const add = () => { const title = $('#tT').value.trim(); if (!title) return; const tr = $('#tTr').value; local.set('lw-ttr', tr); X().tasks[uid()] = { title, tr, due: $('#tD').value || '', done: 0, t: Date.now() }; LW.save(); sfx('tick'); PAGES.tasks.r(body); setTimeout(() => $('#tT').focus(), 30); };
  $('#tAdd').onclick = add; $('#tT').onkeydown = e => { if (e.key === 'Enter') add(); };
});
function toggleTask(id) {
  const t = X().tasks[id]; if (!t) return;
  t.t = Date.now();
  if (t.done) { t.done = 0; count('task', -1); addT(t.tr, -15, 'Task reopened'); }
  else { t.done = Date.now(); count('task'); sfx('granted'); addT(t.tr, 15, 'Task done'); }
}
let delArm = '';
document.addEventListener('click', e => {
  const k = e.target.closest('[data-tk]'); if (k) { toggleTask(k.dataset.tk); refreshAll(); return; }
  const d = e.target.closest('[data-tdel]');
  if (d) { const id = d.dataset.tdel; if (delArm !== id) { delArm = id; d.textContent = 'sure?'; setTimeout(() => { if (delArm === id) delArm = ''; }, 2500); return; } X().tasks[id] = { del: 1, t: Date.now() }; delArm = ''; LW.save(); refreshAll(); }
});
const hOn = (d, id) => { const r = (X().hlog[d] || {})[id]; return !!(r && r.v); };
function hStreak(id) { let n = 0; const d = new Date(); if (!hOn(dkey(d), id)) d.setDate(d.getDate() - 1); while (hOn(dkey(d), id)) { n++; d.setDate(d.getDate() - 1); } return n; }
page('habits', 'Habits', 'Daily checks. +10 XP to the habit\'s track each day. You can still tick yesterday if you forgot.', body => {
  const hs = live(X().habits).sort((a, b) => a[1].t0 - b[1].t0);
  const ds = daysBack(7), wd = d => 'SMTWTFS'[new Date(d + 'T12:00').getDay()];
  body.innerHTML = `<div class="opgrid"><div class="box" style="grid-column:1/-1;overflow-x:auto"><h3>THIS WEEK</h3>${hs.length ? `<div class="hgrid" style="min-width:420px"><span></span>${ds.map(d => `<span class="hh">${wd(d)}<br>${d.slice(8)}</span>`).join('')}<span class="hh">streak</span>` +
    hs.map(([id, h]) => `<span class="hn">${trDot(h.tr)}${esc(h.name)} <button class="btn sm" data-hdel="${id}" style="min-height:24px;padding:0 6px">✕</button></span>` + ds.map((d, i) => `<button class="hc${hOn(d, id) ? ' on' : ''}" data-hc="${id}" data-d="${d}" ${i < 5 ? 'disabled' : ''} style="${hOn(d, id) ? `background:${TRACKS[h.tr].c}` : ''}" aria-label="${esc(h.name)} ${d}"></button>`).join('') + `<b style="text-align:center">${hStreak(id)}d</b>`).join('') + '</div>' : '<p class="mut">No habits yet. Try: Gym, Read 20 pages, Sleep before 00:00, Write 300 words.</p>'}</div>
    <div class="box"><h3>NEW HABIT</h3><input class="inp" id="hN" placeholder="e.g. Gym" maxlength="60">${trSel('hTr', 'gym')}<button class="btn go" id="hAdd" style="margin-top:10px;width:100%">＋ Add habit</button></div></div>`;
  const add = () => { const name = $('#hN').value.trim(); if (!name) return; X().habits[uid()] = { name, tr: $('#hTr').value, t: Date.now(), t0: Date.now() }; LW.save(); PAGES.habits.r(body); };
  $('#hAdd').onclick = add; $('#hN').onkeydown = e => { if (e.key === 'Enter') add(); };
});
document.addEventListener('click', e => {
  const c = e.target.closest('[data-hc]');
  if (c && !c.disabled) {
    const id = c.dataset.hc, d = c.dataset.d, h = X().habits[id]; if (!h) return;
    const r = (X().hlog[d] ||= {}), on = !(r[id] && r[id].v);
    r[id] = { v: on ? 1 : 0, t: Date.now() };
    if (d === day()) count('habit', on ? 1 : -1); else LW.save();
    if (on) sfx('granted');
    addT(h.tr, on ? 10 : -10, on ? h.name + ' ✓' : h.name + ' unchecked');
    refreshAll(); return;
  }
  const x = e.target.closest('[data-hdel]');
  if (x) { const id = x.dataset.hdel; if (delArm !== id) { delArm = id; x.textContent = 'sure?'; return; } X().habits[id] = { del: 1, t: Date.now() }; delArm = ''; LW.save(); refreshAll(); }
});
const SRC = { focus: 'Infiltration', lockin: 'Lock-in', log: 'Logged', debrief: 'Debrief', book: 'Library', ink: 'Ink Log', legacy: 'Old log', pr: 'Gym PR' };
page('tracks', 'Tracks & Seasons', 'Big number = today. Bar = 7-day signal (it drains if you stop). Rank = your form over the last 30 active days. Archive = lifetime.', (body, arg) => {
  const S_ = SEASON(), ds = daysBack(14), mx = Math.max(30, ...ds.map(d => TR.reduce((a, t) => a + (minDay(d)[t] || 0), 0)));
  let chart = `<svg viewBox="0 0 700 180" style="width:100%">`;
  ds.forEach((d, i) => { let y = 160; const x = 10 + i * 49, md = minDay(d); TR.forEach(t => { const v = md[t] || 0; if (!v) return; const h = v / mx * 140; y -= h; chart += `<rect x="${x}" y="${y}" width="34" height="${h}" fill="${TRACKS[t].c}" rx="2"><title>${d} ${TRACKS[t].name}: ${v} min</title></rect>`; }); chart += `<text x="${x + 17}" y="176" text-anchor="middle" style="font:10px var(--mono);fill:#5c6870">${d.slice(8)}</text>`; });
  chart += '</svg>';
  const hist = sessOn(null).sort((a, b) => (b.d || '').localeCompare(a.d || '') || (b.t - a.t)).slice(0, 40);
  const what = x => [x.m ? x.m + ' min' : '', x.pages ? x.pages + ' pages' : '', x.words ? x.words + ' words' : '', x.kind || '', x.note || ''].filter(Boolean).join(' · ');
  body.innerHTML = `<div class="box seasonbar"><h3>SEASON</h3><div class="chips">${[['semester', '🎓 Semester'], ['holidays', '🌴 Holidays'], ['exams', '🔥 Exams']].map(([k, v]) => `<button class="chip${S_.mode === k ? ' on' : ''}" data-mode="${k}">${v}</button>`).join('')}</div>
      <p class="mut">Holidays puts UNI to sleep: no draining, no questions, hidden from Home. Exams makes Daily Ops all-uni. Pause any single track below.</p>
      <div class="row2" style="margin-top:8px">${TR.map(t => `<button class="chip${isPaused(t) ? '' : ' on'}" data-pause="${t}" style="${isPaused(t) ? '' : `border-color:${TRACKS[t].c};color:${TRACKS[t].c};background:transparent`}">${isPaused(t) ? '⏸' : '●'} ${TRACKS[t].name}</button>`).join('')}</div></div>
    <div class="opgrid" style="margin-top:14px">${TR.map(t => { const c = TRACKS[t].c, sg = sig(t), f = formRank(t), p = isPaused(t); return `<div class="box${p ? ' dimbox' : ''}" style="border-color:color-mix(in srgb,${c} 35%,var(--line))"><div class="row2" style="justify-content:space-between"><h3 style="color:${c};margin:0">${TRACKS[t].name}</h3>${p ? '<span class="pill">asleep</span>' : ''}</div><span class="mut">${esc(TRACKS[t].long)}</span>
      <div class="big" style="margin:8px 0">${p ? '—' : '+' + todayXP(t)}<small style="font-size:13px"> today</small></div>
      <div class="bar3" title="7-day signal"><i style="width:${sg.pct}%;background:${c}"></i></div><p class="mut" style="margin:6px 0 0">7-day signal ${sg.v}/${TARGET7[t]} XP</p>
      <p class="mut" style="margin:6px 0 0"><b style="color:var(--ink)">${esc(f.name)}</b> (form: ${f.v} XP in 30 days)${f.next ? ` · ${f.next[0] - f.v} to ${esc(f.next[1])}` : ''}</p>
      <p class="mut" style="margin:6px 0 0">Archive: ${xpOf(t)} XP lifetime</p></div>`; }).join('')}</div>
    <div class="opgrid" style="margin-top:14px"><div class="box" id="logBox"><h3>LOG A SESSION</h3><p class="mut">Did something away from the app? Log it. 1 XP per minute (Uni: ½ XP). Logged it by mistake? Undo it in the session log.</p>${trSel('lTr', arg === 'log' ? 'gym' : 'read')}<div class="row2" style="margin-top:8px"><input class="inp" type="number" id="lMin" min="5" max="300" value="30" style="width:110px;margin:0"><span class="mut">minutes</span></div><button class="btn go" id="lGo" style="margin-top:10px;width:100%">Log session</button></div>
    <div class="box" style="grid-column:span 2;min-width:0"><h3>SESSION LOG · tap ✕ to undo (XP comes back off too)</h3><div class="slog">${hist.map(x => `<div class="srow"><i class="tdot" style="background:${TRACKS[x.tr] ? TRACKS[x.tr].c : '#888'}"></i><span class="sd">${esc(x.d.slice(5))}</span><span class="sw"><b>${TRACKS[x.tr] ? TRACKS[x.tr].name : x.tr}</b> ${esc(SRC[x.src] || x.src)}${what(x) ? ' · ' + esc(what(x)) : ''}</span><span class="sx">${x.xp ? '+' + x.xp + ' XP' : ''}</span><button class="btn sm" data-sdel="${x.id}" aria-label="Undo">✕</button></div>`).join('') || '<p class="mut">No sessions yet.</p>'}</div></div>
    <div class="box" style="grid-column:1/-1"><h3>LAST 14 DAYS (minutes)</h3>${chart}<div class="hubleg">${TR.map(t => `<span><i style="background:${TRACKS[t].c}"></i>${TRACKS[t].name}</span>`).join('')}</div></div></div>`;
  $('#lGo').onclick = () => {
    const tr = $('#lTr').value, m = Math.min(300, Math.max(1, Math.round(+$('#lMin').value || 0)));
    addSession(tr, m, tr === 'uni' ? Math.round(m / 2) : Math.min(180, m), 'log', null, `${m} min logged`); sfx('granted');
    PAGES.tracks.r(body, arg);
  };
  body.querySelector('.seasonbar').onclick = e => {
    const m = e.target.closest('[data-mode]'); if (m) { setMode(m.dataset.mode); sfx('tick'); return PAGES.tracks.r(body, arg); }
    const p = e.target.closest('[data-pause]'); if (p) { setPaused(p.dataset.pause, !isPaused(p.dataset.pause)); sfx('tick'); PAGES.tracks.r(body, arg); }
  };
  if (arg === 'log') setTimeout(() => $('#logBox') && $('#logBox').scrollIntoView({ block: 'center' }), 60);
});
let sdelArm = '';
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sdel]'); if (!b) return;
  const id = b.dataset.sdel;
  if (sdelArm !== id) { sdelArm = id; b.textContent = 'undo?'; setTimeout(() => { if (sdelArm === id) { sdelArm = ''; if (b.isConnected) b.textContent = '✕'; } }, 2500); return; }
  sdelArm = ''; delSession(id); sfx('denied'); refreshAll();
});

// ================= ENCRYPTED VAULT (journal) =================
const te = new TextEncoder(), td = new TextDecoder();
const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const V = { pin: null, keys: {}, cache: {}, idleT: 0 };
async function vKey(salt) {
  if (V.keys[salt]) return V.keys[salt];
  const base = await crypto.subtle.importKey('raw', te.encode(V.pin), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(salt), iterations: 210000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return (V.keys[salt] = k);
}
async function vEnc(obj) { const s = X().jr.salt, iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await vKey(s), te.encode(JSON.stringify(obj))); return { s, iv: b64e(iv), ct: b64e(new Uint8Array(ct)) }; }
async function vDec(e) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(e.iv) }, await vKey(e.s), b64d(e.ct)); return JSON.parse(td.decode(pt)); }
function lockVault() { V.pin = null; V.keys = {}; V.cache = {}; clearTimeout(V.idleT); if (onOp('journal')) PAGES.journal.r($('#opBody')); }
const vUnlocked = () => !!V.pin;
function vTouch() { clearTimeout(V.idleT); if (vUnlocked()) V.idleT = setTimeout(() => { lockVault(); LW.toast('Vault auto-locked'); }, 5 * 60e3); }
document.addEventListener('visibilitychange', () => { if (document.hidden && vUnlocked()) lockVault(); });
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (vUnlocked()) vTouch(); }, { passive: true }));
const lockSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5.5 11h13v10h-13z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2.5"/></svg>';
page('journal', 'Vault', 'Encrypted journal. AES-256 with a key made from your PIN. Only scrambled data is stored and synced; the PIN never leaves your head.', async (body, arg) => {
  const jr = X().jr;
  if (!crypto.subtle) { body.innerHTML = '<p class="mut">Encryption needs HTTPS. Open the app from its github.io address.</p>'; return; }
  if (!jr.ver) {
    body.innerHTML = `<div class="lockscr box">${lockSvg}<h3>SET YOUR VAULT PIN</h3><p class="mut">4+ digits or a passphrase. <b style="color:var(--red)">If you forget it, nobody can recover your entries</b>, not even me.</p><input class="inp pin" id="vP1" type="password" inputmode="numeric" placeholder="PIN" autocomplete="new-password"><input class="inp pin" id="vP2" type="password" inputmode="numeric" placeholder="Confirm PIN" autocomplete="new-password"><button class="btn go" id="vSet" style="width:100%">Create vault</button></div>`;
    $('#vSet').onclick = async () => {
      const a = $('#vP1').value, b = $('#vP2').value;
      if (a.length < 4) return LW.toast('PIN must be 4+ characters', true);
      if (a !== b) return LW.toast('PINs don\'t match', true);
      V.pin = a; jr.salt = b64e(crypto.getRandomValues(new Uint8Array(16)));
      jr.ver = await vEnc({ ok: 'LW-OK' }); LW.save(); sfx('granted'); vTouch(); PAGES.journal.r(body, arg);
    };
    return;
  }
  if (!vUnlocked()) {
    body.innerHTML = `<div class="lockscr box">${lockSvg}<h3>VAULT LOCKED</h3><input class="inp pin" id="vPin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"><button class="btn go" id="vUn" style="width:100%">Unlock</button><p class="mut">Locks itself after 5 idle minutes or when you leave the app.</p><details style="margin-top:6px"><summary class="mut" style="cursor:pointer">Forgot PIN?</summary><p class="mut">Entries can't be recovered without it. You can reset the vault, which deletes every entry on all devices.</p><button class="btn red sm" id="vReset">Reset vault (delete all)</button></details></div>`;
    const go = async () => {
      V.pin = $('#vPin').value;
      try { const v = await vDec(jr.ver); if (v.ok !== 'LW-OK') throw 0; sfx('granted'); vTouch(); PAGES.journal.r(body, arg); }
      catch (e) { V.pin = null; V.keys = {}; sfx('denied'); LW.toast('ACCESS DENIED', true); $('#vPin').value = ''; }
    };
    $('#vUn').onclick = go; $('#vPin').onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#vPin').focus(), 50);
    let arm = 0; $('#vReset').onclick = e => { if (!arm) { arm = 1; e.target.textContent = 'Click again: delete everything'; return; } Object.keys(jr.items).forEach(id => { jr.items[id] = { del: 1, t: Date.now() }; }); delete jr.ver; delete jr.salt; LW.save(); LW.toast('Vault reset'); PAGES.journal.r(body); };
    return;
  }
  const ids = Object.entries(jr.items).filter(([, v]) => !v.del);
  for (const [id, e] of ids) if (!V.cache[id] || V.cache[id]._t !== e.t) { try { V.cache[id] = Object.assign(await vDec(e), { _t: e.t }); } catch (er) { V.cache[id] = { title: '(unreadable: made with a different PIN)', body: '', d: '', bad: 1, _t: e.t }; } }
  const editing = arg === 'new' ? { id: uid(), title: '', body: '', d: day(), isNew: 1 } : arg && arg.edit ? Object.assign({ id: arg.edit }, V.cache[arg.edit]) : null;
  if (editing) {
    body.innerHTML = `<div class="box" style="max-width:820px"><div class="row2"><input class="inp" id="jT" placeholder="Title" value="${esc(editing.title)}" style="flex:1;margin:0"><input class="inp" type="date" id="jD" value="${esc(editing.d || day())}" style="width:auto;margin:0"></div><textarea class="inp" id="jB" style="min-height:46vh;margin-top:10px;font-family:var(--read)" placeholder="Write. Nobody else can read this.">${esc(editing.body)}</textarea><div class="row2" style="margin-top:10px;justify-content:space-between"><div class="row2"><button class="btn go" id="jS">Encrypt &amp; save</button><button class="btn" id="jC">Cancel</button></div>${editing.isNew ? '' : '<button class="btn red" id="jX">Delete</button>'}</div></div>`;
    $('#jS').onclick = async () => {
      const o = { title: $('#jT').value.trim() || 'Untitled', body: $('#jB').value, d: $('#jD').value || day() };
      jr.items[editing.id] = Object.assign(await vEnc(o), { t: Date.now() });
      if (editing.isNew && !cntDay().journal) { count('journal'); addT('life', 5, 'Vault entry sealed'); } else LW.save();
      sfx('deploy'); CUR.arg = null; PAGES.journal.r(body);
    };
    $('#jC').onclick = () => { CUR.arg = null; PAGES.journal.r(body); };
    const x = $('#jX'); if (x) { let arm = 0; x.onclick = () => { if (!arm) { arm = 1; x.textContent = 'Click again to delete'; return; } jr.items[editing.id] = { del: 1, t: Date.now() }; LW.save(); CUR.arg = null; PAGES.journal.r(body); }; }
    setTimeout(() => $(editing.isNew ? '#jT' : '#jB').focus(), 50);
    return;
  }
  const list = ids.map(([id]) => [id, V.cache[id]]).sort((a, b) => (b[1].d || '').localeCompare(a[1].d || '') || b[1]._t - a[1]._t);
  body.innerHTML = `<div class="box" style="max-width:820px"><div class="row2" style="justify-content:space-between;margin-bottom:12px"><span class="mut">🔓 Unlocked · ${list.length} entr${list.length === 1 ? 'y' : 'ies'}</span><div class="row2"><button class="btn go" id="jNew">＋ New entry</button><button class="btn" id="jLock">Lock</button></div></div><div class="jl">${list.map(([id, e]) => `<button class="je" data-je="${id}"><b>${esc(e.title)}</b><small>${esc(e.d || '')} · ${esc(clip((e.body || '').replace(/\s+/g, ' '), 90))}</small></button>`).join('') || '<p class="mut">Empty vault. Write your first entry.</p>'}</div></div>`;
  $('#jNew').onclick = () => { CUR.arg = 'new'; PAGES.journal.r(body, 'new'); };
  $('#jLock').onclick = () => lockVault();
  body.querySelector('.jl').onclick = e => { const b = e.target.closest('[data-je]'); if (!b || V.cache[b.dataset.je].bad) return; CUR.arg = { edit: b.dataset.je }; PAGES.journal.r(body, CUR.arg); };
});

// ================= CIPHER LAB =================
const caesar = (s, k) => s.replace(/[a-z]/gi, ch => { const b = ch <= 'Z' ? 65 : 97; return String.fromCharCode((ch.charCodeAt(0) - b + k % 26 + 26) % 26 + b); });
const atbash = s => s.replace(/[a-z]/gi, ch => { const b = ch <= 'Z' ? 65 : 97; return String.fromCharCode(25 - (ch.charCodeAt(0) - b) + b); });
const vig = (s, key, dec) => { const k = key.toLowerCase().replace(/[^a-z]/g, ''); if (!k) return s; let j = 0; return s.replace(/[a-z]/gi, ch => { const sh = k.charCodeAt(j++ % k.length) - 97; return caesar(ch, dec ? -sh : sh); }); };
const ENC = {
  'Base64 →': s => b64e(te.encode(s)), '← Base64': s => td.decode(b64d(s.trim())),
  'Hex →': s => [...te.encode(s)].map(b => b.toString(16).padStart(2, '0')).join(' '), '← Hex': s => td.decode(new Uint8Array((s.replace(/[^0-9a-f]/gi, '').match(/../g) || []).map(h => parseInt(h, 16)))),
  'Binary →': s => [...te.encode(s)].map(b => b.toString(2).padStart(8, '0')).join(' '), '← Binary': s => td.decode(new Uint8Array((s.replace(/[^01]/g, '').match(/.{8}/g) || []).map(h => parseInt(h, 2)))),
  'URL →': s => encodeURIComponent(s), '← URL': s => decodeURIComponent(s)
};
async function sha(alg, s) { const h = await crypto.subtle.digest(alg, te.encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const COMMON = ['password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'football', '111111', 'sunshine', 'princess', 'master', 'shadow', 'superman', 'azerty', 'mauritius', 'passw0rd', 'qwerty123', '000000', 'trustno1', 'hello', 'freedom', 'whatever', 'batman', 'login', 'starwars'];
function strength(p) {
  if (!p) return { bits: 0, note: '' };
  let pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^a-z0-9]/i.test(p)) pool += 33;
  let bits = p.length * Math.log2(pool || 1); const notes = [];
  const low = p.toLowerCase().replace(/[@4]/g, 'a').replace(/[0]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/[$5]/g, 's');
  if (COMMON.some(w => low.includes(w))) { bits = Math.min(bits, 12 + Math.max(0, p.length - 8) * 2); notes.push('contains a very common password'); }
  if (/(.)\1{2,}/.test(p)) { bits *= 0.8; notes.push('repeated characters'); }
  if (/(abc|bcd|cde|123|234|345|456|567|678|789|qwe|wer|asd|zxc)/i.test(p)) { bits *= 0.85; notes.push('keyboard/sequence pattern'); }
  if (/^[A-Z]?[a-z]+\d{1,4}[!@#$]?$/.test(p)) { bits *= 0.7; notes.push('word + number pattern (attackers try this first)'); }
  if (p.length < 12) notes.push('under 12 characters');
  return { bits: Math.round(bits), note: notes.join(' · ') };
}
function crackTime(bits) {
  const s = Math.pow(2, bits) / 2 / 1e10;
  if (s < 1) return 'instantly'; const U = [[31557600e9, 'billion years'], [31557600e6, 'million years'], [31557600e3, 'thousand years'], [31557600, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']];
  for (const [u, n] of U) if (s >= u) return `${s / u >= 1000 ? '1000+' : Math.round(s / u)} ${n}`; return 'seconds';
}
const WORDS = 'anchor binary cobalt delta ember falcon glacier harbor ion jungle kernel lantern matrix nebula oasis pixel quartz raven signal tundra uplink vector wolf xenon yonder zenith cipher shadow orbit ember prism socket vertex marble thunder copper meadow saffron tiger lagoon coral summit pepper dodo trident monsoon nectar breeze island volcano lychee comet atlas beacon canyon dune echo forge grove hollow ivory jasper kite lotus maple north onyx pulse quiver ridge storm torch umber velvet willow yarrow zephyr'.split(' ');
const rand = n => { const a = new Uint32Array(1); const lim = Math.floor(4294967296 / n) * n; do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; };
page('cipher', 'Cipher Lab', 'Classic ciphers, encodings, hashes and passwords. Everything runs on your device; nothing is sent anywhere.', (body, arg) => {
  const tabs = { ciphers: 'Ciphers', encode: 'Encode', hash: 'Hash', pass: 'Password Forge' };
  const cur = tabs[arg] ? arg : 'ciphers';
  body.innerHTML = `<div class="chips">${Object.entries(tabs).map(([k, v]) => `<button class="chip${k === cur ? ' on' : ''}" data-ct="${k}">${v}</button>`).join('')}</div><div id="cBody"></div>`;
  body.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-ct]'); if (b) { CUR.arg = b.dataset.ct; visit(b.dataset.ct === 'ciphers' ? 'cipher' : b.dataset.ct); PAGES.cipher.r(body, b.dataset.ct); } };
  const cb = $('#cBody'), hit = () => count('cipher');
  if (cur === 'ciphers') {
    cb.innerHTML = `<div class="opgrid"><div class="box"><h3>CAESAR</h3><textarea class="inp" id="cIn" placeholder="Type or paste text">Wkh zroi uhylvhv lq wkh gdun.</textarea><div class="row2" style="margin-top:8px"><label class="mut">Shift <b id="cK">3</b></label><input type="range" id="cR" min="0" max="25" value="3" style="flex:1"></div><div class="row2" style="margin-top:6px"><button class="btn sm" id="cE">Encrypt</button><button class="btn sm" id="cD">Decrypt</button><button class="btn sm go" id="cB">Brute force all 25</button><button class="btn sm" id="cRot">ROT13</button><button class="btn sm" id="cAt">Atbash</button></div><div class="out" id="cOut"></div></div>
      <div class="box"><h3>VIGENÈRE</h3><textarea class="inp" id="vIn" placeholder="Text"></textarea><input class="inp" id="vK" placeholder="Key (letters)" value="WOLF"><div class="row2" style="margin-top:8px"><button class="btn sm" id="vE">Encrypt</button><button class="btn sm" id="vD">Decrypt</button></div><div class="out" id="vOut"></div><p class="mut" style="margin-top:10px">Caesar has only 25 keys, so brute force cracks it instantly. Vigenère resisted for ~300 years until frequency analysis on the key length broke it. Modern crypto (AES) has 2²⁵⁶ keys.</p></div></div>`;
    const k = () => +$('#cR').value; $('#cR').oninput = () => { $('#cK').textContent = k(); };
    $('#cE').onclick = () => { $('#cOut').textContent = caesar($('#cIn').value, k()); hit(); };
    $('#cD').onclick = () => { $('#cOut').textContent = caesar($('#cIn').value, -k()); hit(); };
    $('#cRot').onclick = () => { $('#cOut').textContent = caesar($('#cIn').value, 13); hit(); };
    $('#cAt').onclick = () => { $('#cOut').textContent = atbash($('#cIn').value); hit(); };
    $('#cB').onclick = () => { $('#cOut').innerHTML = Array.from({ length: 25 }, (_, i) => `<span class="d">${String(i + 1).padStart(2, '0')}</span>  ${esc(caesar($('#cIn').value, -(i + 1)))}`).join('\n'); hit(); sfx('breach'); };
    $('#vE').onclick = () => { $('#vOut').textContent = vig($('#vIn').value, $('#vK').value); hit(); };
    $('#vD').onclick = () => { $('#vOut').textContent = vig($('#vIn').value, $('#vK').value, 1); hit(); };
  }
  if (cur === 'encode') {
    cb.innerHTML = `<div class="box" style="max-width:820px"><textarea class="inp" id="eIn" placeholder="Text to encode / decode">LONEWOLF</textarea><div class="row2" style="margin-top:8px">${Object.keys(ENC).map(k => `<button class="btn sm" data-enc="${esc(k)}">${esc(k)}</button>`).join('')}</div><div class="out" id="eOut"></div><div class="row2" style="margin-top:8px"><button class="btn sm" id="eSwap">↑ Use output as input</button><button class="btn sm" id="eCopy">Copy</button></div><p class="ethic" style="margin-top:14px">Encoding ≠ encryption. Base64 has no key: anyone can reverse it. If you see a "secret" in Base64 in someone's code, it's not secret.</p></div>`;
    cb.querySelector('.row2').onclick = e => { const b = e.target.closest('[data-enc]'); if (!b) return; try { $('#eOut').textContent = ENC[b.dataset.enc]($('#eIn').value); hit(); } catch (er) { $('#eOut').innerHTML = '<span class="r">Invalid input for that decoder.</span>'; } };
    $('#eSwap').onclick = () => { $('#eIn').value = $('#eOut').textContent; };
    $('#eCopy').onclick = () => LW.copyText($('#eOut').textContent);
  }
  if (cur === 'hash') {
    cb.innerHTML = `<div class="opgrid"><div class="box"><h3>HASH</h3><select class="sel" id="hA">${['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'].map(a => `<option>${a}</option>`).join('')}</select><textarea class="inp" id="h1" style="margin-top:8px">lonewolf</textarea><div class="out" id="h1o"></div><textarea class="inp" id="h2" style="margin-top:12px">LoneWolf</textarea><div class="out" id="h2o"></div><p class="mut" id="hDiff" style="margin-top:8px"></p></div>
      <div class="box"><h3>WHY IT MATTERS</h3><p class="hint2">A hash is one-way: same input → same output, and you can't turn it back. Change one letter and about half the bits flip (the avalanche effect, compare above).</p><p class="hint2" style="margin-top:10px">But fast hashes (SHA, MD5) are <b>wrong for passwords</b>: a GPU tries billions per second. In PHP use <code style="color:var(--go)">password_hash($p, PASSWORD_DEFAULT)</code> and <code style="color:var(--go)">password_verify()</code>. They add a random salt and are deliberately slow.</p><p class="mut" style="margin-top:10px">SHA-1 is broken for collisions; shown here for learning.</p></div></div>`;
    const run = async () => { const a = $('#hA').value; const x = await sha(a, $('#h1').value), y = await sha(a, $('#h2').value); $('#h1o').textContent = x; $('#h2o').textContent = y; let diff = 0; for (let i = 0; i < x.length; i++) diff += (parseInt(x[i], 16) ^ parseInt(y[i], 16)).toString(2).replace(/0/g, '').length; $('#hDiff').textContent = x === y ? 'Identical inputs → identical hashes.' : `${diff} of ${x.length * 4} bits differ (${Math.round(diff / (x.length * 4) * 100)}%).`; };
    ['#h1', '#h2'].forEach(s => { $(s).oninput = run; $(s).addEventListener('input', hit, { once: true }); }); $('#hA').onchange = run; run();
  }
  if (cur === 'pass') {
    cb.innerHTML = `<div class="opgrid"><div class="box"><h3>GENERATE</h3><div class="chips" id="pM"><button class="chip on" data-pm="chars">Characters</button><button class="chip" data-pm="words">Passphrase</button></div><div class="row2"><label class="mut">Length <b id="pLn">20</b></label><input type="range" id="pL" min="8" max="64" value="20" style="flex:1"></div><div class="row2 mut" id="pSets" style="margin-top:6px"><label><input type="checkbox" checked data-s="a"> a-z</label><label><input type="checkbox" checked data-s="A"> A-Z</label><label><input type="checkbox" checked data-s="9"> 0-9</label><label><input type="checkbox" checked data-s="#"> symbols</label></div><div class="out" id="pOut" style="font-size:16px"></div><div class="row2" style="margin-top:8px"><button class="btn go sm" id="pGen">Regenerate</button><button class="btn sm" id="pCopy">Copy</button></div><p class="mut" id="pInfo" style="margin-top:8px"></p></div>
      <div class="box"><h3>TEST A PASSWORD</h3><input class="inp" id="tP" type="password" placeholder="Type one (stays on this device)" autocomplete="off"><label class="row2 mut" style="margin-top:6px"><input type="checkbox" id="tShow"> show</label><div class="bar3" style="margin-top:10px"><i id="tBar" style="width:0"></i></div><p class="hint2" id="tInfo" style="margin-top:8px">Rough estimate, assuming an offline attack at 10 billion guesses/second.</p></div></div>`;
    let mode = 'chars';
    const gen = () => {
      let out = '', bits = 0; const L = +$('#pL').value;
      if (mode === 'words') { const n = Math.max(4, Math.round(L / 5)); out = Array.from({ length: n }, () => WORDS[rand(WORDS.length)]).join('-') + '-' + rand(100); bits = n * Math.log2(WORDS.length) + Math.log2(100); $('#pLn').textContent = n + ' words'; }
      else { const sets = { a: 'abcdefghijkmnopqrstuvwxyz', A: 'ABCDEFGHJKLMNPQRSTUVWXYZ', 9: '23456789', '#': '!@#$%^&*-_=+?' }; const on = [...document.querySelectorAll('#pSets input:checked')].map(i => sets[i.dataset.s]).join('') || sets.a; out = Array.from({ length: L }, () => on[rand(on.length)]).join(''); bits = L * Math.log2(on.length); $('#pLn').textContent = L; }
      $('#pOut').textContent = out; $('#pInfo').textContent = `≈ ${Math.round(bits)} bits of entropy · cracking: ${crackTime(bits)}`;
    };
    $('#pM').onclick = e => { const b = e.target.closest('[data-pm]'); if (!b) return; mode = b.dataset.pm; document.querySelectorAll('#pM .chip').forEach(c => c.classList.toggle('on', c === b)); $('#pSets').style.display = mode === 'words' ? 'none' : ''; gen(); };
    $('#pL').oninput = gen; $('#pSets').onchange = gen; $('#pGen').onclick = () => { gen(); hit(); sfx('tick'); }; $('#pCopy').onclick = () => { LW.copyText($('#pOut').textContent, 'Copied. Store it in a password manager.'); hit(); };
    gen();
    $('#tShow').onchange = e => { $('#tP').type = e.target.checked ? 'text' : 'password'; };
    $('#tP').oninput = () => { const s = strength($('#tP').value), c = s.bits < 40 ? 'var(--red)' : s.bits < 70 ? 'var(--amber)' : 'var(--go)'; $('#tBar').style.width = Math.min(100, s.bits / 1.2) + '%'; $('#tBar').style.background = c; $('#tInfo').innerHTML = $('#tP').value ? `<b style="color:${c}">≈ ${s.bits} bits</b> · cracking: ${crackTime(s.bits)}${s.note ? '<br><span class="mut">' + esc(s.note) + '</span>' : ''}` : 'Rough estimate, assuming an offline attack at 10 billion guesses/second.'; };
    $('#tP').addEventListener('change', hit, { once: true });
  }
});

// ================= FIELD MANUAL (ethical hacking tips) =================
const MAN = [
  ['DEFEND', 'One password per account', 'Attackers take leaked passwords from one site and try them everywhere ("credential stuffing"). A password manager makes unique passwords painless.', 'Install Bitwarden (free) and change the passwords for your email, bank and GitHub first.'],
  ['DEFEND', 'Turn on 2FA (app, not SMS)', 'A second factor stops most account takeovers even if your password leaks. Authenticator apps beat SMS, because SIM-swap attacks can steal texts.', 'Enable app-based 2FA on Gmail and GitHub today. Save the backup codes offline.'],
  ['DEFEND', 'Read the real sender', 'Phishing relies on urgency and look-alike domains (paypa1.com, micros0ft-support.net). The display name means nothing; the domain after @ is what counts.', 'In Gmail, open any email → ⋮ → Show original. Find the From domain and the SPF/DKIM result.'],
  ['DEFEND', 'Updates are security patches', 'Most attacks use known bugs (CVEs) that already have fixes. Unpatched = open door.', 'Search one CVE on cve.org (e.g. a PHP one) and read what versions it affected.'],
  ['DEFEND', 'Check if you\'ve been breached', 'Your email has probably appeared in at least one public breach. Knowing which tells you what to change.', 'Check your email on haveibeenpwned.com and rotate any passwords from breached sites.'],
  ['DEFEND', 'Backups: 3-2-1', '3 copies, on 2 different media, 1 off-site. Ransomware and dead laptops only hurt people without backups.', 'Your code already lives in GitHub. Do the same for your notes: one cloud copy + one USB copy.'],
  ['DEFEND', 'Public Wi-Fi reality', 'HTTPS protects the content of your traffic on public Wi-Fi; the network still sees which sites you visit. A VPN just moves that trust to the VPN company.', 'On campus Wi-Fi, check the padlock before logging in anywhere.'],
  ['PHP SEC', 'SQL injection: prepared statements', 'Never glue user input into SQL. `"... WHERE email=\'$email\'"` lets `\' OR 1=1 --` log in as anyone. Prepared statements send data separately from the query.', 'In your mini project: `$st = $pdo->prepare("SELECT * FROM users WHERE email = ?"); $st->execute([$email]);`'],
  ['PHP SEC', 'Hash passwords properly', 'Store `password_hash($pass, PASSWORD_DEFAULT)` and check with `password_verify($pass, $hash)`. Never md5/sha1, and never plain text.', 'Grep your mini project for md5( or sha1( and replace them.'],
  ['PHP SEC', 'XSS: escape all output', 'If you echo user input raw, someone can inject `<script>` that runs in other users\' browsers. Escape on output: `htmlspecialchars($s, ENT_QUOTES, \'UTF-8\')`.', 'Make a helper `function e($s){ return htmlspecialchars($s, ENT_QUOTES, \'UTF-8\'); }` and use it in every echo.'],
  ['PHP SEC', 'CSRF tokens on forms', 'Another site can make your logged-in browser submit a form to your app. A random token in the session plus a hidden field blocks it.', '`$_SESSION[\'csrf\'] = bin2hex(random_bytes(32));` then check with `hash_equals($_SESSION[\'csrf\'], $_POST[\'csrf\'])`.'],
  ['PHP SEC', 'Lock down sessions', 'After login call `session_regenerate_id(true)` (stops session fixation). Set cookie flags: HttpOnly, Secure, SameSite=Lax.', 'Add session_regenerate_id(true) right after a successful login in your project.'],
  ['PHP SEC', 'File uploads are dangerous', 'An upload named shell.php.jpg can become code on your server. Check the real type with `finfo`, rename files, limit size, store outside the web root.', 'Use `(new finfo(FILEINFO_MIME_TYPE))->file($tmp)` and allow only image/jpeg and image/png.'],
  ['PHP SEC', 'Validate every input', '$_GET, $_POST, cookies and headers are all attacker-controlled. Validate type and range: `filter_var($email, FILTER_VALIDATE_EMAIL)`, `(int)$_GET[\'id\']`.', 'Pick one form in your project and list every field with its validation rule.'],
  ['PHP SEC', 'Hide errors in production', 'Stack traces leak file paths, SQL and versions. In production use `display_errors=Off` and log errors instead.', 'Find display_errors in your XAMPP php.ini and understand the dev vs prod difference.'],
  ['PHP SEC', 'Least privilege database user', 'Your app shouldn\'t connect as root. Give it a MySQL user that can only SELECT/INSERT/UPDATE its own database.', 'In phpMyAdmin → User accounts, create an app user with rights on one DB only.'],
  ['WEB', 'Learn the OWASP Top 10', 'The industry list of the most critical web risks: broken access control, injection, crypto failures… Almost every exam and interview question on web security maps to it.', 'Read the OWASP Top 10 summary (owasp.org) and match each item to a tip in this manual.'],
  ['WEB', 'Free legal web labs', 'PortSwigger Web Security Academy has free, legal labs for SQLi, XSS, CSRF and more, built by the makers of Burp Suite.', 'Create an account and finish the first SQL injection lab.'],
  ['WEB', 'DevTools is a hacker tool', 'The Network tab shows every request your app sends: headers, cookies, payloads. Understanding your own traffic is step one.', 'Open DevTools (F12) on LONEWOLF → Network → reload. Find the service worker and the module JSON.'],
  ['WEB', 'Client-side checks aren\'t security', 'Anything in the browser can be changed: hidden fields, disabled buttons, JS validation, prices. The server must re-check everything.', 'Edit a hidden input value in DevTools on your own project and see if the server trusts it.'],
  ['WEB', 'Security headers', 'Headers like Content-Security-Policy, X-Frame-Options and Strict-Transport-Security add a safety net against XSS, clickjacking and downgrade attacks.', 'Scan your github.io site on securityheaders.com and read what each missing header does.'],
  ['WEB', 'What the padlock means', 'HTTPS = the connection is encrypted and the domain is verified. It does NOT mean the site is honest; phishing sites have padlocks too.', 'Click the padlock on any site and view its certificate: issuer, validity dates, domain.'],
  ['LINUX', 'Live in the terminal', 'Security work happens on the command line. Core commands: ls, cd, cat, less, grep, find, chmod, ps, man.', 'Play OverTheWire Bandit levels 0–5 (free, legal, in your browser via SSH).'],
  ['LINUX', 'File permissions', 'rwx for owner/group/others. `chmod 644` = owner writes, everyone reads (files). `755` for folders and scripts. 777 is almost always a mistake.', 'Run `ls -l` in a Linux shell (WSL on Windows) and decode three permission strings.'],
  ['LINUX', 'Pipes are superpowers', 'Chain small tools: `grep "404" access.log | wc -l` counts not-found hits. Log analysis is half of defensive security.', 'In WOLFSHELL try `help`, then in a real shell practise grep with -i, -n and -r.'],
  ['LINUX', 'SSH keys over passwords', 'Key pairs can\'t be brute-forced like passwords. The private key never leaves your machine; the public one goes on the server.', 'Generate one with `ssh-keygen -t ed25519` and add the public key to GitHub.'],
  ['NET', 'IP, port, DNS: the mental model', 'DNS turns names into IPs; the IP finds the machine; the port finds the service (80 HTTP, 443 HTTPS, 3306 MySQL, 22 SSH).', 'Run `nslookup github.com` and `ipconfig` in Windows Terminal. Note your local IP.'],
  ['NET', 'The TCP handshake', 'SYN → SYN-ACK → ACK opens every TCP connection. Port scanners and many attacks play with these flags.', 'Draw the handshake from memory, then check yourself.'],
  ['NET', 'Watch your own traffic', 'Wireshark shows packets on your own network card. Seeing DNS queries and the TLS handshake makes networking click.', 'Install Wireshark, capture 30 seconds, filter by `dns` and find a lookup you made.'],
  ['NET', 'Scanning: only your own targets', 'nmap is a standard admin tool, but scanning networks you don\'t own or have permission for can be illegal. Use your own machine or a lab.', 'Scan only yourself: `nmap -sV 127.0.0.1` with XAMPP running, and spot Apache and MySQL.'],
  ['PRACTICE', 'TryHackMe: guided start', 'Browser-based legal hacking rooms with step-by-step guidance. The free Pre-Security and Intro to Cyber paths are perfect for a SE student.', 'Make an account and complete one free room this week.'],
  ['PRACTICE', 'picoCTF', 'A free capture-the-flag platform by Carnegie Mellon, built for beginners: crypto, web, forensics and reverse engineering puzzles.', 'Solve 3 "General Skills" challenges. Your Cipher Lab helps with the crypto ones.'],
  ['PRACTICE', 'Hack your own copy', 'OWASP Juice Shop and DVWA are deliberately vulnerable apps you run locally. Attacking your own install is 100% legal.', 'Install DVWA on your XAMPP and do the SQL injection level on "low".'],
  ['PRACTICE', 'Write up every solve', 'Pros keep notes on every challenge: what worked, what didn\'t, the commands. It turns lucky solves into skill (same idea as your Intel notes).', 'After your next CTF or lab, write a 5-line write-up in the Vault.'],
  ['MINDSET', 'Permission is everything', 'The skills are the same; permission is what makes it legal. In Mauritius, as almost everywhere, accessing a system without authorisation is a criminal offence. Practise only on your own systems or legal labs.', 'Before any test, ask: do I own this, or do I have written permission?'],
  ['MINDSET', 'Think like an attacker while coding', 'For every input ask: what if this is empty, huge, negative, or code? That one habit prevents most of the bugs in this manual.', 'Review one PHP form in your project with that question for each field.'],
  ['MINDSET', 'People are the weakest link', 'Social engineering (fake IT support, urgent requests from the "boss") beats firewalls. Verify through a second channel before acting.', 'If a message asks for a code or password, call the person on a number you already have.'],
  ['MINDSET', 'Report, don\'t exploit', 'Found a bug in a real site? Responsible disclosure means telling the owner privately. Many companies pay bounties for it (HackerOne, Bugcrowd).', 'Read one public bug bounty program\'s rules and note what\'s in and out of scope.'],
  ['MINDSET', 'Hashing vs encryption vs encoding', 'Encoding (Base64) is reversible by anyone. Encryption (AES) is reversible with a key. Hashing (SHA, bcrypt) is one-way. Mixing these up is a classic exam and interview trap.', 'Explain all three out loud in one minute, then check in the Cipher Lab.']
];
const manId = i => 'm' + i;
const manReward = cat => (cat === 'DEFEND' || cat === 'MINDSET') ? 'life' : 'uni';
const tipOfDay = () => { const n = Math.floor(Date.now() / LW.DAY); return n % MAN.length; };
const fmtTip = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
page('manual', 'Field Manual', 'Ethical hacking & secure coding. Real skills, legal practice only. Mark an entry studied for +5 XP (once each).', (body, arg) => {
  const cat = arg || 'ALL', cats = ['ALL', ...new Set(MAN.map(m => m[0]))];
  const done = MAN.filter((_, i) => X().manual[manId(i)]).length;
  body.innerHTML = `<div class="ethic">⚠ Rule zero: only test systems you own or have written permission to test. Everything here is defensive knowledge or legal practice platforms.</div><div class="row2" style="justify-content:space-between;margin-bottom:10px"><div class="chips" style="margin:0">${cats.map(c => `<button class="chip${c === cat ? ' on' : ''}" data-mc="${c}">${c}</button>`).join('')}</div><span class="mut">${done}/${MAN.length} studied</span></div>
    <div style="max-width:880px">${MAN.map((m, i) => (cat === 'ALL' || m[0] === cat) ? `<div class="tip${X().manual[manId(i)] ? ' done' : ''}" data-tip="${i}"><header><b>${esc(m[1])}</b><span class="tag2">${m[0]}</span></header><div class="tb" hidden>${fmtTip(m[2])}<div class="pr">▸ Practice: ${fmtTip(m[3])}</div><div class="row2" style="margin-top:10px">${X().manual[manId(i)] ? '<span class="pill go">studied</span>' : `<button class="btn go sm" data-mdone="${i}">Mark studied +5 XP</button>`}</div></div></div>` : '').join('')}</div>`;
  body.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-mc]'); if (b) { CUR.arg = b.dataset.mc; PAGES.manual.r(body, b.dataset.mc); } };
  if (typeof arg === 'number') { /* no-op */ }
  const open1 = CUR && CUR.tip != null ? body.querySelector(`[data-tip="${CUR.tip}"] .tb`) : null; if (open1) { open1.hidden = false; open1.closest('.tip').scrollIntoView({ block: 'center' }); CUR.tip = null; }
});
document.addEventListener('click', e => {
  const h = e.target.closest('.tip header'); if (h) { const tb = h.parentElement.querySelector('.tb'); tb.hidden = !tb.hidden; return; }
  const d = e.target.closest('[data-mdone]');
  if (d) { const i = +d.dataset.mdone; if (X().manual[manId(i)]) return; X().manual[manId(i)] = 1; count('manual'); addT(manReward(MAN[i][0]), 5, 'Field Manual'); sfx('granted'); d.outerHTML = '<span class="pill go">studied</span>'; const t = document.querySelector(`[data-tip="${i}"]`); t && t.classList.add('done'); }
  const t = e.target.closest('[data-opentip]'); if (t) { openOp('manual'); CUR.tip = +t.dataset.opentip; PAGES.manual.r($('#opBody')); }
});

// ================= WOLFSHELL =================
const SH = { hist: (() => { try { return JSON.parse(local.get('lw-shell-h') || '[]'); } catch (e) { return []; } })(), hi: -1, lines: [] };
const shOut = html => { SH.lines.push(html); if (SH.lines.length > 400) SH.lines.splice(0, 100); const o = $('#shO'); if (o) { o.insertAdjacentHTML('beforeend', html + '\n'); o.scrollTop = o.scrollHeight; } };
const sp = (c, t) => `<span class="${c}">${esc(t)}</span>`;
const findTr = s => { s = (s || '').replace('#', '').toLowerCase(); return TR.find(t => t === s || TRACKS[t].name.toLowerCase() === s || (s === 'reading' && t === 'read') || (s === 'writing' && t === 'write')); };
const CMDS = {
  help: () => shOut([
    sp('g', 'WOLFSHELL v1') + sp('d', ' · commands'),
    '  whoami · date · xp · ops · sysinfo · clear · history',
    '  todo                 list tasks      todo add <text> [#gym|#read|#write|#life|#uni]',
    '  todo done <n>        complete #n     todo rm <n>',
    '  habit                list habits     habit add <name> [#track]    habit check <n>',
    '  log <track> <min>    log a session   e.g. log gym 45',
    '  focus <min> [track]  start an infiltration run',
    '  due · exam           cards due · exam countdowns',
    '  go <place>           home net intel burner blackbook terminal log forge rig',
    '                       ops breach boss heist focus audio tasks habits tracks journal cipher manual',
    '  tip                  random Field Manual entry',
    '  caesar <n> <text> · rot13 <text> · b64 <text> · unb64 <text>',
    '  hex <text> · unhex <hex> · hash <text> · pass [len]',
    '  lock · saver · matrix'].map(l => l.startsWith('<') ? l : esc(l)).join('\n')),
  clear: () => { SH.lines = []; const o = $('#shO'); if (o) o.innerHTML = ''; },
  whoami: () => shOut(`operator ${sp('g', 'HADES')} · uni rank ${sp('g', LW.rankOf(LW.S.xp)[1])} · streak ${LW.streak()}d`),
  date: () => shOut(new Date().toString()),
  history: () => shOut(SH.hist.slice(-20).map((h, i) => sp('d', String(i + 1).padStart(3)) + '  ' + esc(h)).join('\n') || sp('d', '(empty)')),
  xp: () => shOut(TR.map(t => { const xp = xpOf(t), r = rankIn(t, xp); const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20, '░'); return `<span style="color:${TRACKS[t].c}">${TRACKS[t].name.padEnd(5)}</span> ${bar} ${String(xp).padStart(5)} XP  ${esc(r.name)}`; }).join('\n')),
  ops: () => { const st = opsState(); shOut(st.list.map((x, i) => `${x.done ? sp('g', '[✓]') : sp('a', '[ ]')} ${i + 1}. ${esc(x.o.t)} ${sp('d', `(${x.v}/${x.o.n})`)}`).join('\n') + (st.paid ? '\n' + sp('g', 'payout claimed') : st.done === 3 ? '\n' + sp('a', 'all clear: claim it with `go ops`') : '')); },
  todo: a => {
    const tasks = () => live(X().tasks).filter(([, t]) => !t.done);
    if (!a[0]) { const t = tasks(); return shOut(t.length ? t.map(([, x], i) => `${String(i + 1).padStart(2)}. <span style="color:${TRACKS[x.tr].c}">●</span> ${esc(x.title)}${x.due ? sp('d', ' due ' + x.due) : ''}`).join('\n') : sp('d', 'no open tasks')); }
    if (a[0] === 'add') { let tr = 'life'; const words = a.slice(1).filter(w => { const f = w.startsWith('#') && findTr(w); if (f) tr = f; return !f; }); if (!words.length) return shOut(sp('r', 'usage: todo add <text> [#track]')); X().tasks[uid()] = { title: words.join(' '), tr, due: '', done: 0, t: Date.now() }; LW.save(); return shOut(sp('g', '+ task added') + ` → ${TRACKS[tr].name}`); }
    const n = +a[1], t = tasks()[n - 1]; if (!t) return shOut(sp('r', 'no task #' + (a[1] || '?')));
    if (a[0] === 'done') { toggleTask(t[0]); return shOut(sp('g', '✓ ' + t[1].title)); }
    if (a[0] === 'rm') { X().tasks[t[0]] = { del: 1, t: Date.now() }; LW.save(); return shOut(sp('a', '- removed ' + t[1].title)); }
    shOut(sp('r', 'todo: add | done <n> | rm <n>'));
  },
  habit: a => {
    const hs = live(X().habits).sort((x, y) => x[1].t0 - y[1].t0);
    if (!a[0]) return shOut(hs.length ? hs.map(([id, h], i) => `${String(i + 1).padStart(2)}. ${hOn(day(), id) ? sp('g', '[✓]') : '[ ]'} <span style="color:${TRACKS[h.tr].c}">${esc(h.name)}</span> ${sp('d', hStreak(id) + 'd streak')}`).join('\n') : sp('d', 'no habits: habit add <name> #gym'));
    if (a[0] === 'add') { let tr = 'life'; const w = a.slice(1).filter(x => { const f = x.startsWith('#') && findTr(x); if (f) tr = f; return !f; }); if (!w.length) return shOut(sp('r', 'usage: habit add <name> [#track]')); X().habits[uid()] = { name: w.join(' '), tr, t: Date.now(), t0: Date.now() }; LW.save(); return shOut(sp('g', '+ habit added')); }
    if (a[0] === 'check') { const h = hs[+a[1] - 1]; if (!h) return shOut(sp('r', 'no habit #' + a[1])); if (hOn(day(), h[0])) return shOut(sp('d', 'already checked today')); (X().hlog[day()] ||= {})[h[0]] = { v: 1, t: Date.now() }; count('habit'); addT(h[1].tr, 10, h[1].name + ' ✓'); return shOut(sp('g', '✓ ' + h[1].name)); }
    shOut(sp('r', 'habit: add | check <n>'));
  },
  log: a => { const tr = findTr(a[0]), m = Math.round(+a[1]); if (!tr || !(m > 0)) return shOut(sp('r', 'usage: log <gym|read|write|life|uni> <minutes>')); const mm = Math.min(300, m); addSession(tr, mm, tr === 'uni' ? Math.round(mm / 2) : Math.min(180, mm), 'log', null, `${mm} min logged`); shOut(sp('g', `logged ${mm} min → ${TRACKS[tr].name}`)); },
  focus: a => { const m = Math.round(+a[0]) || 25, tr = findTr(a[1]) || 'uni'; if (F.on) return shOut(sp('a', 'a run is already active')); focusStart(Math.min(180, m), tr, true, false); shOut(sp('g', `going dark: ${m} min on ${TRACKS[tr].name}`)); openOp('focus'); },
  due: async () => { const rows = []; for (const m of LW.modules()) { try { const mod = await LW.getModule(m.id); const st = (LW.S.mods[m.id] || {}).cards || {}; rows.push(`${m.code.padEnd(10)} ${String(mod.cards.filter(k => !st[k.id] || st[k.id].d <= Date.now()).length).padStart(4)} due / ${mod.cards.length}`); } catch (e) {} } shOut(esc(rows.join('\n') || 'no modules')); },
  exam: () => { const ex = Object.entries(LW.S.exams || {}); shOut(ex.length ? ex.map(([id, d]) => { const m = LW.modules().find(x => x.id === id); const n = Math.ceil((new Date(d + 'T09:00') - new Date()) / LW.DAY); return `${esc((m ? m.code : id).padEnd(10))} ${d}  ${n > 0 ? sp(n <= 7 ? 'r' : 'a', n + 'd') : sp('d', n === 0 ? 'TODAY' : 'done')}`; }).join('\n') : sp('d', 'no exam dates (set them in Rig)')); },
  go: a => { const p = (a[0] || '').toLowerCase(); if (['home', 'net', 'intel', 'burner', 'blackbook', 'terminal', 'log', 'forge', 'rig'].includes(p)) return LW.go(p); if (PAGES[p]) return openOp(p); if (p === 'cipher') return openOp('cipher', 'ciphers'); shOut(sp('r', 'unknown place: ' + p)); },
  tip: () => { const i = rnd(MAN.length), m = MAN[i]; shOut(`${sp('a', '[' + m[0] + ']')} ${sp('g', m[1])}\n${esc(m[2].replace(/`/g, ''))}\n${sp('c', '▸ ' + m[3].replace(/`/g, ''))}`); },
  caesar: a => { const k = parseInt(a[0], 10); if (isNaN(k)) return shOut(sp('r', 'usage: caesar <shift> <text>')); shOut(esc(caesar(a.slice(1).join(' '), k))); count('cipher'); },
  rot13: a => { shOut(esc(caesar(a.join(' '), 13))); count('cipher'); },
  b64: a => { shOut(esc(ENC['Base64 →'](a.join(' ')))); count('cipher'); },
  unb64: a => { try { shOut(esc(ENC['← Base64'](a.join('')))); count('cipher'); } catch (e) { shOut(sp('r', 'invalid base64')); } },
  hex: a => shOut(esc(ENC['Hex →'](a.join(' ')))),
  unhex: a => shOut(esc(ENC['← Hex'](a.join('')))),
  hash: async a => { if (!crypto.subtle) return shOut(sp('r', 'needs https')); shOut(sp('d', 'sha256 ') + await sha('SHA-256', a.join(' '))); count('cipher'); },
  pass: a => { const L = Math.min(64, Math.max(8, +a[0] || 20)), cs = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+?'; shOut(sp('g', Array.from({ length: L }, () => cs[rand(cs.length)]).join('')) + sp('d', `  ≈${Math.round(L * Math.log2(cs.length))} bits`)); },
  lock: () => { lockVault(); shOut(sp('g', 'vault locked')); },
  saver: () => Saver.show(),
  matrix: () => { let n = 0; const t = setInterval(() => { shOut(sp('g', Array.from({ length: 64 }, () => Math.random() < .5 ? ' ' : '01アイウエオカキ'[rnd(9)]).join(''))); if (++n > 24) clearInterval(t); }, 60); },
  sysinfo: async () => {
    let est = ''; try { const e = await navigator.storage.estimate(); est = `${(e.usage / 1048576).toFixed(1)} MB used`; } catch (e) {}
    let sync = 0; try { sync = +localStorage.getItem('lw-lastsync') || 0; } catch (e) {}
    shOut([`${sp('g', 'LONEWOLF OS')} v${esc(LW.version)}`, `modules   ${LW.modules().length}`, `network   ${navigator.onLine ? sp('g', 'online') : sp('a', 'offline')}`, `last sync ${sync ? new Date(sync).toLocaleString() : 'never'}`, `storage   ${esc(est || 'n/a')}`, `installed ${matchMedia('(display-mode: standalone)').matches ? 'yes' : 'no (browser tab)'}`, `vault     ${X().jr.ver ? (vUnlocked() ? sp('a', 'unlocked') : sp('g', 'locked')) : 'not set up'}`, `focus     ${F.on ? sp('g', 'running · ' + fmt((F.end - Date.now()) / 1000)) : 'idle'}`].join('\n'));
  }
};
CMDS.scan = CMDS.sysinfo; CMDS.cls = CMDS.clear; CMDS['?'] = CMDS.help;
async function runCmd(line) {
  line = line.trim(); if (!line) return;
  shOut(`${sp('g', 'hades@lonewolf')}:${sp('c', '~')}$ ${esc(line)}`);
  SH.hist.push(line); if (SH.hist.length > 60) SH.hist.shift(); local.set('lw-shell-h', JSON.stringify(SH.hist)); SH.hi = -1;
  const [c, ...a] = line.split(/\s+/);
  const f = CMDS[c.toLowerCase()];
  if (!f) { shOut(sp('r', `${c}: command not found`) + sp('d', ' · type help')); sfx('denied'); return; }
  try { await f(a); count('shell'); } catch (e) { shOut(sp('r', 'error: ' + (e.message || e))); }
}
page('shell', 'WOLFSHELL', 'A command line for your whole rig. Type help.', body => {
  body.innerHTML = `<div class="shell" id="shBox"><div class="so" id="shO"></div><div class="sl"><span>hades@lonewolf:~$</span><input id="shI" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"></div></div><div class="row2" style="margin-top:10px">${['help', 'xp', 'ops', 'todo', 'habit', 'due', 'tip', 'sysinfo'].map(c => `<button class="btn sm" data-sh="${c}">${c}</button>`).join('')}</div>`;
  const o = $('#shO');
  if (!SH.lines.length) shOut(`${sp('g', 'WOLFSHELL')} ${sp('d', '· LONEWOLF OS v' + LW.version)}\n${sp('d', 'type')} help ${sp('d', 'for commands. ↑ ↓ for history. Tab completes.')}`);
  else { o.innerHTML = SH.lines.join('\n') + '\n'; o.scrollTop = o.scrollHeight; }
  const i = $('#shI');
  i.onkeydown = e => {
    if (e.key === 'Enter') { const v = i.value; i.value = ''; runCmd(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!SH.hist.length) return; SH.hi = SH.hi < 0 ? SH.hist.length - 1 : Math.max(0, SH.hi - 1); i.value = SH.hist[SH.hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (SH.hi < 0) return; SH.hi++; if (SH.hi >= SH.hist.length) { SH.hi = -1; i.value = ''; } else i.value = SH.hist[SH.hi]; }
    else if (e.key === 'Tab') { e.preventDefault(); const m = Object.keys(CMDS).filter(k => k.startsWith(i.value)); if (m.length === 1) i.value = m[0] + ' '; else if (m.length) shOut(sp('d', m.join('  '))); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); CMDS.clear(); }
  };
  $('#shBox').onclick = e => { if (!window.getSelection().toString()) i.focus(); };
  body.querySelector('.row2').onclick = e => { const b = e.target.closest('[data-sh]'); if (b) runCmd(b.dataset.sh); };
  setTimeout(() => i.focus(), 60);
});

// ================= SCREENSAVER =================
const Saver = (() => {
  let on = false, raf = 0, clockT = 0, tipT = 0, last = Date.now(), traces = [], packets = [], W = 0, H = 0, ctx = null;
  const el = () => $('#saver');
  function layout() {
    const c = $('#svNet'), dpr = Math.min(2, devicePixelRatio || 1);
    W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    traces = []; packets = [];
    const n = Math.max(10, Math.round(H / 38));
    for (let i = 0; i < n; i++) {
      let x = -20, y = Math.random() * H; const pts = [[x, y]];
      while (x < W + 20) { x += 40 + Math.random() * 160; pts.push([x, y]); if (Math.random() < .5) { const d = (Math.random() < .5 ? -1 : 1) * (14 + Math.random() * 34); x += Math.abs(d); y += d; pts.push([x, y]); } }
      const segs = []; let len = 0; for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); segs.push(l); len += l; }
      traces.push({ pts, segs, len });
      const col = ['61,255,154', '54,214,255', '199,125,255', '255,122,46', '255,194,74'][i % 5];
      packets.push({ t: i, d: Math.random() * len, v: 30 + Math.random() * 90, col });
    }
  }
  const at = (tr, d) => { for (let k = 0; k < tr.segs.length; k++) { if (d <= tr.segs[k]) { const a = tr.pts[k], b = tr.pts[k + 1], f = d / tr.segs[k]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } d -= tr.segs[k]; } return tr.pts[tr.pts.length - 1]; };
  let lt = 0;
  function frame(ts) {
    if (!on) return; const dt = Math.min(.05, (ts - lt) / 1000 || 0); lt = ts;
    ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(138,151,159,.12)';
    traces.forEach(tr => { ctx.beginPath(); tr.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); });
    packets.forEach(pk => { const tr = traces[pk.t]; pk.d = (pk.d + pk.v * dt) % tr.len; const [x, y] = at(tr, pk.d), [x2, y2] = at(tr, Math.max(0, pk.d - 34)); const g = ctx.createLinearGradient(x2, y2, x, y); g.addColorStop(0, `rgba(${pk.col},0)`); g.addColorStop(1, `rgba(${pk.col},.85)`); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke(); });
    raf = requestAnimationFrame(frame);
  }
  function clock() {
    const d = new Date();
    $('#svTime').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#svDate').textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    $('#svFocus').textContent = F.on ? `INFILTRATION · ${TRACKS[F.tr].name} · ${fmt((F.end - Date.now()) / 1000)} left` : '';
    if (Math.random() < .06) { const s = el(); s.classList.remove('zap'); void s.offsetWidth; s.classList.add('zap'); }
  }
  function tip() { const m = MAN[rnd(MAN.length)]; $('#svTip').textContent = `${m[1]}: ${m[2].replace(/`/g, '')}`; }
  function show() {
    if (on) return; on = true; const s = el(); s.hidden = false; layout(); clock(); tip();
    clockT = setInterval(clock, 1000); tipT = setInterval(tip, 20000);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { lt = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function hide() { if (!on) return; on = false; el().hidden = true; cancelAnimationFrame(raf); clearInterval(clockT); clearInterval(tipT); last = Date.now(); }
  const idleMin = () => +(local.get('lw-saver') || 0);
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, e => {
    last = Date.now();
    if (on && ev !== 'pointermove') { if (ev === 'pointerdown' || ev === 'keydown') e.preventDefault(); swallow = Date.now(); hide(); }
  }, { capture: true, passive: ev === 'wheel' || ev === 'touchstart' || ev === 'pointermove' }));
  let swallow = 0;
  addEventListener('click', e => { if (Date.now() - swallow < 500) { e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener('resize', () => { if (on) layout(); });
  setInterval(() => {
    const m = idleMin(); if (!m || on || document.hidden || $('#boot')) return;
    if ((G && !G.over && onOp('breach')) || (H && !H.over && onOp('heist')) || A.playing || (LW.lockin && LW.lockin.active) || document.querySelector('.reader')) return;
    if (Date.now() - last >= m * 60e3) show();
  }, 5000);
  return { show, hide, idleMin };
})();
page('saver', 'Screensaver', 'Glitch clock with live data traces. Shows your focus countdown during an Infiltration run.', body => {
  const cur = Saver.idleMin();
  body.innerHTML = `<div class="box" style="max-width:560px"><h3>AUTO START</h3><p class="mut">Start after this much idle time (this device only):</p><div class="chips" id="svI">${[0, 2, 5, 10, 15].map(m => `<button class="chip${m === cur ? ' on' : ''}" data-sv="${m}">${m ? m + ' min' : 'Off'}</button>`).join('')}</div><button class="btn go" id="svNow" style="width:100%">▶ Start now</button><p class="mut" style="margin-top:10px">Tap or press any key to return. Paused while you're in a Breach/Heist or Audio Intel is playing.</p></div>`;
  $('#svI').onclick = e => { const b = e.target.closest('[data-sv]'); if (!b) return; local.set('lw-saver', b.dataset.sv); document.querySelectorAll('#svI .chip').forEach(c => c.classList.toggle('on', c === b)); };
  $('#svNow').onclick = () => setTimeout(Saver.show, 150);
});

// ================= HOME panel =================
function renderHomeOps() {
  const box = $('#hOps'); if (!box) return;
  const i = tipOfDay(), m = MAN[i];
  box.innerHTML = `<div class="box"><button class="netgo" data-go-net>◎ OPEN NETWORK</button><h3>TRACKS · today</h3>${tracksHTML(true)}</div>
    <div class="box"><h3>DAILY OPS</h3>${opsHTML(true)}</div>
    <div class="box"><h3>FIELD MANUAL · TIP OF THE DAY</h3><span class="tag2">${m[0]}</span><p style="font:600 15px var(--read);margin:10px 0 6px">${esc(m[1])}</p><p class="hint2">${fmtTip(m[2])}</p><div class="row2" style="margin-top:10px"><button class="btn sm" data-opentip="${i}">Open in manual</button>${F.on ? `<button class="btn go sm" onclick="LW.go('op')">Focus run: ${TRACKS[F.tr].name}</button>` : ''}</div></div>`;
  if (LW.ops && LW.ops.homeExtra) LW.ops.homeExtra();
}
document.addEventListener('click', e => { if (e.target.closest('[data-go-net]')) LW.go('net'); });
LW.onView('home', renderHomeOps);
function refreshAll() {
  if ($('#v-home').classList.contains('on')) renderHomeOps();
  if ($('#v-net').classList.contains('on')) renderHub();
  if (onOp() && ['tasks', 'habits', 'tracks', 'ops', 'debrief', 'bounties'].includes(CUR.id)) PAGES[CUR.id].r($('#opBody'), CUR.arg);
}
// re-draw after a sync pulls changes from the other device
let rT = 0; LW.on('save', () => { clearTimeout(rT); rT = setTimeout(() => { if ($('#v-home').classList.contains('on')) renderHomeOps(); if ($('#v-net').classList.contains('on')) renderHub(); }, 300); });
LW.ops = { open: openOp, page, PAGES, Saver, TRACKS, TR, addT, X, count, visit, addSession, delSession, sessOn, minDay, isPaused, setPaused, setMode, SEASON, sig, formRank, todayXP, dayNet, xpOf, refreshAll, opsState, opsHTML, F, focusStart, Amb, MAN, trSel, trDot, fmt, onOp, daysBack, dkey, uid, sfx, live: liveRecs, tracksHTML, TARGET7, renderHub, get CUR() { return CUR; } };
LW.on('ready', () => { migrateMin(); LW.topbar(); });
LW.on('save', () => migrateMin());
}
