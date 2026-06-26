import React from 'react';
import { FieldType, DataFrame } from '@grafana/data';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Grid } from '../Grid';
import { EnhancedGridOptions, ViewPreset, ConditionGroup } from '../../../types';
import { GridColumn, GridRow } from '../../../utils/dataTransformer';
import { locationService } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
  locationService: {
    getSearch: jest.fn(() => new URLSearchParams()),
    getSearchObject: jest.fn(() => ({})),
    partial: jest.fn(),
  },
}));

jest.mock('@grafana/ui', () => {
  const theme = {
    colors: {
      background: { primary: '#fff', secondary: '#f7f8fa' },
      border: { weak: '#ddd', medium: '#bbb', strong: '#999' },
      text: { primary: '#111', secondary: '#555' },
      action: { hover: '#eee' },
      primary: {
        main: '#3274d9',
        shade: '#1f60c4',
        contrastText: '#fff',
        transparent: 'rgba(50, 116, 217, 0.12)',
        border: '#3274d9',
        text: '#3274d9',
      },
    },
    shadows: { z1: '0 1px 3px rgba(0,0,0,0.2)', z3: '0 2px 8px rgba(0,0,0,0.2)' },
    zIndex: { dropdown: 1030 },
    shape: { radius: { default: '4px' } },
    typography: {
      body: { fontSize: '14px', lineHeight: 1.5 },
      bodySmall: { fontSize: '12px' },
      fontWeightBold: 700,
      fontWeightMedium: 500,
    },
    components: { height: { md: 4 } },
    spacing: (...args: number[]) => args.map((value) => `${value * 8}px`).join(' '),
  };

  return {
    useTheme2: () => theme,
    useStyles2: (getStyles: any, ...args: any[]) => getStyles(theme, ...args),
    Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Combobox: ({ value, options, onChange }: any) => (
      <select
        aria-label="Operator"
        value={value}
        onChange={(event) => onChange(options.find((option: any) => option.value === event.currentTarget.value))}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Input: (props: any) => <input {...props} />,
    Alert: ({ title, children, ...rest }: any) => (
      <div role="alert" {...rest}>
        <div>{title}</div>
        {children}
      </div>
    ),
    TabsBar: ({ children }: any) => <div role="tablist">{children}</div>,
    Tab: ({ label, active, onChangeTab }: any) => (
      <button type="button" role="tab" aria-selected={active ? 'true' : 'false'} onClick={(e) => onChangeTab?.(e)}>
        {label}
      </button>
    ),
  };
});

jest.mock('../GridBody', () => {
  const ReactLib = require('react');

  const MockGridBody = ReactLib.forwardRef(
    ({ rows, columns }: { rows: GridRow[]; columns: GridColumn[] }, ref: any) => {
      const scrollRef = ReactLib.useRef(null as HTMLDivElement | null);
      ReactLib.useImperativeHandle(ref, () => ({ getScrollContainer: () => scrollRef.current }));

      return (
        <div ref={scrollRef} data-testid="grid-body">
          {rows.map((row) => (
            <div key={row.index} data-testid="grid-row">
              {columns.map((column) => (
                <span key={column.fieldName} data-field={column.fieldName}>
                  {String(row.data[column.fieldName] ?? '')}
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    }
  );
  MockGridBody.displayName = 'MockGridBody';

  return { GridBody: MockGridBody };
});

jest.mock('../PaginationControls', () => ({
  PaginationControls: () => <div data-testid="pagination-controls" />,
}));

const baseOptions: EnhancedGridOptions = {
  showHeader: true,
  showRowNumbers: false,
  paginationEnabled: false,
  pageSize: 50,
  headerHeight: 40,
  rowHeight: 30,
  compactMode: false,
  compactHeaders: false,
  filterStyle: 'filterRow',
  highlightRules: [],
  enableViewPresets: false,
  viewPresets: [],
  freezeLeftColumns: 0,
  freezeRightColumns: 0,
  rowStripeEnabled: false,
  borderStyle: 'none',
  columns: [],
  virtualScrollEnabled: false,
  overscanRows: 5,
  autoSizeAllColumns: false,
  autoSizeSampleSize: 100,
  serverSideMode: false,
  gridId: '',
  queryFormat: 'json',
  sqlDialect: 'postgres',
  serverSidePagination: false,
  includeCount: false,
};

const frame: DataFrame = {
  name: 'table',
  fields: [
    { name: 'name', type: FieldType.string, config: {}, values: ['Alice', 'Bob', 'Bobby'] },
    { name: 'age', type: FieldType.number, config: {}, values: [30, 41, 18] },
  ],
  length: 3,
};

const ageOver20Filter: ConditionGroup = {
  id: 'g1',
  type: 'group',
  logicalOperator: 'AND',
  items: [
    {
      id: 'c1',
      sourceField: 'age',
      operator: 'greater_than',
      compareType: 'value',
      compareValue: 20,
    },
  ],
};

const presets: ViewPreset[] = [
  { id: 'p-cols', name: 'OnlyName', visibleColumns: ['name'], sort: [] },
  { id: 'p-filter', name: 'Adults', visibleColumns: [], sort: [], filter: ageOver20Filter },
  { id: 'p-sort', name: 'NameDesc', visibleColumns: [], sort: [{ field: 'name', direction: 'desc' }] },
  { id: 'p-unknown', name: 'Intersect', visibleColumns: ['name', 'ghost'], sort: [] },
  {
    id: 'p-empty',
    name: 'EmptyFilter',
    visibleColumns: [],
    sort: [],
    filter: { id: 'g0', type: 'group', logicalOperator: 'AND', items: [] },
  },
];

const renderGrid = (options: EnhancedGridOptions, panelId = 1) =>
  render(<Grid data={frame} options={options} width={800} height={400} highlightRules={[]} panelId={panelId} />);

describe('view presets tab bar', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => ({ font: '', measureText: (text: string) => ({ width: text.length * 8 }) }),
      configurable: true,
    });
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
  });

  it('P2-10: renders no tab bar when view presets are disabled', () => {
    renderGrid({ ...baseOptions, enableViewPresets: false, viewPresets: presets });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('P2-10: renders no tab bar when there are zero presets', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: [] });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('P2-9/P2-17: renders an All tab plus one tab per preset, with All active initially', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'OnlyName' })).toHaveAttribute('aria-selected', 'false');
    // One tab per preset + All.
    expect(screen.getAllByRole('tab')).toHaveLength(presets.length + 1);
  });

  it('P2-12: clicking a preset hides non-visible columns', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    // age values present before applying.
    expect(screen.getByText('41')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'OnlyName' }));

    expect(screen.getByRole('tab', { name: 'OnlyName' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('41')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('P2-6: visibleColumns intersection ignores unknown fields without blanking the grid', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    fireEvent.click(screen.getByRole('tab', { name: 'Intersect' }));
    // name shown, age hidden, no throw / blank grid.
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('41')).not.toBeInTheDocument();
  });

  it('P2-13: clicking a preset applies its nested filter (rows drop)', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    expect(screen.getAllByTestId('grid-row')).toHaveLength(3);

    fireEvent.click(screen.getByRole('tab', { name: 'Adults' }));

    // Bobby (age 18) drops; Alice (30) and Bob (41) remain.
    expect(screen.getAllByTestId('grid-row')).toHaveLength(2);
    expect(screen.queryByText('Bobby')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('P2-14: an empty preset filter passes all rows', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    fireEvent.click(screen.getByRole('tab', { name: 'EmptyFilter' }));
    expect(screen.getAllByTestId('grid-row')).toHaveLength(3);
  });

  it('P2-15: clicking a preset applies its sort order', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });
    fireEvent.click(screen.getByRole('tab', { name: 'NameDesc' }));

    const order = screen.getAllByTestId('grid-row').map((r) => r.textContent);
    expect(order[0]).toContain('Bobby');
    expect(order[1]).toContain('Bob');
    expect(order[2]).toContain('Alice');
  });

  it('P2-16: the All tab clears preset columns, filter, and sort', () => {
    renderGrid({ ...baseOptions, enableViewPresets: true, viewPresets: presets });

    fireEvent.click(screen.getByRole('tab', { name: 'Adults' }));
    expect(screen.getAllByTestId('grid-row')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('grid-row')).toHaveLength(3);
    expect(screen.getByText('Bobby')).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();
  });

  it('P2-21: server-side OData pushes the active preset filter to the filter variable', () => {
    jest.useFakeTimers();
    const options: EnhancedGridOptions = {
      ...baseOptions,
      enableViewPresets: true,
      viewPresets: presets,
      serverSideMode: true,
      paginationEnabled: true,
      serverSidePagination: true,
      queryFormat: 'odata',
    };
    renderGrid(options, 1);

    fireEvent.click(screen.getByRole('tab', { name: 'Adults' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(locationService.partial).toHaveBeenLastCalledWith(
      expect.objectContaining({ 'var-grid1_filter': 'age gt 20' }),
      true
    );
    jest.useRealTimers();
  });

  it('P2-21b: server-side SQL pushes the active preset filter (dialect-correct)', () => {
    jest.useFakeTimers();
    const options: EnhancedGridOptions = {
      ...baseOptions,
      enableViewPresets: true,
      viewPresets: presets,
      serverSideMode: true,
      queryFormat: 'sql',
      sqlDialect: 'postgres',
    };
    renderGrid(options, 1);

    fireEvent.click(screen.getByRole('tab', { name: 'Adults' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(locationService.partial).toHaveBeenLastCalledWith(
      expect.objectContaining({ 'var-grid1_filter': '"age" > 20' }),
      true
    );
    jest.useRealTimers();
  });

  it('P2-21c: generic (JSON) server-side mode warns that the preset filter is not pushed down', () => {
    const options: EnhancedGridOptions = {
      ...baseOptions,
      enableViewPresets: true,
      viewPresets: presets,
      serverSideMode: true,
      paginationEnabled: true,
      serverSidePagination: true,
      queryFormat: 'json',
    };
    renderGrid(options, 9);

    fireEvent.click(screen.getByRole('tab', { name: 'Adults' }));

    expect(screen.getByTestId('enhanced-grid-preset-json-alert')).toBeInTheDocument();
    // Rows are not filtered client-side under server-side mode.
    expect(screen.getAllByTestId('grid-row')).toHaveLength(3);
  });

  it('P2-21d: an untranslatable preset filter is not pushed down and surfaces a warning', () => {
    jest.useFakeTimers();
    const ghostFilter: ConditionGroup = {
      id: 'gg',
      type: 'group',
      logicalOperator: 'AND',
      items: [{ id: 'cc', sourceField: 'ghost', operator: 'equals', compareType: 'value', compareValue: 'x' }],
    };
    const options: EnhancedGridOptions = {
      ...baseOptions,
      enableViewPresets: true,
      viewPresets: [...presets, { id: 'p-ghost', name: 'Ghost', visibleColumns: [], sort: [], filter: ghostFilter }],
      serverSideMode: true,
      queryFormat: 'odata',
    };
    renderGrid(options, 1);

    fireEvent.click(screen.getByRole('tab', { name: 'Ghost' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Interactive-only filter published (no-op sentinel), preset filter dropped.
    expect(locationService.partial).toHaveBeenLastCalledWith(
      expect.objectContaining({ 'var-grid1_filter': 'true' }),
      true
    );
    expect(screen.getByTestId('enhanced-grid-preset-unsupported-alert')).toBeInTheDocument();
    jest.useRealTimers();
  });
});

// Phase 3: the active view is read/written as `var-{gridId}_mode` directly via
// locationService (gridId 'g' -> var-g_mode), independent of serverSideMode.
const gridOptions: EnhancedGridOptions = {
  ...baseOptions,
  gridId: 'g',
  enableViewPresets: true,
  viewPresets: presets,
};

describe('view presets mode variable (deep-link + precedence)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (locationService.getSearch as jest.Mock).mockReturnValue(new URLSearchParams());
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => ({ font: '', measureText: (text: string) => ({ width: text.length * 8 }) }),
      configurable: true,
    });
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
  });

  it('P3-4: loading with ?var-g_mode=<validId> activates that preset on mount (and applies its sort)', () => {
    (locationService.getSearch as jest.Mock).mockReturnValue(new URLSearchParams('var-g_mode=p-sort'));
    renderGrid(gridOptions, 21);

    expect(screen.getByRole('tab', { name: 'NameDesc' })).toHaveAttribute('aria-selected', 'true');
    const order = screen.getAllByTestId('grid-row').map((r) => r.textContent);
    expect(order[0]).toContain('Bobby');
    expect(order[2]).toContain('Alice');
  });

  it('P3-5: an unknown/deleted mode id falls back to All without throwing', () => {
    (locationService.getSearch as jest.Mock).mockReturnValue(new URLSearchParams('var-g_mode=does-not-exist'));
    renderGrid(gridOptions, 22);

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('grid-row')).toHaveLength(3);
  });

  it('P3-4: a valid URL mode beats defaultPresetId', () => {
    (locationService.getSearch as jest.Mock).mockReturnValue(new URLSearchParams('var-g_mode=p-cols'));
    renderGrid({ ...gridOptions, defaultPresetId: 'p-sort' }, 23);

    expect(screen.getByRole('tab', { name: 'OnlyName' })).toHaveAttribute('aria-selected', 'true');
  });

  it('P3-4: defaultPresetId is used when there is no URL mode', () => {
    renderGrid({ ...gridOptions, defaultPresetId: 'p-sort' }, 24);

    expect(screen.getByRole('tab', { name: 'NameDesc' })).toHaveAttribute('aria-selected', 'true');
  });

  it('P3-5: an unknown defaultPresetId (no URL mode) falls back to All', () => {
    renderGrid({ ...gridOptions, defaultPresetId: 'deleted' }, 25);

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('P3-4: no URL mode and no default → All', () => {
    renderGrid(gridOptions, 26);

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('P3-1/P3-3: clicking a tab writes var-g_mode via locationService.partial', () => {
    renderGrid(gridOptions, 27);

    fireEvent.click(screen.getByRole('tab', { name: 'OnlyName' }));

    expect(locationService.partial).toHaveBeenCalledWith({ 'var-g_mode': 'p-cols' }, true);
  });

  it('P3-6: clicking All/Reset clears var-g_mode', () => {
    renderGrid(gridOptions, 28);

    fireEvent.click(screen.getByRole('tab', { name: 'OnlyName' }));
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));

    expect(locationService.partial).toHaveBeenLastCalledWith({ 'var-g_mode': undefined }, true);
  });
});

describe('view presets server-side sort publish', () => {
  const multiPreset: ViewPreset = {
    id: 'p-multi',
    name: 'Multi',
    visibleColumns: [],
    sort: [
      { field: 'name', direction: 'asc' },
      { field: 'age', direction: 'desc' },
    ],
  };

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (locationService.getSearch as jest.Mock).mockReturnValue(new URLSearchParams());
    (locationService.getSearchObject as jest.Mock).mockReturnValue({});
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => ({ font: '', measureText: (text: string) => ({ width: text.length * 8 }) }),
      configurable: true,
    });
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
  });

  it('P3-7: serverSideMode publishes the preset multi-key sort to var-g_sort', () => {
    jest.useFakeTimers();
    const options: EnhancedGridOptions = {
      ...baseOptions,
      gridId: 'g',
      enableViewPresets: true,
      viewPresets: [multiPreset],
      serverSideMode: true,
      queryFormat: 'sql',
      sqlDialect: 'postgres',
    };
    renderGrid(options, 31);

    fireEvent.click(screen.getByRole('tab', { name: 'Multi' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(locationService.partial).toHaveBeenCalledWith(
      expect.objectContaining({ 'var-g_sort': '"name" ASC, "age" DESC' }),
      true
    );
  });

  it('P3-8: client-side mode never writes var-g_sort for a preset (but still writes var-g_mode)', () => {
    jest.useFakeTimers();
    const options: EnhancedGridOptions = {
      ...baseOptions,
      gridId: 'g',
      enableViewPresets: true,
      viewPresets: [multiPreset],
      serverSideMode: false,
    };
    renderGrid(options, 32);

    fireEvent.click(screen.getByRole('tab', { name: 'Multi' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(locationService.partial).not.toHaveBeenCalledWith(
      expect.objectContaining({ 'var-g_sort': expect.anything() }),
      true
    );
    expect(locationService.partial).toHaveBeenCalledWith({ 'var-g_mode': 'p-multi' }, true);
  });
});
