// Loc'd In with Faith — Real First-Party Studio Engine (Round 5 Repair)
// Handles:
//   - First-party booking requests + private deposit proof uploads (plus optional Cal.com inline embed)
//   - Bulletproof Supabase auth callbacks (/admin/ & /?auth_target=account + implicit double-hash repair)
//   - Owner-scoped Customer Account (#account): appointments, profile, notification consent, client_photos, optional password
//   - Verified reviews + moderated first-party review submission (no fabricated quotes or ratings)
//   - Gallery Lookbook modal + Studio Admin (Home, Deposits, Reviews, Decisions, Photos, Settings)

const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CLIENT_PHOTO_BYTES = 10 * 1024 * 1024;
const AUTH_STORAGE_KEY = 'faith-studio-auth';
const LOCAL_BOOKINGS_CACHE_PREFIX = 'faith_client_bookings_';
const LOGO_SHORTLIST_IDS = [
  'flyer-chrome-pink',
  'flyer-stacked-crest',
  'neon-gloss-script',
  'pink-foil-bar',
  'bow-chrome-classic',
  'gloss-italic-bold'
];

const SERVICES = {
  retwist: {
    key: 'retwist',
    name: 'Retwist + Style',
    price: '$70',
    meta: '2 hr · Wash (+$15), Detox (+$20), Attachment (+$10)',
    defaultDeposit: 20,
    depositKey: 'deposit_retwist',
    slugKey: 'cal_slug_retwist'
  },
  all3: {
    key: 'all3',
    name: 'All 3 (Best Value)',
    price: '$85',
    meta: '~2 hr 15 min · Wash, Retwist, Style & Hot Towel Facial',
    defaultDeposit: 20,
    depositKey: 'deposit_all3',
    slugKey: 'cal_slug_all3'
  },
  reattach: {
    key: 'reattach',
    name: 'Loc Reattachments',
    price: 'From $10/loc',
    meta: '1–5 locs $10/loc · 6–10 $8/loc · 11–20 $100+ · 21+ $150+',
    defaultDeposit: 50,
    depositKey: 'deposit_reattach',
    slugKey: 'cal_slug_reattach'
  },
  fullhead: {
    key: 'fullhead',
    name: 'Full-Head Reattachment',
    price: 'From $250',
    meta: 'Up to 4 hr · Wash included · Consultation photos required',
    defaultDeposit: 50,
    depositKey: 'deposit_reattach',
    slugKey: 'cal_slug_reattach'
  },
  treatment: {
    key: 'treatment',
    name: 'Treatments',
    price: '$30+',
    meta: 'Hot oil $30 · Facial/scalp massage $55 · Deep conditioning $70',
    defaultDeposit: 20,
    depositKey: 'deposit_retwist',
    slugKey: 'cal_slug_retwist'
  },
  mobile: {
    key: 'mobile',
    name: 'Mobile Visit',
    price: '+$20 / +$35',
    meta: 'Faith comes to you · +$20 under 30 min / +$35 over 30 min',
    defaultDeposit: 20,
    depositKey: 'deposit_mobile',
    slugKey: 'cal_slug_mobile'
  }
};

// Faith's real posted hours (Central Phoenix / America/Phoenix local time)
const DEFAULT_HOURS_WINDOWS = {
  0: { label: 'Sunday', startMin: 8 * 60, endMin: 23 * 60 + 30, text: '8:00 AM – 11:30 PM' },
  1: { label: 'Monday', startMin: 8 * 60, endMin: 23 * 60 + 30, text: '8:00 AM – 11:30 PM' },
  2: { label: 'Tuesday', startMin: 23 * 60, endMin: 23 * 60 + 30, text: '11:00 PM – 11:30 PM' },
  3: { label: 'Wednesday', startMin: 8 * 60, endMin: 23 * 60 + 30, text: '8:00 AM – 11:30 PM' },
  4: { label: 'Thursday', startMin: 8 * 60, endMin: 23 * 60 + 45, text: '8:00 AM – 11:45 PM' },
  5: { label: 'Friday', startMin: 8 * 60, endMin: 23 * 60 + 30, text: '8:00 AM – 11:30 PM' },
  6: { label: 'Saturday', startMin: 8 * 60, endMin: 23 * 60 + 30, text: '8:00 AM – 11:30 PM' }
};

const LOOKBOOK_ITEMS = [
  {
    idx: 0,
    slot: 'gallery-1',
    fallbackSrc: 'assets/retwist-style.webp?v=r6-20261123',
    title: 'My clients in my hair chair',
    service: 'retwist',
    serviceLabel: 'Retwist + Style — $70',
    settingKey: 'reel_url_1',
    fallbackUrl: 'https://www.instagram.com/locd.inwithfaith/reels/',
    fallbackLabel: 'Open @locd.inwithfaith Reels',
    desc: 'Finished loc style with clean diagonal parting.'
  },
  {
    idx: 1,
    slot: 'gallery-2',
    fallbackSrc: 'assets/hero.webp?v=r6-20261123',
    title: 'Retwist + Style in progress',
    service: 'retwist',
    serviceLabel: 'Retwist + Style — $70',
    settingKey: 'reel_url_2',
    fallbackUrl: 'https://www.instagram.com/locd.inwithfaith/',
    fallbackLabel: 'Open @locd.inwithfaith',
    desc: 'Fresh retwist & clean parts behind the chair in Central Phoenix.'
  },
  {
    idx: 2,
    slot: 'gallery-3',
    fallbackSrc: 'assets/closeup.webp?v=r6-20261123',
    title: 'Fresh loc close-up',
    service: 'all3',
    serviceLabel: 'All 3 (Best Value) — $85',
    settingKey: 'reel_url_3',
    fallbackUrl: 'https://www.instagram.com/locd.inwithfaith/reels/',
    fallbackLabel: 'Open @locd.inwithfaith Reels',
    desc: 'Wash, retwist, style & hot towel facial finish.'
  },
  {
    idx: 3,
    slot: 'gallery-4',
    fallbackSrc: 'assets/styling.webp?v=r6-20261123',
    title: 'Behind the chair session',
    service: 'mobile',
    serviceLabel: 'Studio or Mobile Visit',
    settingKey: 'reel_url_4',
    fallbackUrl: 'https://www.instagram.com/locd.inwithfaith/reels/',
    fallbackLabel: 'Open @locd.inwithfaith Reels',
    desc: 'Book in Central Phoenix or request a mobile visit across the Phoenix metro.'
  }
];

// Only verified, real reviews retrieved from Faith's live GlossGenius API (2026-11-23).
// Never invent quotes, dates, ratings, or names.
const VERIFIED_IMPORTED_REVIEWS = [
  {
    id: 'gg-5559127',
    author_name: 'Syd',
    rating: 5,
    comment: 'Faith was super welcoming, did a great job and worked fast 10/10 I’ll definitely be back. Glad to finally find someone',
    service_name: '',
    source: 'glossgenius_import',
    source_ref: 'glossgenius:5559127',
    created_at: '2026-11-13T23:40:42.805Z'
  },
  {
    id: 'gg-5535548',
    author_name: 'sosa',
    rating: 5,
    comment: '',
    service_name: '',
    source: 'glossgenius_import',
    source_ref: 'glossgenius:5535548',
    created_at: '2026-11-07T08:54:43.508Z'
  }
];

const READONLY_DEFAULTS = [
  { title: 'Hero & About verse', value: 'Keep Isaiah 43:1 (“I have called thee by thy name; thou art mine.”)' },
  { title: 'Admin & client sign-in', value: 'Free email sign-in link + optional password · Phone/SMS stays OFF' },
  { title: 'Deposits & payment handles', value: 'Manual confirmation + client payment screenshot proof (Cash App, Venmo, Zelle, etc.)' },
  { title: 'Studio address privacy', value: 'Public site shows “Central Phoenix” only; exact address sent after confirmation' },
  { title: 'Cancellation policy', value: 'Deposits refundable with 24+ hours notice; late cancel/no-show forfeits deposit' },
  { title: 'Mobile visits & travel fees', value: 'Available as its own booking type (+$20 under 30 min / +$35 over 30 min)' },
  { title: 'Treatments & add-ons', value: 'Hot oil $30, Facial/scalp massage $55, Deep conditioning $70, Wash +$15, Detox +$20' },
  { title: 'Portfolio & IG photos', value: 'Current photos live until you swap any slot in the Photos tab' },
  { title: 'Social links', value: 'Business @locd.inwithfaith & personal @faith.cordero22 (override individual tiles in Settings)' },
  { title: 'Texting number', value: 'Keep (480) 806-7675 ($0 extra; no automated SMS line active yet)' },
  { title: 'Review moderation', value: 'First-party reviews require owner approval before publishing; spam honeypot active' },
  { title: 'Ongoing site support', value: 'Agreed together with Oilgate AI' }
];

const LABELS = {
  hero: 'Home · top photo',
  avatar: 'Faith · small round photo',
  portrait: 'Faith · portrait (home + about)',
  'svc-retwist': 'Service · Retwist + Style',
  'svc-all3': 'Service · All 3',
  'svc-reattach': 'Service · Loc Reattachments',
  'svc-mobile': 'Service · Mobile visit',
  'about-mini': 'About · small photo'
};
for (let i = 1; i <= 4; i++) LABELS['reel-' + i] = 'Home · “From the chair” ' + i;
for (let i = 1; i <= 8; i++) LABELS['gallery-' + i] = 'Gallery · tile ' + i;
for (let i = 1; i <= 4; i++) LABELS['about-' + i] = 'About · strip ' + i;

const cfg = window.FAITH_BACKEND || {};
const live = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url || '') && !!cfg.key;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const anonHeaders = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key };

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

let currentImages = {};
let settings = {};
let decisionAnswers = {};
let bookingsList = [];
let reviewsListAdmin = [];
let clientPhotosAdmin = [];
let publicReviews = [...VERIFIED_IMPORTED_REVIEWS];
let depositFilter = 'all';
let reviewAdminFilter = 'all';
let selectedService = 'retwist';
let selectedLogoId = localStorage.getItem('faith_logo_preview') || 'flyer-chrome-pink';
let activeBooking = null; // { id, name, email, phone, service, timeLabel, depositAmount, savedToDb }
let sb = null;
let session = null;
let isAdminVerified = false;
let realSiteSchemaReady = false;
let round5SchemaReady = false;
let calScriptPromise = null;
let calListenerWired = false;
let lastMountedCalTarget = '';
let adminBooted = false;
let clientBooted = false;
let currentAdminTab = 'home';
let reviewFormOpenedAt = 0;
let authCallbackInFlight = false;
let authCallbackError = null; // { target, message }
let adminCooldownTimer = null;
let clientCooldownTimer = null;

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isSafeHttpUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
  } catch { /* invalid */ }
  return null;
}

function normalizeCalTarget(rawUrl, slug = '') {
  const clean = String(rawUrl || '').trim();
  if (!clean) return null;
  let origin = 'https://cal.com';
  let path = clean;
  if (/^https?:\/\//i.test(clean)) {
    try {
      const u = new URL(clean);
      origin = u.origin;
      path = u.pathname.replace(/^\/+|\/+$/g, '');
    } catch {
      return null;
    }
  } else {
    path = clean.replace(/^cal\.com\//i, '').replace(/^\/+|\/+$/g, '');
  }
  if (!path) return null;
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  let calLink = path;
  if (cleanSlug) {
    if (cleanSlug.includes('/')) calLink = cleanSlug;
    else {
      const baseUser = path.split('/')[0];
      calLink = `${baseUser}/${cleanSlug}`;
    }
  }
  return { origin, calLink, fullUrl: `${origin}/${calLink}` };
}

function getDepositAmount(serviceKey) {
  const svc = SERVICES[serviceKey] || SERVICES.retwist;
  const val = Number(settings[svc.depositKey]);
  return Number.isFinite(val) && val > 0 ? val : svc.defaultDeposit;
}

function getPayHandles() {
  const list = [];
  const entries = [
    ['Cash App', settings.pay_cashapp],
    ['Venmo', settings.pay_venmo],
    ['Zelle', settings.pay_zelle],
    ['Apple Pay', settings.pay_applepay],
    ['Other', settings.pay_other]
  ];
  entries.forEach(([label, raw]) => {
    const value = String(raw || '').trim();
    if (value) list.push({ label, value });
  });
  if (!list.length) {
    list.push({ label: 'Zelle', value: '(480) 806-7675' });
  }
  return list;
}

function renderPayHandlesHtml() {
  return getPayHandles().map(h =>
    `<div class="pay-handle-item"><small>${escapeHtml(h.label)}</small><b>${escapeHtml(h.value)}</b></div>`
  ).join('');
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '$20';
  return '$' + (Number.isInteger(num) ? num : num.toFixed(2));
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  } catch {
    return String(iso);
  }
}

function formatReviewDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function phoenixTodayString() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Phoenix',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name || '');
}

function safeFileExt(filename) {
  const ext = (String(filename || '').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext) ? ext : 'jpg';
}

async function rest(path, opts = {}) {
  const res = await fetch(cfg.url + '/rest/v1/' + path, {
    ...opts,
    headers: { ...anonHeaders, ...(opts.headers || {}) }
  });
  if (!res.ok) throw Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function ensureSupabaseClient() {
  if (sb) return sb;
  if (!live) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(cfg.url, cfg.key, {
    auth: {
      flowType: 'implicit',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY
    }
  });
  sb.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession || null;
    if (!authCallbackInFlight) {
      refreshGlobalAuth();
    }
  });
  return sb;
}

/* ---------------- Cooldown & Auth Error Helpers ---------------- */
function startButtonCooldown(btn, defaultLabel, storageKey, seconds = 60, existingTimerRef = 'admin') {
  if (!btn) return;
  const until = Date.now() + seconds * 1000;
  try { sessionStorage.setItem(storageKey, String(until)); } catch { /* ignore */ }
  runCooldownTick(btn, defaultLabel, storageKey, until, existingTimerRef);
}

function resumeCooldownIfActive(btn, defaultLabel, storageKey, existingTimerRef = 'admin') {
  if (!btn) return;
  let until = 0;
  try { until = Number(sessionStorage.getItem(storageKey) || 0); } catch { until = 0; }
  if (until > Date.now()) {
    runCooldownTick(btn, defaultLabel, storageKey, until, existingTimerRef);
  }
}

function runCooldownTick(btn, defaultLabel, storageKey, until, timerKind) {
  const clearExisting = () => {
    if (timerKind === 'admin' && adminCooldownTimer) { clearInterval(adminCooldownTimer); adminCooldownTimer = null; }
    if (timerKind === 'client' && clientCooldownTimer) { clearInterval(clientCooldownTimer); clientCooldownTimer = null; }
  };
  clearExisting();
  const tick = () => {
    const rem = Math.ceil((until - Date.now()) / 1000);
    if (rem <= 0) {
      clearExisting();
      btn.disabled = false;
      btn.textContent = defaultLabel;
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
      return;
    }
    btn.disabled = true;
    btn.textContent = `Resend available in ${rem}s`;
  };
  tick();
  const id = setInterval(tick, 1000);
  if (timerKind === 'admin') adminCooldownTimer = id;
  else clientCooldownTimer = id;
}

