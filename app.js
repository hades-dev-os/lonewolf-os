// LONEWOLF OS core: vault storage, modules, Intel, Burner, Blackbook, Terminal, Breach log, Ask AI.
// Other files (forge.js, rig.js) talk to this one through window.LW.
{
// ============ helpers ============
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Date().toISOString().slice(0, 10);
const MIN = 60e3, DAY = 864e5;
const BOX_WAIT = [0, 0, 10 * MIN, DAY, 3 * DAY, 7 * DAY];
const RANKS = [
  [0, 'Script Kiddie'], [150, 'Packet Sniffer'], [400, 'Code Breaker'],
  [800, 'Ghost Operator'], [1400, 'Black Hat'], [2200, 'Root'], [3200, 'Lone Wolf']
];
const APP_VERSION = '2.2.0';

// ============ vault: IndexedDB key-value storage ============
const Vault = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('lonewolf', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', mode), st = t.objectStore('kv');
      const out = fn(st);
      t.oncomplete = () => res(out && out.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: k => tx('readonly', st => st.get(k)),
    set: (k, v) => tx('readwrite', st => st.put(v, k)),
    del: k => tx('readwrite', st => st.delete(k))
  };
})();

// ============ state ============
function blank() {
  return { v: 2, xp: 0, updated: 0, days: {}, mods: {}, drafts: {}, exams: {}, contract: { cards: 20, drills: 1, missions: 1 }, contractPaid: {}, deletedMods: {} };
}
let S = blank();
let VAULT = {};             // forged modules: id -> module
let MOD = null, MODS = [];  // current module, registry
let ready = false;
const listeners = { save: [], ready: [], module: [] };
const emit = (k, ...a) => listeners[k].forEach(f => { try { f(...a); } catch (e) { console.error(e); } });
const M = () => (S.mods[MOD.id] ||= { nodes: {}, cards: {}, drills: {}, chal: {} });

let saveT = 0;
function save(silent) {
  S.updated = Date.now();
  clearTimeout(saveT);
  saveT = setTimeout(() => Vault.set('state', S).catch(() => {}), 120);
  topbar();
  if (!silent) emit('save');
}
function dayRec() { return (S.days[today()] ||= { n: 0, cards: 0, drills: 0, missions: 0 }); }
function bump(kind) {
  const d = dayRec();
  d.n++;
  if (kind === 'card') d.cards = (d.cards || 0) + 1;
  if (kind === 'drill') d.drills = (d.drills || 0) + 1;
  if (kind === 'mission') d.missions = (d.missions || 0) + 1;
  checkContract();
}
function checkContract() {
  const d = dayRec(), c = S.contract || {};
  const done = (d.cards || 0) >= (c.cards || 0) && (d.drills || 0) >= (c.drills || 0) && (d.missions || 0) >= (c.missions || 0);
  if (done && !S.contractPaid[today()] && ((c.cards || 0) + (c.drills || 0) + (c.missions || 0)) > 0) {
    S.contractPaid[today()] = 1;
    setTimeout(() => addXP(50, 'CONTRACT COMPLETE'), 900);
  }
}
function addXP(n, msg, bad) {
  const before = rankOf(S.xp)[1];
  S.xp = Math.max(0, S.xp + n);
  const after = rankOf(S.xp)[1];
  if (msg) toast(msg + (n ? ` ${n > 0 ? '+' : ''}${n} XP` : ''), bad);
  if (after !== before && n > 0) setTimeout(() => toast('RANK UP // ' + after), 1600);
}
function rankOf(xp) { let r = RANKS[0], next = null; for (let i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) { r = RANKS[i]; next = RANKS[i + 1] || null; } } return [r[0], r[1], next]; }

// ============ UI chrome ============
let toastT = 0;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}
function topbar() {
  const [base, name, next] = rankOf(S.xp);
  $('#rankName').textContent = name;
  $('#xpTxt').textContent = S.xp + ' XP';
  $('#xpBar').style.width = next ? Math.min(100, (S.xp - base) / (next[0] - base) * 100) + '%' : '100%';
  const chip = $('#examChip');
  const ex = MOD && S.exams && S.exams[MOD.id];
  if (ex) {
    const days = Math.ceil((new Date(ex + 'T09:00') - new Date()) / DAY);
    chip.hidden = false;
    chip.textContent = days > 0 ? `${MOD.code} exam in ${days}d` : days === 0 ? `${MOD.code} exam TODAY` : `${MOD.code} exam done`;
    chip.className = 'pill' + (days <= 7 && days >= 0 ? ' red' : '');
  } else chip.hidden = true;
}

// boot sequence
(() => {
  const boot = $('#boot');
  let seen = false; try { seen = sessionStorage.getItem('lw-boot') === '1'; } catch (e) {}
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { boot.remove(); return; }
  const lines = [
    '> establishing secure uplink ........ <span class="g">OK</span>',
    '> loading operator profile: HADES ... <span class="g">OK</span>',
    '> mounting vault .................... <span class="g">OK</span>',
    '> forge online · burner synced',
    '> ask-ai relay on standby',
    '<span class="g">> access granted. welcome back, Sir.</span>'
  ];
  let i = 0; const log = $('#bootLog');
  const tick = setInterval(() => { log.innerHTML += lines[i] + '\n'; if (++i >= lines.length) { clearInterval(tick); setTimeout(close, 650); } }, 300);
  function close() { clearInterval(tick); boot.style.transition = 'opacity .35s'; boot.style.opacity = 0; setTimeout(() => boot.remove(), 360); try { sessionStorage.setItem('lw-boot', '1'); } catch (e) {} }
  boot.addEventListener('click', close);
})();

