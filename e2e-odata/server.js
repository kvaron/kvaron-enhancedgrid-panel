'use strict';

/*
 * Minimal OData v4 mock server for end-to-end testing of the Enhanced Grid
 * panel's server-side OData mode through the Infinity data source.
 *
 * Dependency-free (Node http only). Implements just enough of OData v4 to
 * exercise the fragments the panel emits:
 *   - $filter   contains/startswith/endswith(tolower(F),'v'), tolower(F) eq 'v',
 *               F (eq|ne|gt|lt|ge|le) <string|number|bool|date|null>, the bare
 *               literal `true`, parenthesized groups, and `and`/`or`.
 *   - $orderby  "<Field> asc|desc" (single key).
 *   - $skip / $top   offset pagination.
 *   - $count=true    adds "@odata.count" (total after filtering, before paging).
 *   - GET /odata/Products/$count   plain-text filtered count.
 *
 * Every request logs its raw URL so `docker compose logs odata` shows exactly
 * what Infinity sent (handy for confirming `$` was not encoded to %24).
 */

const http = require('http');

const PORT = Number(process.env.PORT) || 8080;

// Deterministic dataset — 12 products across 3 categories, mixed types.
const PRODUCTS = [
  { ProductID: 1, ProductName: 'Chai', Category: 'Beverages', UnitPrice: 18.0, Discontinued: false, Created: '2024-01-05' },
  { ProductID: 2, ProductName: 'Chang', Category: 'Beverages', UnitPrice: 19.0, Discontinued: false, Created: '2024-01-20' },
  { ProductID: 3, ProductName: 'Aniseed Syrup', Category: 'Condiments', UnitPrice: 10.0, Discontinued: false, Created: '2024-02-11' },
  { ProductID: 4, ProductName: 'Chef Anton Cajun Seasoning', Category: 'Condiments', UnitPrice: 22.0, Discontinued: false, Created: '2024-02-28' },
  { ProductID: 5, ProductName: 'Gumbo Mix', Category: 'Condiments', UnitPrice: 21.35, Discontinued: true, Created: '2024-03-03' },
  { ProductID: 6, ProductName: "Grandma's Boysenberry", Category: 'Condiments', UnitPrice: 25.0, Discontinued: false, Created: '2024-03-15' },
  { ProductID: 7, ProductName: 'Uncle Bob Organic Pears', Category: 'Produce', UnitPrice: 30.0, Discontinued: false, Created: '2024-04-01' },
  { ProductID: 8, ProductName: 'Northwoods Cranberry Sauce', Category: 'Condiments', UnitPrice: 40.0, Discontinued: false, Created: '2024-04-18' },
  { ProductID: 9, ProductName: 'Mishi Kobe Niku', Category: 'Meat', UnitPrice: 97.0, Discontinued: true, Created: '2024-05-09' },
  { ProductID: 10, ProductName: 'Ikura', Category: 'Seafood', UnitPrice: 31.0, Discontinued: false, Created: '2024-05-22' },
  { ProductID: 11, ProductName: 'Queso Cabrales', Category: 'Dairy', UnitPrice: 21.0, Discontinued: false, Created: '2024-06-02' },
  { ProductID: 12, ProductName: 'Tofu', Category: 'Produce', UnitPrice: 23.25, Discontinued: false, Created: '2024-06-30' },
];

// ---------------------------------------------------------------------------
// $filter tokenizer + recursive-descent parser -> (row) => boolean
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?/;
const KEYWORDS = new Set([
  'and', 'or', 'eq', 'ne', 'gt', 'lt', 'ge', 'le',
  'null', 'true', 'false', 'tolower', 'contains', 'startswith', 'endswith',
]);

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '(' || c === ')' || c === ',') { tokens.push({ t: c }); i++; continue; }
    if (c === "'") {
      let j = i + 1;
      let s = '';
      while (j < input.length) {
        if (input[j] === "'" && input[j + 1] === "'") { s += "'"; j += 2; continue; }
        if (input[j] === "'") { break; }
        s += input[j];
        j++;
      }
      tokens.push({ t: 'string', v: s });
      i = j + 1;
      continue;
    }
    const rest = input.slice(i);
    const dm = rest.match(DATE_RE);
    if (dm) { tokens.push({ t: 'date', v: dm[0] }); i += dm[0].length; continue; }
    const nm = rest.match(/^-?\d+(\.\d+)?/);
    if (nm && (i === 0 || !/[A-Za-z0-9_]/.test(input[i - 1]))) {
      tokens.push({ t: 'number', v: Number(nm[0]) });
      i += nm[0].length;
      continue;
    }
    const wm = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (wm) {
      const w = wm[0];
      tokens.push(KEYWORDS.has(w.toLowerCase()) ? { t: w.toLowerCase() } : { t: 'ident', v: w });
      i += w.length;
      continue;
    }
    throw new Error(`Unexpected character ${c} at ${i}`);
  }
  tokens.push({ t: 'eof' });
  return tokens;
}

