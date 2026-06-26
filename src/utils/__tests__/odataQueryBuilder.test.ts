import {
  buildGenericQuery,
  buildODataFilter,
  buildODataPagination,
  buildODataQuery,
  buildODataSort,
  buildSQLFilter,
  buildSQLPagination,
  buildSQLQuery,
  buildSQLSort,
} from '../odataQueryBuilder';

describe('SQL query builder filtering', () => {
  it('builds SQL filters for text, numeric, blank, and range operators (default postgres)', () => {
    expect(
      buildSQLFilter({
        name: { operator: 'contains', value: "O'Brien" },
        age: { operator: 'gte', value: 21 },
        score: { operator: 'between', value: 10, value2: 20 },
        notes: { operator: 'not_blank', value: '' },
      })
    ).toBe(
      `"name" ILIKE '%O''Brien%' ESCAPE '!' AND "age" >= 21 AND "score" BETWEEN 10 AND 20 AND ("notes" IS NOT NULL AND "notes" != '' AND TRIM("notes") != '')`
    );
  });

  it('quotes identifiers and ignores unsafe numeric values', () => {
    expect(
      buildSQLFilter({
        'user"name': { operator: 'equals', value: 'Ada' },
        age: { operator: 'gt', value: '1; DROP TABLE users' },
      })
    ).toBe(`LOWER("user""name") = LOWER('Ada')`);
  });

  it('builds complete SQL query variable values with pagination and sorting', () => {
    expect(
      buildSQLQuery(
        {
          status: { operator: 'equals', value: 'active' },
        },
        [{ field: 'created at', direction: 'desc' }],
        { currentPage: 2, pageSize: 25 }
      )
    ).toEqual({
      where: `LOWER("status") = LOWER('active')`,
      orderby: `"created at" DESC`,
      limit: '25',
      offset: '50',
    });
  });
});

describe('SQL dialect: postgres', () => {
  it('uses ILIKE for fuzzy text operators and LOWER(col) = LOWER(val) for equals', () => {
    expect(
      buildSQLFilter(
        {
          name: { operator: 'contains', value: 'foo' },
          email: { operator: 'starts_with', value: 'a@' },
          domain: { operator: 'ends_with', value: '.io' },
          status: { operator: 'equals', value: 'Active' },
        },
        'postgres'
      )
    ).toBe(
      `"name" ILIKE '%foo%' ESCAPE '!' AND "email" ILIKE 'a@%' ESCAPE '!' AND "domain" ILIKE '%.io' ESCAPE '!' AND LOWER("status") = LOWER('Active')`
    );
  });

  it('does not interpret user-typed % or _ as wildcards in equals', () => {
    expect(
      buildSQLFilter({ name: { operator: 'equals', value: '%admin%' } }, 'postgres')
    ).toBe(`LOWER("name") = LOWER('%admin%')`);
  });

  it('escapes LIKE metacharacters in fuzzy operator values', () => {
    expect(
      buildSQLFilter(
        {
          a: { operator: 'contains', value: '50%' },
          b: { operator: 'starts_with', value: 'a_b' },
          c: { operator: 'ends_with', value: 'foo!bar' },
        },
        'postgres'
      )
    ).toBe(
      `"a" ILIKE '%50!%%' ESCAPE '!' AND "b" ILIKE 'a!_b%' ESCAPE '!' AND "c" ILIKE '%foo!!bar' ESCAPE '!'`
    );
  });

  it('quotes sort identifier with double quotes', () => {
    expect(buildSQLSort([{ field: 'created at', direction: 'asc' }], 'postgres')).toBe(`"created at" ASC`);
  });
});

