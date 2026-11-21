// Faith's studio: Supabase photo slots, 24-logo switcher, site settings, decisions answers, client photo uploads, and Stripe payments.
const cfg = window.FAITH_BACKEND || {};
const live = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url || '') && !!cfg.key;
const $ = s => document.querySelector(s);
const headers = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key };

const LABELS = {
  hero: 'Home · top photo',
  avatar: 'Faith · small round photo',
  portrait: 'Faith · portrait (home + about)',
  'svc-retwist': 'Service · Retwist + Style',
  'svc-all3': 'Service · All 3',
  'svc-reattach': 'Service · Loc Reattachments',
  'svc-mobile': 'Service · Mobile visit',
  'email-hero': 'Email · top photo',
  'about-mini': 'About · small photo'
};
for (let i = 1; i <= 4; i++) LABELS['reel-' + i] = 'Home · “From the chair” ' + i;
for (let i = 1; i <= 8; i++) LABELS['gallery-' + i] = 'Gallery · tile ' + i;
for (let i = 1; i <= 4; i++) LABELS['about-' + i] = 'About · strip ' + i;

const defaults = {};
document.querySelectorAll('img[data-slot]').forEach(img => {
  const k = img.dataset.slot;
  if (!defaults[k]) {
    defaults[k] = {
      src: img.getAttribute('src'),
      ratio: (+img.getAttribute('width') || 4) / (+img.getAttribute('height') || 5)
    };
  }
});

const current = {};
let settings = {};
let selectedLogoId = localStorage.getItem('faith_logo_preview') || 'flyer-chrome-pink';

function applySlots() {
  window.FAITH_SLOTS = { ...current };
  document.querySelectorAll('img[data-slot]').forEach(img => {
    const url = current[img.dataset.slot] || defaults[img.dataset.slot]?.src;
    if (url && img.getAttribute('src') !== url) img.src = url;
  });
  document.querySelectorAll('#svcopts .opt').forEach(o => {
    const url = current['svc-' + o.dataset.svc];
    const img = o.querySelector('img');
    if (url && img) img.src = url;
  });
}

function applySiteSettings() {
  const activeLogo = localStorage.getItem('faith_logo_preview') || settings.active_logo || 'flyer-chrome-pink';
  selectedLogoId = activeLogo;
  if (window.FAITH_LOGO_API) window.FAITH_LOGO_API.apply(activeLogo);

  // Verse vs. Sales-focused hero/about line
  const mode = settings.hero_verse_mode || 'verse';
  const salesLine = settings.hero_sales_line || 'Fresh parts, clean retwists & mobile studio service across Central Phoenix — book in under a minute.';
  document.querySelectorAll('[data-verse-slot]').forEach(el => {
    if (mode === 'sales') {
      el.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = salesLine;
      const small = document.createElement('small');
      small.textContent = 'CENTRAL PHOENIX · BOOK ONLINE';
      el.append(p, small);
    }
  });

  // Optional SMS sign-in (off by default unless Faith enables it on decisions)
  const smsEnabled = settings.sms_signin_enabled === 'true';
  const smsWrap = $('#client-sms-wrap');
  const smsState = $('#client-sms-state');
  if (smsWrap) smsWrap.hidden = !smsEnabled;
  if (smsState) {
    smsState.textContent = smsEnabled
      ? 'Phone text-code sign-in is enabled alongside free email sign-in.'
      : 'Email code sign-in is active (free). Phone text-code sign-in stays off unless Faith turns it on in Decisions.';
  }
}

