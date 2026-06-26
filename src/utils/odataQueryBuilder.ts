/**
 * Utility functions for building OData query strings from filter and sort state
 */

import { ColumnFilter, ColumnType, SqlDialect } from '../types';

// Defensive caps applied at the fragment-builder boundary. Values exceeding
// these lengths drop the filter / sort fragment instead of inflating the
// generated query. These limits are well above any realistic user-facing
// filter input; the UI applies a matching `maxLength` to filter inputs so
// the typical user never reaches them.
const MAX_FILTER_VALUE_LENGTH = 1024;
const MAX_IDENTIFIER_LENGTH = 256;

export function isOversizedValue(v: unknown): boolean {
  return typeof v === 'string' && v.length > MAX_FILTER_VALUE_LENGTH;
}

// A numeric operator with an empty/whitespace-only *string* value must drop its
// fragment, NOT emit `field eq 0`. `Number('') === 0` and `Number('  ') === 0`
// are finite, so without this guard a deep-link like `?gridFilter.Age=eq:`
// (value === '') would silently filter on zero. An explicit numeric 0 (or '0')
// is intentionally NOT blank and is preserved.
function isBlankNumericValue(v: unknown): boolean {
  return typeof v === 'string' && v.trim() === '';
}

export function isOversizedIdentifier(name: string): boolean {
  return name.length > MAX_IDENTIFIER_LENGTH;
}

export interface FilterState {
  [fieldName: string]: ColumnFilter;
}

/** Maps field name -> detected column type, used to emit type-correct literals. */
export interface ColumnTypeMap {
  [fieldName: string]: ColumnType;
}

/**
 * A single sort key: a field name and its direction. The grid's sort is an
 * ordered list of these (`SortState`). A single-key sort is a length-1 list;
 * an empty sort is `[]`.
 */