describe('SQL dialect: sqlserver', () => {
  it('uses LIKE for fuzzy text operators and = for equals', () => {
    expect(
      buildSQLFilter(
        {
          name: { operator: 'contains', value: 'foo' },
          email: { operator: 'starts_with', value: 'a@' },
          domain: { operator: 'ends_with', value: '.io' },
          status: { operator: 'equals', value: 'Active' },
        },
        'sqlserver'
      )
    ).toBe(
      `[name] LIKE '%foo%' ESCAPE '!' AND [email] LIKE 'a@%' ESCAPE '!' AND [domain] LIKE '%.io' ESCAPE '!' AND [status] = 'Active'`
    );
  });

  it('escapes LIKE bracket character classes (SQL Server-specific)', () => {
    expect(
      buildSQLFilter({ name: { operator: 'contains', value: '[admin]' } }, 'sqlserver')
    ).toBe(`[name] LIKE '%![admin]%' ESCAPE '!'`);
  });

  it('escapes closing brackets in identifiers and single quotes in values', () => {
    expect(
      buildSQLFilter(
        {
          'weird]name': { operator: 'equals', value: "O'Brien" },
        },
        'sqlserver'
      )
    ).toBe(`[weird]]name] = 'O''Brien'`);
  });

  it('still emits dialect-agnostic numeric and blank operators', () => {
    expect(
      buildSQLFilter(
        {
          age: { operator: 'gte', value: 21 },
          notes: { operator: 'blank', value: '' },
          score: { operator: 'between', value: 10, value2: 20 },
        },
        'sqlserver'
      )
    ).toBe(
      `[age] >= 21 AND ([notes] IS NULL OR [notes] = '' OR TRIM([notes]) = '') AND [score] BETWEEN 10 AND 20`
    );
  });

  it('quotes sort identifier with brackets', () => {
    expect(buildSQLSort([{ field: 'created at', direction: 'desc' }], 'sqlserver')).toBe(`[created at] DESC`);
  });

  it('threads dialect through buildSQLQuery', () => {
    expect(
      buildSQLQuery(
        { status: { operator: 'equals', value: 'active' } },
        [{ field: 'name', direction: 'asc' }],
        { currentPage: 0, pageSize: 10 },
        'sqlserver'
      )
    ).toEqual({
      where: `[status] = 'active'`,
      orderby: `[name] ASC`,
      limit: '10',
      offset: '0',
    });
  });
});

describe('SQL dialect: ansi', () => {
  it('wraps fuzzy text operators in LOWER(...) LIKE LOWER(...) and equals in LOWER(...) = LOWER(...)', () => {
    expect(
      buildSQLFilter(
        {
          name: { operator: 'contains', value: 'foo' },
          email: { operator: 'starts_with', value: 'a@' },
          domain: { operator: 'ends_with', value: '.io' },
          status: { operator: 'equals', value: 'Active' },
        },
        'ansi'
      )
    ).toBe(
      `LOWER("name") LIKE LOWER('%foo%') ESCAPE '!' AND LOWER("email") LIKE LOWER('a@%') ESCAPE '!' AND LOWER("domain") LIKE LOWER('%.io') ESCAPE '!' AND LOWER("status") = LOWER('Active')`
    );
  });

  it('escapes single quotes in values inside the LOWER literal', () => {
    expect(
      buildSQLFilter(
        {
          name: { operator: 'contains', value: "O'Brien" },
        },
        'ansi'
      )
    ).toBe(`LOWER("name") LIKE LOWER('%O''Brien%') ESCAPE '!'`);
  });

  it('quotes sort identifier with double quotes', () => {
    expect(buildSQLSort([{ field: 'name', direction: 'asc' }], 'ansi')).toBe(`"name" ASC`);
  });

  it('threads dialect through buildSQLQuery', () => {
    expect(
      buildSQLQuery(
        { status: { operator: 'equals', value: 'active' } },
        [{ field: 'name', direction: 'desc' }],
        null,
        'ansi'
      )
    ).toEqual({
      where: `LOWER("status") = LOWER('active')`,
      orderby: `"name" DESC`,
      limit: '50',
      offset: '0',
    });
  });

  it('escapes the LIKE escape character itself when present in the value', () => {
    expect(
      buildSQLFilter({ name: { operator: 'contains', value: 'wow!' } }, 'ansi')
    ).toBe(`LOWER("name") LIKE LOWER('%wow!!%') ESCAPE '!'`);
  });

  it('rejects untrusted sort direction strings at runtime, defaulting to ASC', () => {
    // Type-system-bypass scenario: TS says 'asc' | 'desc', but a future caller
    // could thread an untrusted string in — must not reach the SQL string.
    expect(
      buildSQLSort([{ field: 'name', direction: 'asc; DROP TABLE x; --' as 'asc' }], 'ansi')
    ).toBe(`"name" ASC`);
  });
});

