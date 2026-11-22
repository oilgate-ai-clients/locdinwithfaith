// Loc'd In with Faith — Real Site Engine
// Handles: Supabase public settings, GlossGenius <-> Cal.com automatic switching,
// Cal.com inline embed + bookingSuccessful listener, private deposit proof uploads,
// "Already booked?" proof submission, and KLAS-style Studio Admin (Home, Deposits, 4 Decisions, Photos, Settings).

const GLOSSGENIUS_URL = 'https://faithcordero.glossgenius.com';
const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB
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
    meta: '2 hr · Wash (+$15) & Detox (+$20) available',
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
    meta: 'Full head from $250 · Loc count asked inside booking',
    defaultDeposit: 50,
    depositKey: 'deposit_reattach',
    slugKey: 'cal_slug_reattach'
  },
  mobile: {
    key: 'mobile',
    name: 'Mobile Visit',
    price: '+$20 / +$35 travel',
    meta: 'Faith comes to you · +$20 under 30 min / +$35 over 30 min',
    defaultDeposit: 20,
    depositKey: 'deposit_mobile',
    slugKey: 'cal_slug_mobile'
  }
};

const READONLY_DEFAULTS = [
  { title: 'Hero & About verse', value: 'Keep Isaiah 43:1 (“I have called thee by thy name; thou art mine.”)' },
  { title: 'Admin & client sign-in', value: 'Free email code only · Phone/SMS stays OFF' },
  { title: 'Deposits & payment handles', value: 'Manual confirmation + client payment screenshot proof (Cash App, Venmo, Zelle, etc.)' },
  { title: 'Studio address privacy', value: 'Public site shows “Central Phoenix” only; exact address sent after confirmation' },
  { title: 'Cancellation policy', value: 'Deposits refundable with 24+ hours notice; late cancel/no-show forfeits deposit' },
  { title: 'Mobile visits & travel fees', value: 'Available as its own booking type (+$20 under 30 min / +$35 over 30 min)' },
  { title: 'Treatments & add-ons', value: 'Hot oil $30, Facial/scalp massage $55, Deep conditioning $70, Wash +$15, Detox +$20' },
  { title: 'Portfolio & IG photos', value: 'Current photos live until you swap any slot in the Photos tab' },
  { title: 'Social links', value: 'Business @locd.inwithfaith & personal @faith.cordero22' },
  { title: 'Texting number', value: 'Keep (480) 806-7675 ($0 extra; no paid SMS line)' },
  { title: 'Email marketing campaigns', value: 'Off for now ($0; Cal.com handles booking confirmations & reminders)' },
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
let depositFilter = 'all';
let selectedService = 'retwist';
let selectedLogoId = localStorage.getItem('faith_logo_preview') || 'flyer-chrome-pink';
let activeCalBooking = null; // { id, name, email, phone, service, timeLabel, depositAmount }
let sb = null;
let session = null;
let isAdminVerified = false;
let realSiteSchemaReady = false;
let calScriptPromise = null;
let calListenerWired = false;
let lastMountedCalTarget = '';

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  sb = createClient(cfg.url, cfg.key);
  return sb;
}

/* ---------------- Public Slots & Settings ---------------- */
function applySlots() {
  window.FAITH_SLOTS = { ...currentImages };
  document.querySelectorAll('img[data-slot]').forEach(img => {
    const url = currentImages[img.dataset.slot] || defaults[img.dataset.slot]?.src;
    if (url && img.getAttribute('src') !== url) img.src = url;
  });
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
    polLine.textContent = `Deposit policy: ${formatMoney(depRetwist)} deposit for Retwist + Style or All 3 (${formatMoney(depReattach)} for Reattachments) goes toward your total. Refundable with 24+ hours notice.`;
  }
  const manualSelect = $('#manual-proof-service');
  if (manualSelect) {
    manualSelect.options[0].textContent = `Retwist + Style — ${formatMoney(depRetwist)} deposit`;
    manualSelect.options[1].textContent = `All 3 (Best Value) — ${formatMoney(depAll3)} deposit`;
    manualSelect.options[2].textContent = `Loc Reattachments — ${formatMoney(depReattach)} deposit`;
    manualSelect.options[3].textContent = `Mobile Visit — ${formatMoney(depMobile)} deposit`;
  }
}

