require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const cron        = require('node-cron');
const fs          = require('fs');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { router: fundsRouter, clearCache } = require('./routes/funds');
const sipRouter   = require('./routes/sip');
const { fetchNavMap, computeReturns } = require('./services/amfiService');
const { readFunds, writeFunds, writeMeta, readMeta } = require('./utils/store');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Security & compression ── */
app.use(helmet());
app.use(compression());

/* ── CORS ── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:5500')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST'],
}));

/* ── Body parsing ── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate limiting ── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests. Please slow down.' } },
}));

/* ── Request logger (dev only) ── */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* ── Health check ── */
app.get('/health', (_req, res) => {
  const meta       = readMeta();
  const dataExists = fs.existsSync('./data/funds.json');
  res.json({
    status:      'ok',
    service:     'FundRadar API',
    version:     '1.0.0',
    dataReady:   dataExists,
    totalFunds:  meta.totalFunds || 0,
    lastSeeded:  meta.seededAt   || null,
    timestamp:   new Date().toISOString(),
  });
});

/* ── API info ── */
app.get('/api', (_req, res) => {
  res.json({
    service: 'FundRadar API (no-DB edition)',
    version: '1.0.0',
    storage: 'JSON file (data/funds.json)',
    endpoints: {
      funds:      'GET  /api/funds?q=hdfc&category=Equity&sort=ret3y&order=desc&page=1&limit=20',
      stats:      'GET  /api/funds/stats',
      topRated:   'GET  /api/funds/top-rated',
      amcs:       'GET  /api/funds/amcs',
      compare:    'GET  /api/funds/compare?codes=101,102,103',
      detail:     'GET  /api/funds/:schemeCode',
      navHistory: 'GET  /api/funds/:schemeCode/nav-history?days=365',
      sipCalc:    'POST /api/sip/calculate',
      lumpsum:    'POST /api/sip/lumpsum',
      health:     'GET  /health',
    },
  });
});

/* ── Routes ── */
app.use('/api/funds', fundsRouter);
app.use('/api/sip',   sipRouter);

/* ── 404 & error handling ── */
app.use(notFound);
app.use(errorHandler);

/* ── Daily NAV refresh (weekdays 11 PM IST) ── */
async function refreshNav() {
  console.log('[CRON] Starting NAV refresh...');
  try {
    const funds  = readFunds();
    if (!funds.length) { console.log('[CRON] No funds to refresh'); return; }

    const navMap = await fetchNavMap();
    let updated  = 0;

    const refreshed = funds.map(fund => {
      const entry = navMap[fund.schemeCode];
      if (!entry) return fund;
      updated++;
      return {
        ...fund,
        navCurrent:  entry.nav,
        navDate:     entry.date,
        lastSyncedAt: new Date().toISOString(),
      };
    });

    writeFunds(refreshed);
    writeMeta({ ...readMeta(), lastNavSync: new Date().toISOString(), lastSyncCount: updated });
    clearCache();
    console.log(`[CRON] NAV refresh done — updated ${updated} funds`);
  } catch (err) {
    console.error('[CRON] NAV refresh failed:', err.message);
  }
}

/* ── Start server ── */
app.listen(PORT, () => {
  console.log('\n====================================');
  console.log(`  FundRadar API — no database mode`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Env: ${process.env.NODE_ENV || 'development'}`);

  const dataExists = fs.existsSync('./data/funds.json');
  if (!dataExists) {
    console.log('\n  ⚠ No data found! Run: npm run seed');
  } else {
    const meta = readMeta();
    console.log(`  ✓ ${meta.totalFunds || '?'} funds loaded from data/funds.json`);
    console.log(`  ✓ Last seeded: ${meta.seededAt || 'unknown'}`);
  }
  console.log('====================================\n');
});

/* ── NAV refresh cron — weekdays at 11:30 PM IST ── */
cron.schedule('30 18 * * 1-5', refreshNav, { timezone: 'Asia/Kolkata' });

/* ── Graceful shutdown ── */
process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0); });
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
