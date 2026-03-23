import express from 'express';
import * as dealabs from './websites/dealabs.js';
import * as vinted from './websites/vinted.js';

const app = express();
const PORT = 8092;

// Permet au client d'accéder à l'API (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Route principale
app.get('/', (req, res) => {
  res.json({ message: 'API Lego deals 🧱' });
});

// Route deals dealabs
app.get('/api/deals', async (req, res) => {
  try {
    const deals = await dealabs.scrape('https://www.dealabs.com/groupe/lego');
    res.json(deals);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur scraping dealabs' });
  }
});

// Route sales vinted
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await vinted.scrape('lego');
    res.json(sales);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur scraping vinted' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});