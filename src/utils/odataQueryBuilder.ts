/**
 * Utility functions for building OData query strings from filter and sort state
 */

import { ColumnFilter, SqlDialect } from '../types';

// Defensive caps applied at the fragment-builder boundary. Values exceeding
// these lengths drop the filter / sort fragment instead of inflating the
// generated query. These limits are well above any realistic user-facing
// filter input; the UI applies a matching `maxLength` to filter inputs so
// the typical user never reaches them.
const MAX_FILTER_VALUE_LENGTH = 1024;
const MAX_IDENTIFIER_LENGTH = 256;

function isOversizedValue(v: unknown): boolean {
  return typeof v === 'string' && v.length > MAX_FILTER_VALUE_LENGTH;
}

function isOversizedIdentifier(name: string): boolean {
  return name.length > MAX_IDENTIFIER_LENGTH;
}

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
 * OData identifier rule: a letter or underscore, followed by letters, digits,
 * or underscores. OData/EDM does not provide a quoting mechanism for arbitrary
 * names, so any field name that fails this pattern is dropped (the resulting
 * filter / sort fragment is empty) rather than emitted unquoted.
 */
const ODATA_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isValidODataIdentifier(name: string): boolean {
  return ODATA_IDENTIFIER_RE.test(name);
}

/**
 * Builds an OData expression for a single filter
 */
