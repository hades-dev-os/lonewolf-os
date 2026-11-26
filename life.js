// LONEWOLF OS · Life update (v2.7)
// Daily Debrief, Library (PDF reader that feels like paper, bookmarks), Gym Lab, Ink Log (.docx word counts),
// Weekly Bounties, Weekly Wrapped (+ phone notifications), Insights, Season wake-up, and LOCK-IN (HUD mode).
// Talks to the rest of the app only through window.LW and LW.ops.
{
const BOOT_HASH = location.hash;
const O = LW.ops, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => LW.esc(s), day = () => LW.today(), X = () => O.X(), sfx = n => O.sfx(n);
const TR = O.TR, TRACKS = O.TRACKS;
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const local = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const dOff = n => { const d = new Date(); d.setDate(d.getDate() + n); return O.dkey(d); };
const wdName = k => new Date(k + 'T12:00:00Z').toLocaleDateString([], { weekday: 'short' });
const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
async function pdfLib() { if (!window.pdfjsLib) { await loadScript('libs/doc/pdf.min.js'); } pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/doc/pdf.worker.min.js'; return pdfjsLib; }
const page = O.page, openOp = O.open;
const sessLive = id => { const s = X().sess[id]; return s && !s.del ? s : null; };

// ======================================================================
// DAILY DEBRIEF
// ======================================================================
const Q = [
  { k: 'gym', tr: 'gym', ic: '🏋️', q: 'Did the body get an upgrade today?', opts: [['Rest day', 0], ['30 min', 30], ['45 min', 45], ['1 h', 60], ['1 h 30', 90]], split: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Cardio', 'Sport'] },
  { k: 'read', tr: 'read', ic: '📚', q: 'Pages decrypted from your own books?', opts: [['None', 0], ['10', 10], ['25', 25], ['50', 50], ['100+', 100]] },
  { k: 'write', tr: 'write', ic: '✍️', q: 'Words written on your own stories?', opts: [['None', 0], ['250', 250], ['500', 500], ['1k', 1000], ['2k+', 2000]] },
  { k: 'uni', tr: 'uni', ic: '🎓', q: 'Revision outside the app (lectures, labs, paper notes)?', opts: [['None', 0], ['30 min', 30], ['1 h', 60], ['2 h', 120], ['3 h+', 180]] },
  { k: 'sleep', ic: '😴', q: 'How long did you sleep last night?', opts: [['<5 h', 4.5], ['6 h', 6], ['7 h', 7], ['8 h', 8], ['9 h+', 9]] },
  { k: 'energy', ic: '⚡', q: 'Energy level today?', opts: [['1 · drained', 1], ['2', 2], ['3', 3], ['4', 4], ['5 · overclocked', 5]] }
];
const activeQ = () => Q.filter(q => !q.tr || !O.isPaused(q.tr));
const debDay = d => (X().deb[d] ||= {});
function ans(d, k) { const a = (X().deb[d] || {})[k]; if (!a || a.v == null) return null; if (a.sid && !sessLive(a.sid)) return null; return a; }
function habitSet(d, tr, on, ids) {
  const done = [];
  O.live(X().habits).forEach(([id, h]) => {
    if (h.tr !== tr) return; if (!on && ids && !ids.includes(id)) return;
    const r = (X().hlog[d] ||= {}), cur = !!(r[id] && r[id].v);
    if (cur === on) return;
    r[id] = { v: on ? 1 : 0, t: Date.now() };
    if (d === day()) O.count('habit', on ? 1 : -1);
    O.addT(h.tr, on ? 10 : -10, null, d); done.push(id);
  });
  return done;
}
function clearAns(d, k) {
  const a = (X().deb[d] || {})[k]; if (!a) return;
  if (a.sid) O.delSession(a.sid, true);
  const q = Q.find(x => x.k === k);
  if (q && q.tr && a.hk && a.hk.length) habitSet(d, q.tr, false, a.hk);
  debDay(d)[k] = { v: null, t: Date.now() };
}
function answer(d, k, v, extra) {
  const q = Q.find(x => x.k === k);
  clearAns(d, k);
  const rec = { v, t: Date.now() };
  if (k === 'gym' && v > 0) { rec.sid = O.addSession('gym', v, Math.min(180, v), 'debrief', { kind: extra || '' }, `Training logged · ${v} min`, d); rec.split = extra || ''; }
  if (k === 'read' && v > 0) rec.sid = O.addSession('read', Math.round(v * 1.5), Math.min(150, v), 'debrief', { pages: v }, `${v} pages logged`, d);
  if (k === 'write' && v > 0) rec.sid = O.addSession('write', Math.round(v / 20), Math.min(150, Math.round(v / 25)), 'debrief', { words: v }, `${v} words logged`, d);
  if (k === 'uni' && v > 0) rec.sid = O.addSession('uni', v, Math.round(v / 2), 'debrief', null, `${v} min revision logged`, d);
  if (q && q.tr && v > 0) rec.hk = habitSet(d, q.tr, true);
  debDay(d)[k] = rec;
  const all = activeQ().every(x => ans(d, x.k));
  if (all && !(debDay(d)._done || {}).v) { debDay(d)._done = { v: 1, t: Date.now() }; O.count('debrief'); setTimeout(() => { O.addT('life', 10, 'FIELD REPORT FILED', d); sfx('breach'); }, 700); }
  LW.save(); O.visit('debrief');
}
const optLabel = (q, v) => (q.opts.find(o => o[1] === v) || [String(v)])[0];
function qHTML(d, q, compact) {
  const a = ans(d, q.k);
  const lib = q.k === 'read' ? O.sessOn(d, s => s.src === 'book').reduce((x, s) => x + (s.pages || 0), 0) : 0;
  return `<div class="dq${a ? ' done' : ''}" data-dq="${q.k}" data-d="${d}"><div class="dqh"><span class="dqi">${q.ic}</span><b>${esc(q.q)}</b>${q.tr ? `<i class="tdot" style="background:${TRACKS[q.tr].c}"></i>` : ''}</div>
    ${lib ? `<p class="mut" style="margin:4px 0 0">Library already logged ${lib} pages here. Answer only for paper books.</p>` : ''}
    <div class="chips">${q.opts.map(([l, v]) => `<button class="chip${a && a.v === v ? ' on' : ''}" data-ans="${v}">${esc(l)}</button>`).join('')}</div>
    ${q.split && a && a.v > 0 ? `<div class="chips sub">${q.split.map(s => `<button class="chip${a.split === s ? ' on' : ''}" data-split="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
    ${a && !compact ? '<p class="mut dqx">Tap your answer again to clear it.</p>' : ''}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-dq] [data-ans], [data-dq] [data-split]'); if (!c) return;
  const box = c.closest('[data-dq]'), k = box.dataset.dq, d = box.dataset.d;
  if (c.dataset.split != null) { const a = ans(d, k); if (!a) return; const s = X().sess[a.sid]; if (s) { s.kind = c.dataset.split; s.t = Date.now(); } a.split = c.dataset.split; a.t = Date.now(); LW.save(); sfx('tick'); return O.refreshAll(); }
  const v = +c.dataset.ans, a = ans(d, k);
  if (a && a.v === v) { clearAns(d, k); LW.save(); sfx('denied'); }
  else { answer(d, k, v); sfx(v ? 'granted' : 'tick'); }
  O.refreshAll();
});
function debStatus(d) { const qs = activeQ(); return { done: qs.filter(q => ans(d, q.k)).length, n: qs.length }; }
page('debrief', 'Debrief', 'Daily field report. One tap per question; it feeds your tracks, habits, charts and insights. Change your mind? Tap the answer again.', (body, arg) => {
  const d = arg === 'y' ? dOff(-1) : day();
  const st = debStatus(d);
  body.innerHTML = `<div class="chips"><button class="chip${d === day() ? ' on' : ''}" data-dday="t">Today</button><button class="chip${d !== day() ? ' on' : ''}" data-dday="y">Yesterday</button><span class="mut" style="align-self:center;margin-left:8px">${st.done}/${st.n} answered${(debDay(d)._done || {}).v ? ' · report filed ✓' : ' · finish all for +10 LIFE'}</span></div>
    <div class="dgrid">${activeQ().map(q => qHTML(d, q)).join('')}</div>`;
  body.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-dday]'); if (b) { O.CUR.arg = b.dataset.dday; PAGES().debrief.r(body, b.dataset.dday); } };
});
const PAGES = () => O.PAGES;
function debriefCard() {
  const h = new Date().getHours(), y = dOff(-1);
  const yPending = h < 14 && debStatus(y).done === 0;
  const d = yPending ? y : day(), qs = activeQ(), next = qs.find(q => !ans(d, q.k)), st = debStatus(d);
  const title = yPending ? 'FIELD REPORT · YESTERDAY' : h < 12 ? 'FIELD REPORT · early entry' : 'FIELD REPORT, SIR';
  if (!next) {
    const parts = qs.map(q => { const a = ans(d, q.k); return a ? `${q.ic} ${esc(optLabel(q, a.v))}${a.split ? ' ' + esc(a.split) : ''}` : ''; }).filter(Boolean);
    return `<div class="box debc"><h3>${title} ✓</h3><p class="mut">${parts.join(' &nbsp;·&nbsp; ')}</p><button class="btn sm" onclick="LW.ops.open('debrief')">Edit report</button></div>`;
  }
  return `<div class="box debc"><div class="row2" style="justify-content:space-between"><h3 style="margin:0">${title}</h3><span class="mut">${st.done}/${st.n}</span></div><div class="bar3" style="margin:8px 0 12px"><i style="width:${st.done / st.n * 100}%;background:var(--life)"></i></div>${qHTML(d, next, true)}<button class="btn sm" style="margin-top:8px" onclick="LW.ops.open('debrief'${yPending ? ",'y'" : ''})">See all questions</button></div>`;
}

// ======================================================================
// WEEKLY BOUNTIES
// ======================================================================
const weekStart = (off = 0) => { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd + off * 7); return O.dkey(d); };
const weekDays = ws => Array.from({ length: 7 }, (_, i) => { const d = new Date(ws + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
const inWeek = ws => { const w = weekDays(ws); return s => w.includes(s.d); };
const cntSum = (ws, k) => weekDays(ws).reduce((a, d) => a + ((X().cnt[d] || {})[k] || 0), 0);
const BOUNTY = [
  { k: 'gym4', tr: 'gym', t: 'Complete 4 training sessions', n: 4, v: ws => O.sessOn(null, s => inWeek(ws)(s) && s.tr === 'gym' && s.m > 0).length },
  { k: 'pages150', tr: 'read', t: 'Read 150 pages', n: 150, v: ws => O.sessOn(null, s => inWeek(ws)(s) && s.tr === 'read').reduce((a, s) => a + (s.pages || 0), 0) },
  { k: 'words3k', tr: 'write', t: 'Write 3,000 words', n: 3000, v: ws => O.sessOn(null, s => inWeek(ws)(s) && s.tr === 'write').reduce((a, s) => a + (s.words || 0), 0) },
  { k: 'heist2', tr: 'uni', t: 'Pull off 2 Heists', n: 2, v: ws => cntSum(ws, 'heist') },
  { k: 'breach4', tr: 'uni', t: 'Run 4 Breaches', n: 4, v: ws => cntSum(ws, 'breach') },
  { k: 'cards100', tr: 'uni', t: 'Burn 100 flashcards', n: 100, v: ws => weekDays(ws).reduce((a, d) => a + ((LW.S.days[d] || {}).cards || 0), 0) },
  { k: 'manual3', tr: 'uni', t: 'Study 3 Field Manual entries', n: 3, v: ws => cntSum(ws, 'manual') },
  { k: 'focus300', tr: null, t: '5 hours of Infiltration / Lock-in', n: 300, v: ws => O.sessOn(null, s => inWeek(ws)(s) && (s.src === 'focus' || s.src === 'lockin')).reduce((a, s) => a + s.m, 0) },
  { k: 'lockin2', tr: null, t: 'Finish 2 Lock-in sessions', n: 2, v: ws => O.sessOn(null, s => inWeek(ws)(s) && s.src === 'lockin').length },
  { k: 'debrief5', tr: 'life', t: 'File 5 complete debriefs', n: 5, v: ws => weekDays(ws).filter(d => ((X().deb[d] || {})._done || {}).v).length },
  { k: 'ops4', tr: 'life', t: 'Clear Daily Ops on 4 days', n: 4, v: ws => weekDays(ws).filter(d => X().opsPaid[d]).length },
  { k: 'habits12', tr: 'life', t: '12 habit check-ins', n: 12, v: ws => weekDays(ws).reduce((a, d) => a + Object.values(X().hlog[d] || {}).filter(r => r && r.v).length, 0) }
];
function bountiesFor(ws) {
  let h = 5381; for (const c of 'wk' + ws) h = (h * 33 ^ c.charCodeAt(0)) >>> 0;
  const r = () => (h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967296;
  const pool = BOUNTY.filter(b => !(b.tr && O.isPaused(b.tr))), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out.map(b => { const v = b.v(ws); return { b, v: Math.min(v, b.n), done: v >= b.n, paid: !!X().badges[ws + ':' + b.k] }; });
}
function claimBounty(ws, k) {
  const it = bountiesFor(ws).find(x => x.b.k === k); if (!it || !it.done || it.paid) return;
  X().badges[ws + ':' + k] = Date.now(); sfx('breach');
  O.addT(it.b.tr || 'life', 60, 'BOUNTY CLAIMED · ' + it.b.t);
  O.refreshAll();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-bclaim]'); if (b) claimBounty(b.dataset.ws, b.dataset.bclaim); });
const BADGE = { gym4: '🏋️', pages150: '📚', words3k: '✍️', heist2: '💰', breach4: '🛰️', cards100: '🔥', manual3: '🛡️', focus300: '🕶️', lockin2: '⚡', debrief5: '📋', ops4: '🎯', habits12: '🔁' };
function bountyHTML(ws, compact) {
  const list = bountiesFor(ws);
  return `<div class="opsl">${list.map(x => `<div class="opi${x.paid ? ' done' : ''}"><span class="ck">${BADGE[x.b.k] || '★'}</span><b>${esc(x.b.t)}</b><span class="mut">${x.v}/${x.b.n}</span><div class="meter"><i style="width:${x.v / x.b.n * 100}%;${x.b.tr ? `background:${TRACKS[x.b.tr].c}` : ''}"></i></div>${x.done && !x.paid ? `<button class="btn go sm" data-bclaim="${x.b.k}" data-ws="${ws}" style="grid-column:1/-1">Claim +60 XP & badge</button>` : ''}</div>`).join('')}</div>${compact ? '' : ''}`;
}
page('bounties', 'Weekly Bounties', 'Three bigger contracts every week (Monday reset). Each pays +60 XP and a badge. Paused tracks never show up.', body => {
  const ws = weekStart(), left = 7 - ((new Date().getDay() + 6) % 7);
  const badges = Object.entries(X().badges).sort((a, b) => b[0].localeCompare(a[0]));
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>THIS WEEK · ${left} day${left > 1 ? 's' : ''} left</h3>${bountyHTML(ws)}</div>
    <div class="box"><h3>BADGE WALL · ${badges.length}</h3><div class="badges">${badges.map(([k]) => { const [w, b] = k.split(':'); const B = BOUNTY.find(x => x.k === b); return `<span class="badge" title="${esc(B ? B.t : b)} · week of ${w}">${BADGE[b] || '★'}<small>${w.slice(5)}</small></span>`; }).join('') || '<p class="mut">No badges yet. Claim your first bounty.</p>'}</div></div></div>`;
});

// ======================================================================
// LIBRARY + READER
// ======================================================================
const BookDB = (() => {
  let p = null;
  const db = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('lonewolf-books', 1); r.onupgradeneeded = () => { r.result.createObjectStore('pdf'); r.result.createObjectStore('cover'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const op = async (st, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(st, mode), s = t.objectStore(st), q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return { get: (st, k) => op(st, 'readonly', s => s.get(k)), put: (st, k, v) => op(st, 'readwrite', s => s.put(v, k)), del: (st, k) => op(st, 'readwrite', s => s.delete(k)) };
})();
const books = () => O.live(X().books).map(([id, b]) => Object.assign({ id }, b));
function creditPages(id, n, quiet) {
  if (n <= 0) return;
  const b = X().books[id]; if (!b) return;
  const d = day();
  const capLeft = Math.max(0, 200 - O.sessOn(d, s => s.src === 'book').reduce((a, s) => a + (s.xp || 0), 0));
  let s = b.sid && b.sid.d === d && sessLive(b.sid.id);
  if (!s) { const sid = O.addSession('read', 0, 0, 'book', { pages: 0, book: id, note: clip(b.title, 40) }); b.sid = { d, id: sid }; s = X().sess[sid]; }
  const xp = Math.min(n, capLeft);
  s.pages = (s.pages || 0) + n; s.xp = (s.xp || 0) + xp; s.t = Date.now();
  if (xp) O.addT('read', xp, quiet ? null : `${n} page${n > 1 ? 's' : ''} read`);
  b.t = Date.now();
  if (b.total && b.furthest >= b.total && !b.done) { b.done = Date.now(); setTimeout(() => { O.addT('read', 50, 'BOOK FINISHED · ' + clip(b.title, 30)); sfx('rankup'); }, 900); }
  LW.save();
}
function addMinutesRead(id, sec) {
  const b = X().books[id]; if (!b || !b.sid || b.sid.d !== day()) return;
  const s = sessLive(b.sid.id); if (!s) return;
  s.sec = (s.sec || 0) + sec; s.m = Math.round(s.sec / 60); s.t = Date.now();
}
const COVERC = ['#3a1c22', '#13283f', '#1f3324', '#3b2a12', '#2c1f3d', '#123536'];
function coverHTML(b, img) {
  const c = COVERC[[...b.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COVERC.length];
  return img ? `<img src="${img}" alt="">` : `<div class="gcov" style="background:${c}"><b>${esc(clip(b.title, 48))}</b>${b.author ? `<small>${esc(clip(b.author, 30))}</small>` : ''}</div>`;
}
page('library', 'Library', 'Your own books. PDFs open in a paper-style reader that remembers your page. Paper books: just update the page you\'re on. 1 XP per new page read.', async body => {
  const list = books().sort((a, b) => (b.t || 0) - (a.t || 0));
  const covers = {}; for (const b of list) { try { covers[b.id] = await BookDB.get('cover', b.id); } catch (e) {} }
  const has = {}; for (const b of list) if (b.kind === 'pdf') { try { has[b.id] = !!(await BookDB.get('pdf', b.id)); } catch (e) { has[b.id] = false; } }
  if (!body.isConnected) return;
  body.innerHTML = `<div class="opgrid"><div class="box drop" id="bDrop"><h3>ADD A BOOK</h3><p class="mut">Drop a PDF here or pick one. The file stays on this device (books are big); your bookmark and progress sync.</p>
      <input type="file" id="bFile" accept="application/pdf,.pdf" hidden><button class="btn go" id="bPick" style="width:100%">📄 Choose PDF</button>
      <div id="bNew"></div>
      <details style="margin-top:12px"><summary class="mut" style="cursor:pointer">Reading a paper book instead?</summary><input class="inp" id="pT" placeholder="Title"><input class="inp" id="pA" placeholder="Author (optional)"><div class="row2"><input class="inp" type="number" id="pN" placeholder="Total pages" style="flex:1"><input class="inp" type="number" id="pS" placeholder="I'm on page" style="flex:1"></div><button class="btn" id="pAdd" style="margin-top:8px;width:100%">Add paper book</button></details></div>
    ${list.map(b => { const pct = b.total ? Math.round((b.furthest || 0) / b.total * 100) : 0; return `<div class="bookc"><div class="cov">${coverHTML(b, covers[b.id])}</div><div class="bi"><b>${esc(b.title)}</b>${b.author ? `<span class="mut">${esc(b.author)}</span>` : ''}<span class="mut">${b.kind === 'pdf' ? 'PDF' : 'Paper'} · page ${b.page || 1}${b.total ? ' / ' + b.total : ''}${b.done ? ' · ✓ finished' : ''}</span><div class="bar3"><i style="width:${pct}%;background:var(--read)"></i></div><span class="mut">${pct}% read</span>
      <div class="row2" style="margin-top:auto">${b.kind === 'pdf' ? (has[b.id] ? `<button class="btn go sm" data-bread="${b.id}">▶ Continue</button>` : `<label class="btn sm">Attach PDF on this device<input type="file" accept=".pdf,application/pdf" hidden data-battach="${b.id}"></label>`) : `<input class="inp" type="number" placeholder="Now on page" data-bpage="${b.id}" style="width:130px;margin:0"><button class="btn go sm" data-bupd="${b.id}">Update</button>`}<button class="btn sm" data-bdel="${b.id}">✕</button></div></div></div>`; }).join('')}</div>`;
  const pick = $('#bFile');
  $('#bPick').onclick = () => pick.click();
  pick.onchange = () => pick.files[0] && stageBook(pick.files[0]);
  const dz = $('#bDrop');
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) stageBook(f); });
  $('#pAdd').onclick = () => {
    const title = $('#pT').value.trim(); if (!title) return LW.toast('Give it a title', true);
    const total = +$('#pN').value || 0, start = Math.max(1, +$('#pS').value || 1);
    X().books[O.uid()] = { title, author: $('#pA').value.trim(), total, page: start, furthest: start - 1, kind: 'paper', t: Date.now(), added: day() };
    LW.save(); sfx('deploy'); PAGES().library.r(body);
  };
});
async function stageBook(f) {
  if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) return LW.toast('That isn\'t a PDF', true);
  const box = $('#bNew'); box.innerHTML = '<p class="mut">Opening the book…</p>';
  try {
    const lib = await pdfLib(), buf = await f.arrayBuffer();
    const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
    let title = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
    try { const m = await doc.getMetadata(); if (m && m.info && m.info.Title && m.info.Title.trim().length > 2) title = m.info.Title.trim(); } catch (e) {}
    const cover = await renderThumb(doc, 1);
    box.innerHTML = `<div class="stage"><div class="cov sm">${coverHTML({ id: 'x', title }, cover)}</div><div style="flex:1"><input class="inp" id="nT" value="${esc(title)}"><input class="inp" id="nA" placeholder="Author (optional)"><label class="mut">Already reading it? Start at page</label><input class="inp" type="number" id="nS" value="1" min="1" max="${doc.numPages}"><p class="mut">${doc.numPages} pages · ${(f.size / 1048576).toFixed(1)} MB</p><button class="btn go" id="nGo" style="width:100%">Add to Library</button></div></div>`;
    $('#nGo').onclick = async () => {
      const id = O.uid(), start = Math.min(doc.numPages, Math.max(1, +$('#nS').value || 1));
      await BookDB.put('pdf', id, buf); if (cover) await BookDB.put('cover', id, cover);
      X().books[id] = { title: $('#nT').value.trim() || title, author: $('#nA').value.trim(), total: doc.numPages, page: start, furthest: start - 1, kind: 'pdf', file: { name: f.name, size: f.size }, t: Date.now(), added: day() };
      LW.save(); sfx('deploy'); LW.toast(start > 1 ? `Bookmark set at page ${start}` : 'Book added');
      PAGES().library.r($('#opBody'));
    };
  } catch (e) { box.innerHTML = `<p class="mut" style="color:var(--red)">Couldn't open that PDF: ${esc(e.message || e)}</p>`; }
}
async function renderThumb(doc, n) {
  try { const p = await doc.getPage(n), v = p.getViewport({ scale: 1 }), sc = 240 / v.height, vp = p.getViewport({ scale: sc }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; return c.toDataURL('image/jpeg', .72); } catch (e) { return null; }
}
document.addEventListener('click', e => {
  const r = e.target.closest('[data-bread]'); if (r) return Reader.open(r.dataset.bread);
  const u = e.target.closest('[data-bupd]');
  if (u) {
    const id = u.dataset.bupd, b = X().books[id], n = Math.round(+document.querySelector(`[data-bpage="${id}"]`).value);
    if (!(n > 0)) return LW.toast('Type the page you\'re on', true);
    const gain = Math.min(300, n - 1 - (b.furthest || 0));
    b.page = n; b.furthest = Math.max(b.furthest || 0, n - 1); b.t = Date.now();
    if (gain > 0) creditPages(id, gain); else { LW.save(); LW.toast('Bookmark updated'); }
    sfx('flip'); return PAGES().library.r($('#opBody'));
  }
  const d = e.target.closest('[data-bdel]');
  if (d) { const id = d.dataset.bdel; if (d.dataset.arm !== '1') { d.dataset.arm = '1'; d.textContent = 'remove?'; return; } X().books[id] = { del: 1, t: Date.now() }; BookDB.del('pdf', id).catch(() => {}); BookDB.del('cover', id).catch(() => {}); LW.save(); PAGES().library.r($('#opBody')); }
});
document.addEventListener('change', async e => {
  const a = e.target.closest('[data-battach]'); if (!a || !a.files[0]) return;
  const id = a.dataset.battach, buf = await a.files[0].arrayBuffer();
  try { const lib = await pdfLib(), doc = await lib.getDocument({ data: buf.slice(0) }).promise; await BookDB.put('pdf', id, buf); const c = await renderThumb(doc, 1); if (c) await BookDB.put('cover', id, c); LW.toast('PDF attached on this device'); PAGES().library.r($('#opBody')); }
  catch (er) { LW.toast('Couldn\'t open that PDF', true); }
});

// ---------- the reader ----------
const Reader = (() => {
  let R = null;
  const spread = () => innerWidth >= 900 && innerWidth > innerHeight * 1.15;
  const first = p => !spread() ? p : p <= 1 ? 1 : (p % 2 === 0 ? p : p - 1);   // spreads: [1], [2,3], [4,5]…
  const pagesAt = s => !spread() ? [s] : s === 1 ? [null, 1] : [s, s + 1 <= R.doc.numPages ? s + 1 : null];
  async function draw(canvas, n) {
    const ctx = canvas.getContext('2d');
    if (!n) { canvas.width = 10; canvas.height = 10; ctx.clearRect(0, 0, 10, 10); canvas.dataset.blank = '1'; return; }
    delete canvas.dataset.blank;
    if (!R) return; const p = await R.doc.getPage(n), host = canvas.parentElement, v = p.getViewport({ scale: 1 });
    const sc = Math.min((host.clientWidth - 8) / v.width, (host.clientHeight - 8) / v.height), dpr = Math.min(2.5, devicePixelRatio || 1);
    const vp = p.getViewport({ scale: sc * dpr });
    canvas.width = vp.width; canvas.height = vp.height; canvas.style.width = vp.width / dpr + 'px'; canvas.style.height = vp.height / dpr + 'px';
    await p.render({ canvasContext: ctx, viewport: vp }).promise;
  }
  async function show(s, dir) {
    if (R.busy) return; R.busy = true;
    s = Math.max(1, Math.min(R.doc.numPages, first(s)));
    const pg = pagesAt(s), leaves = $$('.reader .leaf canvas');
    const snap = dir ? leaves.map(c => c.dataset.blank ? '' : c.toDataURL('image/jpeg', .8)) : null;
    if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // render new pages off-screen, then flip a leaf over
      const tmp = pg.map(() => document.createElement('canvas'));
      for (let i = 0; i < pg.length; i++) { tmp[i].style.cssText = ''; const host = leaves[i].parentElement; const off = document.createElement('div'); off.style.cssText = `position:absolute;visibility:hidden;width:${host.clientWidth}px;height:${host.clientHeight}px`; off.append(tmp[i]); document.body.append(off); await draw(tmp[i], pg[i]); off.remove(); }
      const shots = tmp.map((c, i) => pg[i] ? c.toDataURL('image/jpeg', .85) : '');
      const fl = $('.reader .flip'); const two = leaves.length === 2;
      fl.className = 'flip ' + (two ? (dir > 0 ? 'fwd' : 'back') : 'single ' + (dir > 0 ? 'fwd' : 'back'));
      const fr = fl.querySelector('.ff'), bk = fl.querySelector('.fb');
      const face = (el, url, src) => { el.innerHTML = url ? `<img alt="" src="${url}" style="width:${src.style.width};height:${src.style.height}">` : ''; };
      if (two) { face(fr, dir > 0 ? snap[1] : snap[0], dir > 0 ? leaves[1] : leaves[0]); face(bk, dir > 0 ? shots[0] : shots[1], dir > 0 ? tmp[0] : tmp[1]); }
      else { face(fr, snap[0], leaves[0]); face(bk, '', null); }
      // underneath: the page revealed by the turn
      if (two) { const under = dir > 0 ? 1 : 0; leaves[under].getContext('2d').clearRect(0, 0, leaves[under].width, leaves[under].height); copy(tmp[under], leaves[under]); }
      else copy(tmp[0], leaves[0]);
      fl.hidden = false; void fl.offsetWidth; fl.classList.add('go'); sfx('flip');
      await new Promise(r => setTimeout(r, 620));
      if (!R) return;
      tmp.forEach((c, i) => copy(c, leaves[i]));
      fl.hidden = true; fl.classList.remove('go');
    } else { for (let i = 0; i < pg.length; i++) { if (!R) return; await draw(leaves[i], pg[i]); } if (dir) sfx('flip'); }
    if (!R) return;
    R.s = s; R.busy = false;
    const b = X().books[R.id]; b.page = s; b.t = Date.now(); LW.save(true);
    hud(); armCredit();
  }
  function copy(src, dst) { dst.width = src.width; dst.height = src.height; dst.style.width = src.style.width; dst.style.height = src.style.height; if (src.dataset.blank) dst.dataset.blank = '1'; else delete dst.dataset.blank; if (src.width > 10) dst.getContext('2d').drawImage(src, 0, 0); else dst.getContext('2d').clearRect(0, 0, dst.width, dst.height); }
  function visiblePages() { return pagesAt(R.s).filter(Boolean); }
  function armCredit() {
    clearTimeout(R.ct);
    R.ct = setTimeout(() => {
      if (!R || document.hidden) return;
      const b = X().books[R.id]; let n = 0;
      visiblePages().forEach(p => { if (p === (b.furthest || 0) + 1) { b.furthest = p; n++; } });
      if (n) { creditPages(R.id, n, true); R.gained += n; hud(); }
    }, 6000);
  }
  function hud() {
    const b = X().books[R.id], vp = visiblePages(), pct = Math.round((b.furthest || 0) / R.doc.numPages * 100);
    $('#rdPg').textContent = `${vp.join('–')} / ${R.doc.numPages}`;
    $('#rdPct').textContent = `${pct}% read${R.gained ? ` · +${R.gained} pages this sitting` : ''}`;
    $('#rdSl').value = R.s;
    const ahead = Math.min(...vp) > (b.furthest || 0) + 1;
    $('#rdAhead').hidden = !ahead;
    $('.reader .ribbon').hidden = !vp.includes(b.page) && !vp.includes(R.s);
  }
  async function open(id) {
    const b = X().books[id]; if (!b) return;
    const buf = await BookDB.get('pdf', id); if (!buf) return LW.toast('PDF not on this device', true);
    const lib = await pdfLib();
    const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
    const theme = local.get('lw-rd-theme') || 'paper';
    const el = document.createElement('div'); el.className = 'reader t-' + theme;
    el.innerHTML = `<div class="rtop"><button class="btn sm" id="rdX">✕ Close</button><b class="rtt">${esc(clip(b.title, 60))}</b><span id="rdPg" class="mut"></span><span id="rdPct" class="mut"></span><span class="sp"></span><div class="chips" id="rdTh" style="margin:0">${['paper', 'sepia', 'night'].map(t => `<button class="chip${t === theme ? ' on' : ''}" data-th="${t}">${t}</button>`).join('')}</div></div>
      <div class="desk"><div class="bookv${spread() ? '' : ' single'}"><div class="leaf l"><canvas></canvas><i class="grain"></i></div>${spread() ? '<div class="leaf r"><canvas></canvas><i class="grain"></i><i class="ribbon"></i></div>' : ''}<div class="spine"></div><div class="flip" hidden><div class="ff"></div><div class="fb"></div></div><button class="tz tl" aria-label="Previous page"></button><button class="tz tr" aria-label="Next page"></button></div></div>
      <div class="rbot"><button class="btn sm" id="rdP">◀</button><input type="range" id="rdSl" min="1" max="${doc.numPages}" value="1"><button class="btn sm" id="rdN">▶</button><button class="btn sm go" id="rdAhead" hidden title="Pages ahead of your progress don't earn XP">I've read up to here</button></div>`;
    if (!spread()) el.querySelector('.leaf.l').insertAdjacentHTML('beforeend', '<i class="ribbon"></i>');
    document.body.append(el);
    R = { id, doc, s: 1, busy: false, gained: 0, t0: Date.now(), act: Date.now(), el };
    el.querySelector('#rdX').onclick = close;
    el.querySelector('.tl').onclick = () => turn(-1);
    el.querySelector('.tr').onclick = () => turn(1);
    el.querySelector('#rdP').onclick = () => turn(-1);
    el.querySelector('#rdN').onclick = () => turn(1);
    el.querySelector('#rdSl').onchange = e => show(+e.target.value, 0);
    el.querySelector('#rdAhead').onclick = () => { const b2 = X().books[R.id]; b2.furthest = Math.max(b2.furthest || 0, Math.max(...visiblePages())); b2.t = Date.now(); LW.save(); LW.toast('Progress moved here (no XP for skipped pages)'); hud(); };
    el.querySelector('#rdTh').onclick = e => { const t = e.target.closest('[data-th]'); if (!t) return; local.set('lw-rd-theme', t.dataset.th); el.className = 'reader t-' + t.dataset.th; $$('#rdTh .chip').forEach(c => c.classList.toggle('on', c === t)); };
    let sx = 0; el.querySelector('.desk').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    el.querySelector('.desk').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1); });
    R.tick = setInterval(() => { if (!R || document.hidden || Date.now() - R.act > 120e3) return; addMinutesRead(R.id, 10); }, 10000);
    O.visit('library');
    requestAnimationFrame(() => show(b.page || 1, 0));
  }
  function turn(d) { if (!R) return; R.act = Date.now(); const step = spread() ? (R.s === 1 && d > 0 ? 1 : 2) : 1; const ns = d > 0 ? R.s + step : (spread() && R.s === 2 ? 1 : R.s - step); if (ns < 1 || ns > R.doc.numPages) return; show(ns, d); }
  function close() { if (!R) return; clearTimeout(R.ct); clearInterval(R.tick); try { R.doc.destroy(); } catch (e) {} R.el.remove(); const g = R.gained; R = null; LW.save(); if (g) LW.toast(`READ +${g} XP · ${g} new pages`); if (O.onOp('library')) PAGES().library.r($('#opBody')); }
  addEventListener('keydown', e => { if (!R) return; R.act = Date.now(); if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); turn(1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); turn(-1); } if (e.key === 'Escape') close(); }, true);
  addEventListener('pointermove', () => { if (R) R.act = Date.now(); }, { passive: true });
  addEventListener('resize', () => { if (R && !R.busy) { const el = R.el; const want = spread(); if (!!el.querySelector('.leaf.r') !== want) { const id = R.id; close(); open(id); } else show(R.s, 0); } });
  return { open, get on() { return !!R; } };
})();

