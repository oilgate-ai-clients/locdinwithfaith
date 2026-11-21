// Faith's studio: photo slots, payment links and the deposit checkout.
// Storage is Faith's Supabase project (assets/backend-config.js). Without it nothing is saved and the admin says so.
const cfg = window.FAITH_BACKEND || {};
const live = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url || '') && !!cfg.key;
const $ = s => document.querySelector(s);
const headers = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key };

const LABELS = {
  hero: 'Home · top photo', avatar: 'Faith · small round photo', portrait: 'Faith · portrait (home + about)',
  'svc-retwist': 'Service · Retwist + Style', 'svc-all3': 'Service · All 3', 'svc-reattach': 'Service · Reattachments',
  'svc-mobile': 'Service · Mobile visit', 'addon-attach': 'Add-on · Attachment', 'addon-prep': 'Add-on · Preparation',
  'services-side': 'Services page · side photo', 'email-hero': 'Email · top photo', 'about-mini': 'About · small photo'
};
for (let i = 1; i <= 4; i++) LABELS['reel-' + i] = 'Home · “From the chair” ' + i;
for (let i = 1; i <= 9; i++) LABELS['gallery-' + i] = 'Gallery · photo ' + i;
for (let i = 1; i <= 5; i++) LABELS['about-' + i] = 'About · strip photo ' + i;

const defaults = {};
document.querySelectorAll('img[data-slot]').forEach(img => {
  const k = img.dataset.slot;
  if (!defaults[k]) defaults[k] = { src: img.getAttribute('src'), ratio: (+img.getAttribute('width') || 4) / (+img.getAttribute('height') || 5) };
});
const current = {};
let settings = {};

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

