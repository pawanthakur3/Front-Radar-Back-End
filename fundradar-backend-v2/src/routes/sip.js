const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/* ──────────────────────────────────────
   POST /api/sip/calculate
   Body: { monthlyAmount, annualReturn, years }
────────────────────────────────────── */
router.post('/calculate', asyncHandler(async (req, res) => {
  const { monthlyAmount, annualReturn, years } = req.body;

  const errors = [];
  if (!monthlyAmount || monthlyAmount < 100)      errors.push('monthlyAmount must be ≥ 100');
  if (!annualReturn  || annualReturn  < 0.1)      errors.push('annualReturn must be > 0');
  if (!years         || years < 1 || years > 50)  errors.push('years must be 1–50');
  if (errors.length) return res.status(400).json({ success: false, error: { message: errors.join('. ') } });

  const n = years * 12;
  const r = annualReturn / 100 / 12;

  const totalValue   = monthlyAmount * (Math.pow(1 + r, n) - 1) / r * (1 + r);
  const invested     = monthlyAmount * n;
  const totalReturns = totalValue - invested;

  const yearlyBreakdown = Array.from({ length: years }, (_, i) => {
    const y   = i + 1;
    const nn  = y * 12;
    const fv  = monthlyAmount * (Math.pow(1 + r, nn) - 1) / r * (1 + r);
    const inv = monthlyAmount * nn;
    return {
      year:       y,
      invested:   Math.round(inv),
      totalValue: Math.round(fv),
      returns:    Math.round(fv - inv),
    };
  });

  res.json({
    success: true,
    data: {
      inputs: { monthlyAmount, annualReturn, years },
      summary: {
        totalValue:   Math.round(totalValue),
        invested:     Math.round(invested),
        totalReturns: Math.round(totalReturns),
        wealthRatio:  parseFloat((totalReturns / invested * 100).toFixed(2)),
        investedPct:  parseFloat((invested / totalValue * 100).toFixed(2)),
        returnsPct:   parseFloat((totalReturns / totalValue * 100).toFixed(2)),
      },
      yearlyBreakdown,
    },
  });
}));

/* ──────────────────────────────────────
   POST /api/sip/lumpsum
   Body: { amount, annualReturn, years }
────────────────────────────────────── */
router.post('/lumpsum', asyncHandler(async (req, res) => {
  const { amount, annualReturn, years } = req.body;
  if (!amount || !annualReturn || !years) {
    return res.status(400).json({ success: false, error: { message: 'amount, annualReturn, years are required' } });
  }

  const r          = annualReturn / 100;
  const totalValue = amount * Math.pow(1 + r, years);
  const returns    = totalValue - amount;

  const yearlyBreakdown = Array.from({ length: years }, (_, i) => {
    const y  = i + 1;
    const fv = amount * Math.pow(1 + r, y);
    return { year: y, totalValue: Math.round(fv), returns: Math.round(fv - amount) };
  });

  res.json({
    success: true,
    data: {
      inputs: { amount, annualReturn, years },
      summary: {
        totalValue:  Math.round(totalValue),
        invested:    amount,
        totalReturns: Math.round(returns),
        wealthRatio: parseFloat((returns / amount * 100).toFixed(2)),
      },
      yearlyBreakdown,
    },
  });
}));

module.exports = router;
