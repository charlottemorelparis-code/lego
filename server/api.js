import express from 'express';
import fs from 'fs';
import * as dealabs from './websites/dealabs.js';
import * as vinted from './websites/vinted.js';

const app = express();
const PORT = 8092;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Charge les deals depuis le fichier JSON
const loadDeals = () => {
  try {
    const data = fs.readFileSync('./deals.json', 'utf-8');
    return JSON.parse(data);
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

  // Filtre par prix max
  if (price) {
    results = results.filter(d => d.price && d.price <= parseFloat(price));
  }

  // Filtre spécial
  if (filterBy === 'best-discount') {
    results = results.filter(d => d.discount).sort((a, b) => b.discount - a.discount);
  } else if (filterBy === 'most-commented') {
    results = results.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else {
    // Par défaut : tri par prix croissant
    results = results.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  results = results.slice(0, parseInt(limit));

  res.json({ limit: parseInt(limit), total: results.length, results });
});

// GET /deals/:id
app.get('/deals/:id', (req, res) => {
  const deals = loadDeals();
  const deal = deals.find(d => d._id === req.params.id);

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
      .sort((a, b) => b.published - a.published)
      .slice(0, parseInt(limit));

    res.json({ limit: parseInt(limit), total: results.length, results });
  } catch (e) {
    res.status(500).json({ error: 'Erreur scraping vinted' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});