describe('numeric operator robustness', () => {
  it('drops fragments for non-finite values, returning the SQL-valid no-op', () => {
    expect(buildSQLFilter({ a: { operator: 'gt', value: Infinity } }, 'postgres')).toBe('1=1');
    expect(buildSQLFilter({ a: { operator: 'gt', value: -Infinity } }, 'postgres')).toBe('1=1');
    expect(buildSQLFilter({ a: { operator: 'gt', value: NaN } }, 'postgres')).toBe('1=1');
  });

  it('drops between fragments when either bound is non-finite (returns 1=1 no-op)', () => {
    expect(
      buildSQLFilter({ a: { operator: 'between', value: 1, value2: Infinity } }, 'postgres')
    ).toBe('1=1');
    expect(
      buildSQLFilter({ a: { operator: 'between', value: NaN, value2: 10 } }, 'postgres')
    ).toBe('1=1');
  });

  it('still accepts finite numeric strings via Number() coercion', () => {
    expect(buildSQLFilter({ a: { operator: 'gt', value: '42' } }, 'postgres')).toBe(`"a" > 42`);
    expect(buildSQLFilter({ a: { operator: 'eq', value: '1e3' } }, 'postgres')).toBe(`"a" = 1000`);
  });
});

describe('pagination coercion', () => {
  it('falls back to defaults when paginationState is null', () => {
    expect(buildSQLPagination(null)).toEqual({ limit: 50, offset: 0 });
    expect(buildODataPagination(null)).toEqual({ skip: 0, top: 50 });
  });

  it('coerces non-finite or negative values to defaults', () => {
    expect(
      buildSQLPagination({ currentPage: NaN as unknown as number, pageSize: 25 })
    ).toEqual({ limit: 25, offset: 0 });
    expect(
      buildSQLPagination({ currentPage: 2, pageSize: Infinity as unknown as number })
    ).toEqual({ limit: 50, offset: 100 });
    expect(
      buildSQLPagination({ currentPage: -1, pageSize: 25 })
    ).toEqual({ limit: 25, offset: 0 });
  });

  it('coerces string-typed pagination fields (TS-erasure scenario)', () => {
    expect(
      buildSQLPagination({
        currentPage: '3' as unknown as number,
        pageSize: '25' as unknown as number,
      })
    ).toEqual({ limit: 25, offset: 75 });
  });

  it('drops injection payloads via Number() coercion', () => {
    expect(
      buildSQLPagination({
        currentPage: '0; DROP TABLE x' as unknown as number,
        pageSize: '25' as unknown as number,
      })
    ).toEqual({ limit: 25, offset: 0 });
    expect(
      buildSQLPagination({
        currentPage: 0,
        pageSize: '25 OFFSET 0; DROP TABLE x' as unknown as number,
      })
    ).toEqual({ limit: 50, offset: 0 });
  });
});

describe('OData identifier validation', () => {
  it('accepts valid OData identifiers', () => {
    expect(buildODataFilter({ Name: { operator: 'contains', value: 'foo' } })).toBe(
      `contains(tolower(Name), 'foo')`
    );
    expect(
      buildODataFilter({ Created_At: { operator: 'gt', value: 100 } })
    ).toBe(`Created_At gt 100`);
    expect(buildODataSort([{ field: 'Name', direction: 'desc' }])).toBe(`Name desc`);
  });

  it('drops field names with whitespace, punctuation, or operators (returns true no-op)', () => {
    expect(
      buildODataFilter({ 'created at': { operator: 'contains', value: 'x' } })
    ).toBe('true');
    expect(
      buildODataFilter({ "evil') OR ('1": { operator: 'contains', value: 'x' } })
    ).toBe('true');
    expect(buildODataSort([{ field: "x; DROP TABLE y", direction: 'asc' }])).toBe('');
  });

  it('drops field names that start with a digit (returns true no-op)', () => {
    expect(
      buildODataFilter({ '1stColumn': { operator: 'contains', value: 'x' } })
    ).toBe('true');
  });

  it('drops invalid fields independently — other valid filters survive', () => {
    expect(
      buildODataFilter({
        Name: { operator: 'contains', value: 'foo' },
        'evil); --': { operator: 'contains', value: 'bar' },
        Email: { operator: 'starts_with', value: 'a@' },
      })
    ).toBe(
      `contains(tolower(Name), 'foo') and startswith(tolower(Email), 'a@')`
    );
  });

  it('rejects untrusted sort direction strings at runtime, defaulting to asc', () => {
    expect(
      buildODataSort([{ field: 'Name', direction: 'asc; DROP TABLE x; --' as 'asc' }])
    ).toBe(`Name asc`);
  });
});

