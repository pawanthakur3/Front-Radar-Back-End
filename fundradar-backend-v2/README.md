# FundRadar Backend (No Database) 🔍

Simple Node.js + Express API with **no database required**.
All fund data is stored in a local `data/funds.json` file.

---

## How it works

```
mfapi.in + AMFI  →  npm run seed  →  data/funds.json  →  API
```

1. `npm run seed` fetches all funds from AMFI and saves to a JSON file
2. The API reads that JSON file to serve all requests
3. Every weekday at 11 PM IST, NAV prices auto-refresh from AMFI

---

## Setup in Cursor (3 steps)

### Step 1 — Install packages
```bash
npm install
```

### Step 2 — Create your .env file
```bash
cp .env.example .env
```
No changes needed for local development — defaults work out of the box.

### Step 3 — Seed the data (run once)
```bash
npm run seed
```
This fetches ~900 funds from AMFI and saves them to `data/funds.json`.
Takes about **30–60 seconds** (without history) or **3–5 minutes** (with history).

> **Tip:** For faster seeding, add `FETCH_HISTORY=false` to your `.env`.
> Returns will be simulated but everything else is real.

### Start the server
```bash
npm run dev
```

Visit `http://localhost:5000/health` — you should see fund data is ready.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status + data info |
| GET | `/api` | All endpoints list |
| GET | `/api/funds` | List funds (search, filter, sort, paginate) |
| GET | `/api/funds/stats` | Counts, top gainers, top losers |
| GET | `/api/funds/top-rated` | 5-star funds |
| GET | `/api/funds/amcs` | All AMC names |
| GET | `/api/funds/compare?codes=1,2,3` | Compare up to 5 funds |
| GET | `/api/funds/:schemeCode` | Single fund detail |
| GET | `/api/funds/:schemeCode/nav-history` | NAV history |
| POST | `/api/sip/calculate` | SIP returns calculator |
| POST | `/api/sip/lumpsum` | Lumpsum calculator |

## Query params for `/api/funds`

```
q           → search by name or AMC
category    → Equity / Debt / Hybrid / Other
risk        → Low / Moderate / High
amc         → filter by AMC name
sort        → name / nav / ret1y / ret3y / stars / aum
order       → asc / desc
page        → page number (default: 1)
limit       → results per page (max: 200, default: 20)
stars       → minimum star rating (1–5)
minRet1y    → minimum 1Y return %
maxExp      → maximum expense ratio %
```

---

## Example Requests

```bash
# All Equity funds sorted by 3Y returns
curl "http://localhost:5000/api/funds?category=Equity&sort=ret3y&order=desc&limit=10"

# Search for HDFC funds
curl "http://localhost:5000/api/funds?q=hdfc&limit=5"

# Compare 3 funds
curl "http://localhost:5000/api/funds/compare?codes=100033,119598,120503"

# SIP calculation
curl -X POST http://localhost:5000/api/sip/calculate \
  -H "Content-Type: application/json" \
  -d '{"monthlyAmount":5000,"annualReturn":12,"years":10}'
```

---

## Connect to the frontend

In `fundradar/js/app.js`, change the fetch call:

```js
// Add at the top of app.js:
const API_BASE = 'http://localhost:5000/api';

// Then in loadFunds(), replace:
const res = await fetch('https://api.mfapi.in/mf');
// With:
const res = await fetch(`${API_BASE}/funds?limit=800`);
const json = await res.json();
const data = json.data; // backend returns { success, data, pagination }
```

---

## Project structure

```
fundradar-backend-simple/
├── src/
│   ├── index.js              ← Express server + cron NAV refresh
│   ├── routes/
│   │   ├── funds.js          ← All fund API endpoints
│   │   └── sip.js            ← SIP & lumpsum calculator
│   ├── services/
│   │   └── amfiService.js    ← Fetches data from AMFI & mfapi.in
│   ├── jobs/
│   │   └── seedFunds.js      ← Populate data/funds.json
│   ├── middleware/
│   │   └── errorHandler.js
│   └── utils/
│       └── store.js          ← Read/write JSON file
├── data/                     ← Auto-created after seeding
│   ├── funds.json            ← All fund data (~900 funds)
│   └── meta.json             ← Seed metadata
├── .env.example
├── package.json
└── README.md
```

---

## Deploy (no database needed)

### Render (free)
1. Push to GitHub
2. New Web Service → connect repo
3. Build: `npm install && npm run seed`
4. Start: `npm start`
5. Add env vars from `.env.example`

### Railway (free)
```bash
npm i -g @railway/cli
railway login && railway init && railway up
```
Set `npm run seed` as a one-time command in Railway dashboard after first deploy.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Node.js + Express | API server |
| JSON file | Data storage (no DB!) |
| mfapi.in | Free fund metadata API |
| AMFI | Free daily NAV data |
| node-cron | Auto NAV refresh daily |
| Helmet + CORS | Security |
