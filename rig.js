// LONEWOLF OS Rig: settings, Gemini (optional), Supabase sync (optional), backup/restore.
{
const $ = s => document.querySelector(s);
const esc = s => LW.esc(s);
const local = {
  get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
};
const clone = o => JSON.parse(JSON.stringify(o || {}));

// ================= Gemini (free tier key, stays on this device) =================
// The key is saved on this device AND in your private sync row, so every signed-in device gets it.
const cfg = () => (LW.S.cfg ||= {});
LW.gemini = {
  key: () => local.get('lw-gem-key') || cfg().gemKey || '',
  model: () => local.get('lw-gem-model') || cfg().gemModel || 'gemini-3.8-flash',
  async ask(prompt, json) {
    const key = this.key();
    if (!key) throw new Error('no API key set in Rig');
    if (!navigator.onLine) throw new Error('offline');
    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    if (json) body.generationConfig = { responseMimeType: 'application/json', maxOutputTokens: 32768 };
    // retry automatically when Google is busy (429 / 503 / "high demand")
    let r, data;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model())}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body)
      });
      data = await r.json().catch(() => ({}));
      const busy = r.status === 429 || r.status === 503 || /high demand|overloaded|try again/i.test((data.error && data.error.message) || '');
      if (r.ok || !busy || attempt === 2) break;
      await new Promise(res => setTimeout(res, [2500, 6000][attempt]));
    }
    if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
    const c = data.candidates && data.candidates[0];
    const text = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('') : '';
    if (!text) throw new Error('empty answer' + (c && c.finishReason ? ' (' + c.finishReason + ')' : ''));
    return text;
  }
};
$('#rgSave').addEventListener('click', () => {
  const key = $('#rgKey').value.trim(), model = $('#rgModel').value.trim();
  local.set('lw-gem-key', key); local.set('lw-gem-model', model);
  cfg().gemKey = key; cfg().gemModel = model;
  (LW.S.stamps ||= {}).cfg = Date.now();
  LW.save();
  $('#rgMsg').textContent = key ? 'Saved. Your other devices get it on their next sync.' : 'Key removed everywhere.';
  $('#fGemini').hidden = !LW.gemini.key();
  LW.refreshAsk();
});
$('#rgTest').addEventListener('click', async () => {
  $('#rgMsg').textContent = 'Testing…';
  try { const t = await LW.gemini.ask('Reply with exactly: ACCESS GRANTED'); $('#rgMsg').textContent = '✓ ' + t.trim().slice(0, 40); }
  catch (e) { $('#rgMsg').textContent = '✕ ' + (e.message || e); }
});

