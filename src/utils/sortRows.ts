/**
 * Client-side multi-key (sequential) row sorting.
 *
 * The grid's sort is an ordered list of {@link SortKey}s. Rows are compared by
 * each key in order: a tie on the first key is broken by the second, then the
 * third, and so on. This is the single client-side comparator the grid uses;
 * the server-side builders in `odataQueryBuilder.ts` produce the equivalent
 * `ORDER BY` / `$orderby` from the same `SortKey[]`.
 */

import { SortKey } from './odataQueryBuilder';

/** Minimal shape the comparator needs: a row exposing a `data` value map. */
export interface SortableRow {
  data: Record<string, unknown>;
}

/**
 * Compare two rows by an ordered list of sort keys. Returns a negative, zero,
 * or positive number suitable for `Array.prototype.sort`. Equality on a key
 * falls through to the next key; an empty key list (or all-equal keys) yields 0.
 */
export function compareRowsBySortKeys(a: SortableRow, b: SortableRow, sortKeys: SortKey[]): number {
  for (const { field, direction } of sortKeys) {
    const aVal = a.data[field];
    const bVal = b.data[field];

    if (aVal === bVal) {
      continue;
    }

    const comparison = (aVal as number) > (bVal as number) ? 1 : -1;
    return direction === 'asc' ? comparison : -comparison;
  }
  return 0;
}

/**
 * Return a new array of rows sorted by the ordered sort keys. An empty key list
 * returns the input array unchanged (no copy), matching the grid's no-op path.
 */
export function sortRowsBySortKeys<T extends SortableRow>(rows: T[], sortKeys: SortKey[]): T[] {
  if (sortKeys.length === 0) {
    return rows;
  }
  return [...rows].sort((a, b) => compareRowsBySortKeys(a, b, sortKeys));
}
