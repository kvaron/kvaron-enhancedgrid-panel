import { buildSQLFilter, buildSQLQuery } from '../odataQueryBuilder';

describe('SQL query builder filtering', () => {
  it('builds SQL filters for text, numeric, blank, and range operators', () => {
    expect(
      buildSQLFilter({
        name: { operator: 'contains', value: "O'Brien" },
        age: { operator: 'gte', value: 21 },
        score: { operator: 'between', value: 10, value2: 20 },
        notes: { operator: 'not_blank', value: '' },
      })
    ).toBe(
      `"name" ILIKE '%O''Brien%' AND "age" >= 21 AND "score" BETWEEN 10 AND 20 AND ("notes" IS NOT NULL AND "notes" != '' AND TRIM("notes") != '')`
    );
  });

  it('quotes identifiers and ignores unsafe numeric values', () => {
    expect(
      buildSQLFilter({
        'user"name': { operator: 'equals', value: 'Ada' },
        age: { operator: 'gt', value: '1; DROP TABLE users' },
      })
    ).toBe(`"user""name" ILIKE 'Ada'`);
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
      where: `"status" ILIKE 'active'`,
      orderby: `"created at" DESC`,
      limit: '25',
      offset: '50',
    });
  });
});