async function rest(path, opts = {}) {
  const res = await fetch(cfg.url + '/rest/v1/' + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) throw Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function loadPublic() {
  if (!live) return;
  try {
    const [imgs, sets] = await Promise.all([rest('site_images?select=slot,url'), rest('site_settings?select=key,value')]);
    imgs.forEach(r => { current[r.slot] = r.url; });
    sets.forEach(r => { settings[r.key] = r.value; });
    applySlots();
    paymentMode();
  } catch (e) { console.warn('Studio content unavailable', e); }
}

/* ---------------- Payments ---------------- */
const payLink = dep => {
  const url = settings['pay_link_' + dep];
  return /^https:\/\/buy\.stripe\.com\/[\w-]+/.test(url || '') ? url : null;
};
function paymentMode() {
  const anyLive = payLink(20) || payLink(50);
  $('#paymode').innerHTML = anyLive
    ? '<b>Secure checkout by Stripe.</b> You finish paying on Stripe’s page with Apple Pay, Google Pay or card. Your deposit goes to Faith.'
    : '<b>Test mode.</b> No real money moves. Try card <code>4242 4242 4242 4242</code> (approved) or <code>4000 0000 0000 0002</code> (declined), any future date and any CVC.';
  $('#paytag').hidden = !!anyLive;
  document.querySelectorAll('#checkout .sf, #checkout .or').forEach(el => { el.hidden = !!anyLive; });
  const state = $('#pay-state');
  if (state) state.textContent = anyLive ? 'Connected: deposits go to your Stripe account.' : 'Not connected yet. The deposit page runs in Stripe test mode, so you can try it with test cards.';
  if (anyLive) $('#paylbl').textContent = 'Continue to secure payment';
}
const digits = v => (v || '').replace(/\D/g, '');
function luhn(n) { let sum = 0; [...n].reverse().forEach((d, i) => { let x = +d; if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }); return n.length >= 13 && sum % 10 === 0; }

window.FAITH_pay = (trigger, calc, label, confirmBooking) => {
  const err = $('#payerr'); err.textContent = '';
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
  const approve = () => { btn.classList.add('busy'); $('#paylbl').textContent = 'Processing…'; setTimeout(() => { btn.classList.remove('busy'); confirmBooking(); }, 900); };
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
  if (saved && window.FAITH_restore) { sessionStorage.removeItem('faith-booking'); window.FAITH_restore(JSON.parse(saved)); }
}

/* ---------------- Admin ---------------- */
let sb = null, session = null;
const conn = $('#studio-conn');
function setEditable(on) {
  ['#crop-save', '#crop-reset', '#pay-form button'].forEach(s => { const b = $(s); if (b) b.disabled = !on; });
  document.querySelectorAll('#pay-form input').forEach(i => { i.disabled = !on; });
}
async function initAdmin() {
  renderSlots();
  if (!live) {
    conn.textContent = 'Saving is off: the studio database is not connected yet. You can try the photo cropper, but nothing is saved until it is.';
    setEditable(false);
    return;
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(cfg.url, cfg.key);
  const refresh = async () => {
    session = (await sb.auth.getSession()).data.session;
    $('#studio-signin').hidden = !!session;
    $('#signed-in').hidden = !session;
    if (session) $('#signed-email').textContent = session.user.email;
    conn.textContent = session ? 'Connected. Changes save to your live site.' : 'Sign in to make changes.';
    setEditable(!!session);
  };
  sb.auth.onAuthStateChange(refresh);
  await refresh();
  $('#pay-20').value = settings.pay_link_20 || '';
  $('#pay-50').value = settings.pay_link_50 || '';
  $('#signin-form').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({ email: $('#signin-email').value.trim(), options: { emailRedirectTo: location.origin + location.pathname + '#admin', shouldCreateUser: false } });
    $('#signin-status').textContent = error ? 'That email is not set up for the studio.' : 'Check your email for the sign-in link.';
  };
  $('#signout').onclick = () => sb.auth.signOut();
  $('#pay-form').onsubmit = async e => {
    e.preventDefault();
    const rows = [['pay_link_20', $('#pay-20').value.trim()], ['pay_link_50', $('#pay-50').value.trim()]];
    if (rows.some(([, v]) => v && !/^https:\/\/buy\.stripe\.com\/[\w-]+/.test(v))) { $('#pay-status').textContent = 'Links must start with https://buy.stripe.com/'; return; }
    const { error } = await sb.from('site_settings').upsert(rows.map(([key, value]) => ({ key, value })));
    if (error) { $('#pay-status').textContent = 'Not saved: ' + error.message; return; }
    rows.forEach(([k, v]) => { settings[k] = v; });
    paymentMode();
    $('#pay-status').textContent = 'Saved. Deposits now go to your Stripe.';
  };
}
function renderSlots() {
  const grid = $('#slot-grid');
  grid.replaceChildren(...Object.keys(defaults).sort((a, b) => Object.keys(LABELS).indexOf(a) - Object.keys(LABELS).indexOf(b)).map(slot => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'slot-card';
    const img = document.createElement('img'); img.src = current[slot] || defaults[slot].src; img.alt = ''; img.loading = 'lazy';
    const span = document.createElement('span'); span.textContent = LABELS[slot] || slot;
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
  cv.width = 900; cv.height = Math.round(900 / ratio);
  $('#crop-title').textContent = 'Replace: ' + (LABELS[slot] || slot);
  $('#crop-status').textContent = '';
  const lib = $('#crop-lib');
  const sources = [...new Set([...Object.values(defaults).map(d => d.src), ...Object.values(current)])];
  lib.replaceChildren(...sources.map(src => {
    const b = document.createElement('button'); b.type = 'button';
    const i = document.createElement('img'); i.src = src; i.alt = 'Use this photo'; i.loading = 'lazy';
    b.append(i); b.onclick = () => loadImage(src); return b;
  }));
  $('#cropper').hidden = false;
  $('#cropper').scrollIntoView({ block: 'start' });
  loadImage(current[slot] || defaults[slot].src);
}
function loadImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { crop.img = img; $('#crop-zoom').value = 1; $('#crop-x').value = .5; $('#crop-y').value = .5; draw(); };
  img.src = src;
}
function draw() {
  const { img } = crop; if (!img) return;
  const cv = $('#crop-canvas'), ctx = cv.getContext('2d');
  const zoom = +$('#crop-zoom').value;
  const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight) * zoom;
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, -(w - cv.width) * +$('#crop-x').value, -(h - cv.height) * +$('#crop-y').value, w, h);
}
['#crop-zoom', '#crop-x', '#crop-y'].forEach(s => $(s).addEventListener('input', draw));
$('#crop-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); });
$('#crop-cancel').onclick = () => { $('#cropper').hidden = true; };
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
  current[crop.slot] = url; applySlots(); renderSlots();
  status.textContent = 'Saved. It is live on your site now.';
};
$('#crop-reset').onclick = async () => {
  if (!sb || !session) return;
  const { error } = await sb.from('site_images').delete().eq('slot', crop.slot);
  if (error) { $('#crop-status').textContent = 'Not saved: ' + error.message; return; }
  delete current[crop.slot]; applySlots(); renderSlots();
  $('#crop-status').textContent = 'Original photo restored.';
};

paymentMode();
await loadPublic();
initAdmin();
