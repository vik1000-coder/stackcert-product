// CASS / StackCert demo data, derived from the strategy doc.
// Numbers are the paper's λ=5 / budget 0.50 results, lightly rounded for display.

const GUARDS = [
  { id: 'Rules', name: 'rules_policy',         type: 'rules',    vendor: 'in-house',  version: '2.4.1',  thresh: 0.50, latency: 2,   blocks: 98,   passes: 1902, cost: 0.0001 },
  { id: 'Lex',   name: 'lexical_guard',        type: 'lexical',  vendor: 'in-house',  version: '1.1.7',  thresh: 0.65, latency: 4,   blocks: 99,   passes: 1901, cost: 0.0001 },
  { id: 'CR',    name: 'cautious_rules',       type: 'rules',    vendor: 'in-house',  version: '2.4.1c', thresh: 0.35, latency: 2,   blocks: 112,  passes: 1888, cost: 0.0001 },
  { id: 'L3-1B', name: 'llama3.2-1B judge',    type: 'judge',    vendor: 'Meta',      version: '3.2-1B', thresh: 0.50, latency: 142, blocks: 658,  passes: 1342, cost: 0.0009 },
  { id: 'L3-3B', name: 'llama3.2-3B judge',    type: 'judge',    vendor: 'Meta',      version: '3.2-3B', thresh: 0.50, latency: 318, blocks: 1087, passes: 913,  cost: 0.0024 },
  { id: 'Gemma', name: 'gemma3-1B judge',      type: 'judge',    vendor: 'Google',    version: '3-1B',   thresh: 0.50, latency: 154, blocks: 1817, passes: 183,  cost: 0.0011 },
  { id: 'Phi3',  name: 'phi3-mini judge',      type: 'judge',    vendor: 'Microsoft', version: 'mini',   thresh: 0.50, latency: 188, blocks: 1217, passes: 783,  cost: 0.0013 },
  { id: 'LG3',   name: 'llama-guard3-1B',      type: 'safety',   vendor: 'Meta',      version: '3-1B',   thresh: 0.50, latency: 124, blocks: 1042, passes: 958,  cost: 0.0008 },
];

const CELLS = [
  { id: 'A/HarmBench',       side: 'adv',    source: 'harmbench',    n: 320, weight: 0.18 },
  { id: 'A/StrongREJECT',    side: 'adv',    source: 'strongreject', n: 313, weight: 0.18 },
  { id: 'A/ToxicChat-toxic', side: 'adv',    source: 'toxicchat',    n: 362, weight: 0.20 },
  { id: 'A/XSTest-unsafe',   side: 'adv',    source: 'xstest',       n: 200, weight: 0.12 },
  { id: 'N/ToxicChat-clean', side: 'benign', source: 'toxicchat',    n: 555, weight: 0.18 },
  { id: 'N/XSTest-safe',     side: 'benign', source: 'xstest',       n: 250, weight: 0.14 },
];

// Full architecture ranking at λ=5. firstOrder = product-of-means estimate; full = oracle.
const STACKS = [
  { stack: ['L3-3B', 'LG3'],   firstOrder: 0.1593,  full: 0.1110,  certified: false, rank: 1, note: 'marginal winner' },
  { stack: ['LG3',   'Phi3'],  firstOrder: 0.1552,  full: 0.1363,  certified: true,  rank: 2, note: 'CASS pick · full-eval winner' },
  { stack: ['L3-3B', 'Phi3'],  firstOrder: 0.1223,  full: -0.0477, certified: false, rank: 3, note: 'large correlation penalty' },
  { stack: ['Gemma', 'LG3'],   firstOrder: 0.0594,  full: 0.0641,  certified: false, rank: 4 },
  { stack: ['L3-1B', 'Phi3'],  firstOrder: 0.0464,  full: -0.0880, certified: false, rank: 5, note: 'negative full welfare' },
  { stack: ['Gemma', 'L3-3B'], firstOrder: 0.0460,  full: 0.0232,  certified: false, rank: 6 },
  { stack: ['Gemma', 'Phi3'],  firstOrder: 0.0410,  full: 0.0200,  certified: false, rank: 7 },
  { stack: ['Gemma', 'L3-1B'], firstOrder: 0.0378,  full: 0.0200,  certified: false, rank: 8 },
];