function parseFilter(input) {
  const tokens = tokenize(input);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (t) => { if (tokens[pos].t !== t) { throw new Error(`Expected ${t}, got ${tokens[pos].t}`); } return tokens[pos++]; };

  function parseOr() {
    let left = parseAnd();
    while (peek().t === 'or') { next(); const right = parseAnd(); const l = left, r = right; left = (row) => l(row) || r(row); }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek().t === 'and') { next(); const right = parseUnary(); const l = left, r = right; left = (row) => l(row) && r(row); }
    return left;
  }
  function parseUnary() {
    const tk = peek();
    if (tk.t === '(') { next(); const e = parseOr(); expect(')'); return e; }
    if (tk.t === 'contains' || tk.t === 'startswith' || tk.t === 'endswith') { return parseFunc(); }
    if (tk.t === 'true') { next(); return () => true; }
    if (tk.t === 'false') { next(); return () => false; }
    return parseComparison();
  }
  function parseOperand() {
    if (peek().t === 'tolower') {
      next(); expect('('); const id = expect('ident').v; expect(')');
      return (row) => String(getField(row, id) ?? '').toLowerCase();
    }
    const id = expect('ident').v;
    return (row) => getField(row, id);
  }
  function parseFunc() {
    const fn = next().t;
    expect('(');
    const operand = parseOperand();
    expect(',');
    const arg = expect('string').v.toLowerCase();
    expect(')');
    return (row) => {
      const hay = String(operand(row) ?? '').toLowerCase();
      if (fn === 'contains') { return hay.includes(arg); }
      if (fn === 'startswith') { return hay.startsWith(arg); }
      return hay.endsWith(arg);
    };
  }
  function parseComparison() {
    const operand = parseOperand();
    const op = next().t;
    if (!['eq', 'ne', 'gt', 'lt', 'ge', 'le'].includes(op)) { throw new Error(`Expected comparison op, got ${op}`); }
    const valTok = next();
    return (row) => compare(operand(row), op, valTok);
  }
  const fn = parseOr();
  expect('eof');
  return fn;
}

function getField(row, name) {
  return Object.prototype.hasOwnProperty.call(row, name) ? row[name] : undefined;
}

function compare(left, op, valTok) {
  if (valTok.t === 'null') {
    if (op === 'eq') { return left === null || left === undefined; }
    if (op === 'ne') { return !(left === null || left === undefined); }
    return false;
  }
  if (valTok.t === 'true' || valTok.t === 'false') {
    const rv = valTok.t === 'true';
    return op === 'eq' ? left === rv : op === 'ne' ? left !== rv : false;
  }
  let l = left;
  let r = valTok.v;
  if (valTok.t === 'date') { l = Date.parse(String(left)); r = Date.parse(String(r)); }
  else if (valTok.t === 'number') { l = Number(left); }
  // strings compare as-is (lexicographic)
  switch (op) {
    case 'eq': return l === r;
    case 'ne': return l !== r;
    case 'gt': return l > r;
    case 'lt': return l < r;
    case 'ge': return l >= r;
    case 'le': return l <= r;
    default: return false;
  }
}

function applyOrderBy(rows, orderby) {
  const spec = String(orderby || '').trim();
  if (!spec) { return rows; }
  const [field, dirRaw] = spec.split(/\s+/);
  const dir = (dirRaw || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) { return 0; }
    if (av == null) { return -1 * dir; }
    if (bv == null) { return 1 * dir; }
    if (av < bv) { return -1 * dir; }
    if (av > bv) { return 1 * dir; }
    return 0;
  });
}

function filterRows(filterExpr) {
  const expr = String(filterExpr || '').trim();
  if (!expr || expr === 'true') { return PRODUCTS.slice(); }
  let pred;
  try {
    pred = parseFilter(expr);
  } catch (e) {
    throw new Error(`Bad $filter "${expr}": ${e.message}`);
  }
  return PRODUCTS.filter(pred);
}

// ---------------------------------------------------------------------------
// HTTP handling
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  // Log the raw request so the e2e run can confirm what Infinity actually sent
  // (in particular, that `$filter` was not percent-encoded to `%24filter`).
  console.log(`[odata] ${req.method} ${req.url}`);

  const u = new URL(req.url, `http://localhost:${PORT}`);
  const path = u.pathname;

  const send = (code, body, type) => {
    res.writeHead(code, {
      'Content-Type': type || 'application/json',
      'OData-Version': '4.0',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  };

  if (path === '/' || path === '/health') {
    return send(200, JSON.stringify({ status: 'ok', service: 'odata-mock' }));
  }

  const filterExpr = u.searchParams.get('$filter');
  const orderby = u.searchParams.get('$orderby');
  const skip = parseInt(u.searchParams.get('$skip') || '', 10);
  const top = parseInt(u.searchParams.get('$top') || '', 10);
  const wantCount = u.searchParams.get('$count') === 'true';

  let filtered;
  try {
    filtered = filterRows(filterExpr);
  } catch (e) {
    return send(400, JSON.stringify({ error: { code: '400', message: e.message } }));
  }

  // OData $count endpoint: GET /odata/Products/$count -> plain-text number
  if (path === '/odata/Products/$count') {
    return send(200, String(filtered.length), 'text/plain');
  }

  if (path === '/odata/Products') {
    const total = filtered.length;
    let page = applyOrderBy(filtered, orderby);
    if (Number.isFinite(skip) && skip > 0) { page = page.slice(skip); }
    if (Number.isFinite(top) && top >= 0) { page = page.slice(0, top); }
    const payload = {
      '@odata.context': `http://localhost:${PORT}/odata/$metadata#Products`,
      value: page,
    };
    if (wantCount) { payload['@odata.count'] = total; }
    return send(200, JSON.stringify(payload));
  }

  return send(404, JSON.stringify({ error: { code: '404', message: `No route for ${path}` } }));
});

server.listen(PORT, () => {
  console.log(`[odata] mock server listening on :${PORT} (${PRODUCTS.length} products)`);
});
