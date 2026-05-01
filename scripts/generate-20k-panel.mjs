import { readFileSync, writeFileSync } from 'node:fs';

const DASHBOARD = 'provisioning/dashboards/dashboard.json';
const ROW_COUNT = 20_000;

const dashboard = JSON.parse(readFileSync(DASHBOARD, 'utf8'));
const panel1 = dashboard.panels.find((p) => p.id === 1);
const panel2 = dashboard.panels.find((p) => p.id === 2);
if (!panel1 || !panel2) {
  throw new Error('Expected panels with id 1 and id 2 in dashboard.json');
}

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
  'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruth', 'Sam', 'Tara',
];
const LAST_NAMES = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Taylor',
  'Anderson', 'Thomas', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis',
];
const STATUSES = ['Active', 'Pending', 'Inactive'];
const HEX = '0123456789abcdef';

// Deterministic pseudo-random so reruns produce the same dashboard payload.
let seed = 1;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const guid = () => {
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      s += '-';
    } else {
      s += HEX[Math.floor(rand() * 16)];
    }
  }
  return s;
};
const sparkSeries = (count, min, max) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round(min + rand() * (max - min)));
  }
  return out.join(',');
};

const baseTime = Date.UTC(2024, 0, 1);
const dayMs = 86_400_000;
const rows = [];
for (let i = 0; i < ROW_COUNT; i++) {
  const id = i + 1;
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const status = pick(STATUSES);
  const created = baseTime + Math.floor(rand() * 365) * dayMs;
  const score = Math.floor(rand() * 101);
  const amount = Math.round((rand() * 20_000 - 5_000) * 100) / 100;
  const isActive = rand() > 0.3;
  rows.push([
    id,
    name,
    status,
    created,
    guid(),
    score,
    amount,
    isActive,
    sparkSeries(7, 5, 60),
    sparkSeries(7, 1, 15),
    sparkSeries(3, 10, 60),
    sparkSeries(5, 30, 100),
  ]);
}

const rawFrame = JSON.stringify([
  {
    columns: [
      { text: 'ID', type: 'number' },
      { text: 'Name', type: 'string' },
      { text: 'Status', type: 'string' },
      { text: 'Created', type: 'time' },
      { text: 'GUID', type: 'string' },
      { text: 'Score', type: 'number' },
      { text: 'Amount', type: 'number' },
      { text: 'IsActive', type: 'boolean' },
      { text: 'TrendLine', type: 'string' },
      { text: 'BarData', type: 'string' },
      { text: 'StackData', type: 'string' },
      { text: 'BulletData', type: 'string' },
    ],
    rows,
  },
]);

// Frozen-column sections in GridBody render every row (not virtualized) — leave
// them off here so the 20k stress panel exercises the new TanStack virtualizer
// in isolation. Panel 1 still covers the frozen-column behavior at small scale.
panel2.options = {
  ...panel1.options,
  highlightRules: panel1.options.highlightRules,
  paginationEnabled: false,
  virtualScrollEnabled: true,
  showRowNumbers: true,
  freezeLeftColumns: 0,
  freezeRightColumns: 0,
};
panel2.fieldConfig = panel1.fieldConfig;
panel2.targets = [
  {
    datasource: panel1.targets[0].datasource,
    rawFrameContent: rawFrame,
    refId: 'A',
    scenarioId: 'raw_frame',
  },
];
delete panel2.maxDataPoints;

writeFileSync(DASHBOARD, JSON.stringify(dashboard, null, 2) + '\n');
console.log(`Wrote ${ROW_COUNT} rows into panel id 2 (${(rawFrame.length / 1024 / 1024).toFixed(2)} MB rawFrameContent)`);
