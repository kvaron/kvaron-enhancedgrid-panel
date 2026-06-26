# OData + Infinity end-to-end stack

A self-contained stack that proves the Enhanced Grid panel's **server-side
OData** mode works through the [Infinity data source](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/)
against a real OData service. It runs separately from the default dev stack
(Grafana on port **3001**, OData mock on **8080**) so it doesn't disturb it.

## What's here

- `server.js` — a dependency-free OData v4 mock (12 products) supporting
  `$filter`, `$orderby`, `$skip`, `$top`, `$count`, and `/Products/$count`.
  It logs every request, so the container logs show exactly what Infinity
  sent.
- `provisioning/` — the Infinity data source (`OData Mock (Infinity)`) and a
  dashboard (`OData + Infinity E2E`) with the grid in server-side OData mode.
- `verify.cjs` — a headless-Chromium check that drives the dashboard and
  asserts filtering, paging, and the count footer.
- `../docker-compose.odata.yaml` — wires Grafana + Infinity + the mock.

## Run it

```bash
npm run build                                   # build the plugin into dist/
docker compose -f docker-compose.odata.yaml up -d --build
# open http://localhost:3001/d/odata-grid-e2e
node e2e-odata/verify.cjs                        # automated browser checks
docker compose -f docker-compose.odata.yaml down # stop
```

## What it verifies

- The dashboard renders the OData page (server-side page size).
- A column filter (`ProductName` contains `ch`) narrows the grid to 3 rows
  server-side.
- **Next page** advances via `$skip` (server-side paging).
- The footer shows the grand total when the count variable is set.

> **Note on encoding:** Infinity percent-encodes the request URL — `$`
> becomes `%24` and spaces become `+`. The mock (like any spec-compliant
> OData service) decodes it back, so filtering works. The container logs
> (`docker logs kvaron-odata-mock`) show the encoded requests.