async function rest(path, opts = {}) {
  const res = await fetch(cfg.url + '/rest/v1/' + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) throw Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function loadPublic() {
  if (!live) return;
  try {
    const [imgs, sets] = await Promise.all([
      rest('site_images?select=slot,url'),
      rest('site_settings?select=key,value')
    ]);
    imgs.forEach(r => { current[r.slot] = r.url; });
    sets.forEach(r => { settings[r.key] = r.value; });
    applySlots();
    applySiteSettings();
    paymentMode();
  } catch (e) {
    console.warn('Studio public settings unavailable', e);
  }
}

/* ---------------- Payments ---------------- */
const payLink = dep => {
  const url = settings['pay_link_' + dep];
  return /^https:\/\/buy\.stripe\.com\/[\w-]+/.test(url || '') ? url : null;
};

function paymentMode() {
  const anyLive = payLink(20) || payLink(50);
  const pm = $('#paymode');
  if (pm) {
    pm.innerHTML = anyLive
      ? '<b>Secure checkout by Stripe.</b> You finish paying on Stripe’s page with Apple Pay, Google Pay or card. Your deposit goes to Faith.'
      : '<b>Test mode.</b> No real money moves. Try card <code>4242 4242 4242 4242</code> (approved) or <code>4000 0000 0000 0002</code> (declined), any future date and any CVC.';
  }
  const tag = $('#paytag');
  if (tag) tag.hidden = !!anyLive;
  document.querySelectorAll('#checkout .sf, #checkout .or').forEach(el => { el.hidden = !!anyLive; });
  const state = $('#pay-state');
  if (state) state.textContent = anyLive ? 'Connected: deposits go to your Stripe account.' : 'Not connected yet. The deposit page runs in Stripe test mode, so you can try it with test cards.';
  if (anyLive && $('#paylbl')) $('#paylbl').textContent = 'Continue to secure payment';
}

const digits = v => (v || '').replace(/\D/g, '');
function luhn(n) {
  let sum = 0;
  [...n].reverse().forEach((d, i) => {
    let x = +d;
    if (i % 2) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  });
  return n.length >= 13 && sum % 10 === 0;
}

window.FAITH_pay = (trigger, calc, label, confirmBooking) => {
  const err = $('#payerr');
  if (err) err.textContent = '';
  const link = payLink(calc.dep);
  const btn = $('#paybtn');
  if (link) {
    sessionStorage.setItem('faith-booking', JSON.stringify(window.FAITH_state()));
    const email = $('#field-3')?.value.trim() || $('#field-5')?.value.trim();
    const u = new URL(link);
    if (email) u.searchParams.set('prefilled_email', email);
    location.href = u.toString();
    return;
  }
  const approve = () => {
    btn.classList.add('busy');
    $('#paylbl').textContent = 'Processing…';
    setTimeout(() => { btn.classList.remove('busy'); confirmBooking(); }, 900);
  };
  if (trigger.classList.contains('applepay')) { approve(); return; }
  const card = digits($('#field-6').value), exp = digits($('#card-exp').value), cvc = digits($('#card-cvc').value);
  if (!luhn(card)) { err.textContent = 'Your card number is incomplete or incorrect.'; return; }
  if (exp.length !== 4 || +exp.slice(0, 2) < 1 || +exp.slice(0, 2) > 12 || +('20' + exp.slice(2)) < 2026) { err.textContent = 'Check the expiration date.'; return; }
  if (cvc.length < 3) { err.textContent = 'Check the security code.'; return; }
  if (card === '4000000000000002') { err.textContent = 'Your card was declined (test card). Try 4242 4242 4242 4242.'; return; }
  if (!card.startsWith('4242') && !/^(5555|3782|6011)/.test(card)) { err.textContent = 'Test mode only accepts Stripe test cards, like 4242 4242 4242 4242.'; return; }
  approve();
};

const params = new URLSearchParams(location.search);
if (params.get('paid') === '1') {
  const saved = sessionStorage.getItem('faith-booking');
  history.replaceState(null, '', location.pathname + '#book');
  if (saved && window.FAITH_restore) {
    sessionStorage.removeItem('faith-booking');
    window.FAITH_restore(JSON.parse(saved));
  }
}

/* ---------------- Supabase Client (Admin + Client Account + Photo Uploads) ---------------- */
let sb = null;
let session = null;
const conn = $('#studio-conn');

function setEditable(on) {
  ['#crop-save', '#crop-reset', '#pay-form button', '#save-active-logo', '#studio-settings-save'].forEach(s => {
    const b = $(s);
    if (b) b.disabled = !on;
  });
  document.querySelectorAll('#pay-form input, #studio-settings-form input, #studio-settings-form select').forEach(i => { i.disabled = !on; });
}

function renderAdminLogoPicker() {
  const grid = $('#admin-logo-grid');
  if (!grid || !window.FAITH_LOGOS) return;
  const active = window.FAITH_LOGO_API.getActiveId();
  grid.replaceChildren(...window.FAITH_LOGOS.map((item, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'logo-choice-card' + (item.id === active ? ' on' : '');
    card.dataset.logoChoice = item.id;
    card.innerHTML = `<div class="logo-choice-stage">${item.render()}</div><div class="logo-choice-meta">${idx + 1}. ${item.name}</div><div class="logo-choice-note">${item.note}</div>`;
    card.onclick = () => {
      selectedLogoId = item.id;
      window.FAITH_LOGO_API.apply(item.id, { persistLocal: true });
      grid.querySelectorAll('.logo-choice-card').forEach(el => el.classList.toggle('on', el.dataset.logoChoice === item.id));
      const st = $('#admin-logo-status');
      if (st) st.textContent = `Previewing "${item.name}" in the header. Click Save active logo to publish.`;
    };
    return card;
  }));
}

async function checkSchemaTable() {
  if (settings.round3_schema_ready === 'true') return true;
  try {
    const rows = await rest('site_settings?key=eq.round3_schema_ready&select=value');
    return Array.isArray(rows) && rows[0]?.value === 'true';
  } catch { return false; }
}

async function loadDecisionAnswersForAdmin() {
  const box = $('#studio-decisions-list');
  const status = $('#studio-decisions-status');
  if (!box || !sb) return;
  try {
    const exists = await checkSchemaTable();
    if (!exists) {
      if (status) status.textContent = 'Decisions table pending: Pam needs to apply supabase/round3.sql in Supabase.';
      return;
    }
    const { data, error } = await sb.from('decision_answers').select('*').order('updated_at', { ascending: false });
    if (error) {
      if (status) status.textContent = 'Decisions table pending: Pam needs to apply supabase/round3.sql in Supabase.';
      return;
    }
    if (!data || !data.length) {
      box.innerHTML = '<p>No saved answers yet. Faith can answer and save from the Decisions for Faith page.</p>';
      if (status) status.textContent = 'Connected. Waiting for Faith’s answers.';
      return;
    }
    if (status) status.textContent = `Loaded ${data.length} saved decision items from Supabase.`;
    box.replaceChildren(...data.map(row => {
      const div = document.createElement('div');
      div.className = 'dec-answer-row';
      const head = document.createElement('b');
      head.textContent = `${row.question_key} · updated ${new Date(row.updated_at).toLocaleString()}`;
      const pre = document.createElement('pre');
      pre.textContent = typeof row.answer === 'string' ? row.answer : JSON.stringify(row.answer, null, 2);
      div.append(head, pre);
      if (row.question_key === 'brand_logo' && row.answer?.logo_id) {
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = 'Apply Faith’s chosen logo to header';
        applyBtn.onclick = () => {
          selectedLogoId = row.answer.logo_id;
          window.FAITH_LOGO_API?.apply(row.answer.logo_id, { persistLocal: true });
          renderAdminLogoPicker();
        };
        div.append(applyBtn);
      }
      return div;
    }));
  } catch (e) {
    if (status) status.textContent = 'Could not read decision answers yet (' + (e.message || 'apply round3.sql') + ').';
  }
}

/* ---------------- Client Account (Email Code Default + Photo Upload) ---------------- */
const localPhotos = [];
function renderClientPhotos(rows = []) {
  const grid = $('#client-photo-grid');
  if (!grid) return;
  const all = [...rows, ...localPhotos];
  if (!all.length) {
    grid.innerHTML = '<p style="font-size:13px;color:var(--dmuted)">No consultation or inspo photos uploaded yet.</p>';
    return;
  }
  grid.replaceChildren(...all.map(item => {
    const fig = document.createElement('figure');
    fig.className = 'client-photo-item';
    const img = document.createElement('img');
    img.src = item.public_url || item.url;
    img.alt = item.caption || item.category || 'Client uploaded loc photo';
    const cap = document.createElement('figcaption');
    const txt = document.createElement('span');
    txt.textContent = item.caption || item.category || 'Photo';
    cap.append(txt);
    if (item.id && sb && session) {
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Remove';
      del.onclick = async () => {
        await sb.from('client_photos').delete().eq('id', item.id);
        loadClientPhotos();
      };
      cap.append(del);
    }
    fig.append(img, cap);
    return fig;
  }));
}

async function loadClientPhotos() {
  if (!sb || !session) { renderClientPhotos([]); return; }
  try {
    const { data, error } = await sb.from('client_photos').select('*').order('created_at', { ascending: false });
    if (error) { renderClientPhotos([]); return; }
    renderClientPhotos(data || []);
  } catch { renderClientPhotos([]); }
}

function initClientAccount() {
  const signForm = $('#client-signin-form');
  const otpForm = $('#client-otp-form');
  const signOutBtn = $('#client-signout');
  const uploadForm = $('#client-photo-form');
  const fileInput = $('#client-photo-file');
  const statusEl = $('#client-auth-status');
  const uploadStatus = $('#client-upload-status');
  const smsForm = $('#client-sms-form');
  let pendingEmail = '';

  if (signForm && sb) {
    signForm.onsubmit = async e => {
      e.preventDefault();
      pendingEmail = $('#client-email-input').value.trim();
      if (!pendingEmail) return;
      statusEl.textContent = 'Sending free email code…';
      const { error } = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: { emailRedirectTo: location.origin + location.pathname + '#account' }
      });
      if (error) {
        statusEl.textContent = 'Could not send email code: ' + error.message;
        return;
      }
      statusEl.textContent = `Check ${pendingEmail} for your 6-digit sign-in code (or click the email link).`;
      if (otpForm) otpForm.hidden = false;
    };
  }

  if (otpForm && sb) {
    otpForm.onsubmit = async e => {
      e.preventDefault();
      const code = $('#client-otp-input').value.trim();
      const email = pendingEmail || $('#client-email-input').value.trim();
      if (!email || !code) return;
      statusEl.textContent = 'Verifying code…';
      const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
      statusEl.textContent = error ? ('Code invalid or expired: ' + error.message) : 'Signed in!';
    };
  }

  if (smsForm && sb) {
    smsForm.onsubmit = async e => {
      e.preventDefault();
      if (settings.sms_signin_enabled !== 'true') {
        statusEl.textContent = 'Phone text sign-in is turned off until Faith enables it in Decisions.';
        return;
      }
      const phone = $('#client-phone-input').value.trim();
      if (!phone) return;
      const { error } = await sb.auth.signInWithOtp({ phone });
      statusEl.textContent = error ? ('SMS sign-in unavailable: ' + error.message) : 'Check your phone for your 6-digit code.';
    };
  }

  if (signOutBtn && sb) {
    signOutBtn.onclick = () => sb.auth.signOut();
  }

  if (uploadForm && fileInput) {
    uploadForm.onsubmit = async e => {
      e.preventDefault();
      const files = [...(fileInput.files || [])];
      if (!files.length) { uploadStatus.textContent = 'Pick a photo from your phone or computer first.'; return; }
      const category = $('#client-photo-cat')?.value || 'consultation';
      const caption = ($('#client-photo-cap')?.value || '').trim();

      if (!sb || !session) {
        files.forEach(f => {
          localPhotos.unshift({ url: URL.createObjectURL(f), category, caption: caption || f.name });
        });
        renderClientPhotos([]);
        uploadStatus.textContent = 'Preview added below. Sign in with your free email code above to save photos to your client account.';
        fileInput.value = '';
        return;
      }

      uploadStatus.textContent = 'Uploading…';
      try {
        for (const f of files) {
          const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const up = await sb.storage.from('client-photos').upload(path, f, { contentType: f.type || 'image/jpeg' });
          if (up.error) throw up.error;
          const publicUrl = sb.storage.from('client-photos').getPublicUrl(path).data.publicUrl;
          const ins = await sb.from('client_photos').insert({
            user_id: session.user.id,
            user_email: session.user.email || '',
            category,
            caption: caption || f.name,
            storage_path: path,
            public_url: publicUrl
          });
          if (ins.error) throw ins.error;
        }
        fileInput.value = '';
        if ($('#client-photo-cap')) $('#client-photo-cap').value = '';
        uploadStatus.textContent = 'Uploaded and saved to your client account.';
        await loadClientPhotos();
      } catch (err) {
        files.forEach(f => {
          localPhotos.unshift({ url: URL.createObjectURL(f), category, caption: caption || f.name });
        });
        renderClientPhotos([]);
        uploadStatus.textContent = 'Preview shown below; cloud save waits on Pam applying supabase/round3.sql (' + (err.message || 'pending table') + ').';
      }
    };
  }
  renderClientPhotos([]);
}

