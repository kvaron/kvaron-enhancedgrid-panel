# Enhanced Grid Panel for Grafana

A powerful Grafana panel plugin that provides an advanced grid/table visualization with sophisticated cell highlighting, conditional formatting, server-side operations, and rich data presentation features.

![Panel Overview](docs/screenshots/01-panel-overview.png)

## Features

### Virtualization and Scrolling

Smooth scrolling with sparklines and highlight rules across a 20,000-row dataset.

![20k Row Virtualized Scroll](docs/screenshots/20k-scroll.gif)

### 🎨 Advanced Cell Highlighting & Formatting

- **Conditional Formatting Rules**: Apply colors, backgrounds, and styles based on cell values
- **Nested Condition Groups**: Build complex logical expressions like `(A && B) || C` for precise highlighting
- **Multiple Rule Types**:
  - **Threshold Rules**: Color cells based on numeric thresholds
  - **Value Mapping**: Map specific values to colors and icons
  - **Data Range Gradients**: Apply color gradients across value ranges
  - **Flags Columns**: Display icon flags based on conditions
  - **SparkCharts**: Embed mini-charts within cells

![Highlight Rules](docs/screenshots/04-highlight-rules-config.png)
![Nested Conditions](docs/screenshots/05-condition-builder.png)

### 🔍 Smart Column Filtering

- **Automatic Type Detection**: Text, numeric, date, and boolean column types
- **Operator-Based Filtering**: Different operators for each column type
  - Text: Contains, Equals, Starts With, Ends With
  - Numbers: =, ≠, >, <, ≥, ≤, Between
  - Dates: Range filtering
- **Client-side & Server-side Support**: Filter locally or push to datasource

![Column Filtering](docs/screenshots/02-column-filter-dropdown.png)

### 📊 Flexible Pagination

- **Client-Side Pagination**: Fast navigation for smaller datasets
- **Server-Side Pagination**: Efficient handling of large datasets with OData/SQL support
- **Configurable Page Size**: Customize rows per page

![Pagination Controls](docs/screenshots/03-pagination-controls.png)

### 🚀 Server-Side Operations

