import { EnhancedGridOptions } from '../types';

/**
 * Resolved server-side dashboard variable names for one grid panel.
 */
export interface ResolvedServerSideVarNames {
  filter: string;
  sort: string;
  skip: string;
  top: string;
  count: string;
  /**
   * View-preset "mode" variable. Optional in practice — only needed to drive
   * the active view from a dashboard control/deep link. Like every other
   * concern, it is derived directly from the Grid ID.
   */
  mode: string;
}

/**
 * Returns a trimmed string if the input is a non-empty / non-whitespace
 * string, otherwise undefined.
 */
function nonBlank(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Derive every server-side dashboard variable name for a grid panel from a
 * single Grid ID.
 *
 * - `effectiveGridId = options.gridId?.trim() || ('grid' + panelId)`.
 * - Each concern's name is `${effectiveGridId}_${concern}`.
 *
 * Panel ids are unique per dashboard, so the default `grid{panelId}` prefix
 * yields names that are unique per panel and valid Grafana variable names
 * (letter-leading, `^[A-Za-z][A-Za-z0-9_]*$`).
 */
export function resolveServerSideVarNames(
  options: EnhancedGridOptions,
  panelId: number
): ResolvedServerSideVarNames {
  const effectiveGridId = nonBlank(options.gridId) ?? `grid${panelId}`;

  return {
    filter: `${effectiveGridId}_filter`,
    sort: `${effectiveGridId}_sort`,
    skip: `${effectiveGridId}_skip`,
    top: `${effectiveGridId}_top`,
    count: `${effectiveGridId}_count`,
    mode: `${effectiveGridId}_mode`,
  };
}
