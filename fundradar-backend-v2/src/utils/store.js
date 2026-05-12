const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/funds.json');
const META_FILE = path.join(__dirname, '../../data/meta.json');

/* ── Ensure data directory exists ── */
function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ── Read all funds from JSON file ── */
function readFunds() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/* ── Write all funds to JSON file ── */
function writeFunds(funds) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(funds, null, 2), 'utf8');
}

/* ── Read meta info (last sync time, count) ── */
function readMeta() {
  try {
    if (!fs.existsSync(META_FILE)) return {};
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/* ── Write meta ── */
function writeMeta(meta) {
  ensureDir();
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

/* ── Find single fund by schemeCode ── */
function findFund(schemeCode) {
  const funds = readFunds();
  return funds.find(f => f.schemeCode === parseInt(schemeCode)) || null;
}

/* ── Update a single fund in the JSON file ── */
function updateFund(schemeCode, updates) {
  const funds = readFunds();
  const idx   = funds.findIndex(f => f.schemeCode === parseInt(schemeCode));
  if (idx === -1) return false;
  funds[idx] = { ...funds[idx], ...updates };
  writeFunds(funds);
  return true;
}

module.exports = { readFunds, writeFunds, readMeta, writeMeta, findFund, updateFund };
