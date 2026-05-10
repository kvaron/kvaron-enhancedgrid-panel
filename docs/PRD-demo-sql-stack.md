# PRD — Demo SQL Stack for `kvaron-enhancedgrid-panel`

**Status:** Draft — implementation pending
**Owner:** Plugin maintainers
**Target release:** Next demo iteration (post 1.0.0)
**Companion docs:** [`SERVER_SIDE_SETUP.md`](./SERVER_SIDE_SETUP.md) · [`QUICK_START_SERVER_SIDE.md`](./QUICK_START_SERVER_SIDE.md) · [`FEATURES.md`](./FEATURES.md)
**Companion compose files:** [`docker-compose.yaml`](../docker-compose.yaml) (existing TestData demo) · `docker-compose.demo-sql.yaml` (this PRD, **not yet created**)

---

## 1. Summary

The current `docker-compose.yaml` brings up a single Grafana container backed by the bundled **TestData DB** datasource. That stack exercises the plugin's **client-side** features (filtering, sorting, highlighting, sparkcharts, virtual scrolling), but it cannot prove the **server-side mode** documented in `SERVER_SIDE_SETUP.md` because there is no real SQL backend to forward `WHERE` / `ORDER BY` / `LIMIT` / `OFFSET` fragments to.

This PRD specifies a **second, opt-in compose stack** — `docker-compose.demo-sql.yaml` — that adds two real SQL databases (TimescaleDB and Microsoft SQL Server), provisions read-only credentials, seeds realistic data, and ships a new demo dashboard whose Enhanced Grid panels run with `serverSideMode: true` against each backend using the documented `gridFilter` / `gridSort` / `gridSkip` / `gridTop` variable pattern. It exercises **two of the three** `SqlDialect` values shipped by the panel (`postgres`, `sqlserver`); the `ansi` dialect is called out in Open Questions.

The stack is **additive** — it does not replace the current TestData stack, it does not change the default home dashboard, and it does not modify any plugin source code. It is a documentation-grade artifact for users evaluating server-side mode end-to-end.

## 2. Goals

1. Demonstrate **server-side filtering, sorting, and pagination** against real SQL databases, end-to-end, on a contributor's laptop with one `docker compose up` command.
2. Exercise **`SqlDialect: postgres`** (TimescaleDB) and **`SqlDialect: sqlserver`** (Microsoft SQL Server) on the same dashboard so reviewers can compare emitted SQL fragments side-by-side.
3. Model the **"credential is the security boundary"** guidance documented in `SERVER_SIDE_SETUP.md` → "Configuring the data source connection" — Grafana connects as a non-root `grafana_reader` role with `SELECT`-only privileges scoped to the demo tables.
4. Demonstrate the **deep-link URL syntax** (`?gridFilter.<field>=<op>:<value>`) in a way users can copy from the dashboard description and paste into a browser.
5. Honor the new **uniqueness rule for Filter / Sort Variable Names** — each grid panel on the SQL demo dashboard uses its own variable names so the yellow collision banner never fires in the shipped artifact.
6. Use a **realistic, non-toy schema** with enough rows that server-side pagination is observably faster than client-side (i.e. the user can feel the difference).
7. Pick **a reproducible data-generation strategy** that lives inside the compose lifecycle — no external scripts the user has to run by hand.

## 3. Non-goals

The following are intentionally out of scope for this PRD. They may become follow-up efforts.

- **Oracle.** Broader RDBMS coverage is a separate workstream and Oracle's licensing makes a usable demo container painful.
- **MySQL / MariaDB.** Both require connection-level `sql_mode` flags (`ANSI_QUOTES,NO_BACKSLASH_ESCAPES`) for the `ansi` dialect to be both correct and safe; this needs its own documentation pass before being shipped as a quick-start.
- **SQLite-on-disk shipped in this compose stack.** SQLite is a one-file file-based engine; it does not need a container. Discussed in §10 "Risks & open questions" — possibly a follow-up.
- **TLS / Kerberos / AD authentication.** Both databases are reached via plain-text local Docker network connections. Production users must configure their own transport security.
- **Multi-tenant role hierarchies, row-level security, or column masking.** The PRD defines one read-only role per database; finer-grained access control is out of scope.
- **Dashboard versioning across plugin releases.** The shipped dashboard JSON is pinned to the current `schemaVersion` and plugin option shape; future plugin releases will need to revise this PRD's dashboard payload (handled as part of the normal release process).
- **Cursor / keyset pagination.** The plugin emits offset-based pagination only (`SERVER_SIDE_SETUP.md` → "Cursor-based pagination"). This demo does not exercise cursors.
- **Multi-column sort.** The plugin emits a single sort key by design; this demo does not demonstrate workarounds.
- **OData backend.** The existing demo dashboard already covers OData/Infinity examples in `SERVER_SIDE_SETUP.md`; the new stack is SQL-only.
- **Plugin source-code changes.** This PRD describes provisioning and orchestration only. If the implementation surfaces a plugin bug, fixing it is a separate change.

## 4. Background

### 4.1 Current state

```text
docker-compose.yaml
└── extends .config/docker-compose-base.yaml
    └── grafana service
        ├── image: grafana/grafana-enterprise:13.0.1  (build args)
        ├── port: 3000
        ├── mounts:
        │   ├── ../dist            → /var/lib/grafana/plugins/kvaron-enhancedgrid-panel
        │   ├── ../provisioning    → /etc/grafana/provisioning
        │   └── ..                 → /root/kvaron-enhancedgrid-panel
        └── env:
            ├── GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=kvaron-enhancedgrid-panel
            ├── GF_AUTH_ANONYMOUS_ENABLED=true (admin role)
            └── GF_AUTH_BASIC_ENABLED=false
```

`provisioning/datasources/datasources.yml` registers one datasource:
- `TestData DB` (type `testdata`, uid `trlxrdZVk`) — Grafana's bundled fake-data source.

`provisioning/dashboards/dashboard.json` ships two Enhanced Grid panels (`Sample Panel Title` and `20k Row Virtualization Stress Test`), both with `serverSideMode: false` and `queryFormat: "odata"` (unused because server-side mode is off). Both reference TestData via the `raw_frame` scenario. The dashboard's `templating.list` is **empty** — no `gridFilter` / `gridSort` / `gridSkip` / `gridTop` variables are defined today, which is consistent with both panels running in client-side mode.

`provisioning/dashboards/default.yaml` uses `type: file` with `path: /etc/grafana/provisioning/dashboards`, so any `*.json` dropped beside `dashboard.json` is auto-loaded.

### 4.2 What's missing

To prove the documented server-side flow, the demo needs:

1. A real SQL database — `testdata` does not interpolate `${gridFilter:raw}` into a `WHERE` clause.
2. A grid panel with `serverSideMode: true`, `queryFormat: "sql"`, and an explicit `sqlDialect` that matches the backend.
3. Dashboard variables (`gridFilter`, `gridSort`, `gridSkip`, `gridTop`) defined in `templating.list` with `:raw` interpolation in the SQL query.
4. A second backend so the `sqlserver` dialect path is also exercised — without it the only difference from the existing demo is the data source, and reviewers can't see the dialect dropdown actually doing work.

