// LONEWOLF OS Forge: load packs, auto-parse notes, copy AI prompts, preview, deploy.
{
const $ = s => document.querySelector(s);
const esc = s => LW.esc(s);
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
const LANGS = ['none', 'php', 'python', 'java', 'csharp', 'sql', 'javascript'];
let PENDING = null; // validated pack waiting for Deploy

// ---------- pack format ----------
const SPEC = `LWPACK FORMAT (JSON, version 1)
{
  "format": "lwpack",
  "version": 1,
  "module": { "id": "lowercase-slug", "code": "SHORT CODE", "name": "Full module name", "lang": "php|python|java|csharp|sql|javascript|none" },
  "replace": false,
  "nodes": [ { "id": "op-01", "code": "OP-01", "name": "Topic title", "md": "Markdown notes" } ],
  "cards": [ { "id": "k1", "node": "op-01", "q": "Question", "a": "Answer" } ],
  "drills": [ { "id": "op-01-d1", "node": "op-01", "title": "What to write", "lang": "php", "code": "code to memorise" } ],
  "challenges": [ { "id": "c1", "node": "op-01", "title": "Short title", "lang": "php", "task": "What to build", "starter": "starter code", "solution": "full solution", "expect": "exact output of the solution" } ]
}`;
const RULES = `RULES
- Output ONLY valid JSON for one lwpack (no commentary). If you can attach files, also attach it as <module-id>.lwpack.json.
- Items are matched by "id": reuse an existing id to UPDATE that item, use a new id to ADD. Never delete; "replace" stays false.
- One node per lecture topic. Node "md" is exam-ready Markdown, written as a mission card with these bold labels: **Objective:**, **Intel** (key facts as bullets and small tables), **Exploit** (code in fenced blocks with a language tag, if the topic has code), **Trace risks** (common mistakes that cost marks), **Decrypt check** (2-3 self-test questions). Explain the lecturer's reasoning, not just facts. No emoji.
- Cards: 4-10 per node, short question, precise answer, mostly definitions, comparisons and "why" questions likely in the exam.
- Drills: the code blocks or definitions worth writing from memory (4+ lines each).
- Challenges: only if the language is php or python. Small programs that print text; "expect" must be the EXACT output of "solution" (no input, no files, no databases).
- Use plain ASCII quotes in code. Escape newlines inside JSON strings as \\n.`;

// ---------- validation ----------
function validate(raw) {
  const errors = [], warnings = [];
  let p = raw;
  if (typeof raw === 'string') {
    let txt = raw.trim();
    if (!txt.startsWith('{')) { const fence = txt.match(/```json\s*([\s\S]*?)```/i); if (fence) txt = fence[1]; }
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    if (a < 0 || b < a) return { errors: ['No JSON object found.'], warnings };
    try { p = JSON.parse(txt.slice(a, b + 1)); } catch (e) { return { errors: ['JSON is broken: ' + e.message + '. Ask the AI to resend valid JSON (it may have been cut off).'], warnings }; }
  }
  if (!p || typeof p !== 'object') return { errors: ['Not a pack.'], warnings };
  if (p.format === 'lonewolf-backup') return { errors: ['This is a backup file. Restore it from the Rig tab.'], warnings };
  if (p.format && p.format !== 'lwpack') warnings.push(`Unknown format "${p.format}", reading it as a pack.`);
  const m = p.module || {};
  const mod = {
    id: slug(m.id || m.code || m.name),
    code: String(m.code || m.id || '').toUpperCase().slice(0, 12),
    name: String(m.name || m.code || '').slice(0, 80),
    lang: LANGS.includes(String(m.lang || '').toLowerCase()) ? String(m.lang).toLowerCase() : 'none'
  };
  if (!mod.id) errors.push('module.id (or code) is missing.');
  if (!mod.name) errors.push('module.name is missing.');
  if (m.lang && !LANGS.includes(String(m.lang).toLowerCase())) warnings.push(`Language "${m.lang}" not supported; set to none.`);
  const seen = new Set();
  const uid = (id, pre, i) => { let v = slug(id) || `${pre}${i + 1}`; while (seen.has(v)) v += 'x'; seen.add(v); return v; };
  const nodes = (Array.isArray(p.nodes) ? p.nodes : []).map((n, i) => ({
    id: uid(n.id, 'n-', i), code: String(n.code || `${mod.code}-${String(i + 1).padStart(2, '0')}`).slice(0, 14),
    name: String(n.name || n.title || `Node ${i + 1}`).slice(0, 120), md: String(n.md || n.notes || '')
  })).filter(n => { if (!n.md.trim()) { warnings.push(`Node "${n.name}" has no notes, skipped.`); return false; } return true; });
  const nodeIds = new Set(nodes.map(n => n.id));
  const fixNode = (x, what) => { if (x.node && !nodeIds.has(x.node) && !(EXIST && EXIST.nodes.some(n => n.id === x.node))) { warnings.push(`${what} points to unknown node "${x.node}".`); } return x; };
  const cards = (Array.isArray(p.cards) ? p.cards : []).map((c, i) => fixNode({ id: uid(c.id, 'k', i), node: slug(c.node) || (nodes[0] || {}).id || '', q: String(c.q || c.question || '').trim(), a: String(c.a || c.answer || '').trim() }, 'A card')).filter(c => c.q && c.a);
  const drills = (Array.isArray(p.drills) ? p.drills : []).map((d, i) => fixNode({ id: uid(d.id, 'd', i), node: slug(d.node) || (nodes[0] || {}).id || '', title: String(d.title || 'Drill').slice(0, 70), lang: String(d.lang || mod.lang).toLowerCase(), code: String(d.code || '') }, 'A drill')).filter(d => d.code.trim().split('\n').length >= 2);
  const challenges = (Array.isArray(p.challenges) ? p.challenges : []).map((c, i) => fixNode({ id: uid(c.id, 'c', i), node: slug(c.node) || (nodes[0] || {}).id || '', title: String(c.title || 'Mission').slice(0, 60), lang: String(c.lang || mod.lang).toLowerCase(), task: String(c.task || ''), starter: String(c.starter || ''), solution: String(c.solution || ''), expect: c.expect == null ? '' : String(c.expect) }, 'A mission')).filter(c => c.task);
  if (!nodes.length && !cards.length && !drills.length && !challenges.length) errors.push('The pack is empty.');
  challenges.forEach(c => { if (!LW.RUNTIMES[c.lang]) warnings.push(`Mission "${c.title}" is ${c.lang}: no in-browser runtime, it will be a written mission.`); });
  return { errors, warnings, pack: { module: mod, replace: !!p.replace, nodes, cards, drills, challenges } };
}

// ---------- diff + merge ----------
let EXIST = null;
function mergeList(oldL, newL, replace) {
  if (replace) return newL.slice();
  const map = new Map(oldL.map(x => [x.id, x]));
  newL.forEach(x => map.set(x.id, Object.assign({}, map.get(x.id) || {}, x)));
  return [...map.values()];
}
function merged(pack, exist) {
  const base = exist || { nodes: [], cards: [], drills: [], challenges: [] };
  return {
    id: pack.module.id, code: pack.module.code, name: pack.module.name, lang: pack.module.lang,
    nodes: mergeList(base.nodes, pack.nodes, pack.replace),
    cards: mergeList(base.cards, pack.cards, pack.replace),
    drills: mergeList(base.drills, pack.drills, pack.replace),
    challenges: mergeList(base.challenges, pack.challenges, pack.replace)
  };
}
function diffCount(oldL, newL) {
  const ids = new Set((oldL || []).map(x => x.id));
  let add = 0, upd = 0; newL.forEach(x => ids.has(x.id) ? upd++ : add++);
  return { add, upd };
}

// ---------- preview ----------
async function preview(result, source) {
  const box = $('#fPreview');
  if (result.errors.length) {
    PENDING = null;
    box.innerHTML = `<h2>Preview</h2><p class="warn" style="color:var(--red)">✕ Pack rejected</p>${result.errors.map(e => `<p class="hint2">${esc(e)}</p>`).join('')}`;
    LW.toast('Pack rejected', true); return;
  }
  EXIST = await LW.getModule(result.pack.module.id);
  const fresh = validate(Object.assign({ format: 'lwpack' }, result.pack));
  fresh.warnings = (result.extra || []).concat(fresh.warnings);
  result = fresh;
  const p = result.pack;
  PENDING = p;
  const rows = [['Nodes', p.nodes, EXIST && EXIST.nodes], ['Cards', p.cards, EXIST && EXIST.cards], ['Drills', p.drills, EXIST && EXIST.drills], ['Missions', p.challenges, EXIST && EXIST.challenges]];
  box.innerHTML = `<h2>Preview <span class="pill ${EXIST ? '' : 'go'}">${EXIST ? 'UPDATE' : 'NEW MODULE'}</span></h2>
    <p class="hint2">${esc(source)} · <b style="color:var(--ink)">${esc(p.module.code)}</b> ${esc(p.module.name)} · ${esc(p.module.lang.toUpperCase())}${p.replace ? ' · <span class="warn">replace mode: old items are dropped</span>' : ''}</p>
    <div class="grid">${'<table><thead><tr><th></th><th>New</th><th>Updated</th><th>After deploy</th></tr></thead><tbody>' + rows.map(([k, l, old]) => { const d = diffCount(old, l); const total = p.replace ? l.length : (old ? old.length : 0) + d.add; return `<tr><td>${k}</td><td>+${d.add}</td><td>${d.upd}</td><td>${total}</td></tr>`; }).join('') + '</tbody></table>'}</div>
    ${result.warnings.length ? `<details><summary class="warn">${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}</summary>${result.warnings.slice(0, 40).map(w => `<p class="hint2">⚠ ${esc(w)}</p>`).join('')}</details>` : ''}
    <div class="plist">${p.nodes.map(n => `<div><span class="pill">${esc(n.code)}</span>${esc(n.name)}</div>`).join('')}</div>
    <div class="row"><button class="btn go" id="fDeploy">Deploy to vault</button><button class="btn" id="fDownload">Save pack file</button><button class="btn" id="fDiscard">Discard</button></div>
    ${EXIST ? '<p class="hint2">Your progress on this module is kept. Items with the same id are updated.</p>' : ''}`;
  LW.go('forge');
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#fPreview').addEventListener('click', async e => {
  if (e.target.id === 'fDiscard') { PENDING = null; $('#fPreview').innerHTML = '<h2>Preview</h2><p class="empty">Discarded.</p>'; }
  if (e.target.id === 'fDownload' && PENDING) download(`${PENDING.module.id}.lwpack.json`, toPack(merged(PENDING, null)));
  if (e.target.id === 'fDeploy' && PENDING) {
    const mod = merged(PENDING, EXIST);
    await LW.putModule(mod);
    window.SFX && SFX.play('deploy');
    LW.addXP(20, `${mod.code} DEPLOYED`);
    LW.save();
    PENDING = null;
    $('#fPreview').innerHTML = `<h2>Preview</h2><p class="hint2">✓ ${esc(mod.code)} deployed: ${mod.nodes.length} nodes, ${mod.cards.length} cards, ${mod.drills.length} drills, ${mod.challenges.length} missions. It is now in the module menu.</p>`;
    renderVault();
  }
});

