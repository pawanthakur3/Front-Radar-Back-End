/* ── Category classifier ── */
export function getCategory(name = '', type = '') {
  const n = name.toLowerCase(), t = type.toLowerCase()

  const debt = ['debt','bond','gilt','liquid','overnight','money market','duration',
    'credit risk','banking and psu','corporate bond','treasury','fixed maturity','fmp',
    'floater','ultra short','low duration','short duration','medium duration',
    'long duration','dynamic bond','income fund','saving fund','savings fund',
    'fixed income','interval fund','interval plan']
  if (debt.some(k => n.includes(k) || t.includes(k))) return 'Debt'

  const hybrid = ['hybrid','balanced','arbitrage','multi asset','conservative',
    'aggressive hybrid','equity savings','dynamic asset','asset allocator',
    'retirement','children',"children's",'child','pension',
    'balanced advantage','dynamic advantage','fund of fund','fof']
  if (hybrid.some(k => n.includes(k) || t.includes(k))) return 'Hybrid'

  const equity = ['equity','elss','tax saver','tax saving','tax-saver',
    'large cap','largecap','mid cap','midcap','small cap','smallcap',
    'large & mid','large and mid','multi cap','multicap','flexi cap','flexicap',
    'focused','bluechip','blue chip','nifty','sensex','index','bse','nse','etf',
    'momentum','value fund','contra','dividend yield','sectoral','sector','thematic',
    'infrastructure','pharma','healthcare','fmcg','consumption','technology',
    'international','global','overseas','world','nasdaq','quant','esg','psu',
    'defence','manufacturing','realty','opportunities','special situation','business cycle']
  if (equity.some(k => n.includes(k) || t.includes(k))) return 'Equity'

  if (t.includes('equity')) return 'Equity'
  if (t.includes('debt') || t.includes('income')) return 'Debt'
  if (t.includes('hybrid') || t.includes('solution')) return 'Hybrid'
  if (n.includes('gold') || n.includes('silver') || n.includes('commodity')) return 'Other'
  return 'Other'
}

/* ── Risk classifier ── */
export function getRisk(cat, name = '') {
  const n = name.toLowerCase()
  if (cat === 'Debt') {
    if (n.includes('overnight') || n.includes('liquid') || n.includes('ultra short') || n.includes('money market')) return 'Low'
    if (n.includes('gilt') || n.includes('long duration') || n.includes('credit risk') || n.includes('dynamic bond')) return 'High'
    return 'Moderate'
  }
  if (cat === 'Hybrid') return 'Moderate'
  if (cat === 'Equity') {
    if (n.includes('small cap') || n.includes('smallcap') || n.includes('micro') ||
        n.includes('sector') || n.includes('thematic') || n.includes('international') ||
        n.includes('global') || n.includes('overseas') || n.includes('psu') ||
        n.includes('defence') || n.includes('infrastructure')) return 'High'
    return 'Moderate'
  }
  return 'Moderate'
}

/* ── Deterministic star rating ── */
export function getStars(schemeCode) {
  const h = Math.abs(String(schemeCode).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0))
  return Math.max(1, Math.min(5, 1 + (h % 5)))
}

/* ── Simulated metrics (fallback when no real data) ── */
export function getSimulatedMetrics(schemeCode) {
  const h = Math.abs(String(schemeCode).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0))
  return {
    nav:     parseFloat((10 + (h % 9000) / 10).toFixed(2)),
    ret1y:   parseFloat(((h % 280 - 80) / 10).toFixed(1)),
    ret3y:   parseFloat(((h % 220 - 50) / 10).toFixed(1)),
    ret5y:   parseFloat(((h % 200 - 30) / 10).toFixed(1)),
    aum:     100 + (h % 49900),
    expense: parseFloat((0.1 + (h % 25) / 10).toFixed(2)),
    sharpe:  parseFloat(((h % 30 - 5) / 10).toFixed(2)),
  }
}

