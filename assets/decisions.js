// Interactive Decisions Page for Faith — loads/saves answers to Supabase decision_answers and uploads photos to site-images/decisions/.
(function () {
  const cfg = window.FAITH_BACKEND || {};
  const live = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url || '') && !!cfg.key;
  const DRAFT_KEY = 'faith_decisions_draft_v3';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  let sb = null;
  let dbWritable = true;
  const answers = loadLocalDraft();

  function loadLocalDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveLocalDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(answers)); } catch {}
  }

  function setStatus(msg, kind) {
    const el = $('#dec-global-status');
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind || 'info';
  }

  function renderLogoGrid() {
    const grid = $('#dec-logo-grid');
    if (!grid || !window.FAITH_LOGOS) return;
    const picked = answers.brand_logo?.logo_id || window.FAITH_LOGO_API.getActiveId();
    grid.replaceChildren(...window.FAITH_LOGOS.map((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'logo-choice-card' + (item.id === picked ? ' on' : '');
      btn.dataset.logoId = item.id;
      btn.innerHTML = `<div class="logo-choice-stage">${item.render()}</div><div class="logo-choice-meta">${idx + 1}. ${item.name}</div><div class="logo-choice-note">${item.note}</div>`;
      btn.onclick = () => {
        answers.brand_logo = { ...(answers.brand_logo || {}), logo_id: item.id, logo_name: item.name };
        window.FAITH_LOGO_API.apply(item.id, { persistLocal: true });
        grid.querySelectorAll('.logo-choice-card').forEach(c => c.classList.toggle('on', c.dataset.logoId === item.id));
        const lbl = $('#dec-logo-picked');
        if (lbl) lbl.textContent = `Selected: #${idx + 1} ${item.name} (previewing live in header)`;
        saveLocalDraft();
        updateProgress();
        upsertQuestion('brand_logo', answers.brand_logo);
      };
      return btn;
    }));
    const active = window.FAITH_LOGOS.find(l => l.id === picked);
    const lbl = $('#dec-logo-picked');
    if (lbl && active) lbl.textContent = `Selected: ${active.name}`;
  }

  function collectCardData(card) {
    const key = card.dataset.q;
    const payload = answers[key] ? { ...answers[key] } : {};
    card.querySelectorAll('[data-field]').forEach(el => {
      const name = el.dataset.field;
      if (el.type === 'checkbox') {
        if (el.dataset.group) {
          payload[el.dataset.group] = [...card.querySelectorAll(`[data-group="${el.dataset.group}"]:checked`)].map(c => c.value);
        } else {
          payload[name] = el.checked;
        }
      } else if (el.type === 'radio') {
        if (el.checked) payload[name] = el.value;
      } else {
        payload[name] = el.value.trim();
      }
    });
    answers[key] = payload;
    return payload;
  }

  function hydrateCard(card) {
    const key = card.dataset.q;
    const data = answers[key];
    if (!data) return;
    card.querySelectorAll('[data-field]').forEach(el => {
      const name = el.dataset.field;
      if (el.type === 'checkbox') {
        if (el.dataset.group && Array.isArray(data[el.dataset.group])) {
          el.checked = data[el.dataset.group].includes(el.value);
        } else if (typeof data[name] === 'boolean') {
          el.checked = data[name];
        }
      } else if (el.type === 'radio') {
        if (data[name] !== undefined) el.checked = (el.value === String(data[name]));
      } else if (data[name] !== undefined) {
        el.value = String(data[name]);
      }
    });
    if (key === 'photos_upload' && data.uploads) {
      Object.entries(data.uploads).forEach(([slot, url]) => showUploadPreview(slot, url));
    }
  }

  function showUploadPreview(slot, url) {
    const box = document.querySelector(`[data-upload-preview="${slot}"]`);
    if (!box || !url) return;
    box.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Uploaded preview for ' + slot;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'View uploaded file';
    box.append(img, a);
  }

  function updateProgress() {
    const cards = $$('.q-card');
    let answered = 0;
    cards.forEach(card => {
      const d = answers[card.dataset.q];
      if (!d) return;
      const hasVal = Object.values(d).some(v => Array.isArray(v) ? v.length > 0 : (typeof v === 'object' && v ? Object.keys(v).length > 0 : (typeof v === 'boolean' ? true : String(v || '').trim().length > 0)));
      if (hasVal) answered++;
    });
    const el = $('#dec-progress');
    if (el) el.textContent = `${answered} / ${cards.length} answered`;
  }

  let cloudTableReady = false;
  async function checkDecisionsTable() {
    try {
      const r = await fetch(`${cfg.url}/rest/v1/site_settings?key=eq.round3_schema_ready&select=value`, {
        headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }
      });
      if (!r.ok) return false;
      const rows = await r.json();
      return Array.isArray(rows) && rows[0]?.value === 'true';
    } catch {
      return false;
    }
  }

  async function upsertQuestion(key, payload, cardStatusEl) {
    saveLocalDraft();
    updateProgress();
    if (!live || !sb || !cloudTableReady) {
      if (cardStatusEl) cardStatusEl.textContent = cloudTableReady === false && sb ? 'Saved on this device (cloud table opens after Pam runs supabase/round3.sql).' : 'Saved on this device.';
      return;
    }
    try {
      const { error } = await sb.from('decision_answers').upsert({
        question_key: key,
        answer: payload,
        updated_by: 'faith',
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      if (cardStatusEl) cardStatusEl.textContent = 'Saved to studio database.';
      setStatus('All saved changes are synced to the studio database so LaVante can read them in Admin.', 'ok');
    } catch (e) {
      dbWritable = false;
      if (cardStatusEl) cardStatusEl.textContent = 'Saved in this browser; database write opens once studio database setup finishes.';
      setStatus('Saved in this browser. Cloud saving opens once studio database setup finishes (' + (e.message || 'pending SQL') + ').', 'warn');
    }
  }

  async function loadFromSupabase() {
    if (!live) {
      setStatus('Saving locally: Supabase credentials missing.', 'warn');
      return;
    }
    try {
      cloudTableReady = await checkDecisionsTable();
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      sb = createClient(cfg.url, cfg.key);
      if (!cloudTableReady) {
        setStatus('Drafts save right in this browser. Cloud sync activates once studio database setup finishes.', 'warn');
        return;
      }
      const { data, error } = await sb.from('decision_answers').select('question_key, answer');
      if (error) {
        setStatus('Drafts save right in this browser. Cloud sync activates once studio database setup finishes.', 'warn');
        return;
      }
      if (data && data.length) {
        data.forEach(row => {
          answers[row.question_key] = { ...(answers[row.question_key] || {}), ...(row.answer || {}) };
        });
        $$('.q-card').forEach(hydrateCard);
        renderLogoGrid();
        updateProgress();
        setStatus(`Loaded ${data.length} saved answers from your studio database.`, 'ok');
      } else {
        setStatus('Connected to your studio database. Any choice you click or save goes straight to Admin.', 'ok');
      }
    } catch {
      setStatus('Connected locally; cloud database sync waits on supabase/round3.sql.', 'warn');
    }
  }

  function wireCards() {
    // Hours preset quick-fill buttons
    $$('[data-hours-preset]').forEach(btn => {
      btn.onclick = () => {
        const card = btn.closest('.q-card');
        const mode = btn.dataset.hoursPreset;
        const gg = { mon: '8 AM - 11:30 PM', tue: '11 PM - 11:30 PM', wed: '8 AM - 11:30 PM', thu: '8 AM - 11:45 PM', fri: '8 AM - 11:30 PM', sat: '8 AM - 11:30 PM', sun: '8 AM - 11:30 PM' };
        const ig = { mon: '10 AM - 12 AM', tue: '10 AM - 12 AM', wed: '10 AM - 12 AM', thu: '10 AM - 12 AM', fri: '10 AM - 12 AM', sat: 'By appointment', sun: 'By appointment' };
        const map = mode === 'ig' ? ig : gg;
        Object.entries(map).forEach(([d, val]) => {
          const inp = card.querySelector(`[data-field="hours_${d}"]`);
          if (inp) inp.value = val;
        });
        const data = collectCardData(card);
        upsertQuestion(card.dataset.q, data, card.querySelector('.q-status'));
      };
    });

    // Wire real photo upload inputs inside Q14
    $$('input[data-upload-slot]').forEach(inp => {
      inp.addEventListener('change', async () => {
        const file = inp.files?.[0];
        if (!file) return;
        const slot = inp.dataset.uploadSlot;
        const card = inp.closest('.q-card');
        const statusEl = card.querySelector('.q-status');
        const localUrl = URL.createObjectURL(file);
        showUploadPreview(slot, localUrl);
        if (!sb) {
          statusEl.textContent = `Preview added for ${slot}. Connect Supabase to upload.`;
          return;
        }
        statusEl.textContent = `Uploading ${file.name}…`;
        try {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const path = `decisions/${slot}/${Date.now()}.${ext}`;
          const up = await sb.storage.from('site-images').upload(path, file, { contentType: file.type || 'image/jpeg' });
          if (up.error) throw up.error;
          const pubUrl = sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
          showUploadPreview(slot, pubUrl);
          answers.photos_upload = answers.photos_upload || {};
          answers.photos_upload.uploads = { ...(answers.photos_upload.uploads || {}), [slot]: pubUrl };
          await upsertQuestion('photos_upload', answers.photos_upload, statusEl);
        } catch (err) {
          statusEl.textContent = 'Shown locally; cloud upload opens after Pam applies supabase/round3.sql (' + (err.message || 'pending SQL') + ').';
        }
      });
    });

    // Save buttons & auto-save on change
    $$('.q-card').forEach(card => {
      hydrateCard(card);
      const st = card.querySelector('.q-status');
      const saveBtn = card.querySelector('[data-save-q]');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const data = collectCardData(card);
          upsertQuestion(card.dataset.q, data, st);
        };
      }
      card.addEventListener('change', e => {
        if (e.target.matches('input[type="file"]')) return;
        const data = collectCardData(card);
        upsertQuestion(card.dataset.q, data, st);
      });
    });

    const saveAllBtn = $('#dec-save-all');
    if (saveAllBtn) {
      saveAllBtn.onclick = async () => {
        saveAllBtn.disabled = true;
        setStatus('Saving all answers…', 'info');
        const rows = $$('.q-card').map(card => ({
          question_key: card.dataset.q,
          answer: collectCardData(card),
          updated_by: 'faith',
          updated_at: new Date().toISOString()
        }));
        saveLocalDraft();
        updateProgress();
        if (sb && cloudTableReady) {
          try {
            const { error } = await sb.from('decision_answers').upsert(rows);
            if (error) throw error;
            $$('.q-status').forEach(s => { s.textContent = 'Saved to studio database.'; });
            setStatus(`All ${rows.length} sections saved to Supabase — LaVante can read them in Admin.`, 'ok');
          } catch (e) {
            setStatus('Saved in this browser; database save opens after Pam applies supabase/round3.sql (' + (e.message || 'pending SQL') + ').', 'warn');
          }
        } else {
          $$('.q-status').forEach(s => { s.textContent = 'Saved in this browser.'; });
          setStatus(`Saved all ${rows.length} sections in this browser (cloud database sync opens once studio database setup finishes).`, 'warn');
        }
        saveAllBtn.disabled = false;
      };
    }
  }

  renderLogoGrid();
  wireCards();
  updateProgress();
  loadFromSupabase();
})();