function buildODataFilterExpression(fieldName: string, filter: ColumnFilter): string {
  // Reject field names that are not valid OData identifiers — OData has no
  // quoting mechanism, so a name like `weird name` or `evil); attack(` would
  // otherwise interpolate raw into the filter expression.
  if (!isValidODataIdentifier(fieldName) || isOversizedIdentifier(fieldName)) {
    return '';
  }

  const { operator, value, value2 } = filter;
  if (isOversizedValue(value) || isOversizedValue(value2)) {
    return '';
  }

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

  // Numeric operators — coerce to number to prevent injection via string values.
  // Number.isFinite rejects NaN, Infinity, and -Infinity (Infinity would render
  // as the bare token `Infinity`, which the database rejects as a parse error).
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    const safeNum = Number(value);
    if (!Number.isFinite(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: 'eq', ne: 'ne', gt: 'gt', lt: 'lt', gte: 'ge', lte: 'le' };
    return `${fieldName} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    const safeNum = Number(value);
    const safeNum2 = Number(value2);
    if (!Number.isFinite(safeNum) || !Number.isFinite(safeNum2)) {
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
  if (
    !sortState.field ||
    !isValidODataIdentifier(sortState.field) ||
    isOversizedIdentifier(sortState.field)
  ) {
    return '';
  }
  // Runtime guard: only asc/desc may reach the OData fragment, even if a
  // future caller threads an untrusted SortState in.
  const direction = sortState.direction === 'desc' ? 'desc' : 'asc';
  return `${sortState.field} ${direction}`;
}

// Default page size used whenever an absent or invalid value is supplied.
const DEFAULT_PAGE_SIZE = 50;

/**
 * Coerce a pagination field to a non-negative integer, falling back to the
 * supplied default. Defends against runtime type-erasure surprises (e.g. a
 * future caller delivering pageSize as a string from URL params or a
 * deserialized JSON state).
 */
function safePageInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const i = Math.trunc(n);
  return i < 0 ? fallback : i;
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
    return { skip: 0, top: DEFAULT_PAGE_SIZE };
  }

  const top = safePageInt(paginationState.pageSize, DEFAULT_PAGE_SIZE);
  const currentPage = safePageInt(paginationState.currentPage, 0);
  return {
    skip: currentPage * top,
    top,
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
 * Escape a SQL identifier (field name) using dialect-appropriate quoting.
 * - postgres / ansi: double quotes, internal `"` doubled (SQL standard)
 * - sqlserver: square brackets, internal `]` doubled
 */
function escapeSQLIdentifier(identifier: string, dialect: SqlDialect = 'postgres'): string {
  if (dialect === 'sqlserver') {
    return `[${identifier.replace(/]/g, ']]')}]`;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

// Escape character used in LIKE patterns. Chosen as `!` rather than `\` so the
// generated SQL is portable across MySQL's default sql_mode (where backslash is
// itself an escape inside string literals) without requiring NO_BACKSLASH_ESCAPES.
const LIKE_ESCAPE_CHAR = '!';

/**
 * Escape LIKE pattern metacharacters in user-supplied content so that
 * `%`, `_`, and (for SQL Server) `[` are matched literally instead of
 * interpreted as wildcards. The escape character itself is doubled first
 * to preserve the property that `escape(escape(x)) === escape(x)` is false
 * only for the escape character.
 */
function escapeLikeMetachars(value: string): string {
  return value
    .replace(/!/g, '!!')
    .replace(/%/g, '!%')
    .replace(/_/g, '!_')
    .replace(/\[/g, '![');
}

type LikeShape = 'contains' | 'starts_with' | 'ends_with';

function buildLikePattern(value: string, shape: LikeShape): string {
  const safe = escapeLikeMetachars(value);
  if (shape === 'contains') {
    return `%${safe}%`;
  }
  if (shape === 'starts_with') {
    return `${safe}%`;
  }
  return `%${safe}`;
}

/**
 * Builds a SQL text-match expression for a column/pattern using the dialect's
 * preferred case-insensitive comparison. The user's literal value is escaped
 * for LIKE metacharacters (`%`, `_`, `[`) so a user typing `%admin%` does not
 * widen the match.
 */
function buildSQLTextMatch(
  quotedField: string,
  userValue: string,
  shape: LikeShape,
  dialect: SqlDialect
): string {
  const pattern = buildLikePattern(userValue, shape);
  if (dialect === 'postgres') {
    return `${quotedField} ILIKE '${pattern}' ESCAPE '${LIKE_ESCAPE_CHAR}'`;
  }
  if (dialect === 'sqlserver') {
    // SQL Server LIKE is case-insensitive under the default collation.
    return `${quotedField} LIKE '${pattern}' ESCAPE '${LIKE_ESCAPE_CHAR}'`;
  }
  // ANSI fallback: portable case-insensitive comparison.
  return `LOWER(${quotedField}) LIKE LOWER('${pattern}') ESCAPE '${LIKE_ESCAPE_CHAR}'`;
}

/**
 * Builds a SQL exact-equality expression. Distinct from buildSQLTextMatch so the
 * `equals` operator never interprets user-typed `%` / `_` / `[` as wildcards.
 */
function buildSQLTextEquals(quotedField: string, value: string, dialect: SqlDialect): string {
  if (dialect === 'sqlserver') {
    // SQL Server `=` is case-insensitive under the default collation, matching the LIKE story.
    return `${quotedField} = '${value}'`;
  }
  // Postgres and ANSI: explicit LOWER() on both sides for portable case-insensitive equality.
  return `LOWER(${quotedField}) = LOWER('${value}')`;
}

/**
 * Builds a SQL expression for a single filter
 */
function buildSQLFilterExpression(
  fieldName: string,
  filter: ColumnFilter,
  dialect: SqlDialect = 'postgres'
): string {
  if (isOversizedIdentifier(fieldName)) {
    return '';
  }

  const { operator, value, value2 } = filter;
  if (isOversizedValue(value) || isOversizedValue(value2)) {
    return '';
  }

  // Escape field name to prevent SQL injection and handle special characters/spaces
  const quotedField = escapeSQLIdentifier(fieldName, dialect);

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

  // Text operators — dialect-specific case-insensitive comparison.
  // LIKE-pattern metacharacters in the user's value are escaped inside
  // buildSQLTextMatch via the LIKE ESCAPE clause.
  if (operator === 'contains') {
    return buildSQLTextMatch(quotedField, escapedValue, 'contains', dialect);
  }
  if (operator === 'equals') {
    return buildSQLTextEquals(quotedField, escapedValue, dialect);
  }
  if (operator === 'starts_with') {
    return buildSQLTextMatch(quotedField, escapedValue, 'starts_with', dialect);
  }
  if (operator === 'ends_with') {
    return buildSQLTextMatch(quotedField, escapedValue, 'ends_with', dialect);
  }

  // Numeric operators — coerce to number to prevent SQL injection via string values.
  // Number.isFinite rejects NaN, Infinity, and -Infinity (Infinity would render
  // as the bare token `Infinity`, which the database rejects as a parse error).
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    const safeNum = Number(value);
    if (!Number.isFinite(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: '=', ne: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=' };
    return `${quotedField} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    const safeNum = Number(value);
    const safeNum2 = Number(value2);
    if (!Number.isFinite(safeNum) || !Number.isFinite(safeNum2)) {
      return '';
    }
    return `${quotedField} BETWEEN ${safeNum} AND ${safeNum2}`;
  }

  return '';
}

/**
 * Builds SQL WHERE clause from filter state
 * @param filters - Object mapping field names to filter objects
 * @param dialect - SQL dialect for syntax (default: 'postgres')
 * @returns SQL WHERE clause
 */
export function buildSQLFilter(filters: FilterState, dialect: SqlDialect = 'postgres'): string {
  const filterExpressions: string[] = [];

  for (const [fieldName, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    const expression = buildSQLFilterExpression(fieldName, filter, dialect);
    if (expression) {
      filterExpressions.push(expression);
    }
  }

  // When no filters are active, return a SQL-valid no-op so dashboard
  // templates like `WHERE ${gridFilter:raw}` never produce invalid SQL.
  // `1=1` is portable across every dialect this panel supports.
  if (filterExpressions.length === 0) {
    return '1=1';
  }

  // Combine all filter expressions with 'AND'
  return filterExpressions.join(' AND ');
}

/**
 * Builds SQL ORDER BY clause from sort state
 * @param sortState - Current sort field and direction
 * @param dialect - SQL dialect for identifier quoting (default: 'postgres')
 * @returns SQL ORDER BY clause (e.g., "Name" DESC or [Price] ASC)
 */
export function buildSQLSort(sortState: SortState, dialect: SqlDialect = 'postgres'): string {
  // When no sort is active (or the field name is oversized and rejected),
  // return ORDER BY 1 — sort by the first selected column position. This
  // is a SQL-standard no-op-shaped fallback that keeps dashboard templates
  // like `ORDER BY ${gridSort:raw}` syntactically valid in every state.
  if (!sortState.field || isOversizedIdentifier(sortState.field)) {
    return '1';
  }

  // Quote field name for safety
  const quotedField = escapeSQLIdentifier(sortState.field, dialect);
  // Runtime guard: only ASC/DESC may reach the SQL string, even if a future caller
  // threads an untrusted SortState in (URL params, JSON, postMessage, etc.).
  const direction = sortState.direction === 'desc' ? 'DESC' : 'ASC';
  return `${quotedField} ${direction}`;
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
    return { limit: DEFAULT_PAGE_SIZE, offset: 0 };
  }

  const limit = safePageInt(paginationState.pageSize, DEFAULT_PAGE_SIZE);
  const currentPage = safePageInt(paginationState.currentPage, 0);
  return {
    limit,
    offset: currentPage * limit,
  };
}

/**
 * Builds a complete SQL query with WHERE, ORDER BY, and optional pagination
 * @param filters - Filter state
 * @param sortState - Sort state
 * @param paginationState - Pagination state (optional)
 * @param dialect - SQL dialect for syntax (default: 'postgres')
 * @returns Object with where, orderby, limit, and offset strings
 */
export function buildSQLQuery(
  filters: FilterState,
  sortState: SortState,
  paginationState: PaginationState | null = null,
  dialect: SqlDialect = 'postgres'
): {
  where: string;
  orderby: string;
  limit: string;
  offset: string;
} {
  const pagination = buildSQLPagination(paginationState);

  return {
    where: buildSQLFilter(filters, dialect),
    orderby: buildSQLSort(sortState, dialect),
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
