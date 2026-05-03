/* ================================================================
   InfoCivic Laval — Frontend Logic
   ================================================================ */

/* ── i18n ───────────────────────────────────────────────────── */
let translations = {};
let currentLang  = 'fr';

const LANGS = ['en', 'fr', 'es', 'pt', 'zh', 'tl'];

async function loadTranslations() {
  try {
    const resp = await fetch('/api/translations');
    translations = await resp.json();
  } catch { /* keep empty, t() falls back to key */ }
}

function t(key) {
  return translations[currentLang]?.[key]
      || translations['fr']?.[key]
      || translations['en']?.[key]
      || key;
}

function applyLang(lang, save = true) {
  currentLang = lang;
  if (save) localStorage.setItem('canrep-lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelector('.lang-dropdown-wrapper')?._updateCurrent?.();
}

function buildLangSwitcher() {
  const container = document.getElementById('lang-switcher');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'lang-dropdown-wrapper';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lang-dropdown-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Select language');

  const flagSpan = document.createElement('span');
  flagSpan.className = 'lang-dropdown-current';

  const chevron = document.createElement('span');
  chevron.className = 'lang-dropdown-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

  btn.appendChild(flagSpan);
  btn.appendChild(chevron);

  const menu = document.createElement('ul');
  menu.className = 'lang-dropdown-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', 'Language');

  LANGS.forEach(lang => {
    const li = document.createElement('li');
    li.className = 'lang-dropdown-item';
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '0');
    li.dataset.lang = lang;
    li.textContent = translations[lang]?.lang_name || lang.toUpperCase();
    li.addEventListener('click', () => { applyLang(lang); closeDropdown(); });
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyLang(lang); closeDropdown(); }
    });
    menu.appendChild(li);
  });

  wrapper.appendChild(btn);
  wrapper.appendChild(menu);
  container.appendChild(wrapper);

  function openDropdown() {
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('.lang-dropdown-item')?.focus();
  }
  function closeDropdown() {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }

  wrapper._updateCurrent = () => {
    flagSpan.textContent = translations[currentLang]?.lang_name || currentLang.toUpperCase();
    menu.querySelectorAll('.lang-dropdown-item').forEach(li => {
      li.classList.toggle('active', li.dataset.lang === currentLang);
      li.setAttribute('aria-selected', String(li.dataset.lang === currentLang));
    });
  };

  btn.addEventListener('click', () => {
    menu.classList.contains('open') ? closeDropdown() : openDropdown();
  });
  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) closeDropdown();
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openDropdown(); }
  });
}

/* ── Real meeting dates from laval.ca (2026) ────────────────── */
const MEETINGS = [
  { date: '2026-05-05', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-06-02', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-07-07', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-08-11', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-09-01', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-10-06', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-11-03', time: '18h30', type: 'Séance ordinaire' },
  { date: '2026-12-01', time: '18h30', type: 'Séance ordinaire' },
];

const MEETING_LOCATION = 'Hôtel de Ville temporaire, 3131 boul. Saint-Martin Ouest, Laval';
const MEETING_STREAM   = 'https://www.laval.ca/en/democratic-life/town-hall-elected-officials/city-council/seances-conseil-municipal/';

/* ── Static civic data (updated manually each cycle) ────────── */
const DECISIONS = [
  { title: 'Adoption du Plan d\'action climatique 2026-2030',                         date: '2026-04-01', status: 'approved' },
  { title: 'Subvention de 2 M$ pour la rénovation du parc des Prairies',              date: '2026-04-01', status: 'approved' },
  { title: 'Nouveau règlement sur les limites de vitesse en zone scolaire (30 km/h)', date: '2026-04-01', status: 'approved' },
  { title: 'Projet de ligne de bus rapide sur le boul. des Laurentides',               date: '2026-04-01', status: 'pending'  },
  { title: 'Moratoire sur les nouvelles constructions en zone inondable',               date: '2026-03-04', status: 'approved' },
  { title: 'Hausse de 2,9 % de la taxe foncière résidentielle 2026',                  date: '2026-03-04', status: 'approved' },
];

