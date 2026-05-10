# Server-Side Filtering and Sorting Setup Guide

This guide explains how to configure server-side filtering and sorting with your datasource (Infinity, PostgreSQL, MySQL, etc.).

## Overview

When **Server-Side Mode** is enabled, the panel pushes filter and sort state to dashboard variables instead of filtering/sorting data locally. Your datasource queries can then use these variables to apply filters and sorting at the data source level.

## Benefits

- **Performance**: Handle large datasets by filtering at the source
- **Efficiency**: Reduce network payload by only fetching needed data
- **Scalability**: Works with any size dataset

## Setup Instructions

### Step 1: Create Dashboard Variables

1. Go to your Grafana dashboard settings (gear icon)
2. Navigate to **Variables**
3. Create two new variables:

   **Filter Variable:**
   - **Name**: `gridFilter` (or your custom name)
   - **Type**: Text box
   - **Hide**: Variable (optional - hides from dashboard UI)

   **Sort Variable:**
   - **Name**: `gridSort` (or your custom name)
   - **Type**: Text box
   - **Hide**: Variable (optional)

### Step 2: Configure Panel Settings

1. Edit your Enhanced Grid panel
2. Go to the **Server-Side** section in panel options
3. Enable **Server-Side Mode**
4. Select your **Query Format**:
   - **OData**: For OData APIs (produces `$filter` and `$orderby`)
   - **SQL**: For PostgreSQL, TimescaleDB, SQL Server, and other ANSI SQL
     databases (produces `WHERE` and `ORDER BY` clauses)
   - **JSON**: Generic format for custom APIs