let authBooted = false;
async function ensureAuthBooted() {
  if (authBooted) return;
  authBooted = true;
  if (!live) {
    if (conn) conn.textContent = 'Saving is off: backend-config.js has no Supabase credentials.';
    setEditable(false);
    initClientAccount();
    return;
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(cfg.url, cfg.key);
  initClientAccount();

  let pendingAdminEmail = '';
  const refresh = async () => {
    session = (await sb.auth.getSession()).data.session;
    const isSignedIn = !!session;
    if ($('#studio-signin')) $('#studio-signin').hidden = isSignedIn;
    if ($('#signed-in')) $('#signed-in').hidden = !isSignedIn;
    if (isSignedIn && $('#signed-email')) $('#signed-email').textContent = session.user.email || session.user.phone || 'Signed in';
    if (conn) conn.textContent = isSignedIn ? 'Connected to Supabase. Changes save live.' : 'Connected to Supabase. Sign in with an allowlisted studio email to save changes.';
    setEditable(isSignedIn);

    // Client account badge sync
    const cOut = $('#client-signed-out');
    const cIn = $('#client-signed-in');
    const cBadge = $('#client-signed-badge');
    if (cOut) cOut.hidden = isSignedIn;
    if (cIn) cIn.hidden = !isSignedIn;
    if (cBadge) cBadge.textContent = isSignedIn ? ('Signed in as ' + (session.user.email || 'client')) : 'Free email code sign-in · no password';
    if (isSignedIn) {
      loadClientPhotos();
      if (location.hash === '#admin') loadDecisionAnswersForAdmin();
    }
  };

  sb.auth.onAuthStateChange(refresh);
  await refresh();
  if (location.hash === '#admin') await loadDecisionAnswersForAdmin();

  if ($('#pay-20')) $('#pay-20').value = settings.pay_link_20 || '';
  if ($('#pay-50')) $('#pay-50').value = settings.pay_link_50 || '';
  if ($('#setting-verse-mode')) $('#setting-verse-mode').value = settings.hero_verse_mode || 'verse';
  if ($('#setting-sales-line')) $('#setting-sales-line').value = settings.hero_sales_line || 'Fresh parts, clean retwists & mobile studio service across Central Phoenix — book in under a minute.';
  if ($('#setting-sms-enabled')) $('#setting-sms-enabled').value = settings.sms_signin_enabled || 'false';

  if ($('#signin-form')) {
    $('#signin-form').onsubmit = async e => {
      e.preventDefault();
      pendingAdminEmail = $('#signin-email').value.trim();
      const { error } = await sb.auth.signInWithOtp({
        email: pendingAdminEmail,
        options: { emailRedirectTo: location.origin + location.pathname + '#admin', shouldCreateUser: false }
      });
      $('#signin-status').textContent = error
        ? 'That email is not on the studio allowlist yet (ogaiclients@gmail.com is allowlisted; Faith is added at handover).'
        : 'Check your email for the sign-in link or 6-digit code.';
      if (!error && $('#admin-otp-form')) $('#admin-otp-form').hidden = false;
    };
  }

  if ($('#admin-otp-form')) {
    $('#admin-otp-form').onsubmit = async e => {
      e.preventDefault();
      const email = pendingAdminEmail || $('#signin-email').value.trim();
      const token = $('#admin-otp-code').value.trim();
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      $('#signin-status').textContent = error ? ('Code rejected: ' + error.message) : 'Signed in!';
    };
  }

  if ($('#signout')) $('#signout').onclick = () => sb.auth.signOut();

  if ($('#save-active-logo')) {
    $('#save-active-logo').onclick = async () => {
      if (!sb || !session) return;
      const st = $('#admin-logo-status');
      st.textContent = 'Saving active logo…';
      const { error } = await sb.from('site_settings').upsert({ key: 'active_logo', value: selectedLogoId });
      if (error) { st.textContent = 'Not saved: ' + error.message; return; }
      settings.active_logo = selectedLogoId;
      st.textContent = `Saved "${selectedLogoId}" as the live site header logo.`;
    };
  }

  if ($('#studio-settings-form')) {
    $('#studio-settings-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session) return;
      const st = $('#studio-settings-status');
      st.textContent = 'Saving settings…';
      const rows = [
        { key: 'hero_verse_mode', value: $('#setting-verse-mode').value },
        { key: 'hero_sales_line', value: $('#setting-sales-line').value.trim() },
        { key: 'sms_signin_enabled', value: $('#setting-sms-enabled').value }
      ];
      const { error } = await sb.from('site_settings').upsert(rows);
      if (error) { st.textContent = 'Not saved: ' + error.message; return; }
      rows.forEach(r => { settings[r.key] = r.value; });
      applySiteSettings();
      st.textContent = 'Saved site settings live.';
    };
  }

  if ($('#refresh-decisions')) {
    $('#refresh-decisions').onclick = () => loadDecisionAnswersForAdmin();
  }

  if ($('#pay-form')) {
    $('#pay-form').onsubmit = async e => {
      e.preventDefault();
      const rows = [['pay_link_20', $('#pay-20').value.trim()], ['pay_link_50', $('#pay-50').value.trim()]];
      if (rows.some(([, v]) => v && !/^https:\/\/buy\.stripe\.com\/[\w-]+/.test(v))) {
        $('#pay-status').textContent = 'Links must start with https://buy.stripe.com/';
        return;
      }
      const { error } = await sb.from('site_settings').upsert(rows.map(([key, value]) => ({ key, value })));
      if (error) { $('#pay-status').textContent = 'Not saved: ' + error.message; return; }
      rows.forEach(([k, v]) => { settings[k] = v; });
      paymentMode();
      $('#pay-status').textContent = 'Saved. Deposits now go to your Stripe.';
    };
  }
}

let adminRendered = false;
function ensureAdminRendered() {
  if (adminRendered) return;
  adminRendered = true;
  renderSlots();
  renderAdminLogoPicker();
}

async function initAdmin() {
  renderClientPhotos([]);
  if (location.hash === '#admin') ensureAdminRendered();
  if (location.hash === '#admin' || location.hash === '#account' || location.hash.includes('access_token=')) {
    await ensureAuthBooted();
  }
  window.addEventListener('hashchange', async () => {
    if (location.hash === '#admin') ensureAdminRendered();
    if (location.hash === '#admin' || location.hash === '#account') {
      await ensureAuthBooted();
      if (location.hash === '#admin') await loadDecisionAnswersForAdmin();
    }
  });
}

function renderSlots() {
  const grid = $('#slot-grid');
  if (!grid) return;
  grid.replaceChildren(...Object.keys(defaults).sort((a, b) => Object.keys(LABELS).indexOf(a) - Object.keys(LABELS).indexOf(b)).map(slot => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot-card';
    const img = document.createElement('img');
    img.src = current[slot] || defaults[slot].src;
    img.alt = '';
    img.loading = 'lazy';
    const span = document.createElement('span');
    span.textContent = LABELS[slot] || slot;
    b.append(img, span);
    b.onclick = () => openCropper(slot);
    return b;
  }));
}