// tabs + hash routing
const VIEWS = ['intel', 'burner', 'blackbook', 'terminal', 'log', 'forge', 'rig'];
let VIEW = 'intel';
const viewHooks = {};
function go(v) {
  if (!VIEWS.includes(v)) v = 'intel';
  VIEW = v;
  $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.v === v));
  $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  if (viewHooks[v]) viewHooks[v]();
  if (!MOD) return;
  if (v === 'blackbook' && dEd) setTimeout(() => dEd.refresh(), 30);
  if (v === 'terminal' && tEd) setTimeout(() => tEd.refresh(), 30);
  if (v === 'log') renderLog();
  if (v === 'burner') renderBurner();
}
$$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.v)));
addEventListener('hashchange', () => { if (!location.hash.startsWith('#link-')) go(location.hash.slice(1)); });

// ============ code rendering ============
const CM_MODES = { php: 'application/x-httpd-php', sql: 'text/x-sql', python: 'text/x-python', java: 'text/x-java', csharp: 'text/x-csharp', javascript: 'text/javascript', js: 'text/javascript', html: 'text/html', css: 'text/css', c: 'text/x-csrc', cpp: 'text/x-c++src' };
function modeFor(lang, code) {
  lang = (lang || '').toLowerCase();
  if (lang === 'php') return /<\?php|^\s*</.test(code || '') ? 'application/x-httpd-php' : 'text/x-php';
  return CM_MODES[lang] || 'text/plain';
}
function paint(el, code, lang) {
  el.textContent = '';
  try { CodeMirror.runMode(code, modeFor(lang, code), el); } catch (e) { el.textContent = code; }
}

