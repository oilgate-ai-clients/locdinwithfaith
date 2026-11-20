'use strict';

// Public identifiers issued to the studio. OAuth credentials stay in Google's sign-in flow.
const analytics = { measurementId: '', propertyId: '', clientId: '' };
const framed = window.self !== window.top;
document.documentElement.classList.toggle('framed', framed);

const dialog = document.querySelector('#device-dialog');
const frame = document.querySelector('#device-frame');
const model = document.querySelector('#device-model');
function resizePhone() {
  if (!dialog.open) return;
  const [width, height] = model.value.split(',').map(Number);
  const scale = Math.min(1, (innerWidth - 40) / width, (innerHeight - 92) / height);
  Object.assign(frame.style, { width: width + 'px', height: height + 'px', transform: 'scale(' + scale + ')' });
  Object.assign(frame.parentElement.style, { width: width * scale + 'px', height: height * scale + 'px' });
}
document.querySelector('#device-open').addEventListener('click', () => {
  frame.src = location.pathname + location.hash;
  dialog.showModal();
  resizePhone();
});
dialog.addEventListener('close', () => frame.removeAttribute('src'));
model.addEventListener('change', resizePhone);
window.addEventListener('resize', resizePhone);

const address = document.querySelector('#field-0');
const estimate = document.querySelector('#estimate-drive');
const statusLine = document.querySelector('#drive-result');
let pending;
address.addEventListener('input', () => {
  pending?.abort();
  statusLine.textContent = '';
  estimate.disabled = false;
});
estimate.addEventListener('click', async () => {
  const query = address.value.trim();
  if (!query) { statusLine.textContent = 'Enter your street address and city.'; address.focus(); return; }
  pending?.abort();
  const request = new AbortController();
  pending = request;
  const timeout = setTimeout(() => request.abort(), 15000);
  estimate.disabled = true;
  statusLine.textContent = 'Looking up the drive from central Phoenix…';
  try {
    const params = new URLSearchParams({ q: query, limit: '1', bbox: '-113,33,-111,34' });
    const geo = await fetch('https://photon.komoot.io/api/?' + params, { signal: request.signal });
    if (!geo.ok) throw Error();
    const [place] = (await geo.json()).features;
    if (!place?.properties?.housenumber || !place.geometry?.coordinates) { statusLine.textContent = 'No Phoenix-area match. Check the address and city.'; return; }
    // Central Phoenix reference point, shared by all customers.
    const path = '-112.074,33.47;' + place.geometry.coordinates.slice(0, 2).map(Number).join(',');
    const route = await fetch('https://router.project-osrm.org/route/v1/driving/' + path + '?overview=false', { signal: request.signal });
    if (!route.ok) throw Error();
    const seconds = (await route.json()).routes?.[0]?.duration;
    if (!Number.isFinite(seconds)) throw Error();
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes === 30) { statusLine.textContent = 'About 30 minutes. Confirm the fee with Faith at the 30-minute boundary.'; return; }
    document.querySelector('[data-loc="' + (minutes < 30 ? 'm30' : 'm31') + '"]').click();
    statusLine.textContent = 'About ' + minutes + (minutes === 1 ? ' minute' : ' minutes') + ' from central Phoenix. Estimated travel fee $' + (minutes < 30 ? 20 : 35) + '. Based on OpenStreetMap and OSRM, without live traffic.';
  } catch {
    if (address.value.trim() === query) statusLine.textContent = 'Drive estimate unavailable. Check the address or try again.';
  } finally {
    clearTimeout(timeout);
    if (pending === request) estimate.disabled = false;
  }
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
if (!framed && /^G-[A-Z0-9]+$/.test(analytics.measurementId)) {
  window.dataLayer = window.dataLayer || [];
  function tag() { window.dataLayer.push(arguments); }
  tag('js', new Date());
  tag('config', analytics.measurementId, {send_page_view: false});
  function trackPage() {
    const section = document.querySelector('.screen.on');
    if (!section || ['admin','texts','email','account','checkout'].includes(section.id)) return;
    tag('event', 'page_view', {page_location: location.origin + location.pathname + '#' + section.id, page_title: section.id});
  }
  loadScript('https://www.googletagmanager.com/gtag/js?id=' + analytics.measurementId).then(trackPage).catch(() => {});
  window.addEventListener('hashchange', trackPage);
}
const loadReport = document.querySelector('#ga-load');
const reportStatus = document.querySelector('#ga-status');
if (/^\d+$/.test(analytics.propertyId) && analytics.clientId.endsWith('.apps.googleusercontent.com')) {
  loadReport.hidden = false;
  reportStatus.textContent = 'Sign in with a Google account that has access to the studio property.';
  let client;
  loadReport.onclick = async () => {
    loadReport.disabled = true;
    try {
      if (!window.google?.accounts?.oauth2) await loadScript('https://accounts.google.com/gsi/client');
      client ??= google.accounts.oauth2.initTokenClient({
        client_id: analytics.clientId, scope: 'https://www.googleapis.com/auth/analytics.readonly',
        error_callback: () => { loadReport.disabled = false; reportStatus.textContent = 'Sign-in closed. You can try again.'; },
        callback: async auth => {
          try {
            if (!auth.access_token) throw Error();
            const metrics = ['activeUsers','sessions','screenPageViews'];
            const res = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + analytics.propertyId + ':runReport', {
              method: 'POST', headers: {Authorization: 'Bearer ' + auth.access_token, 'Content-Type':'application/json'},
              body: JSON.stringify({dateRanges:[{startDate:'29daysAgo',endDate:'today'}], metrics:metrics.map(name => ({name}))})
            });
            if (!res.ok) throw Error();
            const data = await res.json();
            const results = document.querySelector('#ga-results');
            results.replaceChildren();
            const values = data.rows?.[0]?.metricValues;
            if (values) ['Active users','Sessions','Page views'].forEach((label,i) => {
              const term = document.createElement('dt'), value = document.createElement('dd');
              term.textContent = label; value.textContent = values[i].value; results.append(term,value);
            });
            reportStatus.textContent = values ? 'Google Analytics · updated just now.' : 'Google Analytics returned no activity for this period.';
          } catch { document.querySelector('#ga-results').replaceChildren(); reportStatus.textContent = 'Report unavailable. Check property access and the Analytics Data API.'; }
          finally { loadReport.disabled = false; }
        }
      });
      client.requestAccessToken();
    } catch { loadReport.disabled = false; reportStatus.textContent = 'Google sign-in unavailable. Try again.'; }
  };
}
