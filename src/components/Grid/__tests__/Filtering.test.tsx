import React from 'react';
import { FieldType, DataFrame } from '@grafana/data';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { Grid } from '../Grid';
import { GridHeader } from '../GridHeader';
import { ColumnFilterDropdown } from '../ColumnFilterDropdown';
import { EnhancedGridOptions } from '../../../types';
import { GridColumn, GridRow } from '../../../utils/dataTransformer';
import { locationService } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
  locationService: {
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
  Combobox: ({ value, options, onChange, portalContainer }: any) => {
    const ReactDOM = require('react-dom');

    return (
      <>
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
        {portalContainer
          ? ReactDOM.createPortal(
              <button type="button" data-testid="operator-menu-option" role="option">
                Operator menu option
              </button>,
              portalContainer
            )
          : null}
        {ReactDOM.createPortal(
          <button type="button" data-testid="external-operator-menu-option" role="option">
            External operator menu option
          </button>,
          document.body
        )}
      </>
    );
  },
  Input: (props: any) => <input {...props} />,
  };
});

jest.mock('../GridBody', () => {
  const React = require('react');

  const MockGridBody = React.forwardRef(({ rows, columns }: { rows: GridRow[]; columns: GridColumn[] }, ref: any) => {
    const scrollRef = React.useRef(null as HTMLDivElement | null);
    React.useImperativeHandle(ref, () => ({ getScrollContainer: () => scrollRef.current }));

    return (
      <div ref={scrollRef} data-testid="grid-body">
        {rows.map((row) => (
          <div key={row.index} data-testid="grid-row">
            {columns.map((column) => (
              <span key={column.fieldName}>{String(row.data[column.fieldName] ?? '')}</span>
            ))}
          </div>
        ))}
      </div>
    );
  });
  MockGridBody.displayName = 'MockGridBody';

  return {
    GridBody: MockGridBody,
  };
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
  filterVariableName: '',
  sortVariableName: '',
  queryFormat: 'json',
  serverSidePagination: false,
  skipVariableName: '',
  topVariableName: '',
  countVariableName: '',
  includeCount: false,
};

const frame: DataFrame = {
  name: 'table',
  fields: [
    {
      name: 'name',
      type: FieldType.string,
      config: {},
      values: ['Alice', 'Bob', 'Bobby'],
    },
    {
      name: 'age',
      type: FieldType.number,
      config: {},
      values: [30, 41, 18],
    },
  ],
  length: 3,
};

describe('column filtering', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => ({
        font: '',
        measureText: (text: string) => ({ width: text.length * 8 }),
      }),
      configurable: true,
    });
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  it('allows typing a text filter and applies it from the dropdown', () => {
    const onFilterChange = jest.fn();

    render(
      <ColumnFilterDropdown
        fieldName="name"
        columnType="text"
        currentFilter={undefined}
        onFilterChange={onFilterChange}
      />
    );

    fireEvent.change(screen.getByTestId('column-filter-value-input'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onFilterChange).toHaveBeenCalledWith({ operator: 'contains', value: 'bob' });
  });

  it('opens the filter menu from the header and sends the typed filter', () => {
    const onFilter = jest.fn();
    const columns: GridColumn[] = [
      {
        field: frame.fields[0],
        fieldName: 'name',
        displayName: 'Name',
        align: 'left',
      },
    ];
    const rows = [
      { index: 0, data: { name: 'Alice' } },
      { index: 1, data: { name: 'Bob' } },
    ];

    render(
      <GridHeader
        columns={columns}
        sortField={null}
        sortDirection="asc"
        onSort={jest.fn()}
        onFilter={onFilter}
        filters={{}}
        minHeight={72}
        maxHeight={72}
        rows={rows}
        filterStyle="filterRow"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Filter name/i }));

    const dropdown = screen.getByTestId('column-filter-dropdown-name');
    fireEvent.change(within(dropdown).getByTestId('column-filter-value-input'), { target: { value: 'bob' } });
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Apply' }));

    expect(onFilter).toHaveBeenCalledWith('name', { operator: 'contains', value: 'bob' });
  });

  it('closes the filter menu when clicking outside the filter controls', () => {
    const columns: GridColumn[] = [
      {
        field: frame.fields[0],
        fieldName: 'name',
        displayName: 'Name',
        align: 'left',
      },
    ];

    render(
      <>
        <button type="button">Outside control</button>
        <GridHeader
          columns={columns}
          sortField={null}
          sortDirection="asc"
          onSort={jest.fn()}
          onFilter={jest.fn()}
          filters={{}}
          minHeight={72}
          maxHeight={72}
          rows={[{ index: 0, data: { name: 'Alice' } }]}
          filterStyle="filterRow"
        />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Filter name/i }));
    expect(screen.getByTestId('column-filter-dropdown-name')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside control' }));

    expect(screen.queryByTestId('column-filter-dropdown-name')).not.toBeInTheDocument();
  });

  it('keeps the filter menu open when interacting with filter inputs and operator menu portals', () => {
    const columns: GridColumn[] = [
      {
        field: frame.fields[0],
        fieldName: 'name',
        displayName: 'Name',
        align: 'left',
      },
    ];

    render(
      <GridHeader
        columns={columns}
        sortField={null}
        sortDirection="asc"
        onSort={jest.fn()}
        onFilter={jest.fn()}
        filters={{}}
        minHeight={72}
        maxHeight={72}
        rows={[{ index: 0, data: { name: 'Alice' } }]}
        filterStyle="filterRow"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Filter name/i }));

    const valueInput = screen.getByTestId('column-filter-value-input');
    fireEvent.pointerDown(valueInput);
    fireEvent.focus(valueInput);
    expect(screen.getByTestId('column-filter-dropdown-name')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('operator-menu-option'));
    expect(screen.getByTestId('column-filter-dropdown-name')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('external-operator-menu-option'));
    expect(screen.getByTestId('column-filter-dropdown-name')).toBeInTheDocument();
  });

  it('filters visible rows through user interaction', () => {
    render(<Grid data={frame} options={baseOptions} width={800} height={400} highlightRules={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /Filter name/i }));
    fireEvent.change(screen.getByTestId('column-filter-value-input'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Bobby')).toBeInTheDocument();
  });

  it('applies SQL filters to dashboard query variables', () => {
    jest.useFakeTimers();
    const options: EnhancedGridOptions = {
      ...baseOptions,
      serverSideMode: true,
      queryFormat: 'sql',
      filterVariableName: 'gridFilter',
      sortVariableName: 'gridSort',
    };

    render(<Grid data={frame} options={options} width={800} height={400} highlightRules={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /Filter name/i }));
    fireEvent.change(screen.getByTestId('column-filter-value-input'), { target: { value: "O'Brien" } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(locationService.partial).toHaveBeenLastCalledWith(
      {
        'var-gridFilter': `"name" ILIKE '%O''Brien%'`,
        'var-gridSort': '',
      },
      true
    );
  });
});
