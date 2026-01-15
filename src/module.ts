import { PanelPlugin, FieldConfigProperty } from '@grafana/data';
import { EnhancedGridOptions, EnhancedGridFieldConfig } from './types';
import { EnhancedGridPanel } from './components/EnhancedGridPanel';
import { HighlightRuleEditor } from './components/ConfigEditor/HighlightRuleEditor';

export const plugin = new PanelPlugin<EnhancedGridOptions, EnhancedGridFieldConfig>(EnhancedGridPanel)
  // Configure field-level options (per-column overrides)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Unit]: {},
      [FieldConfigProperty.Decimals]: {},
      [FieldConfigProperty.DisplayName]: {},
      [FieldConfigProperty.NoValue]: {},
      [FieldConfigProperty.Color]: {},
    },
    useCustomConfig: (builder) => {
      builder
        .addNumberInput({
          path: 'width',
          name: 'Column Width',
          category: ['Display'],
          description: 'Width in pixels (leave empty for auto-sizing)',
          settings: {
            min: 50,
            max: 1000,
          },
        })
        .addSelect({
          path: 'align',
          name: 'Text Alignment',
          category: ['Display'],
          description: 'Horizontal text alignment (auto: right for numbers, left for text)',
          settings: {
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ],
          },
        })
        // Tooltip
        .addTextInput({
          path: 'tooltip',
          name: 'Header Tooltip',
          category: ['Header'],
          description: 'Tooltip text displayed when hovering over the info icon in the header',
        })
        // Header styling
        .addColorPicker({
          path: 'headerBackgroundColor',
          name: 'Header Background Color',
          category: ['Header Styling'],
          description: 'Background color for the column header',
        })
        .addColorPicker({
          path: 'headerTextColor',
          name: 'Header Text Color',
          category: ['Header Styling'],
          description: 'Text color for the column header',
        })
        .addColorPicker({
          path: 'headerBorderColor',
          name: 'Header Border Color',
          category: ['Header Styling'],
          description: 'Border color for the column header',
        })
        .addNumberInput({
          path: 'headerBorderWidth',
          name: 'Header Border Width',
          category: ['Header Styling'],
          description: 'Border width in pixels (0 for no border)',
          settings: {
            min: 0,
            max: 10,
            step: 1,
          },
        })
        // Column styling (data cells)
        .addColorPicker({
          path: 'columnBackgroundColor',
          name: 'Column Background Color',
          category: ['Column Styling'],
          description: 'Background color for data cells (overridden by cell styles and highlight rules)',
        })
        .addColorPicker({
          path: 'columnTextColor',
          name: 'Column Text Color',
          category: ['Column Styling'],
          description: 'Text color for data cells (overridden by cell styles and highlight rules)',
        })
        .addSelect({
          path: 'columnFontWeight',
          name: 'Column Font Weight',
          category: ['Column Styling'],
          description: 'Font weight for data cells (overridden by cell styles and highlight rules)',
          settings: {
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'bold', label: 'Bold' },
            ],
          },
        })
        .addSelect({
          path: 'columnFontStyle',
          name: 'Column Font Style',
          category: ['Column Styling'],
          description: 'Font style for data cells (overridden by cell styles and highlight rules)',
          settings: {
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'italic', label: 'Italic' },
            ],
          },
        })
        .addSelect({
          path: 'columnTextDecoration',
          name: 'Column Text Decoration',
          category: ['Column Styling'],
          description: 'Text decoration for data cells (overridden by cell styles and highlight rules)',
          settings: {
            options: [
              { value: 'none', label: 'None' },
              { value: 'line-through', label: 'Line-through' },
            ],
          },
        });
    },
  })
  // Configure panel-level options
  .setPanelOptions((builder) => {
    return (
      builder
        // Display section
        .addBooleanSwitch({
          path: 'showHeader',
          name: 'Show Header',
          defaultValue: true,
          category: ['Display'],
        })
        .addBooleanSwitch({
          path: 'showRowNumbers',
          name: 'Show Row Numbers',
          defaultValue: false,
          category: ['Display'],
        })
        .addBooleanSwitch({
          path: 'compactMode',
          name: 'Compact Mode',
          description: 'Reduce vertical spacing for denser display',
          defaultValue: false,
          category: ['Display'],
        })
        .addBooleanSwitch({
          path: 'compactHeaders',
          name: 'Compact Headers',
          description: 'Single-line headers with overflow hidden (no word wrap)',
          defaultValue: false,
          category: ['Display'],
        })
        .addRadio({
          path: 'filterStyle',
          name: 'Filter Style',
          description: 'How column filters are displayed',
          defaultValue: 'filterRow',
          settings: {
            options: [
              { value: 'filterRow', label: 'Filter Row' },
              { value: 'filterButton', label: 'Filter Button' },
              { value: 'none', label: 'None' },
            ],
          },
          category: ['Display'],
        })
        .addNumberInput({
          path: 'rowHeight',
          name: 'Row Height',
          defaultValue: 32,
          settings: { min: 20, max: 100 },
          category: ['Display'],
        })
        .addNumberInput({
          path: 'headerHeight',
          name: 'Header Height',
          defaultValue: 80,
          settings: { min: 40, max: 200 },
          category: ['Display'],
        })
        .addBooleanSwitch({
          path: 'rowStripeEnabled',
          name: 'Enable Row Striping',
          defaultValue: true,
          category: ['Display'],
        })
        .addNumberInput({
          path: 'freezeLeftColumns',
          name: 'Freeze Left Columns',
          description: 'Number of columns to freeze on the left (0 = none)',
          defaultValue: 0,
          settings: { min: 0, max: 10, integer: true },
          category: ['Display'],
        })
        .addNumberInput({
          path: 'freezeRightColumns',
          name: 'Freeze Right Columns',
          description: 'Number of columns to freeze on the right (0 = none)',
          defaultValue: 0,
          settings: { min: 0, max: 10, integer: true },
          category: ['Display'],
        })
        .addSelect({
          path: 'borderStyle',
          name: 'Border Style',
          defaultValue: 'horizontal',
          settings: {
            options: [
              { value: 'none', label: 'None' },
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
              { value: 'all', label: 'All' },
            ],
          },
          category: ['Display'],
        })

        // Pagination section
        .addBooleanSwitch({
          path: 'paginationEnabled',
          name: 'Enable Pagination',
          defaultValue: false,
          category: ['Pagination'],
        })
        .addNumberInput({
          path: 'pageSize',
          name: 'Page Size',
          defaultValue: 50,
          settings: { min: 10, max: 1000 },
          category: ['Pagination'],
          showIf: (config) => config.paginationEnabled,
        })

        // Virtual scrolling section
        .addBooleanSwitch({
          path: 'virtualScrollEnabled',
          name: 'Enable Virtual Scrolling',
          defaultValue: true,
          category: ['Display'],
        })
        .addNumberInput({
          path: 'overscanRows',
          name: 'Overscan Rows',
          description: 'Extra rows to render outside viewport',
          defaultValue: 5,
          settings: { min: 0, max: 50 },
          category: ['Display'],
          showIf: (config) => config.virtualScrollEnabled,
        })

        // Auto-size section
        .addBooleanSwitch({
          path: 'autoSizeAllColumns',
          name: 'Auto-Size All Columns',
          description:
            'Automatically size ALL columns to fit their content (ignores per-column settings). Columns with explicit widths are exempt.',
          defaultValue: false,
          category: ['Display'],
        })
        .addNumberInput({
          path: 'autoSizeSampleSize',
          name: 'Auto-Size Sample Size',
          description: 'Number of rows to sample for width calculation (higher = more accurate but slower)',
          defaultValue: 100,
          settings: { min: 10, max: 1000 },
          category: ['Display'],
          showIf: (config) => config.autoSizeAllColumns,
        })

        // Highlighting section (custom editor)
        .addCustomEditor({
          id: 'highlightRules',
          path: 'highlightRules',
          name: 'Column Formatting Rules',
          description: 'Configure highlighting, gradients, charts, and styling',
          category: ['Conditional Formatting'],
          editor: HighlightRuleEditor,
          defaultValue: [],
        })

        // Server-side filtering and sorting
        .addBooleanSwitch({
          path: 'serverSideMode',
          name: 'Enable Server-Side Mode',
          description: 'Push filters and sorting to datasource via dashboard variables',
          defaultValue: false,
          category: ['Server-Side'],
        })
        .addSelect({
          path: 'queryFormat',
          name: 'Query Format',
          description: 'Format for filter and sort queries',
          defaultValue: 'odata',
          settings: {
            options: [
              { value: 'odata', label: 'OData ($filter, $orderby)' },
              { value: 'sql', label: 'SQL (WHERE, ORDER BY)' },
              { value: 'json', label: 'JSON (Generic)' },
            ],
          },
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode,
        })
        .addTextInput({
          path: 'filterVariableName',
          name: 'Filter Variable Name',
          description:
            'Dashboard variable name for filter query only (e.g., "gridFilter"). Pagination uses separate variables below.',
          defaultValue: 'gridFilter',
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode,
        })
        .addTextInput({
          path: 'sortVariableName',
          name: 'Sort Variable Name',
          description:
            'Dashboard variable name for sort query only (e.g., "gridSort"). Pagination uses separate variables below.',
          defaultValue: 'gridSort',
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode,
        })

        // Server-side pagination
        .addBooleanSwitch({
          path: 'serverSidePagination',
          name: 'Enable Server-Side Pagination',
          description: 'Push pagination parameters to datasource via dashboard variables',
          defaultValue: false,
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode && config.paginationEnabled,
        })
        .addTextInput({
          path: 'skipVariableName',
          name: 'Skip/Offset Variable Name',
          description: 'Variable for OData $skip or SQL OFFSET (e.g., "gridSkip")',
          defaultValue: 'gridSkip',
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode && config.paginationEnabled,
        })
        .addTextInput({
          path: 'topVariableName',
          name: 'Top/Limit Variable Name',
          description: 'Variable for OData $top or SQL LIMIT (e.g., "gridTop")',
          defaultValue: 'gridTop',
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode && config.paginationEnabled,
        })
        .addTextInput({
          path: 'countVariableName',
          name: 'Count Variable Name (Optional)',
          description: 'Variable for total count - set manually for SQL datasources',
          defaultValue: 'gridCount',
          category: ['Server-Side'],
          showIf: (config) => config.serverSideMode && config.paginationEnabled,
        })
        .addBooleanSwitch({
          path: 'includeCount',
          name: 'Include Count in OData Query',
          description: 'Add $count=true to OData queries for total row count',
          defaultValue: true,
          category: ['Server-Side'],
          showIf: (config) =>
            config.serverSideMode &&
            config.paginationEnabled &&
            config.serverSidePagination &&
            config.queryFormat === 'odata',
        })
    );
  });
