import express from 'express';
import fs from 'fs';
import { v5 as uuidv5 } from 'uuid';
import * as vinted from './websites/vinted.js';

const app = express();
const PORT = 8092;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Extract a LEGO set ID from a deal title (4–6 digit number)
const extractLegoId = title => {
  const match = (title || '').match(/\b(\d{4,6})\b/);
  return match ? match[1] : '';
};

// Load deals from JSON, enrich each with uuid and id if missing
const loadDeals = () => {
  try {
    const data = fs.readFileSync('./deals.json', 'utf-8');
    const deals = JSON.parse(data);
    return deals.map(deal => ({
      ...deal,
      uuid: deal.uuid || uuidv5(deal.link || deal.title || String(Math.random()), uuidv5.URL),
      id: deal.id || extractLegoId(deal.title)
    }));
  } catch {
    return [];
  }
};

// GET /
app.get('/', (req, res) => {
  res.json({ message: 'API Lego deals 🧱' });
});

// GET /deals/search
app.get('/deals/search', (req, res) => {
  const deals = loadDeals();
  const { limit = 12, price, filterBy } = req.query;

  let results = [...deals];

  // Filter by max price
  if (price) {
    results = results.filter(d => d.price != null && d.price <= parseFloat(price));
  }

  // Filter / sort
  if (filterBy === 'best-discount') {
    results = results.filter(d => d.discount != null).sort((a, b) => b.discount - a.discount);
  } else if (filterBy === 'most-commented') {
    results = results.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else if (filterBy === 'hot-deals') {
    results = results.sort((a, b) => (b.temperature || 0) - (a.temperature || 0));
  } else {
    // Default: hottest deals first (highest temperature), price-0 deals last
    results = results.sort((a, b) => {
      if ((a.price == null || a.price === 0) && (b.price == null || b.price === 0)) return 0;
      if (a.price == null || a.price === 0) return 1;
      if (b.price == null || b.price === 0) return -1;
      return (b.temperature || 0) - (a.temperature || 0);
    });
  }

  const total = results.length;
  results = results.slice(0, parseInt(limit));

  res.json({ limit: parseInt(limit), total, results });
});

// GET /deals/:id  (lookup by uuid)
app.get('/deals/:id', (req, res) => {
  const deals = loadDeals();
  const deal = deals.find(d => d.uuid === req.params.id);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json(deal);
});

// GET /sales/search
app.get('/sales/search', async (req, res) => {
  const { limit = 12, legoSetId } = req.query;

  if (!legoSetId) {
    return res.status(400).json({ error: 'legoSetId is required' });
  }

  try {
    const sales = await vinted.scrape(legoSetId);
    const results = (sales || [])
      .sort((a, b) => (b.published || 0) - (a.published || 0))
      .slice(0, parseInt(limit));

    res.json({ limit: parseInt(limit), total: results.length, results });
  } catch (e) {
    res.status(500).json({ error: 'Erreur scraping vinted' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