function humanAuthError(err) {
  const msg = String(err?.message || err || '').trim();
  const lower = msg.toLowerCase();
  if (/rate limit|too many requests|after \d+ seconds|only request this/i.test(lower)) {
    const secMatch = msg.match(/(\d+)\s*second/i);
    return secMatch
      ? `Please wait ${secMatch[1]} seconds before requesting another sign-in email.`
      : 'Please wait a moment before requesting another sign-in email.';
  }
  if (/otp_expired|expired|invalid.*token|invalid grant/i.test(lower)) {
    return 'That sign-in link has expired or was already used. Request a fresh link below.';
  }
  if (/invalid login credentials/i.test(lower)) {
    return 'Email or password did not match. Try your password again or use an email sign-in link.';
  }
  if (/email not confirmed/i.test(lower)) {
    return 'Check your email inbox to confirm your address before signing in with a password.';
  }
  return msg || 'Sign-in could not be completed. Please try again.';
}

/* ---------------- Public Slots, Settings & Links ---------------- */
function applySlots() {
  window.FAITH_SLOTS = { ...currentImages };
  document.querySelectorAll('img[data-slot]').forEach(img => {
    const url = currentImages[img.dataset.slot] || defaults[img.dataset.slot]?.src;
    if (url && img.getAttribute('src') !== url) img.src = url;
  });
}

function applyGalleryCustomLinks() {
  // Update Faith personal tiles with saved URLs if configured
  for (let i = 1; i <= 4; i++) {
    const el = document.querySelector(`[data-personal-idx="${i}"]`);
    if (!el) continue;
    const saved = isSafeHttpUrl(settings['personal_url_' + i]);
    if (saved) {
      el.href = saved;
      const hint = el.querySelector('.gal-ov span');
      if (hint) hint.textContent = 'View saved post →';
    }
  }
}

function applyLogoAndPayHandles() {
  const activeLogo = settings.active_logo || localStorage.getItem('faith_logo_preview') || 'flyer-chrome-pink';
  selectedLogoId = activeLogo;
  if (window.FAITH_LOGO_API) window.FAITH_LOGO_API.apply(activeLogo);

  const handlesHtml = renderPayHandlesHtml();
  $$('[data-pay-handles]').forEach(el => { el.innerHTML = handlesHtml; });

  const depRetwist = getDepositAmount('retwist');
  const depAll3 = getDepositAmount('all3');
  const depReattach = getDepositAmount('reattach');
  const depMobile = getDepositAmount('mobile');

  const polLine = $('#book-policy-line');
  if (polLine) {
    polLine.textContent = `Deposit policy: ${formatMoney(depRetwist)} deposit for Retwist + Style, All 3, or Treatments (${formatMoney(depReattach)} for Reattachments) goes toward your total. Refundable with 24+ hours notice.`;
  }
  const manualSelect = $('#manual-proof-service');
  if (manualSelect && manualSelect.options.length >= 6) {
    manualSelect.options[0].textContent = `Retwist + Style — ${formatMoney(depRetwist)} deposit`;
    manualSelect.options[1].textContent = `All 3 (Best Value) — ${formatMoney(depAll3)} deposit`;
    manualSelect.options[2].textContent = `Loc Reattachments — ${formatMoney(depReattach)} deposit`;
    manualSelect.options[3].textContent = `Full-Head Reattachment (Wash Included) — ${formatMoney(depReattach)} deposit`;
    manualSelect.options[4].textContent = `Treatments — ${formatMoney(depRetwist)} deposit`;
    manualSelect.options[5].textContent = `Mobile Visit — ${formatMoney(depMobile)} deposit`;
  }
}

// NEVER route any public booking CTA back to GlossGenius.
function updateBookCtas() {
  $$('[data-book-cta]').forEach(a => {
    const svc = a.dataset.bookService;
    const targetHref = svc && SERVICES[svc] ? `#book?service=${encodeURIComponent(svc)}` : '#book';
    a.setAttribute('href', targetHref);
    a.removeAttribute('target');
    a.removeAttribute('rel');
  });
}

async function loadPublic() {
  if (!live) {
    applyLogoAndPayHandles();
    updateBookCtas();
    renderPublicReviews();
    renderBookingScreen();
    return;
  }
  try {
    const [imgs, sets] = await Promise.all([
      rest('site_images?select=slot,url'),
      rest('site_settings?select=key,value')
    ]);
    currentImages = {};
    (imgs || []).forEach(r => { currentImages[r.slot] = r.url; });
    settings = {};
    (sets || []).forEach(r => { settings[r.key] = r.value; });
    realSiteSchemaReady = settings.real_site_schema_ready === 'true';
    round5SchemaReady = settings.round5_repair_schema_ready === 'true';
  } catch (e) {
    console.warn('Public settings load warning:', e.message || e);
  }
  await loadPublicReviews();
  applySlots();
  applyGalleryCustomLinks();
  applyLogoAndPayHandles();
  updateBookCtas();
  renderPublicReviews();
  renderBookingScreen();
}

/* ---------------- Verified Reviews & Moderated Submission ---------------- */
async function loadPublicReviews() {
  const base = [...VERIFIED_IMPORTED_REVIEWS];
  if (!live) {
    publicReviews = base;
    return;
  }
  try {
    const rows = await rest('reviews?select=id,author_name,rating,comment,service_name,source,source_ref,created_at&status=eq.approved&order=created_at.desc');
    if (Array.isArray(rows) && rows.length) {
      const seenRefs = new Set(rows.map(r => r.source_ref).filter(Boolean));
      const extras = base.filter(b => !seenRefs.has(b.source_ref));
      publicReviews = [...rows, ...extras];
      return;
    }
  } catch {
    // reviews table may not be applied yet until Claude runs supabase/round5-repair.sql
  }
  publicReviews = base;
}

function renderStarsString(rating) {
  const n = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return '★'.repeat(n) + '☆'.repeat(5 - n) + ` ${n}.0`;
}

function renderPublicReviews() {
  const list = $('#public-reviews-list');
  const summary = $('#reviews-summary-line');
  if (!list) return;
  const reviews = publicReviews.length ? publicReviews : VERIFIED_IMPORTED_REVIEWS;
  const avg = (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1);
  if (summary) {
    summary.textContent = `${avg} ★ average across ${reviews.length} verified Loc’d In with Faith ${reviews.length === 1 ? 'review' : 'reviews'}.`;
  }
  list.replaceChildren(...reviews.map(r => {
    const card = document.createElement('article');
    card.className = 'rev-card';
    const dateLabel = formatReviewDate(r.created_at);
    const starsText = renderStarsString(r.rating) + (dateLabel ? ` · ${dateLabel}` : '');
    const commentText = String(r.comment || '').trim();
    const provenance = r.source === 'glossgenius_import'
      ? 'Verified client review · Imported from GlossGenius'
      : 'Verified Loc’d In with Faith client review';
    card.innerHTML = `
      <div class="rev-stars">${escapeHtml(starsText)}</div>
      <p class="rev-quote ${commentText ? '' : 'rev-quote-rating'}">${
        commentText
          ? `“${escapeHtml(commentText)}”`
          : 'Verified 5-star client rating (no written comment).'
      }</p>
      <div class="rev-author">— ${escapeHtml(r.author_name)}${r.service_name ? ' · ' + escapeHtml(r.service_name) : ''}</div>
      <div class="rev-provenance">${escapeHtml(provenance)}</div>
    `;
    return card;
  }));
}

function wireReviewSubmission() {
  const toggleBtn = $('#toggle-review-form-btn');
  const closeBtn = $('#close-review-form-btn');
  const wrap = $('#review-submit-wrap');
  const form = $('#review-submit-form');
  const statusEl = $('#rev-submit-status');

  const setOpen = open => {
    if (!wrap) return;
    wrap.hidden = !open;
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      reviewFormOpenedAt = Date.now();
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  if (toggleBtn) toggleBtn.onclick = () => setOpen(wrap ? wrap.hidden : true);
  if (closeBtn) closeBtn.onclick = () => setOpen(false);

  const svcLink = $('#services-reviews-link');
  if (svcLink) {
    svcLink.onclick = e => {
      e.preventDefault();
      location.hash = '#home';
      setTimeout(() => $('#home-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };
  }

  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      if (!statusEl) return;
      statusEl.className = 'rev-status';

      // Honeypot check (spam bots fill hidden fields)
      if (($('#rev-website')?.value || '').trim()) {
        statusEl.textContent = 'Thank you! Your review has been received for moderation.';
        statusEl.classList.add('ok');
        form.reset();
        return;
      }

      if (reviewFormOpenedAt && Date.now() - reviewFormOpenedAt < 2500) {
        statusEl.textContent = 'Please take a moment to review your details before submitting.';
        statusEl.classList.add('err');
        return;
      }

      const lastSent = Number(localStorage.getItem('faith_last_review_ts') || 0);
      if (Date.now() - lastSent < 60 * 1000) {
        statusEl.textContent = 'Please wait a minute before submitting another review.';
        statusEl.classList.add('err');
        return;
      }

      const name = ($('#rev-name')?.value || '').trim();
      const serviceName = ($('#rev-service')?.value || '').trim();
      const rating = Number($('input[name="review_rating"]:checked')?.value || 5);
      const comment = ($('#rev-comment')?.value || '').trim();

      if (name.length < 2 || name.length > 80) {
        statusEl.textContent = 'Please enter your name (2–80 characters).';
        statusEl.classList.add('err');
        return;
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        statusEl.textContent = 'Choose a star rating from 1 to 5.';
        statusEl.classList.add('err');
        return;
      }

      const btn = $('#rev-submit-btn');
      if (btn) btn.disabled = true;
      statusEl.textContent = 'Submitting review for Faith’s approval…';

      try {
        const client = await ensureSupabaseClient();
        if (!client) throw Error('Reviews backend is unavailable offline.');
        const { error } = await client.from('reviews').insert({
          user_id: session?.user?.id || null,
          author_name: name,
          rating,
          comment,
          service_name: serviceName,
          source: 'site',
          status: 'pending'
        });
        if (error) {
          if (/PGRST205|Could not find the table/i.test(error.message || '') || error.code === 'PGRST205') {
            statusEl.textContent = 'Online review submissions finish activating once the database review update (supabase/round5-repair.sql) is applied.';
            statusEl.classList.add('err');
            return;
          }
          throw error;
        }
        localStorage.setItem('faith_last_review_ts', String(Date.now()));
        statusEl.textContent = 'Thank you! Your review was received and will appear once Faith approves it.';
        statusEl.classList.add('ok');
        form.reset();
      } catch (err) {
        statusEl.textContent = 'Could not submit review right now: ' + (err.message || 'Please try again.');
        statusEl.classList.add('err');
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }
}

/* ---------------- Gallery Lookbook Modal ---------------- */
function wireLookbookModal() {
  const dlg = $('#lookbook-dialog');
  if (!dlg) return;

  const openItem = idx => {
    const item = LOOKBOOK_ITEMS[Number(idx)];
    if (!item) return;
    const imgSrc = currentImages[item.slot] || defaults[item.slot]?.src || item.fallbackSrc;
    const customUrl = isSafeHttpUrl(settings[item.settingKey]);
    const destUrl = customUrl || item.fallbackUrl;
    const destLabel = customUrl ? 'Open specific post ↗' : `${item.fallbackLabel} ↗`;

    if ($('#lookbook-title')) $('#lookbook-title').textContent = item.title;
    const imgEl = $('#lookbook-img');
    if (imgEl) {
      imgEl.src = imgSrc;
      imgEl.alt = item.title;
    }
    if ($('#lookbook-caption')) $('#lookbook-caption').textContent = item.desc;
    if ($('#lookbook-meta')) $('#lookbook-meta').textContent = `Recommended service: ${item.serviceLabel}`;

    const bookBtn = $('#lookbook-book-btn');
    if (bookBtn) {
      bookBtn.dataset.bookService = item.service;
      bookBtn.href = `#book?service=${encodeURIComponent(item.service)}`;
      bookBtn.textContent = `Book ${SERVICES[item.service]?.name || 'this look'} →`;
      bookBtn.onclick = () => {
        selectedService = item.service;
        activeBooking = null;
        if (dlg.open) dlg.close();
      };
    }

    const socialLink = $('#lookbook-social-link');
    if (socialLink) {
      socialLink.href = destUrl;
      socialLink.textContent = destLabel;
    }

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', 'open');
  };

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-lookbook-idx]');
    if (!trigger) return;
    e.preventDefault();
    openItem(trigger.dataset.lookbookIdx);
  });

  $('#lookbook-close')?.addEventListener('click', () => {
    if (dlg.open) dlg.close();
  });
  dlg.addEventListener('click', e => {
    if (e.target === dlg && dlg.open) dlg.close();
  });
}

/* ---------------- First-Party Booking + Cal.com Embed + Deposit Proof ---------------- */
function loadCalEmbedScript(origin = 'https://app.cal.com') {
  const scriptSrc = origin === 'https://cal.com' ? 'https://app.cal.com/embed/embed.js' : `${origin}/embed/embed.js`;
  if (calScriptPromise) return calScriptPromise;
  calScriptPromise = new Promise((resolve, reject) => {
    if (window.Cal && window.Cal.loaded) { resolve(window.Cal); return; }
    (function (C, A, L) {
      const p = function (a, ar) { a.q.push(ar); };
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const sc = d.createElement('script');
          sc.src = A;
          sc.async = true;
          sc.onload = () => resolve(C.Cal);
          sc.onerror = reject;
          d.head.appendChild(sc);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, scriptSrc, 'init');
    window.Cal('init', 'faith', { origin: origin === 'https://cal.com' ? 'https://app.cal.com' : origin });
    setTimeout(() => resolve(window.Cal), 2500);
  });
  return calScriptPromise;
}

function updateBookingStepPills(step) {
  $$('.book-step-pill').forEach(pill => {
    const n = +pill.dataset.bstep;
    pill.classList.toggle('on', n === step);
    pill.classList.toggle('done', n < step);
  });
}

function renderBookingChoices() {
  const container = $('#book-choices');
  if (container) {
    const mainKeys = ['retwist', 'all3', 'reattach', 'fullhead', 'treatment'];
    container.innerHTML = mainKeys.map(k => {
      const s = SERVICES[k];
      const dep = getDepositAmount(k);
      return `<button type="button" class="book-choice ${selectedService === k ? 'on' : ''}" data-pick-service="${k}">
        <div class="book-choice-top"><h3>${escapeHtml(s.name)}</h3><span class="bc-price">${escapeHtml(s.price)}</span></div>
        <p>${escapeHtml(s.meta)}</p>
        <div class="bc-meta">${formatMoney(dep)} deposit toward total</div>
      </button>`;
    }).join('');
  }
  const mobBtn = $('#book-mobile-btn');
  if (mobBtn) {
    mobBtn.classList.toggle('on', selectedService === 'mobile');
    const mobDep = $('#book-mobile-dep');
    if (mobDep) mobDep.textContent = `${formatMoney(getDepositAmount('mobile'))} deposit · +$20 under 30 min / +$35 over 30 min`;
  }
}

function renderBookingServiceOptions() {
  const box = $('#booking-service-options');
  if (!box) return;
  const svc = SERVICES[selectedService] || SERVICES.retwist;
  let html = `<h3>Customize your ${escapeHtml(svc.name)} request</h3>`;

  if (selectedService === 'retwist') {
    html += `
      <div class="fp-addons-grid">
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Wash (+$15, +15 min)" data-price="15"> <span><b>Wash</b> · +$15 (+15 min)</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Detox (+$20, +30 min)" data-price="20"> <span><b>Detox</b> · +$20 (+30 min)</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Attachment (+$10)" data-price="10"> <span><b>Attachment</b> · +$10</span></label>
      </div>
    `;
  } else if (selectedService === 'all3') {
    html += `<p class="fp-sms-note">Includes Shampoo &amp; Wash, Retwist, Style, and Hot Towel Facial ($85 · about 2 hr 15 min).</p>`;
  } else if (selectedService === 'reattach') {
    html += `
      <div class="manual-proof-grid">
        <label class="m-field">
          Approximate loc count *
          <select id="fp-loc-tier">
            <option value="1–5 Locs ($10/loc)">1–5 Locs ($10/loc)</option>
            <option value="6–10 Locs ($8/loc)">6–10 Locs ($8/loc)</option>
            <option value="11–20 Locs (Starting at $100)">11–20 Locs (Starting at $100)</option>
            <option value="21+ Locs (Starting at $150)">21+ Locs (Starting at $150)</option>
            <option value="Full-Head Reattachment (From $250, Wash Included)">Full-Head Reattachment (From $250, Wash Included)</option>
          </select>
        </label>
        <div class="m-field">
          <span>Consultation photos</span>
          <span class="fp-sms-note">Reattachments require photos before your appointment. You can upload them in <a href="#account" style="color:var(--pink-deep);text-decoration:underline;font-weight:700">My Account</a> right after submitting.</span>
        </div>
      </div>
      <div class="fp-addons-grid">
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Wash (+$15)" data-price="15"> <span><b>Wash</b> · +$15</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Style (+$25)" data-price="25"> <span><b>Style</b> · +$25</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Wash + Style (+$35)" data-price="35"> <span><b>Wash + Style</b> · +$35</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Preparation (+$100, +2 hr)" data-price="100"> <span><b>Preparation (+2 hr, if unprepped)</b> · +$100</span></label>
      </div>
    `;
  } else if (selectedService === 'fullhead') {
    html += `
      <p class="fp-sms-note">Full-Head Reattachment starts at $250 and includes a Wash. Please upload current hair &amp; loc photos in <a href="#account" style="color:var(--pink-deep);text-decoration:underline;font-weight:700">My Account</a> after requesting your date.</p>
      <div class="fp-addons-grid">
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Style (+$25)" data-price="25"> <span><b>Add Style</b> · +$25</span></label>
        <label class="fp-check"><input type="checkbox" name="fp_addon" value="Preparation (+$100, +2 hr)" data-price="100"> <span><b>Preparation (+2 hr, if unprepped)</b> · +$100</span></label>
      </div>
    `;
  } else if (selectedService === 'treatment') {
    html += `
      <label class="m-field">
        Choose treatment *
        <select id="fp-treatment-type">
          <option value="Hot oil treatment (15 min · $30)">Hot oil · 15 min — $30</option>
          <option value="Facial / scalp massage (35 min · $55)">Facial / scalp massage · 35 min — $55</option>
          <option value="Deep conditioning (45 min · $70)">Deep conditioning · 45 min — $70</option>
        </select>
      </label>
    `;
  } else if (selectedService === 'mobile') {
    html += `
      <div class="manual-proof-grid">
        <label class="m-field">
          Service you want during your mobile visit *
          <select id="fp-mobile-base">
            <option value="Retwist + Style ($70)">Retwist + Style ($70)</option>
            <option value="All 3 ($85)">All 3 ($85)</option>
            <option value="Loc Reattachments ($10/loc+)">Loc Reattachments ($10/loc+)</option>
            <option value="Full-Head Reattachment (From $250)">Full-Head Reattachment (From $250)</option>
            <option value="Treatments ($30+)">Treatments ($30+)</option>
          </select>
        </label>
        <label class="m-field">
          Drive distance from Central Phoenix *
          <select id="fp-mobile-tier">
            <option value="Under 30 minutes away (+$20)">Under 30 min from Central Phoenix (+$20)</option>
            <option value="Over 30 minutes away (+$35)">Over 30 min from Central Phoenix (+$35)</option>
          </select>
        </label>
      </div>
    `;
  }

  box.innerHTML = html;
  box.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', updateBookingSummaryStrip);
  });
  updateBookingSummaryStrip();
}

function getPostedWindowForDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return DEFAULT_HOURS_WINDOWS[dt.getUTCDay()] || null;
}

function validatePreferredDateTime(dateStr, timeStr) {
  if (!dateStr) return { ok: false, message: 'Choose your preferred appointment date.' };
  const todayStr = phoenixTodayString();
  if (dateStr < todayStr) {
    return { ok: false, message: 'Please choose today or a future date.' };
  }
  const win = getPostedWindowForDate(dateStr);
  if (!timeStr) {
    return {
      ok: false,
      message: win ? `Posted hours for ${win.label}: ${win.text}. Pick a preferred start time.` : 'Choose your preferred start time.'
    };
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return { ok: false, message: 'Enter a valid time.' };
  }
  const mins = hh * 60 + mm;
  if (win && (mins < win.startMin || mins > win.endMin)) {
    return {
      ok: false,
      message: `${win.label} posted studio hours are ${win.text}. Pick a time within studio hours, or text Faith at (480) 806-7675 for special timing.`
    };
  }
  return {
    ok: true,
    message: win ? `${win.label} posted hours: ${win.text}. Faith confirms exact availability when reviewing your request.` : ''
  };
}

function buildBookingSelectionDetails() {
  const svc = SERVICES[selectedService] || SERVICES.retwist;
  const addons = [...document.querySelectorAll('#booking-service-options input[name="fp_addon"]:checked')].map(i => i.value);
  let detailLabel = svc.name;
  let depositServiceKey = selectedService;

  if (selectedService === 'reattach') {
    const tier = $('#fp-loc-tier')?.value || '1–5 Locs ($10/loc)';
    detailLabel = `${svc.name} · ${tier}`;
  } else if (selectedService === 'treatment') {
    const tr = $('#fp-treatment-type')?.value || 'Hot oil treatment ($30)';
    detailLabel = `Treatment · ${tr}`;
  } else if (selectedService === 'mobile') {
    const base = $('#fp-mobile-base')?.value || 'Retwist + Style ($70)';
    const tier = $('#fp-mobile-tier')?.value || 'Under 30 minutes away (+$20)';
    detailLabel = `Mobile Visit · ${base} · ${tier}`;
    if (/Reattachment/i.test(base)) depositServiceKey = 'reattach';
  }
  if (addons.length) detailLabel += ` + ${addons.join(', ')}`;

  return {
    serviceDisplay: detailLabel,
    depositAmount: getDepositAmount(depositServiceKey),
    addons
  };
}

function updateBookingSummaryStrip() {
  const summaryTitle = $('#fp-summary-title');
  const summarySub = $('#fp-summary-sub');
  const summaryDep = $('#fp-summary-deposit');
  const info = buildBookingSelectionDetails();
  const dateVal = $('#book-date')?.value || '';
  const timeVal = $('#book-time')?.value || '';
  let whenPart = 'Pick your preferred date & time';
  if (dateVal && timeVal) {
    const iso = `${dateVal}T${timeVal}:00`;
    whenPart = formatDateTime(iso) || `${dateVal} ${timeVal}`;
  } else if (dateVal) {
    whenPart = dateVal;
  }
  if (summaryTitle) summaryTitle.textContent = info.serviceDisplay;
  if (summarySub) summarySub.textContent = `${whenPart} · Status on submit: Pending Faith’s confirmation & deposit`;
  if (summaryDep) summaryDep.textContent = `${formatMoney(info.depositAmount)} deposit`;
}

function updateHoursHintUI() {
  const dateInput = $('#book-date');
  const timeInput = $('#book-time');
  const hint = $('#book-hours-hint');
  if (!hint) return;
  const dateVal = dateInput?.value || '';
  const timeVal = timeInput?.value || '';
  if (!dateVal) {
    hint.className = 'fp-hours-hint';
    hint.textContent = 'Posted hours: Mon, Wed, Fri–Sun 8 AM–11:30 PM · Thu 8 AM–11:45 PM · Tue 11 PM–11:30 PM. Faith confirms your exact slot after reviewing your request.';
    return;
  }
  const check = validatePreferredDateTime(dateVal, timeVal || '12:00');
  const win = getPostedWindowForDate(dateVal);
  if (timeVal && !check.ok) {
    hint.className = 'fp-hours-hint warn';
    hint.textContent = check.message;
  } else {
    hint.className = 'fp-hours-hint';
    hint.textContent = win
      ? `${win.label} posted hours: ${win.text}. Requests stay Pending until Faith confirms availability & deposit.`
      : 'Requests stay Pending until Faith confirms availability & deposit.';
  }
  updateBookingSummaryStrip();
}

async function mountBookingStep2() {
  const svc = SERVICES[selectedService] || SERVICES.retwist;
  const target = normalizeCalTarget(settings.cal_com_url, settings[svc.slugKey]);
  const fpSection = $('#first-party-booking-section');
  const calSection = $('#cal-live-section');
  const proofSection = $('#deposit-proof-step');

  if (activeBooking) {
    if (fpSection) fpSection.hidden = true;
    if (calSection) calSection.hidden = true;
    if (proofSection) proofSection.hidden = false;
    updateBookingStepPills(3);
    return;
  }

  if (proofSection) proofSection.hidden = true;
  updateBookingStepPills(2);

  if (!target) {
    if (calSection) calSection.hidden = true;
    if (fpSection) fpSection.hidden = false;
    renderBookingServiceOptions();
    const dateInput = $('#book-date');
    if (dateInput) dateInput.min = phoenixTodayString();
    updateHoursHintUI();
    return;
  }

  // Optional Cal.com embed once Faith configures cal_com_url in Admin Settings
  if (fpSection) fpSection.hidden = true;
  if (calSection) calSection.hidden = false;
  const fallbackLink = $('#cal-direct-link');
  if (fallbackLink) fallbackLink.href = target.fullUrl;

  const targetKey = `${target.origin}|${target.calLink}`;
  const mount = $('#cal-embed-mount');
  if (!mount) return;
  if (lastMountedCalTarget === targetKey && mount.children.length > 0) return;
  lastMountedCalTarget = targetKey;
  mount.innerHTML = '';

  try {
    await loadCalEmbedScript(target.origin);
    const ns = window.Cal?.ns?.faith || window.Cal;
    if (!ns) return;
    ns('inline', {
      elementOrSelector: '#cal-embed-mount',
      calLink: target.calLink,
      layout: 'month_view'
    });
    ns('ui', {
      theme: 'light',
      hideEventTypeDetails: false,
      layout: 'month_view',
      cssVarsPerTheme: {
        light: { 'cal-brand': '#9E1457' },
        dark: { 'cal-brand': '#FF6BB5' }
      }
    });
    if (!calListenerWired) {
      calListenerWired = true;
      const onBooked = e => handleCalBookingSuccess(e?.detail?.data || e?.detail || e || {});
      ns('on', { action: 'bookingSuccessful', callback: onBooked });
      ns('on', { action: 'bookingSuccessfulV2', callback: onBooked });
    }
  } catch (err) {
    console.warn('Cal.com embed fallback:', err);
  }
}