describe('OData empty-state no-op', () => {
  it('returns the `true` boolean literal when no filters are active', () => {
    // `$filter=true` matches all rows and is valid OData V4, unlike a bare
    // `$filter=` which strict services reject. Mirrors the SQL `1=1` no-op.
    expect(buildODataFilter({})).toBe('true');
  });

  it('returns `true` for the filter and empty for orderby in buildODataQuery', () => {
    expect(
      buildODataQuery({}, [], null)
    ).toEqual({
      filter: 'true',
      orderby: '',
      skip: '0',
      top: '50',
    });
  });
});

describe('multi-key (sequential) sort', () => {
  it('buildSQLSort postgres: two keys -> "a" ASC, "b" DESC', () => {
    expect(
      buildSQLSort(
        [
          { field: 'a', direction: 'asc' },
          { field: 'b', direction: 'desc' },
        ],
        'postgres'
      )
    ).toBe(`"a" ASC, "b" DESC`);
  });

  it('buildSQLSort sqlserver: two keys -> [a] ASC, [b] DESC', () => {
    expect(
      buildSQLSort(
        [
          { field: 'a', direction: 'asc' },
          { field: 'b', direction: 'desc' },
        ],
        'sqlserver'
      )
    ).toBe(`[a] ASC, [b] DESC`);
  });

  it('buildSQLSort ansi: two keys -> "a" ASC, "b" DESC', () => {
    expect(
      buildSQLSort(
        [
          { field: 'a', direction: 'asc' },
          { field: 'b', direction: 'desc' },
        ],
        'ansi'
      )
    ).toBe(`"a" ASC, "b" DESC`);
  });

  it('buildODataSort: two keys -> a asc, b desc', () => {
    expect(
      buildODataSort([
        { field: 'a', direction: 'asc' },
        { field: 'b', direction: 'desc' },
      ])
    ).toBe(`a asc, b desc`);
  });

  it('buildGenericQuery (json): emits a multi-key comma-separated sort form', () => {
    expect(
      buildGenericQuery({}, [
        { field: 'a', direction: 'asc' },
        { field: 'b', direction: 'desc' },
      ]).sort
    ).toBe('a,-b');
  });

  it('single-key buildSQLSort is byte-identical to the legacy single-key form (per dialect)', () => {
    expect(buildSQLSort([{ field: 'name', direction: 'desc' }], 'postgres')).toBe(`"name" DESC`);
    expect(buildSQLSort([{ field: 'name', direction: 'desc' }], 'sqlserver')).toBe(`[name] DESC`);
    expect(buildSQLSort([{ field: 'name', direction: 'desc' }], 'ansi')).toBe(`"name" DESC`);
  });

  it('single-key buildODataSort is byte-identical to the legacy single-key form', () => {
    expect(buildODataSort([{ field: 'name', direction: 'desc' }])).toBe(`name desc`);
  });

  it('empty sort -> buildSQLSort yields 1 (per dialect)', () => {
    expect(buildSQLSort([], 'postgres')).toBe('1');
    expect(buildSQLSort([], 'sqlserver')).toBe('1');
    expect(buildSQLSort([], 'ansi')).toBe('1');
  });

  it('empty sort -> buildODataSort yields empty string', () => {
    expect(buildODataSort([])).toBe('');
  });

  it('drops invalid keys individually while remaining keys still emit (SQL)', () => {
    const longField = 'f'.repeat(257);
    expect(
      buildSQLSort(
        [
          { field: 'a', direction: 'asc' },
          { field: longField, direction: 'desc' }, // oversized -> dropped
          { field: 'b', direction: 'desc' },
        ],
        'postgres'
      )
    ).toBe(`"a" ASC, "b" DESC`);
  });

  it('drops unknown-identifier/oversized keys individually while remaining keys still emit (OData)', () => {
    const longField = 'f'.repeat(257);
    expect(
      buildODataSort([
        { field: 'a', direction: 'asc' },
        { field: 'bad name', direction: 'asc' }, // invalid OData identifier -> dropped
        { field: longField, direction: 'desc' }, // oversized -> dropped
        { field: 'b', direction: 'desc' },
      ])
    ).toBe(`a asc, b desc`);
  });

  it('all-invalid keys collapse to the empty no-op (SQL 1 / OData empty)', () => {
    const longField = 'f'.repeat(257);
    expect(buildSQLSort([{ field: longField, direction: 'asc' }], 'postgres')).toBe('1');
    expect(buildODataSort([{ field: 'bad name', direction: 'asc' }])).toBe('');
  });
});