function updateBookCtas() {
  const hasCal = !!normalizeCalTarget(settings.cal_com_url);
  $$('[data-book-cta]').forEach(a => {
    if (hasCal) {
      a.setAttribute('href', '#book');
      a.removeAttribute('target');
      a.removeAttribute('rel');
    } else {
      a.setAttribute('href', GLOSSGENIUS_URL);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  });
}

async function loadPublic() {
  if (!live) {
    applyLogoAndPayHandles();
    updateBookCtas();
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
  } catch (e) {
    console.warn('Public settings load warning:', e.message || e);
  }
  applySlots();
  applyLogoAndPayHandles();
  updateBookCtas();
  renderBookingScreen();
}

/* ---------------- Cal.com Embed & Booking Flow ---------------- */
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
    const mainKeys = ['retwist', 'all3', 'reattach'];
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

async function mountCalEmbed() {
  const svc = SERVICES[selectedService] || SERVICES.retwist;
  const target = normalizeCalTarget(settings.cal_com_url, settings[svc.slugKey]);
  const calSection = $('#cal-live-section');
  const ggSection = $('#gg-fallback-section');
  const proofSection = $('#deposit-proof-step');

  if (!target) {
    if (calSection) calSection.hidden = true;
    if (ggSection) ggSection.hidden = false;
    if (proofSection && !activeCalBooking) proofSection.hidden = true;
    updateBookingStepPills(1);
    return;
  }

  if (ggSection) ggSection.hidden = true;
  if (activeCalBooking) {
    if (calSection) calSection.hidden = true;
    if (proofSection) proofSection.hidden = false;
    updateBookingStepPills(3);
    return;
  }

  if (calSection) calSection.hidden = false;
  if (proofSection) proofSection.hidden = true;
  updateBookingStepPills(2);

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
  renderBookingChoices();
  if (location.hash.startsWith('#book')) {
    const qs = location.hash.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    if (params.get('proof') === '1') {
      const form = $('#manual-proof-form');
      if (form) {
        form.hidden = false;
        setTimeout(() => $('#manual-proof-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
    }
    mountCalEmbed();
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

  activeCalBooking = {
    id: bookingId,
    name: name || 'Client',
    email: email || '',
    phone: phone || '',
    service: eventTitle,
    timeIso: startTime,
    timeLabel: startTime ? formatDateTime(startTime) : 'Scheduled in Cal.com',
    depositAmount,
    savedToDb: false
  };

  // Save booking row to Supabase with status 'pending_deposit' (client insert-only, no select)
  if (live && email) {
    try {
      const client = await ensureSupabaseClient();
      const { error } = await client.from('bookings').insert({
        id: bookingId,
        client_name: name || '',
        client_email: email,
        client_phone: phone || '',
        service_name: eventTitle,
        appointment_time: startTime || null,
        appointment_label: activeCalBooking.timeLabel,
        deposit_amount: depositAmount,
        status: 'pending_deposit',
        source: 'cal_com',
        cal_booking_uid: uid
      });
      if (!error) activeCalBooking.savedToDb = true;
    } catch (err) {
      console.warn('Could not save booking row yet:', err.message || err);
    }
  }

  showDepositProofStep(activeCalBooking);
}

// Expose safe hook for QA/verification testing without adding visible test buttons
window.FAITH_BOOKING_HOOK = {
  simulateCalSuccess: handleCalBookingSuccess,
  getConfig: () => ({ calUrl: settings.cal_com_url || '', schemaReady: realSiteSchemaReady })
};

function showDepositProofStep(info) {
  const calSection = $('#cal-live-section');
  const ggSection = $('#gg-fallback-section');
  const proofSection = $('#deposit-proof-step');
  if (calSection) calSection.hidden = true;
  if (ggSection) ggSection.hidden = true;
  if (proofSection) proofSection.hidden = false;
  updateBookingStepPills(3);

  const sum = $('#proof-booking-summary');
  if (sum) {
    sum.innerHTML = `
      <div><b>${escapeHtml(info.service)}</b></div>
      <div>${escapeHtml(info.timeLabel)}</div>
      <div>${escapeHtml(info.name)}${info.email ? ' · ' + escapeHtml(info.email) : ''}${info.phone ? ' · ' + escapeHtml(info.phone) : ''}</div>
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
        activeCalBooking = null;
      }
    }
    const pickBtn = e.target.closest('[data-pick-service]');
    if (pickBtn) {
      const k = pickBtn.dataset.pickService;
      if (SERVICES[k]) {
        selectedService = k;
        activeCalBooking = null;
        renderBookingChoices();
        mountCalEmbed();
      }
    }
  });

  // Post-Cal.com deposit proof file upload
  const postInput = $('#proof-file-input');
  if (postInput) {
    postInput.addEventListener('change', async () => {
      const file = postInput.files?.[0];
      if (!file || !activeCalBooking) return;
      const st = $('#proof-upload-status');
      const prev = $('#proof-upload-preview');
      st.className = 'proof-status';
      if (!isImageFile(file)) { st.textContent = 'Images only (JPG, PNG, WEBP, or HEIC).'; st.classList.add('err'); return; }
      if (file.size > MAX_PROOF_BYTES) { st.textContent = 'File is over 10 MB. Please choose a smaller screenshot.'; st.classList.add('err'); return; }

      if (prev) { prev.src = URL.createObjectURL(file); prev.hidden = false; }
      st.textContent = 'Uploading your screenshot privately to Faith…';
      try {
        const proofPath = await uploadProofFileToBucket(activeCalBooking.id, file);
        const client = await ensureSupabaseClient();
        if (activeCalBooking.savedToDb) {
          const rpc = await client.rpc('attach_deposit_proof', {
            p_booking_id: activeCalBooking.id,
            p_proof_path: proofPath
          });
          if (rpc.error) throw Error(rpc.error.message);
        } else {
          const ins = await client.from('bookings').insert({
            id: activeCalBooking.id,
            client_name: activeCalBooking.name,
            client_email: activeCalBooking.email || 'client@pending.local',
            client_phone: activeCalBooking.phone || '',
            service_name: activeCalBooking.service,
            appointment_time: activeCalBooking.timeIso || null,
            appointment_label: activeCalBooking.timeLabel,
            deposit_amount: activeCalBooking.depositAmount,
            status: 'pending_deposit',
            source: 'cal_com',
            proof_path: proofPath,
            proof_uploaded_at: new Date().toISOString()
          });
          if (ins.error) throw Error(ins.error.message);
          activeCalBooking.savedToDb = true;
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
        st.textContent = 'No problem — your booking is saved as Pending deposit. You can send your screenshot anytime using the “Already booked?” link below.';
      }
    };
  }

  // Book another button
  const resetBtn = $('#proof-book-another');
  if (resetBtn) {
    resetBtn.onclick = () => {
      activeCalBooking = null;
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

  // Submit manual deposit proof (GlossGenius bookings or skippers)
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
      if (!email) { st.textContent = 'Enter the email you used when booking.'; st.classList.add('err'); return; }
      if (!file) { st.textContent = 'Choose your payment screenshot first.'; st.classList.add('err'); return; }
      if (!isImageFile(file)) { st.textContent = 'Images only (JPG, PNG, WEBP, or HEIC).'; st.classList.add('err'); return; }
      if (file.size > MAX_PROOF_BYTES) { st.textContent = 'Screenshot is over 10 MB. Please upload a smaller image.'; st.classList.add('err'); return; }

      submitBtn.disabled = true;
      st.textContent = 'Uploading screenshot privately…';
      try {
        const bookingId = (crypto?.randomUUID) ? crypto.randomUUID() : ('m-' + Date.now());
        const proofPath = await uploadProofFileToBucket(bookingId, file);
        const client = await ensureSupabaseClient();
        const svc = SERVICES[svcKey] || SERVICES.retwist;
        const { error } = await client.from('bookings').insert({
          id: bookingId,
          client_name: name || '',
          client_email: email,
          client_phone: '',
          service_name: svc.name,
          appointment_label: 'Submitted via Already Booked form',
          deposit_amount: getDepositAmount(svcKey),
          status: 'pending_deposit',
          source: 'manual_proof',
          proof_path: proofPath,
          proof_uploaded_at: new Date().toISOString()
        });
        if (error) throw Error(error.message);
        st.textContent = 'Deposit proof sent! Faith will review it and confirm your spot.';
        st.classList.add('ok');
        manualForm.reset();
        if (prevImg) prevImg.hidden = true;
      } catch (err) {
        st.textContent = 'Could not send proof yet: ' + (err.message || 'Please try again or text Faith at (480) 806-7675.');
        st.classList.add('err');
      } finally {
        submitBtn.disabled = false;
      }
    };
  }
}

/* ---------------- KLAS-Style Studio Admin ---------------- */
let adminBooted = false;
let currentAdminTab = 'home';

function setAdminTab(tab) {
  const valid = ['home', 'deposits', 'decisions', 'photos', 'settings'];
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

  // Getting started ticks (3 items)
  const setGs = (id, done) => {
    const el = $('#' + id);
    if (!el) return;
    el.classList.toggle('done', done);
    const tick = el.querySelector('.gs-tick');
    if (tick) tick.textContent = done ? '✓' : '○';
  };
  setGs('gs-cal', hasCal);
  setGs('gs-photos', hasPhotos);
  setGs('gs-decisions', decisionsDone);

  // One-line Next Steps
  const nextText = $('#admin-next-step-text');
  const nextBtn = $('#admin-next-step-btn');
  if (nextText && nextBtn) {
    if (!realSiteSchemaReady) {
      nextText.textContent = 'Apply supabase/real-site.sql in Supabase so bookings, deposit proofs, and Cal.com settings save live.';
      nextBtn.textContent = 'Check Settings';
      nextBtn.onclick = () => setAdminTab('settings');
    } else if (pendingCount > 0) {
      nextText.textContent = `Review ${pendingCount} ${pendingCount === 1 ? 'booking' : 'bookings'} waiting on deposit confirmation.`;
      nextBtn.textContent = 'Open Deposits';
      nextBtn.onclick = () => setAdminTab('deposits');
    } else if (!hasCal) {
      nextText.textContent = 'Paste your free Cal.com link in Settings to switch your Book buttons from GlossGenius to your live calendar.';
      nextBtn.textContent = 'Connect Cal.com';
      nextBtn.onclick = () => setAdminTab('settings');
    } else if (!decisionsDone) {
      nextText.textContent = `Answer the ${decProg.total - decProg.done} remaining studio decision${decProg.total - decProg.done === 1 ? '' : 's'} (logo, hours, prices, calendar).`;
      nextBtn.textContent = 'Open Decisions';
      nextBtn.onclick = () => setAdminTab('decisions');
    } else if (!hasPhotos) {
      nextText.textContent = 'Upload or crop your own studio photos whenever you want to refresh the starter gallery.';
      nextBtn.textContent = 'Open Photos';
      nextBtn.onclick = () => setAdminTab('photos');
    } else {
      nextText.textContent = 'Everything is connected — your booking calendar, deposit proofs, and studio photos are live.';
      nextBtn.textContent = 'View Deposits';
      nextBtn.onclick = () => setAdminTab('deposits');
    }
  }

  // Connections status in plain words
  const calEl = $('#conn-cal-status');
  if (calEl) {
    calEl.className = 'status-pill ' + (hasCal ? 'ok' : 'warn');
    calEl.textContent = hasCal ? 'Connected' : 'Using GlossGenius';
  }
  const calNote = $('#conn-cal-note');
  if (calNote) {
    calNote.textContent = hasCal
      ? `Cal.com live at ${normalizeCalTarget(settings.cal_com_url).fullUrl}`
      : 'Book buttons open GlossGenius until you paste your Cal.com link in Settings.';
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

  // Update tab badges
  const pBadge = $('#admin-pending-badge');
  if (pBadge) {
    pBadge.textContent = String(pendingCount);
    pBadge.hidden = pendingCount === 0;
  }
  const dBadge = $('#admin-decisions-badge');
  if (dBadge) {
    const remaining = decProg.total - decProg.done;
    dBadge.textContent = String(remaining);
    dBadge.hidden = remaining === 0;
  }
}

/* ---------------- Admin Deposits ---------------- */
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
    // Pending first, then soonest appointment / newest
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
      : (row.appointment_label || 'Manual deposit proof');

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
        <span><b>Source:</b> ${row.source === 'cal_com' ? 'Cal.com' : 'Already booked form'}</span>
      </div>
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
  const title = $('#proof-dialog-title');
  const img = $('#proof-dialog-img');
  const status = $('#proof-dialog-status');
  if (!dlg || !sb) return;
  title.textContent = `Deposit proof · ${row.client_name || row.client_email}`;
  status.textContent = 'Loading private screenshot…';
  img.hidden = true;
  img.src = '';
  dlg.showModal();
  try {
    const { data, error } = await sb.storage.from('deposit-proofs').createSignedUrl(row.proof_path, 300);
    if (error || !data?.signedUrl) throw error || Error('Could not load signed URL.');
    img.src = data.signedUrl;
    img.hidden = false;
    status.textContent = `${row.service_name} · ${formatMoney(row.deposit_amount)} · private link expires in 5 min`;
  } catch (err) {
    status.textContent = 'Could not load screenshot: ' + (err.message || 'Check bucket policy.');
  }
}

/* ---------------- Admin Decisions (4 Active + 12 Read-only Defaults) ---------------- */
function renderLogoShortlist() {
  const grid = $('#admin-logo-shortlist');
  if (!grid || !window.FAITH_LOGOS) return;
  const shortlist = LOGO_SHORTLIST_IDS
    .map(id => window.FAITH_LOGOS.find(l => l.id === id))
    .filter(Boolean);
  const picked = decisionAnswers.brand_logo?.logo_id || settings.active_logo || window.FAITH_LOGO_API.getActiveId();

  grid.replaceChildren(...shortlist.map((item, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'logo-choice-card' + (item.id === picked ? ' on' : '');
    btn.dataset.logoChoice = item.id;
    btn.innerHTML = `<div class="logo-choice-stage">${item.render()}</div><div class="logo-choice-meta">${idx + 1}. ${escapeHtml(item.name)}</div><div class="logo-choice-note">${escapeHtml(item.note)}</div>`;
    btn.onclick = () => {
      selectedLogoId = item.id;
      decisionAnswers.brand_logo = { ...(decisionAnswers.brand_logo || {}), logo_id: item.id, logo_name: item.name };
      window.FAITH_LOGO_API.apply(item.id, { persistLocal: true });
      grid.querySelectorAll('.logo-choice-card').forEach(c => c.classList.toggle('on', c.dataset.logoChoice === item.id));
      const lbl = $('#dec-logo-status');
      if (lbl) lbl.textContent = `Previewing "${item.name}" — click Save logo to publish.`;
    };
    return btn;
  }));
}

function renderReadonlyDefaults() {
  const box = $('#admin-defaults-list');
  if (!box) return;
  box.innerHTML = READONLY_DEFAULTS.map(d =>
    `<div class="default-item"><b>${escapeHtml(d.title)}</b><span>${escapeHtml(d.value)}</span></div>`
  ).join('');
}

function hydrateDecisionForms() {
  // 1. Logo
  renderLogoShortlist();
  if ($('#dec-logo-note')) $('#dec-logo-note').value = decisionAnswers.brand_logo?.logo_note || '';

  // 2. Hours
  const h = decisionAnswers.studio_hours || {};
  const defaultHours = {
    hours_mon: '8 AM - 11:30 PM',
    hours_tue: '11 PM - 11:30 PM',
    hours_wed: '8 AM - 11:30 PM',
    hours_thu: '8 AM - 11:45 PM',
    hours_fri: '8 AM - 11:30 PM',
    hours_sat: '8 AM - 11:30 PM',
    hours_sun: '8 AM - 11:30 PM'
  };
  Object.entries(defaultHours).forEach(([k, defVal]) => {
    const inp = $(`[data-dec-hours="${k}"]`);
    if (inp) inp.value = h[k] || defVal;
  });

  // 3. Prices
  const p = decisionAnswers.reattach_pricing || {};
  const fullVal = String(p.full_head_price || '250');
  $$('input[name="dec_reattach_full"]').forEach(r => { r.checked = r.value === fullVal; });
  const prepVal = String(p.prep_required || 'optional');
  $$('input[name="dec_prep_rule"]').forEach(r => { r.checked = r.value === prepVal; });
  if ($('#dec-price-notes')) $('#dec-price-notes').value = p.price_notes || p.prep_steps || '';

  // 4. Calendar
  const c = decisionAnswers.booking_calendar || {};
  const calChoice = c.calendar_provider === 'glossgenius' ? 'glossgenius' : 'cal_com';
  $$('input[name="dec_cal_choice"]').forEach(r => { r.checked = r.value === calChoice; });

  const prog = getDecisionsProgress();
  const progEl = $('#admin-decisions-progress');
  if (progEl) progEl.textContent = `${prog.done} / ${prog.total} answered`;
}

async function saveDecisionRow(questionKey, payload, statusSelector) {
  if (!sb || !session || !isAdminVerified) return;
  const st = $(statusSelector);
  if (st) st.textContent = 'Saving…';
  decisionAnswers[questionKey] = payload;
  const { error } = await sb.from('decision_answers').upsert({
    question_key: questionKey,
    answer: payload,
    updated_by: session.user.email || 'faith',
    updated_at: new Date().toISOString()
  });
  if (error) {
    if (st) st.textContent = 'Not saved: ' + error.message;
    return false;
  }
  if (st) st.textContent = 'Saved.';
  hydrateDecisionForms();
  renderAdminHome();
  return true;
}

async function loadAdminDecisions() {
  if (!sb || !session || !isAdminVerified) return;
  try {
    const { data, error } = await sb.from('decision_answers').select('question_key, answer');
    if (!error && Array.isArray(data)) {
      data.forEach(r => { decisionAnswers[r.question_key] = r.answer || {}; });
    }
  } catch (err) {
    console.warn('Decision answers read warning:', err);
  }
  hydrateDecisionForms();
  renderReadonlyDefaults();
  renderAdminHome();
}

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
}

/* ---------------- Admin Photo Slots & Cropper (Preserved) ---------------- */
function renderSlots() {
  const grid = $('#slot-grid');
  if (!grid) return;
  grid.replaceChildren(...Object.keys(defaults)
    .sort((a, b) => Object.keys(LABELS).indexOf(a) - Object.keys(LABELS).indexOf(b))
    .map(slot => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot-card';
      const img = document.createElement('img');
      img.src = currentImages[slot] || defaults[slot].src;
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
  const sources = [...new Set([...Object.values(defaults).map(d => d.src), ...Object.values(currentImages)])];
  lib.replaceChildren(...sources.map(src => {
    const b = document.createElement('button');
    b.type = 'button';
    const i = document.createElement('img');
    i.src = src;
    i.alt = 'Use this photo';
    i.loading = 'lazy';
    b.append(i);
    b.onclick = () => loadCropImage(src);
    return b;
  }));
  $('#cropper').hidden = false;
  $('#cropper').scrollIntoView({ block: 'start' });
  loadCropImage(currentImages[slot] || defaults[slot].src);
}

function loadCropImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    crop.img = img;
    $('#crop-zoom').value = 1;
    $('#crop-x').value = .5;
    $('#crop-y').value = .5;
    drawCrop();
  };
  img.src = src;
}

function drawCrop() {
  const { img } = crop;
  if (!img) return;
  const cv = $('#crop-canvas');
  const ctx = cv.getContext('2d');
  const zoom = +$('#crop-zoom').value;
  const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight) * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--night').trim() || '#0A080A';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, -(w - cv.width) * +$('#crop-x').value, -(h - cv.height) * +$('#crop-y').value, w, h);
}

function wireCropper() {
  ['#crop-zoom', '#crop-x', '#crop-y'].forEach(s => { const el = $(s); if (el) el.addEventListener('input', drawCrop); });
  if ($('#crop-file')) $('#crop-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadCropImage(URL.createObjectURL(f)); });
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
      currentImages[crop.slot] = url;
      applySlots();
      renderSlots();
      renderAdminHome();
      status.textContent = 'Saved. Live on your site now.';
    };
  }
  if ($('#crop-reset')) {
    $('#crop-reset').onclick = async () => {
      if (!sb || !session) return;
      const { error } = await sb.from('site_images').delete().eq('slot', crop.slot);
      if (error) { $('#crop-status').textContent = 'Not saved: ' + error.message; return; }
      delete currentImages[crop.slot];
      applySlots();
      renderSlots();
      renderAdminHome();
      $('#crop-status').textContent = 'Original photo restored.';
    };
  }
}

/* ---------------- Admin Auth & Wiring ---------------- */
async function ensureAdminBooted() {
  if (adminBooted) return;
  adminBooted = true;
  wireCropper();
  renderReadonlyDefaults();

  // Tab navigation
  $$('.admin-tab').forEach(btn => {
    btn.onclick = () => setAdminTab(btn.dataset.adminTab);
  });
  $$('[data-jump-tab]').forEach(btn => {
    btn.onclick = () => setAdminTab(btn.dataset.jumpTab);
  });

  // Deposit filter buttons
  $$('.dep-filter-btn').forEach(btn => {
    btn.onclick = () => {
      depositFilter = btn.dataset.depFilter || 'all';
      $$('.dep-filter-btn').forEach(b => b.classList.toggle('on', b === btn));
      renderDepositsList();
    };
  });
  if ($('#refresh-deposits')) $('#refresh-deposits').onclick = () => loadAdminBookings();

  // Hours presets inside Decisions tab
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

  // Save the 4 decisions
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
      const provider = $('input[name="dec_cal_choice"]:checked')?.value || 'cal_com';
      await saveDecisionRow('booking_calendar', { calendar_provider: provider }, '#dec-cal-status');
    };
  }

  // Settings: Cal.com booking link
  if ($('#cal-settings-form')) {
    $('#cal-settings-form').onsubmit = async e => {
      e.preventDefault();
      if (!sb || !session || !isAdminVerified) return;
      const st = $('#cal-settings-status');
      const rawUrl = $('#set-cal-url').value.trim();
      if (rawUrl && !normalizeCalTarget(rawUrl)) {
        st.textContent = 'Enter a valid Cal.com link (for example https://cal.com/yourname) or leave blank to use GlossGenius.';
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
        ? 'Saved! Every Book button on the site now opens your embedded Cal.com calendar.'
        : 'Cleared. Book buttons now open GlossGenius until a Cal.com link is added.';
    };
  }

  // Settings: Pay handles & deposit amounts
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
      st.textContent = 'Saved! Clients now see these pay handles and deposit amounts right after booking.';
    };
  }

  // Auth setup
  if (!live) {
    if ($('#signin-status')) $('#signin-status').textContent = 'Studio database is not configured.';
    return;
  }

  await ensureSupabaseClient();
  let pendingEmail = '';

  const refreshAuth = async () => {
    session = (await sb.auth.getSession()).data.session;
    const gate = $('#admin-signin-gate');
    const app = $('#admin-app');
    const userBar = $('#admin-user-bar');
    const signedEmail = $('#signed-email');
    const notAdminBox = $('#admin-not-authorized');

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
      await Promise.all([loadAdminDecisions(), loadAdminBookings()]);
    }
  };

  sb.auth.onAuthStateChange(() => { refreshAuth(); });
  await refreshAuth();

  if ($('#signin-form')) {
    $('#signin-form').onsubmit = async e => {
      e.preventDefault();
      pendingEmail = $('#signin-email').value.trim();
      if (!pendingEmail) return;
      const statusEl = $('#signin-status');
      const otpForm = $('#admin-otp-form');
      if (otpForm) otpForm.hidden = true;
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

      statusEl.textContent = 'Sending sign-in email code…';
      const { error } = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          emailRedirectTo: location.origin + '/#admin',
          shouldCreateUser: true
        }
      });
      if (error) {
        statusEl.textContent = 'Could not send sign-in code: ' + error.message;
        return;
      }
      statusEl.textContent = `Check ${pendingEmail} for your 6-digit code or sign-in link.`;
      if (otpForm) otpForm.hidden = false;
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
      $('#signin-status').textContent = error ? ('Code invalid or expired: ' + error.message) : 'Signed in!';
    };
  }

  if ($('#signout')) {
    $('#signout').onclick = async () => {
      await sb.auth.signOut();
      refreshAuth();
    };
  }
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
function syncRouteState() {
  const hash = location.hash || '#home';
  if (hash.startsWith('#book')) {
    renderBookingScreen();
  }
  if (hash.startsWith('#admin') || hash.includes('access_token=')) {
    const qs = hash.split('?')[1] || location.search.slice(1);
    const tab = new URLSearchParams(qs).get('tab');
    ensureAdminBooted().then(() => {
      if (tab) setAdminTab(tab);
    });
  }
}

renderAdminNavLinks();
wireBookingInteractions();
await loadPublic();
syncRouteState();
window.addEventListener('hashchange', syncRouteState);
