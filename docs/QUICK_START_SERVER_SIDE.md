# Quick Start: Server-Side Filtering & Sorting

Get server-side filtering and sorting working in 5 minutes!

## Quick Setup (Infinity Datasource + OData)

This is the **full** filter + sort + paging setup, which is the recommended
default.

### 1. Create Dashboard Variables

The panel names its variables from a single **Grid ID**. This quick start
uses the Grid ID **`grid1`**, so the names are `grid1_filter`, `grid1_sort`,
`grid1_skip`, `grid1_top`. (Leave Grid ID blank in the panel and it defaults
to `grid<panelId>` — e.g. `grid7` — which is unique per panel; the panel's
**Resolved variables** list shows the exact names to copy.)

In your Grafana dashboard settings → Variables, create four **Text box**
variables (set Hide: **Variable** on each):

| Name | Drives |
| --- | --- |
| `grid1_filter` | `$filter` |
| `grid1_sort` | `$orderby` |
| `grid1_skip` | `$skip` (page offset) |
| `grid1_top` | `$top` (page size) |

> **Naming rule:** Grafana variable names allow only letters, digits, and
> underscores and can't start with a digit, so a Grid ID like `my-grid` is
> invalid — use `my_grid`. The `grid` prefix keeps names letter-leading.

### 2. Configure Your Infinity Datasource Query

In your query editor, set:

| Field | Value |
| --- | --- |
| **Type** | `URL` |
| **Parser** | `Backend` (recommended) or `Frontend` |
| **Format** | `Table` |
| **Method** | `GET` |
| **Rows / Root selector** | `value`  ⚠️ **required** — OData nests rows in a `value` array; leave it blank and you get zero rows |
| **URL** | (full template below) |

```
https://your-api.com/odata/YourEntity?$filter=${grid1_filter}&$orderby=${grid1_sort}&$skip=${grid1_skip}&$top=${grid1_top}&$count=true
```

