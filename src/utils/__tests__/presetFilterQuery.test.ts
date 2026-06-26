import { ConditionGroup, HighlightCondition, ConditionElement } from '../../types';
import { ColumnTypeMap } from '../odataQueryBuilder';
import { buildPresetODataFilter, buildPresetSQLFilter, combineFilters, TranslateResult } from '../presetFilterQuery';

/** Assert a successful translation and return its filter string (narrows the union). */
function okFilter(r: TranslateResult): string {
  expect(r.ok).toBe(true);
  return r.ok ? r.filter : '';
}

// --- builders -------------------------------------------------------------

function cond(partial: Partial<HighlightCondition> = {}): HighlightCondition {
  return {
    id: 'c',
    sourceField: 'name',
    operator: 'equals',
    compareType: 'value',
    compareValue: 'Acme',
    ...partial,
  };
}

function group(items: ConditionElement[], logicalOperator: 'AND' | 'OR' = 'AND'): ConditionGroup {
  return { id: 'g', type: 'group', logicalOperator, items };
}

const TYPES: ColumnTypeMap = {
  name: 'text',
  nick: 'text',
  age: 'number',
  age2: 'number',
  created: 'date',
  due: 'date',
  active: 'boolean',
};

// --- tests ----------------------------------------------------------------

describe('buildPresetODataFilter — core', () => {
  it('translates a single text equals (value) to a case-insensitive tolower comparison', () => {
    const g = group([cond({ sourceField: 'name', operator: 'equals', compareValue: 'Acme' })]);
    expect(buildPresetODataFilter(g, TYPES)).toEqual({ ok: true, filter: "tolower(name) eq 'acme'" });
  });

  it('combines an AND group with parentheses', () => {
    const g = group([
      cond({ sourceField: 'name', operator: 'contains', compareValue: 'ac' }),
      cond({ sourceField: 'age', operator: 'greater_than', compareValue: 30 }),
    ]);
    expect(buildPresetODataFilter(g, TYPES)).toEqual({
      ok: true,
      filter: "(contains(tolower(name), 'ac') and age gt 30)",
    });
  });

  it('combines an OR group with parentheses', () => {
    const g = group(
      [
        cond({ sourceField: 'name', operator: 'equals', compareValue: 'a' }),
        cond({ sourceField: 'name', operator: 'equals', compareValue: 'b' }),
      ],
      'OR'
    );
    expect(buildPresetODataFilter(g, TYPES)).toEqual({
      ok: true,
      filter: "(tolower(name) eq 'a' or tolower(name) eq 'b')",
    });
  });

  it('returns an empty filter for an empty top-level group', () => {
    expect(buildPresetODataFilter(group([]), TYPES)).toEqual({ ok: true, filter: '' });
  });
});

describe('buildPresetODataFilter — text operators', () => {
  const odata = (c: Partial<HighlightCondition>) =>
    buildPresetODataFilter(group([cond({ sourceField: 'name', ...c })]), TYPES);

  it('not_equals → ne', () => {
    expect(odata({ operator: 'not_equals', compareValue: 'X' })).toEqual({
      ok: true,
      filter: "tolower(name) ne 'x'",
    });
  });
  it('starts_with → startswith', () => {
    expect(odata({ operator: 'starts_with', compareValue: 'Ab' })).toEqual({
      ok: true,
      filter: "startswith(tolower(name), 'ab')",
    });
  });
  it('ends_with → endswith', () => {
    expect(odata({ operator: 'ends_with', compareValue: 'Z' })).toEqual({
      ok: true,
      filter: "endswith(tolower(name), 'z')",
    });
  });
  it('not_contains → not contains', () => {
    expect(odata({ operator: 'not_contains', compareValue: 'q' })).toEqual({
      ok: true,
      filter: "not contains(tolower(name), 'q')",
    });
  });
  it('is_null → eq null (no comparand)', () => {
    expect(odata({ operator: 'is_null', compareType: 'value', compareValue: undefined })).toEqual({
      ok: true,
      filter: 'name eq null',
    });
  });
  it('is_not_null → ne null', () => {
    expect(odata({ operator: 'is_not_null' })).toEqual({ ok: true, filter: 'name ne null' });
  });
});

