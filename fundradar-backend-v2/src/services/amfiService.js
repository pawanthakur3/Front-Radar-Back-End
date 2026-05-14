const axios = require('axios');

const MFAPI_BASE  = process.env.MFAPI_BASE  || 'https://api.mfapi.in/mf';
const AMFI_NAV_URL = process.env.AMFI_NAV_URL || 'https://www.amfiindia.com/spages/NAVAll.txt';

/* ── Category classifier ── */
function getCategory(name = '', type = '') {
  const n = name.toLowerCase(), t = type.toLowerCase();
  if (t.includes('equity') || n.includes('equity') || n.includes('elss') ||
      n.includes('large cap') || n.includes('mid cap') || n.includes('small cap') ||
      n.includes('flexi') || n.includes('multi cap') || n.includes('bluechip') ||
      n.includes('nifty') || n.includes('sensex') || n.includes('index') ||
      n.includes('momentum') || n.includes('growth')) return 'Equity';

  if (t.includes('debt') || n.includes('debt') || n.includes('bond') ||
      n.includes('gilt') || n.includes('liquid') || n.includes('overnight') ||
      n.includes('money market') || n.includes('duration') ||
      n.includes('credit risk') || n.includes('corporate bond') ||
      n.includes('banking and psu') || n.includes('treasury')) return 'Debt';

  if (t.includes('hybrid') || n.includes('hybrid') || n.includes('balanced') ||
      n.includes('arbitrage') || n.includes('multi asset') ||
      n.includes('conservative') || n.includes('aggressive')) return 'Hybrid';

  return 'Other';
}

/* ── Risk classifier ── */
function getRisk(category, name = '') {
  const n = name.toLowerCase();
  if (category === 'Debt')
    return n.includes('overnight') || n.includes('liquid') ? 'Low' : 'Moderate';
  if (category === 'Hybrid') return 'Moderate';
  if (category === 'Equity')
    return n.includes('small cap') || n.includes('micro') ||
           n.includes('sector') || n.includes('thematic') ? 'High' : 'Moderate';
  return 'Moderate';
}

/* ── Deterministic star rating from scheme code ── */
function getStars(schemeCode) {
  const h = Math.abs(String(schemeCode).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0));
  return Math.max(1, Math.min(5, 1 + (h % 5)));
}

/* ── Fetch all fund metadata from mfapi.in ── */
async function fetchFundList() {
  console.log('Fetching fund list from mfapi.in...');
  const { data } = await axios.get(MFAPI_BASE, { timeout: 30000 });
  console.log(`Fetched ${data.length} funds`);
  return data;
}

/* ── Fetch latest NAV map from AMFI (scheme code → { nav, date }) ── */
async function fetchNavMap() {
  console.log('Fetching NAV data from AMFI...');
  const { data } = await axios.get(AMFI_NAV_URL, { timeout: 30000, responseType: 'text' });

  const navMap = {};
  for (const line of data.split('\n')) {
    const parts = line.trim().split(';');
    if (parts.length >= 6 && !isNaN(parts[0])) {
      const code = parseInt(parts[0].trim());
      const nav  = parseFloat(parts[4].trim());
      const date = parts[5]?.trim() || '';
      if (!isNaN(nav) && nav > 0) navMap[code] = { nav, date };
    }
  }

  console.log(`Parsed ${Object.keys(navMap).length} NAV entries from AMFI`);
  return navMap;
}

/* ── Fetch NAV history for a single fund ── */
async function fetchFundHistory(schemeCode) {
  try {
    const { data } = await axios.get(`${MFAPI_BASE}/${schemeCode}`, { timeout: 15000 });
    return data?.data || [];
  } catch {
    return [];
  }
}

/* ── Compute return % between two NAV values ── */
function calcReturn(currentNav, oldNav) {
  if (!oldNav || oldNav <= 0 || !currentNav) return null;
  return parseFloat(((currentNav - oldNav) / oldNav * 100).toFixed(2));
}

/* ── Get NAV from N days ago from history array ── */
function getNavDaysAgo(history = [], days) {
  const target = Date.now() - days * 86400000;
  let closest = null, minDiff = Infinity;
  for (const entry of history) {
    const [dd, mmm, yyyy] = (entry.date || '').split('-');
    if (!yyyy) continue;
    const d    = new Date(`${mmm} ${dd} ${yyyy}`).getTime();
    const diff = Math.abs(d - target);
    if (diff < minDiff) { minDiff = diff; closest = parseFloat(entry.nav); }
  }
  return closest;
}

/* ── Compute all return periods from history ── */
function computeReturns(currentNav, history) {
  return {
    ret1m:  calcReturn(currentNav, getNavDaysAgo(history, 30)),
    ret3m:  calcReturn(currentNav, getNavDaysAgo(history, 90)),
    ret6m:  calcReturn(currentNav, getNavDaysAgo(history, 180)),
    ret1y:  calcReturn(currentNav, getNavDaysAgo(history, 365)),
    ret3y:  calcReturn(currentNav, getNavDaysAgo(history, 1095)),
    ret5y:  calcReturn(currentNav, getNavDaysAgo(history, 1825)),
  };
}

module.exports = {
  fetchFundList, fetchNavMap, fetchFundHistory,
  getCategory, getRisk, getStars, computeReturns, computeSharpe,
};
