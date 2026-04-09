/**
 * Utility functions for building OData query strings from filter and sort state
 */

import { ColumnFilter } from '../types';

export interface FilterState {
  [fieldName: string]: ColumnFilter;
}

export interface SortState {
  field: string | null;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  currentPage: number; // 0-based page number
  pageSize: number;
}

/**
 * Builds an OData expression for a single filter
 */
function buildODataFilterExpression(fieldName: string, filter: ColumnFilter): string {
  const { operator, value, value2 } = filter;

  // Handle blank/not blank
  if (operator === 'blank') {
    return `(${fieldName} eq null or ${fieldName} eq '')`;
  }
  if (operator === 'not_blank') {
    return `(${fieldName} ne null and ${fieldName} ne '')`;
  }

  // Escape single quotes in values
  const escapeValue = (v: string | number): string => {
    return String(v).replace(/'/g, "''");
  };

  const escapedValue = escapeValue(value);

  // Text operators
  if (operator === 'contains') {
    return `contains(tolower(${fieldName}), '${escapedValue.toLowerCase()}')`;
  }
  if (operator === 'equals') {
    return `tolower(${fieldName}) eq '${escapedValue.toLowerCase()}'`;
  }
  if (operator === 'starts_with') {
    return `startswith(tolower(${fieldName}), '${escapedValue.toLowerCase()}')`;
  }
  if (operator === 'ends_with') {
    return `endswith(tolower(${fieldName}), '${escapedValue.toLowerCase()}')`;
  }

  // Numeric operators — coerce to number to prevent injection via string values
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    const safeNum = Number(value);
    if (isNaN(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: 'eq', ne: 'ne', gt: 'gt', lt: 'lt', gte: 'ge', lte: 'le' };
    return `${fieldName} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    const safeNum = Number(value);
    const safeNum2 = Number(value2);
    if (isNaN(safeNum) || isNaN(safeNum2)) {
      return '';
    }
    return `(${fieldName} ge ${safeNum} and ${fieldName} le ${safeNum2})`;
  }

  return '';
}

/**
 * Builds an OData $filter query string from filter state
 * @param filters - Object mapping field names to filter objects
 * @returns OData $filter query string
 */
export function buildODataFilter(filters: FilterState): string {
  const filterExpressions: string[] = [];

  for (const [fieldName, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    const expression = buildODataFilterExpression(fieldName, filter);
    if (expression) {
      filterExpressions.push(expression);
    }
  }

  // Combine all filter expressions with 'and'
  return filterExpressions.join(' and ');
}

/**
 * Builds an OData $orderby query string from sort state
 * @param sortState - Current sort field and direction
 * @returns OData $orderby query string (e.g., "Name desc" or "Price asc")
 */
export function buildODataSort(sortState: SortState): string {
  if (!sortState.field) {
    return '';
  }

  return `${sortState.field} ${sortState.direction}`;
}

/**
 * Builds OData pagination parameters
 * @param paginationState - Pagination state (page number and size)
 * @returns Object with skip and top values
 */
export function buildODataPagination(paginationState: PaginationState | null): {
  skip: number;
  top: number;
} {
  if (!paginationState) {
    return { skip: 0, top: 50 }; // Default page size
  }

  const skip = paginationState.currentPage * paginationState.pageSize;
  return {
    skip,
    top: paginationState.pageSize,
  };
}

/**
 * Builds a complete OData query string with filter, sort, and optional pagination
 * @param filters - Filter state
 * @param sortState - Sort state
 * @param paginationState - Pagination state (optional)
 * @returns Object with filter, orderby, and optional skip/top strings
 */
export function buildODataQuery(
  filters: FilterState,
  sortState: SortState,
  paginationState: PaginationState | null = null
): {
  filter: string;
  orderby: string;
  skip: string;
  top: string;
} {
  const pagination = buildODataPagination(paginationState);

  return {
    filter: buildODataFilter(filters),
    orderby: buildODataSort(sortState),
    skip: pagination.skip.toString(),
    top: pagination.top.toString(),
  };
}

/**
 * Escape a SQL identifier (field name) by wrapping in double quotes.
 * Also escapes any internal double quotes by doubling them (SQL standard).
 */
function escapeSQLIdentifier(identifier: string): string {
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds a SQL expression for a single filter
 */
function buildSQLFilterExpression(fieldName: string, filter: ColumnFilter): string {
  const { operator, value, value2 } = filter;

  // Escape field name to prevent SQL injection and handle special characters/spaces
  const quotedField = escapeSQLIdentifier(fieldName);

  // Handle blank/not blank
  if (operator === 'blank') {
    return `(${quotedField} IS NULL OR ${quotedField} = '' OR TRIM(${quotedField}) = '')`;
  }
  if (operator === 'not_blank') {
    return `(${quotedField} IS NOT NULL AND ${quotedField} != '' AND TRIM(${quotedField}) != '')`;
  }

  // Escape single quotes in values
  const escapeValue = (v: string | number): string => {
    return String(v).replace(/'/g, "''");
  };

  const escapedValue = escapeValue(value);

  // Text operators (use ILIKE for PostgreSQL, for MySQL use LOWER() with LIKE)
  if (operator === 'contains') {
    return `${quotedField} ILIKE '%${escapedValue}%'`;
  }
  if (operator === 'equals') {
    return `${quotedField} ILIKE '${escapedValue}'`;
  }
  if (operator === 'starts_with') {
    return `${quotedField} ILIKE '${escapedValue}%'`;
  }
  if (operator === 'ends_with') {
    return `${quotedField} ILIKE '%${escapedValue}'`;
  }

  // Numeric operators — coerce to number to prevent SQL injection via string values
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    const safeNum = Number(value);
    if (isNaN(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: '=', ne: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=' };
    return `${quotedField} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    const safeNum = Number(value);
    const safeNum2 = Number(value2);
    if (isNaN(safeNum) || isNaN(safeNum2)) {
      return '';
    }
    return `${quotedField} BETWEEN ${safeNum} AND ${safeNum2}`;
  }

  return '';
}

/**
 * Builds SQL WHERE clause from filter state
 * @param filters - Object mapping field names to filter objects
 * @returns SQL WHERE clause
 */
export function buildSQLFilter(filters: FilterState): string {
  const filterExpressions: string[] = [];

  for (const [fieldName, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    const expression = buildSQLFilterExpression(fieldName, filter);
    if (expression) {
      filterExpressions.push(expression);
    }
  }

  // Combine all filter expressions with 'AND'
  return filterExpressions.join(' AND ');
}

/**
 * Builds SQL ORDER BY clause from sort state
 * @param sortState - Current sort field and direction
 * @returns SQL ORDER BY clause (e.g., "Name" DESC or "Price" ASC)
 */
export function buildSQLSort(sortState: SortState): string {
  if (!sortState.field) {
    return '';
  }

  // Quote field name for safety
  const quotedField = escapeSQLIdentifier(sortState.field);
  return `${quotedField} ${sortState.direction.toUpperCase()}`;
}

/**
 * Builds SQL pagination parameters
 * @param paginationState - Pagination state (page number and size)
 * @returns Object with limit and offset values
 */
export function buildSQLPagination(paginationState: PaginationState | null): {
  limit: number;
  offset: number;
} {
  if (!paginationState) {
    return { limit: 50, offset: 0 }; // Default page size
  }

  const offset = paginationState.currentPage * paginationState.pageSize;
  return {
    limit: paginationState.pageSize,
    offset,
  };
}

/**
 * Builds a complete SQL query with WHERE, ORDER BY, and optional pagination
 * @param filters - Filter state
 * @param sortState - Sort state
 * @param paginationState - Pagination state (optional)
 * @returns Object with where, orderby, limit, and offset strings
 */
export function buildSQLQuery(
  filters: FilterState,
  sortState: SortState,
  paginationState: PaginationState | null = null
): {
  where: string;
  orderby: string;
  limit: string;
  offset: string;
} {
  const pagination = buildSQLPagination(paginationState);

  return {
    where: buildSQLFilter(filters),
    orderby: buildSQLSort(sortState),
    limit: pagination.limit.toString(),
    offset: pagination.offset.toString(),
  };
}

/**
 * Builds a generic query parameter format (for non-OData APIs)
 * Can be customized based on your API's requirements
 */
export function buildGenericQuery(
  filters: FilterState,
  sortState: SortState
): {
  filter: string;
  sort: string;
} {
  // Build filter as JSON string with operator information
  const activeFilters: Record<string, any> = {};
  for (const [key, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    // Include operator and value(s) in the filter object
    activeFilters[key] = {
      operator: filter.operator,
      value: filter.value,
      ...(filter.value2 !== undefined && { value2: filter.value2 }),
    };
  }

  // Build sort string
  let sortString = '';
  if (sortState.field) {
    sortString = sortState.direction === 'desc' ? `-${sortState.field}` : sortState.field;
  }

  return {
    filter: Object.keys(activeFilters).length > 0 ? JSON.stringify(activeFilters) : '',
    sort: sortString,
  };
}