// Methods comparison (focus run at λ=5, budget 0.50).
const METHODS = [
  { method: 'CASS-greedy',         pick: 'LG3 + Phi3',  certRate: 1.00, regret: 0.000, agentCells: 10, pairCells: 13, recommended: true },
  { method: 'Uncertainty-greedy',  pick: 'LG3 + Phi3',  certRate: 0.00, regret: 0.000, agentCells: 24, pairCells: 67 },
  { method: 'Uniform-by-cell',     pick: 'LG3 + Phi3',  certRate: 0.00, regret: 0.000, agentCells: 24, pairCells: 84 },
  { method: 'Random',              pick: 'LG3 + Phi3',  certRate: 0.00, regret: 0.003, agentCells: 24, pairCells: 41.3 },
  { method: 'Top marginal',        pick: 'L3-3B + LG3', certRate: 0.00, regret: 0.025, agentCells: 0,  pairCells: 0 },
  { method: 'Provider diversity',  pick: 'L3-3B + LG3', certRate: 0.00, regret: 0.025, agentCells: 0,  pairCells: 0 },
];

// Pair-cell correlation matrix (block correlations). 8 guards × 8 = 64 cells, symmetric.
// Negative = misses spread out (good); positive = misses overlap (bad on adv side).
// Values are illustrative but anchored to the paper's two flagged extremes.
const CORR_ADV = (() => {
  const g = GUARDS.map(x => x.id);
  const seed = { 'Lex|Rules': 0.94, 'L3-3B|Phi3': 0.72, 'L3-1B|Phi3': 0.61, 'L3-3B|LG3': 0.48, 'LG3|Phi3': 0.12, 'Gemma|LG3': -0.04, 'Gemma|Phi3': -0.11, 'Gemma|L3-3B': 0.08, 'CR|Rules': 0.88, 'CR|Lex': 0.82, 'L3-1B|L3-3B': 0.55, 'L3-1B|LG3': 0.31, 'Gemma|L3-1B': 0.14, 'Gemma|Lex': -0.06, 'Gemma|Rules': -0.08, 'Gemma|CR': -0.09, 'Phi3|Lex': 0.21, 'Phi3|Rules': 0.18, 'Phi3|CR': 0.24, 'LG3|Lex': 0.16, 'LG3|Rules': 0.12, 'LG3|CR': 0.19, 'L3-1B|Lex': 0.09, 'L3-1B|Rules': 0.05, 'L3-1B|CR': 0.11, 'L3-3B|Lex': 0.14, 'L3-3B|Rules': 0.10, 'L3-3B|CR': 0.16 };
  const m = {};
  g.forEach(a => g.forEach(b => {
    if (a === b) { m[a + '|' + b] = 1; return; }
    const k = [a, b].sort().join('|');
    m[a + '|' + b] = seed[k] ?? 0;
  }));
  return m;
})();

const CORR_BEN = (() => {
  const g = GUARDS.map(x => x.id);
  const seed = { 'Gemma|Phi3': 0.62, 'Gemma|L3-3B': 0.41, 'Gemma|L3-1B': 0.35, 'Gemma|LG3': 0.28, 'L3-3B|Phi3': 0.34, 'L3-3B|LG3': 0.18, 'LG3|Phi3': 0.22, 'CR|Rules': 0.91, 'CR|Lex': 0.74, 'Lex|Rules': 0.45, 'L3-1B|L3-3B': 0.31, 'L3-1B|Phi3': 0.19, 'L3-1B|LG3': 0.12, 'Gemma|Lex': -0.04, 'Gemma|Rules': -0.06, 'Gemma|CR': 0.02, 'Phi3|Lex': 0.05, 'Phi3|Rules': 0.03, 'Phi3|CR': 0.09, 'LG3|Lex': 0.04, 'LG3|Rules': 0.02, 'LG3|CR': 0.07, 'L3-1B|Lex': 0.06, 'L3-1B|Rules': 0.04, 'L3-1B|CR': 0.08, 'L3-3B|Lex': 0.08, 'L3-3B|Rules': 0.05, 'L3-3B|CR': 0.11 };
  const m = {};
  g.forEach(a => g.forEach(b => {
    if (a === b) { m[a + '|' + b] = 1; return; }
    const k = [a, b].sort().join('|');
    m[a + '|' + b] = seed[k] ?? 0;
  }));
  return m;
})();

