## 0.2.5 (2026-06-26)

### Features
- feat(server-side): typed filters, total-row count, pagination fixes, OData/Infinity e2e

### Bug Fixes
- feat(server-side): typed filters, total-row count, pagination fixes, OData/Infinity e2e
- chore(deps): bump @tanstack/react-virtual from 3.14.2 to 3.14.3 (#88)
- chore(deps-dev): bump semver from 7.8.4 to 7.8.5 (#87)
- chore(deps-dev): bump @playwright/test from 1.60.0 to 1.61.0 (#86)
- chore(deps-dev): bump semver from 7.8.2 to 7.8.4 (#82)
- chore(deps-dev): bump sass from 1.100.0 to 1.101.0 (#80)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.8.0 to 3.9.1 (#79)
- chore(deps-dev): bump @swc/core from 1.15.40 to 1.15.41 (#78)
- chore(deps-dev): bump prettier from 3.8.3 to 3.8.4 (#77)
- chore(deps): bump @tanstack/react-virtual from 3.13.26 to 3.14.2 (#73)
- chore(deps-dev): bump semver from 7.8.1 to 7.8.2 (#74)
- chore(deps-dev): bump @types/node from 25.9.1 to 25.9.2 (#72)
- chore(deps-dev): bump webpack from 5.107.1 to 5.107.2 (#71)
- chore(deps): bump the grafana group with 5 updates (#70)
- chore(deps-dev): bump @swc/core from 1.15.33 to 1.15.40 (#66)
- chore(deps): bump @tanstack/react-virtual from 3.13.25 to 3.13.26 (#69)
- chore(deps-dev): bump terser-webpack-plugin from 5.6.0 to 5.6.1 (#68)
- chore(deps-dev): bump webpack-cli from 7.0.2 to 7.0.3 (#67)
- chore(deps-dev): bump @swc/helpers from 0.5.21 to 0.5.23 (#65)
- chore(deps-dev): bump @grafana/tsconfig from 2.1.0 to 2.2.0 (#64)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.6.1 to 3.8.0 (#63)
- chore(deps-dev): bump @types/node from 25.8.0 to 25.9.1 (#62)
- chore(deps-dev): bump sass from 1.99.0 to 1.100.0 (#61)
- chore(deps-dev): bump webpack from 5.106.2 to 5.107.1 (#60)
- chore(deps): bump @tanstack/react-virtual from 3.13.24 to 3.13.25 (#59)
- chore(deps-dev): bump semver from 7.8.0 to 7.8.1 (#57)
- chore(ci): bump grafana/plugin-actions/wait-for-grafana@wait-for-grafana/v1.0.3 (#56)

## 0.2.4 (2026-05-21)

### Bug Fixes
- chore(deps-dev): bump terser-webpack-plugin from 5.5.0 to 5.6.0 (#51)
- Merge pull request #55 from kvaron/dependabot/npm_and_yarn/semver-7.8.0
- chore(deps-dev): bump @grafana/tsconfig from 2.0.1 to 2.1.0 (#54)
- chore(deps-dev): bump semver from 7.7.4 to 7.8.0
- chore(deps-dev): bump sass-loader from 16.0.7 to 16.0.8 (#53)
- chore(deps-dev): bump @types/node from 25.6.0 to 25.8.0 (#52)
- chore(deps-dev): bump @playwright/test from 1.59.1 to 1.60.0 (#50)

## 0.2.3 (2026-05-21)

## 0.2.2 (2026-05-20)

### Bug Fixes
- Merge pull request #47 from kvaron/chore/grafana-13-fast-uri-security
- chore(deps): bump @grafana/* to 13.0.1, pin fast-uri 3.1.2
- chore(deps-dev): bump @swc/core from 1.15.30 to 1.15.33 (#45)
- chore(deps-dev): bump the unit-test group with 2 updates (#44)

## 0.2.1 (2026-05-12)

### Features
- Merge pull request #43 from kvaron/feat/sql-dialect-and-hardening
- feat: SQL dialect selector + server-side filtering hardening + optional SQL demo stack

### Bug Fixes
- Merge pull request #43 from kvaron/feat/sql-dialect-and-hardening
- feat: SQL dialect selector + server-side filtering hardening + optional SQL demo stack
- update readme

## 0.2.0 (2026-05-01)

### Features
- Merge pull request #41 from kvaron/fix/react-19-jsx-runtime-compat

### Bug Fixes
- Remove React jsx-runtime workaround
- Merge pull request #41 from kvaron/fix/react-19-jsx-runtime-compat
- migrate row virtualization to tanstack

## 0.1.9 (2026-04-30)

### Bug Fixes
- Merge pull request #34 from kvaron/dependabot/github_actions/grafana/plugin-actions/e2e-versione2e-version/v1.2.1-2.0.0
- Fix column filter menu interactions
-  Fix column filter dropdown interactions
- chore(deps-dev): bump @swc/core from 1.15.21 to 1.15.30 (#39)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.5.1 to 3.6.1 (#37)
- chore(deps-dev): bump terser-webpack-plugin from 5.4.0 to 5.5.0 (#35)
- chore(ci): bump grafana/plugin-actions/wait-for-grafana@wait-for-grafana/v1.0.2 (#33)
- chore(ci): bump grafana/plugin-actions/e2e-version@e2e-version/v1.2.1
- chore(deps): pin @grafana/* to 12.4.2 and target Grafana 13.0.1 by default
- chore(deps-dev): bump @types/node from 25.5.2 to 25.6.0 (#32)
- chore(deps-dev): bump webpack from 5.105.4 to 5.106.2 (#31)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.12 to 3.5.1 (#30)
- chore(deps-dev): bump prettier from 3.8.1 to 3.8.3 (#28)

## Unreleased

### Features
- feat: add **SQL Dialect** selector for server-side SQL query generation. Supports `postgres` (default — `ILIKE` + `"double-quoted"` identifiers, also covers TimescaleDB), `sqlserver` (`LIKE` + `[bracketed]` identifiers, relies on case-insensitive collation), and `ansi` (portable `LOWER(col) LIKE LOWER('...')` + `"double-quoted"` identifiers). The new `sqlDialect` option appears in the panel editor when **Server-Side Mode** is on and **Query Format** is **SQL**. Existing dashboards keep PostgreSQL behavior — no migration needed.

### Fixes
- fix(sql): the `equals` text operator now emits `=` (case-insensitive: `LOWER(col) = LOWER('val')` for `postgres`/`ansi`, `[col] = 'val'` for `sqlserver`) instead of `ILIKE` / `LIKE`. Previously, user-typed `%` and `_` in an `equals` filter were interpreted as wildcards, widening the match unexpectedly. Use `contains` / `starts_with` / `ends_with` for fuzzy matching.
- fix(sql): runtime guard on `buildSQLSort` direction — only `ASC` / `DESC` may reach the SQL string, even if a future caller threads an untrusted `SortState` in.
- fix(sql): fuzzy text operators (`contains` / `starts_with` / `ends_with`) now escape LIKE pattern metacharacters (`%`, `_`, and `[` for SQL Server) in user values and emit an `ESCAPE '!'` clause. A user typing `50%` into a `contains` filter now matches the literal string `50%` instead of every row containing `50`.
- fix(sql,odata): tighten numeric operator coercion — `Number.isFinite()` now rejects `Infinity` and `-Infinity` (previously only `NaN` was dropped). Non-finite numeric inputs no longer reach the database as bare `Infinity` tokens.
- fix(sql,odata): pagination fields (`currentPage`, `pageSize`) are now coerced via `Number()` with a default-page-size fallback before reaching `LIMIT` / `OFFSET` / `$skip` / `$top`. Defends against runtime type-erasure scenarios where pagination state could carry a string from URL params or JSON deserialization.
- fix(odata): validate field names against the OData identifier rule (`[A-Za-z_][A-Za-z0-9_]*`). Fragments with non-conforming names (whitespace, punctuation, leading digits) are dropped instead of interpolated raw. Adds the same direction-runtime-guard treatment to `buildODataSort` that `buildSQLSort` already has.
- fix(sql,odata): cap filter values at 1024 chars and identifier names at 256 chars at the fragment-builder boundary; oversized inputs drop the filter / sort fragment instead of inflating the generated query. The filter UI applies a matching `maxLength={1024}` to the value inputs so typical users never reach the cap.
- fix(security): cap displayed rows at the panel-render boundary. With server-side pagination enabled, the panel clips returned rows to `pageSize × 4` and logs a console warning if the data source returned more — a signal that pagination/filtering did not push down to the data source as expected. Without server-side pagination, an absolute cap of 100 000 rows protects the panel from pathological data sources. Logic extracted to `src/utils/rowCap.ts`.

### Audits (no code change)
- audit(xss): no `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, or `new Function()` use anywhere in `src/`. All cell content renders as React JSX children, which auto-escape. Filter values typed by viewers cannot execute as HTML in the rendered grid, column headers, tooltips, or filter chips.
- audit(error-leakage): the panel's `ErrorBoundary` surfaces React rendering errors only (collapsed `<details>` block), not data-source SQL errors. Data-source errors are surfaced by Grafana's panel chrome — out of scope for this panel per Grafana's documented model.
- audit(highlight-rule-eval): the highlight-rule evaluator (`src/utils/highlightEngine.ts`, `src/utils/conditionEvaluator.ts`) uses closed-enum operator dispatch and direct value comparison only — no `eval`, no `new Function`, no dynamic regex. Rules are authored only by dashboard editors via panel options; viewer URL parameters never flow into rule construction.

### Deep linking
- feat(deep-link): structured URL syntax for pre-filled filter and sort state, replacing the previous practice of accepting raw SQL through `?var-gridFilter=...`. Examples:
  - `?gridFilter.status=equals:active`
  - `?gridFilter.price=between:100:500`
  - `?gridSort=price:desc`
  Operators are validated against the `FilterOperator` enum, field names against the live data frame's columns. Parsed values flow through the existing `buildSQLFilter` pipeline — same escape, dialect, and length-cap discipline as UI-driven filters. The legacy raw-SQL `?var-gridFilter=...` form is silently overwritten by the panel on first state-publish; a `console.warn` fires once at mount if it was present.
- feat(grid): in-panel `Alert` banner when this panel's Filter Variable Name or Sort Variable Name collides with another grid panel on the same dashboard. Detection uses a module-scoped instance registry and re-renders reactively as sibling panels mount, unmount, or have their options changed.

### Changes
- chore(deps): pin `@grafana/{data,ui,runtime,schema,i18n}` to `12.4.2` for deterministic builds (matches create-plugin@7.1.6+ policy)
- chore(docker): bump default `GRAFANA_VERSION` in `.config/docker-compose-base.yaml` to `13.0.1` so local dev/tests run against Grafana 13
- Verified compatibility with Grafana 13.0.1; `grafanaDependency` remains `>=11.6.0`
- docs: document the SQL dialect selector across `README.md`, `docs/QUICK_START_SERVER_SIDE.md`, `docs/SERVER_SIDE_SETUP.md`, and `docs/FEATURES.md`
- docs: qualify `ansi` dialect support — works on SQLite out-of-the-box; MySQL / MariaDB require `ANSI_QUOTES` + `NO_BACKSLASH_ESCAPES` in `sql_mode`; Oracle requires quoted-and-case-matching DDL
- docs: add **Security model & minimum-privilege datasource credentials** section in `docs/SERVER_SIDE_SETUP.md` covering URL-supplied dashboard-variable values and the read-only-role posture they require

## 0.1.8 (2026-04-09)

### Bug Fixes
- Merge remote-tracking branch 'origin/dependabot/npm_and_yarn/glob-13.0.6'
- Merge remote-tracking branch 'origin/dependabot/github_actions/dependabot/fetch-metadata-3'
- Merge remote-tracking branch 'origin/dependabot/github_actions/magefile/mage-action-4.0.0'
- Merge remote-tracking branch 'origin/dependabot/github_actions/actions/setup-node-6'
- chore(deps-dev): bump @types/node from 25.5.0 to 25.5.2 (#26)
- chore(deps-dev): bump sass from 1.98.0 to 1.99.0 (#25)
- chore(deps-dev): bump glob from 11.1.0 to 13.0.6
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.11 to 3.4.12 (#22)
- chore(deps-dev): bump @swc/helpers from 0.5.19 to 0.5.21 (#21)
- chore(deps-dev): bump @playwright/test from 1.58.2 to 1.59.1 (#20)
- chore(ci): bump dependabot/fetch-metadata from 2 to 3
- chore(deps-dev): bump @swc/core from 1.15.17 to 1.15.21 (#18)
- chore(deps-dev): bump webpack-cli from 7.0.0 to 7.0.2 (#17)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.8 to 3.4.11 (#16)
- chore(deps): bump the grafana group with 5 updates (#15)
- chore(ci): bump magefile/mage-action from 3.1.0 to 4.0.0
- chore(ci): bump actions/setup-node from 4 to 6

## 0.1.7 (2026-03-23)

### Bug Fixes
- Add GitHub Sponsors username to FUNDING.yml
- chore: add sponsorship link to plugin.json per Grafana submission feedback

## 0.1.6 (2026-03-19)

### Bug Fixes
- chore(ci): filter changelog to only meaningful commits (feat, fix, perf, refactor)
- chore: release v0.1.5
- chore: release v
- chore(ci): move changelog generation into version-bump workflow
- chore(ci): restore changelog generator in release workflow
- chore(ci): disable changelog generator to unblock releases
- Merge pull request #11 from kvaron/dependabot/npm_and_yarn/types/node-25.5.0
- chore: bump version to 0.1.3
- chore(ci): bump grafana/plugin-actions/is-compatible@is-compatible/v1.0.2 (#2)
- chore(ci): disable plugin signing in CI until Grafana approval
- chore: bump version to 0.1.2
- chore(ci): use CHANGELOG_PAT to bypass branch protection in version bump
- chore(ci): add manual version bump workflow and enable changelog generator
- chore: set version to 0.1.1
- chore(deps-dev): bump @types/node from 24.10.8 to 25.5.0
- Merge pull request #3 from kvaron/dependabot/github_actions/actions/download-artifact-8
- Merge pull request #4 from kvaron/dependabot/github_actions/actions/upload-artifact-7
- Merge pull request #12 from kvaron/dependabot/npm_and_yarn/webpack-cli-7.0.0
- chore(deps-dev): bump webpack-cli from 6.0.1 to 7.0.0
- chore(deps): upgrade copy-webpack-plugin to v14 to fix serialize-javascript vulnerability
- chore(ci): skip plugin signing until Grafana approval
- chore(deps-dev): bump @playwright/test from 1.58.1 to 1.58.2 (#7)
- chore(ci): sign as private plugin with kvaron.grafana.net root URL
- chore(deps-dev): bump sass from 1.97.3 to 1.98.0 (#8)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.5 to 3.4.8 (#10)
- chore: update logo to Kvaron branding and fix GitHub URLs to kvaron org
- chore(deps-dev): bump the unit-test group with 2 updates (#5)
- chore(ci): bump grafana/plugin-actions/bundle-size@bundle-size/v1.0.2 (#1)
- chore(ci): bump actions/upload-artifact from 6 to 7
- chore(ci): bump actions/download-artifact from 7 to 8
- chore(deps): fix non-breaking dependency vulnerabilities via npm audit fix
- chore: rebrand from ost to kvaron and enable release signing
- chore(deps-dev): bump webpack from 5.105.3 to 5.105.4 (#53)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.1 to 3.4.5 (#52)
- chore(ci): bump grafana/plugin-actions/create-plugin-update@create-plugin-update/v2.0.1 (#50)
- chore(deps-dev): bump @swc/helpers from 0.5.18 to 0.5.19 (#48)
- chore(deps-dev): bump webpack from 5.105.0 to 5.105.3 (#49)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.0 to 3.4.1 (#47)
- chore(deps): bump react-window from 2.2.6 to 2.2.7 (#45)
- chore(deps-dev): bump @swc/core from 1.15.11 to 1.15.17 (#44)
- chore(deps): bump the grafana group with 5 updates (#43)
- chore(deps-dev): bump css-loader from 7.1.2 to 7.1.4 (#39)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.1 to 3.4.0 (#36)
- chore(deps): bump the grafana group with 5 updates (#35)
- chore(ci): bump grafana/plugin-actions/build-plugin@build-plugin/v1.0.2 (#34)
- chore(deps-dev): bump semver from 7.7.3 to 7.7.4 (#32)
- chore(deps-dev): bump webpack from 5.104.1 to 5.105.0 (#31)
- chore(deps-dev): bump @swc/core from 1.15.8 to 1.15.11 (#29)
- chore(deps-dev): bump sass-loader from 16.0.6 to 16.0.7 (#26)
- chore(deps): bump react-window from 2.2.5 to 2.2.6 (#25)
- chore(deps-dev): bump @playwright/test from 1.58.0 to 1.58.1 (#23)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.0 to 3.2.1 (#22)
- chore(deps): bump the grafana group with 5 updates (#21)
- chore(deps-dev): bump the eslint group with 2 updates (#20)
- chore(ci): bump grafana/plugin-actions/e2e-version@e2e-version/v1.2.0 (#19)
- Merge pull request #14 from EEParker/dependabot/npm_and_yarn/eslint-2e4fb7ff9e
- chore(deps-dev): bump @playwright/test from 1.57.0 to 1.58.0 (#17)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.4 to 3.2.0 (#16)
- chore(deps-dev): bump sass from 1.97.2 to 1.97.3 (#15)
- chore(deps-dev): bump the eslint group across 1 directory with 3 updates
- chore(deps-dev): bump @testing-library/react in the unit-test group (#13)
- lock file maintenance
- Fix Shades color scheme support in spark charts
- init
- chore(deps-dev): bump prettier from 3.7.4 to 3.8.0 (#12)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.2 to 3.1.4 (#11)
- init

## 0.1.5 (2026-03-19)

### Bug Fixes
- fix(ci): fix node command escaping in version-bump workflow
- fix(ci): use CHANGELOG_PAT in release workflow for changelog push
- fix(ci): quote run string to prevent YAML percent-sign parsing
- fix(ci): fix YAML syntax in version bump workflow

### Maintenance
- chore: release v
- chore(ci): move changelog generation into version-bump workflow
- chore(ci): restore changelog generator in release workflow
- chore(ci): disable changelog generator to unblock releases
- Merge pull request #11 from kvaron/dependabot/npm_and_yarn/types/node-25.5.0
- chore: bump version to 0.1.3
- chore(ci): bump grafana/plugin-actions/is-compatible@is-compatible/v1.0.2 (#2)
- chore(ci): disable plugin signing in CI until Grafana approval
- chore: bump version to 0.1.2
- chore(ci): use CHANGELOG_PAT to bypass branch protection in version bump
- chore(ci): add manual version bump workflow and enable changelog generator
- chore: set version to 0.1.1
- chore(deps-dev): bump @types/node from 24.10.8 to 25.5.0
- Merge pull request #3 from kvaron/dependabot/github_actions/actions/download-artifact-8
- Merge pull request #4 from kvaron/dependabot/github_actions/actions/upload-artifact-7
- Merge pull request #12 from kvaron/dependabot/npm_and_yarn/webpack-cli-7.0.0
- chore(deps-dev): bump webpack-cli from 6.0.1 to 7.0.0
- chore(deps): upgrade copy-webpack-plugin to v14 to fix serialize-javascript vulnerability
- chore(ci): skip plugin signing until Grafana approval
- chore(deps-dev): bump @playwright/test from 1.58.1 to 1.58.2 (#7)
- chore(ci): sign as private plugin with kvaron.grafana.net root URL
- chore(deps-dev): bump sass from 1.97.3 to 1.98.0 (#8)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.5 to 3.4.8 (#10)
- chore: update logo to Kvaron branding and fix GitHub URLs to kvaron org
- chore(deps-dev): bump the unit-test group with 2 updates (#5)
- chore(ci): bump grafana/plugin-actions/bundle-size@bundle-size/v1.0.2 (#1)
- chore(ci): bump actions/upload-artifact from 6 to 7
- chore(ci): bump actions/download-artifact from 7 to 8
- chore(deps): fix non-breaking dependency vulnerabilities via npm audit fix
- chore: rebrand from ost to kvaron and enable release signing
- chore(deps-dev): bump webpack from 5.105.3 to 5.105.4 (#53)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.1 to 3.4.5 (#52)
- chore(ci): bump grafana/plugin-actions/create-plugin-update@create-plugin-update/v2.0.1 (#50)
- chore(deps-dev): bump @swc/helpers from 0.5.18 to 0.5.19 (#48)
- chore(deps-dev): bump webpack from 5.105.0 to 5.105.3 (#49)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.0 to 3.4.1 (#47)
- chore(deps): bump react-window from 2.2.6 to 2.2.7 (#45)
- chore(deps-dev): bump @swc/core from 1.15.11 to 1.15.17 (#44)
- chore(deps): bump the grafana group with 5 updates (#43)
- chore(deps-dev): bump css-loader from 7.1.2 to 7.1.4 (#39)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.1 to 3.4.0 (#36)
- chore(deps): bump the grafana group with 5 updates (#35)
- chore(ci): bump grafana/plugin-actions/build-plugin@build-plugin/v1.0.2 (#34)
- chore(deps-dev): bump semver from 7.7.3 to 7.7.4 (#32)
- chore(deps-dev): bump webpack from 5.104.1 to 5.105.0 (#31)
- chore(deps-dev): bump @swc/core from 1.15.8 to 1.15.11 (#29)
- chore(deps-dev): bump sass-loader from 16.0.6 to 16.0.7 (#26)
- chore(deps): bump react-window from 2.2.5 to 2.2.6 (#25)
- chore(deps-dev): bump @playwright/test from 1.58.0 to 1.58.1 (#23)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.0 to 3.2.1 (#22)
- chore(deps): bump the grafana group with 5 updates (#21)
- chore(deps-dev): bump the eslint group with 2 updates (#20)
- chore(ci): bump grafana/plugin-actions/e2e-version@e2e-version/v1.2.0 (#19)
- Merge pull request #14 from EEParker/dependabot/npm_and_yarn/eslint-2e4fb7ff9e
- chore(deps-dev): bump @playwright/test from 1.57.0 to 1.58.0 (#17)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.4 to 3.2.0 (#16)
- chore(deps-dev): bump sass from 1.97.2 to 1.97.3 (#15)
- chore(deps-dev): bump the eslint group across 1 directory with 3 updates
- chore(deps-dev): bump @testing-library/react in the unit-test group (#13)
- chore(deps-dev): bump prettier from 3.7.4 to 3.8.0 (#12)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.2 to 3.1.4 (#11)

##  (2026-03-19)

### Bug Fixes
- fix(ci): use CHANGELOG_PAT in release workflow for changelog push
- fix(ci): quote run string to prevent YAML percent-sign parsing
- fix(ci): fix YAML syntax in version bump workflow

### Maintenance
- chore(ci): move changelog generation into version-bump workflow
- chore(ci): restore changelog generator in release workflow
- chore(ci): disable changelog generator to unblock releases
- Merge pull request #11 from kvaron/dependabot/npm_and_yarn/types/node-25.5.0
- chore: bump version to 0.1.3
- chore(ci): bump grafana/plugin-actions/is-compatible@is-compatible/v1.0.2 (#2)
- chore(ci): disable plugin signing in CI until Grafana approval
- chore: bump version to 0.1.2
- chore(ci): use CHANGELOG_PAT to bypass branch protection in version bump
- chore(ci): add manual version bump workflow and enable changelog generator
- chore: set version to 0.1.1
- chore(deps-dev): bump @types/node from 24.10.8 to 25.5.0
- Merge pull request #3 from kvaron/dependabot/github_actions/actions/download-artifact-8
- Merge pull request #4 from kvaron/dependabot/github_actions/actions/upload-artifact-7
- Merge pull request #12 from kvaron/dependabot/npm_and_yarn/webpack-cli-7.0.0
- chore(deps-dev): bump webpack-cli from 6.0.1 to 7.0.0
- chore(deps): upgrade copy-webpack-plugin to v14 to fix serialize-javascript vulnerability
- chore(ci): skip plugin signing until Grafana approval
- chore(deps-dev): bump @playwright/test from 1.58.1 to 1.58.2 (#7)
- chore(ci): sign as private plugin with kvaron.grafana.net root URL
- chore(deps-dev): bump sass from 1.97.3 to 1.98.0 (#8)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.5 to 3.4.8 (#10)
- chore: update logo to Kvaron branding and fix GitHub URLs to kvaron org
- chore(deps-dev): bump the unit-test group with 2 updates (#5)
- chore(ci): bump grafana/plugin-actions/bundle-size@bundle-size/v1.0.2 (#1)
- chore(ci): bump actions/upload-artifact from 6 to 7
- chore(ci): bump actions/download-artifact from 7 to 8
- chore(deps): fix non-breaking dependency vulnerabilities via npm audit fix
- chore: rebrand from ost to kvaron and enable release signing
- chore(deps-dev): bump webpack from 5.105.3 to 5.105.4 (#53)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.1 to 3.4.5 (#52)
- chore(ci): bump grafana/plugin-actions/create-plugin-update@create-plugin-update/v2.0.1 (#50)
- chore(deps-dev): bump @swc/helpers from 0.5.18 to 0.5.19 (#48)
- chore(deps-dev): bump webpack from 5.105.0 to 5.105.3 (#49)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.4.0 to 3.4.1 (#47)
- chore(deps): bump react-window from 2.2.6 to 2.2.7 (#45)
- chore(deps-dev): bump @swc/core from 1.15.11 to 1.15.17 (#44)
- chore(deps): bump the grafana group with 5 updates (#43)
- chore(deps-dev): bump css-loader from 7.1.2 to 7.1.4 (#39)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.1 to 3.4.0 (#36)
- chore(deps): bump the grafana group with 5 updates (#35)
- chore(ci): bump grafana/plugin-actions/build-plugin@build-plugin/v1.0.2 (#34)
- chore(deps-dev): bump semver from 7.7.3 to 7.7.4 (#32)
- chore(deps-dev): bump webpack from 5.104.1 to 5.105.0 (#31)
- chore(deps-dev): bump @swc/core from 1.15.8 to 1.15.11 (#29)
- chore(deps-dev): bump sass-loader from 16.0.6 to 16.0.7 (#26)
- chore(deps): bump react-window from 2.2.5 to 2.2.6 (#25)
- chore(deps-dev): bump @playwright/test from 1.58.0 to 1.58.1 (#23)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.2.0 to 3.2.1 (#22)
- chore(deps): bump the grafana group with 5 updates (#21)
- chore(deps-dev): bump the eslint group with 2 updates (#20)
- chore(ci): bump grafana/plugin-actions/e2e-version@e2e-version/v1.2.0 (#19)
- Merge pull request #14 from EEParker/dependabot/npm_and_yarn/eslint-2e4fb7ff9e
- chore(deps-dev): bump @playwright/test from 1.57.0 to 1.58.0 (#17)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.4 to 3.2.0 (#16)
- chore(deps-dev): bump sass from 1.97.2 to 1.97.3 (#15)
- chore(deps-dev): bump the eslint group across 1 directory with 3 updates
- chore(deps-dev): bump @testing-library/react in the unit-test group (#13)
- chore(deps-dev): bump prettier from 3.7.4 to 3.8.0 (#12)
- chore(deps-dev): bump @grafana/plugin-e2e from 3.1.2 to 3.1.4 (#11)

# Changelog

## 1.0.0

### Features

- Advanced grid/table panel with virtual scrolling via react-window
- Conditional formatting with threshold, value mapping, data range gradient, and flags rules
- Nested condition groups for complex highlight logic
- Embedded SparkCharts within cells
- Client-side and server-side pagination
- Server-side filtering and sorting (OData, SQL, JSON)
- Smart column filtering with automatic type detection
- Configurable page sizes and column widths
