# Grafana Panel Design Patterns: Business Table Analysis

This document extracts key design patterns, code snippets, and architectural decisions from the Busine
ss Table panel for reuse in custom Grafana panel development. Focus areas: sidebar configuration, over
rides, conditional cell highlighting, and cross-cell data access.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Plugin Registration & Sidebar Configuration](#plugin-registration--sidebar-configuration)
3. [Type System & Configuration Models](#type-system--configuration-models)
4. [Field Source Mapping System](#field-source-mapping-system)
5. [Custom Editor Components](#custom-editor-components)
6. [Cell Type System & Conditional Rendering](#cell-type-system--conditional-rendering)
7. [Conditional Row Highlighting](#conditional-row-highlighting)
8. [Column Filtering System](#column-filtering-system)
9. [Permission System](#permission-system)
10. [TanStack React Table Integration](#tanstack-react-table-integration)
11. [Useful Utility Functions](#useful-utility-functions)

---

## Architecture Overview

### Component Hierarchy

```
TablePanel (receives PanelProps<PanelOptions>)
├── useTable hook → processes columns + data
│   ├── useRuntimeVariables (Grafana variable resolution)
│   ├── useNestedObjects (related data fetching)
│   └── Creates ColumnDef[] for TanStack Table
├── Table (core table component)
│   ├── TableRow[]
│   │   ├── TableCell / TableEditableCell
│   │   └── CellRenderer → Type-specific renderers
│   ├── TableHeaderCell (with filter popups)
│   └── Pagination
└── Editor Components (sidebar configuration)
```

### Key Files Map

| File | Purpose |
|------|---------|
| `src/module.ts` | Plugin entry & sidebar builder |
| `src/types/panel.ts` | Main config types |
| `src/types/table.ts` | Cell & column enums |
| `src/hooks/useTable.tsx` | Data + columns processing |
| `src/utils/table.ts` | Filter, sort, accessor functions |
| `src/utils/group.ts` | Field/frame resolution utilities |

---

## Plugin Registration & Sidebar Configuration

### Basic Plugin Setup

```typescript
// src/module.ts
import { PanelPlugin } from '@grafana/data';
import { TablePanel } from './components';
import { PanelOptions } from './types';

export const plugin = new PanelPlugin<PanelOptions>(TablePanel)
  .useFieldConfig({})
  .setMigrationHandler(getMigratedOptions)
  .setPanelOptions((builder) => {
    // Configure sidebar options here
    return builder;
  });
```

### Adding Standard Options

```typescript
builder
  // Multi-select dropdown
  .addMultiSelect({
    path: 'toolbar.exportFormats',
    name: 'Table export formats',
    description: 'The first selected format is used by default',
    settings: {
      options: EXPORT_FORMAT_OPTIONS,
      isClearable: true,
    },
  })

  // Radio button group
  .addRadio({
    path: 'toolbar.alignment',
    name: 'Toolbar buttons alignment',
    settings: {
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
    },
    showIf: (config) => config.tables?.length > 1,  // Conditional visibility
    defaultValue: 'left',
  })

  // Boolean switch
  .addBooleanSwitch({
    path: 'tabsSorting',
    name: 'Tabs Sorting',
    description: 'Show selected tab first',
    showIf: (config) => config.tables?.length > 1,
  });
```

### Adding Custom Editor Components

The key pattern for complex configuration is using `addCustomEditor`:

```typescript
builder
  .addCustomEditor({
    id: 'tables',                    // Unique identifier
    path: 'tables',                  // Path in options object
    name: ' ',                       // Display name (space hides label)
    editor: TablesEditor,            // Your React component
    category: ['Layout'],            // Sidebar section
    defaultValue: [],                // Default value
    aliasIds: ['nestedObjects'],     // Migration aliases
  })
  .addCustomEditor({
    id: 'highlightData',
    path: 'tables',
    name: ' ',
    editor: HighlightDataEditor,
    category: ['Highlight Row'],
    defaultValue: [],
    showIf: (config) => config.tables.length > 0,  // Conditional display
  });
```

### Organizing Options into Categories

Categories create collapsible sections in the sidebar:

```typescript
builder
  // Category: Advanced
  .addBooleanSwitch({
    path: 'saveUserPreference',
    name: 'Save Preferences',
    category: ['Advanced'],
  })

  // Category: Column Manager
  .addRadio({
    path: 'openColumnManagerMode',
    name: 'Open manager mode',
    settings: {
      options: [
        { value: 'group', label: 'Group' },
        { value: 'column', label: 'Column' },
        { value: 'all', label: 'Both', description: 'Open from Column and Group' },
      ],
    },
    showIf: (config) => config.isColumnManagerAvailable,
    category: ['Column Manager'],
  });
```

---

## Type System & Configuration Models

### Main Panel Options Interface

```typescript
// src/types/panel.ts
export interface PanelOptions {
  tables: TableConfig[];
  tabsSorting: boolean;
  isColumnManagerAvailable: boolean;
  showFiltersInColumnManager: boolean;
  showSortingInColumnManager: boolean;
  saveUserPreference: boolean;
  openColumnManagerMode: OpenColumnManagerMode;
  toolbar: ToolbarOptions;
  nestedObjects: NestedObjectConfig[];
  externalExport: ExternalExportConfig;
}
```

### Table Configuration

```typescript
export interface TableConfig {
  name: string;
  showHeader: boolean;
  items: ColumnConfig[];           // Column definitions
  update: TableRequestConfig;      // Update datasource config
  pagination: TablePaginationConfig;
  expanded: boolean;
  addRow: TableOperationConfig;    // Add row operation
  deleteRow: TableOperationConfig; // Delete row operation
  actionsColumnConfig: ActionsColumnConfig;
  rowHighlight: RowHighlightConfig;
  stripedRows: boolean;
  highlightRowsOnHover: boolean;
}
```

### Column Configuration (Override System)

```typescript
export interface ColumnConfig {
  enabled: boolean;
  field: FieldSource;              // Maps to data frame field
  columnTooltip: string;
  label: string;                   // Display override
  type: CellType;                  // Rendering type
  objectId: string;                // For nested objects
  group: boolean;                  // Grouping enabled
  aggregation: CellAggregation;    // Aggregation function
  filter: ColumnFilterConfig;      // Filter settings
  sort: ColumnSortConfig;          // Sort settings
  appearance: ColumnAppearanceConfig;  // Visual styling
  footer: string[];                // Footer calculations
  newRowEdit: ColumnNewRowEditConfig;
  edit: ColumnEditConfig;          // Edit permissions
  pin: ColumnPinDirection;         // Sticky column
  preformattedStyle: boolean;
  scale: ImageScale;
  gauge: GaugeConfig;
  fileCell: FileConfig;
  showingRows: number;
}
```

### Cell Type Enumeration

```typescript
export enum CellType {
  AUTO = 'auto',
  COLORED_TEXT = 'coloredText',
  COLORED_BACKGROUND = 'coloredBackground',
  GAUGE = 'gauge',
  RICH_TEXT = 'rich_text',
  NESTED_OBJECTS = 'nested_objects',
  IMAGE = 'image',
  FILE = 'file',
  BOOLEAN = 'boolean',
  PREFORMATTED = 'preformatted',
  JSON = 'json',
}
```

### Appearance Configuration

```typescript
export interface ColumnAppearanceConfig {
  width: {
    auto: boolean;
    min?: number;
    max?: number;
    value: number;
  };
  wrap: boolean;
  alignment: ColumnAlignment;
  background: {
    applyToRow: boolean;  // Key feature: apply cell color to entire row
  };
  header: {
    fontSize: ColumnHeaderFontSize;
    fontColor?: string;
    backgroundColor?: string;
  };
}
```

---

## Field Source Mapping System

### FieldSource Interface

The key to mapping columns to data frame fields:

```typescript
// src/types/frame.ts
export interface FieldSource {
  name: string;                    // Field name in DataFrame
  source: string | number;         // RefId or frame index
}
```

### Field Resolution Utilities

```typescript
// src/utils/group.ts

/**
 * Create unique key for a field source
 */
export const getFieldKey = (field: FieldSource): string =>
  `${field.source}:${field.name}`;

/**
 * Check if a field matches a field source
 */
export const filterFieldBySource = (field: Field, fieldSource: FieldSource): boolean => {
  return field.name === fieldSource.name;
};

/**
 * Get DataFrame by source (supports both refId and index)
 */
export const getFrameBySource = (
  series: DataFrame[],
  fieldSource: FieldSource
): DataFrame | undefined => {
  if (typeof fieldSource.source === 'number') {
    return series[fieldSource.source];
  }
  return series.find((frame) => frame.refId === fieldSource.source);
};

/**
 * Get Field by source across all series
 */
export const getFieldBySource = (
  series: DataFrame[],
  fieldSource: FieldSource
): Field | undefined => {
  for (const frame of series) {
    const field = frame.fields.find((f) => filterFieldBySource(f, fieldSource));
    if (field) return field;
  }
  return undefined;
};
```

### Processing Columns from Data

```typescript
// src/hooks/useTable.tsx

const columnsData = useMemo(() => {
  if (!columnsConfig?.[0]?.field) {
    return { frame: null, items: [] };
  }

  // Get the frame for the first column's source
  const frame = getFrameBySource(data.series, columnsConfig[0].field);
  if (!frame) {
    return { frame: null, items: [] };
  }

  // Map each column config to its corresponding field
  const items = columnsConfig
    .map((config) => ({
      config,
      field: frame.fields.find((field) =>
        filterFieldBySource(field, config.field)
      ),
    }))
    .filter((item) => !!item.field);

  return { frame, items };
}, [columnsConfig, data.series]);
```

### Building Row Data

```typescript
const tableRawData = useMemo(() => {
  if (!columnsData.frame) return [];

  const rows = [];
  for (let rowIndex = 0; rowIndex < columnsData.frame.length; rowIndex++) {
    const row = columnsData.items.reduce(
      (acc, item) => ({
        ...acc,
        [item.field.name]: item.field.values[rowIndex],
      }),
      {}
    );
    rows.push(row);
  }
  return rows;
}, [columnsData]);
```

---

## Custom Editor Components

### Editor Component Props Pattern

```typescript
import { StandardEditorProps } from '@grafana/data';

type Props = StandardEditorProps<TableConfig[], null, PanelOptions>;

export const TablesEditor: React.FC<Props> = ({
  context: { options, data },  // Access to all panel options and data
  onChange,                     // Callback to update options
  value                         // Current value of this option
}) => {
  // Component implementation
};
```

### Drag-and-Drop List Editor

Pattern for reorderable items (tables, columns, etc.):

```typescript
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { Collapse } from '@volkovlabs/components';

export const TablesEditor: React.FC<Props> = ({ onChange, value }) => {
  const [collapseState, setCollapseState] = useState<Record<string, boolean>>({});

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    onChange(reorder(value, result.source.index, result.destination.index));
  }, [value, onChange]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="tables-editor">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {value.map((item, index) => (
              <Draggable key={item.name} draggableId={item.name} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <Collapse
                      title={item.name}
                      actions={
                        <>
                          <Button icon="trash-alt" onClick={() => removeItem(item)} />
                          <div {...provided.dragHandleProps}>
                            <Icon name="draggabledots" />
                          </div>
                        </>
                      }
                      isOpen={collapseState[item.name]}
                      onToggle={() => toggleExpanded(item.name)}
                    >
                      <ItemEditor value={item} onChange={updateItem} />
                    </Collapse>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
```

### Reorder Utility

```typescript
export const reorder = <T>(list: T[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};
```

### Field Picker Component Pattern

For selecting fields from query results:

```typescript
import { DataFrame, SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';

interface FieldPickerProps {
  value?: FieldSource;
  onChange: (field: FieldSource | undefined) => void;
  data: DataFrame[];
  alreadySelectedFields?: FieldSource[];
}

export const FieldPicker: React.FC<FieldPickerProps> = ({
  value,
  onChange,
  data,
  alreadySelectedFields = [],
}) => {
  const options = useMemo(() => {
    return data.flatMap((frame, frameIndex) =>
      frame.fields.map((field) => ({
        value: { name: field.name, source: frame.refId ?? frameIndex },
        label: `${field.name} (${frame.refId ?? frameIndex})`,
        // Disable already selected fields
        isDisabled: alreadySelectedFields.some(
          (f) => f.name === field.name && f.source === (frame.refId ?? frameIndex)
        ),
      }))
    );
  }, [data, alreadySelectedFields]);

  return (
    <Combobox
      value={value ? options.find(o =>
        o.value.name === value.name && o.value.source === value.source
      ) : undefined}
      onChange={(selected) => onChange(selected?.value)}
      options={options}
      isClearable
    />
  );
};
```

### Context for Nested Editors

Share data between nested editor components:

```typescript
// Create context
import { createContext, useContext } from 'react';

interface TablesEditorContextType {
  nestedObjects: NestedObjectConfig[];
}

export const tablesEditorContext = {
  Provider: createContext<TablesEditorContextType>({ nestedObjects: [] }).Provider,
  useContext: () => useContext(tablesEditorContext.Provider._currentValue),
};

// Wrap editors
<tablesEditorContext.Provider value={{ nestedObjects: options?.nestedObjects || [] }}>
  <TableEditor value={item} onChange={onChangeItem} />
</tablesEditorContext.Provider>

// Use in nested component
const { nestedObjects } = tablesEditorContext.useContext();
```

---

## Cell Type System & Conditional Rendering

### Cell Renderer Architecture

```typescript
// src/components/Table/components/CellRenderer/CellRenderer.tsx
import { CellContext } from '@tanstack/react-table';

interface Props extends CellContext<unknown, unknown> {
  bgColor?: string;
  panelData?: DataFrame[];
}

export const CellRenderer: React.FC<Props> = ({
  renderValue,
  column,
  panelData,
  bgColor,
  row
}) => {
  if (!column.columnDef.meta) return null;

  const { config, field } = column.columnDef.meta;
  const rawValue = renderValue() as number | string;
  const cellType = config.type || CellType.AUTO;

  switch (cellType) {
    case CellType.AUTO:
    case CellType.COLORED_TEXT:
    case CellType.COLORED_BACKGROUND:
      return <DefaultCellRenderer value={rawValue} field={field} config={config} bgColor={bgColor} />;

    case CellType.RICH_TEXT:
      return <LayoutCellRenderer value={String(rawValue)} row={row} bgColor={bgColor} />;

    case CellType.IMAGE:
      return <ImageCellRenderer value={String(rawValue)} column={column} />;

    case CellType.BOOLEAN:
      return <BooleanCellRenderer value={renderValue() as boolean} bgColor={bgColor} />;

    case CellType.GAUGE:
      return <GaugeCellRenderer value={rawValue as number} field={field} config={config} bgColor={bgCo
lor} />;

    default:
      return <DefaultCellRenderer value={rawValue} field={field} config={config} bgColor={bgColor} />;
  }
};
```

### Default Cell Renderer with Color Support

```typescript
import { Field, formattedValueToString } from '@grafana/data';
import { FormattedValueDisplay, useTheme2 } from '@grafana/ui';
import { css } from '@emotion/css';

interface Props {
  value: string | number;
  field: Field;
  config: ColumnConfig;
  bgColor?: string;
}

export const DefaultCellRenderer: React.FC<Props> = ({ field, value, config, bgColor }) => {
  const theme = useTheme2();
  let formattedValue = value;
  let color = 'inherit';

  // Use Grafana's display processor for formatting and colors
  if (field.display) {
    const displayValue = field.display(value);
    if (displayValue.color) {
      color = displayValue.color;
    }
    formattedValue = <FormattedValueDisplay value={displayValue} />;
  }

  // Determine text color based on cell type and background
  const cellTextClass = css`
    color: ${config.type === CellType.COLORED_TEXT
      ? color
      : bgColor
        ? theme.colors.getContrastText(bgColor)
        : 'inherit'};
  `;

  return <span className={cellTextClass}>{formattedValue}</span>;
};
```

---

## Conditional Row Highlighting

### Row Highlight Configuration

```typescript
export interface RowHighlightConfig {
  enabled: boolean;
  columnId: string;           // Column to match against
  variable: string;           // Dashboard variable name
  backgroundColor?: string;   // Highlight color
  scrollTo: ScrollToRowPosition;  // Auto-scroll behavior
  smooth: boolean;            // Smooth scrolling
  resetVariable: boolean;     // Reset variable after scroll
}

export enum ScrollToRowPosition {
  NONE = '',
  START = 'start',
  CENTER = 'center',
  END = 'end',
}
```

### Highlight State Calculation

```typescript
// In useTable hook

const ROW_HIGHLIGHT_STATE_KEY = '__rowHighlightStateKey';

const tableData = useMemo(() => {
  const rowsHighlightState: boolean[] = [];

  if (rowHighlightConfig?.enabled) {
    // Find the column to compare
    const item = columnsData.items.find(
      (item) => getFieldKey(item.config.field) === rowHighlightConfig.columnId
    );

    // Get the variable value
    const variable = getVariable(rowHighlightConfig.variable);

    if (item && variable && 'current' in variable) {
      // Build a map of variable values for quick lookup
      const variableValueMap = Array.isArray(variable.current.value)
        ? variable.current.value.reduce(
            (acc, value) => ({ ...acc, [value]: true }),
            {} as Record<string, boolean>
          )
        : { [variable.current.value as string]: true };

      // Mark each row's highlight state
      item.field.values.forEach((value) => {
        rowsHighlightState.push(variableValueMap[value] ?? false);
      });
    }
  }

  // Add highlight state to each row
  return tableRawData.map((row, rowIndex) => ({
    ...row,
    [ROW_HIGHLIGHT_STATE_KEY]: rowsHighlightState[rowIndex] ?? false,
  }));
}, [rowHighlightConfig, tableRawData, columnsData.items, getVariable]);
```

### Finding First Highlighted Row

```typescript
export const getFirstHighlightedRowIndex = <TData>(rows: Array<Row<TData>>): number => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Skip group rows
    if (row.originalSubRows) continue;

    // Check highlight state
    if (get(row.original, ROW_HIGHLIGHT_STATE_KEY)) {
      return rowIndex;
    }
  }
  return -1;
};
```

### Row Rendering with Highlight

```typescript
// In TableRow component

const rowAppearance = visibleCells.reduce((acc, cell) => {
  const { config, backgroundRowField } = cell.column.columnDef.meta || {};

  // Striped rows
  if (stripedRow) {
    acc.background = theme.colors.background.secondary;
  }

  // Apply column background to row (applyToRow feature)
  if (backgroundRowField?.display && !row.getIsGrouped()) {
    const bgValue = backgroundRowField.values[row.index];
    const displayValue = backgroundRowField.display(bgValue);
    if (displayValue.color) {
      acc.background = displayValue.color;
    }
  }

  // Apply row highlight color
  if (isHighlighted && rowHighlightConfig?.backgroundColor !== 'transparent') {
    acc.background = rowHighlightConfig.backgroundColor;
  }

  return acc;
}, { background: undefined });

return (
  <tr style={{ backgroundColor: rowAppearance.background }}>
    {/* cells */}
  </tr>
);
```

### Row Highlight Editor Component

```typescript
export const RowHighlightEditor: React.FC<Props> = ({ value, onChange, columns }) => {
  const columnOptions = useMemo(() =>
    columns.map((column) => ({
      value: getFieldKey(column.field),
      label: column.field.name,
    })),
    [columns]
  );

  const variableOptions = useMemo(() =>
    getTemplateSrv().getVariables().map((variable) => ({
      value: variable.name,
      label: variable.label || variable.name,
    })),
    []
  );

  return (
    <>
      <FieldsGroup label="State">
        <InlineField label="Column">
          <Combobox
            value={value.columnId}
            options={columnOptions}
            onChange={(e) => onChange({ ...value, columnId: e?.value ?? '' })}
            isClearable
          />
        </InlineField>
        <InlineField label="Variable">
          <Combobox
            value={value.variable}
            options={variableOptions}
            onChange={(e) => onChange({ ...value, variable: e?.value ?? '' })}
            isClearable
          />
        </InlineField>
      </FieldsGroup>

      <FieldsGroup label="Appearance">
        <InlineField label="Auto scroll to">
          <Combobox
            value={value.scrollTo}
            options={[
              { label: 'Off', value: ScrollToRowPosition.NONE },
              { label: 'Start', value: ScrollToRowPosition.START },
              { label: 'Center', value: ScrollToRowPosition.CENTER },
              { label: 'End', value: ScrollToRowPosition.END },
            ]}
            onChange={(e) => onChange({ ...value, scrollTo: e.value! })}
          />
        </InlineField>
        <InlineField label="Background">
          <ColorEditor
            value={value.backgroundColor}
            onChange={(color) => onChange({ ...value, backgroundColor: color })}
          />
        </InlineField>
      </FieldsGroup>
    </>
  );
};
```

---

## Column Filtering System

### Filter Configuration

```typescript
export interface ColumnFilterConfig {
  enabled: boolean;
  mode: ColumnFilterMode;      // 'client' or 'query'
  variable: string;            // Variable name for query mode
  defaultClientValue?: ColumnFilterValue;
}

export enum ColumnFilterMode {
  CLIENT = 'client',           // Filter on loaded data
  QUERY = 'query',             // Update variable to re-query
}

export enum ColumnFilterType {
  SEARCH = 'search',
  NUMBER = 'number',
  FACETED = 'faceted',
  TIMESTAMP = 'timestamp',
}
```

### Filter Value Types

```typescript
export type ColumnFilterValue =
  | { type: ColumnFilterType.FACETED; value: string[] }
  | { type: ColumnFilterType.NUMBER; value: [number, number]; operator: NumberFilterOperator }
  | { type: ColumnFilterType.SEARCH; value: string; caseSensitive: boolean }
  | { type: ColumnFilterType.TIMESTAMP; value: TimeRange; valueToFilter?: { from: number; to: number }
 }
  | { type: 'none' };
```

### Client-Side Filter Function

```typescript
import { filterFns, Row, FilterMeta } from '@tanstack/react-table';

export const columnFilter = <TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
  addMeta: (meta: FilterMeta) => void
): boolean => {
  const filter = identifyFilter(filterValue);

  switch (filter.type) {
    case ColumnFilterType.SEARCH:
      return filter.caseSensitive
        ? filterFns.includesStringSensitive(row, columnId, filter.value, addMeta)
        : filterFns.includesString(row, columnId, filter.value, addMeta);

    case ColumnFilterType.NUMBER:
      return numberFilter(row, columnId, filter.value, filter.operator);

    case ColumnFilterType.FACETED:
      return filter.value.some((val) => row.getValue(columnId) === val);

    case ColumnFilterType.TIMESTAMP:
      return timestampFilter(row, columnId, filter.valueToFilter!);

    default:
      return true;
  }
};

const numberFilter = <TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: [number, number],
  operator: NumberFilterOperator
): boolean => {
  const value = row.getValue(columnId) as number;
  const compareValue = filterValue[0];

  switch (operator) {
    case NumberFilterOperator.BETWEEN:
      return value >= Math.min(...filterValue) && value <= Math.max(...filterValue);
    case NumberFilterOperator.MORE:
      return value > compareValue;
    case NumberFilterOperator.LESS:
      return value < compareValue;
    case NumberFilterOperator.EQUAL:
      return value === compareValue;
    // ... other operators
  }
};
```

### Determining Filter Types by Field Type

```typescript
// In useTable hook
if (column.config.filter.mode === ColumnFilterMode.CLIENT) {
  switch (column.field.type) {
    case FieldType.string:
      availableFilterTypes.push(ColumnFilterType.SEARCH, ColumnFilterType.FACETED);
      break;
    case FieldType.number:
      availableFilterTypes.push(ColumnFilterType.NUMBER);
      break;
    case FieldType.time:
      availableFilterTypes.push(ColumnFilterType.TIMESTAMP);
      break;
    default:
      availableFilterTypes.push(ColumnFilterType.SEARCH, ColumnFilterType.FACETED);
  }
}
```

---

## Permission System

### Permission Configuration

```typescript
export enum PermissionMode {
  ALLOWED = '',           // Always allowed
  QUERY = 'query',        // Check a query field
  USER_ROLE = 'userRole', // Check user's org role
}

export interface PermissionConfig {
  mode: PermissionMode;
  field?: FieldSource;    // Field to check (for query mode)
  userRole: string[];     // Allowed roles (for userRole mode)
}
```

### Permission Check Utility

```typescript
import { CurrentUserDTO, DataFrame } from '@grafana/data';
import { config } from '@grafana/runtime';

export const checkIfOperationEnabled = (
  operationConfig: { enabled: boolean; permission: PermissionConfig },
  { series, user }: { series: DataFrame[]; user: CurrentUserDTO }
): boolean => {
  if (!operationConfig.enabled) return false;

  switch (operationConfig.permission.mode) {
    case PermissionMode.ALLOWED:
      return true;

    case PermissionMode.USER_ROLE:
      return operationConfig.permission.userRole.includes(user.orgRole);

    case PermissionMode.QUERY:
      if (!operationConfig.permission.field) return false;
      const field = getFieldBySource(series, operationConfig.permission.field);
      if (!field) return false;
      // Check last value in field (typically a boolean or truthy value)
      return !!field.values[field.values.length - 1];
  }
};

// Usage in component
const isEditAllowed = checkIfOperationEnabled(column.config.edit, {
  series: data.series,
  user: config.bootData.user,
});
```

---

## TanStack React Table Integration

### Creating Column Definitions

```typescript
import { ColumnDef } from '@tanstack/react-table';

const columns = useMemo(() => {
  return enabledColumns.map((column) => {
    const header = replaceVariables(column.config.label) ||
                   column.field.config?.displayName ||
                   column.field.name;

    // Size parameters
    const sizeParams = column.config.appearance.width.auto
      ? { minSize: column.config.appearance.width.min, maxSize: column.config.appearance.width.max }
      : { size: column.config.appearance.width.value, maxSize: column.config.appearance.width.value };

    return {
      id: column.field.name,
      accessorFn: (row) => row[column.field.name],
      header,
      cell: CellRenderer,
      aggregatedCell: AggregatedCellRenderer,
      enableGrouping: column.config.group,
      aggregationFn: column.config.aggregation === CellAggregation.NONE
        ? () => null
        : column.config.aggregation,
      enableColumnFilter: column.config.filter.enabled,
      filterFn: column.config.filter.mode === ColumnFilterMode.CLIENT
        ? columnFilter
        : () => true,
      enableSorting: column.config.sort.enabled,
      sortDescFirst: column.config.sort.descFirst,
      enablePinning: column.config.pin !== ColumnPinDirection.NONE,
      meta: {
        availableFilterTypes,
        filterMode: column.config.filter.mode,
        config: column.config,
        field: column.field,
        backgroundRowField,
        editable: isEditAllowed,
        editor: isEditAllowed ? getEditorControlOptions(column.config.edit.editor) : undefined,
      },
      footer: (context) => getFooterCell({ context, config: column.config, field: column.field, theme
}),
      ...sizeParams,
    };
  });
}, [columnsData, /* dependencies */]);
```

### Column Accessor Function

```typescript
export const createColumnAccessorFn = (accessorKey: string) =>
  (row: unknown) => (row as Record<string, unknown>)[accessorKey];
```

### Getting Pinned Column Styles

```typescript
const getPinnedColumnStyle = <TData>(
  theme: GrafanaTheme2,
  column: Column<TData>,
  bgColor: string | undefined
): CSSProperties => {
  const pinnedPosition = column.getIsPinned();
  if (!pinnedPosition) return {};

  const isFirstRightPinned = pinnedPosition === 'right' && column.getIsFirstColumn('right');

  return {
    boxShadow: isFirstRightPinned ? `-1px 0 ${theme.colors.border.weak}` : undefined,
    left: pinnedPosition === 'left' ? `${column.getStart('left')}px` : undefined,
    right: pinnedPosition === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: 'sticky',
    zIndex: 1,
    backgroundColor: bgColor || theme.colors.background.primary,
  };
};
```

---

## Useful Utility Functions

### Default Configuration Constants

```typescript
export const DEFAULT_COLUMN_APPEARANCE = {
  wrap: true,
  alignment: ColumnAlignment.START,
  width: { auto: true, min: 20, value: 100 },
  header: { fontSize: ColumnHeaderFontSize.MD },
  colors: {},
  background: { applyToRow: false },
};

export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  mode: PermissionMode.ALLOWED,
  userRole: [],
};

export const DEFAULT_COLUMN_EDIT_CONFIG: ColumnEditConfig = {
  enabled: false,
  permission: DEFAULT_PERMISSION_CONFIG,
  editor: { type: ColumnEditorType.STRING },
};
```

### Footer Cell Calculation

```typescript
import { reduceField, getDisplayProcessor, formattedValueToString, toDataFrame, fieldReducers } from '
@grafana/data';

export const getFooterCell = ({ context, config, field, theme }) => {
  const calc = config.footer[0];
  if (calc === undefined) return '';

  // Get filtered values from table
  const values = context.table.getFilteredRowModel().rows.map(
    (row) => row.getValue(context.column.id)
  );

  // Create field with filtered values
  const [filteredField] = toDataFrame({ fields: [{ ...field, values }] }).fields;

  // Calculate the reduction
  const fieldCalcValue = reduceField({ field: filteredField, reducers: config.footer })[calc];
  const format = field.display ?? getDisplayProcessor({ field: filteredField, theme });

  // Format based on reducer type
  const reducerInfo = fieldReducers.get(calc);
  if (reducerInfo.preservesUnits) {
    return formattedValueToString(format(fieldCalcValue));
  }
  return formattedValueToString({ text: fieldCalcValue });
};
```

### Convert Table to DataFrame (for Export)

```typescript
export const convertTableToDataFrame = <TData>(table: TableInstance<TData>): DataFrame => {
  const headerGroup = table.getHeaderGroups()[0];
  const fields = headerGroup.headers.map((header): Field => {
    const currentName = String(header.column.columnDef.header || header.column.columnDef.id);
    const field = header.column.columnDef.meta?.field || {
      name: currentName,
      type: FieldType.other,
      config: {}
    };

    return {
      ...field,
      name: currentName,
      config: { ...field.config, displayName: currentName },
      values: [],
    };
  });

  // Add row values
  table.getRowModel().rows.forEach((row) => {
    row.getVisibleCells().forEach((cell, cellIndex) => {
      fields[cellIndex].values.push(cell.getValue());
    });
  });

  return toDataFrame({ fields });
};
```

### Boolean Value Normalization

```typescript
export const normalizeBooleanCellValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
      case 'yes':
      case '1':
        return true;
      default:
        return false;
    }
  }
  return false;
};
```

---

## Key Takeaways

1. **Sidebar Configuration**: Use `addCustomEditor` with category grouping for complex configuration U
Is
2. **Field Mapping**: The `FieldSource` pattern allows flexible column-to-field mapping across multipl
e data frames
3. **Conditional Styling**: Use column metadata with `backgroundRowField` and `applyToRow` for cross-c
ell styling
4. **Row Highlighting**: Store highlight state in row data using a special key, compare against Grafan
a variables
5. **Permission System**: Three-tier permission (always, query-based, role-based) provides flexible ac
cess control
6. **TanStack Integration**: Store custom config in column `meta` for access in cell renderers
7. **Drag-and-Drop**: Use `@hello-pangea/dnd` for reorderable configuration lists

---

*Document generated from Business Table panel source analysis*