const PARTICIPATION = [
  {
    tag: 'consultation',
    title: 'Consultation publique — Révision du code d\'urbanisme',
    desc: 'Le conseil a adopté un projet de code d\'urbanisme le 22 avril 2026. Donnez votre avis avant son adoption finale.',
    deadline: null,
    url: 'https://www.laval.ca/en/democratic-life/citizen-participation/public-consultations/',
  },
  {
    tag: 'grant',
    title: 'Programmes de subventions — Aides financières aux résidents',
    desc: 'Subventions pour rénovations écoénergétiques, remplacement de foyer au bois, logement et plus encore.',
    deadline: null,
    url: 'https://www.laval.ca/en/support-funding/grant-programs/',
  },
  {
    tag: 'grant',
    title: 'Budget participatif de Laval — 2e édition',
    desc: '3 M$ pour des projets conçus et votés par les citoyens. Au moins un projet réalisé par secteur.',
    deadline: null,
    url: 'https://www.laval.ca/en/democratic-life/citizen-participation/budget-participatif/',
  },
  {
    tag: 'consultation',
    title: 'Comité consultatif d\'urbanisme (CCU)',
    desc: 'Siégez au CCU en tant que citoyen et participez aux décisions sur l\'aménagement du territoire.',
    deadline: null,
    url: 'https://www.laval.ca/en/democratic-life/citizen-participation/advisory-committee/urban-advisory-committee/',
  },
  {
    tag: 'volunteer',
    title: 'Poser une question lors d\'une séance du conseil',
    desc: 'Formulaire en ligne disponible de 9h la veille jusqu\'à midi le jour de la séance.',
    deadline: null,
    url: 'https://www.laval.ca/en/democratic-life/town-hall-elected-officials/city-council/poser-question/',
  },
  {
    tag: 'consultation',
    title: 'Assemblées de quartier — Projets pilotes',
    desc: 'Laval lance des assemblées de quartier dans Duvernay et Auteuil. Participez aux décisions locales.',
    deadline: null,
    url: 'https://www.laval.ca/en/democratic-life/citizen-participation/',
  },
];

/* ── Helpers ────────────────────────────────────────────────── */
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MONTHS_SHORT = ['JAN','FÉV','MAR','AVR','MAI','JUN','JUL','AOÛ','SEP','OCT','NOV','DÉC'];

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLong(str) {
  const d = parseLocalDate(str);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShort(str) {
  const d = parseLocalDate(str);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function daysUntil(str) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((parseLocalDate(str) - today) / 86400000);
}

function tagLabel(tag) {
  return { grant: 'Subvention', consultation: 'Consultation', volunteer: 'Participation' }[tag] || tag;
}

function statusLabel(s) {
  const labels = { approved: 'Adopté', pending: 'En examen', rejected: 'Rejeté' };
  return labels[s] || s;
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const LAVAL_FSA = new Set([
  'H7A','H7B','H7C','H7E','H7G','H7H','H7J','H7K','H7L','H7M',
  'H7N','H7P','H7R','H7S','H7T','H7V','H7W','H7X','H7Y',
]);

/* ── DOM references ─────────────────────────────────────────── */
const searchForm  = document.getElementById('laval-search-form');
const postalInput = document.getElementById('laval-postal-input');
const errorMsg    = document.getElementById('laval-error-msg');
const loading     = document.getElementById('laval-loading');
const results     = document.getElementById('laval-results');
const subForm     = document.getElementById('subscribe-form');

/* ── Postal search — uses /api/search for verified data ─────── */
searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError();

  const raw = postalInput.value.trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(raw)) {
    showError(t('laval_error_invalid'));
    return;
  }
  if (!LAVAL_FSA.has(raw.slice(0, 3))) {
    showError(t('laval_error_not_laval'));
    return;
  }

  loading.classList.remove('hidden');
  results.classList.add('hidden');

  let councillor = null;
  try {
    const resp = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postal_code: raw }),
    });
    const data = await resp.json();
    if (data.success) {
      councillor = data.representatives.find(r =>
        r.level === 'municipal' &&
        /conseiller/i.test(r.elected_office) &&
        /laval/i.test(r.district || r.district_name || '')
      );
      if (!councillor) {
        councillor = data.representatives.find(r =>
          r.level === 'municipal' && /conseiller/i.test(r.elected_office)
        );
      }
    }
  } catch { /* non-fatal */ }

  renderDistrict(raw, councillor);
  renderMeeting();
  renderDecisions();
  renderParticipation();
  prefillSubscribePostal(raw);
  loading.classList.add('hidden');
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');
}

