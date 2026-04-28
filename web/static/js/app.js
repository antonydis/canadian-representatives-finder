/* ================================================================
   Canadian Representatives Finder — Frontend Logic
   ================================================================ */

const LANGS = ['en', 'fr', 'es', 'pt', 'zh', 'tl'];
let translations = {};
let currentLang = 'en';

/* ── SVG icons (Heroicons, MIT license) ───────────────────────── */
const ICONS = {
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>`,
  health: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v8M8 12h8"/>
  </svg>`,
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
  </svg>`,
  document: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>`,
  road: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  briefcase: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/>
  </svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`,
  school: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5"/>
  </svg>`,
  phone: `<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  compose: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
};

/* ── Triage case definitions (icons + level, text from translations) ── */
const TRIAGE_CASES = [
  { id: 'garbage',     level: 'municipal',  icon: ICONS.trash       },
  { id: 'doctor',      level: 'provincial', icon: ICONS.health      },
  { id: 'immigration', level: 'federal',    icon: ICONS.globe       },
  { id: 'taxes',       level: 'federal',    icon: ICONS.document    },
  { id: 'pothole',     level: 'municipal',  icon: ICONS.road        },
  { id: 'ei',          level: 'federal',    icon: ICONS.briefcase   },
  { id: 'housing',     level: 'mixed',      icon: ICONS.home        },
  { id: 'school',      level: 'provincial', icon: ICONS.school      },
];

/* ── LEVEL ↔ CSS CLASS MAP ───────────────────────────────────── */
const LEVEL_CLASS = {
  federal:    'federal',
  provincial: 'provincial',
  municipal:  'municipal',
  mixed:      'mixed',
};

/* ── LEVEL LABEL KEYS ────────────────────────────────────────── */
const LEVEL_KEY = {
  federal:    'level_federal',
  provincial: 'level_provincial',
  municipal:  'level_municipal',
  mixed:      'level_mixed',
};

/* active triage level — set when chip selected or classified by AI */
let activeTriageLevel = null;

/* situation text for smart mailto pre-fill */
let activeTriageSituation = null;

/* active case id — for language-aware email template */
let activeCaseId = null;

/* AI-provided situation summaries in EN/FR for bilingual email templates */
let activeSituationEn = null;
let activeSituationFr = null;

/* ================================================================
   INIT
   ================================================================ */

async function init() {
  const resp = await fetch('/api/translations');
  translations = await resp.json();

  currentLang = detectLang();
  buildLangButtons();
  applyLang(currentLang);
  buildTriageChips();
  initTabs();

  initEmailModal();

  document.getElementById('search-form').addEventListener('submit', e => handleSearch(e, 'main'));
  document.getElementById('triage-search-form').addEventListener('submit', e => handleSearch(e, 'triage'));
  document.getElementById('triage-open-form').addEventListener('submit', handleOpenFormSubmit);
  document.getElementById('triage-back-btn').addEventListener('click', resetTriageToPhase1);

  document.getElementById('postal-input').addEventListener('input', () => clearError('main'));
  document.getElementById('triage-postal-input').addEventListener('input', () => clearError('triage'));

  checkUrlPostal();

  // Char counter for triage open input
  const openInput   = document.getElementById('triage-open-input');
  const charCounter = document.getElementById('triage-char-count');
  if (openInput && charCounter) {
    openInput.addEventListener('input', () => {
      const len = openInput.value.length;
      charCounter.textContent = `${len} / 200`;
      charCounter.classList.toggle('triage-char-count--warn', len > 180);
    });
  }

}

/* ── Share results ───────────────────────────────────────────── */
async function shareResults(postalCode) {
  const clean = postalCode.replace(' ', '');
  const url = `${location.origin}/reps?postal=${clean}`;
  const text = `Find your Canadian representatives for ${postalCode} 🍁`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'InfoCivic 🍁', text, url });
      return;
    } catch { /* user cancelled */ }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    showShareToast();
  } catch {
    prompt('Copy this link:', url);
  }
}

function showShareToast() {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    toast.className = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '🔗 ' + (translations[currentLang]?.link_copied || 'Link copied!');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Auto-fill postal from URL param (?postal=H2X1Y6) ───────── */
function checkUrlPostal() {
  const params = new URLSearchParams(window.location.search);
  const postal = params.get('postal');
  if (postal && /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(postal.replace(' ',''))) {
    const input = document.getElementById('postal-input');
    if (input) {
      const formatted = postal.slice(0,3).toUpperCase() + ' ' + postal.slice(3).toUpperCase();
      input.value = formatted;
      document.getElementById('search-form').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
    }
  }
}

/* ── Language detection ──────────────────────────────────────── */
function detectLang() {
  const saved = localStorage.getItem('canrep-lang');
  if (saved && LANGS.includes(saved)) return saved;
  const browser = (navigator.language || 'en').split('-')[0].toLowerCase();
  return LANGS.includes(browser) ? browser : 'en';
}

/* ================================================================
   INTERNATIONALISATION
   ================================================================ */

function t(key) {
  return translations[currentLang]?.[key] || translations['en']?.[key] || key;
}

function applyLang(lang) {
  const prevLang = currentLang;
  currentLang = lang;
  localStorage.setItem('canrep-lang', lang);
  // GA4: track language selection (only when user actively changes it)
  if (prevLang && prevLang !== lang && typeof gtag !== 'undefined') {
    gtag('event', 'change_language', { language: lang });
  }
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Refresh dropdown label
  document.querySelector('.lang-dropdown-wrapper')?._updateCurrent?.();

  // Re-render triage chips with new language
  buildTriageChips();

  // Re-render any open triage result
  const selectedCard = document.querySelector('.triage-card.selected');
  if (selectedCard) {
    showTriageResult(selectedCard.dataset.caseId);
  }
}

function buildLangButtons() {
  const container = document.getElementById('lang-switcher');
  container.innerHTML = '';

  // Compact dropdown
  const wrapper = document.createElement('div');
  wrapper.className = 'lang-dropdown-wrapper';

  const btn = document.createElement('button');
  btn.className = 'lang-dropdown-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Select language');

  const flagSpan = document.createElement('span');
  flagSpan.className = 'lang-dropdown-current';

  const chevron = document.createElement('span');
  chevron.className = 'lang-dropdown-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

  btn.appendChild(flagSpan);
  btn.appendChild(chevron);

  const menu = document.createElement('ul');
  menu.className = 'lang-dropdown-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  LANGS.forEach(lang => {
    const li = document.createElement('li');
    li.className = 'lang-dropdown-item';
    li.setAttribute('role', 'option');
    li.dataset.lang = lang;
    li.textContent = translations[lang]?.lang_name || lang.toUpperCase();
    li.addEventListener('click', () => {
      applyLang(lang);
      closeDropdown();
    });
    menu.appendChild(li);
  });

  function updateCurrent() {
    flagSpan.textContent = translations[currentLang]?.lang_name || currentLang.toUpperCase();
    menu.querySelectorAll('.lang-dropdown-item').forEach(li => {
      li.classList.toggle('active', li.dataset.lang === currentLang);
      li.setAttribute('aria-selected', String(li.dataset.lang === currentLang));
    });
  }

  function openDropdown() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('open');
    // Position menu using fixed coords so it never gets clipped
    const rect = btn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 6) + 'px';
    // Align right edge to button right, but clamp to viewport
    const menuW = 160;
    const left  = Math.max(8, rect.right - menuW);
    menu.style.left = left + 'px';
  }

  function closeDropdown() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('open');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.hidden ? openDropdown() : closeDropdown();
  });

  document.addEventListener('click', () => closeDropdown());
  menu.addEventListener('click', e => e.stopPropagation());

  // Keyboard navigation
  btn.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
    if (e.key === 'ArrowDown') { e.preventDefault(); openDropdown(); menu.querySelector('.lang-dropdown-item')?.focus(); }
  });
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('.lang-dropdown-item')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Enter')     { e.preventDefault(); document.activeElement.click(); }
    if (e.key === 'Escape')    { closeDropdown(); btn.focus(); }
  });
  menu.querySelectorAll('.lang-dropdown-item').forEach(li => { li.tabIndex = 0; });

  // Expose update function so applyLang can refresh the label
  wrapper._updateCurrent = updateCurrent;
  updateCurrent();

  wrapper.appendChild(btn);
  wrapper.appendChild(menu);
  container.appendChild(wrapper);
}

/* ================================================================
   CLIENT-SIDE ROUTER
   ================================================================ */

const ROUTES = {
  '/':       'find',
  '/reps':   'find',
  '/triage': 'triage',
};

const PAGE_TITLES = {
  find:   'Find Your Reps | InfoCivic 🍁',
  triage: 'Who Do I Contact? | InfoCivic 🍁',
};

function resolveRoute(pathname) {
  return ROUTES[pathname] || ROUTES['/'];
}

function navigateTo(which, pushState = true) {
  const path = which === 'triage' ? '/triage' : '/reps';
  if (pushState && window.location.pathname !== path) {
    history.pushState({ view: which }, '', path);
  }
  document.title = PAGE_TITLES[which];
  _applyTab(which);
}

function _applyTab(which) {
  const panels = { find: document.getElementById('panel-find'), triage: document.getElementById('panel-triage') };
  const active   = which === 'find' ? 'tab-find'   : 'tab-triage';
  const inactive = which === 'find' ? 'tab-triage' : 'tab-find';
  document.getElementById(active).classList.add('active');
  document.getElementById(active).setAttribute('aria-selected', 'true');
  document.getElementById(inactive).classList.remove('active');
  document.getElementById(inactive).setAttribute('aria-selected', 'false');
  panels.find.hidden   = which !== 'find';
  panels.triage.hidden = which !== 'triage';
}

function initTabs() {
  // Read initial route from URL
  const initial = resolveRoute(window.location.pathname);
  navigateTo(initial, false);

  // Tab click → push to history
  document.getElementById('tab-find').addEventListener('click', () => navigateTo('find'));
  document.getElementById('tab-triage').addEventListener('click', () => navigateTo('triage'));

  // Keyboard arrow navigation between tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = btn.id === 'tab-find' ? 'triage' : 'find';
        navigateTo(next);
        document.getElementById(`tab-${next}`)?.focus();
      }
    });
  });

  // Browser back / forward
  window.addEventListener('popstate', e => {
    const which = e.state?.view || resolveRoute(window.location.pathname);
    _applyTab(which);
    document.title = PAGE_TITLES[which];
  });
}

/* ================================================================
   TRIAGE CHIPS
   ================================================================ */

function buildTriageChips() {
  const container = document.getElementById('triage-chips');
  container.innerHTML = '';

  TRIAGE_CASES.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'triage-chip';
    chip.dataset.caseId = c.id;
    chip.setAttribute('role', 'listitem');
    chip.setAttribute('aria-label', t(`case_${c.id}_title`));
    chip.type = 'button';

    const dot = document.createElement('span');
    dot.className = `triage-chip-dot ${LEVEL_CLASS[c.level]}`;
    dot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = t(`case_${c.id}_title`);

    chip.append(dot, label);

    chip.addEventListener('click', () => activateTriage(c.id));
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.click(); }
    });

    container.appendChild(chip);
  });
}

/* ── Open text form: client validation → AI classify → triage ── */
async function handleOpenFormSubmit(e) {
  e.preventDefault();
  const input   = document.getElementById('triage-open-input');
  const errorEl = document.getElementById('triage-open-error');
  const text    = input.value.trim();

  // Client-side validation
  const hideErr = () => errorEl.classList.add('hidden');
  const showErr = msg => { errorEl.textContent = msg; errorEl.classList.remove('hidden'); };

  hideErr();
  if (!text || text.length < 10) {
    showErr(t('error_too_short'));
    input.focus();
    return;
  }
  if (text.length > 200) {
    showErr(t('error_too_long'));
    input.focus();
    return;
  }

  const aiLoading = document.getElementById('triage-ai-loading');
  const sendBtn   = document.querySelector('.triage-send-btn');
  aiLoading.classList.remove('hidden');
  sendBtn.disabled = true;

  try {
    const resp = await fetch('/api/classify-situation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, lang: currentLang }),
    });
    const data = await resp.json();

    const validLevels = ['federal', 'provincial', 'municipal'];
    if (resp.ok && data.success && validLevels.includes(data.jurisdiction)) {
      activeSituationEn = data.situation_en || null;
      activeSituationFr = data.situation_fr || null;
      activateTriage(null, text, {
        level:       data.jurisdiction,
        explanation: data.explanation,
        service:     data.service,
      });
      // GA4: track AI situation classification
      gtag('event', 'classify_situation', {
        jurisdiction: data.jurisdiction,
        service: data.service || 'none',
        lang: currentLang,
        situation_en: data.situation_en || '',
      });
    } else if (resp.status === 429) {
      showErr(t('error_rate_limit'));
    } else {
      // Default to municipal on any classification failure
      activateTriage(null, text, {
        level:       'municipal',
        explanation: t('error_classify_fallback'),
        service:     '311',
      });
    }
  } catch {
    activateTriage(null, text, {
      level:       'municipal',
      explanation: t('error_classify_fallback'),
      service:     '311',
    });
  } finally {
    aiLoading.classList.add('hidden');
    sendBtn.disabled = false;
  }
}

/* ── Phase 1 → Phase 2 transition ───────────────────────────── */
function activateTriage(caseId, freeText = null, aiData = null) {
  const caseData = caseId ? TRIAGE_CASES.find(c => c.id === caseId) : null;

  // Store active level for result filtering (null = show all, mixed = show all)
  activeTriageLevel = caseData?.level ?? aiData?.level ?? null;

  // Store case id + situation text for language-aware email templates
  activeCaseId          = caseId || null;
  activeTriageSituation = freeText || (caseId ? t(`case_${caseId}_title`) : null);

  // Switch phases
  document.getElementById('triage-phase-1').hidden = true;
  document.getElementById('triage-phase-2').hidden = false;

  // Populate result card
  const header      = document.getElementById('triage-result-header');
  const badge       = document.getElementById('triage-level-badge');
  const explanation = document.getElementById('triage-explanation');
  const services    = document.getElementById('triage-services-value');

  if (caseData) {
    // Chip-selected path
    const levelClass = LEVEL_CLASS[caseData.level];
    header.className  = `triage-result-header ${levelClass}`;
    badge.className   = `triage-level-badge ${levelClass}`;
    badge.textContent = t(LEVEL_KEY[caseData.level]);
    explanation.textContent = t(`case_${caseId}_explanation`);
    services.textContent    = t(`case_${caseId}_services`);
    document.querySelector('.triage-services').hidden = false;
  } else if (aiData) {
    // AI classification path — map jurisdiction to level and apply same styling as chip path
    // Ensure aiData.level is valid (federal, provincial, municipal)
    const validLevel = ['federal', 'provincial', 'municipal'].includes(aiData.level)
      ? aiData.level
      : 'mixed';
    
    const levelClass = LEVEL_CLASS[validLevel];
    const levelKey = LEVEL_KEY[validLevel];
    
    // Apply the exact same styling as the chip-selected path
    header.className  = `triage-result-header ${levelClass}`;
    badge.className   = `triage-level-badge ${levelClass}`;
    badge.textContent = t(levelKey);
    explanation.textContent = aiData.explanation || '';
    
    // Handle services: show only if a valid service is provided
    const hasService = aiData.service && aiData.service !== 'null' && aiData.service.trim();
    services.textContent = hasService ? aiData.service : '';
    document.querySelector('.triage-services').hidden = !hasService;
  } else {
    // Bare fallback (chip path without a match — should not normally occur)
    header.className  = 'triage-result-header mixed';
    badge.className   = 'triage-level-badge mixed';
    badge.textContent = t('level_mixed');
    explanation.textContent = freeText ? `"${freeText}"` : '';
    document.querySelector('.triage-services').hidden = true;
  }

  // Reset postal search
  document.getElementById('triage-postal-input').value = '';
  clearError('triage');
  document.getElementById('triage-results').classList.add('hidden');
  document.getElementById('triage-results').innerHTML = '';
  document.getElementById('triage-loading').classList.add('hidden');

  document.getElementById('triage-phase-2').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Back button: Phase 2 → Phase 1 ─────────────────────────── */
function resetTriageToPhase1() {
  activeTriageLevel     = null;
  activeTriageSituation = null;
  activeCaseId          = null;
  activeSituationEn     = null;
  activeSituationFr     = null;
  document.getElementById('triage-phase-1').hidden = false;
  document.getElementById('triage-phase-2').hidden = true;
  document.getElementById('triage-open-input').value = '';
  document.getElementById('triage-open-input').focus();
}

/* ================================================================
   SEARCH (shared for both tabs)
   ================================================================ */

async function handleSearch(e, source) {
  e.preventDefault();

  const inputId   = source === 'main'   ? 'postal-input'      : 'triage-postal-input';
  const loadingId = source === 'main'   ? 'loading'            : 'triage-loading';
  const resultsId = source === 'main'   ? 'results'            : 'triage-results';
  // For triage: use the stored level to filter; null or 'mixed' = show all
  const levelFilter = source === 'triage' ? activeTriageLevel : null;

  const input   = document.getElementById(inputId);
  const rawCode = input.value.trim().toUpperCase().replace(/\s/g, '');

  if (!isValidPostalCode(rawCode)) {
    showError(source, t('error_invalid'));
    input.focus();
    return;
  }

  const displayCode = `${rawCode.slice(0, 3)} ${rawCode.slice(3)}`;
  showLoading(source);

  try {
    const resp = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postal_code: displayCode }),
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      showError(source, data.error === 'rate_limit' ? t('error_rate_limit') : t('error_api'));
      hideLoading(source);
      return;
    }

    renderResults(data.representatives, displayCode, resultsId, levelFilter, source === 'triage');
    // GA4: track postal code search
    gtag('event', 'search_representatives', {
      postal_code: displayCode,
      source: source,
      lang: currentLang,
      result_count: data.representatives.length,
    });
  } catch {
    showError(source, t('error_api'));
    hideLoading(source);
  }
}

function isValidPostalCode(code) {
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code);
}

/* ================================================================
   RENDER RESULTS
   ================================================================ */

function renderResults(reps, postalCode, containerId, levelFilter = null, showEmailTemplate = false) {
  hideLoading(containerId === 'results' ? 'main' : 'triage');

  const section = document.getElementById(containerId);
  section.innerHTML = '';
  section.classList.remove('hidden');

  // Determine which levels to display
  // 'mixed' or null = show all; any specific level = filter to that level only
  const showLevels = (!levelFilter || levelFilter === 'mixed')
    ? ['federal', 'provincial', 'municipal']
    : [levelFilter];

  const grouped = { federal: [], provincial: [], municipal: [] };
  reps.forEach(r => { (grouped[r.level] ?? grouped.municipal).push(r); });

  // Check if filtered levels have any reps at all
  const hasReps = showLevels.some(lvl => grouped[lvl].length > 0);

  if (!hasReps) {
    section.innerHTML = `<p class="lead">${t('no_results')}</p>`;
    return;
  }

  const header = el('div', 'results-header');
  const titleSpan = el('span');
  titleSpan.innerHTML = `${t('results_title')} <strong>${postalCode}</strong>`;

  // Share button
  const shareBtn = el('button', 'share-btn');
  shareBtn.setAttribute('aria-label', t('share_results') || 'Share');
  shareBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> ${t('share_results') || 'Share'}`;
  shareBtn.addEventListener('click', () => shareResults(postalCode));

  header.append(titleSpan, shareBtn);
  section.appendChild(header);

  // Update URL to reflect current search (deep-linkable)
  const cleanCode = postalCode.replace(' ', '');
  const view = containerId === 'results' ? 'find' : 'triage';
  const newUrl = `${window.location.pathname}?postal=${cleanCode}`;
  history.replaceState({ view, postal: cleanCode }, '', newUrl);

  showLevels.forEach(level => {
    if (!grouped[level].length) return;

    const levelSec = el('div', 'level-section');
    const heading  = el('div', `level-heading ${level}`);
    heading.innerHTML = `${levelSvg(level)}<span>${t(level)}</span>`;
    levelSec.appendChild(heading);

    grouped[level].forEach(rep => levelSec.appendChild(buildRepCard(rep, level, showEmailTemplate)));

    section.appendChild(levelSec);
  });

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function levelSvg(level) {
  const svgs = {
    federal:    ICONS.globe,
    provincial: ICONS.school,
    municipal:  ICONS.home,
  };
  return `<span style="display:flex;align-items:center">${svgs[level] || ''}</span>`;
}

/* ── Email template helpers ──────────────────────────────────── */
function isQuebecRep(rep) {
  const office = (rep.elected_office || '').toLowerCase();
  return (
    office.includes('mna')          ||
    office.includes('maire')        ||
    office.includes('mairesse')     ||
    office.includes('conseiller')   ||
    office.includes('conseillère')
  );
}

function resolveTitle(rep, useFr) {
  const office = (rep.elected_office || '').toLowerCase();
  if (useFr) {
    if (office.includes('maire') || office.includes('mairesse')) return `Monsieur le Maire / Madame la Mairesse ${rep.name}`;
    if (office.includes('conseill')) return `Monsieur le Conseiller / Madame la Conseillère ${rep.name}`;
    if (office.includes('mna') || office.includes('député')) return `Monsieur le Député / Madame la Députée ${rep.name}`;
    if (office.includes('senator') || office.includes('sénat')) return `Monsieur le Sénateur / Madame la Sénatrice ${rep.name}`;
    return `${rep.name}`;
  } else {
    if (office.includes('mayor') || office.includes('maire')) return `Mayor ${rep.name}`;
    if (office.includes('councillor') || office.includes('councilor') || office.includes('conseill')) return `Councillor ${rep.name}`;
    if (office === 'mp' || office.includes('member of parliament')) return `${rep.name}, MP`;
    if (office.includes('mla') || office.includes('mpp') || office.includes('mna')) return `${rep.name}, ${rep.elected_office}`;
    if (office.includes('senator')) return `Senator ${rep.name}`;
    return `${rep.elected_office} ${rep.name}`;
  }
}

function buildContextualGuide(useFr) {
  const level = activeTriageLevel || 'municipal';
  if (useFr) {
    const base = [
      '• Adresse exacte ou localisation concernée : [ex. 123 rue Principale, près du feu de signalisation]',
      '• Date depuis laquelle vous avez constaté le problème : [ex. depuis 2 semaines]',
      '• Description précise : [décrivez le problème en détail]',
    ];
    if (level === 'municipal') base.push('• Photo jointe si possible : [joindre une photo du problème]');
    if (level === 'federal') base.push('• Numéro de dossier ou de référence (si applicable) : [ex. numéro IRCC, numéro de demande]');
    if (level === 'provincial') base.push('• Numéro de référence (si applicable) : [ex. numéro de dossier médical, no. de demande]');
    return base.join('\n');
  } else {
    const base = [
      '• Exact location or address: [e.g. 123 Main Street, near the traffic light]',
      '• When you first noticed the issue: [e.g. approximately 2 weeks ago]',
      '• Detailed description: [describe the problem clearly]',
    ];
    if (level === 'municipal') base.push('• Photo attached if possible: [attach a photo of the issue]');
    if (level === 'federal') base.push('• File or reference number (if applicable): [e.g. IRCC application number]');
    if (level === 'provincial') base.push('• Reference number (if applicable): [e.g. case number, application ID]');
    return base.join('\n');
  }
}

function buildEmailTemplate(rep) {
  const useFr     = isQuebecRep(rep);
  const emailLang = useFr ? 'fr' : 'en';

  // Resolve situation in the EMAIL language
  let situation;
  if (activeCaseId) {
    situation = translations[emailLang]?.[`case_${activeCaseId}_title`] || activeTriageSituation || '';
  } else if (useFr && activeSituationFr) {
    situation = activeSituationFr;
  } else if (!useFr && activeSituationEn) {
    situation = activeSituationEn;
  } else {
    situation = activeTriageSituation || '';
  }

  const title   = resolveTitle(rep, useFr);
  const snippet = situation.length > 60 ? situation.substring(0, 60) + '…' : situation;
  const guide   = buildContextualGuide(useFr);

  let subject, body;
  if (useFr) {
    subject = `Demande citoyenne${snippet ? ' — ' + snippet : ''}`;
    body =
      `${title},\n\n` +
      (situation
        ? `Je me permets de vous contacter au sujet de la situation suivante dans votre circonscription :\n\n` +
          `${situation}\n\n`
        : `Je me permets de vous contacter en tant que citoyen(ne) de votre circonscription.\n\n`) +
      `Afin de vous permettre de traiter cette demande efficacement, voici les informations pertinentes :\n\n` +
      `${guide}\n\n` +
      `Je vous serais très reconnaissant(e) de bien vouloir examiner cette situation et m'informer des démarches possibles.\n\n` +
      `Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n` +
      `[Votre prénom et nom]\n[Votre adresse]\n[Votre courriel / téléphone]`;
  } else {
    subject = `Constituent Inquiry${snippet ? ' — ' + snippet : ''}`;
    body =
      `Dear ${title},\n\n` +
      `I am writing to bring to your attention the following matter in your constituency:\n\n` +
      (situation ? `${situation}\n\n` : '') +
      `To help you address this efficiently, here are the relevant details:\n\n` +
      `${guide}\n\n` +
      `I would greatly appreciate your attention to this matter and any guidance on next steps or available resources.\n\n` +
      `Thank you for your service to our community.\n\n` +
      `Sincerely,\n[Your Full Name]\n[Your Address]\n[Your Email / Phone]`;
  }

  return { subject, body, to: rep.email };
}


function fallbackCopy(text, onSuccess) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); onSuccess(); } catch (_) { /* silent */ }
  document.body.removeChild(ta);
}