let crop = { slot: null, img: null };
function openCropper(slot) {
  crop = { slot, img: null };
  const ratio = defaults[slot].ratio;
  const cv = $('#crop-canvas');
  cv.width = 900;
  cv.height = Math.round(900 / ratio);
  $('#crop-title').textContent = 'Replace: ' + (LABELS[slot] || slot);
  $('#crop-status').textContent = '';
  const lib = $('#crop-lib');
  const sources = [...new Set([...Object.values(defaults).map(d => d.src), ...Object.values(current)])];
  lib.replaceChildren(...sources.map(src => {
    const b = document.createElement('button');
    b.type = 'button';
    const i = document.createElement('img');
    i.src = src;
    i.alt = 'Use this photo';
    i.loading = 'lazy';
    b.append(i);
    b.onclick = () => loadImage(src);
    return b;
  }));
  $('#cropper').hidden = false;
  $('#cropper').scrollIntoView({ block: 'start' });
  loadImage(current[slot] || defaults[slot].src);
}

function loadImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    crop.img = img;
    $('#crop-zoom').value = 1;
    $('#crop-x').value = .5;
    $('#crop-y').value = .5;
    draw();
  };
  img.src = src;
}

function draw() {
  const { img } = crop;
  if (!img) return;
  const cv = $('#crop-canvas'), ctx = cv.getContext('2d');
  const zoom = +$('#crop-zoom').value;
  const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight) * zoom;
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--night').trim();
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, -(w - cv.width) * +$('#crop-x').value, -(h - cv.height) * +$('#crop-y').value, w, h);
}