/* ── Render: district bar ───────────────────────────────────── */
function renderDistrict(raw, councillor) {
  const districtHtml = councillor
    ? `<div>
        <div class="district-label">${t('laval_district_label')}</div>
        <div class="district-name">${esc(councillor.district || councillor.district_name)}</div>
       </div>
       <div class="district-divider" aria-hidden="true"></div>
       <div>
        <div class="district-label">${t('laval_councillor_label')}</div>
        <div class="district-councillor">${esc(councillor.name)}</div>
       </div>`
    : `<div>
        <div class="district-label">${t('laval_district_label')}</div>
        <div class="district-name">${esc(raw.slice(0,3) + ' ' + raw.slice(3))}</div>
       </div>
       <div class="district-divider" aria-hidden="true"></div>
       <div>
        <div class="district-councillor">District exact non disponible — <a href="https://www.laval.ca/vie-democratique/hotel-de-ville-personnes-elues/membres-conseil-municipal/" target="_blank" rel="noopener noreferrer" style="color:rgba(255,255,255,.85)">voir laval.ca</a></div>
       </div>`;
  document.getElementById('laval-district-bar').innerHTML = districtHtml;
}

/* ── Render: next meeting ───────────────────────────────────── */
function renderMeeting() {
  const today = new Date(); today.setHours(0,0,0,0);
  const next  = MEETINGS.find(m => parseLocalDate(m.date) >= today) || MEETINGS[MEETINGS.length - 1];
  const rest  = MEETINGS.filter(m => m !== next && parseLocalDate(m.date) >= today).slice(0, 5);
  const diff  = daysUntil(next.date);
  const nd    = parseLocalDate(next.date);

  const countdownText  = diff === 0 ? 'Aujourd\'hui' : diff === 1 ? 'Demain' : `Dans ${diff} jours`;
  const countdownClass = diff === 0 ? 'meeting-countdown today' : 'meeting-countdown';

  const datesChips = rest.map(m =>
    `<span class="date-chip">${formatShort(m.date)}</span>`
  ).join('');

  document.getElementById('meeting-content').innerHTML = `
    <div class="meeting-block">
      <div class="meeting-date-badge" aria-label="${formatLong(next.date)}">
        <div class="mdb-day">${nd.getDate()}</div>
        <div class="mdb-month">${MONTHS_SHORT[nd.getMonth()]}</div>
        <div class="mdb-year">${nd.getFullYear()}</div>
      </div>
      <div class="meeting-info">
        <h3>${esc(next.type)}</h3>
        <ul class="meeting-meta">
          <li><span class="meta-label">${t('laval_meeting_time')} :</span>${esc(next.time)}</li>
          <li><span class="meta-label">${t('laval_meeting_location')} :</span>${esc(MEETING_LOCATION)}</li>
          <li><span class="meta-label">${t('laval_meeting_stream')} :</span><a href="${esc(MEETING_STREAM)}" target="_blank" rel="noopener noreferrer">${t('laval_meeting_watch')}</a></li>
        </ul>
        <span class="${countdownClass}">${countdownText}</span>
      </div>
    </div>
    ${rest.length ? `
    <div class="meeting-all-dates">
      <h4>${t('laval_meeting_upcoming')}</h4>
      <div class="dates-grid">${datesChips}</div>
    </div>` : ''}
  `;
}

/* ── Render: decisions ──────────────────────────────────────── */
function renderDecisions() {
  const rows = DECISIONS.map(d => `
    <div class="decision-row">
      <span class="dr-status ${d.status}">${statusLabel(d.status)}</span>
      <span class="dr-title">${esc(d.title)}</span>
      <span class="dr-date">${formatLong(d.date)}</span>
    </div>
  `).join('');

  document.getElementById('decisions-content').innerHTML =
    `<div class="decisions-list">${rows}</div>`;
}