### 4.3 Plugin behavior to remember

The fragment generator in `src/utils/odataQueryBuilder.ts` writes dialect-aware SQL into the filter / sort variables. From `SERVER_SIDE_SETUP.md` → "SQL Dialects", the same user input (`name contains 'laptop'`, `price between 100 and 500`, sort `price` descending) emits:

```text
postgres:   WHERE "name" ILIKE '%laptop%' ESCAPE '!' AND "price" BETWEEN 100 AND 500
            ORDER BY "price" DESC

sqlserver:  WHERE [name] LIKE '%laptop%' ESCAPE '!' AND [price] BETWEEN 100 AND 500
            ORDER BY [price] DESC

ansi:       WHERE LOWER("name") LIKE LOWER('%laptop%') ESCAPE '!'
              AND "price" BETWEEN 100 AND 500
            ORDER BY "price" DESC
```

Two consequences for this PRD:

- **Identifier quoting must match the dialect.** The TimescaleDB schema can use lowercase, unquoted column names (PostgreSQL folds unquoted names to lowercase and `"name"` matches). The SQL Server schema can use the same names — `[name]` works regardless of case under the default CI collation.
- **The `ESCAPE '!'` clause is dialect-agnostic** — both PostgreSQL and SQL Server accept it (SQL-92 standard).

The `:raw` format specifier is required in every SQL template; without it Grafana wraps the variable in single quotes and the SQL becomes invalid.

## 5. Scope

### 5.1 What this PRD specifies

The implementation tasked from this PRD will:

1. Create a **new** compose file `docker-compose.demo-sql.yaml` at the repo root that brings up three services: `grafana`, `timescaledb`, `sqlserver`. It does **not** replace `docker-compose.yaml` and does **not** edit `.config/docker-compose-base.yaml`.
2. Add **two new provisioning files** for the SQL demo, scoped so they only load when the new compose stack is up (see §8.1 for the path-layout strategy).
3. Add **one new dashboard JSON** `provisioning/dashboards/sql-demo-dashboard.json` that contains two Enhanced Grid panels — one per backend — wired to the new datasources and variables.
4. Add **init / seed scripts** under `provisioning/db/` (PostgreSQL) and `provisioning/db/mssql/` (SQL Server) that build schemas, create roles, and load demo rows.
5. Add a small **opt-in `.env.demo-sql`** template (committed as `.env.demo-sql.example`) with the SQL Server SA password and any other knobs — the user copies it to `.env.demo-sql` and passes it via `docker compose --env-file`.

### 5.2 What this PRD does NOT specify

- No changes to `docker-compose.yaml`, `.config/docker-compose-base.yaml`, `.config/Dockerfile`, or `.config/entrypoint.sh`. The new stack reuses the same Grafana image (`grafana-enterprise:13.0.1`) so the plugin's build path is unchanged.
- No changes to the existing `provisioning/dashboards/dashboard.json` or `provisioning/dashboards/dashboardempty.json`. The new dashboard is a sibling file.
- No changes to `src/`. The plugin is consumed as-is from `dist/`.
- No CI hookup. CI continues to run against the existing TestData stack. (See §10 — possible follow-up.)
- No plugin signing changes. The new stack relies on `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=kvaron-enhancedgrid-panel`, identical to the existing stack.

## 6. Schema & data

### 6.1 Domain choice

**Domain: e-commerce orders + line items, with a time-series facet via order placement timestamps.**

Rationale (two sentences as required): E-commerce naturally produces (a) a fact-heavy `orders` table that is filtered by status / customer / region (covering `contains`, `equals`, `between`), and (b) a high-cardinality `order_events` time-series table that benefits from TimescaleDB's hypertable optimisation, so a single schema exercises both relational-style and time-series queries. The domain is universally legible — every reviewer understands "orders," "status," "amount," "region" — so the demo's filter UI tells a coherent story without domain-specific framing.

The same schema is replicated across both backends with cosmetic adjustments (PostgreSQL `TIMESTAMPTZ` vs. SQL Server `DATETIME2`; PostgreSQL `NUMERIC(12,2)` vs. SQL Server `DECIMAL(12,2)`); the Enhanced Grid panel does not care which engine generated the rows.

### 6.2 Tables — TimescaleDB (`timescaledb` service)

Database: `demo`. Schema: `public` (default).

| Table | Type | Purpose | Row count target |
| --- | --- | --- | --- |
| `customers` | regular | Joined dimension; ~5 columns (id, name, email, region, vip) | 1,000 |
| `orders` | regular | Main grid target; primary filter/sort surface | **50,000** |
| `order_events` | **hypertable** | Time-series fact table partitioned on `event_time` | **100,000** |

#### 6.2.1 `customers`

```sql
CREATE TABLE customers (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  region       TEXT NOT NULL,        -- one of: 'us', 'eu', 'apac', 'latam', 'mea'
  vip          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_region ON customers(region);
CREATE INDEX idx_customers_name   ON customers(name);
```

#### 6.2.2 `orders`

```sql
CREATE TABLE orders (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  status        TEXT NOT NULL,       -- 'pending', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled'
  amount        NUMERIC(12,2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  placed_at     TIMESTAMPTZ NOT NULL,
  shipped_at    TIMESTAMPTZ,
  region        TEXT NOT NULL,       -- denormalised from customer for filter ergonomics
  channel       TEXT NOT NULL,       -- 'web', 'mobile', 'api', 'in-store'
  notes         TEXT
);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_amount     ON orders(amount);
CREATE INDEX idx_orders_placed_at  ON orders(placed_at);
CREATE INDEX idx_orders_region     ON orders(region);
```

These four indexes are the **minimum set** for the demo's filter/sort surface to feel responsive at 50k rows. The plugin emits `ILIKE` on text columns, which can still use B-tree indexes only for prefix-anchored patterns (`starts_with`), but the lower row count keeps `contains` queries responsive without adding pg_trgm.

#### 6.2.3 `order_events` (hypertable)

```sql
CREATE TABLE order_events (
  event_time   TIMESTAMPTZ NOT NULL,
  order_id     BIGINT NOT NULL,
  event_type   TEXT NOT NULL,        -- 'created', 'payment_received', 'fulfilment_started', 'shipped', 'delivered', 'returned'
  actor        TEXT NOT NULL,        -- 'system', 'csr', 'customer', 'warehouse'
  payload      JSONB
);
SELECT create_hypertable('order_events', 'event_time', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX idx_order_events_order_id  ON order_events(order_id);
CREATE INDEX idx_order_events_type      ON order_events(event_type, event_time DESC);
```

The hypertable showcases TimescaleDB's time-partitioning. The demo grid panel does **not** need to render 100k rows at once — it pages 50 at a time via `LIMIT/OFFSET`, exactly the case server-side pagination is designed for.