function renderBookingScreen() {
  if (location.hash.startsWith('#book')) {
    const qs = location.hash.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    const svcParam = params.get('service');
    if (svcParam && SERVICES[svcParam]) {
      selectedService = svcParam;
    }
    if (params.get('proof') === '1') {
      const form = $('#manual-proof-form');
      if (form) {
        form.hidden = false;
        $('#manual-proof-toggle')?.setAttribute('aria-expanded', 'true');
        setTimeout(() => $('#manual-proof-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
    }
  }
  renderBookingChoices();
  if (location.hash.startsWith('#book')) {
    mountBookingStep2();
  }
}

async function insertBookingRecord(record) {
  const client = await ensureSupabaseClient();
  if (!client) throw Error('Booking backend is temporarily unavailable.');

  const payload = {
    id: record.id,
    client_name: record.client_name || '',
    client_email: record.client_email,
    client_phone: record.client_phone || '',
    service_name: record.service_name,
    appointment_time: record.appointment_time || null,
    appointment_label: record.appointment_label || '',
    deposit_amount: record.deposit_amount,
    status: 'pending_deposit',
    source: round5SchemaReady ? (record.source || 'site_request') : (record.source === 'cal_com' ? 'cal_com' : 'manual_proof'),
    cal_booking_uid: record.cal_booking_uid || null,
    proof_path: record.proof_path || null,
    proof_uploaded_at: record.proof_uploaded_at || null,
    notes: record.notes || ''
  };

  if (round5SchemaReady) {
    if (session?.user?.id) payload.user_id = session.user.id;
    payload.email_updates_opt_in = !!record.email_updates_opt_in;
    payload.sms_updates_opt_in = false;
  }

  let res = await client.from('bookings').insert(payload);
  if (res.error && round5SchemaReady) {
    // Safe fallback if site_settings flag outran DDL
    const fallbackPayload = { ...payload };
    delete fallbackPayload.user_id;
    delete fallbackPayload.email_updates_opt_in;
    delete fallbackPayload.sms_updates_opt_in;
    if (fallbackPayload.source === 'site_request') fallbackPayload.source = 'manual_proof';
    res = await client.from('bookings').insert(fallbackPayload);
  }
  if (res.error) throw Error(res.error.message || 'Could not save booking request.');

  // Save lightweight local summary ONLY for authenticated client's own device display if owner-scoped SELECT column is pending
  if (session?.user?.id) {
    try {
      const cacheKey = LOCAL_BOOKINGS_CACHE_PREFIX + session.user.id;
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      existing.unshift({
        id: record.id,
        service_name: record.service_name,
        appointment_time: record.appointment_time,
        appointment_label: record.appointment_label,
        deposit_amount: record.deposit_amount,
        status: 'pending_deposit',
        proof_path: record.proof_path || null,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(cacheKey, JSON.stringify(existing.slice(0, 15)));
    } catch { /* ignore */ }
  }
}

async function handleCalBookingSuccess(payload) {
  const booking = payload?.booking || payload || {};
  const attendee = Array.isArray(booking.attendees) ? booking.attendees[0] : (booking.attendee || {});
  const name = attendee?.name || booking?.name || payload?.name || '';
  const email = attendee?.email || booking?.email || payload?.email || '';
  const phone = attendee?.phoneNumber || booking?.smsReminderNumber || booking?.phone || payload?.phone || '';
  const startTime = booking?.startTime || booking?.start || payload?.date || payload?.startTime || null;
  const eventTitle = booking?.title || payload?.eventType?.title || SERVICES[selectedService]?.name || 'Appointment';
  const uid = booking?.uid || payload?.uid || null;
  const depositAmount = getDepositAmount(selectedService);
  const bookingId = (crypto?.randomUUID) ? crypto.randomUUID() : ('b-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));

  activeBooking = {
    id: bookingId,
    name: name || 'Client',
    email: email || '',
    phone: phone || '',
    service: eventTitle,
    timeIso: startTime,
    timeLabel: startTime ? formatDateTime(startTime) : 'Scheduled in Cal.com',
    depositAmount,
    source: 'cal_com',
    savedToDb: false
  };

  if (live && email) {
    try {
      await insertBookingRecord({
        id: bookingId,
        client_name: name || '',
        client_email: email,
        client_phone: phone || '',
        service_name: eventTitle,
        appointment_time: startTime || null,
        appointment_label: activeBooking.timeLabel,
        deposit_amount: depositAmount,
        source: 'cal_com',
        cal_booking_uid: uid,
        email_updates_opt_in: true
      });
      activeBooking.savedToDb = true;
    } catch (err) {
      console.warn('Could not save Cal.com booking row yet:', err.message || err);
    }
  }

  showDepositProofStep(activeBooking);
}

window.FAITH_BOOKING_HOOK = {
  getConfig: () => ({
    calUrl: settings.cal_com_url || '',
    schemaReady: realSiteSchemaReady,
    repairSchemaReady: round5SchemaReady,
    bookingMode: normalizeCalTarget(settings.cal_com_url) ? 'cal_com' : 'first_party_request'
  })
};

function showDepositProofStep(info) {
  const fpSection = $('#first-party-booking-section');
  const calSection = $('#cal-live-section');
  const proofSection = $('#deposit-proof-step');
  if (fpSection) fpSection.hidden = true;
  if (calSection) calSection.hidden = true;
  if (proofSection) proofSection.hidden = false;
  updateBookingStepPills(3);

  const sum = $('#proof-booking-summary');
  if (sum) {
    sum.innerHTML = `
      <div><b>${escapeHtml(info.service)}</b></div>
      <div>${escapeHtml(info.timeLabel)}</div>
      <div>${escapeHtml(info.name)}${info.email ? ' · ' + escapeHtml(info.email) : ''}${info.phone ? ' · ' + escapeHtml(info.phone) : ''}</div>
      <div style="margin-top:4px;font-size:12.5px;color:var(--pink-deep);font-weight:700">Status: Pending confirmation &amp; deposit verification</div>
    `;
  }
  const amt = $('#proof-deposit-amt');
  if (amt) amt.textContent = formatMoney(info.depositAmount);
  const st = $('#proof-upload-status');
  if (st) { st.textContent = ''; st.className = 'proof-status'; }
  const prev = $('#proof-upload-preview');
  if (prev) { prev.hidden = true; prev.src = ''; }
  proofSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function uploadProofFileToBucket(bookingId, file) {
  if (!isImageFile(file)) throw Error('Please choose an image file (JPG, PNG, WEBP, or HEIC screenshot).');
  if (file.size > MAX_PROOF_BYTES) throw Error('Screenshot is over 10 MB. Please choose a smaller image.');
  const client = await ensureSupabaseClient();
  if (!client) throw Error('Deposit uploads are temporarily unavailable. Please text Faith at (480) 806-7675.');
  const ext = safeFileExt(file.name);
  const path = `${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await client.storage.from('deposit-proofs').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false
  });
  if (up.error) throw Error(up.error.message || 'Upload could not complete. Please try again or text Faith at (480) 806-7675.');
  return path;
}

function wireBookingInteractions() {
  document.addEventListener('click', e => {
    const bookCta = e.target.closest('[data-book-service]');
    if (bookCta) {
      const k = bookCta.dataset.bookService;
      if (SERVICES[k]) {
        selectedService = k;
        activeBooking = null;
        if (location.hash.startsWith('#book')) {
          renderBookingChoices();
          mountBookingStep2();
        }
      }
    }
    const pickBtn = e.target.closest('[data-pick-service]');
    if (pickBtn) {
      const k = pickBtn.dataset.pickService;
      if (SERVICES[k]) {
        selectedService = k;
        activeBooking = null;
        renderBookingChoices();
        mountBookingStep2();
      }
    }
  });

  $('#book-date')?.addEventListener('change', updateHoursHintUI);
  $('#book-time')?.addEventListener('change', updateHoursHintUI);

  const reqForm = $('#booking-request-form');
  if (reqForm) {
    reqForm.onsubmit = async e => {
      e.preventDefault();
      const st = $('#book-request-status');
      const submitBtn = $('#book-request-submit');
      if (!st) return;
      st.className = 'proof-status';

      const dateVal = $('#book-date')?.value || '';
      const timeVal = $('#book-time')?.value || '';
      const check = validatePreferredDateTime(dateVal, timeVal);
      if (!check.ok) {
        st.textContent = check.message;
        st.classList.add('err');
        updateHoursHintUI();
        return;
      }

      const name = ($('#book-name')?.value || '').trim();
      const email = ($('#book-email')?.value || '').trim();
      const phone = ($('#book-phone')?.value || '').trim();
      const notes = ($('#book-notes')?.value || '').trim();
      const emailOptIn = !!$('#book-email-consent')?.checked;

      if (!name || !email || !phone) {
        st.textContent = 'Enter your name, email, and phone number.';
        st.classList.add('err');
        return;
      }

      const sel = buildBookingSelectionDetails();
      const localIso = new Date(`${dateVal}T${timeVal}:00`).toISOString();
      const timeLabel = formatDateTime(`${dateVal}T${timeVal}:00`) || `${dateVal} ${timeVal}`;
      const bookingId = (crypto?.randomUUID) ? crypto.randomUUID() : ('r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));

      if (submitBtn) submitBtn.disabled = true;
      st.textContent = 'Saving your appointment request…';

      try {
        await insertBookingRecord({
          id: bookingId,
          client_name: name,
          client_email: email,
          client_phone: phone,
          service_name: sel.serviceDisplay,
          appointment_time: localIso,
          appointment_label: timeLabel,
          deposit_amount: sel.depositAmount,
          source: 'site_request',
          notes,
          email_updates_opt_in: emailOptIn
        });

        activeBooking = {
          id: bookingId,
          name,
          email,
          phone,
          service: sel.serviceDisplay,
          timeIso: localIso,
          timeLabel,
          depositAmount: sel.depositAmount,
          source: 'site_request',
          savedToDb: true
        };

        st.textContent = '';
        showDepositProofStep(activeBooking);
        if (session?.user?.id) loadClientBookings();
      } catch (err) {
        st.textContent = 'Could not submit request: ' + (err.message || 'Please try again.');
        st.classList.add('err');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };
  }

  // Post-request deposit proof file upload
  const postInput = $('#proof-file-input');
  if (postInput) {
    postInput.addEventListener('change', async () => {
      const file = postInput.files?.[0];
      if (!file || !activeBooking) return;
      const st = $('#proof-upload-status');
      const prev = $('#proof-upload-preview');
      st.className = 'proof-status';
      if (!isImageFile(file)) { st.textContent = 'Images only (JPG, PNG, WEBP, or HEIC).'; st.classList.add('err'); return; }
      if (file.size > MAX_PROOF_BYTES) { st.textContent = 'File is over 10 MB. Please choose a smaller screenshot.'; st.classList.add('err'); return; }

      if (prev) { prev.src = URL.createObjectURL(file); prev.hidden = false; }
      st.textContent = 'Uploading your screenshot privately to Faith…';
      try {
        const proofPath = await uploadProofFileToBucket(activeBooking.id, file);
        const client = await ensureSupabaseClient();
        if (activeBooking.savedToDb) {
          const rpc = await client.rpc('attach_deposit_proof', {
            p_booking_id: activeBooking.id,
            p_proof_path: proofPath
          });
          if (rpc.error) throw Error(rpc.error.message);
        } else {
          await insertBookingRecord({
            id: activeBooking.id,
            client_name: activeBooking.name,
            client_email: activeBooking.email || 'client@pending.local',
            client_phone: activeBooking.phone || '',
            service_name: activeBooking.service,
            appointment_time: activeBooking.timeIso || null,
            appointment_label: activeBooking.timeLabel,
            deposit_amount: activeBooking.depositAmount,
            source: activeBooking.source || 'site_request',
            proof_path: proofPath,
            proof_uploaded_at: new Date().toISOString()
          });
          activeBooking.savedToDb = true;
        }
        st.textContent = 'Screenshot received! Faith will review it and confirm your appointment.';
        st.classList.add('ok');
      } catch (err) {
        st.textContent = 'Could not upload yet: ' + (err.message || 'Please try again or text Faith.');
        st.classList.add('err');
      }
    });
  }

  // Skip upload button
  const skipBtn = $('#proof-skip-btn');
  if (skipBtn) {
    skipBtn.onclick = () => {
      const st = $('#proof-upload-status');
      if (st) {
        st.className = 'proof-status ok';
        st.textContent = 'Saved as Pending confirmation & deposit. Send your screenshot anytime from My Account or the form below.';
      }
    };
  }

  // Book another button
  const resetBtn = $('#proof-book-another');
  if (resetBtn) {
    resetBtn.onclick = () => {
      activeBooking = null;
      lastMountedCalTarget = '';
      renderBookingScreen();
    };
  }

  // Toggle "Already booked? Send your deposit proof" form
  const manualToggle = $('#manual-proof-toggle');
  const manualForm = $('#manual-proof-form');
  if (manualToggle && manualForm) {
    manualToggle.onclick = () => {
      manualForm.hidden = !manualForm.hidden;
      manualToggle.setAttribute('aria-expanded', String(!manualForm.hidden));
    };
  }

  if (manualForm) {
    const fileInput = $('#manual-proof-file');
    const prevImg = $('#manual-proof-preview');
    if (fileInput && prevImg) {
      fileInput.addEventListener('change', () => {
        const f = fileInput.files?.[0];
        if (f && isImageFile(f)) {
          prevImg.src = URL.createObjectURL(f);
          prevImg.hidden = false;
        } else {
          prevImg.hidden = true;
        }
      });
    }

    manualForm.onsubmit = async e => {
      e.preventDefault();
      const st = $('#manual-proof-status');
      const submitBtn = $('#manual-proof-submit');
      st.className = 'proof-status';
      const email = $('#manual-proof-email').value.trim();
      const name = $('#manual-proof-name').value.trim();
      const svcKey = $('#manual-proof-service').value || 'retwist';
      const file = fileInput?.files?.[0];
      if (!email) { st.textContent = 'Enter the email you used when requesting your appointment.'; st.classList.add('err'); return; }
      if (!file) { st.textContent = 'Choose your payment screenshot first.'; st.classList.add('err'); return; }
      if (!isImageFile(file)) { st.textContent = 'Images only (JPG, PNG, WEBP, or HEIC).'; st.classList.add('err'); return; }
      if (file.size > MAX_PROOF_BYTES) { st.textContent = 'Screenshot is over 10 MB. Please upload a smaller image.'; st.classList.add('err'); return; }

      submitBtn.disabled = true;
      st.textContent = 'Uploading screenshot privately…';
      try {
        const bookingId = (crypto?.randomUUID) ? crypto.randomUUID() : ('m-' + Date.now());
        const proofPath = await uploadProofFileToBucket(bookingId, file);
        const svc = SERVICES[svcKey] || SERVICES.retwist;
        await insertBookingRecord({
          id: bookingId,
          client_name: name || '',
          client_email: email,
          client_phone: '',
          service_name: svc.name,
          appointment_time: null,
          appointment_label: 'Deposit proof upload',
          deposit_amount: getDepositAmount(svcKey),
          source: 'manual_proof',
          proof_path: proofPath,
          proof_uploaded_at: new Date().toISOString()
        });
        st.textContent = 'Deposit proof sent! Faith will review it and confirm your spot.';
        st.classList.add('ok');
        manualForm.reset();
        if (prevImg) prevImg.hidden = true;
        if (session?.user?.id) loadClientBookings();
      } catch (err) {
        st.textContent = 'Could not send proof yet: ' + (err.message || 'Please try again or text Faith at (480) 806-7675.');
        st.classList.add('err');
      } finally {
        submitBtn.disabled = false;
      }
    };
  }
}

/* ---------------- Customer Account (#account) ---------------- */
function setClientAuthMode(mode) {
  const linkForm = $('#client-signin-form');
  const otpDetails = $('#client-otp-details');
  const pwForm = $('#client-password-form');
  $$('[data-client-auth-mode]').forEach(b => b.classList.toggle('on', b.dataset.clientAuthMode === mode));
  if (linkForm) linkForm.hidden = mode !== 'link';
  if (otpDetails) otpDetails.hidden = mode !== 'link';
  if (pwForm) pwForm.hidden = mode !== 'password';
}

function renderClientPhotos(rows = [], note = '') {
  const grid = $('#client-photo-grid');
  if (!grid) return;
  if (!rows.length) {
    grid.innerHTML = `<p style="font-size:13px;color:var(--dmuted)">${escapeHtml(note || 'No photos uploaded yet.')}</p>`;
    return;
  }
  grid.replaceChildren(...rows.map(item => {
    const fig = document.createElement('figure');
    fig.className = 'client-photo-item';
    const img = document.createElement('img');
    img.src = item.public_url;
    img.alt = item.caption || item.category || 'Client loc photo';
    const cap = document.createElement('figcaption');
    const txt = document.createElement('span');
    txt.textContent = (item.caption || item.category || 'Photo').slice(0, 48);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Remove';
    del.onclick = async () => {
      del.disabled = true;
      await sb.from('client_photos').delete().eq('id', item.id);
      if (item.storage_path) {
        try { await sb.storage.from('client-photos').remove([item.storage_path]); } catch { /* ignore */ }
      }
      loadClientPhotos();
    };
    cap.append(txt, del);
    fig.append(img, cap);
    return fig;
  }));
}

async function loadClientPhotos() {
  if (!sb || !session?.user?.id) { renderClientPhotos([]); return; }
  try {
    const { data, error } = await sb
      .from('client_photos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    renderClientPhotos(data || []);
  } catch {
    renderClientPhotos([], 'Could not load photos right now.');
  }
}

function renderClientBookings(rows = [], note = '') {
  const list = $('#client-appointments-list');
  const st = $('#client-bookings-status');
  if (!list) return;
  if (st) st.textContent = note;
  if (!rows.length) {
    list.innerHTML = '<p style="font-size:13.5px;color:var(--dmuted)">No appointments under this account yet. Request a visit on the Booking page and it will appear here.</p>';
    return;
  }
  list.replaceChildren(...rows.map(row => {
    const isConfirmed = row.status === 'confirmed';
    const hasProof = !!row.proof_path;
    const badgeText = isConfirmed
      ? 'Confirmed'
      : (hasProof ? 'Proof received · awaiting Faith' : 'Pending confirmation & deposit');
    const badgeClass = isConfirmed ? 'ok' : 'warn';
    const whenText = row.appointment_time
      ? formatDateTime(row.appointment_time)
      : (row.appointment_label || 'Pending date');

    const card = document.createElement('article');
    card.className = 'client-appt-row';
    card.innerHTML = `
      <div class="client-appt-top">
        <div>
          <b>${escapeHtml(row.service_name || 'Appointment')}</b>
          <span>${escapeHtml(whenText)} · ${formatMoney(row.deposit_amount)} deposit</span>
        </div>
        <span class="status-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
      </div>
    `;

    if (row.client_change_request) {
      const chg = document.createElement('p');
      chg.className = 'fp-sms-note';
      chg.textContent = `Requested change: “${row.client_change_request}”`;
      card.append(chg);
    }

    const actions = document.createElement('div');
    actions.className = 'client-appt-actions';

    if (!isConfirmed && !hasProof) {
      const proofBtn = document.createElement('a');
      proofBtn.href = '#book?proof=1';
      proofBtn.className = 'btn btn-dark btn-sm';
      proofBtn.textContent = 'Upload deposit proof';
      actions.append(proofBtn);
    }

    if (round5SchemaReady && row.id && !row.localOnly) {
      const chgBtn = document.createElement('button');
      chgBtn.type = 'button';
      chgBtn.className = 'btn-line-sm';
      chgBtn.textContent = 'Request reschedule / cancel';
      chgBtn.onclick = async () => {
        const noteBox = card.querySelector('.chg-box');
        if (noteBox) { noteBox.hidden = !noteBox.hidden; return; }
        const wrap = document.createElement('form');
        wrap.className = 'chg-box';
        wrap.innerHTML = `
          <label class="m-field">Note for Faith (24+ hrs notice keeps deposit)
            <input type="text" required minlength="3" maxlength="300" placeholder="e.g., Move to Friday afternoon or cancel">
          </label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button type="submit" class="btn btn-primary btn-sm">Send note</button>
            <span class="proof-status" role="status"></span>
          </div>
        `;
        wrap.onsubmit = async ev => {
          ev.preventDefault();
          const inp = wrap.querySelector('input');
          const msgEl = wrap.querySelector('.proof-status');
          const txt = inp?.value.trim() || '';
          if (txt.length < 3) return;
          const { data, error } = await sb.rpc('request_client_booking_change', {
            p_booking_id: row.id,
            p_note: txt
          });
          if (error || data !== true) {
            if (msgEl) { msgEl.textContent = 'Could not save note; please text Faith at (480) 806-7675.'; msgEl.classList.add('err'); }
            return;
          }
          await loadClientBookings();
        };
        card.append(wrap);
      };
      actions.append(chgBtn);
    } else {
      const textBtn = document.createElement('a');
      textBtn.href = 'sms:+14808067675';
      textBtn.className = 'btn-line-sm';
      textBtn.textContent = 'Text Faith to reschedule';
      actions.append(textBtn);
    }

    card.append(actions);
    return card;
  }));
}

async function loadClientBookings() {
  if (!sb || !session?.user?.id) {
    renderClientBookings([]);
    return;
  }
  const cacheKey = LOCAL_BOOKINGS_CACHE_PREFIX + session.user.id;
  let localRows = [];
  try {
    localRows = JSON.parse(localStorage.getItem(cacheKey) || '[]').map(r => ({ ...r, localOnly: true }));
  } catch { localRows = []; }

  try {
    const { data, error } = await sb
      .from('bookings')
      .select('id,service_name,appointment_time,appointment_label,deposit_amount,status,proof_path,client_change_request,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    const rows = data || [];
    renderClientBookings(rows, rows.length ? 'Live appointment status synced to your account.' : '');
    return;
  } catch {
    if (localRows.length) {
      renderClientBookings(localRows, 'Showing requests placed from this browser while account booking history finishes syncing (supabase/round5-repair.sql pending).');
    } else {
      renderClientBookings([], 'Booking requests you submit while signed in appear here once account history sync (supabase/round5-repair.sql) is applied.');
    }
  }
}

async function loadClientProfile() {
  if (!sb || !session?.user?.id) return;
  const emailPref = $('#client-pref-email');
  const smsPref = $('#client-pref-sms');
  const nameInput = $('#client-prof-name');
  const phoneInput = $('#client-prof-phone');
  const svcSelect = $('#client-prof-service');
  const notesInput = $('#client-prof-notes');
  const statusEl = $('#client-profile-status');

  // Prefill from auth metadata or device cache first
  const meta = session.user.user_metadata || {};
  if (nameInput && !nameInput.value && meta.full_name) nameInput.value = meta.full_name;
  if (phoneInput && !phoneInput.value && meta.phone) phoneInput.value = meta.phone;

  // Also prefill booking contact form if currently blank
  if ($('#book-email') && !$('#book-email').value && session.user.email) $('#book-email').value = session.user.email;
  if ($('#manual-proof-email') && !$('#manual-proof-email').value && session.user.email) $('#manual-proof-email').value = session.user.email;

  try {
    const { data, error } = await sb
      .from('client_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      if (nameInput) nameInput.value = data.full_name || '';
      if (phoneInput) phoneInput.value = data.phone || '';
      if (svcSelect && data.preferred_service) svcSelect.value = data.preferred_service;
      if (notesInput) notesInput.value = data.notes || '';
      if (emailPref) emailPref.checked = data.email_updates_opt_in !== false;
      if (smsPref) smsPref.checked = !!data.sms_updates_opt_in;
      if ($('#book-name') && !$('#book-name').value && data.full_name) $('#book-name').value = data.full_name;
      if ($('#book-phone') && !$('#book-phone').value && data.phone) $('#book-phone').value = data.phone;
      if ($('#manual-proof-name') && !$('#manual-proof-name').value && data.full_name) $('#manual-proof-name').value = data.full_name;
    }
  } catch (err) {
    if (statusEl && /PGRST205|Could not find the table/i.test(err?.message || '')) {
      statusEl.textContent = 'Profile sync finishes activating once supabase/round5-repair.sql is applied.';
    }
  }
}

async function refreshClientAccountView() {
  const loading = $('#client-auth-loading');
  const outBox = $('#client-signed-out');
  const inBox = $('#client-signed-in');
  const badge = $('#client-signed-badge');
  const signOutBtn = $('#client-signout');

  if (loading) loading.hidden = !authCallbackInFlight;
  if (authCallbackInFlight) {
    if (outBox) outBox.hidden = true;
    if (inBox) inBox.hidden = true;
    return;
  }

  const signedIn = !!session?.user;
  if (outBox) outBox.hidden = signedIn;
  if (inBox) inBox.hidden = !signedIn;
  if (signOutBtn) signOutBtn.hidden = !signedIn;
  if (badge) {
    badge.textContent = signedIn
      ? `Signed in as ${session.user.email || 'client'} · Session saved`
      : 'Free email sign-in · Session stays signed in';
  }

  if (authCallbackError && authCallbackError.target === 'account') {
    const st = $('#client-auth-status');
    if (st) { st.textContent = authCallbackError.message; st.className = 'proof-status err'; }
    authCallbackError = null;
  }

  if (signedIn) {
    await Promise.all([loadClientProfile(), loadClientBookings(), loadClientPhotos()]);
  } else {
    renderClientPhotos([]);
    renderClientBookings([]);
  }
}

function wireClientAccount() {
  if (clientBooted) return;
  clientBooted = true;

  $$('[data-client-auth-mode]').forEach(btn => {
    btn.onclick = () => setClientAuthMode(btn.dataset.clientAuthMode || 'link');
  });

  const sendBtn = $('#client-send-btn');
  resumeCooldownIfActive(sendBtn, 'Send sign-in link', 'faith_client_cooldown_until', 'client');

  $('#client-signin-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-auth-status');
    const email = ($('#client-email-input')?.value || '').trim();
    if (!email || !st) return;
    st.className = 'proof-status';
    const client = await ensureSupabaseClient();
    if (!client) { st.textContent = 'Account sign-in is temporarily unavailable.'; st.classList.add('err'); return; }

    st.textContent = 'Sending your sign-in link…';
    if (sendBtn) sendBtn.disabled = true;
    try { sessionStorage.setItem('faith_auth_target', 'account'); } catch { /* ignore */ }

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: location.origin + '/?auth_target=account',
        shouldCreateUser: true
      }
    });
    if (error) {
      st.textContent = humanAuthError(error);
      st.classList.add('err');
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
    st.textContent = `Check ${email} and tap the sign-in button in that email. You will return right to My Account and stay signed in.`;
    st.classList.add('ok');
    startButtonCooldown(sendBtn, 'Send sign-in link', 'faith_client_cooldown_until', 60, 'client');
  });

  $('#client-otp-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-auth-status');
    const email = ($('#client-email-input')?.value || '').trim();
    const token = ($('#client-otp-input')?.value || '').trim();
    if (!email || !token || !st) {
      if (st) { st.textContent = 'Enter your email above and the 6-digit code.'; st.classList.add('err'); }
      return;
    }
    const client = await ensureSupabaseClient();
    st.textContent = 'Verifying code…';
    const { error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      st.textContent = humanAuthError(error);
      st.classList.add('err');
    } else {
      st.textContent = 'Signed in!';
      st.classList.add('ok');
    }
  });

  $('#client-password-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-auth-status');
    const email = ($('#client-pw-email')?.value || '').trim();
    const password = $('#client-pw-password')?.value || '';
    if (!email || !password || !st) return;
    st.className = 'proof-status';
    const client = await ensureSupabaseClient();
    st.textContent = 'Signing in…';
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      st.textContent = humanAuthError(error);
      st.classList.add('err');
      return;
    }
    st.textContent = 'Signed in!';
    st.classList.add('ok');
  });

  $('#client-pw-signup-btn')?.addEventListener('click', async () => {
    const st = $('#client-auth-status');
    const email = ($('#client-pw-email')?.value || '').trim();
    const password = $('#client-pw-password')?.value || '';
    if (!email || password.length < 8) {
      if (st) {
        st.textContent = 'Enter your email and a password of at least 8 characters to create your account.';
        st.className = 'proof-status err';
      }
      return;
    }
    const client = await ensureSupabaseClient();
    try { sessionStorage.setItem('faith_auth_target', 'account'); } catch { /* ignore */ }
    st.className = 'proof-status';
    st.textContent = 'Creating account…';
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: location.origin + '/?auth_target=account' }
    });
    if (error) {
      st.textContent = humanAuthError(error);
      st.classList.add('err');
      return;
    }
    if (data?.session) {
      st.textContent = 'Account created and signed in!';
      st.classList.add('ok');
    } else {
      st.textContent = `Confirmation email sent to ${email}. Tap the link in that email once to activate your account.`;
      st.classList.add('ok');
    }
  });

  $('#client-signout')?.addEventListener('click', async () => {
    const client = await ensureSupabaseClient();
    await client?.auth.signOut();
    session = null;
    await refreshGlobalAuth();
  });

  $('#client-profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-profile-status');
    if (!sb || !session?.user?.id || !st) return;
    st.className = 'proof-status';
    const fullName = ($('#client-prof-name')?.value || '').trim();
    const phone = ($('#client-prof-phone')?.value || '').trim();
    const prefSvc = $('#client-prof-service')?.value || 'retwist';
    const notes = ($('#client-prof-notes')?.value || '').trim();
    const emailOpt = !!$('#client-pref-email')?.checked;
    const smsOpt = !!$('#client-pref-sms')?.checked;

    st.textContent = 'Saving profile…';
    try {
      const payload = {
        user_id: session.user.id,
        full_name: fullName,
        phone,
        preferred_service: prefSvc,
        email_updates_opt_in: emailOpt,
        sms_updates_opt_in: smsOpt,
        sms_consent_at: smsOpt ? new Date().toISOString() : null,
        notes,
        updated_at: new Date().toISOString()
      };
      const { error } = await sb.from('client_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        if (/PGRST205|Could not find the table/i.test(error.message || '')) {
          st.textContent = 'Profile saving finishes activating once supabase/round5-repair.sql is applied.';
          st.classList.add('err');
          return;
        }
        throw error;
      }
      st.textContent = smsOpt
        ? 'Saved! Your SMS opt-in preference is recorded (no texts are sent while automated SMS is off).'
        : 'Profile & notification preferences saved!';
      st.classList.add('ok');
    } catch (err) {
      st.textContent = 'Could not save profile: ' + (err.message || 'Try again.');
      st.classList.add('err');
    }
  });

  $('#client-set-password-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-set-pw-status');
    const pw = $('#client-new-password')?.value || '';
    if (!sb || !session?.user || !st) return;
    st.className = 'proof-status';
    if (pw.length < 8) {
      st.textContent = 'Use at least 8 characters.';
      st.classList.add('err');
      return;
    }
    st.textContent = 'Saving password…';
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) {
      st.textContent = humanAuthError(error);
      st.classList.add('err');
      return;
    }
    $('#client-new-password').value = '';
    st.textContent = 'Password saved! Next time you can sign in with email + password in one tap.';
    st.classList.add('ok');
  });

  $('#client-book-usual-btn')?.addEventListener('click', () => {
    const pref = $('#client-prof-service')?.value || 'retwist';
    selectedService = SERVICES[pref] ? pref : 'retwist';
    activeBooking = null;
    location.hash = `#book?service=${encodeURIComponent(selectedService)}`;
  });

  $('#client-photo-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#client-upload-status');
    const fileInput = $('#client-photo-file');
    const files = [...(fileInput?.files || [])];
    if (!st) return;
    st.className = 'proof-status';
    if (!sb || !session?.user?.id) {
      st.textContent = 'Sign in above before uploading photos.';
      st.classList.add('err');
      return;
    }
    if (!files.length) {
      st.textContent = 'Choose one or more image files first.';
      st.classList.add('err');
      return;
    }
    const category = $('#client-photo-cat')?.value || 'consultation';
    const caption = ($('#client-photo-cap')?.value || '').trim().slice(0, 200);
    st.textContent = `Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`;

    try {
      for (const f of files) {
        if (!isImageFile(f)) throw Error('Images only (JPG, PNG, WEBP, or HEIC).');
        if (f.size > MAX_CLIENT_PHOTO_BYTES) throw Error('Each photo must be under 10 MB.');
        const ext = safeFileExt(f.name);
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await sb.storage.from('client-photos').upload(path, f, {
          contentType: f.type || 'image/jpeg',
          upsert: false
        });
        if (up.error) throw Error(up.error.message);
        const publicUrl = sb.storage.from('client-photos').getPublicUrl(path).data.publicUrl;
        const ins = await sb.from('client_photos').insert({
          user_id: session.user.id,
          user_email: session.user.email || '',
          category,
          caption,
          storage_path: path,
          public_url: publicUrl
        });
        if (ins.error) throw Error(ins.error.message);
      }
      if (fileInput) fileInput.value = '';
      if ($('#client-photo-cap')) $('#client-photo-cap').value = '';
      st.textContent = 'Uploaded! Faith can review these consultation photos in Studio Admin.';
      st.classList.add('ok');
      await loadClientPhotos();
    } catch (err) {
      st.textContent = 'Upload failed: ' + (err.message || 'Please try again.');
      st.classList.add('err');
    }
  });
}

/* ---------------- KLAS-Style Studio Admin ---------------- */
function setAdminTab(tab) {
  const valid = ['home', 'deposits', 'reviews', 'decisions', 'photos', 'settings'];
  currentAdminTab = valid.includes(tab) ? tab : 'home';
  $$('.admin-tab').forEach(b => b.classList.toggle('on', b.dataset.adminTab === currentAdminTab));
  $$('.admin-panel').forEach(p => p.classList.toggle('on', p.id === 'admin-panel-' + currentAdminTab));
}

function getDecisionsProgress() {
  const keys = ['brand_logo', 'studio_hours', 'reattach_pricing', 'booking_calendar'];
  let done = 0;
  keys.forEach(k => {
    const val = decisionAnswers[k];
    if (val && typeof val === 'object' && Object.values(val).some(v => String(v ?? '').trim().length > 0)) done++;
  });
  return { done, total: keys.length };
}

function renderAdminHome() {
  const hasCal = !!normalizeCalTarget(settings.cal_com_url);
  const customPhotoCount = Object.keys(currentImages).length;
  const hasPhotos = customPhotoCount > 0;
  const decProg = getDecisionsProgress();
  const decisionsDone = decProg.done >= decProg.total;
  const pendingCount = bookingsList.filter(b => b.status === 'pending_deposit').length;
  const pendingReviewsCount = reviewsListAdmin.filter(r => r.status === 'pending').length;

  const setGs = (id, done) => {
    const el = $('#' + id);
    if (!el) return;
    el.classList.toggle('done', done);
    const tick = el.querySelector('.gs-tick');
    if (tick) tick.textContent = done ? '✓' : '○';
  };
  setGs('gs-cal', true); // First-party request form is already live; Cal.com is optional upgrade
  setGs('gs-photos', hasPhotos);
  setGs('gs-decisions', decisionsDone);

  const nextText = $('#admin-next-step-text');
  const nextBtn = $('#admin-next-step-btn');
  if (nextText && nextBtn) {
    if (!realSiteSchemaReady) {
      nextText.textContent = 'Apply supabase/real-site.sql in Supabase so bookings, deposit proofs, and settings save live.';
      nextBtn.textContent = 'Check Settings';
      nextBtn.onclick = () => setAdminTab('settings');
    } else if (pendingCount > 0) {
      nextText.textContent = `Review ${pendingCount} ${pendingCount === 1 ? 'booking' : 'bookings'} waiting on deposit confirmation.`;
      nextBtn.textContent = 'Open Deposits';
      nextBtn.onclick = () => setAdminTab('deposits');
    } else if (pendingReviewsCount > 0) {
      nextText.textContent = `Moderate ${pendingReviewsCount} new client ${pendingReviewsCount === 1 ? 'review' : 'reviews'} waiting for approval.`;
      nextBtn.textContent = 'Open Reviews';
      nextBtn.onclick = () => setAdminTab('reviews');
    } else if (!round5SchemaReady) {
      nextText.textContent = 'Have Claude apply supabase/round5-repair.sql in Supabase to enable client profiles, owner-scoped booking history, and review moderation.';
      nextBtn.textContent = 'View Settings';
      nextBtn.onclick = () => setAdminTab('settings');
    } else if (!decisionsDone) {
      nextText.textContent = `Answer the ${decProg.total - decProg.done} remaining studio decision${decProg.total - decProg.done === 1 ? '' : 's'} (logo, hours, prices, calendar).`;
      nextBtn.textContent = 'Open Decisions';
      nextBtn.onclick = () => setAdminTab('decisions');
    } else {
      nextText.textContent = 'First-party booking requests, client accounts, deposit proofs, and studio photos are active.';
      nextBtn.textContent = 'View Deposits';
      nextBtn.onclick = () => setAdminTab('deposits');
    }
  }

  const calEl = $('#conn-cal-status');
  if (calEl) {
    calEl.className = 'status-pill ok';
    calEl.textContent = hasCal ? 'Cal.com live' : 'First-party active';
  }
  const calNote = $('#conn-cal-note');
  if (calNote) {
    calNote.textContent = hasCal
      ? `Cal.com embed live at ${normalizeCalTarget(settings.cal_com_url).fullUrl}`
      : 'Clients submit booking requests directly on this site. Paste a Cal.com URL in Settings if you want live calendar slots.';
  }

  const phEl = $('#conn-photos-status');
  if (phEl) {
    phEl.className = 'status-pill ' + (hasPhotos ? 'ok' : 'muted');
    phEl.textContent = hasPhotos ? `${customPhotoCount} added` : 'Starter photos';
  }
  const phNote = $('#conn-photos-note');
  if (phNote) {
    phNote.textContent = hasPhotos
      ? `${customPhotoCount} custom studio photo${customPhotoCount === 1 ? '' : 's'} live on the site.`
      : 'Your portfolio starter photos are live; swap any photo anytime in Photos.';
  }

  const authEl = $('#conn-auth-status');
  if (authEl) {
    authEl.className = 'status-pill ok';
    authEl.textContent = 'Working';
  }

  const depEl = $('#conn-deposits-status');
  const depNote = $('#conn-deposits-note');
  if (depEl && depNote) {
    depEl.className = 'status-pill ' + (realSiteSchemaReady ? 'ok' : 'warn');
    depEl.textContent = realSiteSchemaReady ? 'Ready' : 'Setup needed';
    depNote.textContent = realSiteSchemaReady
      ? 'Private screenshot storage and deposit confirmation list are active.'
      : 'Run supabase/real-site.sql in Supabase to enable private deposit proofs and booking storage.';
  }

  const pBadge = $('#admin-pending-badge');
  if (pBadge) {
    pBadge.textContent = String(pendingCount);
    pBadge.hidden = pendingCount === 0;
  }
  const rBadge = $('#admin-reviews-badge');
  if (rBadge) {
    rBadge.textContent = String(pendingReviewsCount);
    rBadge.hidden = pendingReviewsCount === 0;
  }
  const dBadge = $('#admin-decisions-badge');
  if (dBadge) {
    const remaining = decProg.total - decProg.done;
    dBadge.textContent = String(remaining);
    dBadge.hidden = remaining === 0;
  }
}

/* ---------------- Admin Deposits & Client Consultation Photos ---------------- */
async function loadAdminBookings() {
  const list = $('#admin-deposits-list');
  const st = $('#admin-deposits-status');
  if (!sb || !session || !isAdminVerified) return;
  if (st) st.textContent = 'Loading bookings…';
  try {
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    bookingsList = data || [];
    bookingsList.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending_deposit' ? -1 : 1;
      const ta = a.appointment_time ? new Date(a.appointment_time).getTime() : new Date(a.created_at).getTime();
      const tb = b.appointment_time ? new Date(b.appointment_time).getTime() : new Date(b.created_at).getTime();
      return a.status === 'pending_deposit' ? ta - tb : tb - ta;
    });
    if (st) {
      const pend = bookingsList.filter(b => b.status === 'pending_deposit').length;
      st.textContent = bookingsList.length
        ? `${pend} pending deposit · ${bookingsList.length - pend} confirmed`
        : 'No bookings or deposit proofs yet.';
    }
    renderDepositsList();
    renderAdminHome();
  } catch (err) {
    bookingsList = [];
    if (st) st.textContent = 'Bookings table not active yet (apply supabase/real-site.sql in Supabase).';
    if (list) list.innerHTML = '<p>Once <code>supabase/real-site.sql</code> is applied in Supabase, client bookings and uploaded deposit screenshots appear here automatically.</p>';
    renderAdminHome();
  }
}

async function loadAdminClientPhotos() {
  const list = $('#admin-client-photos-list');
  const st = $('#admin-client-photos-status');
  if (!sb || !session || !isAdminVerified || !list) return;
  try {
    const { data, error } = await sb
      .from('client_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    clientPhotosAdmin = data || [];
    if (st) st.textContent = clientPhotosAdmin.length ? `${clientPhotosAdmin.length} client photo(s) uploaded.` : 'No client consultation photos uploaded yet.';
    if (!clientPhotosAdmin.length) {
      list.innerHTML = '<p style="color:var(--muted)">Client hair consultation and inspo photos uploaded in My Account appear here.</p>';
      return;
    }
    list.replaceChildren(...clientPhotosAdmin.map(p => {
      const card = document.createElement('div');
      card.className = 'slot-card';
      card.innerHTML = `
        <img src="${escapeHtml(p.public_url)}" alt="${escapeHtml(p.caption || p.category || 'Client photo')}">
        <div>
          <b style="display:block;font-size:12.5px">${escapeHtml(p.category || 'consultation')}</b>
          <span style="font-size:11.5px;color:var(--dmuted);display:block">${escapeHtml(p.user_email || 'Signed-in client')}</span>
          ${p.caption ? `<span style="font-size:11.5px;color:var(--dark);display:block;margin-top:2px">${escapeHtml(p.caption)}</span>` : ''}
        </div>
      `;
      return card;
    }));
  } catch {
    if (st) st.textContent = 'Could not load client photos.';
  }
}

function renderDepositsList() {
  const list = $('#admin-deposits-list');
  if (!list) return;
  const rows = bookingsList.filter(b => depositFilter === 'all' ? true : b.status === depositFilter);
  if (!rows.length) {
    list.innerHTML = `<p style="color:var(--muted)">No ${depositFilter === 'all' ? '' : depositFilter.replace('_', ' ') + ' '}bookings yet.</p>`;
    return;
  }
  list.replaceChildren(...rows.map(row => {
    const isConfirmed = row.status === 'confirmed';
    const card = document.createElement('article');
    card.className = 'dep-row ' + (isConfirmed ? 'confirmed' : 'pending');

    const whenText = row.appointment_time
      ? formatDateTime(row.appointment_time)
      : (row.appointment_label || 'Deposit proof upload');

    const sourceLabel = row.source === 'cal_com'
      ? 'Cal.com'
      : (row.source === 'site_request' ? 'Site request' : 'Booking / proof form');

    card.innerHTML = `
      <div class="dep-row-top">
        <div class="dep-row-who">
          <b>${escapeHtml(row.client_name || row.client_email)}</b>
          <span>${escapeHtml(row.client_email)}${row.client_phone ? ' · ' + escapeHtml(row.client_phone) : ''}</span>
        </div>
        <span class="status-pill ${isConfirmed ? 'ok' : 'warn'}">${isConfirmed ? 'Confirmed' : 'Pending deposit'}</span>
      </div>
      <div class="dep-row-meta">
        <span><b>Service:</b> ${escapeHtml(row.service_name)}</span>
        <span><b>Time:</b> ${escapeHtml(whenText)}</span>
        <span><b>Deposit:</b> ${formatMoney(row.deposit_amount)}</span>
        <span><b>Source:</b> ${escapeHtml(sourceLabel)}</span>
      </div>
      ${row.notes ? `<div class="dep-row-meta"><span><b>Client notes:</b> ${escapeHtml(row.notes)}</span></div>` : ''}
      ${row.client_change_request ? `<div class="dep-row-meta"><span style="color:var(--pink-chrome)"><b>Reschedule/cancel note:</b> ${escapeHtml(row.client_change_request)}</span></div>` : ''}
    `;

    if (isConfirmed && (row.confirmed_by || row.confirmed_at)) {
      const audit = document.createElement('div');
      audit.className = 'dep-audit';
      audit.textContent = `Marked paid by ${row.confirmed_by || 'admin'}${row.confirmed_at ? ' · ' + formatDateTime(row.confirmed_at) : ''}`;
      card.append(audit);
    }

    const actions = document.createElement('div');
    actions.className = 'dep-row-actions';

    if (row.proof_path) {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn-admin-ghost';
      viewBtn.textContent = 'View proof screenshot';
      viewBtn.onclick = () => openProofScreenshot(row);
      actions.append(viewBtn);
    } else {
      const noProof = document.createElement('span');
      noProof.style.fontSize = '12.5px';
      noProof.style.color = 'var(--muted)';
      noProof.textContent = 'No screenshot uploaded yet';
      actions.append(noProof);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = isConfirmed ? 'btn-admin-ghost' : 'btn-admin-primary';
    toggleBtn.textContent = isConfirmed ? 'Undo' : 'Mark deposit paid';
    toggleBtn.onclick = async () => {
      toggleBtn.disabled = true;
      const nextStatus = isConfirmed ? 'pending_deposit' : 'confirmed';
      const patch = nextStatus === 'confirmed'
        ? { status: 'confirmed', confirmed_by: session.user.email || 'admin', confirmed_at: new Date().toISOString() }
        : { status: 'pending_deposit', confirmed_by: null, confirmed_at: null };
      const { error } = await sb.from('bookings').update(patch).eq('id', row.id);
      if (error) {
        alert('Could not update booking: ' + error.message);
        toggleBtn.disabled = false;
        return;
      }
      await loadAdminBookings();
    };
    actions.append(toggleBtn);
    card.append(actions);
    return card;
  }));
}

async function openProofScreenshot(row) {
  const dlg = $('#proof-dialog');
  const img = $('#proof-dialog-img');
  const st = $('#proof-dialog-status');
  if (!dlg || !img || !st) return;
  img.hidden = true;
  img.src = '';
  st.textContent = 'Loading private screenshot…';
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', 'open');

  const { data, error } = await sb.storage.from('deposit-proofs').createSignedUrl(row.proof_path, 120);
  if (error || !data?.signedUrl) {
    st.textContent = 'Could not load screenshot: ' + (error?.message || 'File not found');
    return;
  }
  st.textContent = `${row.client_name || row.client_email} · ${row.service_name} · ${formatMoney(row.deposit_amount)}`;
  img.src = data.signedUrl;
  img.hidden = false;
}

/* ---------------- Admin Reviews Moderation ---------------- */
async function loadAdminReviews() {
  const list = $('#admin-reviews-list');
  const st = $('#admin-reviews-status');
  if (!sb || !session || !isAdminVerified || !list) return;
  if (st) st.textContent = 'Loading reviews…';
  try {
    const { data, error } = await sb
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    reviewsListAdmin = data || [];
    reviewsListAdmin.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    const pend = reviewsListAdmin.filter(r => r.status === 'pending').length;
    if (st) st.textContent = `${pend} pending moderation · ${reviewsListAdmin.filter(r => r.status === 'approved').length} approved`;
    renderAdminReviewsList();
    renderAdminHome();
  } catch (err) {
    reviewsListAdmin = [];
    if (st) st.textContent = 'Review moderation activates once supabase/round5-repair.sql is applied in Supabase.';
    list.innerHTML = '<p style="color:var(--muted)">Until <code>supabase/round5-repair.sql</code> runs, the two verified GlossGenius reviews (Syd &amp; sosa) display from verified snapshot data.</p>';
    renderAdminHome();
  }
}

function renderAdminReviewsList() {
  const list = $('#admin-reviews-list');
  if (!list) return;
  const rows = reviewsListAdmin.filter(r => reviewAdminFilter === 'all' ? true : r.status === reviewAdminFilter);
  if (!rows.length) {
    list.innerHTML = `<p style="color:var(--muted)">No ${reviewAdminFilter === 'all' ? '' : reviewAdminFilter + ' '}reviews.</p>`;
    return;
  }
  list.replaceChildren(...rows.map(row => {
    const card = document.createElement('article');
    card.className = 'dep-row ' + (row.status === 'approved' ? 'confirmed' : 'pending');
    const pillClass = row.status === 'approved' ? 'ok' : (row.status === 'rejected' ? 'muted' : 'warn');
    card.innerHTML = `
      <div class="dep-row-top">
        <div class="dep-row-who">
          <b>${escapeHtml(row.author_name)} · ${escapeHtml(renderStarsString(row.rating))}</b>
          <span>${escapeHtml(row.service_name || 'Studio service')} · ${escapeHtml(row.source === 'glossgenius_import' ? 'Imported from GlossGenius' : 'Submitted on site')} · ${escapeHtml(formatReviewDate(row.created_at))}</span>
        </div>
        <span class="status-pill ${pillClass}">${escapeHtml(row.status)}</span>
      </div>
      <p style="margin:0;color:var(--cream)">${row.comment ? '“' + escapeHtml(row.comment) + '”' : '(5-star rating with no written comment)'}</p>
    `;
    const actions = document.createElement('div');
    actions.className = 'dep-row-actions';

    if (row.status !== 'approved') {
      const appBtn = document.createElement('button');
      appBtn.type = 'button';
      appBtn.className = 'btn-admin-primary';
      appBtn.textContent = 'Approve & Publish';
      appBtn.onclick = async () => {
        appBtn.disabled = true;
        await sb.from('reviews').update({
          status: 'approved',
          reviewed_by: session.user.email || 'admin',
          reviewed_at: new Date().toISOString()
        }).eq('id', row.id);
        await Promise.all([loadAdminReviews(), loadPublicReviews().then(renderPublicReviews)]);
      };
      actions.append(appBtn);
    }

    if (row.status !== 'rejected') {
      const rejBtn = document.createElement('button');
      rejBtn.type = 'button';
      rejBtn.className = 'btn-admin-ghost';
      rejBtn.textContent = 'Hide';
      rejBtn.onclick = async () => {
        rejBtn.disabled = true;
        await sb.from('reviews').update({
          status: 'rejected',
          reviewed_by: session.user.email || 'admin',
          reviewed_at: new Date().toISOString()
        }).eq('id', row.id);
        await Promise.all([loadAdminReviews(), loadPublicReviews().then(renderPublicReviews)]);
      };
      actions.append(rejBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-admin-ghost';
    delBtn.textContent = 'Delete';
    delBtn.onclick = async () => {
      delBtn.disabled = true;
      await sb.from('reviews').delete().eq('id', row.id);
      await Promise.all([loadAdminReviews(), loadPublicReviews().then(renderPublicReviews)]);
    };
    actions.append(delBtn);

    card.append(actions);
    return card;
  }));
}

/* ---------------- Admin Decisions (4 Only + 12 Read-only Defaults) ---------------- */
function renderLogoShortlist() {
  const wrap = $('#admin-logo-shortlist');
  if (!wrap) return;
  const allLogos = window.FAITH_LOGOS || [];
  const shortlist = LOGO_SHORTLIST_IDS.map(id => allLogos.find(l => l.id === id)).filter(Boolean);
  if (!shortlist.length) return;

  wrap.replaceChildren(...shortlist.map((logo, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'logo-choice-card' + (selectedLogoId === logo.id ? ' on' : '');
    btn.innerHTML = `
      <div class="logo-choice-stage">${logo.svg}</div>
      <div class="logo-choice-meta">#${idx + 1} · ${escapeHtml(logo.name)}</div>
      <div class="logo-choice-note">${escapeHtml(logo.note || '')}</div>
    `;
    btn.onclick = () => {
      selectedLogoId = logo.id;
      localStorage.setItem('faith_logo_preview', logo.id);
      if (window.FAITH_LOGO_API) window.FAITH_LOGO_API.apply(logo.id);
      renderLogoShortlist();
    };
    return btn;
  }));
}

function renderReadonlyDefaults() {
  const wrap = $('#admin-defaults-list');
  if (!wrap) return;
  wrap.innerHTML = READONLY_DEFAULTS.map(d =>
    `<div class="default-item"><b>${escapeHtml(d.title)}</b><span>${escapeHtml(d.value)}</span></div>`
  ).join('');
}

function hydrateDecisionForms() {
  const logoAns = decisionAnswers.brand_logo || {};
  if (logoAns.logo_id) selectedLogoId = logoAns.logo_id;
  if ($('#dec-logo-note')) $('#dec-logo-note').value = logoAns.logo_note || '';
  if ($('#dec-logo-status')) $('#dec-logo-status').textContent = logoAns.logo_name ? `Saved: ${logoAns.logo_name}` : '';
  renderLogoShortlist();

  const hoursAns = decisionAnswers.studio_hours || {};
  $$('[data-dec-hours]').forEach(inp => {
    inp.value = hoursAns[inp.dataset.decHours] || '';
  });
  if ($('#dec-hours-status')) {
    const hasH = Object.values(hoursAns).some(v => String(v || '').trim().length > 0);
    $('#dec-hours-status').textContent = hasH ? 'Saved' : '';
  }

  const priceAns = decisionAnswers.reattach_pricing || {};
  if (priceAns.full_head_price) {
    const rad = $(`input[name="dec_reattach_full"][value="${priceAns.full_head_price}"]`);
    if (rad) rad.checked = true;
  }
  if (priceAns.prep_required) {
    const rad = $(`input[name="dec_prep_rule"][value="${priceAns.prep_required}"]`);
    if (rad) rad.checked = true;
  }
  if ($('#dec-price-notes')) $('#dec-price-notes').value = priceAns.price_notes || '';
  if ($('#dec-prices-status')) $('#dec-prices-status').textContent = priceAns.full_head_price ? 'Saved' : '';

  const calAns = decisionAnswers.booking_calendar || {};
  if (calAns.calendar_provider) {
    const rad = $(`input[name="dec_cal_choice"][value="${calAns.calendar_provider}"]`);
    if (rad) rad.checked = true;
  }
  if ($('#dec-cal-status')) $('#dec-cal-status').textContent = calAns.calendar_provider ? 'Saved' : '';

  const prog = getDecisionsProgress();
  if ($('#admin-decisions-progress')) $('#admin-decisions-progress').textContent = `${prog.done} / ${prog.total} answered`;
}

async function saveDecisionRow(questionKey, payload, statusSelector) {
  const st = $(statusSelector);
  if (!sb || !session || !isAdminVerified) return false;
  if (st) st.textContent = 'Saving…';
  const { error } = await sb.from('decision_answers').upsert({
    question_key: questionKey,
    answer: payload,
    updated_by: session.user.email || 'admin',
    updated_at: new Date().toISOString()
  });
  if (error) {
    if (st) st.textContent = 'Not saved: ' + error.message;
    return false;
  }
  decisionAnswers[questionKey] = payload;
  if (st) st.textContent = 'Saved!';
  const prog = getDecisionsProgress();
  if ($('#admin-decisions-progress')) $('#admin-decisions-progress').textContent = `${prog.done} / ${prog.total} answered`;
  renderAdminHome();
  return true;
}

async function loadAdminDecisions() {
  if (!sb || !session || !isAdminVerified) return;
  try {
    const { data, error } = await sb.from('decision_answers').select('question_key,answer');
    if (error) throw error;
    decisionAnswers = {};
    (data || []).forEach(r => { decisionAnswers[r.question_key] = r.answer || {}; });
  } catch {
    decisionAnswers = {};
  }
  hydrateDecisionForms();
  renderAdminHome();
}

/* ---------------- Admin Settings & Photos ---------------- */
function hydrateAdminSettingsForm() {
  if ($('#set-cal-url')) $('#set-cal-url').value = settings.cal_com_url || '';
  if ($('#set-cal-retwist')) $('#set-cal-retwist').value = settings.cal_slug_retwist || '';
  if ($('#set-cal-all3')) $('#set-cal-all3').value = settings.cal_slug_all3 || '';
  if ($('#set-cal-reattach')) $('#set-cal-reattach').value = settings.cal_slug_reattach || '';
  if ($('#set-cal-mobile')) $('#set-cal-mobile').value = settings.cal_slug_mobile || '';

  if ($('#set-pay-cashapp')) $('#set-pay-cashapp').value = settings.pay_cashapp || '';
  if ($('#set-pay-venmo')) $('#set-pay-venmo').value = settings.pay_venmo || '';
  if ($('#set-pay-zelle')) $('#set-pay-zelle').value = settings.pay_zelle || '(480) 806-7675';
  if ($('#set-pay-applepay')) $('#set-pay-applepay').value = settings.pay_applepay || '';
  if ($('#set-pay-other')) $('#set-pay-other').value = settings.pay_other || '';

  if ($('#set-dep-retwist')) $('#set-dep-retwist').value = settings.deposit_retwist || '20';
  if ($('#set-dep-all3')) $('#set-dep-all3').value = settings.deposit_all3 || '20';
  if ($('#set-dep-reattach')) $('#set-dep-reattach').value = settings.deposit_reattach || '50';
  if ($('#set-dep-mobile')) $('#set-dep-mobile').value = settings.deposit_mobile || '20';

  for (let i = 1; i <= 4; i++) {
    if ($('#set-reel-' + i)) $('#set-reel-' + i).value = settings['reel_url_' + i] || '';
    if ($('#set-personal-' + i)) $('#set-personal-' + i).value = settings['personal_url_' + i] || '';
  }
}

function renderSlots() {
  const grid = $('#slot-grid');
  if (!grid) return;
  grid.replaceChildren(...Object.keys(defaults).map(slot => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot-card';
    const img = document.createElement('img');
    img.src = currentImages[slot] || defaults[slot].src;
    img.alt = LABELS[slot] || slot;
    const t = document.createElement('span');
    t.textContent = LABELS[slot] || slot;
    b.append(img, t);
    b.onclick = () => openCropper(slot);
    return b;
  }));
}

let cropState = { slot: null, img: null, zoom: 1, x: 0.5, y: 0.5 };

function openCropper(slot) {
  cropState.slot = slot;
  const r = defaults[slot]?.ratio || 0.8;
  const w = 600;
  const h = Math.max(300, Math.min(900, Math.round(w / r)));
  const c = $('#crop-canvas');
  c.width = w;
  c.height = h;
  $('#crop-title').textContent = 'Replace: ' + (LABELS[slot] || slot);
  $('#cropper').hidden = false;
  $('#crop-status').textContent = '';

  const seen = new Set();
  const lib = $('#crop-lib');
  lib.replaceChildren();
  [...Object.values(currentImages), ...Object.values(defaults).map(d => d.src)].forEach(src => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    const btn = document.createElement('button');
    btn.type = 'button';
    const im = document.createElement('img');
    im.src = src;
    im.alt = 'Library photo';
    btn.append(im);
    btn.onclick = () => loadCropImage(src);
    lib.append(btn);
  });
  loadCropImage(currentImages[slot] || defaults[slot].src);
}

function loadCropImage(src) {
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => {
    cropState.img = im;
    cropState.zoom = 1;
    cropState.x = 0.5;
    cropState.y = 0.5;
    $('#crop-zoom').value = 1;
    $('#crop-x').value = 0.5;
    $('#crop-y').value = 0.5;
    drawCrop();
  };
  im.src = src;
}

function drawCrop() {
  const c = $('#crop-canvas');
  const im = cropState.img;
  if (!c || !im) return;
  const ctx = c.getContext('2d');
  const scale = Math.max(c.width / im.width, c.height / im.height) * cropState.zoom;
  const dw = im.width * scale;
  const dh = im.height * scale;
  const dx = (c.width - dw) * cropState.x;
  const dy = (c.height - dh) * cropState.y;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(im, dx, dy, dw, dh);
}

function wireCropper() {
  if (!$('#crop-zoom')) return;
  $('#crop-zoom').oninput = e => { cropState.zoom = +e.target.value; drawCrop(); };
  $('#crop-x').oninput = e => { cropState.x = +e.target.value; drawCrop(); };
  $('#crop-y').oninput = e => { cropState.y = +e.target.value; drawCrop(); };
  $('#crop-file').onchange = e => {
    const f = e.target.files[0];
    if (f) loadCropImage(URL.createObjectURL(f));
  };
  $('#crop-cancel').onclick = () => { $('#cropper').hidden = true; };

  $('#crop-reset').onclick = async () => {
    if (!sb || !session || !isAdminVerified || !cropState.slot) return;
    $('#crop-status').textContent = 'Restoring original photo…';
    const { error } = await sb.from('site_images').delete().eq('slot', cropState.slot);
    if (error) { $('#crop-status').textContent = 'Not restored: ' + error.message; return; }
    delete currentImages[cropState.slot];
    applySlots();
    renderSlots();
    renderAdminHome();
    $('#cropper').hidden = true;
  };

  $('#crop-save').onclick = async () => {
    if (!sb || !session || !isAdminVerified || !cropState.slot) return;
    $('#crop-status').textContent = 'Saving photo to live site…';
    const blob = await new Promise(res => $('#crop-canvas').toBlob(res, 'image/webp', 0.88));
    const path = `${cropState.slot}-${Date.now()}.webp`;
    const up = await sb.storage.from('site-images').upload(path, blob, { contentType: 'image/webp', upsert: true });
    if (up.error) { $('#crop-status').textContent = 'Not saved: ' + up.error.message; return; }
    const url = sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('site_images').upsert({ slot: cropState.slot, url, updated_at: new Date().toISOString() });
    if (error) { $('#crop-status').textContent = 'Not saved: ' + error.message; return; }
    currentImages[cropState.slot] = url;
    applySlots();
    renderSlots();
    renderAdminHome();
    $('#cropper').hidden = true;
  };
}

/* ---------------- Admin Auth & Wiring ---------------- */
function setAdminAuthMode(mode) {
  const linkForm = $('#signin-form');
  const otpDetails = $('#admin-otp-details');
  const pwForm = $('#admin-password-form');
  $$('[data-admin-auth-mode]').forEach(b => b.classList.toggle('on', b.dataset.adminAuthMode === mode));
  if (linkForm) linkForm.hidden = mode !== 'link';
  if (otpDetails) otpDetails.hidden = mode !== 'link';
  if (pwForm) pwForm.hidden = mode !== 'password';
}

async function refreshAdminView() {
  const loading = $('#admin-auth-loading');
  const gate = $('#admin-signin-gate');
  const app = $('#admin-app');
  const userBar = $('#admin-user-bar');
  const signedEmail = $('#signed-email');
  const notAdminBox = $('#admin-not-authorized');

  if (loading) loading.hidden = !authCallbackInFlight;
  if (authCallbackInFlight) {
    if (gate) gate.hidden = true;
    if (app) app.hidden = true;
    if (notAdminBox) notAdminBox.hidden = true;
    return;
  }

  if (authCallbackError && authCallbackError.target === 'admin') {
    const st = $('#signin-status');
    if (st) st.textContent = authCallbackError.message;
    authCallbackError = null;
  }

  if (!session) {
    isAdminVerified = false;
    if (gate) gate.hidden = false;
    if (app) app.hidden = true;
    if (userBar) userBar.hidden = true;
    if (notAdminBox) notAdminBox.hidden = true;
    return;
  }

  if (signedEmail) signedEmail.textContent = session.user.email || 'Signed in';
  if (userBar) userBar.hidden = false;

  // Verify studio admin privilege via is_studio_admin() RPC (fail closed)
  let allowed = false;
  try {
    const { data, error } = await sb.rpc('is_studio_admin');
    allowed = !error && data === true;
  } catch {
    allowed = false;
  }

  if (allowed) {
    try {
      const check = await sb.from('site_settings').select('key,value');
      if (!check.error && Array.isArray(check.data)) {
        check.data.forEach(r => { settings[r.key] = r.value; });
        realSiteSchemaReady = settings.real_site_schema_ready === 'true';
        round5SchemaReady = settings.round5_repair_schema_ready === 'true';
      }
    } catch { /* keep public settings loaded earlier */ }
  }

  isAdminVerified = allowed;
  if (gate) gate.hidden = true;
  if (notAdminBox) notAdminBox.hidden = allowed;
  if (app) app.hidden = !allowed;

  if (allowed) {
    renderSlots();
    hydrateAdminSettingsForm();
    renderAdminHome();
    await Promise.all([
      loadAdminDecisions(),
      loadAdminBookings(),
      loadAdminReviews(),
      loadAdminClientPhotos()
    ]);
  }
}

async function ensureAdminBooted() {
  if (adminBooted) return;
  adminBooted = true;
  wireCropper();
  renderReadonlyDefaults();

  $$('[data-admin-auth-mode]').forEach(btn => {
    btn.onclick = () => setAdminAuthMode(btn.dataset.adminAuthMode || 'link');
  });

  $$('.admin-tab').forEach(btn => {
    btn.onclick = () => setAdminTab(btn.dataset.adminTab);
  });
  $$('[data-jump-tab]').forEach(btn => {
    btn.onclick = () => setAdminTab(btn.dataset.jumpTab);
  });

  $$('.dep-filter-btn').forEach(btn => {
    btn.onclick = () => {
      depositFilter = btn.dataset.depFilter || 'all';
      $$('.dep-filter-btn').forEach(b => b.classList.toggle('on', b === btn));
      renderDepositsList();
    };
  });
  if ($('#refresh-deposits')) {
    $('#refresh-deposits').onclick = () => { loadAdminBookings(); loadAdminClientPhotos(); };
  }

  $$('.rev-filter-btn').forEach(btn => {
    btn.onclick = () => {
      reviewAdminFilter = btn.dataset.revFilter || 'all';
      $$('.rev-filter-btn').forEach(b => b.classList.toggle('on', b === btn));
      renderAdminReviewsList();
    };
  });
  if ($('#refresh-reviews')) $('#refresh-reviews').onclick = () => loadAdminReviews();

  $$('[data-hours-preset]').forEach(btn => {
    btn.onclick = () => {
      const gg = { hours_mon: '8 AM - 11:30 PM', hours_tue: '11 PM - 11:30 PM', hours_wed: '8 AM - 11:30 PM', hours_thu: '8 AM - 11:45 PM', hours_fri: '8 AM - 11:30 PM', hours_sat: '8 AM - 11:30 PM', hours_sun: '8 AM - 11:30 PM' };
      const ig = { hours_mon: '10 AM - 12 AM', hours_tue: '10 AM - 12 AM', hours_wed: '10 AM - 12 AM', hours_thu: '10 AM - 12 AM', hours_fri: '10 AM - 12 AM', hours_sat: 'By appointment', hours_sun: 'By appointment' };
      const preset = btn.dataset.hoursPreset === 'ig' ? ig : gg;
      Object.entries(preset).forEach(([k, v]) => {
        const inp = $(`[data-dec-hours="${k}"]`);
        if (inp) inp.value = v;
      });
    };
  });

  if ($('#save-dec-logo')) {
    $('#save-dec-logo').onclick = async () => {
      const logoObj = (window.FAITH_LOGOS || []).find(l => l.id === selectedLogoId) || { id: selectedLogoId, name: selectedLogoId };
      const note = ($('#dec-logo-note')?.value || '').trim();
      const ok = await saveDecisionRow('brand_logo', { logo_id: logoObj.id, logo_name: logoObj.name, logo_note: note }, '#dec-logo-status');
      if (ok && sb && session) {
        const { error } = await sb.from('site_settings').upsert({ key: 'active_logo', value: logoObj.id });
        if (!error) {
          settings.active_logo = logoObj.id;
          applyLogoAndPayHandles();
          $('#dec-logo-status').textContent = `Saved & published "${logoObj.name}" to the live site.`;
        }
      }
    };
  }

  if ($('#save-dec-hours')) {
    $('#save-dec-hours').onclick = async () => {
      const payload = {};
      $$('[data-dec-hours]').forEach(inp => { payload[inp.dataset.decHours] = inp.value.trim(); });
      await saveDecisionRow('studio_hours', payload, '#dec-hours-status');
    };
  }

  if ($('#save-dec-prices')) {
    $('#save-dec-prices').onclick = async () => {
      const fullHead = $('input[name="dec_reattach_full"]:checked')?.value || '250';
      const prepReq = $('input[name="dec_prep_rule"]:checked')?.value || 'optional';
      const notes = ($('#dec-price-notes')?.value || '').trim();
      await saveDecisionRow('reattach_pricing', {
        full_head_price: fullHead,
        prep_required: prepReq,
        price_notes: notes
      }, '#dec-prices-status');
    };
  }

  if ($('#save-dec-calendar')) {
    $('#save-dec-calendar').onclick = async () => {
      const provider = $('input[name="dec_cal_choice"]:checked')?.value || 'first_party';
      await saveDecisionRow('booking_calendar', { calendar_provider: provider }, '#dec-cal-status');
    };
  }

  if ($('#cal-settings-form')) {
    $('#cal-settings-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session || !isAdminVerified) return;
      const st = $('#cal-settings-status');
      const rawUrl = $('#set-cal-url').value.trim();
      if (rawUrl && !normalizeCalTarget(rawUrl)) {
        st.textContent = 'Enter a valid Cal.com link (for example https://cal.com/yourname) or leave blank to use the built-in booking form.';
        return;
      }
      st.textContent = 'Saving calendar link…';
      const rows = [
        { key: 'cal_com_url', value: rawUrl },
        { key: 'cal_slug_retwist', value: $('#set-cal-retwist').value.trim() },
        { key: 'cal_slug_all3', value: $('#set-cal-all3').value.trim() },
        { key: 'cal_slug_reattach', value: $('#set-cal-reattach').value.trim() },
        { key: 'cal_slug_mobile', value: $('#set-cal-mobile').value.trim() }
      ];
      const { error } = await sb.from('site_settings').upsert(rows);
      if (error) { st.textContent = 'Not saved: ' + error.message; return; }
      rows.forEach(r => { settings[r.key] = r.value; });
      lastMountedCalTarget = '';
      updateBookCtas();
      renderBookingScreen();
      renderAdminHome();
      st.textContent = rawUrl
        ? 'Saved! Every Book button now uses your embedded Cal.com calendar.'
        : 'Cleared. Book buttons use the built-in first-party appointment request form on this site.';
    };
  }

  if ($('#deposit-settings-form')) {
    $('#deposit-settings-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session || !isAdminVerified) return;
      const st = $('#deposit-settings-status');
      st.textContent = 'Saving deposit settings…';
      const rows = [
        { key: 'pay_cashapp', value: $('#set-pay-cashapp').value.trim() },
        { key: 'pay_venmo', value: $('#set-pay-venmo').value.trim() },
        { key: 'pay_zelle', value: $('#set-pay-zelle').value.trim() },
        { key: 'pay_applepay', value: $('#set-pay-applepay').value.trim() },
        { key: 'pay_other', value: $('#set-pay-other').value.trim() },
        { key: 'deposit_retwist', value: String(Math.max(0, Number($('#set-dep-retwist').value) || 20)) },
        { key: 'deposit_all3', value: String(Math.max(0, Number($('#set-dep-all3').value) || 20)) },
        { key: 'deposit_reattach', value: String(Math.max(0, Number($('#set-dep-reattach').value) || 50)) },
        { key: 'deposit_mobile', value: String(Math.max(0, Number($('#set-dep-mobile').value) || 20)) }
      ];
      const { error } = await sb.from('site_settings').upsert(rows);
      if (error) { st.textContent = 'Not saved: ' + error.message; return; }
      rows.forEach(r => { settings[r.key] = r.value; });
      applyLogoAndPayHandles();
      renderBookingChoices();
      updateBookingSummaryStrip();
      st.textContent = 'Saved! Clients see these pay handles and deposit amounts right after requesting a booking.';
    };
  }

  if ($('#gallery-links-form')) {
    $('#gallery-links-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session || !isAdminVerified) return;
      const st = $('#gallery-links-status');
      const rows = [];
      for (let i = 1; i <= 4; i++) {
        const rv = ($('#set-reel-' + i)?.value || '').trim();
        if (rv && !isSafeHttpUrl(rv)) { st.textContent = `Behind the Chair URL #${i} must start with https://`; return; }
        rows.push({ key: 'reel_url_' + i, value: rv });
        const pv = ($('#set-personal-' + i)?.value || '').trim();
        if (pv && !isSafeHttpUrl(pv)) { st.textContent = `Faith URL #${i} must start with https://`; return; }
        rows.push({ key: 'personal_url_' + i, value: pv });
      }
      st.textContent = 'Saving gallery links…';
      const { error } = await sb.from('site_settings').upsert(rows);
      if (error) { st.textContent = 'Not saved: ' + error.message; return; }
      rows.forEach(r => { settings[r.key] = r.value; });
      applyGalleryCustomLinks();
      st.textContent = 'Saved! Gallery tiles now open any specific post URLs you entered.';
    };
  }

  if ($('#admin-set-password-form')) {
    $('#admin-set-password-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session || !isAdminVerified) return;
      const st = $('#admin-set-pw-status');
      const pw = $('#admin-new-password')?.value || '';
      if (pw.length < 8) { st.textContent = 'Use at least 8 characters.'; return; }
      st.textContent = 'Saving studio password…';
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) { st.textContent = humanAuthError(error); return; }
      $('#admin-new-password').value = '';
      st.textContent = 'Password saved! You can now sign in with email + password in the Password tab.';
    };
  }

  if (!live) {
    if ($('#signin-status')) $('#signin-status').textContent = 'Studio database is not configured.';
    return;
  }

  await ensureSupabaseClient();
  let pendingEmail = '';
  const sendBtn = $('#admin-send-btn');
  resumeCooldownIfActive(sendBtn, 'Send sign-in link', 'faith_admin_cooldown_until', 'admin');

  if ($('#signin-form')) {
    $('#signin-form').onsubmit = async e => {
      e.preventDefault();
      pendingEmail = $('#signin-email').value.trim();
      if (!pendingEmail) return;
      const statusEl = $('#signin-status');
      statusEl.textContent = 'Checking studio admin list…';

      const allowCheck = await sb.rpc('admin_email_allowed', { p_email: pendingEmail });
      if (allowCheck.error) {
        statusEl.textContent = 'Could not verify studio admin list right now. Please try again.';
        return;
      }
      if (allowCheck.data !== true) {
        statusEl.textContent = "That email isn't on the studio admin list.";
        return;
      }

      statusEl.textContent = 'Sending sign-in link…';
      if (sendBtn) sendBtn.disabled = true;
      try { sessionStorage.setItem('faith_auth_target', 'admin'); } catch { /* ignore */ }

      const { error } = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          // Clean path (zero hash!) avoids #admin#access_token double-hash loop
          emailRedirectTo: location.origin + '/admin/',
          shouldCreateUser: true
        }
      });
      if (error) {
        statusEl.textContent = humanAuthError(error);
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
      statusEl.textContent = `Sign-in link sent to ${pendingEmail}. Open the email on this device and tap the sign-in button to return right into Studio Admin.`;
      startButtonCooldown(sendBtn, 'Send sign-in link', 'faith_admin_cooldown_until', 60, 'admin');
    };
  }

  if ($('#admin-password-form')) {
    $('#admin-password-form').onsubmit = async e => {
      e.preventDefault();
      const email = ($('#admin-pw-email')?.value || '').trim();
      const password = $('#admin-pw-input')?.value || '';
      const statusEl = $('#signin-status');
      if (!email || !password || !statusEl) return;

      statusEl.textContent = 'Checking studio admin list…';
      const allowCheck = await sb.rpc('admin_email_allowed', { p_email: email });
      if (allowCheck.error || allowCheck.data !== true) {
        statusEl.textContent = "That email isn't on the studio admin list.";
        return;
      }
      statusEl.textContent = 'Signing in…';
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        statusEl.textContent = humanAuthError(error);
        return;
      }
      statusEl.textContent = 'Signed in!';
      await refreshGlobalAuth();
    };
  }

  if ($('#admin-otp-form')) {
    $('#admin-otp-form').onsubmit = async e => {
      e.preventDefault();
      const email = pendingEmail || $('#signin-email').value.trim();
      const token = $('#admin-otp-code').value.trim();
      if (!email || !token) return;
      $('#signin-status').textContent = 'Verifying code…';
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      $('#signin-status').textContent = error ? humanAuthError(error) : 'Signed in!';
    };
  }

  const doSignOut = async () => {
    await sb?.auth.signOut();
    session = null;
    isAdminVerified = false;
    await refreshGlobalAuth();
  };
  if ($('#signout')) $('#signout').onclick = doSignOut;
  if ($('#admin-not-authorized-signout')) $('#admin-not-authorized-signout').onclick = doSignOut;
}

