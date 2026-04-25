## Unreleased

### Changes
- chore(deps): pin `@grafana/{data,ui,runtime,schema,i18n}` to `12.4.2` for deterministic builds (matches create-plugin@7.1.6+ policy)
- chore(docker): bump default `GRAFANA_VERSION` in `.config/docker-compose-base.yaml` to `13.0.1` so local dev/tests run against Grafana 13
- Verified compatibility with Grafana 13.0.1; `grafanaDependency` remains `>=11.6.0`

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