describe('buildPresetSQLFilter — text operators (postgres)', () => {
  const sql = (c: Partial<HighlightCondition>) =>
    buildPresetSQLFilter(group([cond({ sourceField: 'name', ...c })]), 'postgres', TYPES);

  it('not_equals → NOT (equals)', () => {
    expect(sql({ operator: 'not_equals', compareValue: 'X' })).toEqual({
      ok: true,
      filter: `NOT (LOWER("name") = LOWER('X'))`,
    });
  });
  it('starts_with → ILIKE prefix', () => {
    expect(sql({ operator: 'starts_with', compareValue: 'Ab' })).toEqual({
      ok: true,
      filter: `"name" ILIKE 'Ab%' ESCAPE '!'`,
    });
  });
  it('ends_with → ILIKE suffix', () => {
    expect(sql({ operator: 'ends_with', compareValue: 'Z' })).toEqual({
      ok: true,
      filter: `"name" ILIKE '%Z' ESCAPE '!'`,
    });
  });
  it('not_contains → NOT (ILIKE)', () => {
    expect(sql({ operator: 'not_contains', compareValue: 'q' })).toEqual({
      ok: true,
      filter: `NOT ("name" ILIKE '%q%' ESCAPE '!')`,
    });
  });
  it('is_null → IS NULL (no comparand)', () => {
    expect(sql({ operator: 'is_null', compareType: 'value', compareValue: undefined })).toEqual({
      ok: true,
      filter: `"name" IS NULL`,
    });
  });
  it('is_not_null → IS NOT NULL', () => {
    expect(sql({ operator: 'is_not_null' })).toEqual({ ok: true, filter: `"name" IS NOT NULL` });
  });
});

describe('buildPresetODataFilter — number/date/boolean', () => {
  const odata = (c: Partial<HighlightCondition>) => okFilter(buildPresetODataFilter(group([cond(c)]), TYPES));

  it('number relational/equality ops', () => {
    expect(odata({ sourceField: 'age', operator: 'equals', compareValue: 30 })).toBe('age eq 30');
    expect(odata({ sourceField: 'age', operator: 'not_equals', compareValue: 30 })).toBe('age ne 30');
    expect(odata({ sourceField: 'age', operator: 'less_than', compareValue: 5 })).toBe('age lt 5');
    expect(odata({ sourceField: 'age', operator: 'greater_than_or_equal', compareValue: 5 })).toBe('age ge 5');
    expect(odata({ sourceField: 'age', operator: 'less_than_or_equal', compareValue: 5 })).toBe('age le 5');
  });

  it('date ops use an unquoted temporal literal', () => {
    expect(odata({ sourceField: 'created', operator: 'equals', compareValue: '2024-01-05' })).toBe(
      'created eq 2024-01-05'
    );
    expect(odata({ sourceField: 'created', operator: 'greater_than', compareValue: '2024-01-05' })).toBe(
      'created gt 2024-01-05'
    );
  });

  it('boolean equals/not_equals coerce to an Edm boolean', () => {
    expect(odata({ sourceField: 'active', operator: 'equals', compareValue: 'yes' })).toBe('active eq true');
    expect(odata({ sourceField: 'active', operator: 'not_equals', compareValue: 'false' })).toBe(
      'active ne false'
    );
  });
});

describe('buildPresetSQLFilter — number/date/boolean', () => {
  const pg = (c: Partial<HighlightCondition>) => okFilter(buildPresetSQLFilter(group([cond(c)]), 'postgres', TYPES));
  const mssql = (c: Partial<HighlightCondition>) =>
    okFilter(buildPresetSQLFilter(group([cond(c)]), 'sqlserver', TYPES));

  it('number ops (postgres)', () => {
    expect(pg({ sourceField: 'age', operator: 'equals', compareValue: 30 })).toBe(`"age" = 30`);
    expect(pg({ sourceField: 'age', operator: 'not_equals', compareValue: 30 })).toBe(`"age" != 30`);
    expect(pg({ sourceField: 'age', operator: 'less_than_or_equal', compareValue: 5 })).toBe(`"age" <= 5`);
  });

  it('number equals (sqlserver uses bracket identifiers)', () => {
    expect(mssql({ sourceField: 'age', operator: 'equals', compareValue: 30 })).toBe(`[age] = 30`);
  });

  it('date ops use a quoted literal (postgres)', () => {
    expect(pg({ sourceField: 'created', operator: 'equals', compareValue: '2024-01-05' })).toBe(
      `"created" = '2024-01-05'`
    );
    expect(pg({ sourceField: 'created', operator: 'not_equals', compareValue: '2024-01-05' })).toBe(
      `"created" != '2024-01-05'`
    );
  });

  it('boolean literal per dialect', () => {
    expect(pg({ sourceField: 'active', operator: 'equals', compareValue: 'yes' })).toBe(`"active" = TRUE`);
    expect(mssql({ sourceField: 'active', operator: 'equals', compareValue: 'yes' })).toBe(`[active] = 1`);
  });
});

