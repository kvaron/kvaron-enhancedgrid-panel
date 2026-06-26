import { EnhancedGridOptions } from '../../types';
import { resolveServerSideVarNames } from '../serverSideVars';

// Minimal options factory — only the fields the resolver reads matter; the
// rest are filled with inert defaults so the object satisfies the type.
function makeOptions(overrides: Partial<EnhancedGridOptions> = {}): EnhancedGridOptions {
  return {
    showHeader: true,
    showRowNumbers: false,
    rowHeight: 32,
    headerHeight: 80,
    compactMode: false,
    compactHeaders: false,
    filterStyle: 'filterRow',
    freezeLeftColumns: 0,
    freezeRightColumns: 0,
    rowStripeEnabled: true,
    borderStyle: 'horizontal',
    columns: [],
    highlightRules: [],
    enableViewPresets: false,
    viewPresets: [],
    paginationEnabled: false,
    pageSize: 50,
    virtualScrollEnabled: true,
    overscanRows: 5,
    autoSizeAllColumns: false,
    autoSizeSampleSize: 100,
    serverSideMode: false,
    gridId: '',
    queryFormat: 'odata',
    sqlDialect: 'postgres',
    serverSidePagination: false,
    includeCount: true,
    ...overrides,
  };
}

const NAME_REGEX = /^[A-Za-z][A-Za-z0-9_]*$/;

describe('resolveServerSideVarNames', () => {
  it('C2: derives names from panelId when no gridId', () => {
    expect(resolveServerSideVarNames(makeOptions(), 7)).toEqual({
      filter: 'grid7_filter',
      sort: 'grid7_sort',
      skip: 'grid7_skip',
      top: 'grid7_top',
      count: 'grid7_count',
      mode: 'grid7_mode',
    });
  });

  it('C3: derives names from a custom gridId', () => {
    expect(resolveServerSideVarNames(makeOptions({ gridId: 'inventory' }), 7)).toEqual({
      filter: 'inventory_filter',
      sort: 'inventory_sort',
      skip: 'inventory_skip',
      top: 'inventory_top',
      count: 'inventory_count',
      mode: 'inventory_mode',
    });
  });

  it('C3: trims a padded gridId before deriving', () => {
    expect(resolveServerSideVarNames(makeOptions({ gridId: '  inventory  ' }), 7).filter).toBe(
      'inventory_filter'
    );
  });

  it('C5: an all-whitespace gridId falls back to derivation', () => {
    expect(resolveServerSideVarNames(makeOptions({ gridId: '   ' }), 12).filter).toBe(
      'grid12_filter'
    );
  });

  it('P3-2: derives a mode name from the Grid ID', () => {
    expect(resolveServerSideVarNames(makeOptions({ gridId: 'inventory' }), 7).mode).toBe(
      'inventory_mode'
    );
    expect(resolveServerSideVarNames(makeOptions(), 7).mode).toBe('grid7_mode');
  });

  it('C6: every derived name is a valid variable name for any integer panelId', () => {
    for (const panelId of [0, 1, 7, 12, 99, 1000, 2147483647]) {
      const result = resolveServerSideVarNames(makeOptions(), panelId);
      for (const name of Object.values(result)) {
        expect(name).toMatch(NAME_REGEX);
      }
    }
  });
});