export interface SortKey {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Ordered, sequential (multi-key) sort state. Keys are applied in order: the
 * first key is primary, ties broken by the second, then the third, etc. An
 * empty array means "no sort" and hits each builder's no-op guard.
 */
export type SortState = SortKey[];

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

export function isValidODataIdentifier(name: string): boolean {
  return ODATA_IDENTIFIER_RE.test(name);
}

/**
 * Strict OData V4 temporal-literal patterns. A value must match one of these
 * EXACTLY to be emitted as an (unquoted) Edm.Date / Edm.DateTimeOffset literal.
 * Rejecting everything else is both injection-safe (no raw interpolation is
 * possible — the value is a pure date token) and avoids emitting literals the
 * service would reject.
 */
const ODATA_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ODATA_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Returns a validated temporal literal (date or datetimeoffset), or null. */
export function formatTemporalLiteral(value: string | number): string | null {
  const s = String(value).trim();
  return ODATA_DATE_RE.test(s) || ODATA_DATETIME_RE.test(s) ? s : null;
}

const TRUE_TOKENS = new Set(['true', '1', 'yes', 'y']);
const FALSE_TOKENS = new Set(['false', '0', 'no', 'n']);

/** Coerce a user value to a canonical boolean token, or null if not boolean-like. */
export function coerceBooleanToken(value: string | number): 'true' | 'false' | null {
  const s = String(value).trim().toLowerCase();
  if (TRUE_TOKENS.has(s)) {
    return 'true';
  }
  if (FALSE_TOKENS.has(s)) {
    return 'false';
  }
  return null;
}

/**
 * Builds an OData expression for a single filter
 */
function buildODataFilterExpression(
  fieldName: string,
  filter: ColumnFilter,
  columnType: ColumnType = 'text'
): string {
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

  const isNonString = columnType === 'number' || columnType === 'date' || columnType === 'boolean';

  // Blank / not blank — type-aware. Numeric, date, and boolean columns cannot
  // be compared to the empty string in OData V4 (`eq ''` is a type error), so
  // they use a null check only.
  if (operator === 'blank') {
    return isNonString ? `${fieldName} eq null` : `(${fieldName} eq null or ${fieldName} eq '')`;
  }
  if (operator === 'not_blank') {
    return isNonString ? `${fieldName} ne null` : `(${fieldName} ne null and ${fieldName} ne '')`;
  }

  // Boolean columns: every text-style operator collapses to equality against a
  // coerced Edm boolean literal. The value is coerced, never interpolated.
  if (columnType === 'boolean') {
    if (
      operator === 'contains' ||
      operator === 'equals' ||
      operator === 'starts_with' ||
      operator === 'ends_with' ||
      operator === 'eq' ||
      operator === 'ne'
    ) {
      const bool = coerceBooleanToken(value);
      if (bool === null) {
        return '';
      }
      return `${fieldName} ${operator === 'ne' ? 'ne' : 'eq'} ${bool}`;
    }
    return '';
  }

  // Date / datetime columns: 'equals'/'eq' map to an equality comparison
  // against an unquoted, regex-validated temporal literal; numeric comparison
  // operators map to date comparisons; between maps to a closed range. The
  // fuzzy string operators (contains/starts_with/ends_with) have no valid
  // Edm.Date equivalent in OData V4 and are dropped (fragment omitted).
  if (columnType === 'date') {
    if (operator === 'equals' || operator === 'eq') {
      const lit = formatTemporalLiteral(value);
      return lit === null ? '' : `${fieldName} eq ${lit}`;
    }
    if (operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
      const lit = formatTemporalLiteral(value);
      if (lit === null) {
        return '';
      }
      const ops: Record<string, string> = { ne: 'ne', gt: 'gt', lt: 'lt', gte: 'ge', lte: 'le' };
      return `${fieldName} ${ops[operator]} ${lit}`;
    }
    if (operator === 'between' && value2 != null) {
      const lit = formatTemporalLiteral(value);
      const lit2 = formatTemporalLiteral(value2);
      if (lit === null || lit2 === null) {
        return '';
      }
      return `(${fieldName} ge ${lit} and ${fieldName} le ${lit2})`;
    }
    return '';
  }

  // ---- string + number columns ----

  // Escape single quotes in values
  const escapeValue = (v: string | number): string => {
    return String(v).replace(/'/g, "''");
  };

  const escapedValue = escapeValue(value);

  // Text operators — only valid on string columns. tolower()/contains() are
  // type errors on Edm numeric columns, so they are skipped for 'number'.
  if (columnType !== 'number') {
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
  }

  // Numeric operators — coerce to number to prevent injection via string values.
  // Number.isFinite rejects NaN, Infinity, and -Infinity (Infinity would render
  // as the bare token `Infinity`, which the database rejects as a parse error).
  // A blank/whitespace string value is dropped so it never becomes `eq 0`.
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    if (isBlankNumericValue(value)) {
      return '';
    }
    const safeNum = Number(value);
    if (!Number.isFinite(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: 'eq', ne: 'ne', gt: 'gt', lt: 'lt', gte: 'ge', lte: 'le' };
    return `${fieldName} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    if (isBlankNumericValue(value) || isBlankNumericValue(value2)) {
      return '';
    }
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
 * @returns OData $filter query string. When no filter is active, returns the
 *   OData boolean literal `true` (matches all rows) so templates like
 *   `$filter=${gridFilter}` stay valid in every state.
 */
export function buildODataFilter(filters: FilterState, types: ColumnTypeMap = {}): string {
  const filterExpressions: string[] = [];

  for (const [fieldName, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    const expression = buildODataFilterExpression(fieldName, filter, types[fieldName] ?? 'text');
    if (expression) {
      filterExpressions.push(expression);
    }
  }

  // When no filters are active (or all were dropped as invalid), emit the
  // OData boolean literal `true` — a valid $filter expression that matches
  // every row. This mirrors the SQL builder's `1=1` no-op and keeps URL
  // templates like `$filter=${gridFilter}` valid in every state, because a
  // bare `$filter=` is rejected by strict OData V4 services.
  if (filterExpressions.length === 0) {
    return 'true';
  }

  // Combine all filter expressions with 'and'
  return filterExpressions.join(' and ');
}

/**
 * Builds an OData $orderby query string from an ordered sort state.
 * @param sortState - Ordered list of sort keys
 * @returns OData $orderby string (e.g., "Name desc" or "a asc, b desc"); empty
 *   when no valid key remains. Invalid / unknown-identifier / oversized keys are
 *   dropped individually so the remaining keys still emit.
 */
export function buildODataSort(sortState: SortState): string {
  const fragments: string[] = [];
  for (const key of sortState) {
    if (!key || !key.field || !isValidODataIdentifier(key.field) || isOversizedIdentifier(key.field)) {
      continue;
    }
    // Runtime guard: only asc/desc may reach the OData fragment, even if a
    // future caller threads an untrusted SortState in.
    const direction = key.direction === 'desc' ? 'desc' : 'asc';
    fragments.push(`${key.field} ${direction}`);
  }
  return fragments.join(', ');
}

// Default page size used whenever an absent or invalid value is supplied.
const DEFAULT_PAGE_SIZE = 50;

// Largest value we will ever emit into a query string. Number.MAX_SAFE_INTEGER
// stringifies as a plain decimal ("9007199254740991"); any value >= 1e21 would
// render in exponential notation ("5e+21"), which is not a valid integer literal
// in OData/SQL. Clamping guarantees a decimal string.
const MAX_SAFE_PAGE_INT = Number.MAX_SAFE_INTEGER;

/**
 * Coerce a pagination field to an integer in [min, MAX_SAFE_PAGE_INT], falling
 * back to `fallback` for non-finite or below-min inputs. Defends against runtime
 * type-erasure surprises (string from URL params, deserialized JSON) and against
 * pathological magnitudes that would stringify in exponential notation.
 */
function safePageInt(value: unknown, fallback: number, min = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const i = Math.trunc(n);
  if (i < min) {
    return fallback;
  }
  return i > MAX_SAFE_PAGE_INT ? MAX_SAFE_PAGE_INT : i;
}

/**
 * Clamp a computed offset/skip (page * size) to a magnitude that stringifies as
 * a decimal. The product of two safe integers can still exceed MAX_SAFE_PAGE_INT.
 */
function clampPageMagnitude(n: number): number {
  if (!Number.isFinite(n) || n > MAX_SAFE_PAGE_INT) {
    return MAX_SAFE_PAGE_INT;
  }
  return n < 0 ? 0 : n;
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

  const top = safePageInt(paginationState.pageSize, DEFAULT_PAGE_SIZE, 1);
  const currentPage = safePageInt(paginationState.currentPage, 0);
  return {
    skip: clampPageMagnitude(currentPage * top),
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
  paginationState: PaginationState | null = null,
  types: ColumnTypeMap = {}
): {
  filter: string;
  orderby: string;
  skip: string;
  top: string;
} {
  const pagination = buildODataPagination(paginationState);

  return {
    filter: buildODataFilter(filters, types),
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
export function escapeSQLIdentifier(identifier: string, dialect: SqlDialect = 'postgres'): string {
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
export function buildSQLTextMatch(
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
export function buildSQLTextEquals(quotedField: string, value: string, dialect: SqlDialect): string {
  if (dialect === 'sqlserver') {
    // SQL Server `=` is case-insensitive under the default collation, matching the LIKE story.
    return `${quotedField} = '${value}'`;
  }
  // Postgres and ANSI: explicit LOWER() on both sides for portable case-insensitive equality.
  return `LOWER(${quotedField}) = LOWER('${value}')`;
}

/** Render a coerced boolean token as a dialect-appropriate SQL literal. */
export function sqlBooleanLiteral(value: string | number, dialect: SqlDialect): string | null {
  const token = coerceBooleanToken(value);
  if (token === null) {
    return null;
  }
  if (dialect === 'postgres') {
    return token === 'true' ? 'TRUE' : 'FALSE';
  }
  // sqlserver (BIT) and ansi/sqlite: 1 / 0 is the most portable boolean form.
  return token === 'true' ? '1' : '0';
}

/**
 * Builds a SQL expression for a single filter
 */
function buildSQLFilterExpression(
  fieldName: string,
  filter: ColumnFilter,
  dialect: SqlDialect = 'postgres',
  columnType: ColumnType = 'text'
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
  const isNonString = columnType === 'number' || columnType === 'date' || columnType === 'boolean';

  // Blank / not blank — type-aware. `col = ''` and TRIM(col) raise type errors
  // on numeric/date/boolean columns (e.g. Postgres), so use a null check only.
  if (operator === 'blank') {
    return isNonString
      ? `${quotedField} IS NULL`
      : `(${quotedField} IS NULL OR ${quotedField} = '' OR TRIM(${quotedField}) = '')`;
  }
  if (operator === 'not_blank') {
    return isNonString
      ? `${quotedField} IS NOT NULL`
      : `(${quotedField} IS NOT NULL AND ${quotedField} != '' AND TRIM(${quotedField}) != '')`;
  }

  // Boolean columns: text-style operators collapse to equality against a
  // dialect boolean literal. ILIKE/LIKE on a boolean column is a type error.
  if (columnType === 'boolean') {
    if (
      operator === 'contains' ||
      operator === 'equals' ||
      operator === 'starts_with' ||
      operator === 'ends_with' ||
      operator === 'eq' ||
      operator === 'ne'
    ) {
      const lit = sqlBooleanLiteral(value, dialect);
      if (lit === null) {
        return '';
      }
      return `${quotedField} ${operator === 'ne' ? '!=' : '='} ${lit}`;
    }
    return '';
  }

  // Date columns: equality/comparison against a regex-validated, quoted date
  // literal. Fuzzy string operators have no date equivalent and are dropped.
  if (columnType === 'date') {
    const dateLit = (v: string | number): string | null => {
      const f = formatTemporalLiteral(v);
      return f === null ? null : `'${f}'`; // regex-validated: no quote can appear
    };
    if (operator === 'equals' || operator === 'eq') {
      const lit = dateLit(value);
      return lit === null ? '' : `${quotedField} = ${lit}`;
    }
    if (operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
      const lit = dateLit(value);
      if (lit === null) {
        return '';
      }
      const ops: Record<string, string> = { ne: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=' };
      return `${quotedField} ${ops[operator]} ${lit}`;
    }
    if (operator === 'between' && value2 != null) {
      const lit = dateLit(value);
      const lit2 = dateLit(value2);
      if (lit === null || lit2 === null) {
        return '';
      }
      return `${quotedField} BETWEEN ${lit} AND ${lit2}`;
    }
    return '';
  }

  // ---- string + number columns ----

  // Escape single quotes in values
  const escapeValue = (v: string | number): string => {
    return String(v).replace(/'/g, "''");
  };

  const escapedValue = escapeValue(value);

  // Text operators — skip for numeric columns (ILIKE/LOWER() on a numeric
  // column is a type error in Postgres). LIKE-pattern metacharacters in the
  // user's value are escaped inside buildSQLTextMatch via the LIKE ESCAPE clause.
  if (columnType !== 'number') {
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
  }

  // Numeric operators — coerce to number to prevent SQL injection via string values.
  // Number.isFinite rejects NaN, Infinity, and -Infinity (Infinity would render
  // as the bare token `Infinity`, which the database rejects as a parse error).
  // A blank/whitespace string value is dropped so it never becomes `= 0`.
  if (operator === 'eq' || operator === 'ne' || operator === 'gt' || operator === 'lt' || operator === 'gte' || operator === 'lte') {
    if (isBlankNumericValue(value)) {
      return '';
    }
    const safeNum = Number(value);
    if (!Number.isFinite(safeNum)) {
      return '';
    }
    const ops: Record<string, string> = { eq: '=', ne: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=' };
    return `${quotedField} ${ops[operator]} ${safeNum}`;
  }
  if (operator === 'between' && value2 != null) {
    if (isBlankNumericValue(value) || isBlankNumericValue(value2)) {
      return '';
    }
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
export function buildSQLFilter(
  filters: FilterState,
  dialect: SqlDialect = 'postgres',
  types: ColumnTypeMap = {}
): string {
  const filterExpressions: string[] = [];

  for (const [fieldName, filter] of Object.entries(filters)) {
    if (!filter) {
      continue;
    }

    const expression = buildSQLFilterExpression(fieldName, filter, dialect, types[fieldName] ?? 'text');
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
 * Builds a SQL ORDER BY clause from an ordered sort state.
 * @param sortState - Ordered list of sort keys
 * @param dialect - SQL dialect for identifier quoting (default: 'postgres')
 * @returns SQL ORDER BY clause (e.g., `"Name" DESC` or `"a" ASC, "b" DESC`).
 *   Invalid / oversized keys are dropped individually; when no valid key
 *   remains, returns `1` — a SQL-standard no-op-shaped fallback that keeps
 *   dashboard templates like `ORDER BY ${gridSort:raw}` syntactically valid.
 */
export function buildSQLSort(sortState: SortState, dialect: SqlDialect = 'postgres'): string {
  const fragments: string[] = [];
  for (const key of sortState) {
    if (!key || !key.field || isOversizedIdentifier(key.field)) {
      continue;
    }
    // Quote field name for safety
    const quotedField = escapeSQLIdentifier(key.field, dialect);
    // Runtime guard: only ASC/DESC may reach the SQL string, even if a future
    // caller threads an untrusted SortState in (URL params, JSON, postMessage).
    const direction = key.direction === 'desc' ? 'DESC' : 'ASC';
    fragments.push(`${quotedField} ${direction}`);
  }

  if (fragments.length === 0) {
    return '1';
  }

  return fragments.join(', ');
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

  const limit = safePageInt(paginationState.pageSize, DEFAULT_PAGE_SIZE, 1);
  const currentPage = safePageInt(paginationState.currentPage, 0);
  return {
    limit,
    offset: clampPageMagnitude(currentPage * limit),
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
  dialect: SqlDialect = 'postgres',
  types: ColumnTypeMap = {}
): {
  where: string;
  orderby: string;
  limit: string;
  offset: string;
} {
  const pagination = buildSQLPagination(paginationState);

  return {
    where: buildSQLFilter(filters, dialect, types),
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

  // Build sort string: an ordered, comma-separated list where a descending key
  // is prefixed with `-` (e.g. `name,-price`). A single key reproduces the
  // previous single-key form exactly. Empty/field-less keys are dropped.
  const sortString = sortState
    .filter((key) => key && key.field)
    .map((key) => (key.direction === 'desc' ? `-${key.field}` : key.field))
    .join(',');

  return {
    filter: Object.keys(activeFilters).length > 0 ? JSON.stringify(activeFilters) : '',
    sort: sortString,
  };
}