// ================= merging (used by sync and restore) =================
function mergeState(a, b) {
  const out = clone(a); b = b || {};
  // XP = earned − lost (both only grow), so deductions survive a sync
  const gain = x => x.xpGain != null ? x.xpGain : (x.xp || 0);
  out.xpGain = Math.max(gain(a || {}), gain(b));
  out.xpLoss = Math.max((a || {}).xpLoss || 0, b.xpLoss || 0);
  out.xp = Math.max(0, out.xpGain - out.xpLoss);
  out.days = out.days || {};
  Object.entries(b.days || {}).forEach(([k, d]) => {
    const o = out.days[k] || (out.days[k] = {});
    ['n', 'cards', 'drills', 'missions'].forEach(f => { o[f] = Math.max(o[f] || 0, d[f] || 0); });
  });
  out.contractPaid = Object.assign({}, b.contractPaid || {}, out.contractPaid || {});
  out.deletedMods = out.deletedMods || {};
  Object.entries(b.deletedMods || {}).forEach(([k, t]) => { out.deletedMods[k] = Math.max(out.deletedMods[k] || 0, t); });
  out.mods = out.mods || {};
  Object.entries(b.mods || {}).forEach(([id, bm]) => {
    const m = out.mods[id] || (out.mods[id] = { nodes: {}, cards: {}, drills: {}, chal: {} });
    m.nodes = m.nodes || {}; m.cards = m.cards || {}; m.drills = m.drills || {}; m.chal = m.chal || {};
    Object.entries(bm.nodes || {}).forEach(([k, v]) => {
      const o = m.nodes[k];
      if (!o) { m.nodes[k] = Object.assign({}, v); return; }
      const once = o.hackedOnce || v.hackedOnce ? 1 : 0;
      if (v.t || o.t) { if ((v.t || 0) > (o.t || 0)) m.nodes[k] = Object.assign({}, v); }   // newest edit wins (so un-read / un-hack sync)
      else ['read', 'hacked'].forEach(f => { if (v[f]) o[f] = 1; });
      if (once) m.nodes[k].hackedOnce = 1;
    });
    Object.entries(bm.cards || {}).forEach(([k, v]) => { const o = m.cards[k]; if (!o || (v.t || 0) > (o.t || 0)) m.cards[k] = v; });
    Object.entries(bm.drills || {}).forEach(([k, v]) => { m.drills[k] = Math.max(m.drills[k] || 0, v || 0); });
    Object.entries(bm.chal || {}).forEach(([k, v]) => { if (v) m.chal[k] = 1; });
  });
  out.drafts = Object.assign({}, b.drafts || {}, out.drafts || {});
  // settings: each one carries its own edit time, newest edit wins
  const ta = a.stamps || {}, tb = b.stamps || {};
  out.stamps = Object.assign({}, ta);
  out.exams = clone(a.exams);
  new Set([...Object.keys(a.exams || {}), ...Object.keys(b.exams || {})]).forEach(id => {
    const ka = ta['exam:' + id] || 0, kb = tb['exam:' + id] || 0;
    if (kb > ka || (kb === ka && !(a.exams || {})[id] && (b.exams || {})[id])) {
      if ((b.exams || {})[id]) out.exams[id] = b.exams[id]; else delete out.exams[id];
      out.stamps['exam:' + id] = kb;
    }
  });
  if ((tb.contract || 0) > (ta.contract || 0)) { out.contract = clone(b.contract); out.stamps.contract = tb.contract; }
  if ((tb.cfg || 0) > (ta.cfg || 0)) { out.cfg = clone(b.cfg); out.stamps.cfg = tb.cfg; }
  else { out.cfg = Object.assign({}, b.cfg || {}, a.cfg || {}); }
  out.updated = Math.max(a.updated || 0, b.updated || 0);
  if (window.LW && LW.mergeOps) LW.mergeOps(out, a, b); // Network update data (tracks, tasks, journal...)
  return out;
}
function mergeVault(a, b, state) {
  const out = clone(a);
  Object.entries(b || {}).forEach(([id, m]) => { if (!out[id] || (m.updated || 0) > (out[id].updated || 0)) out[id] = m; });
  Object.entries((state && state.deletedMods) || {}).forEach(([id, t]) => { if (out[id] && (out[id].updated || 0) <= t) delete out[id]; });
  return out;
}

// ================= backup / restore =================
$('#rBackup').addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  LW.download(`lonewolf-backup-${stamp}.json`, { format: 'lonewolf-backup', version: 2, exported: new Date().toISOString(), app: LW.version, state: LW.S, vault: LW.VAULT });
});
$('#rRestore').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.format !== 'lonewolf-backup') throw new Error('not a LONEWOLF backup');
    const st = mergeState(LW.S, data.state);
    await LW.replaceAll(st, mergeVault(LW.VAULT, data.vault, st));
    LW.toast('Backup merged into this device');
    renderRig();
  } catch (err) { LW.toast('Restore failed: ' + (err.message || err), true); }
  e.target.value = '';
});
let wipeArm = 0;
$('#rWipeAll').addEventListener('click', e => {
  if (!wipeArm) { wipeArm = 1; e.target.textContent = 'Click again: erases progress AND forged modules here'; setTimeout(() => { wipeArm = 0; e.target.textContent = 'Wipe everything on this device'; }, 4000); return; }
  LW.wipeAll();
});

// ================= exams + contract =================
function renderRig() {
  const S = LW.S;
  $('#rExams').innerHTML = LW.modules().map(m => `<label>${esc(m.code)} exam date<input class="inp" type="date" data-exam="${esc(m.id)}" value="${esc((S.exams || {})[m.id] || '')}"></label>`).join('') || '<p class="hint2">No modules yet.</p>';
  document.querySelectorAll('#rExams input[data-exam]').forEach(i => { i.value = (S.exams || {})[i.dataset.exam] || ''; });
  $('#rcCards').value = (S.contract || {}).cards ?? 20;
  $('#rcDrills').value = (S.contract || {}).drills ?? 1;
  $('#rcMissions').value = (S.contract || {}).missions ?? 1;
  $('#rgKey').value = LW.gemini.key();
  $('#rgModel').value = local.get('lw-gem-model') || cfg().gemModel || '';
  $('#sUrl').value = local.get('lw-sb-url'); $('#sKey').value = local.get('lw-sb-key'); $('#sEmail').value = local.get('lw-sb-email');
  $('#sSql').textContent = SQL;
  syncLabel();
  about();
}
$('#rExams').addEventListener('change', e => {
  const id = e.target.dataset.exam; if (!id) return;
  LW.S.exams = LW.S.exams || {};
  if (e.target.value) LW.S.exams[id] = e.target.value; else delete LW.S.exams[id];
  (LW.S.stamps ||= {})['exam:' + id] = Date.now();
  LW.save(); LW.topbar(); LW.toast('Exam date saved');
});
['rcCards', 'rcDrills', 'rcMissions'].forEach(id => $('#' + id).addEventListener('change', () => {
  LW.S.contract = { cards: Math.max(0, +$('#rcCards').value || 0), drills: Math.max(0, +$('#rcDrills').value || 0), missions: Math.max(0, +$('#rcMissions').value || 0) };
  (LW.S.stamps ||= {}).contract = Date.now();
  LW.save(); LW.toast('Contract updated');
}));
async function about() {
  let storage = '';
  try { const est = await navigator.storage.estimate(); storage = ` · storage used ${(est.usage / 1048576).toFixed(1)} MB`; } catch (e) {}
  let persisted = false; try { persisted = await navigator.storage.persisted(); } catch (e) {}
  $('#rAbout').textContent = `LONEWOLF OS v${LW.version} · ${LW.modules().length} module(s)${storage} · storage ${persisted ? 'protected' : 'not yet protected (install the app to protect it)'}.`;
}

