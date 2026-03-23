import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const parse = data => {
  const $ = cheerio.load(data, { xmlMode: false });
  const deals = [];

  $('article.thread').each((i, element) => {
    const el = $(element);

    const title = el.find('.thread-title--list a, a.thread-link').text().trim();
    const priceText = el.find('.thread-price').first().text().trim();
    const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.')) || null;
    const discountText = el.find('.chip--discount').first().text().trim();
    const discount = parseInt(discountText.replace(/[^0-9]/g, '')) || null;
    const temperature = parseInt(el.find('.vote-temp').first().text().trim()) || 0;
    const link = el.find('.thread-title--list a, a.thread-link').attr('href') || '';

    if (title) {
      deals.push({ title, price, discount, temperature, link });
    }
  });

  return deals;
};

export const scrape = async (url = 'https://www.dealabs.com/groupe/lego') => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });

  if (response.ok) {
    const body = await response.text();
    return parse(body);
  }

  console.error('Erreur:', response.status);
  return null;
};