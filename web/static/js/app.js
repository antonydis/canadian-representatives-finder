/* Canadian Representatives Finder — Frontend Logic */

const LANGS = ['en', 'fr', 'es', 'zh', 'tl'];
let translations = {};
let currentLang = 'en';

// ------------------------------------------------------------------ //
// Initialisation
// ------------------------------------------------------------------ //

async function init() {
  const resp = await fetch('/api/translations');
  translations = await resp.json();

  currentLang = detectLang();
  applyLang(currentLang);
  buildLangButtons();

  document.getElementById('search-form').addEventListener('submit', handleSearch);
  document.getElementById('postal-input').addEventListener('input', clearError);
}

function detectLang() {
  const saved = localStorage.getItem('canrep-lang');
  if (saved && LANGS.includes(saved)) return saved;

  const browser = (navigator.language || 'en').split('-')[0].toLowerCase();
  if (LANGS.includes(browser)) return browser;

  // Canada-specific: map traditional Chinese variants to zh
  if (browser === 'zh') return 'zh';

  return 'en';
}

// ------------------------------------------------------------------ //
// Internationalisation
// ------------------------------------------------------------------ //

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) ||
         (translations['en'] && translations['en'][key]) ||
         key;
}

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('canrep-lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang);
  });
}

function buildLangButtons() {
  const container = document.getElementById('lang-switcher');
  container.innerHTML = '';
  LANGS.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'lang-btn';
    btn.dataset.lang = lang;
    btn.textContent = translations[lang]?.lang_name || lang.toUpperCase();
    btn.setAttribute('aria-label', `Switch to ${translations[lang]?.lang_name || lang}`);
    btn.setAttribute('aria-pressed', lang === currentLang);
    btn.addEventListener('click', () => applyLang(lang));
    container.appendChild(btn);
  });
}

// ------------------------------------------------------------------ //
// Search
// ------------------------------------------------------------------ //

async function handleSearch(e) {
  e.preventDefault();

  const input = document.getElementById('postal-input');
  const rawCode = input.value.trim().toUpperCase().replace(/\s/g, '');

  if (!isValidPostalCode(rawCode)) {
    showError(t('error_invalid'));
    input.focus();
    return;
  }

  const displayCode = rawCode.length === 6
    ? `${rawCode.slice(0, 3)} ${rawCode.slice(3)}`
    : rawCode;

  showLoading();

  try {
    const resp = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postal_code: displayCode }),
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      const msg = data.error === 'rate_limit'
        ? t('error_rate_limit')
        : t('error_api');
      showError(msg);
      hideLoading();
      return;
    }

    renderResults(data.representatives, displayCode);

  } catch (err) {
    showError(t('error_api'));
    hideLoading();
  }
}

function isValidPostalCode(code) {
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code);
}

// ------------------------------------------------------------------ //
// Rendering
// ------------------------------------------------------------------ //

function renderResults(reps, postalCode) {
  hideLoading();
  clearError();

  const section = document.getElementById('results');
  section.innerHTML = '';
  section.classList.remove('hidden');

  if (reps.length === 0) {
    section.innerHTML = `<p class="text-muted">${t('no_results')}</p>`;
    return;
  }

  // Header
  const header = document.createElement('div');
  header.className = 'results-header';
  header.innerHTML = `${t('results_title')} <strong>${postalCode}</strong>`;
  section.appendChild(header);

  // Group by level
  const levels = ['federal', 'provincial', 'municipal'];
  const grouped = { federal: [], provincial: [], municipal: [] };
  reps.forEach(r => {
    const lvl = grouped[r.level] ? r.level : 'municipal';
    grouped[lvl].push(r);
  });

  levels.forEach(level => {
    if (grouped[level].length === 0) return;

    const levelSection = document.createElement('div');
    levelSection.className = 'level-section';

    const heading = document.createElement('div');
    heading.className = `level-heading ${level}`;
    heading.innerHTML = `<span>${levelIcon(level)}</span> <span>${t(level)}</span>`;
    levelSection.appendChild(heading);

    grouped[level].forEach(rep => {
      levelSection.appendChild(buildRepCard(rep, level));
    });

    section.appendChild(levelSection);
  });

  // Scroll to results
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function levelIcon(level) {
  const icons = { federal: '🏛️', provincial: '🏫', municipal: '🏙️' };
  return icons[level] || '📍';
}

function buildRepCard(rep, level) {
  const card = document.createElement('div');
  card.className = `rep-card ${level}`;

  // Left: main info
  const main = document.createElement('div');
  main.className = 'rep-main';

  const office = document.createElement('div');
  office.className = 'rep-office';
  office.textContent = rep.elected_office;
  main.appendChild(office);

  const name = document.createElement('div');
  name.className = 'rep-name';
  name.textContent = rep.name;
  main.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'rep-meta';
  if (rep.party) {
    const partyBadge = document.createElement('span');
    partyBadge.className = 'badge badge-party';
    partyBadge.textContent = rep.party;
    meta.appendChild(partyBadge);
  }
  if (rep.district) {
    const distBadge = document.createElement('span');
    distBadge.className = 'badge badge-district';
    distBadge.textContent = rep.district;
    meta.appendChild(distBadge);
  }
  main.appendChild(meta);

  // Right: contact info
  const contact = document.createElement('div');
  contact.className = 'rep-contact';

  if (rep.phone) {
    contact.appendChild(contactItem('📞', rep.phone, `tel:${rep.phone.replace(/\s/g, '')}`));
  }
  if (rep.email) {
    contact.appendChild(contactItem('✉️', rep.email, `mailto:${rep.email}`));
  }
  if (rep.url) {
    const label = t('website');
    contact.appendChild(contactItem('🔗', label, rep.url, true));
  }

  card.appendChild(main);
  card.appendChild(contact);
  return card;
}

function contactItem(icon, text, href, isExternal = false) {
  const div = document.createElement('div');
  div.className = 'contact-item';
  const ico = document.createElement('span');
  ico.className = 'contact-icon';
  ico.setAttribute('aria-hidden', 'true');
  ico.textContent = icon;
  div.appendChild(ico);

  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (isExternal) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    div.appendChild(a);
  } else {
    div.appendChild(document.createTextNode(text));
  }

  return div;
}

// ------------------------------------------------------------------ //
// UI helpers
// ------------------------------------------------------------------ //

function showLoading() {
  document.getElementById('results').classList.add('hidden');
  document.getElementById('results').innerHTML = '';
  document.getElementById('loading').classList.remove('hidden');
  document.querySelector('.search-btn').disabled = true;
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
  document.querySelector('.search-btn').disabled = false;
}

function showError(msg) {
  hideLoading();
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() {
  document.getElementById('error-msg').classList.add('hidden');
}

// ------------------------------------------------------------------ //
// Boot
// ------------------------------------------------------------------ //

document.addEventListener('DOMContentLoaded', init);