// ======================================================================
// GYM LAB
// ======================================================================
const LIFTS = ['Bench press', 'Squat', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up (+kg)'];
const e1rm = (w, r) => Math.round(w * (1 + r / 30) * 10) / 10;
const prs = () => O.live(X().prs).map(([id, p]) => Object.assign({ id }, p));
function bestOf(lift, before) { return prs().filter(p => p.lift === lift && (!before || p.t < before)).reduce((a, p) => Math.max(a, e1rm(p.w, p.reps)), 0); }
page('gymlab', 'Gym Lab', 'Your training, from Debrief answers and logged sessions. Log a set to track strength; a new estimated 1-rep max pays +20 GYM.', (body, arg) => {
  const ws = weekStart(), wk = O.sessOn(null, s => inWeek(ws)(s) && s.tr === 'gym' && s.m > 0);
  const splits = {}; wk.forEach(s => { const k = s.kind || 'Training'; splits[k] = (splits[k] || 0) + 1; });
  const lifts = [...new Set([...LIFTS, ...prs().map(p => p.lift)])];
  const sel = local.get('lw-gym-lift') || 'Bench press';
  const hist = prs().filter(p => p.lift === sel).sort((a, b) => a.d.localeCompare(b.d) || a.t - b.t);
  let chart = '<p class="mut">No sets logged for this lift yet.</p>';
  if (hist.length) {
    const ys = hist.map(p => e1rm(p.w, p.reps)), mx = Math.max(...ys) * 1.08, mn = Math.min(...ys) * .9, W = 640, H = 200;
    const pt = (v, i) => [30 + (hist.length === 1 ? W / 2 : i * (W - 50) / (hist.length - 1)), H - 24 - (v - mn) / Math.max(1, mx - mn) * (H - 44)];
    chart = `<svg viewBox="0 0 ${W} ${H}" style="width:100%"><polyline fill="none" stroke="var(--gym)" stroke-width="2.5" points="${ys.map((v, i) => pt(v, i).join(',')).join(' ')}"/>${ys.map((v, i) => { const [x, y] = pt(v, i); return `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--gym)"><title>${hist[i].d}: ${hist[i].w} kg × ${hist[i].reps} ≈ ${v} kg 1RM</title></circle>`; }).join('')}<text x="30" y="${H - 6}" style="font:10px var(--mono);fill:#5c6870">${hist[0].d}</text><text x="${W - 20}" y="${H - 6}" text-anchor="end" style="font:10px var(--mono);fill:#5c6870">${hist[hist.length - 1].d}</text><text x="${W - 20}" y="16" text-anchor="end" style="font:12px var(--mono);fill:var(--gym)">best ≈ ${Math.max(...ys)} kg</text></svg>`;
  }
  const bests = lifts.map(l => [l, bestOf(l)]).filter(x => x[1]);
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>THIS WEEK</h3><div class="big" style="color:var(--gym)">${wk.length}<small style="font-size:14px"> session${wk.length === 1 ? '' : 's'}</small></div><p class="mut">${wk.reduce((a, s) => a + s.m, 0)} min · ${Object.entries(splits).map(([k, v]) => `${esc(k)} ×${v}`).join(' · ') || 'no sessions yet'}</p><div class="row2" style="margin-top:6px">${O.daysBack(7).map(d => { const on = O.sessOn(d, s => s.tr === 'gym' && s.m > 0).length; return `<span class="gday${on ? ' on' : ''}" title="${d}">${wdName(d)[0]}</span>`; }).join('')}</div><button class="btn sm" style="margin-top:10px" onclick="LW.ops.open('debrief')">Log today's training in Debrief</button></div>
    <div class="box"><h3>LOG A SET</h3><select class="sel" id="gL" style="width:100%">${lifts.map(l => `<option${l === sel ? ' selected' : ''}>${esc(l)}</option>`).join('')}<option value="__new">+ Other lift…</option></select><input class="inp" id="gNew" placeholder="Lift name" hidden><div class="row2" style="margin-top:6px"><input class="inp" type="number" id="gW" placeholder="kg" step="0.5" style="flex:1;margin:0"><span class="mut">×</span><input class="inp" type="number" id="gR" placeholder="reps" style="flex:1;margin:0"></div><button class="btn go" id="gGo" style="margin-top:10px;width:100%">Log set</button><p class="mut" id="gEst" style="margin-top:6px"></p></div>
    <div class="box"><h3>PERSONAL RECORDS (est. 1RM)</h3>${bests.map(([l, v]) => `<div class="row2" style="justify-content:space-between;padding:5px 0;border-top:1px solid var(--line)"><span>${esc(l)}</span><b style="color:var(--gym)">${v} kg</b></div>`).join('') || '<p class="mut">Log a set to start your records.</p>'}</div>
    <div class="box" style="grid-column:1/-1"><div class="row2" style="justify-content:space-between"><h3 style="margin:0">PROGRESS · ${esc(sel)}</h3></div>${chart}
      <div class="slog" style="margin-top:8px">${hist.slice().reverse().slice(0, 12).map(p => `<div class="srow"><i></i><span class="sd">${esc(p.d.slice(5))}</span><span class="sw">${p.w} kg × ${p.reps} ≈ ${e1rm(p.w, p.reps)} kg</span><span class="sx">${p.xp ? '🏆 +' + p.xp : ''}</span><button class="btn sm" data-prdel="${p.id}">✕</button></div>`).join('')}</div></div></div>`;
  const L = $('#gL');
  L.onchange = () => { $('#gNew').hidden = L.value !== '__new'; if (L.value !== '__new') { local.set('lw-gym-lift', L.value); PAGES().gymlab.r(body); } };
  const est = () => { const w = +$('#gW').value, r = +$('#gR').value; $('#gEst').textContent = w && r ? `≈ ${e1rm(w, r)} kg estimated 1RM · current best ${bestOf(L.value === '__new' ? $('#gNew').value : L.value) || '—'}` : ''; };
  $('#gW').oninput = est; $('#gR').oninput = est;
  $('#gGo').onclick = () => {
    const lift = L.value === '__new' ? $('#gNew').value.trim() : L.value, w = +$('#gW').value, r = Math.round(+$('#gR').value);
    if (!lift || !(w > 0) || !(r > 0) || r > 30) return LW.toast('Enter weight and reps (1–30)', true);
    const prev = bestOf(lift), v = e1rm(w, r), isPR = v > prev, xp = isPR ? 20 : 0;
    X().prs[O.uid()] = { lift, w, reps: r, d: day(), xp, t: Date.now() };
    local.set('lw-gym-lift', lift);
    if (xp) { O.addT('gym', 20, `NEW PR · ${lift} ≈ ${v} kg`); sfx('rankup'); } else { LW.save(); sfx('tick'); LW.toast('Set logged'); }
    PAGES().gymlab.r(body);
  };
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-prdel]'); if (!b) return;
  if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'undo?'; return; }
  const p = X().prs[b.dataset.prdel]; if (!p) return;
  if (p.xp) O.addT('gym', -p.xp, 'PR removed', p.d);
  X().prs[b.dataset.prdel] = { del: 1, t: Date.now() }; LW.save(); PAGES().gymlab.r($('#opBody'));
});

// ======================================================================
// INK LOG (.docx word counts)
// ======================================================================
const inks = () => O.live(X().ink).map(([id, p]) => Object.assign({ id }, p));
const countWords = t => (String(t).replace(/[—–]/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
function inkUpdate(id, total, how) {
  const p = X().ink[id]; if (!p) return;
  total = Math.round(total);
  if (p.base == null) { p.base = total; p.t = Date.now(); LW.save(); sfx('deploy'); return LW.toast(`Baseline set: ${total.toLocaleString()} words. New words count from now.`); }
  const delta = total - p.base;
  p.base = total; p.t = Date.now(); p.last = { d: day(), how };
  if (delta <= 0) { LW.save(); return LW.toast(delta < 0 ? `${-delta} words cut. Baseline updated (editing counts too, but no XP).` : 'No new words since last time'); }
  const today = O.sessOn(day(), s => s.src === 'ink').reduce((a, s) => a + (s.xp || 0), 0);
  const xp = Math.min(Math.round(delta / 25), Math.max(0, 160 - today));
  O.addSession('write', Math.round(delta / 20), xp, 'ink', { words: delta, project: id, note: clip(p.name, 30) }, `+${delta.toLocaleString()} words · ${clip(p.name, 24)}`);
  sfx('granted');
}
page('ink', 'Ink Log', 'Word counts for your own writing. Drop your latest .docx (or type the total from Word\'s status bar) and new words since last time become WRITE XP (1 XP / 25 words). The text itself is never stored.', body => {
  const ps = inks(), wordsOn = d => O.sessOn(d, s => s.tr === 'write').reduce((a, s) => a + (s.words || 0), 0);
  const goal = +(X().inkGoal || 500), today = wordsOn(day()), ds = O.daysBack(14), mx = Math.max(goal, ...ds.map(wordsOn));
  body.innerHTML = `<div class="opgrid"><div class="box"><h3>TODAY</h3><div class="big" style="color:var(--write)">${today.toLocaleString()}<small style="font-size:14px"> / ${goal} words</small></div><div class="bar3"><i style="width:${Math.min(100, today / goal * 100)}%;background:var(--write)"></i></div><div class="row2" style="margin-top:10px"><label class="mut">Daily goal</label><input class="inp" type="number" id="iG" value="${goal}" step="50" style="width:110px;margin:0"></div>
      <svg viewBox="0 0 560 120" style="width:100%;margin-top:10px">${ds.map((d, i) => { const v = wordsOn(d), h = v / mx * 90; return `<rect x="${6 + i * 39}" y="${100 - h}" width="28" height="${h}" rx="2" fill="var(--write)" opacity="${v >= goal ? 1 : .55}"><title>${d}: ${v} words</title></rect><text x="${20 + i * 39}" y="116" text-anchor="middle" style="font:9px var(--mono);fill:#5c6870">${d.slice(8)}</text>`; }).join('')}<line x1="0" x2="560" y1="${100 - goal / mx * 90}" y2="${100 - goal / mx * 90}" stroke="#c77dff" stroke-dasharray="4 4" opacity=".5"/></svg></div>
    <div class="box"><h3>NEW PROJECT</h3><input class="inp" id="iN" placeholder="e.g. Novel, short story, blog"><button class="btn go" id="iAdd" style="margin-top:8px;width:100%">＋ Add project</button><p class="mut" style="margin-top:10px">First drop sets the baseline (no XP). After that, every new word counts. Works with Word, Google Docs export, LibreOffice: anything saved as .docx. On your phone, pick the file from Downloads or OneDrive.</p></div>
    ${ps.map(p => `<div class="box inkp" data-ip="${p.id}"><div class="row2" style="justify-content:space-between"><h3 style="margin:0">${esc(p.name)}</h3><button class="btn sm" data-idel="${p.id}">✕</button></div><p class="mut">${p.base == null ? 'No baseline yet' : `${p.base.toLocaleString()} words total`}${p.last ? ` · updated ${esc(p.last.d)} via ${esc(p.last.how)}` : ''}</p>
      <label class="btn go sm" style="display:inline-flex">📄 Drop / pick .docx<input type="file" accept=".docx" hidden data-idoc="${p.id}"></label>
      <div class="row2" style="margin-top:8px"><input class="inp" type="number" placeholder="or type total words" data-inum="${p.id}" style="flex:1;margin:0"><button class="btn sm" data-iset="${p.id}">Update</button></div></div>`).join('')}</div>`;
  $('#iG').onchange = e => { X().inkGoal = Math.max(50, +e.target.value || 500); LW.save(); PAGES().ink.r(body); };
  $('#iAdd').onclick = () => { const n = $('#iN').value.trim(); if (!n) return; X().ink[O.uid()] = { name: n, base: null, t: Date.now() }; LW.save(); PAGES().ink.r(body); };
  $$('.inkp').forEach(b => { b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('over'); }); b.addEventListener('dragleave', () => b.classList.remove('over')); b.addEventListener('drop', e => { e.preventDefault(); b.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) inkDoc(b.dataset.ip, f); }); });
});
async function inkDoc(id, f) {
  if (!/\.docx$/i.test(f.name)) return LW.toast('Needs a .docx file (Word: File → Save as → .docx)', true);
  try { await loadScript('libs/doc/mammoth.browser.min.js'); const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() }); inkUpdate(id, countWords(r.value), '.docx'); }
  catch (e) { return LW.toast('Couldn\'t read that .docx', true); }
  if (O.onOp('ink')) PAGES().ink.r($('#opBody'));
}
document.addEventListener('change', e => { const i = e.target.closest('[data-idoc]'); if (i && i.files[0]) inkDoc(i.dataset.idoc, i.files[0]); });
document.addEventListener('click', e => {
  const s = e.target.closest('[data-iset]'); if (s) { const v = +document.querySelector(`[data-inum="${s.dataset.iset}"]`).value; if (!(v >= 0)) return; inkUpdate(s.dataset.iset, v, 'typed count'); return PAGES().ink.r($('#opBody')); }
  const d = e.target.closest('[data-idel]'); if (d) { if (d.dataset.arm !== '1') { d.dataset.arm = '1'; d.textContent = 'remove?'; return; } X().ink[d.dataset.idel] = { del: 1, t: Date.now() }; LW.save(); PAGES().ink.r($('#opBody')); }
});

// ======================================================================
// WEEKLY WRAPPED + NOTIFICATIONS
// ======================================================================
function summary(ws) {
  const days = weekDays(ws), per = {}, mins = {};
  TR.forEach(t => { per[t] = days.reduce((a, d) => a + O.dayNet(d, t), 0); });
  const ss = O.sessOn(null, s => days.includes(s.d));
  ss.forEach(s => { mins[s.tr] = (mins[s.tr] || 0) + (s.m || 0); });
  const totals = days.map(d => TR.reduce((a, t) => a + O.dayNet(d, t), 0));
  const bi = totals.indexOf(Math.max(...totals));
  const top = TR.filter(t => !O.isPaused(t)).sort((a, b) => per[b] - per[a])[0];
  return {
    ws, days, per, mins, total: totals.reduce((a, b) => a + b, 0), totalMin: Object.values(mins).reduce((a, b) => a + b, 0),
    best: totals[bi] ? { d: days[bi], xp: totals[bi] } : null, top: per[top] ? top : null,
    gym: ss.filter(s => s.tr === 'gym' && s.m > 0).length, pages: ss.reduce((a, s) => a + (s.pages || 0), 0), words: ss.reduce((a, s) => a + (s.words || 0), 0),
    cards: days.reduce((a, d) => a + ((LW.S.days[d] || {}).cards || 0), 0), focus: ss.filter(s => s.src === 'focus' || s.src === 'lockin').reduce((a, s) => a + s.m, 0),
    debriefs: days.filter(d => ((X().deb[d] || {})._done || {}).v).length, ops: days.filter(d => X().opsPaid[d]).length,
    bounties: Object.keys(X().badges).filter(k => k.startsWith(ws + ':')).length,
    sleep: (() => { const v = days.map(d => ((X().deb[d] || {}).sleep || {}).v).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; })()
  };
}
const hm = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
const notifOn = () => !!(X().notif && X().notif.on);
page('wrapped', 'Weekly Wrapped', 'Your week, leaked. Tap the redacted bars to reveal the numbers.', (body, arg) => {
  const lastWs = weekStart(-1), thisWs = weekStart();
  const ws = arg === 'now' ? thisWs : lastWs, w = summary(ws);
  X().wrapSeen[lastWs] = 1; LW.save(true);
  const red = (v, cls) => `<span class="redact${cls ? ' ' + cls : ''}" tabindex="0">${v}</span>`;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  body.innerHTML = `<div class="chips"><button class="chip${ws === lastWs ? ' on' : ''}" data-wk="last">Last week</button><button class="chip${ws === thisWs ? ' on' : ''}" data-wk="now">This week so far</button></div>
  <div class="leak"><div class="lk-h"><span>DOSSIER // OPERATOR HADES</span><span>WEEK OF ${ws}</span></div><div class="stamp">LEAKED</div>
    <p class="lk-l">Subject logged ${red(hm(w.totalMin))} of tracked activity and earned ${red(w.total + ' XP')} across all tracks.</p>
    <p class="lk-l">Strongest signal: ${w.top ? red(TRACKS[w.top].name, 't-' + w.top) : red('none detected')}. Best day: ${w.best ? red(wdName(w.best.d) + ' · ' + w.best.xp + ' XP') : red('—')}.</p>
    <div class="lk-g">${TR.map(t => `<div class="lk-t${O.isPaused(t) ? ' off' : ''}"><b style="color:${TRACKS[t].c}">${TRACKS[t].name}</b>${red('+' + w.per[t] + ' XP')}<small>${hm(w.mins[t] || 0)}</small></div>`).join('')}</div>
    <p class="lk-l">Field data: ${red(w.cards + ' cards burned')}, ${red(w.gym + ' training sessions')}, ${red(w.pages + ' pages read')}, ${red(w.words.toLocaleString() + ' words written')}, ${red(hm(w.focus) + ' in deep focus')}.</p>
    <p class="lk-l">Discipline: ${red(w.debriefs + '/7 debriefs')}, ${red(w.ops + ' Daily Ops cleared')}, ${red(w.bounties + ' bounties claimed')}${w.sleep ? `, average sleep ${red(w.sleep + ' h')}` : ''}.</p>
    <p class="lk-f">// end of file. this document will not self-destruct.</p></div>
  <div class="box" style="margin-top:16px;max-width:760px"><h3>PHONE NOTIFICATIONS</h3>
    <p class="mut">Sunday evening your phone gets the Wrapped as a notification, even if you didn't open the app. Optional: an evening nudge if the Debrief is still empty. Android decides the exact moment (usually within a few hours), and it only works for the installed app.</p>
    <div class="row2" style="margin-top:10px"><button class="btn ${notifOn() && perm === 'granted' ? '' : 'go'}" id="nOn">${notifOn() && perm === 'granted' ? '✓ Notifications on (this device)' : '🔔 Turn on notifications'}</button><button class="btn" id="nTest">Send a test</button>${notifOn() ? '<button class="btn" id="nOff">Turn off</button>' : ''}</div>
    <label class="row2 mut" style="margin-top:10px"><input type="checkbox" id="nDeb" ${(X().notif || {}).debrief !== false ? 'checked' : ''}> Evening Debrief reminder (after 20:00, only if empty)</label>
    <p class="mut" id="nStat" style="margin-top:8px">Permission: ${perm}${'serviceWorker' in navigator ? '' : ' · no service worker'}</p></div>`;
  body.querySelector('.chips').onclick = e => { const c = e.target.closest('[data-wk]'); if (c) { O.CUR.arg = c.dataset.wk; PAGES().wrapped.r(body, c.dataset.wk); } };
  body.querySelector('.leak').onclick = e => { const r = e.target.closest('.redact'); if (r) { r.classList.add('open'); sfx('tick'); } };
  $('#nOn').onclick = enableNotif;
  $('#nTest').onclick = async () => { const ok = await notify('LONEWOLF // WEEKLY WRAPPED', wrapText(summary(lastWs)), 'wrapped'); if (!ok) LW.toast('Allow notifications first', true); };
  const off = $('#nOff'); if (off) off.onclick = () => { X().notif = Object.assign({}, X().notif, { on: false, t: Date.now() }); LW.save(); PAGES().wrapped.r(body, arg); };
  $('#nDeb').onchange = e => { X().notif = Object.assign({}, X().notif, { debrief: e.target.checked, t: Date.now() }); LW.save(); };
});
function wrapText(w) {
  const tops = TR.filter(t => w.per[t]).sort((a, b) => w.per[b] - w.per[a]).slice(0, 3).map(t => `${TRACKS[t].name} +${w.per[t]}`).join(' · ');
  return `${tops || 'Quiet week, Sir.'}\n${hm(w.totalMin)} logged${w.best ? ` · best day ${wdName(w.best.d)}` : ''} · tap for the full dossier`;
}
async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: { hash: '#' + tag } }); return true; }
  catch (e) { try { new Notification(title, { body }); return true; } catch (er) { return false; } }
}
async function enableNotif() {
  if (!('Notification' in window)) return LW.toast('This browser has no notifications', true);
  const p = await Notification.requestPermission();
  if (p !== 'granted') return LW.toast('Permission blocked. Allow it in the browser/site settings.', true);
  X().notif = Object.assign({ debrief: true }, X().notif, { on: true, t: Date.now() }); LW.save();
  await registerSync(true);
  sfx('granted'); if (O.onOp('wrapped')) PAGES().wrapped.r($('#opBody'), O.CUR.arg);
}
async function registerSync(verbose) {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) { if (verbose) LW.toast('Background check not supported here: Wrapped will show when you open the app', true); return; }
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => ({ state: 'granted' }));
    if (st.state !== 'granted') { if (verbose) LW.toast('Install the app (and use it a bit) so Android allows background checks', true); return; }
    await reg.periodicSync.register('lw-tick', { minInterval: 4 * 3600e3 });
    if (verbose) LW.toast('Background notifications armed');
  } catch (e) { if (verbose) LW.toast('Background check unavailable: ' + (e.message || e), true); }
}
// in-app fallback: when the app opens on Sunday evening / Monday and the Wrapped hasn't been seen
function wrapDue() { const d = new Date(), wd = d.getDay(); return (wd === 0 && d.getHours() >= 18) ? weekStart() : wd === 1 ? weekStart(-1) : null; }

// ======================================================================
// INSIGHTS
// ======================================================================
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
page('insights', 'Insights', 'Patterns from your own data. The more Debriefs you file, the sharper this gets.', body => {
  const ds = O.daysBack(60), deb = d => X().deb[d] || {}, xpDay = d => TR.reduce((a, t) => a + O.dayNet(d, t), 0), out = [];
  const add = (ic, h, p, n) => out.push(`<div class="ins"><span class="ii">${ic}</span><div><b>${h}</b><p class="mut">${p}</p>${n ? `<small class="mut">${n}</small>` : ''}</div></div>`);
  const lock = (ic, h, need) => out.push(`<div class="ins lockd"><span class="ii">${ic}</span><div><b>${h}</b><p class="mut">${need}</p></div></div>`);
  // sleep vs output
  const sl = ds.filter(d => (deb(d).sleep || {}).v != null);
  const hi = sl.filter(d => deb(d).sleep.v >= 7).map(xpDay), lo = sl.filter(d => deb(d).sleep.v < 7).map(xpDay);
  if (hi.length >= 3 && lo.length >= 3) { const a = avg(hi), b = avg(lo), pct = b ? Math.round((a - b) / b * 100) : 100; add('😴', pct >= 0 ? `You produce ${pct}% more XP after 7h+ sleep` : `Sleep doesn't seem to drive your output (${pct}%)`, `${Math.round(a)} XP/day after 7h+, vs ${Math.round(b)} XP/day on short nights.`, `based on ${sl.length} nights`); }
  else lock('😴', 'Sleep vs output', `Need ${Math.max(0, 3 - hi.length)} more nights of 7h+ and ${Math.max(0, 3 - lo.length)} more under 7h (Debrief sleep question).`);
  // energy on gym days
  const en = ds.filter(d => (deb(d).energy || {}).v != null);
  const g1 = en.filter(d => O.sessOn(d, s => s.tr === 'gym' && s.m > 0).length).map(d => deb(d).energy.v), g0 = en.filter(d => !O.sessOn(d, s => s.tr === 'gym' && s.m > 0).length).map(d => deb(d).energy.v);
  if (g1.length >= 3 && g0.length >= 3) { const a = avg(g1), b = avg(g0); add('⚡', a >= b ? `Training days: energy ${a.toFixed(1)}/5 vs ${b.toFixed(1)} on rest days` : `You feel more drained on training days (${a.toFixed(1)} vs ${b.toFixed(1)})`, a >= b ? 'Moving the body is charging the battery.' : 'Check sleep and food around training days.', `${en.length} days of energy data`); }
  else lock('⚡', 'Energy vs training', 'Answer the energy question on at least 3 training days and 3 rest days.');
  // best weekday
  const act = ds.filter(d => xpDay(d) > 0);
  if (act.length >= 10) { const by = {}; act.forEach(d => { const w = wdName(d); (by[w] ||= []).push(xpDay(d)); }); const best = Object.entries(by).sort((a, b) => avg(b[1]) - avg(a[1]))[0]; add('📅', `${best[0]} is your power day`, `Average ${Math.round(avg(best[1]))} XP on ${best[0]}s. Put your hardest revision there.`, `${act.length} active days`); }
  else lock('📅', 'Your power day', `Need ${10 - act.length} more active days.`);
  // peak hour
  const ts = O.sessOn(null, s => ['focus', 'lockin', 'book'].includes(s.src) && s.t > 10);
  if (ts.length >= 5) { const h = Array(24).fill(0); ts.forEach(s => { h[new Date(s.t).getHours()] += s.m || 1; }); let bi = 0; for (let i = 0; i < 24; i++) if (h[i] + h[(i + 1) % 24] > h[bi] + h[(bi + 1) % 24]) bi = i; add('🕶️', `Deep-focus window: ${String(bi).padStart(2, '0')}:00–${String((bi + 2) % 24).padStart(2, '0')}:00`, 'Most of your focus and reading time lands here. Guard it.', `${ts.length} sessions`); }
  else lock('🕶️', 'Your deep-focus window', `Finish ${5 - ts.length} more Infiltration / Lock-in / reading sessions.`);
  // reading pace + ETA
  const pg14 = O.daysBack(14).reduce((a, d) => a + O.sessOn(d, s => s.tr === 'read').reduce((x, s) => x + (s.pages || 0), 0), 0), pace = pg14 / 14;
  const open = books().filter(b => b.total && !b.done && (b.furthest || 0) > 0);
  if (pace > 0 && open.length) open.slice(0, 3).forEach(b => { const left = b.total - (b.furthest || 0), dd = Math.ceil(left / pace); const eta = new Date(); eta.setDate(eta.getDate() + dd); add('📚', `“${esc(clip(b.title, 40))}” done around ${eta.toLocaleDateString([], { day: 'numeric', month: 'short' })}`, `${left} pages left at your pace of ${pace.toFixed(1)} pages/day.`, 'last 14 days'); });
  else lock('📚', 'Book finish dates', 'Read a few days in the Library (or log pages in Debrief) to get finish dates.');
  // consistency
  const cons = TR.filter(t => !O.isPaused(t)).map(t => [t, O.daysBack(30).filter(d => O.dayNet(d, t) > 0).length]).sort((a, b) => b[1] - a[1]);
  if (cons.some(c => c[1] > 0)) add('🔁', `Most consistent: ${TRACKS[cons[0][0]].name} (${cons[0][1]}/30 days)`, `Least: ${TRACKS[cons[cons.length - 1][0]].name} (${cons[cons.length - 1][1]}/30). Consistency beats intensity.`, 'last 30 days');
  body.innerHTML = `<div class="opgrid">${out.join('')}</div>`;
});