describe('field-to-field comparands', () => {
  const fieldCond = (c: Partial<HighlightCondition>): HighlightCondition =>
    cond({ compareType: 'field', compareField: 'nick', compareValue: undefined, ...c });
  const od = (c: Partial<HighlightCondition>) => okFilter(buildPresetODataFilter(group([fieldCond(c)]), TYPES));
  const sq = (c: Partial<HighlightCondition>, d: 'postgres' | 'sqlserver' = 'postgres') =>
    okFilter(buildPresetSQLFilter(group([fieldCond(c)]), d, TYPES));

  it('OData text equals field → case-insensitive field-vs-field', () => {
    expect(od({ sourceField: 'name', operator: 'equals', compareField: 'nick' })).toBe('tolower(name) eq tolower(nick)');
  });
  it('OData text not_equals field', () => {
    expect(od({ sourceField: 'name', operator: 'not_equals', compareField: 'nick' })).toBe(
      'tolower(name) ne tolower(nick)'
    );
  });
  it('OData number gt field', () => {
    expect(od({ sourceField: 'age', operator: 'greater_than', compareField: 'age2' })).toBe('age gt age2');
  });
  it('OData date lt field', () => {
    expect(od({ sourceField: 'created', operator: 'less_than', compareField: 'due' })).toBe('created lt due');
  });
  it('SQL text equals field (postgres)', () => {
    expect(sq({ sourceField: 'name', operator: 'equals', compareField: 'nick' })).toBe(`LOWER("name") = LOWER("nick")`);
  });
  it('SQL text equals field (sqlserver)', () => {
    expect(sq({ sourceField: 'name', operator: 'equals', compareField: 'nick' }, 'sqlserver')).toBe(`[name] = [nick]`);
  });
  it('SQL number ge field (postgres)', () => {
    expect(sq({ sourceField: 'age', operator: 'greater_than_or_equal', compareField: 'age2' })).toBe(`"age" >= "age2"`);
  });

  it('LIKE-family with a field comparand is untranslatable (OData)', () => {
    expect(buildPresetODataFilter(group([fieldCond({ operator: 'contains', compareField: 'nick' })]), TYPES).ok).toBe(
      false
    );
  });
  it('LIKE-family with a field comparand is untranslatable (SQL)', () => {
    expect(
      buildPresetSQLFilter(group([fieldCond({ operator: 'starts_with', compareField: 'nick' })]), 'postgres', TYPES).ok
    ).toBe(false);
  });
});

