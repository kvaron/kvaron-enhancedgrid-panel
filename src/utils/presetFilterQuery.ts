import {
  ColumnType,
  ComparisonOperator,
  ConditionElement,
  ConditionGroup,
  HighlightCondition,
  SqlDialect,
  isConditionGroup,
} from '../types';
import {
  ColumnTypeMap,
  buildSQLTextEquals,
  buildSQLTextMatch,
  coerceBooleanToken,
  escapeSQLIdentifier,
  formatTemporalLiteral,
  isOversizedIdentifier,
  isOversizedValue,
  isValidODataIdentifier,
  sqlBooleanLiteral,
} from './odataQueryBuilder';

// Relational + equality operators shared by number and date columns, mapped to
// their OData and SQL spellings. (Text uses tolower/LIKE forms; booleans use a
// coerced literal — both handled separately.)
const ODATA_REL_OPS: Partial<Record<ComparisonOperator, string>> = {
  equals: 'eq',
  not_equals: 'ne',
  greater_than: 'gt',
  less_than: 'lt',
  greater_than_or_equal: 'ge',
  less_than_or_equal: 'le',
};
const SQL_REL_OPS: Partial<Record<ComparisonOperator, string>> = {
  equals: '=',
  not_equals: '!=',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '>=',
  less_than_or_equal: '<=',
};

/**
 * Result of translating a preset's ConditionGroup into a server-side filter
 * fragment. `ok: false` means at least one leaf could not be translated
 * faithfully; the caller must NOT push a partial filter down (fail-safe).
 */
export type TranslateResult = { ok: true; filter: string } | { ok: false; reasons: string[] };

type Format = 'odata' | 'sql';

interface Ctx {
  format: Format;
  dialect: SqlDialect;
  types: ColumnTypeMap;
  reasons: string[];
}

/**
 * Translate a preset filter group into an OData $filter fragment. Mirrors the
 * semantics of the interactive `buildODataFilter` (case-insensitive text via
 * `tolower`, data-source null handling) so preset and interactive filters
 * behave identically server-side.
 */
export function buildPresetODataFilter(group: ConditionGroup, types: ColumnTypeMap): TranslateResult {
  return translate({ format: 'odata', dialect: 'postgres', types, reasons: [] }, group);
}

/**
 * Translate a preset filter group into a SQL WHERE fragment for the given
 * dialect. Mirrors the interactive `buildSQLFilter`.
 */
export function buildPresetSQLFilter(
  group: ConditionGroup,
  dialect: SqlDialect,
  types: ColumnTypeMap
): TranslateResult {
  return translate({ format: 'sql', dialect, types, reasons: [] }, group);
}

/**
 * AND-merge an interactive filter fragment with a translated preset fragment.
 * The interactive builders emit a no-op sentinel when no filter is active
 * (`true` for OData, `1=1` for SQL); those — and the empty string — are treated
 * as "no fragment" so the result never reads `(true) and (...)`.
 */
export function combineFilters(format: Format, interactive: string, preset: string): string {
  const sentinel = format === 'odata' ? 'true' : '1=1';
  const isEmpty = (s: string) => s === '' || s === sentinel;
  const a = isEmpty(interactive) ? '' : interactive;
  const b = isEmpty(preset) ? '' : preset;
  if (!a && !b) {
    return interactive;
  }
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return `(${a}) ${format === 'odata' ? 'and' : 'AND'} (${b})`;
}

function translate(ctx: Ctx, group: ConditionGroup): TranslateResult {
  // An empty top-level group means "no preset filter" — a valid no-op.
  if (group.items.length === 0) {
    return { ok: true, filter: '' };
  }
  const out = emitGroup(ctx, group);
  if (out === null) {
    return { ok: false, reasons: ctx.reasons };
  }
  return { ok: true, filter: out };
}

function emitGroup(ctx: Ctx, group: ConditionGroup): string | null {
  if (group.items.length === 0) {
    // A nested empty group evaluates to `false` client-side; rather than invent
    // a constant-false literal per format, fail-safe.
    ctx.reasons.push('empty condition group');
    return null;
  }
  if (group.logicalOperator !== 'AND' && group.logicalOperator !== 'OR') {
    ctx.reasons.push(`invalid logical operator "${group.logicalOperator}"`);
    return null;
  }
  const parts: string[] = [];
  for (const item of group.items) {
    const frag = emitElement(ctx, item);
    if (frag === null) {
      return null;
    }
    parts.push(frag);
  }
  if (parts.length === 1) {
    return parts[0];
  }
  const joiner =
    ctx.format === 'odata'
      ? group.logicalOperator === 'AND'
        ? 'and'
        : 'or'
      : group.logicalOperator;
  return `(${parts.join(` ${joiner} `)})`;
}

function emitElement(ctx: Ctx, element: ConditionElement): string | null {
  if (isConditionGroup(element)) {
    return emitGroup(ctx, element);
  }
  return emitCondition(ctx, element);
}

