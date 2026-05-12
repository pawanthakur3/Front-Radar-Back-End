const express = require('express');
const router  = express.Router();
const { readFunds, readMeta } = require('../utils/store');
const { asyncHandler } = require('../middleware/errorHandler');

/* ── In-memory cache so we don't re-read the file on every request ── */
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

function getFunds() {
  if (!cache || Date.now() - cacheTime > CACHE_TTL) {
    cache     = readFunds();
    cacheTime = Date.now();
  }
  return cache;
}

/* Clear cache after a sync */
function clearCache() { cache = null; }

/* ── Filter funds based on query params ── */
function applyFilters(funds, query) {
  let result = [...funds];

  /* Text search */
  if (query.q) {
    const q = query.q.toLowerCase();
    result = result.filter(f =>
      f.schemeName.toLowerCase().includes(q) ||
      f.amcName.toLowerCase().includes(q)
    );
  }

  if (query.category) result = result.filter(f => f.category === query.category);
  if (query.risk)     result = result.filter(f => f.risk === query.risk);
  if (query.amc)      result = result.filter(f => f.amcName.toLowerCase().includes(query.amc.toLowerCase()));
  if (query.stars)    result = result.filter(f => f.stars >= parseInt(query.stars));

  if (query.minRet1y) result = result.filter(f => f.returns?.ret1y !== null && f.returns.ret1y >= parseFloat(query.minRet1y));
  if (query.maxExp)   result = result.filter(f => f.expenseRatio !== null && f.expenseRatio <= parseFloat(query.maxExp));
  if (query.minNav)   result = result.filter(f => f.navCurrent >= parseFloat(query.minNav));
  if (query.maxNav)   result = result.filter(f => f.navCurrent <= parseFloat(query.maxNav));

  return result;
}

/* ── Sort funds ── */
function applySort(funds, sortBy = 'name', order = 'asc') {
  const dir = order === 'desc' ? -1 : 1;
  return [...funds].sort((a, b) => {
    switch (sortBy) {
      case 'name':    return dir * a.schemeName.localeCompare(b.schemeName);
      case 'nav':     return dir * (a.navCurrent - b.navCurrent);
      case 'ret1y':   return dir * ((a.returns?.ret1y ?? -999) - (b.returns?.ret1y ?? -999));
      case 'ret3y':   return dir * ((a.returns?.ret3y ?? -999) - (b.returns?.ret3y ?? -999));
      case 'ret5y':   return dir * ((a.returns?.ret5y ?? -999) - (b.returns?.ret5y ?? -999));
      case 'stars':   return dir * ((a.stars ?? 0) - (b.stars ?? 0));
      case 'aum':     return dir * ((a.aum ?? 0) - (b.aum ?? 0));
      case 'expense': return dir * ((a.expenseRatio ?? 0) - (b.expenseRatio ?? 0));
      default:        return dir * a.schemeName.localeCompare(b.schemeName);
    }
  });
}

/* ── Strip navHistory from list responses (keep responses small) ── */
function stripHistory(fund) {
  const { navHistory, ...rest } = fund;
  return rest;
}

/* ──────────────────────────────────────────
   GET /api/funds
   List all funds with search, filter, sort
────────────────────────────────────────── */
router.get('/', asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));

  let funds = getFunds();
  funds = applyFilters(funds, req.query);
  funds = applySort(funds, req.query.sort, req.query.order);

  const total  = funds.length;
  const start  = (page - 1) * limit;
  const paged  = funds.slice(start, start + limit).map(stripHistory);

  res.json({
    success: true,
    data: paged,
    pagination: {
      total,
      page,
      limit,
      pages:   Math.ceil(total / limit),
      hasNext: start + limit < total,
      hasPrev: page > 1,
    },
  });
}));

/* ──────────────────────────────────────────
   GET /api/funds/stats
────────────────────────────────────────── */
router.get('/stats', asyncHandler(async (req, res) => {
  const funds = getFunds();
  const meta  = readMeta();

  const byCategory = {};
  funds.forEach(f => { byCategory[f.category] = (byCategory[f.category] || 0) + 1; });

  const withRet = funds.filter(f => f.returns?.ret1y !== null);
  const topGainers = [...withRet].sort((a, b) => b.returns.ret1y - a.returns.ret1y).slice(0, 5).map(stripHistory);
  const topLosers  = [...withRet].sort((a, b) => a.returns.ret1y - b.returns.ret1y).slice(0, 5).map(stripHistory);

  res.json({
    success: true,
    data: {
      total: funds.length,
      byCategory,
      topGainers,
      topLosers,
      lastSeeded: meta.seededAt || null,
    },
  });
}));

/* ──────────────────────────────────────────
   GET /api/funds/top-rated
────────────────────────────────────────── */
router.get('/top-rated', asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const funds = getFunds()
    .filter(f => f.stars === 5 && f.returns?.ret3y !== null)
    .sort((a, b) => b.returns.ret3y - a.returns.ret3y)
    .slice(0, limit)
    .map(stripHistory);

  res.json({ success: true, data: funds });
}));

/* ──────────────────────────────────────────
   GET /api/funds/amcs
   All AMC names
────────────────────────────────────────── */
router.get('/amcs', asyncHandler(async (req, res) => {
  const funds = getFunds();
  const amcs  = [...new Set(funds.map(f => f.amcName).filter(Boolean))].sort();
  res.json({ success: true, data: amcs });
}));

/* ──────────────────────────────────────────
   GET /api/funds/compare?codes=101,102,103
────────────────────────────────────────── */
router.get('/compare', asyncHandler(async (req, res) => {
  if (!req.query.codes) {
    return res.status(400).json({ success: false, error: { message: 'Provide ?codes=101,102,103' } });
  }
  const codes = req.query.codes.split(',').map(Number).filter(Boolean).slice(0, 5);
  const funds = getFunds();
  const result = codes.map(c => funds.find(f => f.schemeCode === c)).filter(Boolean).map(stripHistory);
  res.json({ success: true, data: result, count: result.length });
}));

/* ──────────────────────────────────────────
   GET /api/funds/:schemeCode
   Single fund detail (includes navHistory)
────────────────────────────────────────── */
router.get('/:schemeCode', asyncHandler(async (req, res) => {
  const code = parseInt(req.params.schemeCode);
  if (isNaN(code)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid scheme code' } });
  }
  const fund = getFunds().find(f => f.schemeCode === code);
  if (!fund) {
    return res.status(404).json({ success: false, error: { message: `Fund ${code} not found` } });
  }
  res.json({ success: true, data: fund });
}));

/* ──────────────────────────────────────────
   GET /api/funds/:schemeCode/nav-history
────────────────────────────────────────── */
router.get('/:schemeCode/nav-history', asyncHandler(async (req, res) => {
  const code = parseInt(req.params.schemeCode);
  const days = parseInt(req.query.days) || 365;
  const fund = getFunds().find(f => f.schemeCode === code);
  if (!fund) {
    return res.status(404).json({ success: false, error: { message: 'Fund not found' } });
  }
  res.json({
    success: true,
    data: {
      schemeName: fund.schemeName,
      history: (fund.navHistory || []).slice(0, days),
    },
  });
}));

module.exports = { router, clearCache };