['#crop-zoom', '#crop-x', '#crop-y'].forEach(s => { const el = $(s); if (el) el.addEventListener('input', draw); });
if ($('#crop-file')) $('#crop-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); });
if ($('#crop-cancel')) $('#crop-cancel').onclick = () => { $('#cropper').hidden = true; };
if ($('#crop-save')) {
  $('#crop-save').onclick = async () => {
    if (!sb || !session || !crop.img) return;
    const status = $('#crop-status');
    status.textContent = 'Saving…';
    const blob = await new Promise(r => $('#crop-canvas').toBlob(r, 'image/webp', .86));
    const path = crop.slot + '/' + Date.now() + '.webp';
    const up = await sb.storage.from('site-images').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
    if (up.error) { status.textContent = 'Not saved: ' + up.error.message; return; }
    const url = sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('site_images').upsert({ slot: crop.slot, url });
    if (error) { status.textContent = 'Not saved: ' + error.message; return; }
    current[crop.slot] = url;
    applySlots();
    renderSlots();
    status.textContent = 'Saved. It is live on your site now.';
  };
}
if ($('#crop-reset')) {
  $('#crop-reset').onclick = async () => {
    if (!sb || !session) return;
    const { error } = await sb.from('site_images').delete().eq('slot', crop.slot);
    if (error) { $('#crop-status').textContent = 'Not saved: ' + error.message; return; }
    delete current[crop.slot];
    applySlots();
    renderSlots();
    $('#crop-status').textContent = 'Original photo restored.';
  };
}

paymentMode();
await loadPublic();
await initAdmin();