// ============ INTEL ============
let NODE = null, CODES = [];
const renderer = new marked.Renderer();
renderer.html = h => esc(typeof h === 'string' ? h : (h && h.text) || '');
renderer.table = (header, body) => `<div class="tw"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
renderer.code = (code, lang) => {
  const i = CODES.push({ code, lang: (lang || '').trim() }) - 1;
  const L = CODES[i].lang;
  const runnable = RUNTIMES[L];
  return `<div class="cb"><div class="bar"><span>${esc(L || 'code')}</span>` +
    `<button class="btn sm" data-copy="${i}">Copy</button>` +
    (runnable ? `<button class="btn sm" data-term="${i}">Open in Terminal</button>` : '') +
    `<button class="btn sm" data-drill="${i}">Drill blind</button></div><pre class="cm-s-lw" data-i="${i}"></pre></div>`;
};
marked.use({ renderer, gfm: true });

function nodeState(id) { return M().nodes[id] || {}; }
function renderNodes() {
  const q = ($('#nSearch').value || '').toLowerCase();
  $('#nodes').innerHTML = MOD.nodes.filter(n => !q || (n.name + ' ' + n.md).toLowerCase().includes(q)).map(n => {
    const st = nodeState(n.id);
    return `<button class="node${NODE === n.id ? ' on' : ''}" data-node="${esc(n.id)}"><span class="c">${esc(n.code)}</span><span class="n">${esc(n.name)}</span><span class="s ${st.hacked ? 'hacked' : st.read ? 'read' : ''}"></span></button>`;
  }).join('') || '<div class="empty">No intel here yet.</div>';
}
function openNode(id) {
  if (!MOD.nodes.length) { $('#nodeCard').innerHTML = '<div class="empty">This module has no intel yet. Add some in the Forge.</div>'; renderNodes(); return; }
  const n = MOD.nodes.find(x => x.id === id) || MOD.nodes[0];
  NODE = n.id;
  const st = (M().nodes[n.id] ||= {});
  if (!st.read) { st.read = 1; addXP(10, 'Intel acquired'); bump('read'); save(); }
  CODES = [];
  const body = marked.parse(n.md || '');
  const cardCount = MOD.cards.filter(c => c.node === n.id).length;
  $('#nodeCard').innerHTML =
    `<div class="chead"><div><div class="code">${esc(n.code)}</div><h1>${esc(n.name)}</h1></div>` +
    `<div class="row"><button class="btn${st.hacked ? ' go' : ''}" id="hackBtn">${st.hacked ? '✓ Node hacked' : 'Mark node hacked'}</button>` +
    (cardCount ? `<button class="btn" id="burnBtn">Burn ${cardCount} cards</button>` : '') +
    `<button class="btn" id="askNode">Ask AI</button></div></div><div class="md">${body}</div>`;
  $$('#nodeCard pre[data-i]').forEach(p => { const c = CODES[+p.dataset.i]; paint(p, c.code, c.lang); });
  $$('#nodeCard .md input[type=checkbox]').forEach(c => c.disabled = true);
  $('#nodeCard').scrollTop = 0;
  renderNodes();
}
$('#nodes').addEventListener('click', e => { const b = e.target.closest('[data-node]'); if (b) openNode(b.dataset.node); });
$('#nSearch').addEventListener('input', renderNodes);
$('#nodeCard').addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'hackBtn') {
    const st = M().nodes[NODE];
    st.hacked = !st.hacked;
    if (st.hacked && !st.hackedOnce) { st.hackedOnce = 1; addXP(25, 'NODE HACKED'); bump('hack'); } else toast(st.hacked ? 'Node hacked' : 'Node unmarked');
    save(); openNode(NODE);
  } else if (t.id === 'burnBtn') { cardFilter = NODE; $('#cardFilter').value = NODE; go('burner'); }
  else if (t.id === 'askNode') openHandler('Summarise the key exam points of this node, then give me one likely exam question.');
  else if (t.dataset.copy) { copyText(CODES[+t.dataset.copy].code, 'Copied to clipboard'); }
  else if (t.dataset.term) { const c = CODES[+t.dataset.term]; openScratch(c.code, c.lang); go('terminal'); }
  else if (t.dataset.drill) {
    const c = CODES[+t.dataset.drill];
    const d = MOD.drills.find(x => x.code.trim() === c.code.trim());
    if (d) openDrill(d.id); else openDrill(null, { id: 'adhoc', node: NODE, title: 'Ad-hoc drill', lang: c.lang || MOD.lang, code: c.code });
    go('blackbook');
  }
});
async function copyText(text, msg) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {}
  if (!ok) { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); }
  toast(ok ? msg : 'Copy blocked here', !ok);
  return ok;
}

// ============ BURNER ============
let cardFilter = 'due', curCard = null, flipped = false;
function cardPool() {
  const now = Date.now(), cs = M().cards;
  let pool = MOD.cards;
  if (cardFilter !== 'due' && cardFilter !== 'all') pool = pool.filter(c => c.node === cardFilter);
  if (cardFilter === 'due') pool = pool.filter(c => !cs[c.id] || cs[c.id].d <= now);
  return pool;
}
function pickCard() {
  const cs = M().cards; let pool = cardPool();
  if (curCard && pool.length > 1) pool = pool.filter(c => c.id !== curCard.id);
  if (!pool.length) return null;
  pool = [...pool].sort((a, b) => ((cs[a.id] || {}).d || 0) - ((cs[b.id] || {}).d || 0));
  const top = pool.slice(0, Math.min(6, pool.length));
  return top[Math.floor(Math.random() * top.length)];
}
function renderBurner(next) {
  const cs = M().cards, now = Date.now();
  if (next || !curCard || (!cardPool().some(c => c.id === curCard.id) && cardFilter === 'due')) curCard = pickCard();
  flipped = false; $('#flip').classList.remove('show');
  const nodeName = id => (MOD.nodes.find(n => n.id === id) || {}).code || '';
  if (curCard) {
    $('#cQ').textContent = curCard.q; $('#cA').textContent = curCard.a;
    $('#cNode').textContent = $('#cNode2').textContent = nodeName(curCard.node) + ' · box ' + ((cs[curCard.id] || {}).b || 1);
    $('#cFail').disabled = $('#cPass').disabled = false;
  } else {
    $('#cQ').textContent = MOD.cards.length ? 'All clear. No cards due, Sir.' : 'No cards in this module yet.';
    $('#cA').textContent = MOD.cards.length ? 'Switch the filter to "All cards" to keep training.' : 'Forge some from your notes.';
    $('#cNode').textContent = $('#cNode2').textContent = '';
    $('#cFail').disabled = $('#cPass').disabled = true;
  }
  const due = MOD.cards.filter(c => !cs[c.id] || cs[c.id].d <= now).length;
  const boxes = [0, 0, 0, 0, 0]; MOD.cards.forEach(c => boxes[((cs[c.id] || {}).b || 1) - 1]++);
  const mx = Math.max(1, ...boxes);
  $('#boxes').innerHTML = boxes.map(b => `<i style="height:${Math.max(4, b / mx * 100)}%" title="${b} cards"></i>`).join('');
  $('#sTotal').textContent = MOD.cards.length; $('#sDue').textContent = due;
  $('#sMast').textContent = boxes[4]; $('#sToday').textContent = (S.days[today()] || {}).cards || 0;
  $('#dueTxt').textContent = cardPool().length + ' in this deck';
}
function flip() { if (!curCard) return; flipped = !flipped; $('#flip').classList.toggle('show', flipped); }
function verdict(pass) {
  if (!curCard) return;
  const cs = M().cards, st = cs[curCard.id] || { b: 1, d: 0 };
  st.b = pass ? Math.min(5, st.b + 1) : 1;
  st.d = Date.now() + BOX_WAIT[st.b];
  st.t = Date.now();
  cs[curCard.id] = st;
  bump('card');
  addXP(pass ? 5 : 1, pass ? 'ACCESS GRANTED' : 'TRACE DETECTED', !pass);
  save(); renderBurner(true);
}
$('#flip').addEventListener('click', flip);
$('#cFail').addEventListener('click', () => verdict(false));
$('#cPass').addEventListener('click', () => verdict(true));
$('#cardFilter').addEventListener('change', e => { cardFilter = e.target.value; curCard = null; renderBurner(true); });
addEventListener('keydown', e => {
  if (VIEW !== 'burner' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); flip(); }
  if (e.key === '1') verdict(false);
  if (e.key === '2') verdict(true);
});

// ============ BLACKBOOK ============
let dEd = null, DRILL = null, peekT = 0;
function cmOpts(mode, extra) {
  return Object.assign({ mode, theme: 'lw', lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, lineWrapping: false, viewportMargin: Infinity }, extra || {});
}
function renderDrills() {
  const best = M().drills;
  $('#drills').innerHTML = MOD.drills.map(d => {
    const b = best[d.id];
    const n = MOD.nodes.find(x => x.id === d.node);
    return `<button class="ditem${DRILL && DRILL.id === d.id ? ' on' : ''}" data-d="${esc(d.id)}"><span>${esc(d.title)}<small>${esc(n ? n.code : '')} · ${d.code.split('\n').length} lines</small></span>${b != null ? `<span class="pill${b >= 90 ? ' go' : ''}">${b}%</span>` : ''}</button>`;
  }).join('') || '<div class="empty">No drills in this module.</div>';
}
function openDrill(id, adhoc) {
  if (DRILL && dEd) { S.drafts[MOD.id + ':' + DRILL.id] = dEd.getValue(); save(true); }
  DRILL = adhoc || MOD.drills.find(d => d.id === id) || MOD.drills[0] || null;
  $('#dResult').innerHTML = '';
  if (!DRILL) { $('#dTitle').textContent = 'Blackbook'; $('#dSub').textContent = 'No drills yet. Forge a module with code or definitions to drill.'; $('#dTarget').textContent = ''; if (dEd) dEd.setValue(''); renderDrills(); return; }
  $('#dTitle').textContent = DRILL.title;
  $('#dSub').textContent = 'Write it from memory. Comments and spacing are ignored when comparing.';
  $('#dTarget').textContent = DRILL.code; $('#dLock').classList.remove('peek');
  const mode = modeFor(DRILL.lang, DRILL.code);
  if (!dEd) dEd = CodeMirror($('#dEd'), cmOpts(mode, { autoCloseBrackets: false }));
  dEd.setOption('mode', mode);
  dEd.setValue(S.drafts[MOD.id + ':' + DRILL.id] || '');
  setTimeout(() => dEd.refresh(), 20);
  renderDrills();
}
const stripLine = l => {
  let s = l.replace(/\s+\/\/.*$/, '').replace(/\s+--\s.*$/, '').replace(/\s+#\s.*$/, '');
  if (/^\s*(\/\/|--|#|\{\{--|\*|\/\*)/.test(s)) return '';
  return s.replace(/\s+/g, '');
};
function compare(target, attempt) {
  const T = target.split('\n').map(l => ({ raw: l, k: stripLine(l) })).filter(x => x.k);
  const U = attempt.split('\n').map(l => ({ raw: l, k: stripLine(l) })).filter(x => x.k);
  const n = T.length, m = U.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = T[i].k === U[j].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const rows = []; let i = 0, j = 0, extra = 0;
  while (i < n) {
    if (j < m && T[i].k === U[j].k) { rows.push({ ok: 1, t: T[i].raw }); i++; j++; }
    else if (j < m && L[i][j + 1] >= L[i + 1][j]) { extra++; j++; }
    else { rows.push({ ok: 0, t: T[i].raw, near: j < m ? U[j].raw : '' }); i++; }
  }
  extra += m - j;
  const hit = rows.filter(r => r.ok).length;
  return { rows, hit, total: n, extra, pct: n ? Math.round(hit / n * 100) : 0 };
}
$('#dCheck').addEventListener('click', () => {
  if (!DRILL) return;
  const r = compare(DRILL.code, dEd.getValue());
  const st = M().drills, prev = st[DRILL.id];
  let gain = 0;
  if (DRILL.id !== 'adhoc') {
    if (prev == null || r.pct > prev) { gain = Math.floor((r.pct - (prev || 0)) / 5); st[DRILL.id] = r.pct; }
    if (r.pct >= 90 && !(prev >= 90)) gain += 30;
  }
  bump('drill');
  if (gain) addXP(gain, r.pct >= 90 ? 'BLACKBOOK CRACKED' : 'Progress logged'); else toast(r.pct >= 90 ? 'Clean run' : 'Trace detected: keep drilling', r.pct < 90);
  S.drafts[MOD.id + ':' + DRILL.id] = dEd.getValue(); save();
  $('#dResult').innerHTML =
    `<div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="score" style="color:${r.pct >= 90 ? 'var(--go)' : r.pct >= 60 ? 'var(--amber)' : 'var(--red)'}">${r.pct}%</span> <span class="sub">${r.hit}/${r.total} lines matched${r.extra ? ` · ${r.extra} extra line${r.extra > 1 ? 's' : ''}` : ''}</span></div>` +
    `<div class="row"><button class="btn" id="dAsk">Ask AI to review</button><button class="btn" id="dClear">Clear &amp; retry</button></div></div>` +
    `<div class="diff">${r.rows.map((x, k) => `<div class="${x.ok ? 'ok' : 'bad'}" data-n="${k + 1}"><span>${esc(x.t)}${!x.ok && x.near ? `<em>you wrote: ${esc(x.near.trim())}</em>` : ''}</span></div>`).join('')}</div>`;
  renderDrills();
});
$('#dResult').addEventListener('click', e => {
  if (e.target.id === 'dClear') { dEd.setValue(''); $('#dResult').innerHTML = ''; dEd.focus(); }
  if (e.target.id === 'dAsk') openHandler('Compare my attempt with the target. List my mistakes as short bullets and the one thing to remember.');
});
$('#dPeek').addEventListener('click', () => {
  if (!DRILL) return;
  addXP(-5, 'Peek', true); save();
  $('#dLock').classList.add('peek');
  clearTimeout(peekT); peekT = setTimeout(() => $('#dLock').classList.remove('peek'), 5000);
});
$('#drills').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) openDrill(b.dataset.d); });

// ============ RUNTIMES (PHP via php-wasm, Python via Pyodide) ============
// save runtime files in the offline cache (in case the service worker wasn't active yet)
async function stash(paths) {
  try {
    const k = (await caches.keys()).find(x => x.startsWith('lonewolf-')); if (!k) return;
    const c = await caches.open(k);
    for (const p of paths) { if (!(await c.match(p))) await c.add(p); }
  } catch (e) {}
}
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
const RUNTIMES = {
  php: {
    label: 'PHP 8.2', size: '17 MB', inst: null, loading: null, out: '',
    load() {
      if (this.loading) return this.loading;
      this.loading = new Promise(async (res, rej) => {
        const to = setTimeout(() => rej(new Error('timeout')), 45000);
        try {
          const { PhpWeb } = await import('./libs/php/PhpWeb.mjs');
          const p = new PhpWeb();
          p.addEventListener('output', e => { this.out += e.detail.join(''); });
          p.addEventListener('error', e => { this.out += '\u0000' + e.detail.join(''); });
          p.addEventListener('ready', () => { clearTimeout(to); this.inst = p; res(p); stash(['libs/php/PhpWeb.mjs', 'libs/php/PhpBase.mjs', 'libs/php/php-web.mjs', 'libs/php/php-web.mjs.wasm']); });
        } catch (err) { clearTimeout(to); rej(err); }
      });
      this.loading.catch(() => { this.loading = null; });
      return this.loading;
    },
    async run(code) {
      const p = await this.load();
      this.out = '';
      await p.refresh();
      await p.run(code);
      p.flush();
      const stdout = this.out.replace(/\u0000[^\u0000]*/g, '');
      const errs = this.out.split('\u0000').slice(1).join('');
      return { stdout, errs };
    },
    fix: code => code.includes('<?php') ? code : '<?php\n' + code
  },
  python: {
    label: 'Python 3.12', size: '14 MB', inst: null, loading: null,
    load() {
      if (this.loading) return this.loading;
      this.loading = (async () => {
        if (!window.loadPyodide) await loadScript('libs/py/pyodide.js');
        this.inst = await loadPyodide({ indexURL: new URL('libs/py/', location.href).href });
        stash(['libs/py/pyodide.js', 'libs/py/pyodide.asm.js', 'libs/py/pyodide.asm.wasm', 'libs/py/python_stdlib.zip', 'libs/py/pyodide-lock.json']);
        return this.inst;
      })();
      this.loading.catch(() => { this.loading = null; });
      return this.loading;
    },
    async run(code) {
      const py = await this.load();
      let out = '', errs = '';
      py.setStdout({ batched: s => { out += s + '\n'; } });
      py.setStderr({ batched: s => { errs += s + '\n'; } });
      try { await py.runPythonAsync(code); }
      catch (e) { errs += String(e.message || e).split('\n').slice(-3).join('\n'); }
      return { stdout: out, errs };
    },
    fix: code => code
  }
};
RUNTIMES.py = RUNTIMES.python;

// ============ TERMINAL ============
let tEd = null, CH = null, scratchLang = 'php';
const chLang = c => (c && (c.lang || (c.id === 'scratch' ? scratchLang : MOD.lang))) || 'none';
function renderChals() {
  const done = M().chal;
  $('#chals').innerHTML = `<button class="ditem${CH && CH.id === 'scratch' ? ' on' : ''}" data-c="scratch"><span>Scratchpad<small>free mode</small></span></button>` +
    MOD.challenges.map(c => {
      const n = MOD.nodes.find(x => x.id === c.node);
      return `<button class="ditem${CH && CH.id === c.id ? ' on' : ''}" data-c="${esc(c.id)}"><span>${esc(c.title)}<small>${esc(n ? n.code : '')}</small></span>${done[c.id] ? '<span class="pill go">✓</span>' : ''}</button>`;
    }).join('');
}
function ensureEditor() {
  if (!tEd) {
    tEd = CodeMirror($('#tEd'), cmOpts('application/x-httpd-php', { autoCloseBrackets: true, extraKeys: { 'Ctrl-Enter': run, 'Cmd-Enter': run } }));
    tEd.on('change', () => { if (CH && MOD) S.drafts['t:' + MOD.id + ':' + CH.id] = tEd.getValue(); });
  }
}
function runtimeNote(lang) {
  const rt = RUNTIMES[lang];
  return rt ? `Real ${rt.label} in your browser. First run downloads ${rt.size}, then it works offline.` : `No in-browser runtime for ${lang === 'none' ? 'this module' : lang}. Write it here, then run it in your IDE; use Solution and expected output to check.`;
}
function openChal(id) {
  ensureEditor();
  if (id === 'scratch' || !MOD.challenges.length) return openScratch(S.drafts['t:' + MOD.id + ':scratch'] || null);
  CH = MOD.challenges.find(c => c.id === id) || MOD.challenges[0];
  const lang = chLang(CH);
  $('#tTitle').textContent = CH.title;
  $('#tSub').textContent = M().chal[CH.id] ? 'Cleared. Run it again any time.' : runtimeNote(lang);
  $('#tTask').innerHTML = `<b>MISSION · ${esc((MOD.nodes.find(n => n.id === CH.node) || {}).code || '')} · ${esc(lang.toUpperCase())}</b>${esc(CH.task)}`;
  $('#tTask').style.display = '';
  tEd.setOption('mode', modeFor(lang, CH.starter || '<?php'));
  tEd.setValue(S.drafts['t:' + MOD.id + ':' + CH.id] || CH.starter || '');
  $('#tOut').innerHTML = '<span class="m">// Ctrl+Enter to run.</span>';
  $('#tSol').style.display = CH.solution ? '' : 'none'; $('#tReset').style.display = '';
  $('#tRun').disabled = false;
  setTimeout(() => tEd.refresh(), 20);
  renderChals();
}
function openScratch(code, lang) {
  ensureEditor();
  scratchLang = RUNTIMES[lang] ? lang : RUNTIMES[MOD.lang] ? MOD.lang : 'php';
  if (scratchLang === 'py') scratchLang = 'python';
  CH = { id: 'scratch' };
  $('#tTitle').textContent = 'Scratchpad';
  $('#tSub').innerHTML = `<select class="mod" id="tLang" aria-label="Language"><option value="php">PHP</option><option value="python">Python</option></select> ${esc(scratchLang === 'php' ? 'No MySQL, sessions or forms in the browser; use XAMPP for those.' : 'Standard library only.')}`;
  $('#tLang').value = scratchLang;
  $('#tTask').style.display = 'none';
  const def = scratchLang === 'php' ? '<?php\n// scratchpad: anything goes\necho "access granted";\n' : '# scratchpad: anything goes\nprint("access granted")\n';
  const src = code == null ? def : (scratchLang === 'php' ? RUNTIMES.php.fix(code) : code);
  tEd.setOption('mode', modeFor(scratchLang, src));
  tEd.setValue(src);
  $('#tSol').style.display = 'none'; $('#tReset').style.display = 'none';
  $('#tOut').innerHTML = '<span class="m">// Ctrl+Enter to run.</span>';
  $('#tRun').disabled = false;
  setTimeout(() => tEd.refresh(), 20);
  renderChals();
}
$('#tSub').addEventListener('change', e => { if (e.target.id === 'tLang') { scratchLang = e.target.value; openScratch(null, scratchLang); } });
const norm = s => String(s).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim();
async function run() {
  ensureEditor();
  const lang = chLang(CH), rt = RUNTIMES[lang];
  const out = $('#tOut');
  if (!rt) { out.innerHTML = `<span class="m">// ${esc(runtimeNote(lang))}</span>`; if (CH && CH.expect) { const ex = document.createElement('span'); ex.className = 'm'; ex.textContent = '\nexpected output:\n' + CH.expect; out.append(ex); } return; }
  const code = tEd.getValue();
  $('#tRun').disabled = true;
  try {
    if (!rt.inst) out.innerHTML = `<span class="m">// loading ${rt.label} runtime (${rt.size}, first run only)…</span>`;
    await rt.load();
    out.innerHTML = '<span class="m">// running…</span>';
    const { stdout, errs } = await rt.run(code);
    out.innerHTML = '';
    const pre = document.createElement('span'); pre.textContent = stdout || (errs ? '' : '(no output)'); out.append(pre);
    if (errs.trim()) { const e = document.createElement('span'); e.className = 'e'; e.textContent = '\n' + errs.trim(); out.append(e); }
    bump('run');
    if (CH && CH.id !== 'scratch') {
      let expect = CH.expect;
      if ((expect == null || expect === '') && CH.solution) { const r = await rt.run(CH.solution); expect = CH.expect = r.stdout; }
      if (expect != null && expect !== '') {
        const okRun = norm(stdout) === norm(expect);
        const v = document.createElement('div'); v.style.marginTop = '10px';
        if (okRun) {
          v.innerHTML = '<span class="p">> ACCESS GRANTED · output matches</span>';
          if (!M().chal[CH.id]) { M().chal[CH.id] = 1; bump('mission'); addXP(40, 'NODE BREACHED'); } else toast('Clean run');
        } else {
          v.innerHTML = '<span class="e">> TRACE DETECTED · output differs</span>\n<span class="m">expected:</span>\n';
          const ex = document.createElement('span'); ex.className = 'm'; ex.textContent = expect; v.append(ex);
        }
        out.append(v);
        renderChals();
      }
    }
    save();
  } catch (err) {
    out.innerHTML = `<span class="e">// ${esc(rt.label)} could not start here.</span>\n<span class="m">Connect once to download it, or run the code in your IDE.</span>`;
  }
  $('#tRun').disabled = false;
}
$('#tRun').addEventListener('click', run);
$('#tReset').addEventListener('click', () => { if (CH && CH.starter != null) { tEd.setValue(CH.starter); toast('Starter restored'); } });
$('#tSol').addEventListener('click', () => {
  if (!CH || !CH.solution) return;
  tEd.setValue(CH.solution); toast('Solution loaded. Study it, then rewrite it blind.');
});
$('#chals').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) openChal(b.dataset.c); });