describe('fail-safe coverage', () => {
  it('unknown source field → ok:false', () => {
    expect(buildPresetODataFilter(group([cond({ sourceField: 'missing' })]), TYPES).ok).toBe(false);
    expect(buildPresetSQLFilter(group([cond({ sourceField: 'missing' })]), 'postgres', TYPES).ok).toBe(false);
  });

  it('nested empty group → ok:false', () => {
    const nested = group([group([])]);
    expect(buildPresetODataFilter(nested, TYPES).ok).toBe(false);
    expect(buildPresetSQLFilter(nested, 'postgres', TYPES).ok).toBe(false);
  });

  it('invalid logical operator → ok:false', () => {
    const bad: ConditionGroup = {
      id: 'g',
      type: 'group',
      logicalOperator: 'XOR' as unknown as 'AND',
      items: [cond()],
    };
    expect(buildPresetODataFilter(bad, TYPES).ok).toBe(false);
  });

  it('missing compareValue on a value comparand → ok:false', () => {
    const c = cond({ sourceField: 'name', operator: 'equals', compareType: 'value', compareValue: undefined });
    expect(buildPresetODataFilter(group([c]), TYPES).ok).toBe(false);
    expect(buildPresetSQLFilter(group([c]), 'postgres', TYPES).ok).toBe(false);
  });

  it('field-comparand type mismatch → ok:false', () => {
    const c = cond({ sourceField: 'name', operator: 'equals', compareType: 'field', compareField: 'age' });
    expect(buildPresetODataFilter(group([c]), TYPES).ok).toBe(false);
    expect(buildPresetSQLFilter(group([c]), 'postgres', TYPES).ok).toBe(false);
  });

  it('oversized value → ok:false', () => {
    const c = cond({ sourceField: 'name', operator: 'equals', compareValue: 'x'.repeat(2000) });
    expect(buildPresetODataFilter(group([c]), TYPES).ok).toBe(false);
    expect(buildPresetSQLFilter(group([c]), 'postgres', TYPES).ok).toBe(false);
  });

  it('oversized identifier → ok:false', () => {
    const big = 'a'.repeat(300);
    const t: ColumnTypeMap = { [big]: 'text' };
    const c = cond({ sourceField: big, operator: 'equals', compareValue: 'v' });
    expect(buildPresetODataFilter(group([c]), t).ok).toBe(false);
    expect(buildPresetSQLFilter(group([c]), 'postgres', t).ok).toBe(false);
  });
});

describe('single-quote escaping round-trips', () => {
  it('doubles single quotes in OData and SQL literals', () => {
    const c = cond({ sourceField: 'name', operator: 'equals', compareValue: "O'Brien" });
    expect(buildPresetODataFilter(group([c]), TYPES)).toEqual({
      ok: true,
      filter: "tolower(name) eq 'o''brien'",
    });
    expect(buildPresetSQLFilter(group([c]), 'postgres', TYPES)).toEqual({
      ok: true,
      filter: `LOWER("name") = LOWER('O''Brien')`,
    });
  });
});

describe('combineFilters (AND-merge of interactive + preset)', () => {
  it('OData: a no-op interactive sentinel collapses to the preset fragment', () => {
    expect(combineFilters('odata', 'true', 'x eq 1')).toBe('x eq 1');
  });
  it('OData: both real → parenthesized AND', () => {
    expect(combineFilters('odata', 'a eq 1', 'x eq 2')).toBe('(a eq 1) and (x eq 2)');
  });
  it('OData: empty preset keeps the interactive sentinel', () => {
    expect(combineFilters('odata', 'true', '')).toBe('true');
  });
  it('SQL: no-op interactive (1=1) collapses to the preset fragment', () => {
    expect(combineFilters('sql', '1=1', '"x" = 2')).toBe('"x" = 2');
  });
  it('SQL: both real → parenthesized AND', () => {
    expect(combineFilters('sql', '"c" = 1', '"x" = 2')).toBe('("c" = 1) AND ("x" = 2)');
  });
  it('SQL: empty preset keeps the interactive value', () => {
    expect(combineFilters('sql', '"c" = 1', '')).toBe('"c" = 1');
  });
});

describe('buildPresetSQLFilter — core', () => {
  it('translates a single text equals (value) to LOWER()= for postgres', () => {
    const g = group([cond({ sourceField: 'name', operator: 'equals', compareValue: 'Acme' })]);
    expect(buildPresetSQLFilter(g, 'postgres', TYPES)).toEqual({
      ok: true,
      filter: `LOWER("name") = LOWER('Acme')`,
    });
  });

  it('combines an AND group with parentheses', () => {
    const g = group([
      cond({ sourceField: 'name', operator: 'contains', compareValue: 'ac' }),
      cond({ sourceField: 'age', operator: 'greater_than', compareValue: 30 }),
    ]);
    expect(buildPresetSQLFilter(g, 'postgres', TYPES)).toEqual({
      ok: true,
      filter: `("name" ILIKE '%ac%' ESCAPE '!' AND "age" > 30)`,
    });
  });

  it('returns an empty filter for an empty top-level group', () => {
    expect(buildPresetSQLFilter(group([]), 'postgres', TYPES)).toEqual({ ok: true, filter: '' });
  });
});