// ================= Supabase sync =================
const SQL = `-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.lonewolf_vault (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  vault jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.lonewolf_vault enable row level security;
create policy "read own" on public.lonewolf_vault for select using (auth.uid() = user_id);
create policy "insert own" on public.lonewolf_vault for insert with check (auth.uid() = user_id);
create policy "update own" on public.lonewolf_vault for update using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
$('#sCopySql').addEventListener('click', () => LW.copyText(SQL, 'SQL copied'));

let sb = null, syncing = false, syncT = 0, applying = false;
const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
async function client() {
  const url = local.get('lw-sb-url'), key = local.get('lw-sb-key');
  if (!url || !key) return null;
  if (sb) return sb;
  await loadScript('libs/sb/supabase.js');
  sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lw-sb-auth' } });
  return sb;
}
function syncLabel(msg) {
  const last = +local.get('lw-lastsync');
  const s = msg || (local.get('lw-sb-on') ? (last ? `Connected as ${local.get('lw-sb-email')} · last synced ${new Date(last).toLocaleString()}` : `Connected as ${local.get('lw-sb-email')} · not synced yet`) : 'Not connected. Everything stays on this device.');
  const el = $('#sState'); if (el) el.textContent = s;
}
function saveCreds() {
  local.set('lw-sb-url', $('#sUrl').value.trim().replace(/\/$/, ''));
  local.set('lw-sb-key', $('#sKey').value.trim());
  local.set('lw-sb-email', $('#sEmail').value.trim());
  sb = null;
}
$('#sSignUp').addEventListener('click', async () => {
  saveCreds();
  try {
    const c = await client(); if (!c) return LW.toast('Fill in Project URL and anon key', true);
    const { data, error } = await c.auth.signUp({ email: $('#sEmail').value.trim(), password: $('#sPass').value });
    if (error) throw error;
    if (data.session) { local.set('lw-sb-on', '1'); $('#sPass').value = ''; syncLabel(); await syncNow(); }
    else syncLabel('Account created. Confirm the email Supabase sent you, then press Sign in.');
  } catch (e) { syncLabel('✕ ' + (e.message || e)); }
});
$('#sSignIn').addEventListener('click', async () => {
  saveCreds();
  try {
    const c = await client(); if (!c) return LW.toast('Fill in Project URL and anon key', true);
    const { error } = await c.auth.signInWithPassword({ email: $('#sEmail').value.trim(), password: $('#sPass').value });
    if (error) throw error;
    local.set('lw-sb-on', '1'); $('#sPass').value = '';
    syncLabel(); await syncNow();
  } catch (e) { syncLabel('✕ ' + (e.message || e)); }
});
$('#sPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('#sSignIn').click(); });
$('#sOut').addEventListener('click', async () => {
  try { const c = await client(); if (c) await c.auth.signOut(); } catch (e) {}
  local.set('lw-sb-on', ''); syncLabel(); LW.toast('Signed out. Progress stays on this device.');
});
$('#sNow').addEventListener('click', () => syncNow(true));

// ---------- Link a device: one link carries URL + key + email (never the password) ----------
$('#sLink').addEventListener('click', async () => {
  const url = local.get('lw-sb-url'), key = local.get('lw-sb-key'), email = local.get('lw-sb-email');
  if (!url || !key) return LW.toast('Connect this device first', true);
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ u: url, k: key, e: email })))).replace(/=+$/, '');
  const link = location.origin + location.pathname + '#link-' + code;
  $('#sLinkBox').hidden = false;
  $('#sLinkOut').value = link;
  await LW.copyText(link, 'Link copied: send it to your other device');
});
function readLink() {
  const h = location.hash;
  if (!h.startsWith('#link-')) return;
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(h.slice(6)))));
    if (d.u && d.k) { local.set('lw-sb-url', d.u); local.set('lw-sb-key', d.k); local.set('lw-sb-email', d.e || ''); sb = null; }
    history.replaceState(null, '', location.pathname + '#rig');
    LW.go('rig');
    renderRig();
    syncLabel(local.get('lw-sb-on') ? null : 'Device link received. Type your LONEWOLF password once, then press Sign in.');
    setTimeout(() => $('#sPass').focus(), 400);
  } catch (e) { LW.toast('That link is broken. Make a new one on the laptop.', true); }
}

async function syncNow(loud) {
  if (syncing || !local.get('lw-sb-on')) { if (loud && !local.get('lw-sb-on')) LW.toast('Sign in first', true); return; }
  if (!navigator.onLine) { if (loud) LW.toast('Offline: will sync when back online', true); return; }
  syncing = true; syncLabel('Syncing…');
  try {
    const c = await client();
    const { data: u } = await c.auth.getUser();
    if (!u || !u.user) { local.set('lw-sb-on', ''); throw new Error('session expired, sign in again'); }
    const uid = u.user.id;
    const { data, error } = await c.from('lonewolf_vault').select('state,vault').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    let state = LW.S, vault = LW.VAULT;
    if (data) {
      state = mergeState(LW.S, data.state);
      vault = mergeVault(LW.VAULT, data.vault, state);
      const changed = JSON.stringify(state) !== JSON.stringify(LW.S) || JSON.stringify(vault) !== JSON.stringify(LW.VAULT);
      if (changed) { applying = true; await LW.replaceAll(state, vault, true); applying = false; }
    }
    const up = await c.from('lonewolf_vault').upsert({ user_id: uid, state: LW.S, vault: LW.VAULT, updated_at: new Date().toISOString() });
    if (up.error) throw up.error;
    local.set('lw-lastsync', String(Date.now()));
    // a synced Gemini key overrides an old one stored only on this device
    if (LW.S.cfg && LW.S.cfg.gemKey !== undefined && local.get('lw-gem-key') !== LW.S.cfg.gemKey) { local.set('lw-gem-key', LW.S.cfg.gemKey); local.set('lw-gem-model', LW.S.cfg.gemModel || ''); }
    $('#fGemini').hidden = !LW.gemini.key();
    syncLabel();
    dispatchEvent(new Event('lw-synced'));
    if (loud) { LW.toast('Synced'); window.SFX && SFX.play('sync'); }
  } catch (e) {
    applying = false;
    syncLabel('✕ Sync failed: ' + (e.message || e) + (/relation|does not exist/i.test(e.message || '') ? ' (run the SQL setup)' : ''));
    if (loud) LW.toast('Sync failed', true);
  }
  syncing = false;
}
LW.on('save', () => { if (applying || !local.get('lw-sb-on')) return; clearTimeout(syncT); syncT = setTimeout(syncNow, 8000); });
addEventListener('online', () => setTimeout(syncNow, 1500));
// push when you leave the app, pull when you come back to it
document.addEventListener('visibilitychange', () => {
  if (!local.get('lw-sb-on')) return;
  clearTimeout(syncT);
  if (document.visibilityState === 'hidden') syncNow();
  else setTimeout(syncNow, 600);
});
// and check every 2 minutes while the app is open
setInterval(() => { if (document.visibilityState === 'visible' && local.get('lw-sb-on')) syncNow(); }, 120000);
LW.on('ready', () => {
  renderRig();
  readLink();
  if (local.get('lw-sb-on')) setTimeout(syncNow, 1200);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
});
// sound settings (per device)
$('#sfxOn').addEventListener('change', e => { SFX.set({ on: e.target.checked }); if (e.target.checked) SFX.play('granted'); });
$('#sfxVol').addEventListener('input', e => SFX.set({ vol: +e.target.value }));
$('#sfxVol').addEventListener('change', () => SFX.play('tick'));
document.querySelectorAll('[data-sfx]').forEach(b => b.addEventListener('click', () => { SFX.ac(); SFX.play(b.dataset.sfx); }));
function renderSfx() { $('#sfxOn').checked = SFX.on; $('#sfxVol').value = SFX.volume(); }
LW.on('ready', renderSfx);
LW.onView('rig', () => { renderRig(); renderSfx(); });
LW.sync = { now: syncNow, mergeState, mergeVault };
}