// ============ BREACH LOG ============
function streak() {
  let n = 0; const d = new Date();
  if (!S.days[today()]) d.setDate(d.getDate() - 1);
  while (S.days[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderContract() {
  const d = S.days[today()] || {}, c = S.contract || {};
  const rows = [['Cards', d.cards || 0, c.cards || 0], ['Drills', d.drills || 0, c.drills || 0], ['Missions', d.missions || 0, c.missions || 0]].filter(r => r[2] > 0);
  $('#contract').innerHTML = rows.length ? rows.map(([k, v, t]) => `<div class="crow"><span>${k}</span><div class="meter"><i style="width:${Math.min(100, v / t * 100)}%"></i></div><span style="text-align:right">${Math.min(v, t)}/${t}</span></div>`).join('') +
    `<p class="hint2" style="margin-top:8px">${S.contractPaid[today()] ? '✓ Contract complete today. +50 XP paid.' : 'Complete all targets today for +50 XP. Change targets in Rig.'}</p>` : '<p class="hint2">No contract set. Add targets in Rig.</p>';
}
function renderLog() {
  const m = M(), cs = m.cards;
  const hacked = MOD.nodes.filter(n => (m.nodes[n.id] || {}).hacked).length;
  const mastered = MOD.cards.filter(c => (cs[c.id] || {}).b === 5).length;
  const cleared = MOD.challenges.filter(c => m.chal[c.id]).length;
  const drillsDone = MOD.drills.filter(d => (m.drills[d.id] || 0) >= 90).length;
  const [, rname, next] = rankOf(S.xp);
  $('#logSub').textContent = `${MOD.code} · ${rname}${next ? ` · ${next[0] - S.xp} XP to ${next[1]}` : ' · top of the ladder'}`;
  $('#bigStats').innerHTML = [
    ['XP', S.xp], ['Streak', streak() + 'd'], ['Nodes hacked', `${hacked}/${MOD.nodes.length}`],
    ['Cards mastered', `${mastered}/${MOD.cards.length}`], ['Drills ≥90%', `${drillsDone}/${MOD.drills.length}`], ['Missions', `${cleared}/${MOD.challenges.length}`]
  ].map(([k, v]) => `<div class="panel"><span>${k}</span><b>${esc(v)}</b></div>`).join('');
  $('#nodeGrid').innerHTML = `<table><thead><tr><th>Node</th><th>Status</th><th>Cards</th><th>Drill best</th><th>Missions</th></tr></thead><tbody>` +
    MOD.nodes.map(n => {
      const st = m.nodes[n.id] || {};
      const cards = MOD.cards.filter(c => c.node === n.id);
      const cm = cards.length ? Math.round(cards.reduce((a, c) => a + ((cs[c.id] || {}).b || 1) - 1, 0) / (cards.length * 4) * 100) : null;
      const ds = MOD.drills.filter(d => d.node === n.id).map(d => m.drills[d.id]).filter(x => x != null);
      const ch = MOD.challenges.filter(c => c.node === n.id);
      return `<tr><td><b style="font-weight:500">${esc(n.code)}</b> <span style="color:var(--dim)">${esc(n.name.split(':')[0])}</span></td>` +
        `<td>${st.hacked ? '<span class="pill go">hacked</span>' : st.read ? '<span class="pill">read</span>' : '<span class="pill" style="opacity:.5">dark</span>'}</td>` +
        `<td>${cm == null ? '—' : `<div class="meter" title="${cm}%"><i style="width:${cm}%"></i></div>`}</td>` +
        `<td>${ds.length ? Math.max(...ds) + '%' : '—'}</td><td>${ch.length ? ch.filter(c => m.chal[c.id]).length + '/' + ch.length : '—'}</td></tr>`;
    }).join('') + '</tbody></table>';
  const wolf = '<svg viewBox="0 0 200 200"><use href="#wolf"/></svg>';
  const dot = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  $('#ladder').innerHTML = RANKS.map((r, i) => {
    const got = S.xp >= r[0], now = rname === r[1];
    return `<div class="rung${got ? ' got' : ''}${now ? ' now' : ''}">${i === RANKS.length - 1 ? wolf : dot}<span>${r[1]}</span><span>${r[0]} XP</span></div>`;
  }).join('');
  const cells = []; const d = new Date(); d.setDate(d.getDate() - 27);
  const max = Math.max(1, ...Object.values(S.days).map(x => x.n || 0));
  for (let k = 0; k < 28; k++) {
    const key = d.toISOString().slice(0, 10), v = (S.days[key] || {}).n || 0;
    cells.push(`<i title="${key}: ${v} actions" style="${v ? `background:color-mix(in srgb,var(--go) ${25 + v / max * 75}%,var(--line))` : ''}"></i>`);
    d.setDate(d.getDate() + 1);
  }
  $('#heat').innerHTML = cells.join('');
  renderContract();
}
let wipeArm = 0;
$('#wipe').addEventListener('click', e => {
  if (!wipeArm) { wipeArm = 1; e.target.textContent = 'Click again to confirm wipe'; setTimeout(() => { wipeArm = 0; e.target.textContent = 'Wipe module progress'; }, 3500); return; }
  S.mods[MOD.id] = { nodes: {}, cards: {}, drills: {}, chal: {} }; wipeArm = 0;
  e.target.textContent = 'Wipe module progress'; save(); renderAll(); toast('Trail wiped');
});

// ============ ASK AI ============
const AIS = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com/' }
];
function context() {
  if (!MOD) return '';
  if (VIEW === 'blackbook' && DRILL) return `I'm drilling "${DRILL.title}" from memory.\nTARGET:\n${DRILL.code}\n\nMY ATTEMPT:\n${dEd ? dEd.getValue() : ''}`;
  if (VIEW === 'terminal' && CH) return `I'm in my ${chLang(CH)} terminal. ${CH.task ? 'MISSION: ' + CH.task + '\nEXPECTED OUTPUT:\n' + (CH.expect || '') : 'Scratchpad.'}\nMY CODE:\n${tEd ? tEd.getValue() : ''}\nLAST OUTPUT:\n${$('#tOut').textContent.slice(0, 1500)}`;
  if (VIEW === 'burner' && curCard) return `Flashcard. Q: ${curCard.q}\nA: ${curCard.a}`;
  const n = MOD.nodes.find(x => x.id === NODE);
  return n ? `I'm studying ${n.code}: ${n.name}.\nMY NOTES:\n${(n.md || '').slice(0, 6000)}` : '';
}
function buildPrompt(q) {
  return `You are my exam coach for ${MOD ? MOD.name + ' (' + MOD.code + ')' : 'my university module'} at Université des Mascareignes. Call me "Sir". Be concise: short bullets, small code snippets only when useful, under 200 words unless I ask for more.\n\nMY QUESTION: ${q}\n\n--- CONTEXT ---\n${context()}`;
}
const getAI = () => { try { return localStorage.getItem('lw-ai') || 'claude'; } catch (e) { return 'claude'; } };
const setAI = v => { try { localStorage.setItem('lw-ai', v); } catch (e) {} };
const aiOptions = (withGem) => AIS.map(a => `<option value="${a.id}">${a.name}</option>`).join('') + (withGem ? '<option value="gemini-app">Gemini in-app ✦</option>' : '');
function refreshAsk() {
  const hasKey = !!(window.LW && LW.gemini && LW.gemini.key());
  const sel = $('#aiSel'), cur = getAI();
  sel.innerHTML = aiOptions(hasKey);
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'claude';
  $('#ctxPrev').textContent = context() || '(nothing open yet)';
  $('#aiGo').textContent = sel.value === 'gemini-app' ? 'Ask in-app' : 'Copy & open ' + (AIS.find(a => a.id === sel.value) || AIS[0]).name;
}
$('#aiSel').addEventListener('change', e => { setAI(e.target.value); refreshAsk(); });
function bubble(text, who) {
  const d = document.createElement('div'); d.className = 'msg ' + (who === 'u' ? 'u' : 'h');
  if (who !== 'u') { const b = document.createElement('b'); b.className = 'who'; b.textContent = 'GEMINI'; d.append(b); }
  const s = document.createElement('span'); s.textContent = text; d.append(s);
  $('#msgs').append(d); $('#msgs').scrollTop = 1e9; return s;
}
async function ask(q) {
  q = (q || '').trim() || 'Explain this clearly and give me one likely exam question.';
  const choice = $('#aiSel').value;
  if (choice === 'gemini-app') {
    $('#hIn').value = '';
    bubble(q, 'u');
    const out = bubble('Decrypting…');
    try { out.textContent = await LW.gemini.ask(buildPrompt(q)); }
    catch (e) { out.textContent = 'Gemini error: ' + (e.message || e) + '. Check the key in Rig, or that you are online.'; }
    bump('ask'); save(); return;
  }
  const ai = AIS.find(a => a.id === choice) || AIS[0];
  const ok = await copyText(buildPrompt(q), `Copied. Paste into ${ai.name} with Ctrl+V`);
  window.open(ai.url, '_blank', 'noopener');
  if (!ok) toast('Copy failed: select the context box and copy it', true);
  bump('ask'); save();
}
function openHandler(prefill) {
  $('#hand').classList.add('on');
  refreshAsk();
  if (prefill) $('#hIn').value = prefill;
  setTimeout(() => $('#hIn').focus(), 300);
}
const QUICK = ['Explain like I\'m 10', 'Quiz me: 3 questions', 'Exam answer for this', 'What traps lose marks here?'];
$('#quick').innerHTML = QUICK.map(q => `<button class="btn sm" data-q="${esc(q)}">${esc(q)}</button>`).join('');
$('#quick').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
$('#handBtn').addEventListener('click', () => $('#hand').classList.contains('on') ? $('#hand').classList.remove('on') : openHandler());
$('#handX').addEventListener('click', () => $('#hand').classList.remove('on'));
$('#hForm').addEventListener('submit', e => { e.preventDefault(); ask($('#hIn').value); });
$('#hIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#hForm').requestSubmit(); } });

