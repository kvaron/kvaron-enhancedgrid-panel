/**
 * Adversarial regression fixtures for the SQL/OData fragment generators.
 *
 * Each test asserts the *exact* escaped output that the panel produces for
 * a known injection payload. The panel's job is to produce a known-shape,
 * known-escaped fragment; the database's job is to interpret that fragment
 * safely. Some payloads remain config-dependent at the database side
 * (e.g. MySQL default sql_mode interprets backslash inside string literals);
 * those caveats are documented in docs/SERVER_SIDE_SETUP.md.
 *
 * If any of these expectations regress, treat it as a security incident
 * and investigate before "fixing" the test.
 */
import {
  buildODataFilter,
  buildODataSort,
  buildSQLFilter,
  buildSQLSort,
} from '../odataQueryBuilder';

describe('value escaping — SQL fragment generator', () => {
  describe('single-quote injection', () => {
    const payload = "x'; DROP TABLE users; --";

    it('postgres: doubles the quote, contains the payload inside the literal', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'postgres')
      ).toBe(`"a" ILIKE '%x''; DROP TABLE users; --%' ESCAPE '!'`);
    });

    it('sqlserver: doubles the quote, brackets the identifier', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'sqlserver')
      ).toBe(`[a] LIKE '%x''; DROP TABLE users; --%' ESCAPE '!'`);
    });

    it('ansi: doubles the quote, wraps in LOWER(...)', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'ansi')
      ).toBe(`LOWER("a") LIKE LOWER('%x''; DROP TABLE users; --%') ESCAPE '!'`);
    });
  });

  describe('backslash + quote (config-dependent at DB side)', () => {
    // The panel doubles the single quote. Safety of the resulting string
    // literal depends on the database's backslash-in-string-literal handling:
    //   Postgres SCS=on (default): safe.
    //   SQLite, SQL Server, Oracle: safe.
    //   MySQL/MariaDB default sql_mode: requires NO_BACKSLASH_ESCAPES — see
    //     docs/SERVER_SIDE_SETUP.md "Configuring the data source connection".
    const payload = "\\' OR 1=1 --";

    it('postgres: escapeValue doubles the apostrophe', () => {
      expect(
        buildSQLFilter({ a: { operator: 'equals', value: payload } }, 'postgres')
      ).toBe(`LOWER("a") = LOWER('\\'' OR 1=1 --')`);
    });

    it('ansi: same shape inside LOWER()', () => {
      expect(
        buildSQLFilter({ a: { operator: 'equals', value: payload } }, 'ansi')
      ).toBe(`LOWER("a") = LOWER('\\'' OR 1=1 --')`);
    });
  });

  describe('UNION exfiltration attempt', () => {
    const payload = "' UNION SELECT password FROM users --";

    it('postgres: payload neutralized inside the literal', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'postgres')
      ).toBe(`"a" ILIKE '%'' UNION SELECT password FROM users --%' ESCAPE '!'`);
    });
  });

  describe('time-based blind injection attempt', () => {
    const payload = "'; SELECT pg_sleep(5); --";

    it('postgres: payload neutralized inside the literal (the _ in pg_sleep is also LIKE-escaped)', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'postgres')
      ).toBe(`"a" ILIKE '%''; SELECT pg!_sleep(5); --%' ESCAPE '!'`);
    });
  });

  describe('comment-truncation attempt', () => {
    const payload = "'/*";

    it('postgres: payload neutralized inside the literal', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: payload } }, 'postgres')
      ).toBe(`"a" ILIKE '%''/*%' ESCAPE '!'`);
    });
  });

  describe('LIKE-wildcard widening (per-operator semantics)', () => {
    it('contains escapes user-typed % via ESCAPE clause', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: '%admin%' } }, 'postgres')
      ).toBe(`"a" ILIKE '%!%admin!%%' ESCAPE '!'`);
    });

    it('contains escapes user-typed _', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: 'a_b' } }, 'postgres')
      ).toBe(`"a" ILIKE '%a!_b%' ESCAPE '!'`);
    });

    it('sqlserver contains escapes user-typed [', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: '[a-z]' } }, 'sqlserver')
      ).toBe(`[a] LIKE '%![a-z]%' ESCAPE '!'`);
    });

    it('equals does NOT use LIKE so % and _ are matched literally', () => {
      expect(
        buildSQLFilter({ a: { operator: 'equals', value: '%admin%' } }, 'postgres')
      ).toBe(`LOWER("a") = LOWER('%admin%')`);
    });
  });

  describe('numeric-operator injection attempts', () => {
    it('drops fragment when value is a SQL injection string (Number → NaN)', () => {
      expect(
        buildSQLFilter({ a: { operator: 'gt', value: '1; DROP TABLE x' } }, 'postgres')
      ).toBe('1=1');
    });

    it('drops fragment when value is Infinity (Number.isFinite → false)', () => {
      expect(
        buildSQLFilter({ a: { operator: 'gt', value: Infinity } }, 'postgres')
      ).toBe('1=1');
    });

    it('between drops if either bound is non-finite', () => {
      expect(
        buildSQLFilter(
          { a: { operator: 'between', value: 0, value2: '999; DROP' } },
          'postgres'
        )
      ).toBe('1=1');
    });
  });

  describe('apostrophe-in-name (the O\'Brien case)', () => {
    it('postgres contains: doubles the apostrophe inside the LIKE pattern', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: "O'Brien" } }, 'postgres')
      ).toBe(`"a" ILIKE '%O''Brien%' ESCAPE '!'`);
    });

    it('ansi equals: doubles the apostrophe inside LOWER()', () => {
      expect(
        buildSQLFilter({ a: { operator: 'equals', value: "O'Brien" } }, 'ansi')
      ).toBe(`LOWER("a") = LOWER('O''Brien')`);
    });
  });

  describe('Unicode quote homoglyphs (smart quotes)', () => {
    // Database string literals only treat U+0027 (`'`) as a terminator; smart
    // quotes pass through as ordinary characters and cannot break out.
    it('postgres contains: smart quote passes through unchanged', () => {
      expect(
        buildSQLFilter({ a: { operator: 'contains', value: '’DROP’' } }, 'postgres')
      ).toBe(`"a" ILIKE '%’DROP’%' ESCAPE '!'`);
    });
  });
});

