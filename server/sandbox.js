/* eslint-disable no-console, no-process-exit */
import * as avenuedelabrique from './websites/avenuedelabrique.js';
import * as vinted from './websites/vinted.js';
import * as dealabs from './websites/dealabs.js';
import fs from 'fs';

async function scrapeADLB (website = 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
    const deals = await avenuedelabrique.scrape(website);
    console.log(deals);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function scrapeVinted (lego) {
  try {
    console.log(`🕵️‍♀️  scraping lego ${lego} from vinted.fr`);
    const sales = await vinted.scrape(lego);
    console.log(sales);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function scrapeDealabs (website = 'https://www.dealabs.com/groupe/lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
    const deals = await dealabs.scrape(website);
    console.log(deals);
    fs.writeFileSync('./deals.json', JSON.stringify(deals, null, 2));
    console.log('💾 Saved to deals.json');
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const [,, param] = process.argv;

// Supprime cette ligne :
// scrapeDealabs(param);  ← ENLEVE CETTE LIGNE

// Garde seulement ça :
if (param && !param.startsWith('http')) {
  scrapeVinted(param);
} else {
  scrapeDealabs(param);
}