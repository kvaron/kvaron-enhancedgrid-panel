import { DataFrame } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

/**
 * Resolve the server-side total row count for the pagination footer.
 *
 * Source priority:
 *   1. DataFrame meta (`frame.meta.custom`) — used automatically when a
 *      datasource surfaces a count (e.g. an OData `$count`) into frame meta.
 *   2. The dashboard variable named by `countVariableName` — the documented
 *      path for SQL datasources, where the user runs a COUNT(*) into a variable
 *      (and the same path OData users can use to expose `@odata.count`).
 *
 * Returns `null` when no usable count is available; PaginationControls then
 * renders "Showing X to Y" without a total / "Page N of M".
 */
export function resolveServerSideCount(
  frame: DataFrame | undefined,
  countVariableName: string | undefined
): number | null {
  const metaCount = readMetaCount(frame);
  if (metaCount != null) {
    return metaCount;
  }
  return readVariableCount(countVariableName);
}

function readMetaCount(frame: DataFrame | undefined): number | null {
  const custom = frame?.meta?.custom as Record<string, unknown> | undefined;
  if (!custom) {
    return null;
  }
  const raw = custom.count ?? custom.total ?? custom.totalCount ?? custom['@odata.count'];
  return toCount(raw);
}

function readVariableCount(countVariableName: string | undefined): number | null {
  const name = countVariableName?.trim();
  if (!name) {
    return null;
  }
  const target = `$${name}`;
  let replaced: string;
  try {
    replaced = getTemplateSrv().replace(target);
  } catch {
    return null;
  }
  // Grafana returns the target unchanged when the variable is undefined.
  if (replaced === target || replaced === '') {
    return null;
  }
  return toCount(replaced);
}

function toCount(raw: unknown): number | null {
  if (raw == null) {
    return null;
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.floor(n);
}
