import {
  buildODataFilter,
  buildODataPagination,
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
        { field: 'created at', direction: 'desc' },
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
    expect(buildSQLSort({ field: 'created at', direction: 'asc' }, 'postgres')).toBe(`"created at" ASC`);
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
    expect(buildSQLSort({ field: 'created at', direction: 'desc' }, 'sqlserver')).toBe(`[created at] DESC`);
  });

  it('threads dialect through buildSQLQuery', () => {
    expect(
      buildSQLQuery(
        { status: { operator: 'equals', value: 'active' } },
        { field: 'name', direction: 'asc' },
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
    expect(buildSQLSort({ field: 'name', direction: 'asc' }, 'ansi')).toBe(`"name" ASC`);
  });

  it('threads dialect through buildSQLQuery', () => {
    expect(
      buildSQLQuery(
        { status: { operator: 'equals', value: 'active' } },
        { field: 'name', direction: 'desc' },
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
      buildSQLSort({ field: 'name', direction: 'asc; DROP TABLE x; --' as 'asc' }, 'ansi')
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
    expect(buildODataSort({ field: 'Name', direction: 'desc' })).toBe(`Name desc`);
  });

  it('drops field names with whitespace, punctuation, or operators', () => {
    expect(
      buildODataFilter({ 'created at': { operator: 'contains', value: 'x' } })
    ).toBe('');
    expect(
      buildODataFilter({ "evil') OR ('1": { operator: 'contains', value: 'x' } })
    ).toBe('');
    expect(buildODataSort({ field: "x; DROP TABLE y", direction: 'asc' })).toBe('');
  });

  it('drops field names that start with a digit', () => {
    expect(
      buildODataFilter({ '1stColumn': { operator: 'contains', value: 'x' } })
    ).toBe('');
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
      buildODataSort({ field: 'Name', direction: 'asc; DROP TABLE x; --' as 'asc' })
    ).toBe(`Name asc`);
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
      expect(buildSQLSort({ field: longField, direction: 'asc' }, 'postgres')).toBe('1');
    });

    it('still sorts on field at the 256-char boundary', () => {
      expect(buildSQLSort({ field: okField, direction: 'asc' }, 'postgres')).toBe(
        `"${okField}" ASC`
      );
    });
  });

  describe('OData', () => {
    it('drops fragment when filter value exceeds 1024 chars', () => {
      expect(
        buildODataFilter({ Name: { operator: 'contains', value: longValue } })
      ).toBe('');
    });

    it('drops sort when field name exceeds 256 chars', () => {
      expect(buildODataSort({ field: longField, direction: 'asc' })).toBe('');
    });
  });
});
