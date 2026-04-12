// Invoking strict mode
'use strict';

const API_BASE = 'https://lego-lgki.onrender.com';

// State
let currentDeals = [];
let currentSales = [];
let currentPagination = {};
let currentFilter = null;
let currentSort = 'price-asc';
let currentSize = 6;

// Selectors
const selectShow       = document.querySelector('#show-select');
const selectPage       = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const selectSort       = document.querySelector('#sort-select');
const sectionDeals     = document.querySelector('#deals');
const spanNbDeals      = document.querySelector('#nbDeals');
const spanNbSales      = document.querySelector('#nbSales');
const spanP5           = document.querySelector('#p5');
const spanP25          = document.querySelector('#p25');
const spanP50          = document.querySelector('#p50');
const spanLifetime     = document.querySelector('#lifetime');

/**
 * Set global state
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from the local API
 */
const fetchDeals = async (page = 1, size = 6, filterBy = null, sort = 'price-asc') => {
  try {
    let url = `${API_BASE}/deals/search?limit=${size}`;
    if (filterBy) url += `&filterBy=${filterBy}`;

    const response = await fetch(url);
    const data = await response.json();
    let deals = data.results || [];

    // Client-side sort for options the server does not handle
    if (sort === 'price-asc') {
      deals = deals.slice().sort((a, b) => {
        const ap = a.price || 0, bp = b.price || 0;
        if (ap === 0 && bp === 0) return 0;
        if (ap === 0) return 1;
        if (bp === 0) return -1;
        return ap - bp;
      });
    } else if (sort === 'price-desc') {
      deals = deals.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'date-asc') {
      deals = deals.slice().sort((a, b) => (a.published || 0) - (b.published || 0));
    } else if (sort === 'date-desc') {
      deals = deals.slice().sort((a, b) => (b.published || 0) - (a.published || 0));
    }

    return {
      result: deals,
      meta: {
        count: data.total || deals.length,
        currentPage: page,
        pageCount: Math.max(1, Math.ceil((data.total || deals.length) / size))
      }
    };
  } catch (error) {
    console.error('fetchDeals error:', error);
    return { result: currentDeals, meta: currentPagination };
  }
};

/**
 * Fetch Vinted sales for a given LEGO set ID
 */
const fetchSales = async legoSetId => {
  try {
    const response = await fetch(`${API_BASE}/sales/search?legoSetId=${legoSetId}&limit=24`);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('fetchSales error:', error);
    return [];
  }
};

/**
 * Compute a percentile value from a sorted price array
 */
const computePercentile = (sorted, p) => {
  const index = Math.max(0, Math.floor(sorted.length * p / 100) - 1);
  return sorted[index] ?? 0;
};

/**
 * Normalise a price value that may be a number, string, or {amount} object
 */
const parsePrice = price => {
  if (price == null) return 0;
  if (typeof price === 'object') return parseFloat(price.amount || 0);
  return parseFloat(price) || 0;
};

/**
 * Format a unix timestamp to a readable date
 */
const formatDate = ts => {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  return d.toLocaleDateString('fr-FR');
};

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

const isValidPhotoUrl = url => url && url.startsWith('http');

