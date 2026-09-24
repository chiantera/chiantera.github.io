const USER = 'chiantera';
const STATS_URL = `https://api.github.com/users/${USER}/repos?per_page=100`;
const STATS_KEY = 'gh-stats-v1';
const STATS_TTL = 60 * 60 * 1000;
const LANG_KEY = 'lang';

const STRINGS = {
  en: {
    bio: 'Science visualizations, AI-assisted tools and stories made with code.',
    featured: 'Featured',
    more: 'More projects',
    footer: 'Hosted on GitHub Pages. Stats from the GitHub API.',
    all: 'All',
    demo: 'Live demo',
    code: 'Code',
    updated: 'updated',
    stars: (n) => `${n} star${n === 1 ? '' : 's'}`,
    loading: 'Loading projects…',
    error: 'Could not load the project list.',
    empty: 'No projects with this tag.',
    tags: { science: 'Science', apps: 'Apps', ai: 'AI', creative: 'Creative' },
  },
  it: {
    bio: 'Visualizzazioni scientifiche, strumenti con l’AI e storie fatte di codice.',
    featured: 'In evidenza',
    more: 'Altri progetti',
    footer: 'Pubblicato su GitHub Pages. Statistiche dall’API di GitHub.',
    all: 'Tutti',
    demo: 'Demo',
    code: 'Codice',
    updated: 'aggiornato',
    stars: (n) => `${n} stell${n === 1 ? 'a' : 'e'}`,
    loading: 'Caricamento progetti…',
    error: 'Impossibile caricare l’elenco dei progetti.',
    empty: 'Nessun progetto con questo tag.',
    tags: { science: 'Scienza', apps: 'App', ai: 'AI', creative: 'Creativi' },
  },
};

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
  Python: '#3572A5', Rust: '#dea584', Go: '#00ADD8', 'C++': '#f34b7d',
};

const $ = (sel) => document.querySelector(sel);

let projects = [];
let stats = {};
let lang = initialLang();

function storageGet(store, key) {
  try { return window[store].getItem(key); } catch { return null; }
}

function storageSet(store, key, value) {
  try { window[store].setItem(key, value); } catch { /* storage unavailable */ }
}

function initialLang() {
  const saved = storageGet('localStorage', LANG_KEY);
  if (saved === 'en' || saved === 'it') return saved;
  return (navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en';
}

function currentTag() {
  const tag = decodeURIComponent(location.hash.slice(1));
  return STRINGS.en.tags[tag] ? tag : '';
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child != null && child !== false) node.append(child);
  }
  return node;
}

function relativeTime(iso) {
  const seconds = (new Date(iso) - Date.now()) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'hour');
}

function card(p) {
  const t = STRINGS[lang];
  const repoUrl = `https://github.com/${USER}/${p.repo}`;
  const s = stats[p.repo];

  const meta = s && el('div', { class: 'meta' },
    s.language && el('span', { class: 'lang-dot', style: `--dot:${LANG_COLORS[s.language] || 'var(--muted)'}` }, s.language),
    s.stars > 0 && el('span', { title: t.stars(s.stars) }, `★ ${s.stars}`),
    s.pushed && el('span', {}, `${t.updated} ${relativeTime(s.pushed)}`),
  );

  return el('article', { class: 'card', 'data-tags': p.tags.join(' ') },
    el('h3', {}, el('a', { href: p.demo || repoUrl }, p.title[lang])),
    el('p', { class: 'desc' }, p.description[lang]),
    el('ul', { class: 'tags' }, ...p.tags.map((tag) => el('li', {}, t.tags[tag] || tag))),
    meta,
    el('div', { class: 'actions' },
      p.demo && el('a', { class: 'btn primary', href: p.demo }, `${t.demo} ↗`),
      el('a', { class: 'btn', href: repoUrl }, t.code),
    ),
  );
}

function renderFilters() {
  const t = STRINGS[lang];
  const active = currentTag();
  const used = [...new Set(projects.flatMap((p) => p.tags))].filter((tag) => t.tags[tag]);
  const chip = (tag, label) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(tag === active) }, label);
    b.addEventListener('click', () => {
      history.replaceState(null, '', tag ? `#${tag}` : location.pathname + location.search);
      render();
    });
    return b;
  };
  $('#filters').replaceChildren(chip('', t.all), ...used.map((tag) => chip(tag, t.tags[tag])));
  $('#filters').hidden = false;
}

function render() {
  const t = STRINGS[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t[node.dataset.i18n]; });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));

  if (!projects.length) return;
  renderFilters();

  const tag = currentTag();
  const visible = projects.filter((p) => !tag || p.tags.includes(tag));
  const featured = visible.filter((p) => p.featured);
  const more = visible.filter((p) => !p.featured);

  $('#featured').replaceChildren(...featured.map(card));
  $('#more').replaceChildren(...more.map(card));
  $('#featured-section').hidden = !featured.length;
  $('#more-section').hidden = !more.length;
  $('#status').textContent = visible.length ? '' : t.empty;
}

async function loadStats() {
  const cached = storageGet('sessionStorage', STATS_KEY);
  if (cached) {
    try {
      const { time, data } = JSON.parse(cached);
      if (Date.now() - time < STATS_TTL) return data;
    } catch { /* ignore a corrupt cache */ }
  }
  const res = await fetch(STATS_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = {};
  for (const r of await res.json()) {
    if (!r.private) data[r.name] = { stars: r.stargazers_count, language: r.language, pushed: r.pushed_at };
  }
  storageSet('sessionStorage', STATS_KEY, JSON.stringify({ time: Date.now(), data }));
  return data;
}

async function init() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    storageSet('localStorage', LANG_KEY, lang);
    render();
  }));
  window.addEventListener('hashchange', render);

  $('#status').textContent = STRINGS[lang].loading;
  render();

  try {
    const res = await fetch('projects.json');
    if (!res.ok) throw new Error(`projects.json ${res.status}`);
    projects = await res.json();
  } catch {
    $('#status').textContent = STRINGS[lang].error;
    return;
  }
  render();

  // Stats are optional: the page stays complete without them, e.g. when rate-limited.
  loadStats().then((data) => { stats = data; render(); }).catch(() => {});
}

init();