### 6.3 Tables — SQL Server (`sqlserver` service)

Database: `demo`. Schema: `dbo` (default).

The PRD intentionally **mirrors the TimescaleDB schema** — same names, equivalent types — so reviewers can compare emitted SQL fragments without keeping two schemas in their head. SQL Server gets the relational tables only (no hypertable analogue); the grid panel that targets SQL Server queries the `orders` table.

```sql
CREATE TABLE customers (
  id           INT IDENTITY(1,1) PRIMARY KEY,
  name         NVARCHAR(200) NOT NULL,
  email        NVARCHAR(200) NOT NULL,
  region       NVARCHAR(20)  NOT NULL,
  vip          BIT NOT NULL DEFAULT 0,
  created_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_customers_region ON customers(region);
CREATE INDEX idx_customers_name   ON customers(name);

CREATE TABLE orders (
  id            BIGINT IDENTITY(1,1) PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),
  status        NVARCHAR(20)  NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  placed_at     DATETIME2(0) NOT NULL,
  shipped_at    DATETIME2(0),
  region        NVARCHAR(20)  NOT NULL,
  channel       NVARCHAR(20)  NOT NULL,
  notes         NVARCHAR(1000)
);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_amount     ON orders(amount);
CREATE INDEX idx_orders_placed_at  ON orders(placed_at);
CREATE INDEX idx_orders_region     ON orders(region);
```

**Collation:** the SQL Server database is created with the default `SQL_Latin1_General_CP1_CI_AS` (case-insensitive, accent-sensitive). This matches the docs note that `sqlserver` dialect relies on default CI collation — if a reviewer's environment overrides this, the demo dashboard's `contains` filters silently become case-sensitive and the docs caveat about switching to `ansi` applies.

### 6.4 Row counts — rationale

| Table | Count | Rationale |
| --- | --- | --- |
| `customers` | 1,000 | Big enough that filter dropdowns can't show all values, small enough that the FK from `orders` has spread |
| `orders` (each backend) | **50,000** | Server-side pagination's user-felt benefit is roughly "more rows than fit in browser memory comfortably." 10k is too small (client-side virtual scroll is fine). 100k makes first-up time noticeable in §8.4. 50k is the sweet spot — pages render in <200ms, total disk footprint stays under 20MB per backend |
| `order_events` | 100,000 | Hypertable showcase only — not rendered in a grid panel in the v1 dashboard. Keeps the time-series story available for follow-up panels |

If a reviewer wants a stress test, the seed script reads the target count from `DEMO_ORDER_ROWS` (env var, defaults to `50000`) so they can re-run with `DEMO_ORDER_ROWS=500000 docker compose up`. The PRD does **not** ship a 500k default — first-up time is the priority for the demo (see §10).

### 6.5 Data generation strategy

**Decision: pure-SQL `generate_series` for PostgreSQL; T-SQL `WHILE` loop / batched `INSERT` for SQL Server.**

Rationale: every additional language in the stack adds a tool the reviewer must trust. The CLAUDE.md preference is TypeScript-over-Python, but a TypeScript seeder requires a Node runtime inside the DB container or a sidecar — neither buys us anything over native SQL. `generate_series` is idiomatic PostgreSQL; T-SQL's `WHILE`-loop pattern is well-known. The seeders are committed as plain `.sql` files and mounted at the standard init paths.

#### 6.5.1 PostgreSQL seeder sketch (illustrative — not implementation)

```sql
-- customers
INSERT INTO customers (name, email, region, vip)
SELECT
  'Customer ' || g,
  'customer' || g || '@example.com',
  (ARRAY['us','eu','apac','latam','mea'])[1 + (g % 5)],
  (g % 17 = 0)
FROM generate_series(1, 1000) g;

-- orders
INSERT INTO orders (customer_id, status, amount, placed_at, shipped_at, region, channel, notes)
SELECT
  1 + (g % 1000),
  (ARRAY['pending','paid','shipped','delivered','refunded','cancelled'])[1 + (g % 6)],
  ROUND((random() * 9990 + 10)::numeric, 2),
  NOW() - (random() * INTERVAL '365 days'),
  CASE WHEN g % 4 = 0 THEN NULL ELSE NOW() - (random() * INTERVAL '300 days') END,
  (ARRAY['us','eu','apac','latam','mea'])[1 + (g % 5)],
  (ARRAY['web','mobile','api','in-store'])[1 + (g % 4)],
  CASE WHEN g % 7 = 0 THEN 'gift order #' || g ELSE NULL END
FROM generate_series(1, COALESCE(NULLIF(current_setting('demo.order_rows', true), ''), '50000')::int) g;

-- order_events (hypertable)
INSERT INTO order_events (event_time, order_id, event_type, actor, payload)
SELECT
  NOW() - (random() * INTERVAL '365 days'),
  1 + (g % 50000),
  (ARRAY['created','payment_received','fulfilment_started','shipped','delivered','returned'])[1 + (g % 6)],
  (ARRAY['system','csr','customer','warehouse'])[1 + (g % 4)],
  jsonb_build_object('seq', g)
FROM generate_series(1, 100000) g;
```

#### 6.5.2 SQL Server seeder sketch (illustrative — not implementation)

```sql
;WITH seq AS (
  SELECT TOP (1000) ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS n
  FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO customers (name, email, region, vip)
SELECT
  CONCAT('Customer ', n),
  CONCAT('customer', n, '@example.com'),
  CHOOSE(1 + (n % 5), 'us','eu','apac','latam','mea'),
  CASE WHEN n % 17 = 0 THEN 1 ELSE 0 END
FROM seq;

-- orders inserted in batches of 10000 in a WHILE loop driven by $(DEMO_ORDER_ROWS),
-- defaulted to 50000 via sqlcmd -v.
```

Both seeders are **idempotent** — they run `IF NOT EXISTS` / `DROP TABLE IF EXISTS` at the top, so a `docker compose up` after a previous successful seed is a no-op (volumes persist by default; see §8.6).

## 7. Credentials & security model

This section models the canonical guidance from `SERVER_SIDE_SETUP.md` → "Configuring the data source connection": *the SQL connection that backs this dashboard is the security boundary for server-side mode.*

### 7.1 Account inventory

| Backend | Superuser (init only) | Application role (Grafana uses this) |
| --- | --- | --- |
| TimescaleDB | `postgres` (default Postgres superuser; password set via `POSTGRES_PASSWORD` env var) | `grafana_reader` — created by init script, `SELECT`-only on `customers`, `orders`, `order_events` |
| SQL Server | `sa` (password set via `MSSQL_SA_PASSWORD` env var, complexity-compliant) | `grafana_reader` — SQL login + database user with `SELECT`-only grants on `customers`, `orders` |

### 7.2 Grants — TimescaleDB