// ======================================================================
// SEASON WAKE-UP
// ======================================================================
function speak(text, force) {
  if (!('speechSynthesis' in window)) return;
  if (!force && local.get('lw-voice') === 'off') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices();
    u.voice = vs.find(v => /en-GB/i.test(v.lang) && /male|daniel|george|ryan|arthur/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
    u.rate = 1.03; u.pitch = .88; speechSynthesis.speak(u);
  } catch (e) {}
}
O.onWake = async t => {
  const name = TRACKS[t].name;
  let detail = '';
  if (t === 'uni') { let cards = 0; for (const m of LW.modules()) { try { cards += (await LW.getModule(m.id)).cards.length; } catch (e) {} } detail = `${LW.modules().length} modules · ${cards} cards back online`; }
  const el = document.createElement('div'); el.className = 'wake';
  el.innerHTML = `<div class="wk"><svg viewBox="0 0 200 200"><use href="#wolf"/></svg><div class="glitch" data-t="WAKE UP">WAKE UP</div><div class="wlog"></div></div>`;
  document.body.append(el);
  const lines = ['> wake signal received', `> rebooting ${name} subsystems`, detail ? '> ' + detail : `> ${name} signal restored`, t === 'uni' ? '> welcome back, Sir. semester protocols online.' : `> ${name.toLowerCase()} systems back online, Sir.`];
  sfx('uplink');
  let i = 0; const log = el.querySelector('.wlog');
  const nx = () => { if (i >= lines.length) { sfx('breach'); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 1400); return; } const r = document.createElement('div'); r.textContent = lines[i++]; log.append(r); sfx('type'); setTimeout(nx, 520); };
  setTimeout(nx, 400);
  speak(t === 'uni' ? 'Welcome back, Sir. University systems are back online. Shall we begin?' : `${TRACKS[t].long} systems back online, Sir.`);
  el.onclick = () => el.remove();
};