// ============ modules ============
function normModule(m) {
  m.nodes = m.nodes || []; m.cards = m.cards || []; m.drills = m.drills || []; m.challenges = m.challenges || [];
  m.lang = (m.lang || 'none').toLowerCase();
  return m;
}
let BUILTIN = [];
function registry() {
  const list = BUILTIN.filter(b => !VAULT[b.id]).map(b => ({ id: b.id, code: b.code, name: b.name, src: 'built-in' }));
  Object.values(VAULT).forEach(m => list.push({ id: m.id, code: m.code, name: m.name, src: 'vault' }));
  return list.sort((a, b) => a.code.localeCompare(b.code));
}
function fillModSel() {
  MODS = registry();
  const cur = MOD ? MOD.id : null;
  $('#modSel').innerHTML = MODS.map(m => `<option value="${esc(m.id)}">${esc(m.code)}</option>`).join('');
  if (cur && MODS.some(m => m.id === cur)) $('#modSel').value = cur;
}
async function getModule(id) {
  if (VAULT[id]) return normModule(JSON.parse(JSON.stringify(VAULT[id])));
  const b = BUILTIN.find(x => x.id === id);
  if (!b) return null;
  return normModule(await (await fetch(b.file)).json());
}
function renderAll() {
  topbar();
  $('#cardFilter').innerHTML = `<option value="due">Due now</option><option value="all">All cards</option>` +
    MOD.nodes.filter(n => MOD.cards.some(c => c.node === n.id)).map(n => `<option value="${esc(n.id)}">${esc(n.code)} · ${esc(n.name.split(':')[0])}</option>`).join('');
  if (![...$('#cardFilter').options].some(o => o.value === cardFilter)) cardFilter = 'due';
  $('#cardFilter').value = cardFilter;
  openNode(NODE || (MOD.nodes[0] || {}).id);
  renderBurner(true);
  openDrill(DRILL && DRILL.id !== 'adhoc' ? DRILL.id : (MOD.drills[0] || {}).id);
  openChal(CH && CH.id !== 'scratch' ? CH.id : (MOD.challenges[0] || {}).id || 'scratch');
  if (VIEW === 'log') renderLog();
  emit('module', MOD);
}
async function loadModule(id) {
  const entry = MODS.find(m => m.id === id) || MODS[0];
  if (!entry) return;
  MOD = await getModule(entry.id);
  NODE = null; DRILL = null; CH = null; curCard = null; cardFilter = 'due';
  try { localStorage.setItem('lw-mod', MOD.id); } catch (e) {}
  $('#modSel').value = MOD.id;
  renderAll();
}
$('#modSel').addEventListener('change', e => loadModule(e.target.value));