⚠️ Put `$filter` / `$orderby` / `$skip` / `$top` in the **URL field**.
Infinity percent-encodes the URL (`$` → `%24`, spaces → `+`); that's valid
and a spec-compliant OData service decodes it back. If your service ignores
the filter, it isn't decoding the query per RFC 3986 — see the
[troubleshooting table](../README.md#troubleshooting-odata--infinity).

> **Verify first:** before adding the `?$filter=...` part, run the bare
> `https://your-api.com/odata/YourEntity` query and confirm rows appear.
> That isolates the root-selector setup from the filtering wiring. The
> [README walkthrough](../README.md#setting-up-odata-filters-with-the-infinity-datasource)
> covers this step by step.

### 3. Enable Server-Side Mode in Panel

In the Enhanced Grid panel **Server-Side** section:

1. Toggle **Enable Server-Side Mode** ON
2. Set **Grid ID** to `grid1` (or leave blank for the `grid<panelId>` default)
3. Set **Query Format** to `OData ($filter, $orderby)`
4. Enable **Pagination**, then toggle **Enable Server-Side Pagination** ON
5. To show the total in the footer, create a `grid1_count` variable

The **Resolved variables** list confirms the exact names (`grid1_filter`,
`grid1_sort`, `grid1_skip`, `grid1_top`, `grid1_count`) with copy buttons —
these must match the dashboard variables you made in step 1 and the URL in
step 2.

> **Total row count:** with server-side pagination on, the panel reads the
> total from the data frame (a `count`, `total`, `totalCount`, or
> `@odata.count` field in the response metadata) or from the **Count
> Variable**. When a total is available, the footer shows it plus `Page N
> of M`. When it isn't, the footer shows `Showing 1 to 50` and `Page 1`,
> and **Next** stops at the last page once a short page returns. Paging
> works either way.

### 4. Test it

- Type in any column filter box
- Click a column header to sort
- Page through the results
- Watch the data refresh from your API on each change

---

## Quick Setup (PostgreSQL / TimescaleDB / SQL Server / ANSI SQL)

### 1. Create Dashboard Variables

Same as above (create `grid1_filter` and `grid1_sort` variables)

### 2. Configure Your SQL Query

```sql
SELECT * FROM your_table
WHERE 1=1 ${grid1_filter:raw}
ORDER BY ${grid1_sort:raw}
```

**Important:** Use `:raw` to prevent variable escaping!

### 3. Enable Server-Side Mode in Panel

1. **Server-Side** section → Enable
2. Set **Grid ID** → `grid1` (or leave blank for the `grid<panelId>` default)
3. **Query Format** → `SQL (WHERE, ORDER BY)`

The **Resolved variables** list shows the exact names (`grid1_filter`,
`grid1_sort`, …) to match in your query and dashboard variables.

### 4. Pick the SQL Dialect

The **SQL Dialect** dropdown appears once Query Format is set to SQL. Pick the
one that matches your database — it controls how identifiers are quoted and
how case-insensitive text comparisons are written:

| Dialect                       | Identifier quoting | Case-insensitive `contains` example  |
| ----------------------------- | ------------------ | ------------------------------------ |
| **PostgreSQL / TimescaleDB**  | `"name"`           | `"name" ILIKE '%laptop%'`            |
| **SQL Server**                | `[name]`           | `[name] LIKE '%laptop%'` *(uses default CI collation)* |
| **ANSI SQL (portable)**       | `"name"`           | `LOWER("name") LIKE LOWER('%laptop%')` |

Default is **PostgreSQL / TimescaleDB**. Pick **ANSI SQL** for SQLite,
or for MySQL / MariaDB / Oracle subject to the caveats below.

> **Caveats for `ansi` dialect:**
> - **SQLite** — works out-of-the-box.
> - **MySQL / MariaDB** — set both `ANSI_QUOTES` and `NO_BACKSLASH_ESCAPES`
>   in the connection's `sql_mode`. Without `ANSI_QUOTES`, MySQL parses
>   `"col"` as a string literal (the filter silently matches nothing);
>   without `NO_BACKSLASH_ESCAPES`, MySQL's backslash-escape semantics
>   defeat the panel's quote-doubling.
> - **Oracle** — only when tables were created with quoted, case-matching
>   DDL. Unquoted Oracle DDL folds names to UPPERCASE and the panel's
>   quoted lookup errors with `ORA-00904`.

> **Use a read-only SQL connection** scoped to the tables this
> dashboard needs. The data-source credential is the security boundary
> for server-side mode — see Grafana's
> [Data source security best practices](https://grafana.com/blog/data-source-security-in-grafana-best-practices-and-what-to-avoid/)
> for the canonical guidance and
> [Configuring the data source connection](SERVER_SIDE_SETUP.md#configuring-the-data-source-connection)
> for the connection settings this panel expects.

### 5. Test It!

Filter and sort - your database handles it all!

---

## What Happens Behind the Scenes

When you filter "Name" column with "laptop" and sort by "Price" descending:

**OData format generates:**

```
grid1_filter = contains(tolower(Name), 'laptop')
grid1_sort = Price desc
```

**SQL format generates** (depends on the **SQL Dialect** option):

```
postgres:   grid1_filter = "name" ILIKE '%laptop%'
            grid1_sort   = "price" DESC

sqlserver:  grid1_filter = [name] LIKE '%laptop%'
            grid1_sort   = [price] DESC

ansi:       grid1_filter = LOWER("name") LIKE LOWER('%laptop%')
            grid1_sort   = "price" DESC
```

**Your datasource receives** (PostgreSQL example):

```
OData: ?$filter=contains(tolower(Name), 'laptop')&$orderby=Price desc
SQL:   WHERE "name" ILIKE '%laptop%' ORDER BY "price" DESC
```

---

## Common Issues

**Q: Variables not updating?**
A: Check variable names match exactly (case-sensitive)

**Q: Getting empty results?**
A: Empty/no-op variable values are handled for you:

- SQL: the panel writes `1=1` (filter) / `1` (sort) when nothing is active, so
  `WHERE ${grid1_filter:raw}` and `ORDER BY ${grid1_sort:raw}` stay valid.
- OData: the panel writes `true` for an empty filter, so `$filter=${grid1_filter}`
  becomes `$filter=true` (matches all rows). Sort is left empty, which is a
  valid empty `$orderby`. No `:queryparam` trick or variable default needed.
- Still getting no rows from an OData API? Check the **Rows/Root selector** is
  set to `value` (see step 2).

**Q: Want to disable server-side temporarily?**
A: Just toggle "Enable Server-Side Mode" OFF - panel returns to client-side filtering

---

## Advanced: Multiple Grids on One Dashboard

This is where the Grid ID model pays off. **Give each grid panel a distinct
Grid ID** and all five of its variable names are unique automatically — no
more setting five separate names per grid. (If you leave Grid ID blank, the
`grid<panelId>` default is already unique per panel.) Sharing names causes
the panels to race each other on every state change, producing inconsistent
results. The panel detects collisions at mount and renders a yellow warning
banner at the top of the panel until the IDs are made distinct.

Example — two grids on the same dashboard, each with its own Grid ID:

**Grid 1 — Grid ID `inventory`:**

- Variables: `inventory_filter`, `inventory_sort` (plus `_skip`, `_top`,
  `_count` if paginating)

**Grid 2 — Grid ID `customers`:**

- Variables: `customers_filter`, `customers_sort` (plus `_skip`, `_top`,
  `_count` if paginating)

Create separate dashboard variables for each grid using the names from each
panel's **Resolved variables** list, and reference them in each grid's
templated query.

## Deep links — pre-filled filters via URL

Send a link that lands on the dashboard with the grid already filtered:

```
https://grafana.example.com/d/<dashboard-uid>?grid1_filter.status=equals:active
                                            &grid1_filter.price=between:100:500
                                            &grid1_sort=price:desc
```

Syntax (where `grid1_filter` and `grid1_sort` are the panel's resolved filter
and sort variable names — substitute your own grid's names if you use a
different Grid ID):

| URL form | Operators it accepts |
| --- | --- |
| `?grid1_filter.{field}={op}` | `blank`, `not_blank` |
| `?grid1_filter.{field}={op}:{value}` | `contains`, `equals`, `starts_with`, `ends_with`, `eq`, `ne`, `gt`, `lt`, `gte`, `lte` |
| `?grid1_filter.{field}={op}:{value}:{value2}` | `between` |
| `?grid1_sort={field}:{direction}` | `asc`, `desc` |

The panel validates every entry on mount: operator must be in the known
list, field must exist in the data frame's columns. Anything that fails
validation is dropped (logged in the browser console). Surviving entries
flow through the same SQL escape pipeline as filters typed in the UI.

> URL deep links carry **intent**, not raw SQL. A URL like
> `?var-grid1_filter=name='evil'` is silently overwritten by the panel on
> the next state publish — use the structured `?grid1_filter.{field}=...`
> syntax above instead.

---

## Need Help?

See [SERVER_SIDE_SETUP.md](SERVER_SIDE_SETUP.md) for detailed examples and troubleshooting.