function buildRepCard(rep, level, showEmailTemplate = false) {
  const card = el('div', `rep-card ${level}`);

  const main   = el('div', 'rep-main');
  const office = el('div', 'rep-office'); office.textContent = rep.elected_office;
  const name   = el('div', 'rep-name');   name.textContent   = rep.name;
  const meta   = el('div', 'rep-meta');

  if (rep.party)    meta.appendChild(badge(rep.party, 'badge-party'));
  if (rep.district) meta.appendChild(badge(rep.district, 'badge-district'));

  main.append(office, name, meta);

  const contact = el('div', 'rep-contact');
  if (rep.phone) contact.appendChild(contactRow(ICONS.phone, rep.phone, `tel:${rep.phone.replace(/\s/g, '')}`));
  if (rep.email) {
    // Plain email link — no pre-fill
    contact.appendChild(contactRow(ICONS.mail, rep.email, `mailto:${rep.email}`));
  }
  if (showEmailTemplate) {
    const copyRow = el('div', 'draft-email-row');
    const copyBtn = el('button', 'draft-email-btn');
    copyBtn.type = 'button';
    copyBtn.innerHTML = `${ICONS.compose}<span data-i18n="copy_template">${t('copy_template')}</span>`;
    copyBtn.addEventListener('click', () => openEmailModal(rep));
    copyRow.appendChild(copyBtn);
    contact.appendChild(copyRow);
  }
  if (rep.url) contact.appendChild(contactRow(ICONS.link, t('website'), rep.url, true));

  card.append(main, contact);
  return card;
}