// ---------- files ----------
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  LW.toast('Saved ' + name);
}
LW.download = download;
function toPack(mod) {
  return { format: 'lwpack', version: 1, module: { id: mod.id, code: mod.code, name: mod.name, lang: mod.lang }, replace: false, nodes: mod.nodes, cards: mod.cards, drills: mod.drills, challenges: mod.challenges };
}
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });
const readBuf = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(f); });
const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });

async function fileToNotes(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (ext === 'docx') {
    await loadScript('libs/doc/mammoth.browser.min.js');
    const r = await mammoth.convertToMarkdown({ arrayBuffer: await readBuf(f) });
    const md = r.value
      .replace(/<a id="[^"]*"><\/a>/g, '')
      .replace(/__(.+?)__/g, '**$1**')
      .replace(/\\([\\._()\-#*+!>`[\]{}|])/g, '$1')
      .replace(/[ \t]+$/gm, '');
    return { text: md, kind: 'docx' };
  }
  if (ext === 'pdf') {
    await loadScript('libs/doc/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/doc/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: await readBuf(f) }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let line = '';
      tc.items.forEach(it => { line += it.str; if (it.hasEOL) { text += line + '\n'; line = ''; } });
      text += line + '\n\n';
    }
    return { text, kind: 'pdf' };
  }
  return { text: await readText(f), kind: 'text' };
}

$('#fPackFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const txt = await readText(f);
  $('#fPackText').value = txt.length > 200000 ? '' : txt;
  preview(validate(txt), f.name);
  e.target.value = '';
});
$('#fPackCheck').addEventListener('click', () => {
  const t = $('#fPackText').value.trim();
  if (!t) return LW.toast('Paste a pack first', true);
  preview(validate(t), 'Pasted pack');
});

let NOTES = null;
$('#fNotesFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  $('#fNotesName').textContent = 'reading ' + f.name + '…';
  try {
    NOTES = await fileToNotes(f);
    $('#fNotesText').value = NOTES.text.slice(0, 150000);
    $('#fNotesName').textContent = `${f.name} · ${NOTES.text.length.toLocaleString()} characters`;
  } catch (err) { $('#fNotesName').textContent = 'Could not read that file (' + (err.message || err) + ')'; }
  e.target.value = '';
});

// ---------- target module fields ----------
function fillTarget() {
  const mods = LW.modules();
  const cur = $('#fTarget').value;
  $('#fTarget').innerHTML = '<option value="__new">New module</option>' + mods.map(m => `<option value="${esc(m.id)}">Update ${esc(m.code)} · ${esc(m.name)}</option>`).join('');
  if ([...$('#fTarget').options].some(o => o.value === cur)) $('#fTarget').value = cur;
}
$('#fTarget').addEventListener('change', async () => {
  const id = $('#fTarget').value;
  if (id === '__new') { $('#fCode').value = ''; $('#fName').value = ''; $('#fCode').disabled = false; return; }
  const m = await LW.getModule(id);
  $('#fCode').value = m.code; $('#fName').value = m.name; $('#fLang').value = m.lang; $('#fCode').disabled = true;
});
async function targetInfo() {
  const id = $('#fTarget').value;
  const code = ($('#fCode').value || '').trim().toUpperCase();
  const name = ($('#fName').value || '').trim();
  const lang = $('#fLang').value;
  if (id === '__new') {
    if (!code || !name) { LW.toast('Fill in Code and Module name first', true); return null; }
    return { mod: { id: slug(code), code, name, lang }, exist: null };
  }
  const exist = await LW.getModule(id);
  return { mod: { id: exist.id, code: exist.code, name: name || exist.name, lang }, exist };
}

// ---------- AI prompt ----------
function buildForgePrompt(t, notes) {
  const ex = t.exist;
  const existing = ex ? `\nTHIS IS AN UPDATE. Existing module "${ex.id}" already has:\n- nodes: ${ex.nodes.map(n => `${n.id} (${n.name})`).join('; ')}\n- ${ex.cards.length} cards (highest id ${ex.cards.map(c => c.id).slice(-1)[0] || 'none'}), ${ex.drills.length} drills, ${ex.challenges.length} missions.\nAdd new topics as new nodes; improve existing nodes by reusing their ids. Give new cards, drills and missions new ids that don't clash.` : '\nTHIS IS A NEW MODULE.';
  return `You are building a study pack for LONEWOLF OS, my personal revision app. Convert my lecture notes (attached or pasted below) into ONE lwpack JSON.\n\nMODULE: id "${t.mod.id}", code "${t.mod.code}", name "${t.mod.name}", language "${t.mod.lang}".${existing}\n\n${SPEC}\n\n${RULES}${notes ? `\n\n--- MY NOTES ---\n${notes}` : '\n\n(My notes are attached to this message.)'}`;
}
$('#fPrompt').addEventListener('click', async () => {
  const t = await targetInfo(); if (!t) return;
  const notes = ($('#fNotesText').value || '').trim();
  const prompt = buildForgePrompt(t, notes.length < 60000 ? notes : '');
  const ai = LW.AIS.find(a => a.id === $('#fAi').value) || LW.AIS[0];
  await LW.copyText(prompt, `Prompt copied. Paste into ${ai.name}${notes ? '' : ' and attach your notes'}`);
  window.open(ai.url, '_blank', 'noopener');
});

// ---------- offline auto-parse ----------
function looksLikeCode(l) { return /[;{}]\s*$/.test(l) || /^\s*(for|while|if|elif|else|def|class|try|except|with)\b.*:\s*$/.test(l) || /^\s*(<\?php|\$\w+\s*=|function |class |public |private |def |import |print\(|echo |for\s*\(|if\s*\(|return |SELECT |INSERT |CREATE TABLE)/i.test(l); }
function fenceLooseCode(text, lang) {
  const lines = text.split('\n'); const out = []; let buf = [];
  const flush = () => { if (buf.length >= 3) out.push('```' + (lang === 'none' ? '' : lang), ...buf, '```'); else out.push(...buf); buf = []; };
  let inFence = false;
  for (const l of lines) {
    if (/^\s*```/.test(l)) { flush(); inFence = !inFence; out.push(l); continue; }
    if (inFence) { out.push(l); continue; }
    if (looksLikeCode(l) || (buf.length && /^\s{2,}\S/.test(l))) buf.push(l); else { flush(); out.push(l); }
  }
  flush(); return out.join('\n');
}
function autoParse(text, mod, kind) {
  if (kind !== 'text') text = fenceLooseCode(text, mod.lang);
  text = text.replace(/\r/g, '');
  const lines = text.split('\n');
  // pick heading style
  const counts = [1, 2, 3].map(l => lines.filter(x => new RegExp('^#{' + l + '}\\s+\\S').test(x)).length);
  let lvl = counts.findIndex(c => c >= 2) + 1;
  let isHead;
  if (lvl > 0) isHead = l => new RegExp('^#{' + lvl + '}\\s+\\S').test(l);
  else {
    const numbered = l => /^\s*(\d+(\.\d+)?|[IVX]+)[.)]\s+[A-Z].{2,70}$/.test(l) && !/[.;:]$/.test(l.trim());
    const caps = l => /^[A-Z0-9][A-Z0-9 &:,'()\-/]{4,70}$/.test(l.trim()) && /[A-Z]{3}/.test(l);
    const n = lines.filter(numbered).length, c = lines.filter(caps).length;
    isHead = n >= 2 ? numbered : c >= 2 ? caps : null;
  }
  const chunks = [];
  if (isHead) {
    let cur = null; let inFence = false;
    lines.forEach(l => {
      if (/^\s*```/.test(l)) inFence = !inFence;
      if (!inFence && isHead(l)) { cur = { title: l.replace(/^#+\s*/, '').trim(), body: [] }; chunks.push(cur); }
      else if (cur) cur.body.push(l); else { (chunks[0] && !chunks[0].title) ? chunks[0].body.push(l) : chunks.unshift(cur = { title: '', body: [l] }); }
    });
  } else {
    for (let i = 0; i < lines.length; i += 60) chunks.push({ title: '', body: lines.slice(i, i + 60) });
  }
  const pack = { format: 'lwpack', module: mod, nodes: [], cards: [], drills: [], challenges: [] };
  chunks.filter(c => c.body.join('').trim().length > 30).forEach((c, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = 'n-' + num;
    const md = c.body.join('\n').trim();
    pack.nodes.push({ id, code: `${mod.code.slice(0, 6)}-${num}`, name: c.title || `Part ${i + 1}`, md });
    // drills from fenced code
    const re = /```(\w*)\n([\s\S]*?)```/g; let m, k = 0;
    while ((m = re.exec(md))) { if (m[2].trim().split('\n').length >= 3) pack.drills.push({ id: `${id}-d${++k}`, node: id, title: `${c.title || 'Part ' + (i + 1)} · code ${k}`, lang: m[1] || mod.lang, code: m[2].replace(/\s+$/, '') }); }
    // cards from definitions
    let n = 0;
    md.split('\n').forEach(l => {
      if (n >= 25 || /^\s*```/.test(l)) return;
      let mm = l.match(/^\s*(?:[-*+]\s*)?\*\*(.{2,60}?)\*\*\s*[:\-–—=]\s*(.{6,400})$/) || l.match(/^\s*(?:[-*+]\s*)?\*\*(.{2,60}?):\*\*\s*(.{6,400})$/) || l.match(/^\s*(?:[-*+]\s*)?([A-Z][\w ()/'.-]{1,50}?)\s*[:–—]\s+(.{12,400})$/);
      if (mm && !/https?$/.test(mm[1])) { pack.cards.push({ id: `${id}-k${++n}`, node: id, q: `${mm[1].replace(/[*_`]/g, '').trim()}?`, a: mm[2].replace(/\*\*/g, '').trim() }); return; }
      const row = l.match(/^\|([^|]+)\|([^|]+)\|/);
      if (row && !/^[\s|:-]+$/.test(l) && !/^\s*$/.test(row[1])) { const q = row[1].replace(/[*_`]/g, '').trim(), a = row[2].replace(/\*\*/g, '').trim(); if (q.length > 1 && a.length > 3 && !/^(term|function|keyword|part|name)$/i.test(q)) pack.cards.push({ id: `${id}-k${++n}`, node: id, q: `${q}?`, a }); }
    });
  });
  return pack;
}
$('#fParse').addEventListener('click', async () => {
  const t = await targetInfo(); if (!t) return;
  const text = ($('#fNotesText').value || '').trim();
  if (text.length < 40) return LW.toast('Add notes first (file or paste)', true);
  const pack = autoParse(text, t.mod, NOTES && $('#fNotesText').value.startsWith(NOTES.text.slice(0, 200)) ? NOTES.kind : 'text');
  if (t.exist) { // don't clobber existing node ids on update: prefix parsed ids
    const stamp = Date.now().toString(36).slice(-4);
    pack.nodes.forEach(n => { const old = n.id; n.id = `${old}-${stamp}`; pack.cards.forEach(c => { if (c.node === old) { c.node = n.id; c.id = `${c.id}-${stamp}`; } }); pack.drills.forEach(d => { if (d.node === old) { d.node = n.id; d.id = `${d.id}-${stamp}`; } }); });
  }
  const r = validate(pack);
  r.extra = ['Auto-parse is a quick offline draft. For exam-quality cards and missions, use the Forge prompt with an AI.'];
  preview(r, 'Auto-parsed notes');
});

// ---------- Gemini one-click ----------
$('#fGemini').addEventListener('click', async () => {
  const t = await targetInfo(); if (!t) return;
  const notes = ($('#fNotesText').value || '').trim();
  if (notes.length < 40) return LW.toast('Add notes first (file or paste)', true);
  const btn = $('#fGemini'); btn.disabled = true; btn.textContent = 'Forging with Gemini…';
  try {
    const txt = await LW.gemini.ask(buildForgePrompt(t, notes), true);
    preview(validate(txt), 'Gemini');
  } catch (e) { LW.toast('Gemini: ' + (e.message || e), true); }
  btn.disabled = false; btn.textContent = 'Forge with Gemini ✦';
});

// ---------- vault list ----------
let delArm = null;
function renderVault() {
  const mods = LW.modules();
  $('#fVault').innerHTML = mods.map(m => `<div class="vrow"><div><b style="font-weight:500">${esc(m.code)}</b> ${esc(m.name)}<small>${m.src === 'vault' ? (LW.VAULT[m.id] && LW.VAULT[m.id].updated ? 'forged · updated ' + new Date(LW.VAULT[m.id].updated).toLocaleDateString() : 'forged') : 'built-in'}</small></div>
    <div class="row"><button class="btn sm" data-open="${esc(m.id)}">Open</button><button class="btn sm" data-exp="${esc(m.id)}">Export</button>${m.src === 'vault' ? `<button class="btn sm red" data-del="${esc(m.id)}">${delArm === m.id ? 'Confirm' : 'Delete'}</button>` : ''}</div></div>`).join('') || '<p class="empty">Vault empty.</p>';
}
$('#fVault').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.open) { $('#modSel').value = b.dataset.open; $('#modSel').dispatchEvent(new Event('change')); LW.go('intel'); }
  if (b.dataset.exp) { const m = await LW.getModule(b.dataset.exp); download(`${m.id}.lwpack.json`, toPack(m)); }
  if (b.dataset.del) {
    if (delArm !== b.dataset.del) { delArm = b.dataset.del; renderVault(); setTimeout(() => { delArm = null; renderVault(); }, 3500); return; }
    delArm = null; await LW.deleteModule(b.dataset.del); LW.toast('Module deleted'); renderVault(); fillTarget();
  }
});

function refresh() {
  fillTarget(); renderVault();
  $('#fAi').innerHTML = LW.AIS.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  $('#fAi').value = LW.AIS.some(a => a.id === LW.getAI()) ? LW.getAI() : 'claude';
  $('#fGemini').hidden = !(LW.gemini && LW.gemini.key());
}
LW.onView('forge', refresh);
LW.on('ready', refresh);
LW.on('module', () => { fillTarget(); renderVault(); });
LW.forge = { validate, autoParse, SPEC };
}