/* ── Render: participation ──────────────────────────────────── */
function renderParticipation() {
  const rows = PARTICIPATION.map(p => {
    const deadline = p.deadline
      ? `<span class="pr-deadline">Date limite : ${formatLong(p.deadline)}</span>`
      : '';
    const titleEl = p.url
      ? `<a class="pr-title" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>`
      : `<span class="pr-title">${esc(p.title)}</span>`;
    return `
      <div class="participation-row">
        <span class="pr-tag ${p.tag}">${tagLabel(p.tag)}</span>
        <div class="pr-body">
          ${titleEl}
          <div class="pr-desc">${esc(p.desc)}</div>
          ${deadline}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('participation-content').innerHTML =
    `<div class="participation-list">${rows}</div>`;
}

/* ── Pre-fill subscribe postal ──────────────────────────────── */
function prefillSubscribePostal(raw) {
  const formatted = raw.slice(0,3) + ' ' + raw.slice(3);
  document.getElementById('sub-postal').value = formatted;
}

/* ── Subscribe form ─────────────────────────────────────────── */
subForm.addEventListener('submit', async e => {
  e.preventDefault();

  const subError   = document.getElementById('sub-error-msg');
  const subSuccess = document.getElementById('sub-success');
  const btn        = document.getElementById('sub-btn');

  subError.classList.add('hidden');
  subSuccess.classList.add('hidden');

  const name    = document.getElementById('sub-name').value.trim();
  const postal  = document.getElementById('sub-postal').value.trim().toUpperCase().replace(/\s/g,'');
  const phone   = document.getElementById('sub-phone').value.trim().replace(/[\s\-\(\)\.]/g,'');
  const consent = document.getElementById('sub-consent').checked;

  if (!name || name.length < 2) {
    subError.textContent = t('laval_err_name');
    subError.classList.remove('hidden');
    return;
  }
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal)) {
    subError.textContent = t('laval_err_postal');
    subError.classList.remove('hidden');
    return;
  }
  if (!/^\+?1?\d{10,11}$/.test(phone)) {
    subError.textContent = t('laval_err_phone');
    subError.classList.remove('hidden');
    return;
  }
  if (!consent) {
    subError.textContent = t('laval_err_consent');
    subError.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = '…';

  try {
    const res = await fetch('/api/laval/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, postal_code: postal, phone }),
    });
    const data = await res.json();

    if (data.success) {
      subSuccess.textContent = t('laval_success_subscribe');
      subSuccess.classList.remove('hidden');
      subForm.reset();
    } else {
      const key = {
        rate_limit:         'laval_err_ratelimit',
        already_subscribed: 'laval_err_already',
        invalid_phone:      'laval_err_phone',
        invalid_postal:     'laval_err_postal',
        invalid_name:       'laval_err_name',
      }[data.error] || 'laval_err_generic';
      subError.textContent = t(key);
      subError.classList.remove('hidden');
    }
  } catch {
    subError.textContent = t('laval_err_generic');
    subError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = t('laval_btn_subscribe');
  }
});

/* ── Auto-format postal code inputs ─────────────────────────── */
postalInput.addEventListener('input', () => {
  let v = postalInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length > 3) v = v.slice(0, 3) + ' ' + v.slice(3);
  postalInput.value = v.slice(0, 7);
});

document.getElementById('sub-postal').addEventListener('input', function () {
  let v = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length > 3) v = v.slice(0, 3) + ' ' + v.slice(3);
  this.value = v.slice(0, 7);
});

/* ── Correction modal ───────────────────────────────────────── */
document.getElementById('laval-correction-btn').addEventListener('click', () => {
  const modal = document.getElementById('laval-correction-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.querySelector('textarea, input')?.focus();
  }
});

const corrModal = document.getElementById('laval-correction-modal');
if (corrModal) {
  corrModal.querySelector('.laval-modal-close')?.addEventListener('click', () => {
    corrModal.classList.add('hidden');
  });
  corrModal.addEventListener('click', e => {
    if (e.target === corrModal) corrModal.classList.add('hidden');
  });

  corrModal.querySelector('#laval-corr-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const msg   = corrModal.querySelector('#laval-corr-message').value.trim();
    const email = corrModal.querySelector('#laval-corr-email').value.trim();
    const errEl = corrModal.querySelector('#laval-corr-error');
    const okEl  = corrModal.querySelector('#laval-corr-success');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    if (!msg || msg.length < 5) {
      errEl.textContent = t('feedback_error_short');
      errEl.classList.remove('hidden');
      return;
    }
    try {
      const res  = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suggestion',
          message: msg,
          email: email || null,
          rep_name: null,
          postal_code: results.dataset.postal || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        okEl.textContent = t('laval_correction_success');
        okEl.classList.remove('hidden');
        corrModal.querySelector('#laval-corr-form').reset();
      } else {
        errEl.textContent = t('feedback_error_generic');
        errEl.classList.remove('hidden');
      }
    } catch {
      errEl.textContent = t('feedback_error_generic');
      errEl.classList.remove('hidden');
    }
  });
}

/* ── Boot ───────────────────────────────────────────────────── */
(async () => {
  await loadTranslations();

  const saved = localStorage.getItem('canrep-lang');
  const browser = (navigator.language || 'fr').split('-')[0].toLowerCase();
  currentLang = LANGS.includes(saved) ? saved
              : LANGS.includes(browser) ? browser
              : 'fr';

  applyLang(currentLang, false);
  buildLangSwitcher();
})();