/* ---------------- Auth Callback Processor & Global Sync ---------------- */
async function refreshGlobalAuth() {
  if (sb && !session) {
    try { session = (await sb.auth.getSession()).data.session; } catch { session = null; }
  }
  await Promise.all([
    refreshAdminView(),
    refreshClientAccountView()
  ]);
}

async function processAuthCallbackOnBoot() {
  if (!live) return;
  const cb = window.__FAITH_AUTH_CALLBACK__;
  const rawHash = cb?.rawHash ?? location.hash ?? '';
  const rawSearch = cb?.rawSearch ?? location.search ?? '';
  const hasCallback = !!cb ||
    /access_token=|refresh_token=|error=|error_code=|type=(magiclink|signup|recovery|email)/i.test(rawHash) ||
    /[?&](code|token_hash|error)=/i.test(rawSearch);

  let target = cb?.target || '';
  if (!target) {
    const sp = new URLSearchParams(rawSearch);
    target = sp.get('auth_target') || '';
  }
  if (!target) {
    try { target = sessionStorage.getItem('faith_auth_target') || ''; } catch { target = ''; }
  }
  if (!target) {
    target = (rawHash.startsWith('#account') || location.hash.startsWith('#account')) ? 'account' : 'admin';
  }
  if (!['admin', 'account'].includes(target)) target = 'admin';

  if (hasCallback) {
    authCallbackInFlight = true;
    await ensureAdminBooted();
    wireClientAccount();
    await refreshGlobalAuth();
  }

  const client = await ensureSupabaseClient();
  if (!client) {
    authCallbackInFlight = false;
    return;
  }

  if (hasCallback) {
    try {
      const searchParams = new URLSearchParams(rawSearch);
      const hashFragment = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
      const cleanHashQuery = hashFragment.includes('#') ? hashFragment.slice(hashFragment.indexOf('#') + 1) : hashFragment;
      const hashParams = new URLSearchParams(cleanHashQuery);

      const errCode = hashParams.get('error_code') || searchParams.get('error_code') || hashParams.get('error') || searchParams.get('error');
      const errDesc = hashParams.get('error_description') || searchParams.get('error_description') || '';

      if (errCode) {
        authCallbackError = {
          target,
          message: humanAuthError(errCode + ' ' + errDesc)
        };
      } else if (searchParams.get('code')) {
        const { data, error } = await client.auth.exchangeCodeForSession(searchParams.get('code'));
        if (error) authCallbackError = { target, message: humanAuthError(error) };
        else session = data?.session || session;
      } else {
        // Trigger supabase-js implicit detection first, then explicitly apply tokens if still missing
        const first = await client.auth.getSession();
        session = first.data?.session || null;
        const at = hashParams.get('access_token');
        const rt = hashParams.get('refresh_token');
        if (!session && at && rt) {
          const setRes = await client.auth.setSession({ access_token: at, refresh_token: rt });
          if (setRes.error) authCallbackError = { target, message: humanAuthError(setRes.error) };
          else session = setRes.data?.session || null;
        }
      }
    } catch (err) {
      authCallbackError = { target, message: humanAuthError(err) };
    } finally {
      authCallbackInFlight = false;
      window.__FAITH_AUTH_CALLBACK__ = null;
      try { sessionStorage.removeItem('faith_auth_target'); } catch { /* ignore */ }
      try { history.replaceState(null, '', '/#' + target); } catch { location.hash = '#' + target; }
      if (typeof window.FAITH_NAVIGATE === 'function') window.FAITH_NAVIGATE(target);
      await refreshGlobalAuth();
    }
    return;
  }

  // No callback — hydrate any persisted existing session quietly
  try {
    const res = await client.auth.getSession();
    session = res.data?.session || null;
  } catch { session = null; }
}