function badge(text, cls) {
  const b = el('span', `badge ${cls}`);
  b.textContent = text;
  return b;
}

function contactRow(iconSvg, text, href, external = false) {
  const row = el('div', 'contact-item');
  const ico = el('span', 'contact-icon');
  ico.innerHTML = iconSvg;
  ico.setAttribute('aria-hidden', 'true');

  if (href) {
    const a = el('a', '');
    a.href = href; a.textContent = text;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    row.append(ico, a);
  } else {
    row.append(ico, document.createTextNode(text));
  }
  return row;
}

/* ================================================================
   EMAIL MODAL
   ================================================================ */

function initEmailModal() {
  const overlay = document.getElementById('email-modal');
  const closeBtn = document.getElementById('email-modal-close');
  const copyBtn  = document.getElementById('modal-copy-btn');

  // Close on overlay click (outside modal box)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeEmailModal();
  });
  closeBtn.addEventListener('click', closeEmailModal);

  // Copy to clipboard
  copyBtn.addEventListener('click', () => {
    const body = document.getElementById('modal-body').textContent;
    const confirm = () => {
      copyBtn.textContent = t('copied');
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = t('copy_template');
        copyBtn.classList.remove('copied');
      }, 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(body).then(confirm).catch(() => fallbackCopy(body, confirm));
    } else {
      fallbackCopy(body, confirm);
    }
  });

  // Keyboard: Escape closes
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeEmailModal();
    }
  });
}

