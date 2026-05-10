# Quick Start: Server-Side Filtering & Sorting

Get server-side filtering and sorting working in 5 minutes!

## Quick Setup (Infinity Datasource + OData)

### 1. Create Dashboard Variables

In your Grafana dashboard settings → Variables, create:

- **Variable 1:**
  - Name: `gridFilter`
  - Type: Text box
  - Hide: Variable ✓

- **Variable 2:**
  - Name: `gridSort`
  - Type: Text box
  - Hide: Variable ✓

### 2. Configure Your Infinity Datasource Query

In your query editor, set the URL to:

```
https://your-api.com/odata/YourEntity?$filter=${gridFilter}&$orderby=${gridSort}
```

### 3. Enable Server-Side Mode in Panel

In the Enhanced Grid panel settings:

1. Go to **Server-Side** section
2. Toggle **Enable Server-Side Mode** ON
3. Set **Query Format** to `OData ($filter, $orderby)`
4. Set **Filter Variable Name** to `gridFilter`
5. Set **Sort Variable Name** to `gridSort`

### 4. Test It!

- Type in any column filter box
- Click a column header to sort
- Watch the data refresh from your API!

---

## Quick Setup (PostgreSQL / TimescaleDB / SQL Server / ANSI SQL)

### 1. Create Dashboard Variables

Same as above (create `gridFilter` and `gridSort` variables)

### 2. Configure Your SQL Query

```sql
SELECT * FROM your_table
WHERE 1=1 ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

**Important:** Use `:raw` to prevent variable escaping!

### 3. Enable Server-Side Mode in Panel

1. **Server-Side** section → Enable
2. **Query Format** → `SQL (WHERE, ORDER BY)`
3. **Filter Variable Name** → `gridFilter`
4. **Sort Variable Name** → `gridSort`

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
gridFilter = contains(tolower(Name), 'laptop')
gridSort = Price desc
```

**SQL format generates** (depends on the **SQL Dialect** option):

```
postgres:   gridFilter = "name" ILIKE '%laptop%'
            gridSort   = "price" DESC

sqlserver:  gridFilter = [name] LIKE '%laptop%'
            gridSort   = [price] DESC

ansi:       gridFilter = LOWER("name") LIKE LOWER('%laptop%')
            gridSort   = "price" DESC
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
A: Make sure to handle empty variables:

- SQL: Use `WHERE 1=1 ${gridFilter:raw}` (the `1=1` ensures valid SQL when empty)
- OData: Variables will be empty strings when no filter/sort applied

**Q: Want to disable server-side temporarily?**
A: Just toggle "Enable Server-Side Mode" OFF - panel returns to client-side filtering

---

## Advanced: Multiple Grids on One Dashboard

> **Each grid panel on a dashboard MUST use unique values for Filter
> Variable Name and Sort Variable Name.** Sharing names causes the panels
> to race each other on every state change, producing inconsistent
> results. The panel detects collisions at mount and renders a yellow
> warning banner at the top of the panel until the names are made
> distinct in panel options.

Example — two grids on the same dashboard:

**Grid 1 (Inventory):**

- Filter Variable: `inventoryFilter`
- Sort Variable: `inventorySort`

**Grid 2 (Customers):**

- Filter Variable: `customerFilter`
- Sort Variable: `customerSort`

Create separate dashboard variables for each grid, and reference them in
each grid's templated query.

## Deep links — pre-filled filters via URL

Send a link that lands on the dashboard with the grid already filtered:

```
https://grafana.example.com/d/<dashboard-uid>?gridFilter.status=equals:active
                                            &gridFilter.price=between:100:500
                                            &gridSort=price:desc
```

Syntax (where `gridFilter` and `gridSort` come from the panel's
configured Filter / Sort Variable Names):

| URL form | Operators it accepts |
| --- | --- |
| `?gridFilter.{field}={op}` | `blank`, `not_blank` |
| `?gridFilter.{field}={op}:{value}` | `contains`, `equals`, `starts_with`, `ends_with`, `eq`, `ne`, `gt`, `lt`, `gte`, `lte` |
| `?gridFilter.{field}={op}:{value}:{value2}` | `between` |
| `?gridSort={field}:{direction}` | `asc`, `desc` |

The panel validates every entry on mount: operator must be in the known
list, field must exist in the data frame's columns. Anything that fails
validation is dropped (logged in the browser console). Surviving entries
flow through the same SQL escape pipeline as filters typed in the UI.

> URL deep links carry **intent**, not raw SQL. A URL like
> `?var-gridFilter=name='evil'` is silently overwritten by the panel on
> the next state publish — use the structured `?gridFilter.{field}=...`
> syntax above instead.

---

## Need Help?

See [SERVER_SIDE_SETUP.md](SERVER_SIDE_SETUP.md) for detailed examples and troubleshooting.