// Recommended measurements queued by CASS.
const MEASUREMENTS = [
  { id: 'm-001', pair: ['LG3', 'Phi3'],  cell: 'A/HarmBench',       reason: 'Closes gap vs L3-3B + LG3',          radiusΔ: 0.0091, cost: 240, blockedBy: ['L3-3B + LG3'] },
  { id: 'm-002', pair: ['LG3', 'Phi3'],  cell: 'A/StrongREJECT',    reason: 'Closes gap vs L3-3B + LG3',          radiusΔ: 0.0074, cost: 240, blockedBy: ['L3-3B + LG3'] },
  { id: 'm-003', pair: ['L3-3B','Phi3'], cell: 'A/HarmBench',       reason: 'Confirms correlation penalty',       radiusΔ: 0.0042, cost: 320, blockedBy: [] },
  { id: 'm-004', pair: ['LG3', 'Phi3'],  cell: 'N/XSTest-safe',     reason: 'Confirms benign false-block split',  radiusΔ: 0.0038, cost: 180, blockedBy: [] },
  { id: 'm-005', pair: ['Gemma','LG3'],  cell: 'A/ToxicChat-toxic', reason: 'Backup candidate stack',             radiusΔ: 0.0022, cost: 200, blockedBy: [] },
];

// Currently-blocking comparisons.
const COMPARISONS = [
  { incumbent: 'LG3 + Phi3', competitor: 'L3-3B + LG3',  gap: +0.0253, low: +0.0094, high: +0.0412, certified: true,  note: 'Certified by 13 pair-cell measurements' },
  { incumbent: 'LG3 + Phi3', competitor: 'L3-3B + Phi3', gap: +0.1840, low: +0.1602, high: +0.2078, certified: true,  note: 'Certified — correlation penalty large' },
  { incumbent: 'LG3 + Phi3', competitor: 'Gemma + LG3',  gap: +0.0722, low: +0.0488, high: +0.0956, certified: true },
  { incumbent: 'LG3 + Phi3', competitor: 'L3-1B + Phi3', gap: +0.2243, low: +0.2007, high: +0.2479, certified: true },
  { incumbent: 'LG3 + Phi3', competitor: 'Gemma + L3-3B',gap: +0.1131, low: +0.0892, high: +0.1370, certified: true },
];

// Drift signals (for the re-cert monitor).
const DRIFT = [
  { signal: 'Phi3 prompt template',     change: 'v3 → v3.1',    delta: '+12% adv block rate on HarmBench',  severity: 'low'  },
  { signal: 'Traffic mix',              change: 'XSTest +6 pts', delta: 'Benign / adv ratio drift',          severity: 'med'  },
  { signal: 'LG3 model version',        change: 'unchanged',     delta: '—',                                  severity: 'ok'   },
  { signal: 'New attack family',        change: 'unicode-evade', delta: '14 new examples flagged for label', severity: 'high' },
];

// Pre-canned welfare values at three λ presets (matches table 4.5).
const LAMBDA_PRESETS = {
  1:   { name: 'Balanced',         winner: 'L3-3B + LG3', winnerWelfare: 0.2424, marginalSame: true,  regret: 0 },
  2:   { name: 'Tilted to safety', winner: 'L3-3B + LG3', winnerWelfare: 0.2095, marginalSame: true,  regret: 0 },
  5:   { name: 'High-safety cost', winner: 'LG3 + Phi3',  winnerWelfare: 0.1363, marginalSame: false, regret: 0.0253 },
};

Object.assign(window, { GUARDS, CELLS, STACKS, METHODS, CORR_ADV, CORR_BEN, MEASUREMENTS, COMPARISONS, DRIFT, LAMBDA_PRESETS });
