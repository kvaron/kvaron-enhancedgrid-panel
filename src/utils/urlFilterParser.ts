/**
 * Parse structured URL parameters into FilterState / SortState.
 *
 * URL syntax (where {filterVar} and {sortVar} are the panel's configured
 * Filter/Sort Variable Names, defaults `gridFilter` / `gridSort`):
 *
 *   ?{filterVar}.{field}={op}                blank / not_blank
 *   ?{filterVar}.{field}={op}:{value}        single-value operators
 *   ?{filterVar}.{field}={op}:{value}:{val2} between
 *   ?{sortVar}={field}:{direction}           sort
 *
 * The parser is strict: every entry is validated against the FilterOperator
 * enum, the supplied field-name allowlist, and per-operator arity. Any entry
 * that fails any check is dropped and recorded in `rejections` with a reason.
 *
 * URL deep links are intent declarations. They never carry raw SQL — the
 * panel passes the parsed FilterState through the same buildSQLFilter
 * pipeline as UI-driven filters, so escape and dialect handling are
 * uniform across both input paths.
 */

import { ColumnFilter, FilterOperator } from '../types';
import { FilterState, SortState } from './odataQueryBuilder';

const NO_VALUE_OPERATORS = new Set<FilterOperator>(['blank', 'not_blank']);
const TWO_VALUE_OPERATORS = new Set<FilterOperator>(['between']);
const ALL_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'contains',
  'equals',
  'starts_with',
  'ends_with',
  'eq',
  'ne',
  'gt',
  'lt',
  'gte',
  'lte',
  'between',
  'blank',
  'not_blank',
]);

const VALID_DIRECTIONS = new Set(['asc', 'desc']);

export interface ParseUrlFiltersOptions {
  filterVariableName: string;
  sortVariableName: string;
  searchParams: URLSearchParams;
  validFieldNames: ReadonlySet<string>;
}

export interface ParsedUrlRejection {
  key: string;
  rawValue: string;
  reason: string;
}

export interface ParsedUrlFilters {
  filters: FilterState;
  sort: SortState | null;
  rejections: ParsedUrlRejection[];
}

/**
 * Parse the panel's structured URL parameters from a given URLSearchParams.
 * Pure: no side effects, no console output. Callers may log rejections.
 */
export function parseUrlFilters(opts: ParseUrlFiltersOptions): ParsedUrlFilters {
  const { filterVariableName, sortVariableName, searchParams, validFieldNames } = opts;
  const filters: FilterState = {};
  const rejections: ParsedUrlRejection[] = [];
  let sort: SortState | null = null;

  const filterPrefix = `${filterVariableName}.`;

  for (const [key, rawValue] of searchParams.entries()) {
    if (key === sortVariableName) {
      const parsedSort = parseSortSpec(rawValue, validFieldNames);
      if (parsedSort.kind === 'ok') {
        sort = parsedSort.value;
      } else {
        rejections.push({ key, rawValue, reason: parsedSort.reason });
      }
      continue;
    }

    if (key.startsWith(filterPrefix)) {
      const field = key.slice(filterPrefix.length);
      const parsedFilter = parseFilterSpec(field, rawValue, validFieldNames);
      if (parsedFilter.kind === 'ok') {
        filters[field] = parsedFilter.value;
      } else {
        rejections.push({ key, rawValue, reason: parsedFilter.reason });
      }
      continue;
    }
    // Other keys (Grafana var-* params, time range, etc.) are not our concern.
  }

  return { filters, sort, rejections };
}

type ParseResult<T> = { kind: 'ok'; value: T } | { kind: 'err'; reason: string };

function parseFilterSpec(
  field: string,
  rawValue: string,
  validFieldNames: ReadonlySet<string>
): ParseResult<ColumnFilter> {
  if (!field) {
    return { kind: 'err', reason: 'empty field name' };
  }
  if (!validFieldNames.has(field)) {
    return { kind: 'err', reason: `field "${field}" not in data frame` };
  }

  const firstColon = rawValue.indexOf(':');
  const opPart = firstColon === -1 ? rawValue : rawValue.slice(0, firstColon);
  const rest = firstColon === -1 ? '' : rawValue.slice(firstColon + 1);

  if (!isFilterOperator(opPart)) {
    return { kind: 'err', reason: `unknown operator "${opPart}"` };
  }
  const op = opPart;

  if (NO_VALUE_OPERATORS.has(op)) {
    if (firstColon !== -1 && rest.length > 0) {
      return { kind: 'err', reason: `operator "${op}" takes no value` };
    }
    return { kind: 'ok', value: { operator: op, value: '' } };
  }

  if (TWO_VALUE_OPERATORS.has(op)) {
    if (firstColon === -1) {
      return { kind: 'err', reason: `operator "${op}" requires two values` };
    }
    const secondColon = rest.indexOf(':');
    if (secondColon === -1) {
      return { kind: 'err', reason: `operator "${op}" requires two values` };
    }
    const value = rest.slice(0, secondColon);
    const value2 = rest.slice(secondColon + 1);
    return { kind: 'ok', value: { operator: op, value, value2 } };
  }

  // Single-value operator
  if (firstColon === -1) {
    return { kind: 'err', reason: `operator "${op}" requires a value` };
  }
  return { kind: 'ok', value: { operator: op, value: rest } };
}

function parseSortSpec(
  rawValue: string,
  validFieldNames: ReadonlySet<string>
): ParseResult<SortState> {
  const colon = rawValue.lastIndexOf(':');
  if (colon === -1) {
    return { kind: 'err', reason: 'sort spec must be field:direction' };
  }
  const field = rawValue.slice(0, colon);
  const direction = rawValue.slice(colon + 1);

  if (!field) {
    return { kind: 'err', reason: 'empty sort field' };
  }
  if (!validFieldNames.has(field)) {
    return { kind: 'err', reason: `sort field "${field}" not in data frame` };
  }
  if (!VALID_DIRECTIONS.has(direction)) {
    return { kind: 'err', reason: `direction "${direction}" must be asc or desc` };
  }
  return {
    kind: 'ok',
    value: { field, direction: direction as 'asc' | 'desc' },
  };
}

function isFilterOperator(s: string): s is FilterOperator {
  return ALL_OPERATORS.has(s as FilterOperator);
}
