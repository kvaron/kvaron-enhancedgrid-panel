import { parseUrlFilters } from '../urlFilterParser';

const FIELDS = new Set(['name', 'price', 'status', 'created_at', 'notes']);

function parse(query: string) {
  return parseUrlFilters({
    filterVariableName: 'gridFilter',
    sortVariableName: 'gridSort',
    searchParams: new URLSearchParams(query),
    validFieldNames: FIELDS,
  });
}

describe('parseUrlFilters — happy path', () => {
  it('parses single text filter', () => {
    expect(parse('?gridFilter.name=contains:laptop')).toEqual({
      filters: { name: { operator: 'contains', value: 'laptop' } },
      sort: null,
      rejections: [],
    });
  });

  it('parses numeric comparison filter', () => {
    expect(parse('?gridFilter.price=gte:100')).toEqual({
      filters: { price: { operator: 'gte', value: '100' } },
      sort: null,
      rejections: [],
    });
  });

  it('parses between with two values', () => {
    expect(parse('?gridFilter.price=between:100:500')).toEqual({
      filters: { price: { operator: 'between', value: '100', value2: '500' } },
      sort: null,
      rejections: [],
    });
  });

  it('parses blank with no value', () => {
    expect(parse('?gridFilter.notes=blank')).toEqual({
      filters: { notes: { operator: 'blank', value: '' } },
      sort: null,
      rejections: [],
    });
  });

  it('parses not_blank with no value', () => {
    expect(parse('?gridFilter.notes=not_blank')).toEqual({
      filters: { notes: { operator: 'not_blank', value: '' } },
      sort: null,
      rejections: [],
    });
  });

  it('parses sort spec', () => {
    expect(parse('?gridSort=price:desc')).toEqual({
      filters: {},
      sort: [{ field: 'price', direction: 'desc' }],
      rejections: [],
    });
  });

  it('parses multiple filters and sort in one URL', () => {
    expect(
      parse(
        '?gridFilter.name=contains:laptop&gridFilter.price=between:100:500&gridSort=name:asc'
      )
    ).toEqual({
      filters: {
        name: { operator: 'contains', value: 'laptop' },
        price: { operator: 'between', value: '100', value2: '500' },
      },
      sort: [{ field: 'name', direction: 'asc' }],
      rejections: [],
    });
  });

  it('preserves URL-decoded characters in values', () => {
    expect(
      parse(
        // raw URL: gridFilter.name=contains:O%27Brien%20%26%20Sons
        `?gridFilter.name=${encodeURIComponent('contains:' + "O'Brien & Sons")}`
      )
    ).toEqual({
      filters: { name: { operator: 'contains', value: "O'Brien & Sons" } },
      sort: null,
      rejections: [],
    });
  });
});

describe('parseUrlFilters — rejections', () => {
  it('drops unknown operators', () => {
    const result = parse('?gridFilter.name=evil:foo');
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('unknown operator');
  });

  it('drops fields not in the allowlist', () => {
    const result = parse('?gridFilter.unknown=equals:foo');
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('not in data frame');
  });

  it('drops single-value operators that omit the value', () => {
    const result = parse('?gridFilter.name=contains');
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('requires a value');
  });

  it('drops between operator that omits value2', () => {
    const result = parse('?gridFilter.price=between:100');
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('requires two values');
  });

  it('drops blank operator if a value is supplied', () => {
    const result = parse('?gridFilter.notes=blank:something');
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('takes no value');
  });

  it('drops sort with invalid direction', () => {
    const result = parse('?gridSort=price:sideways');
    expect(result.sort).toBeNull();
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('asc or desc');
  });

  it('drops sort with field not in allowlist', () => {
    const result = parse('?gridSort=mystery:asc');
    expect(result.sort).toBeNull();
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('not in data frame');
  });

  it('drops malformed sort missing colon', () => {
    const result = parse('?gridSort=priceasc');
    expect(result.sort).toBeNull();
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('field:direction');
  });

  it('rejects raw-SQL injection attempt — operator is not in enum', () => {
    const result = parse(
      `?gridFilter.name=${encodeURIComponent("'; DROP TABLE users; --")}`
    );
    expect(result.filters).toEqual({});
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].reason).toContain('unknown operator');
  });

  it('isolates rejections — valid filters in same URL still apply', () => {
    const result = parse(
      '?gridFilter.name=contains:laptop&gridFilter.unknown=equals:x&gridSort=name:asc'
    );
    expect(result.filters).toEqual({
      name: { operator: 'contains', value: 'laptop' },
    });
    expect(result.sort).toEqual([{ field: 'name', direction: 'asc' }]);
    expect(result.rejections).toHaveLength(1);
  });
});

describe('parseUrlFilters — non-panel URL params', () => {
  it('ignores unrelated URL params', () => {
    expect(
      parse('?from=now-6h&to=now&var-other=value&gridFilter.name=contains:laptop')
    ).toEqual({
      filters: { name: { operator: 'contains', value: 'laptop' } },
      sort: null,
      rejections: [],
    });
  });

  it('ignores legacy `var-gridFilter=` raw form (panel will overwrite)', () => {
    // The legacy raw-SQL form is detected separately at the Grid.tsx mount
    // layer for the console warning; the parser itself is concerned only
    // with the structured `?gridFilter.{field}=` form.
    expect(parse(`?var-gridFilter=${encodeURIComponent("name = 'evil'")}`)).toEqual({
      filters: {},
      sort: null,
      rejections: [],
    });
  });
});

describe('parseUrlFilters — variable name customization', () => {
  it('honors a custom filter variable name', () => {
    const result = parseUrlFilters({
      filterVariableName: 'inventoryFilter',
      sortVariableName: 'inventorySort',
      searchParams: new URLSearchParams('?inventoryFilter.name=contains:laptop'),
      validFieldNames: FIELDS,
    });
    expect(result.filters).toEqual({
      name: { operator: 'contains', value: 'laptop' },
    });
  });

  it('does not pick up params for a different panel', () => {
    const result = parseUrlFilters({
      filterVariableName: 'gridA',
      sortVariableName: 'gridASort',
      searchParams: new URLSearchParams(
        '?gridA.name=contains:laptop&gridB.name=contains:should-be-ignored'
      ),
      validFieldNames: FIELDS,
    });
    expect(result.filters).toEqual({
      name: { operator: 'contains', value: 'laptop' },
    });
    expect(result.rejections).toEqual([]);
  });
});
