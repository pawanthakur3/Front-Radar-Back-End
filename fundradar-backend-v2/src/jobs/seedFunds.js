/**
 * Seed job — run once to populate data/funds.json
 * Fixes:
 *  1. Active funds only — filtered by AMFI NAV file presence
 *  2. Real AMC/fund house names from mfapi.in individual endpoint
 *  3. No artificial fund limit
 *
 * Usage: npm run seed
 * Tip:   FETCH_HISTORY=false npm run seed   (faster, simulated returns)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const axios = require('axios');
const { fetchFundList, fetchNavMap, computeReturns, getCategory, getRisk, getStars } = require('../services/amfiService');
const { writeFunds, writeMeta } = require('../utils/store');

const FETCH_HISTORY = process.env.FETCH_HISTORY !== 'false';
const META_BATCH    = 25;
const MFAPI_BASE    = process.env.MFAPI_BASE || 'https://api.mfapi.in/mf';
const delay = ms => new Promise(r => setTimeout(r, ms));

/* Fetch AMC name + history from individual fund endpoint */
async function fetchFundDetail(schemeCode) {
  try {
    const { data } = await axios.get(`${MFAPI_BASE}/${schemeCode}`, { timeout: 12000 });
    return {
      amcName:        data?.meta?.fund_house        || '',
      schemeType:     data?.meta?.scheme_type        || '',
      schemeCategory: data?.meta?.scheme_category    || '',
      history:        data?.data                    || [],
    };
  } catch {
    return { amcName: '', schemeType: '', schemeCategory: '', history: [] };
  }
}

function simReturns(schemeCode) {
  const h = Math.abs(String(schemeCode).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0));
  return {
    ret1m: parseFloat(((h % 60  - 20) / 10).toFixed(2)),
    ret3m: parseFloat(((h % 80  - 20) / 10).toFixed(2)),
    ret6m: parseFloat(((h % 120 - 30) / 10).toFixed(2)),
    ret1y: parseFloat(((h % 280 - 80) / 10).toFixed(2)),
    ret3y: parseFloat(((h % 220 - 50) / 10).toFixed(2)),
    ret5y: parseFloat(((h % 200 - 30) / 10).toFixed(2)),
  };
}

async function seed() {
  console.log('=== FundRadar Seed — Active Funds + Real AMC Names ===');
  const t0 = Date.now();

  try {
    /* Step 1: fetch all fund codes + AMFI NAV map */
    console.log('\n[1/3] Fetching fund list and AMFI NAV map...');
    const [rawFunds, navMap] = await Promise.all([fetchFundList(), fetchNavMap()]);

    /* Step 2: keep only funds present in AMFI file = ACTIVE */
    const active  = rawFunds.filter(f => navMap[f.schemeCode]);
    const removed = rawFunds.length - active.length;
    console.log(`  mfapi total:   ${rawFunds.length}`);
    console.log(`  Active (AMFI): ${active.length}  |  Removed inactive: ${removed}`);

    /* Step 3: fetch individual meta (AMC name + history) in batches */
    console.log(`\n[2/3] Fetching fund details for ${active.length} active funds...`);
    if (FETCH_HISTORY) console.log('  (FETCH_HISTORY=true — includes NAV history for real returns)');
    else               console.log('  (FETCH_HISTORY=false — using simulated returns, much faster)');
    console.log();

    const funds = [];
    for (let i = 0; i < active.length; i += META_BATCH) {
      const batch = active.slice(i, i + META_BATCH);

      const batchResults = await Promise.all(batch.map(async f => {
        const navEntry = navMap[f.schemeCode];
        const nav      = navEntry?.nav  || 0;
        const navDate  = navEntry?.date || '';
        const name     = f.schemeName  || f.scheme_name || '';

        const detail   = await fetchFundDetail(f.schemeCode);
        const type     = detail.schemeType || f.schemeType || f.scheme_type || '';
        const category = getCategory(name, type);
        const risk     = getRisk(category, name);
        const returns  = (FETCH_HISTORY && detail.history.length)
          ? computeReturns(nav, detail.history)
          : simReturns(f.schemeCode);

        return {
          schemeCode:     f.schemeCode,
          schemeName:     name,
          amcName:        detail.amcName,         // ← real fund house name
          schemeType:     type,
          schemeCategory: detail.schemeCategory,
          category,
          risk,
          navCurrent:     nav,
          navDate,
          navHistory:     FETCH_HISTORY ? detail.history.slice(0, 365) : [],
          returns,
          expenseRatio:   null,
          aum:            null,
          stars:          getStars(f.schemeCode),
          isActive:       true,
          lastSyncedAt:   new Date().toISOString(),
        };
      }));

      funds.push(...batchResults);
      const pct      = Math.round(funds.length / active.length * 100);
      const amcCount = new Set(funds.map(f => f.amcName).filter(Boolean)).size;
      process.stdout.write(`\r  ${funds.length}/${active.length} (${pct}%) | Fund houses found: ${amcCount}`);
      await delay(350);
    }

    /* Step 4: save */
    console.log('\n\n[3/3] Saving to data/funds.json...');
    writeFunds(funds);

    const amcSet = new Set(funds.map(f => f.amcName).filter(Boolean));
    writeMeta({
      totalFunds:     funds.length,
      skippedFunds:   removed,
      fundHouses:     amcSet.size,
      seededAt:       new Date().toISOString(),
      historyFetched: FETCH_HISTORY,
      byCategory: {
        Equity: funds.filter(f => f.category === 'Equity').length,
        Debt:   funds.filter(f => f.category === 'Debt').length,
        Hybrid: funds.filter(f => f.category === 'Hybrid').length,
        Other:  funds.filter(f => f.category === 'Other').length,
      },
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✓ Done in ${elapsed}s`);
    console.log(`  Active funds:  ${funds.length}`);
    console.log(`  Fund houses:   ${amcSet.size}`);
    console.log(`  Equity / Debt / Hybrid: ${funds.filter(f=>f.category==='Equity').length} / ${funds.filter(f=>f.category==='Debt').length} / ${funds.filter(f=>f.category==='Hybrid').length}`);
    console.log('\n  Start the server: npm run dev\n');
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