/* ---------------- Temporary Admin Nav Tab ---------------- */
function renderAdminNavLinks() {
  if (!cfg.showAdminTab) return;
  const snav = $('.snav');
  if (snav && !snav.querySelector('a[href="#admin"]')) {
    const a = document.createElement('a');
    a.href = '#admin';
    a.dataset.s = 'admin';
    a.textContent = 'Admin';
    snav.append(a);
  }
  const mnav = $('#mnav');
  if (mnav && !mnav.querySelector('a[href="#admin"]')) {
    const a = document.createElement('a');
    a.href = '#admin';
    a.textContent = 'Admin';
    mnav.append(a);
  }
}

/* ---------------- Route Listener ---------------- */
async function syncRouteState() {
  const hash = location.hash || '#home';
  if (hash.startsWith('#book')) {
    renderBookingScreen();
  }
  if (hash.startsWith('#account')) {
    wireClientAccount();
    await ensureSupabaseClient();
    await refreshClientAccountView();
  }
  if (hash.startsWith('#admin') || hash.includes('access_token=') || hash.includes('error_code=')) {
    const qs = hash.split('?')[1] || location.search.slice(1);
    const tab = new URLSearchParams(qs).get('tab');
    await ensureAdminBooted();
    if (tab) setAdminTab(tab);
    await refreshAdminView();
  }
}

renderAdminNavLinks();
wireBookingInteractions();
wireReviewSubmission();
wireLookbookModal();
wireClientAccount();
await processAuthCallbackOnBoot();
await loadPublic();
await refreshGlobalAuth();
await syncRouteState();
window.addEventListener('hashchange', syncRouteState);
