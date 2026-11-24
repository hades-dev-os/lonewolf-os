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
LW.gemini = {
  key: () => local.get('lw-gem-key'),
  model: () => local.get('lw-gem-model') || 'gemini-2.5-flash',
  async ask(prompt, json) {
    const key = this.key();
    if (!key) throw new Error('no API key set in Rig');
    if (!navigator.onLine) throw new Error('offline');
    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    if (json) body.generationConfig = { responseMimeType: 'application/json', maxOutputTokens: 32768 };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model())}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
    const c = data.candidates && data.candidates[0];
    const text = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('') : '';
    if (!text) throw new Error('empty answer' + (c && c.finishReason ? ' (' + c.finishReason + ')' : ''));
    return text;
  }
};
$('#rgSave').addEventListener('click', () => {
  local.set('lw-gem-key', $('#rgKey').value.trim());
  local.set('lw-gem-model', $('#rgModel').value.trim());
  $('#rgMsg').textContent = LW.gemini.key() ? 'Saved on this device.' : 'Key removed.';
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
  out.xp = Math.max(out.xp || 0, b.xp || 0);
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
    Object.entries(bm.nodes || {}).forEach(([k, v]) => { const o = m.nodes[k] || (m.nodes[k] = {}); ['read', 'hacked', 'hackedOnce'].forEach(f => { if (v[f]) o[f] = 1; }); });
    Object.entries(bm.cards || {}).forEach(([k, v]) => { const o = m.cards[k]; if (!o || (v.t || 0) > (o.t || 0)) m.cards[k] = v; });
    Object.entries(bm.drills || {}).forEach(([k, v]) => { m.drills[k] = Math.max(m.drills[k] || 0, v || 0); });
    Object.entries(bm.chal || {}).forEach(([k, v]) => { if (v) m.chal[k] = 1; });
  });
  out.drafts = Object.assign({}, b.drafts || {}, out.drafts || {});
  if ((b.updated || 0) > (a.updated || 0)) { out.exams = clone(b.exams); out.contract = clone(b.contract); }
  out.updated = Math.max(a.updated || 0, b.updated || 0);
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
  $('#rcCards').value = (S.contract || {}).cards ?? 20;
  $('#rcDrills').value = (S.contract || {}).drills ?? 1;
  $('#rcMissions').value = (S.contract || {}).missions ?? 1;
  $('#rgKey').value = LW.gemini.key();
  $('#rgModel').value = local.get('lw-gem-model');
  $('#sUrl').value = local.get('lw-sb-url'); $('#sKey').value = local.get('lw-sb-key'); $('#sEmail').value = local.get('lw-sb-email');
  $('#sSql').textContent = SQL;
  syncLabel();
  about();
}
$('#rExams').addEventListener('change', e => {
  const id = e.target.dataset.exam; if (!id) return;
  LW.S.exams = LW.S.exams || {};
  if (e.target.value) LW.S.exams[id] = e.target.value; else delete LW.S.exams[id];
  LW.save(); LW.topbar(); LW.toast('Exam date saved');
});
['rcCards', 'rcDrills', 'rcMissions'].forEach(id => $('#' + id).addEventListener('change', () => {
  LW.S.contract = { cards: Math.max(0, +$('#rcCards').value || 0), drills: Math.max(0, +$('#rcDrills').value || 0), missions: Math.max(0, +$('#rcMissions').value || 0) };
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
$('#sOut').addEventListener('click', async () => {
  try { const c = await client(); if (c) await c.auth.signOut(); } catch (e) {}
  local.set('lw-sb-on', ''); syncLabel(); LW.toast('Signed out. Progress stays on this device.');
});
$('#sNow').addEventListener('click', () => syncNow(true));

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
    syncLabel();
    dispatchEvent(new Event('lw-synced'));
    if (loud) LW.toast('Synced');
  } catch (e) {
    applying = false;
    syncLabel('✕ Sync failed: ' + (e.message || e) + (/relation|does not exist/i.test(e.message || '') ? ' (run the SQL setup)' : ''));
    if (loud) LW.toast('Sync failed', true);
  }
  syncing = false;
}
LW.on('save', () => { if (applying || !local.get('lw-sb-on')) return; clearTimeout(syncT); syncT = setTimeout(syncNow, 8000); });
addEventListener('online', () => setTimeout(syncNow, 1500));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && local.get('lw-sb-on')) { clearTimeout(syncT); syncNow(); } });
LW.on('ready', () => {
  renderRig();
  if (local.get('lw-sb-on')) setTimeout(syncNow, 1200);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
});
LW.onView('rig', renderRig);
LW.sync = { now: syncNow, mergeState, mergeVault };
}
