import {
  capRowsForRender,
  computeRowCap,
  MAX_PANEL_ROWS,
  SERVER_PAGE_SAFETY_FACTOR,
} from '../rowCap';

describe('computeRowCap', () => {
  it('returns the absolute panel cap when server-side pagination is off', () => {
    expect(computeRowCap({ serverSideMode: false, serverSidePagination: false }, 25)).toBe(
      MAX_PANEL_ROWS
    );
    expect(computeRowCap({ serverSideMode: true, serverSidePagination: false }, 25)).toBe(
      MAX_PANEL_ROWS
    );
  });

  it('caps at pageSize * factor when server-side pagination is on', () => {
    expect(
      computeRowCap({ serverSideMode: true, serverSidePagination: true }, 25)
    ).toBe(25 * SERVER_PAGE_SAFETY_FACTOR);
    expect(
      computeRowCap({ serverSideMode: true, serverSidePagination: true }, 100)
    ).toBe(100 * SERVER_PAGE_SAFETY_FACTOR);
  });

  it('falls back to a sensible page size when pageSize is invalid', () => {
    expect(
      computeRowCap({ serverSideMode: true, serverSidePagination: true }, NaN)
    ).toBe(50 * SERVER_PAGE_SAFETY_FACTOR);
    expect(
      computeRowCap({ serverSideMode: true, serverSidePagination: true }, 0)
    ).toBe(50 * SERVER_PAGE_SAFETY_FACTOR);
    expect(
      computeRowCap(
        { serverSideMode: true, serverSidePagination: true },
        Infinity
      )
    ).toBe(50 * SERVER_PAGE_SAFETY_FACTOR);
  });
});

describe('capRowsForRender', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the input unchanged when within the cap', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    expect(
      capRowsForRender(rows, { serverSideMode: true, serverSidePagination: true }, 50)
    ).toBe(rows);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('clips rows above the cap and emits a console warning', () => {
    // Server-side pagination on, pageSize 25 -> cap 100. 500 rows trigger clip.
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    const result = capRowsForRender(
      rows,
      { serverSideMode: true, serverSidePagination: true },
      25
    );
    expect(result.length).toBe(100);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('500 rows');
    expect(warnSpy.mock.calls[0][0]).toContain('capping displayed rows at 100');
  });

  it('does not clip below the absolute cap when server-side pagination is off', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const result = capRowsForRender(rows, { serverSideMode: false }, 50);
    expect(result.length).toBe(1000);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('handles empty input without warning', () => {
    const rows: unknown[] = [];
    expect(capRowsForRender(rows, { serverSideMode: true, serverSidePagination: true }, 25)).toBe(
      rows
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
