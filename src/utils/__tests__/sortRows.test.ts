import { compareRowsBySortKeys, sortRowsBySortKeys, SortableRow } from '../sortRows';

const row = (data: Record<string, unknown>): SortableRow => ({ data });

describe('multi-key (sequential) client comparator', () => {
  it('sorts by the primary key when there is no tie', () => {
    const rows = [row({ a: 2 }), row({ a: 1 }), row({ a: 3 })];
    const sorted = sortRowsBySortKeys(rows, [{ field: 'a', direction: 'asc' }]);
    expect(sorted.map((r) => r.data.a)).toEqual([1, 2, 3]);
  });

  it('breaks a tie on key 1 with key 2, then key 3', () => {
    const rows = [
      row({ a: 1, b: 2, c: 9 }),
      row({ a: 1, b: 1, c: 5 }),
      row({ a: 1, b: 2, c: 1 }),
      row({ a: 0, b: 9, c: 9 }),
    ];
    const sorted = sortRowsBySortKeys(rows, [
      { field: 'a', direction: 'asc' },
      { field: 'b', direction: 'asc' },
      { field: 'c', direction: 'asc' },
    ]);
    expect(sorted.map((r) => [r.data.a, r.data.b, r.data.c])).toEqual([
      [0, 9, 9],
      [1, 1, 5],
      [1, 2, 1], // tie on a+b broken by c
      [1, 2, 9],
    ]);
  });

  it('honors per-key direction independently (asc primary, desc secondary)', () => {
    const rows = [
      row({ a: 1, b: 1 }),
      row({ a: 1, b: 3 }),
      row({ a: 2, b: 2 }),
      row({ a: 1, b: 2 }),
    ];
    const sorted = sortRowsBySortKeys(rows, [
      { field: 'a', direction: 'asc' },
      { field: 'b', direction: 'desc' },
    ]);
    expect(sorted.map((r) => [r.data.a, r.data.b])).toEqual([
      [1, 3],
      [1, 2],
      [1, 1],
      [2, 2],
    ]);
  });

  it('returns the input array unchanged for an empty key list', () => {
    const rows = [row({ a: 2 }), row({ a: 1 })];
    expect(sortRowsBySortKeys(rows, [])).toBe(rows);
  });

  it('compareRowsBySortKeys returns 0 when all keys are equal', () => {
    expect(
      compareRowsBySortKeys(row({ a: 1, b: 2 }), row({ a: 1, b: 2 }), [
        { field: 'a', direction: 'asc' },
        { field: 'b', direction: 'desc' },
      ])
    ).toBe(0);
  });
});