// ============ public API for forge.js / rig.js ============
window.LW = {
  version: APP_VERSION,
  esc, toast, copyText, addXP, save, go,
  get S() { return S; },
  get MOD() { return MOD; },
  get VAULT() { return VAULT; },
  AIS, aiOptions, getAI,
  RUNTIMES,
  modules: () => registry(),
  getModule,
  on: (k, f) => listeners[k].push(f),
  onView: (v, f) => { viewHooks[v] = f; },
  async putModule(mod) {
    mod = normModule(mod); mod.updated = Date.now(); if (S.deletedMods) delete S.deletedMods[mod.id];
    VAULT[mod.id] = mod;
    await Vault.set('vault', VAULT);
    fillModSel(); await loadModule(mod.id);
    save();
  },
  async deleteModule(id) {
    delete VAULT[id]; delete S.mods[id]; (S.deletedMods ||= {})[id] = Date.now();
    await Vault.set('vault', VAULT); save();
    fillModSel(); await loadModule(($('#modSel').value) || (MODS[0] || {}).id);
  },
  // replace everything (restore / sync): keeps the current view
  async replaceAll(state, vault, silent) {
    S = Object.assign(blank(), state || {});
    VAULT = vault || {};
    await Vault.set('state', S); await Vault.set('vault', VAULT);
    fillModSel();
    const keep = MOD && MODS.some(m => m.id === MOD.id) ? MOD.id : (MODS[0] || {}).id;
    await loadModule(keep);
    if (!silent) emit('save');
  },
  async wipeAll() { await Vault.del('state'); await Vault.del('vault'); try { localStorage.removeItem('lonewolf-v1'); } catch (e) {} location.reload(); },
  refreshAsk,
  renderLog: () => MOD && renderLog(),
  topbar
};

// ============ start ============
(async () => {
  topbar();
  try {
    const st = await Vault.get('state');
    if (st) S = Object.assign(blank(), st);
    else {
      // migrate v1 (localStorage) progress if present
      try { const raw = localStorage.getItem('lonewolf-v1'); if (raw) { S = Object.assign(blank(), JSON.parse(raw)); await Vault.set('state', S); } } catch (e) {}
    }
    VAULT = (await Vault.get('vault')) || {};
  } catch (e) { toast('Vault unavailable: progress will not persist', true); }
  try { BUILTIN = await (await fetch('modules/index.json')).json(); } catch (e) { BUILTIN = []; }
  fillModSel();
  let last = null; try { last = localStorage.getItem('lw-mod'); } catch (e) {}
  if (last && MODS.some(m => m.id === last)) $('#modSel').value = last;
  if (MODS.length) await loadModule($('#modSel').value);
  else $('#nodeCard').innerHTML = '<div class="empty">No modules yet. Open the Forge to build your first one.</div>';
  ready = true;
  if (!location.hash.startsWith('#link-')) go(location.hash.slice(1) || 'intel');
  emit('ready');
})();
}