5. If you picked **SQL**, pick the **SQL Dialect** that matches your
   database. See [SQL Dialects](#sql-dialects) below for the exact syntax
   each dialect produces. Default is `postgres`.
6. Set **Filter Variable Name**: `gridFilter` (must match your dashboard variable)
7. Set **Sort Variable Name**: `gridSort` (must match your dashboard variable)

### Step 3: Configure Your Datasource Query

#### For Infinity Datasource (OData API)

Configure your URL template to use the variables:

```
https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}
```

**Example with filters applied:**

- User filters: Name contains "laptop", Category contains "electronics"
- Generated URL: `https://api.example.com/odata/Products?$filter=contains(tolower(Name), 'laptop') and contains(tolower(Category), 'electronics')&$orderby=Price desc`

#### For PostgreSQL/MySQL Datasource

Use variables in your SQL query:

```sql
SELECT * FROM products
WHERE ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

**Important**: Use the `:raw` format specifier to prevent escaping.

**Example with filters applied:**

- User filters: name contains "laptop"
- User sorts by: price DESC
- Generated query:
  ```sql
  SELECT * FROM products
  WHERE name ILIKE '%laptop%'
  ORDER BY price DESC
  ```

#### For Infinity Datasource (Custom REST API)

If your API uses custom query parameters:

```
https://api.example.com/products?filter=${gridFilter}&sort=${gridSort}
```

With JSON format selected, the variables will contain JSON-encoded values.

### Step 4: Handle Empty Variables

Add default handling for when no filters/sorts are applied:

**PostgreSQL/MySQL:**

```sql
SELECT * FROM products
WHERE 1=1 ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

This ensures the query is valid even when variables are empty.

**OData:**

```
https://api.example.com/odata/Products?${gridFilter:queryparam}&${gridSort:queryparam}
```

## Query Format Examples

### OData Format

**Filter Output:**

```
contains(tolower(Name), 'laptop') and contains(tolower(Price), '999')
```

**Sort Output:**

```
Price desc
```

**Usage in URL:**

```
?$filter=contains(tolower(Name), 'laptop')&$orderby=Price desc
```

### SQL Format

**Filter Output (WHERE clause)** — exact syntax depends on the chosen
**SQL Dialect** (see [SQL Dialects](#sql-dialects)). PostgreSQL example:

```
"name" ILIKE '%laptop%' AND "price" ILIKE '%999%'
```

**Sort Output (ORDER BY clause):**

```
"price" DESC
```

**Usage in Query:**

```sql
SELECT * FROM products
WHERE "name" ILIKE '%laptop%' AND "price" ILIKE '%999%'
ORDER BY "price" DESC
```

### JSON Format

**Filter Output:**

```json
{ "Name": "laptop", "Price": "999" }
```

**Sort Output:**

```
-Price
```

(Minus sign indicates descending)

## Configuring the data source connection

The SQL connection that backs this dashboard is the security boundary
for server-side mode. Use a read-only role scoped to the tables this
dashboard needs — Grafana's
[Data source security best practices](https://grafana.com/blog/data-source-security-in-grafana-best-practices-and-what-to-avoid/)
covers the underlying model.

A few connection settings this panel expects:

- **SQL template** — use `:raw` interpolation, e.g.
  `WHERE ${gridFilter:raw}`. The panel handles value escaping itself,
  so `:raw` keeps the prepared fragment intact. **Only the panel
  writes this variable** — see [Deep links](#deep-links) below for the
  supported way to pre-fill filters from a URL.
- **PostgreSQL** — leave `standard_conforming_strings = on` (the
  default since 9.1).
- **MySQL / MariaDB with the `ansi` dialect** — set
  `ANSI_QUOTES,NO_BACKSLASH_ESCAPES` in the connection's `sql_mode`
  (see [SQL Dialects](#sql-dialects)).
- **Multi-statement** — disable it where the Grafana driver allows
  (e.g. `multipleStatements: false` for the MySQL driver).

### Filter / Sort Variable Names must be unique per panel

If you have multiple grid panels on a dashboard, **each panel must use
unique values for Filter Variable Name and Sort Variable Name.**
Sharing names causes the panels to race each other on every state
change and produces inconsistent results. The panel detects collisions
at mount and renders a yellow warning banner at the top of the panel
body until the names are made distinct in panel options.

## Deep links

Send a URL that lands on the dashboard with the grid already filtered.
The panel exposes a structured syntax that mirrors the UI's filter and
sort options:

```
https://grafana.example.com/d/<uid>?gridFilter.status=equals:active
                                  &gridFilter.price=between:100:500
                                  &gridSort=price:desc
```

`gridFilter` and `gridSort` here are the panel's configured Filter /
Sort Variable Names; substitute your own values if you customized them.

| URL form | Operators it accepts |
| --- | --- |
| `?{filterVar}.{field}={op}` | `blank`, `not_blank` |
| `?{filterVar}.{field}={op}:{value}` | `contains`, `equals`, `starts_with`, `ends_with`, `eq`, `ne`, `gt`, `lt`, `gte`, `lte` |
| `?{filterVar}.{field}={op}:{value}:{value2}` | `between` |
| `?{sortVar}={field}:{direction}` | `asc`, `desc` |

On mount the panel validates every entry against the operator list and
the live data frame's columns; anything that fails is dropped (with a
console warning). Surviving entries seed the panel's filter / sort
state and flow through the same SQL escape pipeline as filters typed in
the UI — no input ever reaches the data source unescaped.

> URL deep links carry **intent**, not raw SQL. The legacy form
> `?var-{filterVar}=<sql-fragment>` is silently overwritten by the
> panel on the next state publish; if the panel observes that form at
> mount, a single `console.warn` describes the situation. Use the
> structured `?{filterVar}.{field}=...` syntax instead.

For multi-panel dashboards, each panel's URL parameters use that
panel's own Filter / Sort Variable Names — no collision possible
provided the names are unique:

```
?inventoryFilter.status=equals:active   ← grid 1 reads this
&customerFilter.region=equals:west      ← grid 2 reads this
```

## SQL Dialects

When **Query Format** is **SQL**, the panel exposes a **SQL Dialect**
dropdown. The dialect controls two things:

1. **Identifier quoting** — how column names are wrapped so spaces and
   reserved words still work.
2. **Case-insensitive text comparison** — how `contains`, `equals`,
   `starts_with`, and `ends_with` are written, since not every database
   supports `ILIKE`.

Numeric operators (`=`, `!=`, `>`, `>=`, `<`, `<=`, `between`), `blank`,
and `not_blank` use the same shape across all dialects; only the
identifier quoting differs.

### Dialect comparison

For a column called `name` filtered with operator `contains` and value
`laptop`, plus a `BETWEEN` filter on `price`:

| Dialect       | Identifier   | `contains` text fragment                       | `BETWEEN` fragment                |
| ------------- | ------------ | ---------------------------------------------- | --------------------------------- |
| `postgres`    | `"name"`     | `"name" ILIKE '%laptop%'`                      | `"price" BETWEEN 100 AND 500`     |
| `sqlserver`   | `[name]`     | `[name] LIKE '%laptop%'`                       | `[price] BETWEEN 100 AND 500`     |
| `ansi`        | `"name"`     | `LOWER("name") LIKE LOWER('%laptop%')`         | `"price" BETWEEN 100 AND 500`     |

### When to pick which

- **`postgres` (default)** — PostgreSQL and TimescaleDB. Uses `ILIKE`, so
  text comparisons are case-insensitive without depending on collation.
- **`sqlserver`** — Microsoft SQL Server. Uses `LIKE` with `[bracketed]`
  identifiers. Case-insensitivity comes from SQL Server's default
  case-insensitive collation (e.g. `SQL_Latin1_General_CP1_CI_AS`); if
  your column uses a case-sensitive collation, use the `ansi` dialect
  instead.
- **`ansi`** — Portable SQL. Wraps each side of text comparisons in
  `LOWER(...)` so case-insensitive matching works on databases that lack
  `ILIKE`. Slightly slower because functional expressions on the column
  can defeat indexes — add a functional index on `LOWER(col)` if
  performance matters.

  **Per-database caveats** (read before using `ansi`):

  | Database         | Status with `ansi`                                                         |
  | ---------------- | -------------------------------------------------------------------------- |
  | **SQLite**       | Works out-of-the-box.                                                      |
  | **MySQL / MariaDB** | Set both `ANSI_QUOTES` and `NO_BACKSLASH_ESCAPES` in the connection's `sql_mode`. Without `ANSI_QUOTES`, MySQL parses `"col"` as a string literal and the filter silently matches nothing. Without `NO_BACKSLASH_ESCAPES`, MySQL's backslash-escape semantics defeat the panel's quote-doubling, leaving an injection vector. |
  | **Oracle**       | Only when tables were created with quoted, case-matching DDL (`CREATE TABLE … ("Name" VARCHAR2(...))`). Unquoted Oracle DDL folds names to UPPERCASE and the panel's quoted lookup errors with `ORA-00904`. |

### Identifier escaping

All dialects escape characters inside an identifier so columns named with
reserved words or punctuation still work:

| Dialect     | Escape rule                                                          | Example                       |
| ----------- | -------------------------------------------------------------------- | ----------------------------- |
| `postgres`  | Internal `"` doubled, wrapped in `"`                                 | `weird"name` → `"weird""name"` |
| `sqlserver` | Internal `]` doubled, wrapped in `[ ]`                               | `weird]name` → `[weird]]name]` |
| `ansi`      | Internal `"` doubled, wrapped in `"` (same rule as `postgres`)       | `weird"name` → `"weird""name"` |

Single quotes inside string values are doubled (`O'Brien` → `'O''Brien'`)
in every dialect — the panel never concatenates raw user input into the
fragment.

### Side-by-side filter example

Same user input (`name contains 'laptop'`, `price between 100 and 500`,
sort `price` descending) across the three dialects:

```text
postgres:   WHERE "name" ILIKE '%laptop%' AND "price" BETWEEN 100 AND 500
            ORDER BY "price" DESC

sqlserver:  WHERE [name] LIKE '%laptop%' AND [price] BETWEEN 100 AND 500
            ORDER BY [price] DESC

ansi:       WHERE LOWER("name") LIKE LOWER('%laptop%')
              AND "price" BETWEEN 100 AND 500
            ORDER BY "price" DESC
```

The examples in [Query Replacement Reference](#query-replacement-reference)
below assume `postgres` (the default). Substitute identifier quoting and
text-comparison shape from the table above when reading them under a
different dialect.

## Query Replacement Reference

This section shows exactly what the panel writes into each dashboard variable
and how those values land in your datasource queries after Grafana's variable
interpolation. Use these examples as a starting point when building your own
queries.

### How replacement works

When server-side mode is enabled, the panel:

1. Watches column filters, sort state, and (optionally) pagination state.
2. Builds a string fragment per concern (filter, sort, skip, top) using the
   selected **Query Format**.
3. Writes those fragments to dashboard variables via the URL
   (e.g. `?var-gridFilter=...&var-gridSort=...`).
4. Grafana re-runs any panel query that references the variables, with the
   fragments interpolated where you used `${gridFilter}`, `${gridSort}`, etc.

The panel writes the variables only when a value applies:

- The filter and sort variables are written on every change in server-side
  mode (empty string when the user clears all filters or sort).
- Skip / top variables are written only when **Enable Server-Side
  Pagination** is on.

Because the values are interpolated as text, **always use the `:raw` format
specifier in SQL queries** — otherwise Grafana wraps the value in single
quotes and the SQL becomes invalid.

---

### Filter query replacement

The panel maps each active column filter to a fragment in the chosen format
and joins them with `AND` (SQL) or `and` (OData). Field names in SQL output
are quoted using the chosen [SQL Dialect](#sql-dialects) — `"col"` for
`postgres` / `ansi`, `[col]` for `sqlserver` — so columns with spaces or
reserved words still work.

#### Operator → fragment cheat sheet

The SQL column shows `postgres` output. Substitute identifier quoting and
text-comparison shape from [SQL Dialects](#sql-dialects) for the other
dialects. Numeric / blank operators differ only in identifier quoting.

| Filter (column type) | Operator    | SQL fragment (`postgres`)                          | OData fragment (`queryFormat: odata`)               |
| -------------------- | ----------- | -------------------------------------------------- | --------------------------------------------------- |
| Text                 | contains    | `"col" ILIKE '%val%' ESCAPE '!'`                   | `contains(tolower(col), 'val')`                     |
| Text                 | equals      | `LOWER("col") = LOWER('val')`                      | `tolower(col) eq 'val'`                             |
| Text                 | starts_with | `"col" ILIKE 'val%' ESCAPE '!'`                    | `startswith(tolower(col), 'val')`                   |
| Text                 | ends_with   | `"col" ILIKE '%val' ESCAPE '!'`                    | `endswith(tolower(col), 'val')`                     |
| Number               | =, ≠, >, <  | `"col" = 42` (or `!=`, `>`, `<`, `>=`, `<=`) | `col eq 42` (or `ne`, `gt`, `lt`, `ge`, `le`)     |
| Number               | between     | `"col" BETWEEN 10 AND 20`                  | `(col ge 10 and col le 20)`                         |
| Any                  | blank       | `("col" IS NULL OR "col" = '' OR TRIM("col") = '')` | `(col eq null or col eq '')`               |
| Any                  | not_blank   | `("col" IS NOT NULL AND "col" != '' AND TRIM("col") != '')` | `(col ne null and col ne '')`     |

The same `name contains 'foo'` filter across dialects:

```text
postgres   →  "name" ILIKE '%foo%' ESCAPE '!'
sqlserver  →  [name] LIKE '%foo%' ESCAPE '!'
ansi       →  LOWER("name") LIKE LOWER('%foo%') ESCAPE '!'
```

Every fuzzy operator (`contains` / `starts_with` / `ends_with`) emits an
`ESCAPE '!'` clause so user-typed `%`, `_`, and (for SQL Server) `[` are
matched literally instead of acting as wildcards. The exclamation point
is the LIKE escape character; it is doubled in the user's value if it
appears literally.

> **Slow query log FAQ — "what is `ESCAPE '!'` and why `!` not `\`?"**
>
> `ESCAPE '!'` is a SQL-92 standard clause supported uniformly by
> PostgreSQL, SQL Server, MySQL, MariaDB, SQLite, and Oracle. It tells
> the database that, inside the LIKE pattern, the character `!`
> introduces a literal next character (so `!%` matches a literal `%`,
> not the wildcard). The panel emits this clause so a user typing
> `50%` into a `contains` filter matches the literal substring `50%`
> rather than every row containing `50`.
>
> The escape character is `!` rather than the more conventional `\`
> because MySQL's default `sql_mode` treats `\` as an escape character
> inside string literals as well, which creates a conflict between SQL
> string-literal escaping and LIKE-pattern escaping when both use `\`.
> Choosing `!` sidesteps the conflict and produces SQL that is portable
> across every dialect this panel supports — including MySQL without
> requiring `NO_BACKSLASH_ESCAPES` for the fuzzy text operators
> specifically. If the user's value contains a literal `!`, the panel
> doubles it to `!!` so the database still interprets it as one
> literal `!`.

Numeric operators coerce values with `Number(...)` and drop the fragment if
the result is `NaN`, so non-numeric input never reaches your database.

#### Example 1 — single text filter (PostgreSQL)

Query as authored in the Grafana data source editor:

```sql
SELECT id, name, price
FROM products
WHERE ${gridFilter:raw}
ORDER BY id
```

User action: type `laptop` into the **Name** column filter (operator
`contains`).

`gridFilter` becomes:

```
"name" ILIKE '%laptop%'
```

Query sent to PostgreSQL after interpolation:

```sql
SELECT id, name, price
FROM products
WHERE "name" ILIKE '%laptop%'
ORDER BY id
```

#### Example 2 — combined text + numeric filter (PostgreSQL)

Same query template. User filters **Name contains `laptop`** and **Price >
500** simultaneously.

`gridFilter` becomes (fragments joined with ` AND `):

```
"name" ILIKE '%laptop%' AND "price" > 500
```

Query after interpolation:

```sql
SELECT id, name, price
FROM products
WHERE "name" ILIKE '%laptop%' AND "price" > 500
ORDER BY id
```

#### Example 3 — numeric `between` (PostgreSQL)

Same query template. User filters `price` with operator **between**, lower
bound `100`, upper bound `500`.

`gridFilter`:

```
"price" BETWEEN 100 AND 500
```

Query after interpolation:

```sql
SELECT id, name, price
FROM products
WHERE "price" BETWEEN 100 AND 500
ORDER BY id
```

> **Note:** numeric operators (`=`, `>`, `between`, …) coerce inputs with
> `Number(...)`. If a value is not a valid number the fragment is dropped
> entirely, so a half-typed range never becomes `WHERE "price" BETWEEN NaN`.

#### Example 4 — date column

The column type detector classifies date columns, but they reuse the
**text-style** operators (`contains`, `equals`, `starts_with`, `ends_with`).
The numeric `between` operator is **not** offered for date columns, because
date strings cannot be coerced via `Number(...)`.

User action: filter `created_at` with **starts_with** value `2026-03`.

`gridFilter`:

```
"created_at" ILIKE '2026-03%'
```

Query after interpolation:

```sql
SELECT id, name, created_at
FROM events
WHERE "created_at" ILIKE '2026-03%'
ORDER BY id
```

> If `created_at` is stored as `timestamp` rather than `text`, PostgreSQL
> may need an explicit cast in your query template, e.g.
> `WHERE to_char(created_at, 'YYYY-MM-DD') ILIKE '2026-03%'`. You can adapt
> the column expression at query authoring time without changing the panel
> output.

#### Example 5 — multi-select equivalent

The panel does not have a dedicated multi-select operator, but
`equals`/`contains` over the same column from the column-filter UI behave
like a single-value match. To allow IN-style filtering, you can combine the
panel filter with a Grafana **Custom multi-value variable** in your query:

```sql
SELECT *
FROM products
WHERE ${gridFilter:raw}
  AND category IN (${categories:csv})
```

Here `gridFilter` carries the panel's per-column filters and `categories` is
a separate dashboard variable Grafana interpolates as a CSV list.

#### Example 6 — OData (Infinity datasource)

URL template:

```
https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}
```

User action: filter **Name contains `laptop`** and **Price >= 500**.

`gridFilter`:

```
contains(tolower(Name), 'laptop') and Price ge 500
```

Final URL Infinity calls:

```
https://api.example.com/odata/Products?$filter=contains(tolower(Name), 'laptop') and Price ge 500&$orderby=
```

Because the OData `$filter` parameter must be omitted (not empty) when no
filter is active, prefer the conditional form documented in
[Handle Empty Variables](#step-4-handle-empty-variables) — for example
`?${gridFilter:queryparam}` — so Grafana drops the parameter entirely when
the variable is empty.

#### Empty-state handling for SQL filters

When no filter is active, the panel writes the SQL-valid no-op `1=1` into
the filter variable. Templates that use `WHERE ${gridFilter:raw}` therefore
work in every state without needing a dashboard-variable default:

```sql
SELECT * FROM products
WHERE ${gridFilter:raw}
```

- No filters active → `WHERE 1=1` (returns everything, paginated).
- Filters active → `WHERE "status" ILIKE 'active' ESCAPE '!'` (etc.).
- All filters rejected (e.g. oversized input, NaN numerics) → still `WHERE 1=1`.

You may set a Grafana variable default of `1=1` as belt-and-suspenders for
the rare case the panel hasn't published yet on first load, but it is no
longer required for correctness — the panel handles the empty state itself.

#### SQLite / MySQL / Oracle note

SQLite, MySQL, MariaDB, and Oracle do not implement `ILIKE`. Set the **SQL
Dialect** option to **ANSI SQL (portable)** — the panel will emit
`LOWER("col") LIKE LOWER('val')` for fuzzy operators and
`LOWER("col") = LOWER('val')` for `equals`.

**Per-database caveats — read first:**

- **SQLite** — works out-of-the-box.
- **MySQL / MariaDB** — also set `ANSI_QUOTES` and `NO_BACKSLASH_ESCAPES`
  in the connection's `sql_mode`. Without `ANSI_QUOTES` the generated
  `"col"` parses as a string literal and the filter silently matches
  nothing. Without `NO_BACKSLASH_ESCAPES` the panel's quote-doubling can
  be bypassed via backslash-quote sequences in user input. A
  case-insensitive collation (e.g. `utf8mb4_general_ci`) is not by itself
  sufficient.
- **Oracle** — only when tables were created with quoted,
  case-matching DDL. Unquoted Oracle DDL folds names to UPPERCASE and
  the panel's quoted lookup errors with `ORA-00904`.

For users who only need exact / numeric matches, the SQL output works
unmodified across all dialects (`=`, `!=`, `>`, `BETWEEN`, etc. — only the
identifier quoting changes).

---

### Sort query replacement

The panel currently supports **single-column sort**. Clicking another column
header replaces the sort, it does not append a secondary key. The
`gridSort` variable is therefore always either empty or `"<field>" ASC|DESC`
(SQL) / `<Field> asc|desc` (OData).

#### Example 1 — single-column SQL sort

Query template:

```sql
SELECT id, name, price
FROM products
WHERE ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

User action: click the **Price** header twice to sort descending.

`gridSort`:

```
"price" DESC
```

Final query:

```sql
SELECT id, name, price
FROM products
WHERE 1=1
ORDER BY "price" DESC
```

#### Example 2 — single-column OData sort

URL template:

```
https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}
```

User action: click **Name** to sort ascending.

`gridSort`:

```
Name asc
```

Final URL:

```
https://api.example.com/odata/Products?$filter=&$orderby=Name asc
```

#### Multi-column sort (workaround)

Because the panel emits a single sort key, dashboards that need a fixed
secondary key should append it in the query template:

```sql
SELECT * FROM products
WHERE ${gridFilter:raw}
ORDER BY
  ${gridSort:raw},
  id ASC
```

When the user has not selected a sort, `gridSort` is empty and the trailing
comma becomes a syntax error. Wrap the dynamic part with the same default
trick used for filters (set the variable's **Default value** to `id ASC` or
similar valid expression):

```sql
ORDER BY ${gridSort:raw}, id ASC
```

#### Empty-state handling for sort

When no sort is active, the panel writes `1` into the sort variable —
SQL-standard `ORDER BY 1` sorts by the first selected column position,
which is a syntactically valid no-op fallback in every dialect this panel
targets. Templates that use `ORDER BY ${gridSort:raw}` therefore work in
every state:

```sql
SELECT * FROM products
WHERE ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

- No sort → `ORDER BY 1` (sort by first column).
- Active sort → `ORDER BY "price" DESC` (etc.).

For OData, the panel still writes empty when no sort is active —
`$orderby=` empty is well-defined OData behavior ("no ordering").

---

### Pagination query replacement

Server-side pagination is **offset-based only**. The panel does not produce
cursor / keyset values. When **Enable Server-Side Pagination** is on, the
panel computes:

```text
skip = currentPage * pageSize   // 0-based page number
top  = pageSize
```

and writes them to the variables named in **Skip/Offset Variable Name** (default
`gridSkip`) and **Top/Limit Variable Name** (default `gridTop`).

#### Example 1 — SQL `LIMIT` / `OFFSET` (PostgreSQL or MySQL)

Query template:

```sql
SELECT id, name, price
FROM products
WHERE ${gridFilter:raw}
ORDER BY ${gridSort:raw}
LIMIT ${gridTop:raw} OFFSET ${gridSkip:raw}
```

User state: page size 25, on page index 3 (the fourth page in the UI),
filtering on `name contains 'laptop'`, sorting `price` descending.

Variable values written by the panel:

```
gridFilter = "name" ILIKE '%laptop%'
gridSort   = "price" DESC
gridSkip   = 75      (3 * 25)
gridTop    = 25
```

Final query:

```sql
SELECT id, name, price
FROM products
WHERE "name" ILIKE '%laptop%'
ORDER BY "price" DESC
LIMIT 25 OFFSET 75
```

#### Example 2 — OData `$skip` / `$top`

URL template (Infinity datasource):

```
https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}&$skip=${gridSkip}&$top=${gridTop}&$count=true
```

User state: page size 50, on page index 0 (first page), no filters, no sort.

Variables written:

```
gridFilter = (empty)
gridSort   = (empty)
gridSkip   = 0
gridTop    = 50
```

Final URL:

```
https://api.example.com/odata/Products?$filter=&$orderby=&$skip=0&$top=50&$count=true
```

When `$count=true` is supported by your OData service, point the panel's
**Count Variable Name** at the response field that holds the total count so
the pagination footer can show the correct page-of-pages indicator. (For
SQL data sources you can set this variable manually from a separate
`SELECT COUNT(*)` query.)

#### Cursor-based pagination

The panel does not currently emit cursor or keyset pagination values. If
your API only supports cursor pagination, choose one of:

- Disable **Enable Server-Side Pagination** in the panel and let the data
  source return one page at a time itself.
- Customize `buildGenericQuery` in `src/utils/odataQueryBuilder.ts` to emit
  the cursor your API expects, and rebuild the plugin.

#### Empty-state handling for pagination

Skip and top variables are always written as numeric strings (e.g. `"0"`,
`"50"`) when server-side pagination is on, so they never need empty-state
defaults. If you toggle server-side pagination **off** at runtime the
variables retain their last value — set sensible **Default values** on the
dashboard variables (e.g. `gridSkip=0`, `gridTop=100`) so any panels still
referencing them do not break.

---

## Testing Your Setup

1. **Enable server-side mode** in panel settings
2. **Type in a column filter** (e.g., filter the "Name" column)
3. **Check the dashboard URL** - you should see `var-gridFilter=...` in the URL
4. **Click a column header** to sort
5. **Check the dashboard URL** - you should see `var-gridSort=...` in the URL
6. **Verify the datasource query** is receiving the correct parameters

## Troubleshooting

### Variables not updating

- Check that variable names match exactly (case-sensitive)
- Ensure variables are created at the dashboard level
- Verify "Server-Side Mode" is enabled

### Query not filtering/sorting

- Check datasource query syntax
- Use `:raw` format specifier in SQL queries
- Verify API endpoint supports the query format
- Check browser network tab to see actual request

### Empty results

- Ensure empty variable handling is in place
- Check if API requires specific parameter format
- Verify column names match exactly between panel and datasource

## Advanced: Custom Query Formats

If you need a custom format, you can modify the query builder in `src/utils/odataQueryBuilder.ts`. The `buildGenericQuery` function can be customized to match your API's requirements.

## Performance Tips

1. **Add indexes** to filtered/sorted columns in your database
2. **Limit result sets** using pagination or row limits
3. **Cache queries** at the API level when possible
4. **Use appropriate data types** for sorting (numeric vs text)

## Examples by Datasource

### Infinity Datasource (OData)

- Format: OData
- URL: `https://services.odata.org/V4/Northwind/Northwind.svc/Products?$filter=${gridFilter}&$orderby=${gridSort}`

### PostgreSQL / TimescaleDB

- Format: SQL
- Dialect: `postgres` (default)
- Query:
  ```sql
  SELECT * FROM products
  WHERE 1=1 $__rawSql(${gridFilter:raw})
  ORDER BY $__rawSql(${gridSort:raw})
  ```

### Microsoft SQL Server

- Format: SQL
- Dialect: `sqlserver`
- Query (relies on default case-insensitive collation):
  ```sql
  SELECT * FROM products
  WHERE 1=1 AND ${gridFilter:raw}
  ORDER BY ${gridSort:raw}
  OFFSET ${gridSkip:raw} ROWS FETCH NEXT ${gridTop:raw} ROWS ONLY
  ```

### SQLite (portable)

- Format: SQL
- Dialect: `ansi`
- Query: same template as PostgreSQL; the panel emits
  `LOWER("col") LIKE LOWER('val')` for fuzzy text operators and
  `LOWER("col") = LOWER('val')` for `equals`.

### MySQL / MariaDB (portable, with caveats)

- Format: SQL
- Dialect: `ansi`
- **Required SQL mode on the connection:** `ANSI_QUOTES,NO_BACKSLASH_ESCAPES`
  (see [SQL Dialects](#sql-dialects)). Without these flags the filter
  either silently matches nothing or is injection-vulnerable.
- Query: same template as PostgreSQL.

### Oracle (portable, with caveats)

- Format: SQL
- Dialect: `ansi`
- **Requires DDL with quoted, case-matching identifiers** (see
  [SQL Dialects](#sql-dialects)). Unquoted DDL produces `ORA-00904`.
- Query: same template as PostgreSQL.

### Infinity Datasource (Custom API)

- Format: JSON
- URL: `https://api.example.com/data?filters=${gridFilter}&sort=${gridSort}`