describe('length caps', () => {
  const longValue = 'a'.repeat(1025);
  const okValue = 'a'.repeat(1024);
  const longField = 'f'.repeat(257);
  const okField = 'f'.repeat(256);

  describe('SQL', () => {
    it('drops fragment when filter value exceeds 1024 chars (returns 1=1 no-op)', () => {
      expect(
        buildSQLFilter({ name: { operator: 'contains', value: longValue } }, 'postgres')
      ).toBe('1=1');
    });

    it('still emits fragment for value at the 1024-char boundary', () => {
      expect(
        buildSQLFilter({ name: { operator: 'contains', value: okValue } }, 'postgres')
      ).toBe(`"name" ILIKE '%${okValue}%' ESCAPE '!'`);
    });

    it('drops fragment when between value2 exceeds the cap (returns 1=1 no-op)', () => {
      expect(
        buildSQLFilter(
          { age: { operator: 'between', value: 1, value2: longValue } },
          'postgres'
        )
      ).toBe('1=1');
    });

    it('drops fragment when field name exceeds 256 chars (returns 1=1 no-op)', () => {
      expect(
        buildSQLFilter({ [longField]: { operator: 'equals', value: 'x' } }, 'postgres')
      ).toBe('1=1');
    });

    it('drops sort when field name exceeds 256 chars (returns ORDER BY 1 no-op)', () => {
      expect(buildSQLSort([{ field: longField, direction: 'asc' }], 'postgres')).toBe('1');
    });

    it('still sorts on field at the 256-char boundary', () => {
      expect(buildSQLSort([{ field: okField, direction: 'asc' }], 'postgres')).toBe(
        `"${okField}" ASC`
      );
    });
  });

  describe('OData', () => {
    it('drops fragment when filter value exceeds 1024 chars (returns true no-op)', () => {
      expect(
        buildODataFilter({ Name: { operator: 'contains', value: longValue } })
      ).toBe('true');
    });

    it('drops sort when field name exceeds 256 chars', () => {
      expect(buildODataSort([{ field: longField, direction: 'asc' }])).toBe('');
    });
  });
});

describe('OData type-aware filters: boolean', () => {
  it('maps text-style equals/contains to an unquoted Edm boolean literal', () => {
    expect(
      buildODataFilter({ Active: { operator: 'equals', value: 'true' } }, { Active: 'boolean' })
    ).toBe('Active eq true');
    expect(
      buildODataFilter({ Active: { operator: 'contains', value: 'False' } }, { Active: 'boolean' })
    ).toBe('Active eq false');
  });

  it('coerces common truthy/falsy tokens and supports ne', () => {
    expect(buildODataFilter({ A: { operator: 'starts_with', value: 'yes' } }, { A: 'boolean' })).toBe('A eq true');
    expect(buildODataFilter({ A: { operator: 'ends_with', value: '0' } }, { A: 'boolean' })).toBe('A eq false');
    expect(buildODataFilter({ A: { operator: 'ne', value: 'true' } }, { A: 'boolean' })).toBe('A ne true');
  });

  it('drops a boolean filter whose value is not boolean-like (returns true no-op)', () => {
    expect(buildODataFilter({ A: { operator: 'equals', value: 'maybe' } }, { A: 'boolean' })).toBe('true');
  });

  it("uses a null check for blank/not_blank on boolean (no eq '')", () => {
    expect(buildODataFilter({ A: { operator: 'blank', value: '' } }, { A: 'boolean' })).toBe('A eq null');
    expect(buildODataFilter({ A: { operator: 'not_blank', value: '' } }, { A: 'boolean' })).toBe('A ne null');
  });
});