```sql
CREATE ROLE grafana_reader LOGIN PASSWORD :'grafana_reader_password';
GRANT CONNECT ON DATABASE demo TO grafana_reader;
GRANT USAGE  ON SCHEMA public TO grafana_reader;
GRANT SELECT ON customers, orders, order_events TO grafana_reader;
-- explicit denial of write surface:
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM grafana_reader;
-- future-proofing for tables created during demo lifecycle:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_reader;
```

### 7.3 Grants — SQL Server

```sql
CREATE LOGIN grafana_reader WITH PASSWORD = N'$(GRAFANA_READER_PASSWORD)', CHECK_POLICY = OFF;
USE demo;
CREATE USER grafana_reader FOR LOGIN grafana_reader;
GRANT SELECT ON dbo.customers TO grafana_reader;
GRANT SELECT ON dbo.orders    TO grafana_reader;
-- explicit denial:
DENY INSERT, UPDATE, DELETE, ALTER ON SCHEMA::dbo TO grafana_reader;
```

`CHECK_POLICY = OFF` is set because the demo password is shipped in `.env.demo-sql.example` and may not meet the SQL Server password policy. Reviewers running this stack must understand the password is **demo-grade**, not production-grade — `.env.demo-sql.example` includes a top-of-file banner saying so.

### 7.4 Mapping to the docs

The PRD's dashboard description (visible at top of the SQL demo dashboard) cross-references the docs:

> **Security model.** Both data sources connect as `grafana_reader`, a non-root role with `SELECT`-only privileges on the demo tables — exactly what the plugin's [server-side connection guidance](https://github.com/your-org/kvaron-enhancedgrid-panel/blob/main/docs/SERVER_SIDE_SETUP.md#configuring-the-data-source-connection) calls for, and aligned with Grafana's [Data source security best practices](https://grafana.com/blog/data-source-security-in-grafana-best-practices-and-what-to-avoid/).

The implementation must add a `links` entry on the dashboard pointing at the docs anchor so reviewers can read the guidance without leaving Grafana.

### 7.5 Anti-patterns explicitly avoided

| Anti-pattern | Why we avoid it |
| --- | --- |
| Grafana connects as `postgres` / `sa` | Bypasses the plugin's security model entirely — the docs explicitly warn against this |
| Grafana connects as a role with `INSERT/UPDATE/DELETE` | The plugin's value is filter/sort/page, never write. Granting write is unnecessary attack surface |
| Demo dashboard uses a `query` variable that runs arbitrary SQL | Dashboard variables don't need to author SQL — the plugin produces it. `Text box` variable type is sufficient |
| Single shared role across both backends | Each backend gets its own role so a credential leak does not span databases |

## 8. Compose orchestration

### 8.1 File layout

```
kvaron-enhancedgrid-panel/
├── docker-compose.yaml                       # unchanged
├── docker-compose.demo-sql.yaml              # NEW (this PRD)
├── .env.demo-sql.example                     # NEW — committed template
├── provisioning/
│   ├── dashboards/
│   │   ├── default.yaml                      # unchanged (already wildcards *.json)
│   │   ├── dashboard.json                    # unchanged
│   │   ├── dashboardempty.json               # unchanged
│   │   └── sql-demo-dashboard.json           # NEW
│   ├── datasources/
│   │   ├── datasources.yml                   # unchanged (TestData DB stays for the default stack)
│   │   └── sql-demo-datasources.yml          # NEW — provisions both SQL data sources
│   └── db/
│       ├── postgres/
│       │   ├── 00_roles.sql                  # NEW — create grafana_reader
│       │   ├── 10_schema.sql                 # NEW — tables + hypertable + indexes
│       │   └── 20_seed.sql                   # NEW — generate_series seeders
│       └── mssql/
│           ├── 00_init.sql                   # NEW — DB create, login, grants
│           ├── 10_schema.sql                 # NEW — tables + indexes
│           ├── 20_seed.sql                   # NEW — WHILE-loop seeders
│           └── entrypoint-init.sh            # NEW — sqlcmd driver (see §8.4)
```

#### 8.1.1 Why both datasource YAMLs live in the same directory

Grafana's file provisioner loads **every** YAML file under `provisioning/datasources/`. With the new stack up, the `TestData DB` source is still provisioned (harmless — it points at the bundled testdata plugin) **and** the two SQL sources are provisioned. With only the default stack up, the SQL sources are still provisioned but their target hosts (`timescaledb`, `sqlserver`) are unreachable, so the **Test datasource** button reports failure. That's the documented expectation — these data sources are tied to the demo-sql compose stack and are inert without it. The dashboard with no data simply renders panel errors, which is the correct UX signal.

If the implementation finds this confusing for reviewers, the alternative is a `provisioning-sql-demo/` directory tree mounted only by `docker-compose.demo-sql.yaml`. Tracked as **OPEN-Q-1** in §10.

### 8.2 Compose service shape

```yaml
# docker-compose.demo-sql.yaml — sketch, not implementation
services:
  timescaledb:
    image: timescale/timescaledb:2.17.2-pg16     # see §8.7 for version rationale
    container_name: kvaron-egp-timescaledb
    environment:
      POSTGRES_DB: demo
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      GRAFANA_READER_PASSWORD: ${GRAFANA_READER_POSTGRES_PASSWORD}
      DEMO_ORDER_ROWS: ${DEMO_ORDER_ROWS:-50000}
    volumes:
      - ./provisioning/db/postgres:/docker-entrypoint-initdb.d:ro
      - timescaledb-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d demo"]
      interval: 5s
      timeout: 5s
      retries: 30
      start_period: 10s
    ports:
      - "127.0.0.1:5432:5432"   # localhost-only — see §8.5

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest    # see §8.7
    container_name: kvaron-egp-sqlserver
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD}
      MSSQL_PID: Developer
      GRAFANA_READER_PASSWORD: ${GRAFANA_READER_MSSQL_PASSWORD}
      DEMO_ORDER_ROWS: ${DEMO_ORDER_ROWS:-50000}
    volumes:
      - ./provisioning/db/mssql:/docker-entrypoint-initdb.d:ro
      - sqlserver-data:/var/opt/mssql
    healthcheck:
      test:
        - "CMD-SHELL"
        - "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -C -Q 'SELECT 1' || exit 1"
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 30s
    ports:
      - "127.0.0.1:1433:1433"
    entrypoint: ["/docker-entrypoint-initdb.d/entrypoint-init.sh"]

  grafana:
    extends:
      file: .config/docker-compose-base.yaml
      service: grafana
    depends_on:
      timescaledb:
        condition: service_healthy
      sqlserver:
        condition: service_healthy

volumes:
  timescaledb-data:
  sqlserver-data:
```

### 8.3 `depends_on` and health checks

- **Grafana waits for both databases to be healthy** before starting. This means the dashboard does not load before its datasources can answer a query, and the user never sees a transient "datasource not reachable" error during first-up.
- **TimescaleDB health check** uses `pg_isready` (the documented Postgres pattern). 30 retries × 5s interval = 150s grace period; first-time image pull can take longer than seeding.
- **SQL Server health check** uses `sqlcmd … 'SELECT 1'`. `start_period: 30s` because SQL Server's process startup itself is slow (~10–20s on a typical laptop) and there's no point burning retries until the engine is at least listening. The path `/opt/mssql-tools18/bin/sqlcmd` matches the current `mssql/server:2022-latest` image; the `-C` flag trusts the self-signed server cert.

### 8.4 Init scripts — the SQL Server problem

PostgreSQL's official image runs everything in `/docker-entrypoint-initdb.d/` automatically on first boot, in lexical order, against the `POSTGRES_DB`. So `00_roles.sql` → `10_schema.sql` → `20_seed.sql` just works.

**SQL Server has no equivalent convention.** The `mcr.microsoft.com/mssql/server` image starts the engine and stops — it does not look for init scripts. The documented workaround pattern is a custom entrypoint that:

1. Starts the SQL Server engine in the background.
2. Polls `sqlcmd 'SELECT 1'` until it succeeds (mirroring the health check).
3. Runs `sqlcmd -i 00_init.sql -i 10_schema.sql -i 20_seed.sql` against the live engine, passing seed parameters via `-v DEMO_ORDER_ROWS=50000 -v GRAFANA_READER_PASSWORD=...`.
4. Writes a sentinel file (e.g. `/var/opt/mssql/.seeded`) on success.
5. Waits on the SQL Server PID with `wait $!` so the container's lifecycle stays tied to the engine.
6. On subsequent boots, sees the sentinel and **skips** the seed step (otherwise the seeders would attempt to re-create the database every restart).

The PRD's `entrypoint-init.sh` lives at `provisioning/db/mssql/entrypoint-init.sh` and is mounted into the container as the new entrypoint. The implementation must:

- Make the script executable (`chmod +x` in the repo) **and** confirm it survives Windows-host clone-and-bind-mount (line endings — `.gitattributes` entry needed; see §10 **OPEN-Q-2**).
- Run as the `mssql` user the base image expects, not root, by using `gosu` / `runuser` if needed.
- Forward signals so `docker compose stop sqlserver` shuts the engine down cleanly.

This workaround is **well-trodden** in the SQL Server Docker community; the PRD is documenting it rather than inventing it, but it remains the most fragile part of the stack.

### 8.5 Networking

- All three services share the default Compose network (`kvaron-enhancedgrid-panel_default`). Grafana reaches the databases by service name: `timescaledb:5432` and `sqlserver:1433`. The datasource provisioning YAML uses those hostnames.
- Database ports are exposed to the host only on `127.0.0.1` so the user can connect a local `psql` / `sqlcmd` for debugging without making the demo a network-accessible target. If the user wants to expose more broadly, they must edit the compose file — that's an explicit choice.
- The existing `docker-compose.yaml` exposes `3000:3000/tcp` for Grafana; `docker-compose.demo-sql.yaml` inherits that via the `extends`-based `grafana` service. The Grafana UI is therefore reachable at `http://localhost:3000` for both stacks; only one of the two stacks can run at a time on a given port unless the user remaps.

### 8.6 Volume strategy

**Decision: named, persistent volumes for both databases.**

Rationale:

| Option | Trade-off |
| --- | --- |
| Named persistent volumes (chosen) | Survive `docker compose down`. Second up is near-instant because init scripts see existing schema and skip. Reviewer can poke around without losing state. **Cost:** disk grows on every plugin update if reviewer doesn't periodically `docker compose down -v` |
| Anonymous / throwaway | Fresh state every up. Pristine demo, every time. **Cost:** every up rebuilds and re-seeds, which takes 30–90s for 50k rows on a typical laptop. Bad first-impression UX |
| Bind mount to a directory in the repo | Visible state, easy to inspect. **Cost:** breaks on Windows hosts due to UID/GID and permission mismatches, especially with the `mssql` user expecting specific ownership |

The dashboard description includes a "**Reset the demo**" snippet:

```bash
docker compose -f docker-compose.demo-sql.yaml down -v
docker compose -f docker-compose.demo-sql.yaml up -d
```

`down -v` removes the named volumes so the next up reseeds clean.

### 8.7 Image versions

| Image | Pinned tag | Rationale |
| --- | --- | --- |
| `grafana/grafana-enterprise` | `13.0.1` (inherited from `.config/docker-compose-base.yaml`) | The plugin is tested against this version in CI (`.github/workflows/ci.yml`) and CHANGELOG.md confirms the pin. Sticking with the existing image avoids a Dockerfile branch |
| `timescale/timescaledb` | `2.17.2-pg16` | TimescaleDB 2.17.x is the latest stable as of this PRD draft. `pg16` matches the broadly-deployed PostgreSQL major. Pinning the exact patch level (2.17.2) avoids a silent upgrade breaking the seed script if generate_series semantics ever shift (they won't, but the principle of reproducibility) |
| `mcr.microsoft.com/mssql/server` | `2022-latest` | SQL Server 2022 is current; `latest`-style tag here is the conventional pin because Microsoft does not publish stable point-version tags for every patch. The implementation should re-pin to a specific image digest (`@sha256:…`) once it's verified working on Windows / macOS / Linux hosts, so reviewers across platforms see identical behaviour |

**Note on pinning by digest.** A `latest`-style tag means a `docker compose pull` six months from now may surface a different binary. The implementation **should** capture the exact image digests for both DBs in the compose file's `image:` field once the demo is validated working, and the PRD-driven follow-up tracks re-pinning quarterly.

## 9. Dashboard provisioning

### 9.1 `sql-demo-datasources.yml`

Provisions two Grafana data sources, each pointing at `grafana_reader`:

```yaml
apiVersion: 1

datasources:
  - name: TimescaleDB Demo
    type: postgres
    uid: kvaron-egp-timescaledb
    access: proxy
    url: timescaledb:5432
    database: demo
    user: grafana_reader
    isDefault: false
    secureJsonData:
      password: ${GRAFANA_READER_POSTGRES_PASSWORD}
    jsonData:
      sslmode: disable             # plain TCP inside the compose network
      timescaledb: true
      maxOpenConns: 10
      maxIdleConns: 2
      connMaxLifetime: 14400
      postgresVersion: 1600

  - name: SQL Server Demo
    type: mssql
    uid: kvaron-egp-sqlserver
    access: proxy
    url: sqlserver:1433
    database: demo
    user: grafana_reader
    isDefault: false
    secureJsonData:
      password: ${GRAFANA_READER_MSSQL_PASSWORD}
    jsonData:
      encrypt: false               # plain TCP inside the compose network
      tlsSkipVerify: true
      maxOpenConns: 10
```

Both UIDs are stable / deterministic so the dashboard JSON can reference them directly. `isDefault: false` keeps `TestData DB` as the default datasource — important so the existing demo dashboard continues to work unmodified.

Secrets are interpolated from environment variables Grafana reads at provisioning time. The `${GRAFANA_READER_POSTGRES_PASSWORD}` and `${GRAFANA_READER_MSSQL_PASSWORD}` env vars must be exported into the Grafana container — `docker-compose.demo-sql.yaml` adds those to the `grafana` service's environment block.

### 9.2 `sql-demo-dashboard.json`

#### 9.2.1 Top-level metadata

```jsonc
{
  "uid": "kvaron-egp-sql-demo",
  "title": "Enhanced Grid — SQL backends demo (PostgreSQL/TimescaleDB + SQL Server)",
  "tags": ["enhancedgrid", "demo", "server-side", "sql"],
  "schemaVersion": 42,
  "version": 1,
  "editable": true,
  "preload": false,
  "refresh": "",
  "time": { "from": "now-90d", "to": "now" },
  "timezone": ""
}
```

Note `schemaVersion: 42` matches the current `dashboard.json` — keep them in lock-step so a Grafana upgrade migrates both files in the same step.

#### 9.2.2 Templating — distinct variable names per panel

This is where the **uniqueness rule** is honored:

```jsonc
"templating": {
  "list": [
    { "name": "tsFilter",  "type": "textbox", "label": "Timescale filter",  "hide": 2, "current": { "value": "" } },
    { "name": "tsSort",    "type": "textbox", "label": "Timescale sort",    "hide": 2, "current": { "value": "" } },
    { "name": "tsSkip",    "type": "textbox", "label": "Timescale skip",    "hide": 2, "current": { "value": "0"  } },
    { "name": "tsTop",     "type": "textbox", "label": "Timescale top",     "hide": 2, "current": { "value": "50" } },

    { "name": "msFilter",  "type": "textbox", "label": "MSSQL filter",      "hide": 2, "current": { "value": "" } },
    { "name": "msSort",    "type": "textbox", "label": "MSSQL sort",        "hide": 2, "current": { "value": "" } },
    { "name": "msSkip",    "type": "textbox", "label": "MSSQL skip",        "hide": 2, "current": { "value": "0"  } },
    { "name": "msTop",     "type": "textbox", "label": "MSSQL top",         "hide": 2, "current": { "value": "50" } }
  ]
}
```

`hide: 2` corresponds to "Hide: Variable" in the UI — the variables don't appear in the dashboard's top bar, but they're still in the URL when the panel publishes state.

Names are `tsFilter` / `tsSort` / `tsSkip` / `tsTop` for the TimescaleDB panel and `msFilter` / `msSort` / `msSkip` / `msTop` for the SQL Server panel. Eight distinct names — no collisions, banner never fires.

#### 9.2.3 Panel A — TimescaleDB grid (PostgreSQL dialect)

```jsonc
{
  "id": 1,
  "type": "kvaron-enhancedgrid-panel",
  "title": "Orders (TimescaleDB · postgres dialect · server-side)",
  "datasource": { "type": "postgres", "uid": "kvaron-egp-timescaledb" },
  "gridPos": { "x": 0, "y": 0, "w": 24, "h": 16 },
  "options": {
    "serverSideMode": true,
    "queryFormat": "sql",
    "sqlDialect": "postgres",
    "filterVariableName": "tsFilter",
    "sortVariableName": "tsSort",
    "serverSidePagination": true,
    "skipVariableName": "tsSkip",
    "topVariableName": "tsTop",
    "countVariableName": "tsCount",
    "includeCount": false,
    "pageSize": 50,
    "paginationEnabled": true,
    "virtualScrollEnabled": false,
    "showHeader": true,
    "filterStyle": "filterRow",
    "highlightRules": [
      /* one value-mapping rule on `status`:
         pending=yellow, paid=blue, shipped=teal, delivered=green,
         refunded=orange, cancelled=red */
    ]
  },
  "targets": [
    {
      "datasource": { "type": "postgres", "uid": "kvaron-egp-timescaledb" },
      "refId": "A",
      "format": "table",
      "rawSql": "SELECT id, customer_id, status, amount, currency, placed_at, shipped_at, region, channel\nFROM orders\nWHERE 1=1 ${tsFilter:raw}\nORDER BY ${tsSort:raw}\nLIMIT ${tsTop:raw} OFFSET ${tsSkip:raw}"
    }
  ]
}
```

Decisions called out:

- **`WHERE 1=1 ${tsFilter:raw}` plus default value `AND 1=1`** — the `tsFilter` variable's default value is set to `AND 1=1` (or empty plus a Grafana `${tsFilter:raw}` macro that's always a complete predicate). The plugin's empty-state behaviour is to write `""` when no filter is active, so the query template uses Pattern A from the docs (variable default = full predicate) to avoid syntax errors on first load.
- **`ORDER BY ${tsSort:raw}` plus default value `id ASC`** — sort default mirrors the docs' guidance for empty-state handling.
- **`paginationEnabled: true` and `serverSidePagination: true`** — server-side pagination requires both. The grid renders 50 rows per page; `tsSkip` / `tsTop` are written on every page change.
- **`virtualScrollEnabled: false`** — virtualization and pagination together is the documented anti-combination for the demo (it would confuse what users are seeing). Pagination is the more interesting story for server-side mode.

#### 9.2.4 Panel B — SQL Server grid (sqlserver dialect)

```jsonc
{
  "id": 2,
  "type": "kvaron-enhancedgrid-panel",
  "title": "Orders (SQL Server · sqlserver dialect · server-side)",
  "datasource": { "type": "mssql", "uid": "kvaron-egp-sqlserver" },
  "gridPos": { "x": 0, "y": 16, "w": 24, "h": 16 },
  "options": {
    "serverSideMode": true,
    "queryFormat": "sql",
    "sqlDialect": "sqlserver",
    "filterVariableName": "msFilter",
    "sortVariableName": "msSort",
    "serverSidePagination": true,
    "skipVariableName": "msSkip",
    "topVariableName": "msTop",
    "countVariableName": "msCount",
    "includeCount": false,
    "pageSize": 50,
    "paginationEnabled": true,
    "virtualScrollEnabled": false,
    "showHeader": true,
    "filterStyle": "filterRow",
    "highlightRules": [/* same status colour map as Panel A */]
  },
  "targets": [
    {
      "datasource": { "type": "mssql", "uid": "kvaron-egp-sqlserver" },
      "refId": "A",
      "format": "table",
      "rawSql": "SELECT id, customer_id, status, amount, currency, placed_at, shipped_at, region, channel\nFROM orders\nWHERE 1=1 ${msFilter:raw}\nORDER BY ${msSort:raw}\nOFFSET ${msSkip:raw} ROWS FETCH NEXT ${msTop:raw} ROWS ONLY"
    }
  ]
}
```

Key difference from Panel A: SQL Server pagination uses `OFFSET … ROWS FETCH NEXT … ROWS ONLY` (the documented pattern in `SERVER_SIDE_SETUP.md` → "Microsoft SQL Server" example), not `LIMIT … OFFSET`. The plugin emits the offset and limit as numeric strings, so they drop into either pattern unchanged.

#### 9.2.5 Dashboard description with deep-link example

The dashboard's top-level `description` field (rendered in the dashboard header) carries the deep-link example so reviewers can copy it directly:

> Two Enhanced Grid panels demonstrating server-side filtering, sorting, and pagination against real SQL backends — TimescaleDB (PostgreSQL dialect) and Microsoft SQL Server.
>
> **Deep link example** — opens the TimescaleDB panel pre-filtered to `status = 'paid'` and `amount BETWEEN 100 AND 500`, sorted by `amount DESC`:
>
> ```
> /d/kvaron-egp-sql-demo?tsFilter.status=equals:paid&tsFilter.amount=between:100:500&tsSort=amount:desc
> ```
>
> **Independent panel filter** — same URL also pre-filters the SQL Server panel by appending its own variable name:
>
> ```
> /d/kvaron-egp-sql-demo?msFilter.region=equals:eu&msSort=placed_at:desc
> ```
>
> See [Deep links](https://github.com/your-org/kvaron-enhancedgrid-panel/blob/main/docs/SERVER_SIDE_SETUP.md#deep-links) for the full syntax, and [Configuring the data source connection](https://github.com/your-org/kvaron-enhancedgrid-panel/blob/main/docs/SERVER_SIDE_SETUP.md#configuring-the-data-source-connection) for the security model.

### 9.3 Default home dashboard

**Decision: do NOT change the default home dashboard.** The existing TestData demo (`provisioned-enhancedgrid-dashboard`) remains the default landing experience. The SQL demo is discoverable via the dashboard list — reviewers searching for `enhancedgrid` see both, and the tag `sql` distinguishes the new one.

Rationale: the SQL demo requires two extra containers (one large) and may not be reachable if reviewers came in with only the default stack. Failing-by-default would be a poor first impression. Discoverable-but-opt-in is the right balance.

## 10. Acceptance criteria

A reviewer can sign off on the implementation when **every** numbered item below is true. The reviewer should run each check in order; any failure blocks acceptance.

1. **Cold-start succeeds.** From a clean clone of the repo with no prior images:
   ```bash
   cp .env.demo-sql.example .env.demo-sql
   docker compose --env-file .env.demo-sql -f docker-compose.demo-sql.yaml up -d
   ```
   completes without error and reports all three services `healthy` within **300 seconds** on a developer laptop (16 GB RAM, SSD).

2. **All three containers report healthy.**
   ```bash
   docker compose -f docker-compose.demo-sql.yaml ps
   ```
   shows `kvaron-egp-timescaledb`, `kvaron-egp-sqlserver`, and `kvaron-enhancedgrid-panel` (Grafana) with `State: running (healthy)`.

3. **Grafana lists the new data sources.** Logged into `http://localhost:3000` as anonymous Admin, **Connections → Data sources** shows three entries: `TestData DB`, `TimescaleDB Demo`, `SQL Server Demo`. Clicking **Test** on each of the two SQL sources returns success.

4. **SQL demo dashboard is provisioned.** **Dashboards → Browse** shows two dashboards. Opening `Enhanced Grid — SQL backends demo` renders without panel errors. The dashboard header shows the description and deep-link example.

5. **Initial render shows seeded data.** Both panels render with rows visible. The pagination footer shows pages of 50 rows. Row counts are roughly:
   - TimescaleDB panel: 50,000 total (default `DEMO_ORDER_ROWS`)
   - SQL Server panel: 50,000 total

6. **No collision banner is visible** on either panel. (Variables `tsFilter`/`tsSort`/`msFilter`/`msSort` are distinct.)

7. **Server-side sort works.** Clicking the `amount` column header on the TimescaleDB panel:
   - Reorders the rendered rows by amount.
   - Updates the URL to include `&var-tsSort=...` (legacy mirror) **or** the structured `&tsSort=amount:desc` form.
   - Grafana's query inspector (Panel → Inspect → Query) shows the executed SQL contains `ORDER BY "amount" DESC`.

8. **Server-side filter works.** Typing `paid` into the `status` column filter on the SQL Server panel:
   - Filters the rendered rows to ~16% of total (1 of 6 statuses).
   - Query inspector shows `WHERE 1=1 AND [status] LIKE '%paid%' ESCAPE '!'` (or `[status] LIKE '%paid%'` if the panel emits without escape on the contains shape — both are acceptable per docs).

9. **Server-side pagination round-trips.** Clicking "next page" on the TimescaleDB panel:
   - Fetches the next 50 rows.
   - URL updates to `&var-tsSkip=50` (or structured equivalent).
   - Query inspector shows `LIMIT 50 OFFSET 50`.
   - Clicking "previous" returns to the original 50 rows.

10. **Deep link pre-fills filters on cold load.** Open in a fresh browser tab (or incognito):
    ```
    http://localhost:3000/d/kvaron-egp-sql-demo?tsFilter.status=equals:paid&tsFilter.amount=between:100:500&tsSort=amount:desc
    ```
    The TimescaleDB panel loads with the status filter, amount range, and sort already applied — visible in the filter row UI and confirmed by query inspector showing the corresponding `WHERE`/`ORDER BY` fragments. Console shows no warnings about dropped operators.

11. **Per-panel deep links don't collide.** Appending `&msFilter.region=equals:eu` to the URL above pre-fills the SQL Server panel without disturbing the TimescaleDB panel's state.

12. **Grafana connects as `grafana_reader`, not the superuser.** From a DB shell:
    ```bash
    docker exec kvaron-egp-timescaledb psql -U postgres -d demo \
      -c "SELECT usename, application_name FROM pg_stat_activity WHERE datname='demo';"
    ```
    shows `grafana_reader` (and no `postgres`) as the active user for Grafana's connections.

13. **Database container failure surfaces as panel error, not crash.**
    ```bash
    docker compose -f docker-compose.demo-sql.yaml stop timescaledb
    ```
    Refreshing the dashboard renders the TimescaleDB panel with Grafana's standard "data source not reachable" error message. The SQL Server panel continues working. The plugin does not white-screen or throw an unhandled exception in the browser console.

14. **Reset cleanly returns to step 1.**
    ```bash
    docker compose -f docker-compose.demo-sql.yaml down -v
    docker compose --env-file .env.demo-sql -f docker-compose.demo-sql.yaml up -d
    ```
    rebuilds and re-seeds. Acceptance criteria 1–13 pass again.

15. **`.env.demo-sql.example` is committed and `.env.demo-sql` is gitignored.** Running `git status` after step 14 shows `.env.demo-sql` as untracked or already ignored — never as a committed change.

16. **`docs/PRD-demo-sql-stack.md` (this file) is committed to the repo** before or with the implementation PR, so the implementation reviewer can read the spec.

## 11. Risks & open questions

Open items intentionally surfaced for the implementation reviewer.

### 11.1 First-up time

SQL Server's base image is ~1.5 GB compressed (~3 GB on disk). On a cold cache, `docker pull` may dominate first-up time (5–10 minutes on a slow connection). The implementation should:

- Make the image pull happen in the background where possible.
- Document expected first-up time in the dashboard description so reviewers don't kill the stack early.
- Consider a tiny `make demo-sql-pull` or compose `pull` step the reviewer can run **before** `up` if they want a clean separation.

### 11.2 SQL Server on Windows hosts

- **Windows hosts (Docker Desktop with WSL2 backend):** SQL Server runs on Linux containers; should work fine, but `entrypoint-init.sh` is shell — line-ending mismatches (`\r\n` from the Windows filesystem leaking through into the container) are a classic foot-gun. The implementation must add a `.gitattributes` entry forcing `*.sh text eol=lf` and verify.

### 11.3 Hypertable isn't rendered in v1

The PRD seeds `order_events` as a hypertable but no v1 panel queries it. The reason: a third panel pushes the demo's complexity (and resource cost) without strengthening the core story (two dialects). The hypertable is **plumbing** for a likely follow-up panel that demonstrates time-window filtering and a sparkchart of event rates. **Tracked as OPEN-Q-3.**

### 11.4 `ansi` dialect is not exercised

The PRD covers `postgres` and `sqlserver` only. The third value (`ansi`) is documented for SQLite, MySQL/MariaDB (with caveats), and Oracle (with caveats). Options for adding it:

- **(a) Add a third Grafana datasource of type `sqlite`** via the Frser-SQLite-Datasource community plugin, plus a third panel with `sqlDialect: ansi`. Lightweight (file-only, no container) but introduces a non-bundled datasource plugin install path.
- **(b) Document `ansi` outside the demo stack** with a Markdown-only walk-through in `docs/`. Cheap and avoids stack bloat but means the third dialect's behaviour isn't visible in a running dashboard.
- **(c) Leave it out entirely.** The docs already explain `ansi`; the demo stack focuses on the two backends where the dialect actually matters in production.

**Tracked as OPEN-Q-4.** Suggested resolution: **(b)** — add a `docs/ANSI_DIALECT.md` walk-through in a separate PR, keep the compose stack at two backends.

### 11.5 Seeding time

50k rows × two backends is ~3–10 seconds of seed work per backend on a typical laptop, modest. 500k (via `DEMO_ORDER_ROWS=500000`) is 30–90 seconds. The PRD's choice of 50k is defensible but the implementation should expose `DEMO_ORDER_ROWS` clearly in `.env.demo-sql.example` so power-users know how to scale up.

### 11.6 Anonymous admin auth

The existing `.config/Dockerfile` enables anonymous Admin (`GF_AUTH_ANONYMOUS_ORG_ROLE=Admin`). The SQL demo inherits this. **For local development this is fine and matches the existing stack's posture** — but the demo's dashboard description should warn reviewers not to expose the stack to a network without first toggling that off, because anonymous Admin plus a real SQL backend is a much larger blast radius than anonymous Admin plus TestData. **Tracked as OPEN-Q-5.**

### 11.7 Datasource provisioning loaded by the default stack

As noted in §8.1.1, `provisioning/datasources/sql-demo-datasources.yml` is read by **both** compose stacks. Under the default stack the SQL datasources are inert — their **Test** button fails because the target hosts don't resolve. This is functionally correct (no data leakage, no crash) but visually noisy. **Tracked as OPEN-Q-1.** Suggested resolutions:

- Move datasource provisioning under a separate path (`provisioning-sql-demo/`) and mount it only via `docker-compose.demo-sql.yaml`.
- Or accept the inert-source noise and document it in the README.

### 11.8 CI

CI does not run this stack today (CI image matrix tests the plugin against the existing TestData stack only). Adding the SQL stack to CI is appealing — it catches dashboard JSON / provisioning regressions — but it lengthens CI runs significantly because of the SQL Server pull and seed. **Tracked as OPEN-Q-6**, recommended deferred to a separate follow-up.

### 11.9 Plugin version drift

The dashboard JSON pins `pluginVersion: "1.0.0"` (matching the existing dashboards). If the plugin version bumps, Grafana will rewrite the field on save, but the **option shape** (e.g. `sqlDialect`) must remain compatible. If the implementation surfaces an incompatibility, it must be flagged and resolved before merging.

### 11.10 Connection pool sizing

The provisioning YAMLs set `maxOpenConns: 10` for both data sources. Single-user demo — fine. If multiple browser tabs are open or a reviewer clicks rapidly through pages, the panel can fire several queries in flight; the pool size should not bottleneck. If it does, raising to 20 is harmless. **Tracked as a non-blocking note.**

## 12. Implementation checklist (handoff)

The implementation PR should produce, in order:

1. `.env.demo-sql.example` — committed template with placeholder passwords and a banner warning these are demo-grade.
2. `provisioning/db/postgres/{00_roles.sql, 10_schema.sql, 20_seed.sql}` — TimescaleDB init scripts.
3. `provisioning/db/mssql/{00_init.sql, 10_schema.sql, 20_seed.sql, entrypoint-init.sh}` — SQL Server init scripts + entrypoint driver.
4. `provisioning/datasources/sql-demo-datasources.yml` — new datasource provisioning, both backends.
5. `provisioning/dashboards/sql-demo-dashboard.json` — new dashboard with two grid panels per §9.
6. `docker-compose.demo-sql.yaml` — new compose stack per §8.
7. `.gitattributes` — entries forcing `*.sh text eol=lf` and `*.sql text eol=lf`.
8. `README.md` — a short "Running the SQL demo" section pointing users at the new compose file and `.env.demo-sql.example`.
9. Optional: `Makefile` target `make demo-sql-up` / `make demo-sql-down` mirroring the existing dev workflow.
10. Resolution decisions for OPEN-Q-1, OPEN-Q-3, OPEN-Q-4, OPEN-Q-5, OPEN-Q-6 captured in the PR description.

## 13. Glossary

- **TestData DB** — Grafana's bundled `grafana-testdata-datasource` plugin. The existing demo dashboard targets this.
- **`grafana_reader`** — the read-only role this PRD provisions in each SQL backend. The data source credential used by Grafana.
- **`sqlDialect`** — Enhanced Grid panel option (`'postgres' | 'sqlserver' | 'ansi'`) controlling identifier quoting and case-insensitive text comparison shape; documented in `SERVER_SIDE_SETUP.md` → "SQL Dialects".
- **Deep link** — A URL containing structured `?{filterVar}.{field}={op}:{value}` parameters that pre-fill grid filter and sort state on dashboard load; documented in `SERVER_SIDE_SETUP.md` → "Deep links".
- **Collision banner** — Yellow warning the panel renders at mount when two grids on the same dashboard share Filter or Sort Variable Names. The shipped SQL demo dashboard must not trigger this.
- **`gridFilter` / `gridSort` / `gridSkip` / `gridTop`** — Default Filter / Sort / Skip / Top Variable Names from the docs. This PRD uses panel-specific names (`tsFilter`, `msFilter`, etc.) to honor the uniqueness rule.
- **Hypertable** — TimescaleDB's time-partitioned table abstraction; used for `order_events`.

---

*End of PRD.*
