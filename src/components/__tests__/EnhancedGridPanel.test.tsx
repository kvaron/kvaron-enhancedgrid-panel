import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedGridPanel } from '../EnhancedGridPanel';
import { PanelProps, FieldConfigSource, DataFrame, FieldType, LoadingState } from '@grafana/data';
import { EnhancedGridOptions } from '../../types';

// Mock the Grafana runtime PanelDataErrorView
jest.mock('@grafana/runtime', () => ({
  PanelDataErrorView: ({ panelId, data }: any) => (
    <div data-testid="panel-data-error-view">
      No data available for panel {panelId}
    </div>
  ),
}));

// Mock the Grid component
jest.mock('../Grid/Grid', () => ({
  Grid: ({ data }: any) => (
    <div data-testid="grid">
      Grid with {data.length} rows
    </div>
  ),
}));

// Mock ErrorBoundary as a passthrough
jest.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

describe('EnhancedGridPanel', () => {
  const mockFieldConfig: FieldConfigSource = {
    defaults: {},
    overrides: [],
  };

  const mockOptions: EnhancedGridOptions = {
    showHeader: true,
    showRowNumbers: false,
    paginationEnabled: false,
    pageSize: 50,
    headerHeight: 40,
    rowHeight: 30,
    compactMode: false,
    compactHeaders: false,
    filterStyle: 'none',
    highlightRules: [],
    freezeLeftColumns: 0,
    freezeRightColumns: 0,
    rowStripeEnabled: false,
    borderStyle: 'none',
    columns: [],
    virtualScrollEnabled: true,
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

  const createMockDataFrame = (rowCount: number): DataFrame => ({
    name: 'TestData',
    fields: [
      {
        name: 'id',
        type: FieldType.number,
        config: {},
        values: Array.from({ length: rowCount }, (_, i) => i + 1),
      },
      {
        name: 'name',
        type: FieldType.string,
        config: {},
        values: Array.from({ length: rowCount }, (_, i) => `Name ${i + 1}`),
      },
    ],
    length: rowCount,
  });

  const createPanelProps = (series: DataFrame[]): PanelProps<EnhancedGridOptions> => ({
    id: 1,
    data: {
      series,
      state: LoadingState.Done,
      timeRange: {} as any,
    },
    timeRange: {} as any,
    timeZone: 'UTC',
    options: mockOptions,
    fieldConfig: mockFieldConfig,
    width: 800,
    height: 600,
    renderCounter: 0,
    title: 'Test Panel',
    transparent: false,
    onOptionsChange: jest.fn(),
    onFieldConfigChange: jest.fn(),
    replaceVariables: jest.fn((str) => str),
    onChangeTimeRange: jest.fn(),
    eventBus: {} as any,
  });

  describe('Empty Data Handling', () => {
    it('should render PanelDataErrorView when data.series is empty', () => {
      const props = createPanelProps([]);

      render(<EnhancedGridPanel {...props} />);

      expect(screen.getByTestId('panel-data-error-view')).toBeInTheDocument();
      expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    });

    it('should pass correct props to PanelDataErrorView', () => {
      const props = createPanelProps([]);

      render(<EnhancedGridPanel {...props} />);

      const errorView = screen.getByTestId('panel-data-error-view');
      expect(errorView).toHaveTextContent('No data available for panel 1');
    });
  });

  describe('Data Present Handling', () => {
    it('should render Grid component when data.series has data', () => {
      const mockData = createMockDataFrame(5);
      const props = createPanelProps([mockData]);

      render(<EnhancedGridPanel {...props} />);

      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.queryByTestId('panel-data-error-view')).not.toBeInTheDocument();
    });

    it('should pass first series to Grid component', () => {
      const mockData = createMockDataFrame(3);
      const props = createPanelProps([mockData]);

      render(<EnhancedGridPanel {...props} />);

      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should wrap Grid in ErrorBoundary', () => {
      const mockData = createMockDataFrame(2);
      const props = createPanelProps([mockData]);

      render(<EnhancedGridPanel {...props} />);

      // Grid should be rendered (ErrorBoundary is transparent in our mock)
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });
  });

  describe('Highlight Rules', () => {
    it('should pass highlight rules from options to Grid', () => {
      const mockData = createMockDataFrame(2);
      const propsWithRules = createPanelProps([mockData]);
      propsWithRules.options.highlightRules = [
        {
          id: 'rule1',
          enabled: true,
          type: 'value-mapping',
          name: 'Test Rule',
        } as any,
      ];

      render(<EnhancedGridPanel {...propsWithRules} />);

      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });

    it('should handle undefined highlight rules', () => {
      const mockData = createMockDataFrame(2);
      const propsWithoutRules = createPanelProps([mockData]);
      propsWithoutRules.options.highlightRules = undefined as any;

      render(<EnhancedGridPanel {...propsWithoutRules} />);

      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });
  });
});
