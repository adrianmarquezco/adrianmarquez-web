let allArticles = [];
let currentFilter = 'all';
let currentSearch = '';
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;

const searchForm = document.getElementById('blog-search-form');
const searchInput = document.getElementById('blog-search-input');
const searchClear = document.getElementById('blog-search-clear');
const searchStatus = document.getElementById('blog-search-status');

function getSearchFromUrl() {
  return new URLSearchParams(window.location.search).get('s')?.trim() || '';
}

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function articleMatchesSearch(article, query) {
  if (!query) return true;
  const haystack = normalizeText([
    article.title,
    article.excerpt,
    article.category,
    article.clusterCategoria,
    article.tipoArticulo,
    article.slug,
    ...(article.keywords || [])
  ].join(' '));
  const terms = normalizeText(query).split(/\s+/).filter(t => t.length >= 2);
  if (terms.length === 0) return haystack.includes(normalizeText(query));
  return terms.every(term => haystack.includes(term));
}

function getFilteredArticles() {
  let list = allArticles.filter(a => articleMatchesSearch(a, currentSearch));
  if (currentFilter !== 'all') {
    list = list.filter(a => a.category && a.category.includes(currentFilter));
  }
  return list;
}

function updateSearchUI(total) {
  if (searchInput) searchInput.value = currentSearch;
  if (searchClear) searchClear.hidden = !currentSearch;
  if (!searchStatus) return;
  if (!currentSearch) {
    searchStatus.hidden = true;
    searchStatus.textContent = '';
    return;
  }
  const countLabel = total === 1 ? '1 artículo' : `${total} artículos`;
  searchStatus.hidden = false;
  searchStatus.innerHTML = `Resultados para <strong>${escapeHtml(currentSearch)}</strong> <span class="blog-search-count">(${countLabel})</span>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function syncSearchUrl() {
  const url = new URL(window.location.href);
  if (currentSearch) url.searchParams.set('s', currentSearch);
  else url.searchParams.delete('s');
  const qs = url.searchParams.toString();
  history.replaceState(null, '', url.pathname + (qs ? `?${qs}` : ''));
}

function applySearch(query) {
  currentSearch = query.trim();
  currentPage = 1;
  syncSearchUrl();
  renderArticles();
}

if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applySearch(searchInput?.value || '');
  });
}
if (searchClear) {
  searchClear.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    applySearch('');
    searchInput?.focus();
  });
}

window.addEventListener('popstate', () => {
  if (!allArticles.length) return;
  const next = getSearchFromUrl();
  if (next === currentSearch) return;
  currentSearch = next;
  currentPage = 1;
  if (searchInput) searchInput.value = currentSearch;
  renderArticles();
});

// Wire up filter buttons via data-filter attribute
document.querySelectorAll('#blog-filters .filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    currentPage = 1;
    document.querySelectorAll('#blog-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderArticles();
  });
});

// Pagination via event delegation
document.getElementById('blog-pagination')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-page]');
  if (btn) goToPage(parseInt(btn.dataset.page, 10));
});

// Grid: handle inline clear-search button via delegation
document.getElementById('blog-grid')?.addEventListener('click', e => {
  if (e.target.closest('[data-action="clear-search"]')) searchClear?.click();
});

fetch('/blog/index.json')
  .then(r => r.json())
  .then(data => {
    allArticles = data;
    currentSearch = getSearchFromUrl();
    if (searchInput && currentSearch) searchInput.value = currentSearch;
    renderArticles();
  })
  .catch(() => {
    document.getElementById('blog-grid').innerHTML = `
      <div class="blog-empty">
        <p>Próximamente — los primeros artículos se publicarán en breve.</p>
      </div>`;
  });

function renderArticles() {
  const filtered = getFilteredArticles();
  updateSearchUI(filtered.length);

  const start = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginated = filtered.slice(start, start + ARTICLES_PER_PAGE);

  const grid = document.getElementById('blog-grid');

  if (paginated.length === 0) {
    const emptyMsg = currentSearch
      ? `No hay artículos que coincidan con «${escapeHtml(currentSearch)}». Prueba con otras palabras o <button type="button" class="blog-search-inline-clear" data-action="clear-search">ver todos</button>.`
      : 'No hay artículos en esta categoría todavía.';
    grid.innerHTML = `<div class="blog-empty"><p>${emptyMsg}</p></div>`;
    document.getElementById('blog-pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = paginated.map(article => `
    <a href="/blog/${article.slug}.html" class="blog-card fade-up">
      ${article.imageUrl ? `<div style="height:180px;overflow:hidden;margin:-2rem -2rem 1.5rem;"><img src="${article.imageUrl}" alt="${article.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>` : ''}
      <div class="blog-card-cat">${article.category || 'Marketing Digital'}</div>
      <h2 class="blog-card-title">${article.title}</h2>
      <p class="blog-card-excerpt">${article.excerpt || ''}</p>
      <div class="blog-card-meta">
        <span>${article.dateStr || article.date}</span>
        <span class="blog-card-link">${article.readingTime || '8 min'} →</span>
      </div>
    </a>
  `).join('');

  document.querySelectorAll('.fade-up').forEach(el => {
    if (typeof observer !== 'undefined') observer.observe(el);
  });

  const totalPages = Math.ceil(filtered.length / ARTICLES_PER_PAGE);
  const pagination = document.getElementById('blog-pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  pagination.innerHTML = Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
    <button data-page="${p}" class="filter-btn ${p === currentPage ? 'active' : ''}">${p}</button>
  `).join('');
}

function goToPage(page) {
  currentPage = page;
  renderArticles();
  window.scrollTo({top: 0, behavior: 'smooth'});
}