// ======================================================================
// LOCK-IN (HUD mode)
// ======================================================================
const Lock = (() => {
  let L = null;
  const pos = () => { try { return JSON.parse(local.get('lw-lk-pos') || '{}'); } catch (e) { return {}; } };
  function setup() {
    if (L) return LW.toast('Lock-in already running');
    let pref = {}; try { pref = JSON.parse(local.get('lw-lk-pref') || '{}'); } catch (e) {}
    const m = document.createElement('div'); m.className = 'lkmodal';
    m.innerHTML = `<div class="lkbox"><div class="glitch" data-t="LOCK-IN">LOCK-IN</div><p class="mut">Full HUD mode. A mission feed tells you what to hit next, comms keep you on track, pop-ups confirm every win. Move around the app freely; the HUD follows you.</p>
      <label class="mut">Duration</label><div class="chips" id="lkD">${[[25, '25 min'], [50, '50 min'], [90, '90 min'], [0, '∞ open']].map(([v, l]) => `<button class="chip${(pref.min ?? 50) === v ? ' on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
      <label class="mut">Track</label>${O.trSel('lkT', pref.tr || (O.isPaused('uni') ? 'read' : 'uni'))}
      <div class="row2" style="margin-top:10px"><label class="row2"><input type="checkbox" id="lkV" ${local.get('lw-voice') === 'off' ? '' : 'checked'}> Voice comms</label><label class="row2"><input type="checkbox" id="lkA" ${pref.amb ? 'checked' : ''}> Ambience</label><label class="row2"><input type="checkbox" id="lkS" ${pref.strict ? 'checked' : ''}> Strict (leaving the app ends it)</label></div>
      <div class="row2" style="margin-top:14px"><button class="btn go" id="lkGo" style="flex:1">⚡ ENGAGE</button><button class="btn" id="lkNo">Cancel</button></div></div>`;
    document.body.append(m);
    let min = pref.min ?? 50;
    m.querySelector('#lkD').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; min = +b.dataset.v; m.querySelectorAll('#lkD .chip').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#lkNo').onclick = () => m.remove();
    m.querySelector('#lkGo').onclick = () => {
      const o = { min, tr: m.querySelector('#lkT').value, amb: m.querySelector('#lkA').checked, strict: m.querySelector('#lkS').checked };
      local.set('lw-voice', m.querySelector('#lkV').checked ? 'on' : 'off'); local.set('lw-lk-pref', JSON.stringify(o));
      m.remove(); start(o);
    };
    O.visit('lockin');
  }
  const xpNow = () => TR.reduce((a, t) => a + O.todayXP(t), 0);
  const dayRec = () => LW.S.days[day()] || {};
  function start(o) {
    const intro = document.createElement('div'); intro.className = 'lkintro';
    intro.innerHTML = `<div class="lkring"></div><div class="glitch" data-t="LOCK-IN PROTOCOL">LOCK-IN PROTOCOL</div><p>non-essential systems muted · ${o.min ? o.min + ' minutes' : 'open session'} · ${TRACKS[o.tr].name}</p>`;
    document.body.append(intro); sfx('uplink');
    speak(`Lock-in engaged. ${o.min ? o.min + ' minutes on the clock.' : 'Open session.'} Let's begin, Sir.`);
    setTimeout(() => { intro.classList.add('out'); setTimeout(() => intro.remove(), 500); }, 2100);
    L = Object.assign({}, o, { t0: Date.now(), end: o.min ? Date.now() + o.min * 60e3 : 0, xp0: xpNow(), c0: dayRec().cards || 0, d0: dayRec().drills || 0, m0: dayRec().missions || 0, lastXP: xpNow(), said: {}, hiddenAt: 0 });
    if (o.amb) O.Amb.start();
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => { if (L) L.wake = w; }).catch(() => {}); } catch (e) {}
    document.body.classList.add('locked-in');
    build(); feed(); comms('Systems green. Mission feed is live, Sir.');
    L.tick = setInterval(tick, 1000); L.feedT = setInterval(feed, 30000);
    btn();
  }
  function panel(id, title, html) {
    const p = pos()[id] || {};
    return `<section class="lkp" id="lk-${id}" style="${p.x != null ? `left:${p.x}px;top:${p.y}px;right:auto;bottom:auto` : ''}"><header data-drag="${id}"><span>${title}</span><button class="lkmin" data-min="${id}" aria-label="Minimise">–</button></header><div class="lkb">${html}</div></section>`;
  }
  function build() {
    const h = document.createElement('div'); h.id = 'lkHud';
    h.innerHTML = `<div class="lkframe"><i></i><i></i><i></i><i></i></div>` +
      panel('timer', `LOCK-IN · ${TRACKS[L.tr].name}`, `<div class="lkt" id="lkTime">00:00</div><div class="bar3"><i id="lkBar" style="background:${TRACKS[L.tr].c}"></i></div><div class="row2" style="margin-top:8px;justify-content:space-between"><span class="mut" id="lkGain">+0 XP</span><button class="btn red sm" id="lkEnd">End</button></div>`) +
      panel('feed', 'MISSION FEED', '<div id="lkFeed" class="lkfeed"><p class="mut">scanning…</p></div>') +
      panel('sys', 'SYSTEMS', '<div id="lkSys"></div>') +
      panel('comms', 'COMMS', '<div id="lkComms" class="lkcomms"></div>');
    document.body.append(h);
    h.querySelector('#lkEnd').onclick = () => { const b = h.querySelector('#lkEnd'); if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'Sure?'; setTimeout(() => { if (b.isConnected) { b.dataset.arm = ''; b.textContent = 'End'; } }, 2500); return; } stop('manual'); };
    // drag + minimise
    let drag = null;
    h.addEventListener('pointerdown', e => {
      const mn = e.target.closest('[data-min]'); if (mn) { const s = h.querySelector('#lk-' + mn.dataset.min); const opening = s.classList.contains('mini'); if (opening && innerWidth < 700 && mn.dataset.min !== 'timer') h.querySelectorAll('.lkp:not(#lk-timer)').forEach(x => x.classList.add('mini')); s.classList.toggle('mini', !opening); return; }
      const hd = e.target.closest('[data-drag]'); if (hd && innerWidth < 700) { const b = hd.querySelector('[data-min]'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; } if (!hd) return;
      const s = hd.parentElement, r = s.getBoundingClientRect(); drag = { s, dx: e.clientX - r.left, dy: e.clientY - r.top, id: hd.dataset.drag }; hd.setPointerCapture(e.pointerId);
    });
    h.addEventListener('pointermove', e => { if (!drag) return; const x = Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.dx)), y = Math.max(56, Math.min(innerHeight - 40, e.clientY - drag.dy)); Object.assign(drag.s.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); });
    h.addEventListener('pointerup', () => { if (!drag) return; const p = pos(); p[drag.id] = { x: parseInt(drag.s.style.left), y: parseInt(drag.s.style.top) }; local.set('lw-lk-pos', JSON.stringify(p)); drag = null; });
    if (innerWidth < 700) ['feed', 'sys', 'comms'].forEach(id => h.querySelector('#lk-' + id).classList.add('mini'));
  }
  function tick() {
    if (!L) return;
    const el = (Date.now() - L.t0) / 1000;
    const t = $('#lkTime');
    if (t) {
      t.textContent = L.end ? O.fmt((L.end - Date.now()) / 1000) : O.fmt(el);
      $('#lkBar').style.width = L.end ? Math.min(100, el / (L.min * 60) * 100) + '%' : '100%';
      const g = xpNow() - L.xp0; $('#lkGain').textContent = `+${g} XP this session`;
    }
    const x = xpNow();
    if (x > L.lastXP) { pop(`+${x - L.lastXP} XP`, 'TARGET HIT'); L.lastXP = x; feed(); }
    const mins = Math.floor(el / 60);
    if (L.end) {
      const left = (L.end - Date.now()) / 60e3;
      if (left <= L.min / 2 && !L.said.half) { L.said.half = 1; comms('Halfway, Sir. Signal is climbing. Keep the pressure on.', true); }
      if (left <= 5 && L.min > 10 && !L.said.five) { L.said.five = 1; comms('Five minutes left. Finish strong.', true); }
      if (Date.now() >= L.end) return stop('done');
    }
    if (mins && mins % 20 === 0 && !L.said['h' + mins]) { L.said['h' + mins] = 1; comms(['Twenty minutes deep. Hydration recommended, Sir.', 'Posture check. Shoulders down, eyes off the screen for ten seconds.', 'Still locked in. Excellent discipline, Sir.'][(mins / 20 - 1) % 3], true); }
    sys();
  }
  function sys() {
    const s = $('#lkSys'); if (!s) return;
    const r = dayRec();
    s.innerHTML = TR.filter(t => !O.isPaused(t)).map(t => `<div class="row2" style="justify-content:space-between"><span>${O.trDot(t)}${TRACKS[t].name}</span><b style="color:${TRACKS[t].c}">+${O.todayXP(t)}</b></div>`).join('') +
      `<div class="mut" style="margin-top:6px">this session: ${(r.cards || 0) - L.c0} cards · ${(r.drills || 0) - L.d0} drills · ${(r.missions || 0) - L.m0} missions</div>`;
  }
  async function feed() {
    if (!L) return;
    const items = [];
    const mods = LW.modules().map(m => ({ m, ex: (LW.S.exams || {})[m.id] })).sort((a, b) => (a.ex || '9') < (b.ex || '9') ? -1 : 1);
    if (!O.isPaused('uni')) for (const { m, ex } of mods.slice(0, 3)) {
      let mod; try { mod = await LW.getModule(m.id); } catch (e) { continue; }
      const st = LW.S.mods[m.id] || { nodes: {}, cards: {}, drills: {}, chal: {} };
      const due = mod.cards.filter(c => !(st.cards || {})[c.id] || st.cards[c.id].d <= Date.now()).length;
      const days = ex ? Math.ceil((new Date(ex + 'T09:00') - new Date()) / LW.DAY) : null;
      const tag = days != null && days >= 0 ? ` · exam ${days}d` : '';
      if (due) items.push({ t: `Burn ${Math.min(due, 20)} due cards`, s: m.code + tag, go: () => LW.burn(m.id) });
      const unread = mod.nodes.find(n => !((st.nodes || {})[n.id] || {}).read);
      if (unread) items.push({ t: `Read ${unread.code}: ${clip(unread.name, 34)}`, s: m.code, go: async () => { await LW.loadModule(m.id); LW.openNode(unread.id); } });
      const drill = mod.drills.find(d => ((st.drills || {})[d.id] || 0) < 90);
      if (drill) items.push({ t: `Drill blind: ${clip(drill.title, 34)}`, s: m.code, go: async () => { await LW.loadModule(m.id); LW.go('blackbook'); } });
      const ch = mod.challenges.find(c => !(st.chal || {})[c.id]);
      if (ch) items.push({ t: `Terminal mission: ${clip(ch.title, 30)}`, s: m.code, go: async () => { await LW.loadModule(m.id); LW.go('terminal'); } });
    }
    O.opsState().list.filter(x => !x.done).forEach(x => items.push({ t: x.o.t, s: 'Daily Op', go: x.o.go }));
    const h = new Date().getHours();
    if (h >= 18 && debStatus(day()).done < debStatus(day()).n) items.push({ t: 'File tonight\'s Debrief', s: 'Life', go: () => openOp('debrief') });
    if (!O.isPaused('read')) { const b = books().filter(b => !b.done && b.kind === 'pdf').sort((a, c) => (c.t || 0) - (a.t || 0))[0]; if (b) items.push({ t: `Continue “${clip(b.title, 28)}”`, s: 'Library', go: () => Reader.open(b.id) }); }
    const f = $('#lkFeed'); if (!f) return;
    L.items = items.slice(0, 6);
    f.innerHTML = L.items.map((x, i) => `<button class="lkm" data-lk="${i}"><b>${esc(x.t)}</b><small>${esc(x.s)}</small><span>ENGAGE ▸</span></button>`).join('') || '<p class="mut">All clear. Nothing left in the queue, Sir. Impressive.</p>';
    if (!L.said.first && L.items[0]) { L.said.first = 1; setTimeout(() => comms(`First target: ${L.items[0].t.toLowerCase()}. I'd start there, Sir.`, true), 2600); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-lk]'); if (b && L && L.items[+b.dataset.lk]) { sfx('granted'); L.items[+b.dataset.lk].go(); } });
  function comms(text, voice) {
    const c = $('#lkComms'); if (!c) return;
    const row = document.createElement('div'); row.className = 'cm'; c.prepend(row);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let i = 0; const tt = setInterval(() => { i += 2; row.innerHTML = `<small>${ts}</small> ${esc(text.slice(0, i))}`; if (i >= text.length) clearInterval(tt); }, 18);
    while (c.children.length > 8) c.lastChild.remove();
    if (voice) speak(text);
  }
  function pop(big, small) {
    const p = document.createElement('div'); p.className = 'lkpop';
    p.innerHTML = `<small>${esc(small)}</small><b>${esc(big)}</b>`;
    document.body.append(p); sfx('granted');
    setTimeout(() => { p.classList.add('out'); setTimeout(() => p.remove(), 400); }, 2200);
  }
  document.addEventListener('visibilitychange', () => {
    if (!L) return;
    if (document.hidden) L.hiddenAt = Date.now();
    else if (L.hiddenAt) { const away = Date.now() - L.hiddenAt; L.hiddenAt = 0; if (L.strict && away > 10000) { sfx('denied'); stop('broken'); } }
  });
  function stop(why) {
    if (!L) return;
    clearInterval(L.tick); clearInterval(L.feedT); O.Amb.stop(); try { L.wake && L.wake.release(); } catch (e) {}
    const mins = Math.round((Math.min(Date.now(), L.end || Date.now()) - L.t0) / 60e3), r = dayRec(), tr = L.tr;
    let logged = 0;
    if (why !== 'broken' && mins >= 5) { logged = mins; O.addSession(tr, mins, mins, 'lockin', null, null); }
    const gain = xpNow() - L.xp0, cards = (r.cards || 0) - L.c0;
    document.body.classList.remove('locked-in'); const h = $('#lkHud'); if (h) h.remove();
    L = null; btn();
    const m = document.createElement('div'); m.className = 'lkmodal';
    m.innerHTML = `<div class="lkbox"><div class="glitch" data-t="${why === 'broken' ? 'STEALTH BROKEN' : 'LOCK-IN COMPLETE'}" style="${why === 'broken' ? 'color:var(--red)' : ''}">${why === 'broken' ? 'STEALTH BROKEN' : 'LOCK-IN COMPLETE'}</div>
      <div class="lksum"><div><b>${mins}m</b><small>duration</small></div><div><b>+${gain}</b><small>XP earned</small></div><div><b>${cards}</b><small>cards</small></div></div>
      <p class="mut">${why === 'broken' ? 'You left the app in strict mode. Time not logged.' : logged ? `${logged} min logged to ${TRACKS[tr].name} (undo it in Tracks → Session log).` : 'Under 5 minutes: nothing logged.'}</p><button class="btn go" style="width:100%">Close</button></div>`;
    document.body.append(m); m.querySelector('button').onclick = () => m.remove();
    sfx(why === 'broken' ? 'denied' : 'breach');
    speak(why === 'broken' ? 'Lock-in broken. We go again when you are ready, Sir.' : `Lock-in complete. ${mins} minutes, ${gain} XP. Excellent work, Sir.`);
    O.refreshAll();
  }
  function btn() {
    let b = $('#lkBtn');
    if (!b) { const hb = $('#handBtn'); if (!hb) return; hb.insertAdjacentHTML('beforebegin', '<button class="hbtn" id="lkBtn" aria-label="Lock-in mode"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg><span>Lock-in</span></button>'); b = $('#lkBtn'); b.onclick = () => L ? stop('manual') : setup(); }
    b.classList.toggle('live', !!L); b.querySelector('span').textContent = L ? 'End lock-in' : 'Lock-in';
  }
  setTimeout(btn, 0);
  return { setup, start, stop: () => stop('manual'), get active() { return !!L; } };
})();
LW.lockin = Lock;