/* ── AMC name prefix lookup ── */
const AMC_PREFIX_MAP = [
  ['Aditya Birla Sun Life',  'Aditya Birla Sun Life Mutual Fund'],
  ['Axis',                   'Axis Mutual Fund'],
  ['Bajaj Finserv',          'Bajaj Finserv Mutual Fund'],
  ['Bandhan',                'Bandhan Mutual Fund'],
  ['Bank of India',          'Bank of India Mutual Fund'],
  ['Baroda BNP Paribas',     'Baroda BNP Paribas Mutual Fund'],
  ['Canara Robeco',          'Canara Robeco Mutual Fund'],
  ['DSP',                    'DSP Mutual Fund'],
  ['Edelweiss',              'Edelweiss Mutual Fund'],
  ['Franklin India',         'Franklin Templeton Mutual Fund'],
  ['Franklin Templeton',     'Franklin Templeton Mutual Fund'],
  ['Groww',                  'Groww Mutual Fund'],
  ['HDFC',                   'HDFC Mutual Fund'],
  ['Helios',                 'Helios Mutual Fund'],
  ['HSBC',                   'HSBC Mutual Fund'],
  ['ICICI Prudential',       'ICICI Prudential Mutual Fund'],
  ['IDBI',                   'IDBI Mutual Fund'],
  ['IDFC',                   'IDFC Mutual Fund'],
  ['IIFL',                   'IIFL Mutual Fund'],
  ['Invesco India',          'Invesco Mutual Fund'],
  ['ITI',                    'ITI Mutual Fund'],
  ['JM Financial',           'JM Financial Mutual Fund'],
  ['JM',                     'JM Financial Mutual Fund'],
  ['Kotak Mahindra',         'Kotak Mutual Fund'],
  ['Kotak',                  'Kotak Mutual Fund'],
  ['LIC',                    'LIC Mutual Fund'],
  ['Mahindra Manulife',      'Mahindra Manulife Mutual Fund'],
  ['Mirae Asset',            'Mirae Asset Mutual Fund'],
  ['Motilal Oswal',          'Motilal Oswal Mutual Fund'],
  ['Navi',                   'Navi Mutual Fund'],
  ['Nippon India',           'Nippon India Mutual Fund'],
  ['NJ',                     'NJ Mutual Fund'],
  ['Old Bridge',             'Old Bridge Mutual Fund'],
  ['PGIM India',             'PGIM India Mutual Fund'],
  ['PPFAS',                  'PPFAS Mutual Fund'],
  ['Parag Parikh',           'PPFAS Mutual Fund'],
  ['Quantum',                'Quantum Mutual Fund'],
  ['Quant',                  'Quant Mutual Fund'],
  ['SBI',                    'SBI Mutual Fund'],
  ['Samco',                  'Samco Mutual Fund'],
  ['Shriram',                'Shriram Mutual Fund'],
  ['Sundaram',               'Sundaram Mutual Fund'],
  ['Tata',                   'Tata Mutual Fund'],
  ['Taurus',                 'Taurus Mutual Fund'],
  ['Trust',                  'Trust Mutual Fund'],
  ['Union',                  'Union Mutual Fund'],
  ['UTI',                    'UTI Mutual Fund'],
  ['WhiteOak Capital',       'WhiteOak Capital Mutual Fund'],
  ['WhiteOak',               'WhiteOak Capital Mutual Fund'],
  ['Zerodha',                'Zerodha Mutual Fund'],
  ['360 One',                '360 One Mutual Fund'],
  ['360One',                 '360 One Mutual Fund'],
  ['Bajaj',                  'Bajaj Finserv Mutual Fund'],
  ['Baroda',                 'Baroda BNP Paribas Mutual Fund'],
]

export function extractAmcFromName(schemeName = '') {
  const name = schemeName.trim()
  for (const [prefix, amcName] of AMC_PREFIX_MAP) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) return amcName
  }
  const dashIdx = name.indexOf(' - ')
  if (dashIdx > 4) return name.slice(0, dashIdx).replace(/\s+(Mutual Fund|MF|Asset|AMC)$/i, '').trim()
  return ''
}

/* ── Normalise backend or mfapi fund object ─────────────────────────
   Handles both backend (real returns) and mfapi fallback (simulated)
───────────────────────────────────────────────────────────────── */
export function normaliseFund(f) {
  const name    = f.schemeName || f.scheme_name || ''
  const type    = f.schemeType || f.scheme_type || f.schemeCategory || ''
  const amc     = f.amcName || f.mutualFundFamily || f.mutual_fund_family || extractAmcFromName(name)
  const rawCat  = f.category
  const category = (!rawCat || rawCat === 'Other') ? getCategory(name, type) : rawCat
  const risk     = f.risk || getRisk(category, name)
  const stars    = f.stars || getStars(f.schemeCode)
  const sim      = getSimulatedMetrics(f.schemeCode)

  /* Real returns from backend take priority over simulated */
  const ret1y = f.returns?.ret1y ?? sim.ret1y
  const ret3y = f.returns?.ret3y ?? sim.ret3y
  const ret5y = f.returns?.ret5y ?? sim.ret5y
  const sharpe = f.returns?.sharpe ?? sim.sharpe

  return {
    schemeCode:  f.schemeCode,
    schemeName:  name,
    amcName:     amc,
    category,
    risk,
    stars,
    nav:        f.navCurrent ?? sim.nav,
    ret1y,
    ret3y,
    ret5y,
    aum:        f.aum ?? sim.aum,
    expense:    f.expenseRatio ?? sim.expense,
    navHistory: f.navHistory || [],
    returns: {
      ret1m:  f.returns?.ret1m  ?? null,
      ret3m:  f.returns?.ret3m  ?? null,
      ret6m:  f.returns?.ret6m  ?? null,
      ret1y,
      ret3y,
      ret5y,
      sharpe,
    },
  }
}

/* ── Formatters ── */
export const fmt     = n => parseFloat(n).toLocaleString('en-IN')
export const fmtCr   = n => `₹${n >= 10000 ? (n/100).toFixed(0)+' Cr' : n.toLocaleString('en-IN')+' Cr'}`
export const retSign = v => v >= 0 ? '+' : ''