function emitCondition(ctx: Ctx, cond: HighlightCondition): string | null {
  const colType = ctx.types[cond.sourceField];
  if (!colType) {
    ctx.reasons.push(`unknown field "${cond.sourceField}"`);
    return null;
  }
  return ctx.format === 'odata' ? emitODataLeaf(ctx, cond, colType) : emitSQLLeaf(ctx, cond, colType);
}

/** Double single quotes for safe interpolation into a SQL/OData string literal. */
function escapeQuotes(value: string | number | boolean): string {
  return String(value).replace(/'/g, "''");
}

// The fuzzy text operators. With a field comparand these are untranslatable:
// the column's own LIKE metacharacters cannot be escaped at query-build time.
const LIKE_OPS = new Set<ComparisonOperator>(['contains', 'not_contains', 'starts_with', 'ends_with']);

type Comparand =
  | { kind: 'value'; raw: string | number | boolean | undefined }
  | { kind: 'field'; name: string; type: ColumnType };

/** Resolve a condition's right-hand side to a literal value or another field. */
function resolveComparand(ctx: Ctx, cond: HighlightCondition): Comparand | null {
  if (cond.compareType === 'field') {
    const cf = cond.compareField;
    if (!cf) {
      ctx.reasons.push(`missing comparand field for "${cond.sourceField}"`);
      return null;
    }
    const t = ctx.types[cf];
    if (!t) {
      ctx.reasons.push(`unknown comparand field "${cf}"`);
      return null;
    }
    return { kind: 'field', name: cf, type: t };
  }
  // Value comparand. A non-null operator with no value would emit `'undefined'`;
  // an oversized value is dropped just as the interactive builders drop it.
  if (cond.compareValue === undefined || cond.compareValue === null) {
    ctx.reasons.push(`missing value for "${cond.sourceField}"`);
    return null;
  }
  if (isOversizedValue(cond.compareValue)) {
    ctx.reasons.push(`oversized value for "${cond.sourceField}"`);
    return null;
  }
  return { kind: 'value', raw: cond.compareValue };
}

/** Reject a field-to-field comparison whose two columns have different types. */
function fieldTypeMismatch(ctx: Ctx, cmp: Comparand, colType: ColumnType, sourceField: string): boolean {
  if (cmp.kind === 'field' && cmp.type !== colType) {
    ctx.reasons.push(`field "${cmp.name}" (${cmp.type}) is not comparable to ${colType} "${sourceField}"`);
    return true;
  }
  return false;
}

function emitODataLeaf(ctx: Ctx, cond: HighlightCondition, colType: ColumnType): string | null {
  const field = cond.sourceField;
  if (!isValidODataIdentifier(field) || isOversizedIdentifier(field)) {
    ctx.reasons.push(`invalid OData field "${field}"`);
    return null;
  }
  const { operator } = cond;

  // Null operators apply to any column type and ignore the comparand.
  if (operator === 'is_null') {
    return `${field} eq null`;
  }
  if (operator === 'is_not_null') {
    return `${field} ne null`;
  }

  const cmp = resolveComparand(ctx, cond);
  if (cmp === null) {
    return null;
  }
  if (cmp.kind === 'field' && LIKE_OPS.has(operator)) {
    ctx.reasons.push(`"${operator}" against a field is unsupported for "${field}"`);
    return null;
  }
  if (fieldTypeMismatch(ctx, cmp, colType, field)) {
    return null;
  }

  if (colType === 'text') {
    if (operator === 'equals' || operator === 'not_equals') {
      const rhs = cmp.kind === 'field' ? `tolower(${cmp.name})` : `'${escapeQuotes(cmp.raw ?? '').toLowerCase()}'`;
      return `tolower(${field}) ${operator === 'not_equals' ? 'ne' : 'eq'} ${rhs}`;
    }
    // LIKE-family — value comparand only (field already rejected above).
    const v = escapeQuotes((cmp.kind === 'value' ? cmp.raw : undefined) ?? '').toLowerCase();
    switch (operator) {
      case 'contains':
        return `contains(tolower(${field}), '${v}')`;
      case 'not_contains':
        return `not contains(tolower(${field}), '${v}')`;
      case 'starts_with':
        return `startswith(tolower(${field}), '${v}')`;
      case 'ends_with':
        return `endswith(tolower(${field}), '${v}')`;
    }
  }

  if (colType === 'number') {
    const op = ODATA_REL_OPS[operator];
    if (op) {
      if (cmp.kind === 'field') {
        return `${field} ${op} ${cmp.name}`;
      }
      const n = Number(cmp.raw);
      if (!Number.isFinite(n)) {
        ctx.reasons.push(`non-numeric value for "${field}"`);
        return null;
      }
      return `${field} ${op} ${n}`;
    }
  }

  if (colType === 'date') {
    const op = ODATA_REL_OPS[operator];
    if (op) {
      if (cmp.kind === 'field') {
        return `${field} ${op} ${cmp.name}`;
      }
      const lit = formatTemporalLiteral((cmp.raw ?? '') as string | number);
      if (lit === null) {
        ctx.reasons.push(`invalid date literal for "${field}"`);
        return null;
      }
      return `${field} ${op} ${lit}`;
    }
  }

  if (colType === 'boolean' && (operator === 'equals' || operator === 'not_equals')) {
    const odataOp = operator === 'not_equals' ? 'ne' : 'eq';
    if (cmp.kind === 'field') {
      return `${field} ${odataOp} ${cmp.name}`;
    }
    const tok = coerceBooleanToken((cmp.raw ?? '') as string | number);
    if (tok === null) {
      ctx.reasons.push(`non-boolean value for "${field}"`);
      return null;
    }
    return `${field} ${odataOp} ${tok}`;
  }

  ctx.reasons.push(`unsupported operator "${operator}" on ${colType} field "${field}"`);
  return null;
}

function emitSQLLeaf(ctx: Ctx, cond: HighlightCondition, colType: ColumnType): string | null {
  const field = cond.sourceField;
  if (isOversizedIdentifier(field)) {
    ctx.reasons.push(`oversized field "${field}"`);
    return null;
  }
  const quoted = escapeSQLIdentifier(field, ctx.dialect);
  const { operator } = cond;

  // Null operators apply to any column type and ignore the comparand.
  if (operator === 'is_null') {
    return `${quoted} IS NULL`;
  }
  if (operator === 'is_not_null') {
    return `${quoted} IS NOT NULL`;
  }

  const cmp = resolveComparand(ctx, cond);
  if (cmp === null) {
    return null;
  }
  if (cmp.kind === 'field' && LIKE_OPS.has(operator)) {
    ctx.reasons.push(`"${operator}" against a field is unsupported for "${field}"`);
    return null;
  }
  if (fieldTypeMismatch(ctx, cmp, colType, field)) {
    return null;
  }
  const cmpQuoted = cmp.kind === 'field' ? escapeSQLIdentifier(cmp.name, ctx.dialect) : '';

  if (colType === 'text') {
    if (operator === 'equals' || operator === 'not_equals') {
      const eqExpr =
        cmp.kind === 'field'
          ? ctx.dialect === 'sqlserver'
            ? `${quoted} = ${cmpQuoted}`
            : `LOWER(${quoted}) = LOWER(${cmpQuoted})`
          : buildSQLTextEquals(quoted, escapeQuotes(cmp.raw ?? ''), ctx.dialect);
      return operator === 'not_equals' ? `NOT (${eqExpr})` : eqExpr;
    }
    // LIKE-family — value comparand only (field already rejected above).
    const v = escapeQuotes((cmp.kind === 'value' ? cmp.raw : undefined) ?? '');
    switch (operator) {
      case 'contains':
        return buildSQLTextMatch(quoted, v, 'contains', ctx.dialect);
      case 'not_contains':
        return `NOT (${buildSQLTextMatch(quoted, v, 'contains', ctx.dialect)})`;
      case 'starts_with':
        return buildSQLTextMatch(quoted, v, 'starts_with', ctx.dialect);
      case 'ends_with':
        return buildSQLTextMatch(quoted, v, 'ends_with', ctx.dialect);
    }
  }

  if (colType === 'number') {
    const op = SQL_REL_OPS[operator];
    if (op) {
      if (cmp.kind === 'field') {
        return `${quoted} ${op} ${cmpQuoted}`;
      }
      const n = Number(cmp.raw);
      if (!Number.isFinite(n)) {
        ctx.reasons.push(`non-numeric value for "${field}"`);
        return null;
      }
      return `${quoted} ${op} ${n}`;
    }
  }

  if (colType === 'date') {
    const op = SQL_REL_OPS[operator];
    if (op) {
      if (cmp.kind === 'field') {
        return `${quoted} ${op} ${cmpQuoted}`;
      }
      const lit = formatTemporalLiteral((cmp.raw ?? '') as string | number);
      if (lit === null) {
        ctx.reasons.push(`invalid date literal for "${field}"`);
        return null;
      }
      return `${quoted} ${op} '${lit}'`;
    }
  }

  if (colType === 'boolean' && (operator === 'equals' || operator === 'not_equals')) {
    const sop = operator === 'not_equals' ? '!=' : '=';
    if (cmp.kind === 'field') {
      return `${quoted} ${sop} ${cmpQuoted}`;
    }
    const lit = sqlBooleanLiteral((cmp.raw ?? '') as string | number, ctx.dialect);
    if (lit === null) {
      ctx.reasons.push(`non-boolean value for "${field}"`);
      return null;
    }
    return `${quoted} ${sop} ${lit}`;
  }

  ctx.reasons.push(`unsupported operator "${operator}" on ${colType} field "${field}"`);
  return null;
}