- **OData Support**: Native integration with OData APIs via Infinity datasource
- **SQL Support**: PostgreSQL, TimescaleDB, Microsoft SQL Server, and SQLite (plus MySQL/MariaDB/Oracle with caveats — see [SQL Dialects](docs/SERVER_SIDE_SETUP.md#sql-dialects))
- **SQL Dialect Selector**: Choose between PostgreSQL (`ILIKE` + `"quoted"` identifiers), SQL Server (`LIKE` + `[bracketed]` identifiers), or portable ANSI SQL (`LOWER(...) LIKE LOWER(...)`) so generated `WHERE` / `ORDER BY` fragments match your database
- **Server-Side Filtering**: Push filters to datasource queries
- **Server-Side Sorting**: Offload sorting to the database
- **Custom Query Formats**: Flexible query parameter customization

![Server-Side Settings](docs/screenshots/07-server-side-settings.png)

## Installation

1. Download the latest release from the [releases page](https://github.com/kvaron/kvaron-enhancedgrid-panel/releases)
2. Extract to your Grafana plugins directory (usually `/var/lib/grafana/plugins/`)
3. Restart Grafana
4. The panel will appear as "Enhanced Grid" in your visualization options

## Quick Start

### Basic Usage

1. **Add Panel**: Create a new panel in your dashboard
2. **Select Visualization**: Choose "Enhanced Grid" from the visualization picker
3. **Configure Data Source**: Select your data source and query
4. **Customize**: Use the panel options to configure highlighting, filtering, and pagination

### Adding Highlight Rules

1. In panel edit mode, scroll to the **Highlight Rules** section
2. Click **Add Rule**
3. Configure your rule:
   - **Rule Name**: Descriptive name for the rule
   - **Apply To**: Select which columns to apply the rule to
   - **Conditions**: Define when the rule should trigger
   - **Style**: Set colors, background, font weight, etc.

![Threshold Rule](docs/screenshots/08-threshold-rule.png)
![Value Mapping](docs/screenshots/09-value-mapping-rule.png)

### Enabling Server-Side Operations

For large datasets, enable server-side filtering and pagination:

1. Create dashboard variables: `gridFilter` and `gridSort` (Text box type, hidden)
2. Update your datasource query to use these variables
3. In panel settings, enable **Server-Side Mode**
4. Configure query format (OData, SQL, or JSON)
5. If using **SQL**, pick the **SQL Dialect** that matches your database (PostgreSQL/TimescaleDB, SQL Server, or ANSI SQL)
6. Map variable names

See [Server-Side Setup Guide](docs/SERVER_SIDE_SETUP.md) for detailed instructions.

### Setting Up OData Filters with the Infinity Datasource

This is the most common server-side setup, and also the easiest to get
subtly wrong. Follow these steps **in order** — each one is verifiable on
its own, so if something breaks you know exactly which step caused it. Two
gotchas trip up nearly everyone; both are called out below
(⚠️ **root selector** and ⚠️ **URL encoding**).

> **Prerequisite:** Install the
> [Infinity datasource](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/)
> (`yesoreyeram-infinity-datasource`) and add an instance pointing at your
> OData service. Use the latest version — older versions had URL-encoding
> bugs that break OData (see [Troubleshooting](#troubleshooting-odata--infinity)).

#### Step 1 — Confirm your endpoint works in a browser

Open your OData collection URL directly in a browser (or `curl`). For
example, using the public Northwind reference service:

```
https://services.odata.org/V4/Northwind/Northwind.svc/Products?$top=5
```

You should get JSON shaped like this — note that the rows are **nested in a
`value` array**, not at the top level:

```json
{
  "@odata.context": "...",
  "@odata.count": 77,
  "value": [
    { "ProductID": 1, "ProductName": "Chai", "UnitPrice": 18.0 },
    { "ProductID": 2, "ProductName": "Chang", "UnitPrice": 19.0 }
  ]
}
```

If this doesn't return rows, fix your endpoint/auth before touching Grafana.

#### Step 2 — Get rows into the panel with **no** filtering yet

Create the Infinity query and confirm data appears **before** wiring up any
variables. In the query editor:

| Field | Value |
| --- | --- |
| **Type** | `URL` |
| **Parser** | `Backend` (recommended) or `Frontend` |
| **Format** | `Table` |
| **Method** | `GET` |
| **URL** | `https://services.odata.org/V4/Northwind/Northwind.svc/Products` |
| **Rows / Root selector** | `value`  ⚠️ |

⚠️ **Gotcha #1 — the root selector.** OData wraps its rows in a top-level
`value` array. If you leave the **Rows/Root selector** (also labelled
**Root selector** / **Root is** depending on parser) blank, Infinity tries
to read rows from the envelope object and you get **zero rows or garbage
columns**. Set it to `value`. This is the single most common reason "OData
with Infinity shows nothing."

Run the query. You should see a table of products. **Do not continue until
this works** — everything below just adds filtering on top of a working
query.

#### Step 3 — Create the dashboard variables

This walkthrough sets up the **complete** server-side configuration —
filtering, sorting, **and** paging — which is the recommended default.
Dashboard → **Settings** → **Variables** → **New variable**, four times:

| Name | Type | Hide | Drives |
| --- | --- | --- | --- |
| `gridFilter` | Text box | Variable | `$filter` |
| `gridSort` | Text box | Variable | `$orderby` |
| `gridSkip` | Text box | Variable | `$skip` (page offset) |
| `gridTop` | Text box | Variable | `$top` (page size) |

(You can rename these; just keep them consistent with Step 5.)

#### Step 4 — Add the variables to the query URL

Edit the Infinity query URL to the **full filter + sort + paging** template.
This is the default, copy-paste starting point:

```
https://services.odata.org/V4/Northwind/Northwind.svc/Products?$filter=${gridFilter}&$orderby=${gridSort}&$skip=${gridSkip}&$top=${gridTop}&$count=true
```

Each option maps to one panel concern:

| Option | Variable | Purpose |
| --- | --- | --- |
| `$filter` | `${gridFilter}` | Column filters → OData filter expression |
| `$orderby` | `${gridSort}` | Column sort → OData ordering |
| `$skip` | `${gridSkip}` | Page offset (`currentPage * pageSize`) |
| `$top` | `${gridTop}` | Page size |
| `$count=true` | — | Optional. Asks OData to include `@odata.count`; harmless if your service ignores it (see the note on the footer total in Step 5) |

> **What each variable actually contains** — this is the single most
> common point of confusion. The panel writes **only the value**, never the
> `$filter=` / `$orderby=` key. With a "ProductName contains chai" filter,
> `gridFilter` holds:
>
> ```
> contains(tolower(ProductName), 'chai')
> ```
>
> **not** `$filter=contains(...)`. That's why you write the key yourself in
> the URL as `$filter=${gridFilter}`. If you *also* put the key inside the
> variable (or its default value), you get a broken doubled
> `$filter=$filter=...` — so leave the variables empty and let the panel
> populate them.

⚠️ **Gotcha #2 — URL encoding.** Infinity percent-encodes the request URL
before sending it: `$` becomes `%24`, spaces become `+`, and parentheses
and quotes are escaped too. That's valid URL encoding, and a spec-compliant
OData service decodes it back — this setup is verified end-to-end against a
mock service, and the public Northwind sample works the same way, so you do
**not** need to keep `$` literal. Put the OData options in the **URL field**
(not Infinity's "URL query parameters" section) so the whole template is
encoded consistently. If your specific service returns *unfiltered* results
or a 400 for `%24filter`, it isn't decoding the query per RFC 3986 — see
[Troubleshooting](#troubleshooting-odata--infinity).

> **Empty state.** Once the panel has published its state, it writes the
> OData boolean literal `true` (not an empty string) when no filter is
> active, so `$filter=${gridFilter}` becomes `$filter=true` — a valid
> expression that returns all rows. `$orderby=` is left empty when no sort
> is active (valid OData: "no ordering"). `$skip` / `$top` are written as
> numbers once server-side pagination is on.
>
> The panel only publishes ~300 ms **after** it mounts, so the *very first*
> query on dashboard load uses each variable's **saved default**. To keep
> that first request valid, set the `gridFilter` variable's **default/current
> value to `true`** (and `gridSkip` → `0`, `gridTop` → your page size).
> Leave `gridSort` empty. If your OData service also rejects an empty
> `$orderby=`, drop `&$orderby=${gridSort}` from the URL until a sort is
> applied, or give `gridSort` a default like a key column name.

#### Step 5 — Turn on Server-Side Mode in the panel

Edit the Enhanced Grid panel → **Server-Side** section:

| Option | Value |
| --- | --- |
| **Enable Server-Side Mode** | On |
| **Query Format** | `OData ($filter, $orderby)` |
| **Filter Variable Name** | `gridFilter` |
| **Sort Variable Name** | `gridSort` |
| **Enable Server-Side Pagination** | On *(turn on **Pagination** first)* |
| **Skip/Offset Variable Name** | `gridSkip` |
| **Top/Limit Variable Name** | `gridTop` |
| **Include Count in OData Query** | On *(keeps `$count=true` in the URL)* |
| **Count Variable Name** | `gridCount` *(optional — drives the total in the footer)* |

> **Show the total row count in the footer.** With server-side pagination
> on, the panel can't count rows it never received, so it reads the total
> from one of two places:
>
> - **The data frame.** If your data source returns the total in frame
>   metadata under `count`, `total`, `totalCount`, or `@odata.count`, the
>   panel uses it automatically — no extra config.
> - **The Count Variable.** Otherwise, set **Count Variable Name** (for
>   example `gridCount`) to a dashboard variable that holds the total. SQL
>   users fill it from a `SELECT COUNT(*)` query; OData users can map the
>   response's `@odata.count` into it.
>
> When a count is available, the footer shows the grand total and `Page N
> of M`. When it isn't, the footer shows `Showing 1 to 50` and `Page 1`,
> and the **Next** button stops at the last page once a short page returns.
> Either way paging works — the count only adds the total.

#### Step 6 — Test and check the real request

1. Type in a column filter (for example, **ProductName** contains `chai`).
2. Click a column header to sort, then page through the results.
3. Open the panel's **Query inspector** (panel menu, then **Inspect**,
   then **Query**) and look at the request Infinity sent. With filtering,
   sorting, and paging all active, you'll see the full set of options:

   ```
   .../Products?$filter=contains(tolower(ProductName), 'chai')&$orderby=ProductName asc&$skip=0&$top=50&$count=true
   ```

4. Confirm the table updates and the footer advances through pages. If it
   doesn't, go to [Troubleshooting](#troubleshooting-odata--infinity).

#### Troubleshooting (OData + Infinity)

| Symptom | Cause and fix |
| --- | --- |
| **No rows at all** | The root selector isn't set. Set **Rows/Root selector** to `value` (Step 2). |
| **HTTP 400, "invalid query", or filters ignored** | Your OData service isn't decoding the percent-encoded query. Infinity sends `%24filter=...` (and `+` for spaces), which RFC 3986 says to decode back to `$filter=...`; compliant services do, but some older ones don't. Open the Query inspector (Step 6) to see the exact URL. Fixes: in the data source settings try the **URL encoding** option for spaces (`%20` instead of `+`); update Infinity to the latest version; or front the service with a proxy that decodes the query. |
| **A text filter does nothing** | The field name must be a valid OData identifier (letters, digits, and `_`, and it can't start with a digit). The panel drops filters on columns whose name has spaces or punctuation. Alias the column in your OData service or `$select`. |
| **A date filter does nothing** | On a date column, the panel emits a date literal, so the fuzzy operators (**Contains**, **Starts With**, **Ends With**) have no valid form and are dropped. Pick **Equals** and enter a full date like `2024-01-15`. (Date ranges and comparisons work through [deep links](docs/SERVER_SIDE_SETUP.md#deep-links).) |
| **A boolean filter does nothing** | Enter `true` or `false` (the panel also accepts `yes`/`no`, `1`/`0`). Any other value is dropped. |
| **The footer shows no total** | The panel has no count to show. Return the total in frame metadata or point **Count Variable Name** at a variable that holds it (see Step 5). |
| **Case sensitivity** | `contains` and `equals` wrap the field in `tolower(...)`, so the column must be a string type in your OData model. |

#### Runnable example

For a working stack you can bring up locally — Grafana, the Infinity data
source, a small OData mock server, and a provisioned dashboard — see
[`e2e-odata/`](e2e-odata/README.md):

```bash
npm run build
docker compose -f docker-compose.odata.yaml up -d --build
# open http://localhost:3001/d/odata-grid-e2e
```

For the complete reference (every operator → fragment mapping, pagination,
deep links, multi-panel setups), see the
[Server-Side Setup Guide](docs/SERVER_SIDE_SETUP.md) and the
[5-minute Quick Start](docs/QUICK_START_SERVER_SIDE.md).

## Documentation

- **[User Guides](docs/)**: Feature documentation and how-to guides
  - [Server-Side Setup](docs/SERVER_SIDE_SETUP.md)
  - [Quick Start for Server-Side](docs/QUICK_START_SERVER_SIDE.md)

## Examples

### Colored Cells with Thresholds

![Colored Cells Example](docs/screenshots/10-data-range-gradient.png)

### SparkCharts in Cells

![SparkChart Configuration](docs/screenshots/11-sparkchart-config.png)

### Flags Column

![Flags Column](docs/screenshots/12-flags-column.png)

## Support

For issues, feature requests, or questions:

- GitHub Issues: [Report an issue](https://github.com/kvaron/kvaron-enhancedgrid-panel/issues)
- Documentation: Check the [docs](docs/) folder

## Tech Stack

### Runtime Dependencies

| Package                                                                       | Version | Purpose                                                     |
| ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| [@tanstack/react-virtual](https://tanstack.com/virtual/latest)                | 3.x     | Virtual scrolling for efficient rendering of large datasets |
| [@emotion/css](https://emotion.sh/)                                           | 11.x    | CSS-in-JS styling                                           |
| [@grafana/ui](https://grafana.com/developers/plugin-tools/)                   | 12.x    | Grafana UI component library                                |
| [@grafana/data](https://grafana.com/developers/plugin-tools/)                 | 12.x    | Grafana data utilities and types                            |
| [@grafana/runtime](https://grafana.com/developers/plugin-tools/)              | 12.x    | Grafana runtime APIs                                        |

### Development Tools

| Tool       | Version | Purpose                |
| ---------- | ------- | ---------------------- |
| TypeScript | 5.9     | Type-safe JavaScript   |
| Webpack    | 5.x     | Module bundler         |
| Jest       | 30.x    | Unit testing framework |
| Playwright | 1.x     | End-to-end testing     |

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read the development documentation in [.config/README.md](.config/README.md) before submitting pull requests.