// ======================================================================
// HOME additions
// ======================================================================
O.homeExtra = () => {
  let box = $('#hLife');
  if (!box) { const ops = $('#hOps'); if (!ops) return; ops.insertAdjacentHTML('beforebegin', '<div id="hLife"></div>'); box = $('#hLife'); }
  const S_ = O.SEASON(), due = wrapDue();
  const banner = S_.mode === 'holidays' ? `<div class="hban hol">🌴 <b>HOLIDAY MODE</b> · UNI is asleep. No draining, no nagging. Flip to Semester in Tracks when it's time: I'll wake it up.</div>` : S_.mode === 'exams' ? `<div class="hban exm">🔥 <b>EXAM SEASON</b> · Daily Ops are all-uni. Lock-in is your friend.</div>` : '';
  const wb = due && !X().wrapSeen[due] && O.sessOn(null).length ? `<button class="hban wrap" onclick="LW.ops.open('wrapped','${due === weekStart() ? 'now' : 'last'}')">📁 <b>WEEKLY WRAPPED LEAKED</b> · tap to open your dossier</button>` : '';
  box.innerHTML = banner + wb + `<div class="hlgrid">${debriefCard()}<div class="box"><div class="row2" style="justify-content:space-between"><h3 style="margin:0">WEEKLY BOUNTIES</h3><button class="btn sm" onclick="LW.ops.open('bounties')">All</button></div><div style="margin-top:10px">${bountyHTML(weekStart(), true)}</div></div><div class="box lkcard"><h3>LOCK-IN</h3><p class="mut">Full HUD mode: mission feed, comms, pop-ups. The app tells you what to hit next.</p><button class="btn go" onclick="LW.lockin.setup()" style="width:100%">⚡ Engage lock-in</button></div></div>`;
};

// boot: notification deep links + background-check registration
LW.on('ready', () => {
  if (BOOT_HASH === '#wrapped') setTimeout(() => openOp('wrapped', 'last'), 300);
  if (BOOT_HASH === '#debrief') setTimeout(() => openOp('debrief'), 300);
  if (notifOn() && 'Notification' in window && Notification.permission === 'granted') registerSync(false);
});
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.open) openOp(e.data.open, e.data.open === 'wrapped' ? 'last' : undefined); });
}