describe('OData type-aware filters: date', () => {
  it('maps equals to an unquoted Edm.Date literal', () => {
    expect(
      buildODataFilter({ Created: { operator: 'equals', value: '2024-01-15' } }, { Created: 'date' })
    ).toBe('Created eq 2024-01-15');
  });

  it('accepts Edm.DateTimeOffset literals', () => {
    expect(
      buildODataFilter({ Created: { operator: 'equals', value: '2024-01-15T08:30:00Z' } }, { Created: 'date' })
    ).toBe('Created eq 2024-01-15T08:30:00Z');
  });

  it('maps comparison operators to unquoted date literals', () => {
    expect(buildODataFilter({ D: { operator: 'gt', value: '2024-01-01' } }, { D: 'date' })).toBe('D gt 2024-01-01');
    expect(buildODataFilter({ D: { operator: 'lte', value: '2024-12-31' } }, { D: 'date' })).toBe('D le 2024-12-31');
  });

  it('maps between to a closed date range', () => {
    expect(
      buildODataFilter({ D: { operator: 'between', value: '2024-01-01', value2: '2024-06-30' } }, { D: 'date' })
    ).toBe('(D ge 2024-01-01 and D le 2024-06-30)');
  });

  it('drops fuzzy operators and invalid/injected date values (returns true no-op)', () => {
    expect(buildODataFilter({ D: { operator: 'contains', value: '2024' } }, { D: 'date' })).toBe('true');
    expect(buildODataFilter({ D: { operator: 'starts_with', value: '2024' } }, { D: 'date' })).toBe('true');
    expect(buildODataFilter({ D: { operator: 'equals', value: "2024' or '1'='1" } }, { D: 'date' })).toBe('true');
    expect(buildODataFilter({ D: { operator: 'equals', value: 'not-a-date' } }, { D: 'date' })).toBe('true');
  });

  it("uses a null check for blank/not_blank on date (no eq '')", () => {
    expect(buildODataFilter({ D: { operator: 'blank', value: '' } }, { D: 'date' })).toBe('D eq null');
    expect(buildODataFilter({ D: { operator: 'not_blank', value: '' } }, { D: 'date' })).toBe('D ne null');
  });
});

describe('OData type-aware filters: number blank/not_blank', () => {
  it("uses a null check only (no eq '') for numeric columns", () => {
    expect(buildODataFilter({ Age: { operator: 'blank', value: '' } }, { Age: 'number' })).toBe('Age eq null');
    expect(buildODataFilter({ Age: { operator: 'not_blank', value: '' } }, { Age: 'number' })).toBe('Age ne null');
  });

  it('still emits numeric comparisons unchanged', () => {
    expect(buildODataFilter({ Age: { operator: 'gte', value: 21 } }, { Age: 'number' })).toBe('Age ge 21');
  });
});

describe('OData type-aware filters: string unchanged + defaults', () => {
  it('keeps tolower/contains for string columns', () => {
    expect(buildODataFilter({ Name: { operator: 'contains', value: 'Foo' } }, { Name: 'text' })).toBe(
      `contains(tolower(Name), 'foo')`
    );
  });

  it("keeps the legacy blank form (eq null or eq '') for string columns", () => {
    expect(buildODataFilter({ Name: { operator: 'blank', value: '' } }, { Name: 'text' })).toBe(
      `(Name eq null or Name eq '')`
    );
  });

  it('defaults to string behavior when no type map is supplied', () => {
    expect(buildODataFilter({ Name: { operator: 'equals', value: 'Bar' } })).toBe(`tolower(Name) eq 'bar'`);
  });
});