const renderDeals = deals => {
  if (!deals.length) {
    sectionDeals.innerHTML = `
      <h2>Deals</h2>
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Aucun deal trouvé pour ces critères.</p>
      </div>`;
    return;
  }

  const cards = deals.map(deal => `
    <article class="deal-card ${deal.community ? 'deal-card--' + deal.community : ''}">
      ${deal.discount != null ? `<div class="deal-badge">-${deal.discount}%</div>` : ''}
      <div class="deal-image-wrap">
        ${isValidPhotoUrl(deal.photo)
          ? `<img src="${deal.photo}" alt="${deal.title}" class="deal-photo" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'deal-photo deal-photo--placeholder\\'>🧱</div>'">`
          : `<div class="deal-photo deal-photo--placeholder">🧱</div>`
        }
      </div>
      <div class="deal-body">
        <a href="${deal.link}" target="_blank" rel="noopener" class="deal-title">${deal.title}</a>
        <div class="deal-pricing">
          ${deal.price != null ? `<span class="deal-price">€${deal.price}</span>` : ''}
          ${deal.retail && deal.price && deal.retail > deal.price
            ? `<span class="deal-retail">€${deal.retail}</span>`
            : ''}
        </div>
        <div class="deal-footer">
          ${deal.community ? `<span class="deal-source deal-source--${deal.community}">${deal.community}</span>` : ''}
          ${deal.temperature != null ? `<span class="deal-temp">🔥 ${deal.temperature}</span>` : ''}
          ${deal.published ? `<span class="deal-date">${formatDate(deal.published)}</span>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  sectionDeals.innerHTML = `<h2>Deals <span class="deals-count">${deals.length}</span></h2><div class="deals-grid">${cards}</div>`;
};

const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from(
    { length: pageCount },
    (_, i) => `<option value="${i + 1}">${i + 1}</option>`
  ).join('');
  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  selectLegoSetIds.innerHTML =
    '<option value="">-- Sélectionner --</option>' +
    ids.map(id => `<option value="${id}">${id}</option>`).join('');
};

const renderIndicators = (pagination, sales = []) => {
  spanNbDeals.textContent = pagination.count || 0;
  spanNbSales.textContent = sales.length;

  if (sales.length > 0) {
    const prices = sales.map(s => parsePrice(s.price)).filter(p => p > 0).sort((a, b) => a - b);

    if (prices.length > 0) {
      spanP5.textContent  = `€${computePercentile(prices, 5).toFixed(2)}`;
      spanP25.textContent = `€${computePercentile(prices, 25).toFixed(2)}`;
      spanP50.textContent = `€${computePercentile(prices, 50).toFixed(2)}`;
    }

    // Lifetime: span between oldest and newest published date
    const timestamps = sales.map(s => s.published).filter(Boolean).sort((a, b) => a - b);
    if (timestamps.length >= 2) {
      const diffMs  = (timestamps[timestamps.length - 1] - timestamps[0]) * 1000;
      const days    = Math.round(diffMs / (1000 * 60 * 60 * 24));
      spanLifetime.textContent = `${days} jours`;
    }
  } else {
    spanP5.textContent      = '—';
    spanP25.textContent     = '—';
    spanP50.textContent     = '—';
    spanLifetime.textContent = '—';
  }
};

const render = (deals, pagination, sales = []) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination, sales);
  renderLegoSetIds(deals);
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

// Number of deals to show
selectShow.addEventListener('change', async event => {
  currentSize = parseInt(event.target.value);
  showLoading();
  const deals = await fetchDeals(1, currentSize, currentFilter, currentSort);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination, currentSales);
});

// Pagination
selectPage.addEventListener('change', async event => {
  const deals = await fetchDeals(parseInt(event.target.value), currentSize, currentFilter, currentSort);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination, currentSales);
});

// Sort
selectSort.addEventListener('change', async event => {
  currentSort = event.target.value;
  // Map sort value to server filterBy where applicable
  const filterBy = currentSort === 'discount-desc' ? 'best-discount'
                 : currentSort === 'comments-desc' ? 'most-commented'
                 : currentSort === 'temp-desc'     ? 'hot-deals'
                 : null;
  const deals = await fetchDeals(1, currentSize, currentFilter || filterBy, currentSort);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination, currentSales);
});

// Lego set ID → fetch Vinted sales
selectLegoSetIds.addEventListener('change', async event => {
  const legoSetId = event.target.value;
  if (!legoSetId) {
    currentSales = [];
    renderIndicators(currentPagination, []);
    return;
  }
  spanNbSales.textContent = '…';
  currentSales = await fetchSales(legoSetId);
  renderIndicators(currentPagination, currentSales);
});

// Filter buttons
document.addEventListener('click', async event => {
  const btn = event.target.closest('.filter-btn');
  if (!btn) return;

  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentFilter = btn.dataset.filter || null;
  const deals = await fetchDeals(1, currentSize, currentFilter, currentSort);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination, currentSales);
});

const showLoading = () => {
  sectionDeals.innerHTML = `
    <h2>Deals</h2>
    <div class="skeleton-grid">
      ${Array(6).fill('<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-line--short"></div></div>').join('')}
    </div>`;
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  const deals = await fetchDeals();
  setCurrentDeals(deals);
  render(currentDeals, currentPagination, currentSales);
});
