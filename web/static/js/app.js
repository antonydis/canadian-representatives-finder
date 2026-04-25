/* ================================================================
   Canadian Representatives Finder — Frontend Logic
   ================================================================ */

const LANGS = ['en', 'fr', 'es', 'zh', 'tl'];
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

  document.getElementById('search-form').addEventListener('submit', e => handleSearch(e, 'main'));
  document.getElementById('triage-search-form').addEventListener('submit', e => handleSearch(e, 'triage'));
  document.getElementById('triage-open-form').addEventListener('submit', handleOpenFormSubmit);
  document.getElementById('triage-back-btn').addEventListener('click', resetTriageToPhase1);

  document.getElementById('postal-input').addEventListener('input', () => clearError('main'));
  document.getElementById('triage-postal-input').addEventListener('input', () => clearError('triage'));

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
  currentLang = lang;
  localStorage.setItem('canrep-lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });

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
  LANGS.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'lang-btn';
    btn.dataset.lang = lang;
    btn.textContent = translations[lang]?.lang_name || lang.toUpperCase();
    btn.setAttribute('aria-label', `Switch language to ${translations[lang]?.lang_name || lang}`);
    btn.setAttribute('aria-pressed', String(lang === currentLang));
    btn.addEventListener('click', () => applyLang(lang));
    container.appendChild(btn);
  });
}

/* ================================================================
   TABS
   ================================================================ */

function initTabs() {
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const panels   = { find: document.getElementById('panel-find'), triage: document.getElementById('panel-triage') };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.id === 'tab-find' ? 'find' : 'triage'));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        switchTab(btn.id === 'tab-find' ? 'triage' : 'find');
        document.querySelector(`.tab-btn[aria-controls="panel-${btn.id === 'tab-find' ? 'triage' : 'find'}"]`)?.focus();
      }
    });
  });

  function switchTab(which) {
    const active   = which === 'find' ? 'tab-find'   : 'tab-triage';
    const inactive = which === 'find' ? 'tab-triage' : 'tab-find';
    document.getElementById(active).classList.add('active');
    document.getElementById(active).setAttribute('aria-selected', 'true');
    document.getElementById(inactive).classList.remove('active');
    document.getElementById(inactive).setAttribute('aria-selected', 'false');
    panels.find.hidden   = which !== 'find';
    panels.triage.hidden = which !== 'triage';
  }
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
      body:    JSON.stringify({ text }),
    });
    const data = await resp.json();

    const validLevels = ['federal', 'provincial', 'municipal'];
    if (resp.ok && data.success && validLevels.includes(data.jurisdiction)) {
      activateTriage(null, text, {
        level:       data.jurisdiction,
        explanation: data.explanation,
        service:     data.service,
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
  header.innerHTML = `${t('results_title')} <strong>${postalCode}</strong>`;
  section.appendChild(header);

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

function buildEmailTemplate(rep) {
  const useFr    = isQuebecRep(rep);
  const emailLang = useFr ? 'fr' : 'en';

  // Resolve situation text in the EMAIL's language (not the UI language)
  // If it was a predefined chip, look up the title in the email language.
  // If it was free text typed by the user, use it as-is.
  const rawSituation = activeTriageSituation || '';
  const situation = activeCaseId
    ? (translations[emailLang]?.[`case_${activeCaseId}_title`] || rawSituation)
    : rawSituation;

  const snippet = situation.length > 60 ? situation.substring(0, 60) + '…' : situation;

  let subject, body;
  if (useFr) {
    subject = `Demande citoyenne${snippet ? ' — ' + snippet : ''}`;
    body    = `Bonjour ${rep.name},\n\n` +
              (situation
                ? `Je vous écris concernant la situation suivante :\n\n${situation}\n\n`
                : `Je vous écris en tant que citoyen(ne) de votre circonscription.\n\n`) +
              `Je vous serais reconnaissant(e) de bien vouloir m'informer des démarches possibles.\n\n` +
              `Cordialement,\n[Votre nom]\n[Votre adresse]`;
  } else {
    subject = `Constituent Inquiry${snippet ? ' — ' + snippet : ''}`;
    body    = `Dear ${rep.elected_office} ${rep.name},\n\n` +
              (situation
                ? `I am writing regarding the following situation:\n\n${situation}\n\n`
                : `I am writing as a constituent in your riding.\n\n`) +
              `I would appreciate any information or assistance you can provide.\n\n` +
              `Sincerely,\n[Your Name]\n[Your Address]`;
  }

  return { subject, body };
}

function copyEmailTemplate(btn, rep) {
  const { subject, body } = buildEmailTemplate(rep);
  const fullText = `Subject: ${subject}\n\n${body}`;
  const span = btn.querySelector('span');

  const confirm = () => {
    span.textContent = t('copied');
    btn.classList.add('copied');
    setTimeout(() => {
      span.textContent = t('copy_template');
      btn.classList.remove('copied');
    }, 2200);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(fullText).then(confirm).catch(() => fallbackCopy(fullText, confirm));
  } else {
    fallbackCopy(fullText, confirm);
  }
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

    if (showEmailTemplate) {
      const copyRow = el('div', 'draft-email-row');
      const copyBtn = el('button', 'draft-email-btn');
      copyBtn.type = 'button';
      copyBtn.innerHTML = `${ICONS.compose}<span data-i18n="copy_template">${t('copy_template')}</span>`;
      copyBtn.addEventListener('click', () => copyEmailTemplate(copyBtn, rep));
      copyRow.appendChild(copyBtn);
      contact.appendChild(copyRow);
    }
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
    const subject = document.getElementById('modal-subject').textContent;
    const body    = document.getElementById('modal-body').textContent;
    const full    = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(full).then(() => {
      copyBtn.textContent = t('copied');
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = t('copy_template');
        copyBtn.classList.remove('copied');
      }, 2200);
    }).catch(() => {
      // Fallback: select the body text
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('modal-body'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    });
  });

  // Keyboard: Escape closes
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeEmailModal();
    }
  });
}

function openEmailModal(rep) {
  const { subject, body } = buildEmailTemplate(rep);

  document.getElementById('modal-to').textContent      = rep.email;
  document.getElementById('modal-subject').textContent  = subject;
  document.getElementById('modal-body').textContent     = body;

  // Wire "Open Mail App" button
  const openBtn = document.getElementById('modal-open-btn');
  openBtn.href = `mailto:${rep.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Reset copy button state + re-translate all modal labels
  document.querySelectorAll('#email-modal [data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  const copyBtnEl = document.getElementById('modal-copy-btn');
  copyBtnEl.classList.remove('copied');

  const overlay = document.getElementById('email-modal');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Focus trap: focus the close button
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