function openEmailModal(rep) {
  const { subject, body, to } = buildEmailTemplate(rep);

  document.getElementById('modal-to').textContent     = to;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-body').textContent    = body;

  const openBtn = document.getElementById('modal-open-btn');
  openBtn.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Re-translate labels and reset copy button
  document.querySelectorAll('#email-modal [data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  document.getElementById('modal-copy-btn').classList.remove('copied');

  const overlay = document.getElementById('email-modal');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('email-modal-close').focus();
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ================================================================
   UI HELPERS
   ================================================================ */

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls.trim();
  return e;
}

function showLoading(source) {
  const loadingId = source === 'main' ? 'loading' : 'triage-loading';
  const resultsId = source === 'main' ? 'results' : 'triage-results';
  document.getElementById(resultsId).classList.add('hidden');
  document.getElementById(resultsId).innerHTML = '';
  document.getElementById(loadingId).classList.remove('hidden');
  document.querySelectorAll('.search-btn').forEach(b => { b.disabled = true; });
}

function hideLoading(source) {
  const loadingId = source === 'main' ? 'loading' : 'triage-loading';
  document.getElementById(loadingId).classList.add('hidden');
  document.querySelectorAll('.search-btn').forEach(b => { b.disabled = false; });
}

function showError(source, msg) {
  hideLoading(source);
  const errId = source === 'main' ? 'error-msg' : 'triage-error-msg';
  const errEl = document.getElementById(errId);
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

function clearError(source) {
  const errId = source === 'main' ? 'error-msg' : 'triage-error-msg';
  document.getElementById(errId).classList.add('hidden');
}

/* ================================================================
   BOOT
   ================================================================ */

document.addEventListener('DOMContentLoaded', init);
