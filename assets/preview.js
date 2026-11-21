'use strict';

// Public identifiers issued to the studio. OAuth credentials stay in Google's sign-in flow.
const analytics = { measurementId: 'G-5M1NB9P5ZH', propertyId: '', clientId: '' };
const framed = window.self !== window.top;
document.documentElement.classList.toggle('framed', framed);

const dialog = document.querySelector('#device-dialog');
const frame = document.querySelector('#device-frame');
const model = document.querySelector('#device-model');
function resizePhone() {
  if (!dialog || !dialog.open) return;
  const [width, height] = model.value.split(',').map(Number);
  const scale = Math.min(1, (innerWidth - 40) / width, (innerHeight - 92) / height);
  Object.assign(frame.style, { width: width + 'px', height: height + 'px', transform: 'scale(' + scale + ')' });
  Object.assign(frame.parentElement.style, { width: width * scale + 'px', height: height * scale + 'px' });
}
const openBtn = document.querySelector('#device-open');
if (openBtn && dialog) {
  openBtn.addEventListener('click', e => {
    e.preventDefault();
    frame.src = location.pathname + location.hash;
    dialog.showModal();
    resizePhone();
  });
  dialog.addEventListener('close', () => frame.removeAttribute('src'));
  model.addEventListener('change', resizePhone);
  window.addEventListener('resize', resizePhone);
}

// Handle tile fallback cleanly if an external tile fails to load
document.querySelectorAll('.area-map .map-tiles img').forEach(img => {
  img.addEventListener('error', () => {
    img.style.opacity = '0';
  });
});

// Travel estimate: drive time from the centre of Faith's public service circle (central Phoenix), never her home.
const CENTER = '-112.074,33.47';
document.querySelectorAll('[data-travel] form').forEach(form => {
  const input = form.querySelector('[data-addr]');
  const out = form.querySelector('[data-out]');
  const button = form.querySelector('[data-estimate]');
  const book = form.querySelector('[data-travel-book]');
  let pending;
  input.addEventListener('input', () => { pending?.abort(); out.textContent = ''; button.disabled = false; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) { out.textContent = 'Type your street address and city first.'; input.focus(); return; }
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    button.disabled = true;
    out.textContent = 'Checking the drive…';
    try {
      const params = new URLSearchParams({ q: query, limit: '1', bbox: '-113,33,-111,34' });
      const geo = await fetch('https://photon.komoot.io/api/?' + params, { signal: request.signal });
      if (!geo.ok) throw Error();
      const [place] = (await geo.json()).features;
      if (!place?.geometry?.coordinates) { out.textContent = 'No Phoenix-area match. Check the street and city.'; return; }
      const path = CENTER + ';' + place.geometry.coordinates.slice(0, 2).map(Number).join(',');
      const route = await fetch('https://router.project-osrm.org/route/v1/driving/' + path + '?overview=false', { signal: request.signal });
      if (!route.ok) throw Error();
      const seconds = (await route.json()).routes?.[0]?.duration;
      if (!Number.isFinite(seconds)) throw Error();
      const minutes = Math.max(1, Math.round(seconds / 60));
      const near = minutes < 30;
      document.querySelector('[data-loc="' + (near ? 'm30' : 'm31') + '"]')?.click();
      out.innerHTML = '';
      const strong = document.createElement('b');
      strong.textContent = 'About ' + minutes + (minutes === 1 ? ' minute' : ' minutes') + ' away · travel fee +$' + (near ? 20 : 35);
      out.append(strong, document.createElement('br'), 'Estimate without live traffic. The fee is added to your booking.');
      if (book) book.hidden = false;
    } catch {
      if (input.value.trim() === query) out.textContent = 'Drive estimate unavailable right now. Try again, or pick the fee when you book.';
    } finally {
      clearTimeout(timeout);
      if (pending === request) button.disabled = false;
    }
  });
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

// GA4 screen tracking
if (!framed && typeof window.gtag === 'function') {
  const trackPage = () => {
    const section = document.querySelector('.screen.on');
    if (!section || ['admin', 'texts', 'email'].includes(section.id)) return;
    window.gtag('event', 'page_view', { page_location: location.origin + location.pathname + '#' + section.id, page_title: section.id });
  };
  trackPage();
  window.addEventListener('hashchange', trackPage);
}

const loadReport = document.querySelector('#ga-load');
const reportStatus = document.querySelector('#ga-status');
if (loadReport && /^\d+$/.test(analytics.propertyId) && analytics.clientId.endsWith('.apps.googleusercontent.com')) {
  loadReport.hidden = false;
  reportStatus.textContent = 'Sign in with a Google account that has access to the studio property.';
  let client;
  loadReport.onclick = async () => {
    loadReport.disabled = true;
    try {
      if (!window.google?.accounts?.oauth2) await loadScript('https://accounts.google.com/gsi/client');
      client ??= google.accounts.oauth2.initTokenClient({
        client_id: analytics.clientId,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        error_callback: () => { loadReport.disabled = false; reportStatus.textContent = 'Sign-in closed. You can try again.'; },
        callback: async auth => {
          try {
            if (!auth.access_token) throw Error();
            const metrics = ['activeUsers', 'sessions', 'screenPageViews'];
            const res = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + analytics.propertyId + ':runReport', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + auth.access_token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }], metrics: metrics.map(name => ({ name })) })
            });
            if (!res.ok) throw Error();
            const data = await res.json();
            const results = document.querySelector('#ga-results');
            results.replaceChildren();
            const values = data.rows?.[0]?.metricValues;
            if (values) ['Active users', 'Sessions', 'Page views'].forEach((label, i) => {
              const term = document.createElement('dt'), value = document.createElement('dd');
              term.textContent = label; value.textContent = values[i].value; results.append(term, value);
            });
            reportStatus.textContent = values ? 'Google Analytics · updated just now.' : 'Google Analytics returned no activity for this period.';
          } catch {
            document.querySelector('#ga-results').replaceChildren();
            reportStatus.textContent = 'Report unavailable. Check property access and the Analytics Data API.';
          } finally {
            loadReport.disabled = false;
          }
        }
      });
      client.requestAccessToken();
    } catch {
      loadReport.disabled = false;
      reportStatus.textContent = 'Google sign-in unavailable. Try again.';
    }
  };
}

// Load Central Phoenix street map tiles cleanly when map enters viewport or on interaction
(function(){const maps=[...document.querySelectorAll('.area-map')];if(!maps.length)return;const show=()=>maps.forEach(m=>m.classList.add('map-live'));if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){show();io.disconnect();}},{rootMargin:'600px 0px'});maps.forEach(m=>io.observe(m));}else{show();}window.addEventListener('hashchange',()=>{if(location.hash==='#book')show();});['pointerdown','scroll'].forEach(ev=>window.addEventListener(ev,show,{once:true,passive:true}));})();