describe('identifier escaping — SQL fragment generator', () => {
  it('postgres: column name with embedded double-quote is safely doubled', () => {
    expect(
      buildSQLFilter({ 'weird"name': { operator: 'equals', value: 'x' } }, 'postgres')
    ).toBe(`LOWER("weird""name") = LOWER('x')`);
  });

  it('sqlserver: column name with embedded ] is safely doubled', () => {
    expect(
      buildSQLFilter({ 'weird]name': { operator: 'equals', value: 'x' } }, 'sqlserver')
    ).toBe(`[weird]]name] = 'x'`);
  });

  it('postgres sort: column name with quote is safely doubled', () => {
    expect(
      buildSQLSort([{ field: 'weird"name', direction: 'asc' }], 'postgres')
    ).toBe(`"weird""name" ASC`);
  });

  it('sqlserver sort: column name with bracket is safely doubled', () => {
    expect(
      buildSQLSort([{ field: 'weird]name', direction: 'desc' }], 'sqlserver')
    ).toBe(`[weird]]name] DESC`);
  });
});

describe('sort direction injection', () => {
  it('rejects untrusted direction strings, defaults to ASC (postgres)', () => {
    expect(
      buildSQLSort(
        [{ field: 'name', direction: 'asc; DROP TABLE x; --' as 'asc' }],
        'postgres'
      )
    ).toBe(`"name" ASC`);
  });

  it('rejects untrusted direction strings, defaults to ASC (sqlserver)', () => {
    expect(
      buildSQLSort(
        [{ field: 'name', direction: 'desc OR 1=1' as 'desc' }],
        'sqlserver'
      )
    ).toBe(`[name] ASC`);
  });
});

describe('OData fragment generator', () => {
  describe('value escaping', () => {
    it('contains: doubles single quotes in the value', () => {
      expect(
        buildODataFilter({ Name: { operator: 'contains', value: "O'Brien" } })
      ).toBe(`contains(tolower(Name), 'o''brien')`);
    });

    it('drops numeric injection via Number → NaN (returns true no-op, payload absent)', () => {
      expect(
        buildODataFilter({ Age: { operator: 'gt', value: '1; DROP TABLE x' } })
      ).toBe('true');
    });

    it('drops numeric Infinity via Number.isFinite (returns true no-op)', () => {
      expect(buildODataFilter({ Age: { operator: 'gt', value: Infinity } })).toBe('true');
    });
  });

  describe('identifier validation', () => {
    it('drops field names with whitespace or punctuation (returns true no-op, payload absent)', () => {
      expect(
        buildODataFilter({ 'created at': { operator: 'contains', value: 'x' } })
      ).toBe('true');
      expect(
        buildODataFilter({ "evil') OR ('1": { operator: 'contains', value: 'x' } })
      ).toBe('true');
    });

    it('drops sort with invalid field names', () => {
      expect(buildODataSort([{ field: 'x; DROP TABLE y', direction: 'asc' }])).toBe('');
    });

    it('rejects untrusted sort direction at runtime', () => {
      expect(
        buildODataSort([
          {
            field: 'Name',
            direction: 'asc; DROP TABLE x' as 'asc',
          },
        ])
      ).toBe(`Name asc`);
    });
  });
});
