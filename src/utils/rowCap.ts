/**
 * Row-count safety cap applied at the panel-render boundary.
 *
 * With server-side pagination enabled, the data source is expected to return
 * roughly the configured page size. A response far above that suggests the
 * server-side query did not push down pagination / filtering (or that a
 * templated variable widened the result), and the panel should not blindly
 * render the breadth. Without server-side pagination, a fixed absolute cap
 * keeps the panel render predictable on pathological data sources.
 */

export const SERVER_PAGE_SAFETY_FACTOR = 4;
export const MAX_PANEL_ROWS = 100_000;
const DEFAULT_PAGE_SIZE_FALLBACK = 50;

export interface RowCapOptions {
  serverSideMode?: boolean;
  serverSidePagination?: boolean;
}

/**
 * Compute the maximum number of rows the panel is willing to render given
 * the panel options and page size.
 */
export function computeRowCap(options: RowCapOptions, pageSize: number): number {
  if (options.serverSideMode && options.serverSidePagination) {
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE_FALLBACK;
    return Math.min(MAX_PANEL_ROWS, safePageSize * SERVER_PAGE_SAFETY_FACTOR);
  }
  return MAX_PANEL_ROWS;
}

/**
 * Return rows, capped to {@link computeRowCap}. If clipping fires, a console
 * warning is emitted so operators can see the signal without noisy UI.
 */
export function capRowsForRender<T>(
  rows: readonly T[],
  options: RowCapOptions,
  pageSize: number
): readonly T[] {
  if (rows.length === 0) {
    return rows;
  }
  const cap = computeRowCap(options, pageSize);
  if (rows.length > cap) {
    console.warn(
      `[EnhancedGrid] Datasource returned ${rows.length} rows; capping displayed rows at ${cap}. ` +
        `Verify server-side pagination/filtering is pushing down to the datasource.`
    );
    return rows.slice(0, cap);
  }
  return rows;
}