describe('SQL type-aware filters', () => {
  it('boolean: maps text operators to dialect boolean literals', () => {
    expect(buildSQLFilter({ Active: { operator: 'equals', value: 'true' } }, 'postgres', { Active: 'boolean' })).toBe(
      `"Active" = TRUE`
    );
    expect(buildSQLFilter({ Active: { operator: 'equals', value: 'no' } }, 'sqlserver', { Active: 'boolean' })).toBe(
      `[Active] = 0`
    );
  });

  it('date: equality/comparison/between use quoted, validated date literals', () => {
    expect(buildSQLFilter({ D: { operator: 'equals', value: '2024-01-15' } }, 'postgres', { D: 'date' })).toBe(
      `"D" = '2024-01-15'`
    );
    expect(
      buildSQLFilter({ D: { operator: 'between', value: '2024-01-01', value2: '2024-06-30' } }, 'postgres', { D: 'date' })
    ).toBe(`"D" BETWEEN '2024-01-01' AND '2024-06-30'`);
    expect(buildSQLFilter({ D: { operator: 'contains', value: '2024' } }, 'postgres', { D: 'date' })).toBe('1=1');
  });

  it('blank/not_blank use IS NULL / IS NOT NULL on non-string columns', () => {
    expect(buildSQLFilter({ Age: { operator: 'blank', value: '' } }, 'postgres', { Age: 'number' })).toBe(
      `"Age" IS NULL`
    );
    expect(buildSQLFilter({ D: { operator: 'not_blank', value: '' } }, 'postgres', { D: 'date' })).toBe(
      `"D" IS NOT NULL`
    );
  });

  it('keeps the legacy blank form for string columns', () => {
    expect(buildSQLFilter({ Name: { operator: 'blank', value: '' } }, 'postgres', { Name: 'text' })).toBe(
      `("Name" IS NULL OR "Name" = '' OR TRIM("Name") = '')`
    );
  });
});

describe('numeric empty-value guard', () => {
  it('drops the eq fragment for an empty-string value (deep-link ?gridFilter.Age=eq:)', () => {
    expect(buildSQLFilter({ Age: { operator: 'eq', value: '' } }, 'postgres')).toBe('1=1');
    expect(buildODataFilter({ Age: { operator: 'eq', value: '' } })).toBe('true');
  });

  it('drops the fragment for a whitespace-only value', () => {
    expect(buildSQLFilter({ Age: { operator: 'gt', value: '   ' } }, 'postgres')).toBe('1=1');
    expect(buildODataFilter({ Age: { operator: 'gt', value: '  ' } })).toBe('true');
  });

  it('drops a between fragment when either bound is empty/whitespace', () => {
    expect(
      buildSQLFilter({ Age: { operator: 'between', value: '', value2: '10' } }, 'postgres')
    ).toBe('1=1');
    expect(
      buildSQLFilter({ Age: { operator: 'between', value: '1', value2: '  ' } }, 'postgres')
    ).toBe('1=1');
    expect(
      buildODataFilter({ Age: { operator: 'between', value: '', value2: 10 } })
    ).toBe('true');
  });

  it('still emits an explicit numeric zero (0 and "0" are not blank)', () => {
    expect(buildSQLFilter({ Age: { operator: 'eq', value: 0 } }, 'postgres')).toBe('"Age" = 0');
    expect(buildSQLFilter({ Age: { operator: 'eq', value: '0' } }, 'postgres')).toBe('"Age" = 0');
    expect(buildODataFilter({ Age: { operator: 'eq', value: 0 } })).toBe('Age eq 0');
  });
});

describe('pagination zero and magnitude clamping', () => {
  it('treats pageSize 0 (and sub-1) as the default page size', () => {
    expect(buildSQLPagination({ currentPage: 0, pageSize: 0 })).toEqual({ limit: 50, offset: 0 });
    expect(buildODataPagination({ currentPage: 0, pageSize: 0 })).toEqual({ skip: 0, top: 50 });
    expect(buildSQLPagination({ currentPage: 1, pageSize: 0.5 })).toEqual({ limit: 50, offset: 50 });
  });

  it('clamps a huge offset to a safe integer that stringifies as a decimal (no exponent)', () => {
    const huge = 1e21;
    expect(buildSQLPagination({ currentPage: huge, pageSize: 50 }).offset).toBe(
      Number.MAX_SAFE_INTEGER
    );
    const q = buildSQLQuery(
      {},
      [],
      { currentPage: huge, pageSize: 50 }
    );
    expect(q.offset).toBe('9007199254740991');
    expect(q.offset).not.toMatch(/e/i);
  });

  it('clamps OData skip likewise (decimal string, no exponent)', () => {
    const huge = 1e21;
    const od = buildODataQuery(
      {},
      [],
      { currentPage: huge, pageSize: 50 }
    );
    expect(od.skip).toBe('9007199254740991');
    expect(od.skip).not.toMatch(/e/i);
  });
});
