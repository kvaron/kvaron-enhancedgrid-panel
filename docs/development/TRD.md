# Technical Requirements Document: Grafana Enhanced Grid Panel Plugin

**Version:** 1.0
**Date:** January 2026
**Target Platform:** Grafana 12.x
**Plugin Type:** Panel

Appendecies

- [TRD-APPENDIX1.md](docs/TRD-APPENDIX1.md)

---

## 1. Executive Summary

This document defines the technical requirements for a Grafana 12 panel plugin that provides an enhanced grid/table component with advanced cell highlighting, conditional formatting based on row-level calculations, and future support for server-side OData operations.

The plugin will be developed in two phases:

- **Phase 1:** Core grid functionality with advanced cell highlighting and row-based conditional logic
- **Phase 2:** Server-side sorting and filtering via OData/REST API integration

---

## 2. Goals

### Phase 1 Goals

- Provide a performant, feature-rich table/grid panel for Grafana 12
- Enable cell highlighting based on equations and expressions
- Support row-level data access for conditional formatting (access sibling cell values)
- Offer flexible configuration through the Grafana panel editor
- Maintain compatibility with all standard Grafana data sources

### Phase 2 Goals (Future)

- Integrate with Grafana Infinity datasource for OData support
- Implement server-side sorting via query parameter modification
- Implement server-side filtering via column header inputs
- Provide toggle option between client-side and server-side operations

### Non-Goals

- Replacing Grafana's native table panel entirely
- Supporting inline cell editing (read-only display)
- Implementing a full spreadsheet feature set

---

## 3. Technical Requirements

### 3.1 Plugin Metadata

```json
{
  "type": "panel",
  "name": "Enhanced Grid",
  "id": "custom-enhancedgrid-panel",
  "info": {
    "description": "Advanced grid panel with conditional cell highlighting and row-based calculations",
    "author": {
      "name": "Custom"
    },
    "keywords": ["table", "grid", "conditional", "highlighting"],
    "version": "1.0.0"
  },
  "dependencies": {
    "grafanaDependency": ">=12.0.0",
    "plugins": []
  }
}
```

### 3.2 Core Panel Features (Phase 1)

#### 3.2.1 Grid Display

| Requirement       | Description                                              |
| ----------------- | -------------------------------------------------------- |
| Column rendering  | Display all fields from data frame as columns            |
| Column visibility | Toggle individual column visibility                      |
| Column reordering | Drag-and-drop column reorder (persisted in panel config) |
| Column width      | Resizable columns with auto-fit option                   |
| Row striping      | Alternating row colors (configurable)                    |
| Pagination        | Client-side pagination with configurable page size       |
| Virtual scrolling | Optional virtual scrolling for large datasets            |

#### 3.2.2 Cell Highlighting System

The core differentiating feature: conditional cell styling based on expressions that can reference any field in the current row.

**Expression Context Object:**

```typescript
interface RowContext {
  // Current row's data as key-value pairs
  row: Record<string, any>;

  // Current cell's field name
  field: string;

  // Current cell's value
  value: any;

  // Row index
  rowIndex: number;

  // Access to all fields metadata
  fields: FieldInfo[];
}
```

**Supported Expression Types:**

1. **Simple Comparisons**

   ```
   value > 100
   row.status === 'error'
   row.temperature > row.threshold
   ```

2. **Cross-Field Calculations**

   ```
   row.actual / row.budget > 1.1
   row.responseTime > row.slaTarget
   (row.used / row.total) * 100 > 80
   ```

3. **String Operations**

   ```
   value.includes('CRITICAL')
   row.status.startsWith('ERR')
   ```

4. **Logical Combinations**
   ```
   row.status === 'warning' && row.count > 10
   value < 0 || value > row.maxAllowed
   ```

#### 3.2.3 Highlighting Rule Configuration

```typescript
interface HighlightRule {
  id: string;
  name: string;

  // Which columns this rule applies to ('*' for all, or specific field names)
  targetFields: string[] | '*';

  // JavaScript expression evaluated with RowContext
  expression: string;

  // Styling to apply when expression is true
  style: CellStyle;

  // Rule priority (lower = higher priority)
  priority: number;

  // Enable/disable without deletion
  enabled: boolean;
}

interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  borderColor?: string;
  borderWidth?: number;
  icon?: string; // Grafana icon name
  iconPosition?: 'left' | 'right';
}
```

#### 3.2.4 Predefined Highlighting Templates

Provide common templates users can apply and customize:

| Template            | Expression                         | Default Style        |
| ------------------- | ---------------------------------- | -------------------- |
| Positive/Negative   | `value >= 0`                       | Green/Red background |
| Threshold           | `value > threshold`                | Configurable         |
| Status Match        | `value === 'error'`                | Red background       |
| Percentage Warning  | `value > 80`                       | Yellow background    |
| Percentage Critical | `value > 95`                       | Red background       |
| Null/Empty          | `value === null \|\| value === ''` | Gray italic          |

#### 3.2.5 Column Configuration

```typescript
interface ColumnConfig {
  field: string;
  displayName?: string;
  width?: number | 'auto';
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  visible: boolean;
  sortable: boolean;

  // Column-specific formatting
  formatter?: ValueFormatter;

  // Column-specific highlight rules (in addition to global rules)
  highlightRules?: HighlightRule[];
}

interface ValueFormatter {
  type: 'number' | 'date' | 'duration' | 'bytes' | 'percent' | 'custom';
  options?: {
    decimals?: number;
    unit?: string;
    dateFormat?: string;
    prefix?: string;
    suffix?: string;
    customFormat?: string; // For 'custom' type
  };
}
```

### 3.3 Client-Side Operations (Phase 1)

#### 3.3.1 Sorting

- Click column header to sort (ascending/descending/none cycle)
- Multi-column sort with shift+click
- Sort indicator icons in headers
- Stable sort algorithm for consistent ordering

#### 3.3.2 Filtering

- Column header filter input (text match)
- Support for filter operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`
- Filter syntax: `>100`, `contains:error`, `!=pending`
- Combined filters (AND logic across columns)

### 3.4 Server-Side Operations (Phase 2 - Future)

> **Note:** This section describes Phase 2 requirements for planning purposes. Implementation is deferred.

#### 3.4.1 OData Integration Architecture

```typescript
interface ServerSideConfig {
  enabled: boolean;

  // Provider type for query generation
  provider: 'odata' | 'rest-generic';

  // Infinity datasource reference
  datasourceUid?: string;

  // OData specific settings
  odata?: {
    version: '2.0' | '4.0';

    // Map grid columns to OData entity properties (if different)
    fieldMapping?: Record<string, string>;

    // Additional query options to preserve
    baseQueryOptions?: string;
  };
}
```

#### 3.4.2 Query Parameter Generation

When server-side mode is enabled:

**Sorting:**

```
# OData v4
$orderby=ColumnName asc, OtherColumn desc

# OData v2
$orderby=ColumnName, OtherColumn desc
```

**Filtering:**

```
# OData v4
$filter=Status eq 'Active' and Value gt 100

# OData v2
$filter=Status eq 'Active' and Value gt 100
```

#### 3.4.3 Infinity Datasource Integration

The plugin will need to:

1. Detect if the panel's datasource is Infinity
2. Access the current query configuration
3. Modify the URL or query parameters
4. Trigger a query refresh

```typescript
interface QueryModification {
  // Append or replace these query parameters
  params: Record<string, string>;

  // How to handle existing params
  mode: 'append' | 'replace' | 'merge';
}
```

#### 3.4.4 Server-Side Toggle UX

- Toggle in panel options: "Use server-side sorting/filtering"
- Visual indicator in grid header when server-side mode is active
- Loading state during server requests
- Error handling for failed server operations with fallback option

---

## 4. Architecture

### 4.1 Component Structure

```

src/
├── module.ts                    # Plugin entry point
├── types.ts                     # TypeScript interfaces
├── EnhancedGridPanel.tsx        # Main panel component
├── components/
│   ├── Grid/
│   │   ├── Grid.tsx             # Core grid component
│   │   ├── GridHeader.tsx       # Column headers with sort/filter
│   │   ├── GridBody.tsx         # Row rendering
│   │   ├── GridCell.tsx         # Cell rendering with highlighting
│   │   └── VirtualScroller.tsx  # Virtual scroll implementation
│   ├── ConfigEditor/
│   │   ├── ColumnEditor.tsx     # Column configuration UI
│   │   ├── HighlightEditor.tsx  # Highlight rule editor
│   │   └── RuleBuilder.tsx      # Visual expression builder
│   └── common/
│       ├── FilterInput.tsx      # Column filter input
│       └── SortIndicator.tsx    # Sort direction indicator
├── utils/
│   ├── expressionEvaluator.ts   # Safe expression evaluation
│   ├── highlightEngine.ts       # Rule matching and style computation
│   ├── dataTransformer.ts       # Data frame to grid data
│   ├── sorting.ts               # Sort utilities
│   └── filtering.ts             # Filter utilities
├── hooks/
│   ├── useGridData.ts           # Data processing hook
│   ├── useHighlighting.ts       # Highlighting computation hook
│   └── useSorting.ts            # Sort state management
└── styles/
    └── grid.styles.ts           # Emotion/CSS styles
```

### 4.2 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Grafana Core                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Data Source │───▶│ Data Frame  │───▶│  Panel Props    │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Enhanced Grid Panel                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Data Transformer                        │    │
│  │  • Convert DataFrame to grid-friendly structure      │    │
│  │  • Apply column configuration                        │    │
│  │  • Build RowContext objects                          │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Highlight Engine                        │    │
│  │  • Evaluate expressions per cell                     │    │
│  │  • Match rules by priority                          │    │
│  │  • Compute final cell styles                        │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Sort/Filter Engine (Client-Side)            │    │
│  │  • Apply current sort state                         │    │
│  │  • Apply active filters                             │    │
│  │  • Handle pagination                                │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Grid Renderer                       │    │
│  │  • Render headers, rows, cells                      │    │
│  │  • Apply computed styles                            │    │
│  │  • Handle user interactions                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Expression Evaluation Security

The expression evaluator must be secure and sandboxed:

```typescript
// SAFE: Use a restricted evaluation context
const safeEvaluate = (expression: string, context: RowContext): boolean => {
  // Use a sandboxed evaluator (e.g., expr-eval library)
  // DO NOT use eval() or Function()

  const parser = new Parser();

  // Only allow safe operations
  parser.functions = {
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    min: Math.min,
    max: Math.max,
    // String functions
    lower: (s: string) => s?.toLowerCase(),
    upper: (s: string) => s?.toUpperCase(),
    trim: (s: string) => s?.trim(),
    len: (s: string) => s?.length ?? 0,
    contains: (s: string, sub: string) => s?.includes(sub) ?? false,
    startsWith: (s: string, sub: string) => s?.startsWith(sub) ?? false,
    endsWith: (s: string, sub: string) => s?.endsWith(sub) ?? false,
  };

  return parser.evaluate(expression, {
    value: context.value,
    row: context.row,
    rowIndex: context.rowIndex,
    field: context.field,
  });
};
```

---

## 5. Panel Options Schema

### 5.1 Main Options

```typescript
interface EnhancedGridOptions {
  // Display settings
  display: {
    showHeader: boolean;
    showRowNumbers: boolean;
    rowStripeEnabled: boolean;
    rowStripeColor: string;
    headerBackgroundColor: string;
    borderStyle: 'none' | 'horizontal' | 'vertical' | 'all';
  };

  // Pagination
  pagination: {
    enabled: boolean;
    pageSize: number;
    pageSizeOptions: number[];
  };

  // Virtual scrolling (alternative to pagination)
  virtualScroll: {
    enabled: boolean;
    rowHeight: number;
    overscan: number; // Extra rows to render outside viewport
  };

  // Column configurations
  columns: ColumnConfig[];

  // Global highlight rules
  highlightRules: HighlightRule[];

  // Default column settings
  columnDefaults: {
    width: number | 'auto';
    align: 'left' | 'center' | 'right';
    sortable: boolean;
  };

  // Phase 2: Server-side config
  serverSide?: ServerSideConfig;
}
```

### 5.2 Editor Categories

The panel editor will organize options into collapsible categories:

1. **Display** - Visual settings (striping, borders, colors)
2. **Columns** - Column visibility, ordering, formatting
3. **Highlighting** - Rule management with add/edit/delete
4. **Pagination** - Page size and controls
5. **Advanced** - Virtual scrolling, performance options
6. **Server-Side** (Phase 2) - OData/API configuration

---

## 6. Performance Requirements

| Metric               | Requirement                |
| -------------------- | -------------------------- |
| Initial render       | < 100ms for 1000 rows      |
| Sort operation       | < 50ms for 10,000 rows     |
| Filter operation     | < 50ms for 10,000 rows     |
| Highlight evaluation | < 1ms per cell (amortized) |
| Memory usage         | < 50MB for 100,000 cells   |
| Virtual scroll       | 60fps scrolling            |

### 6.1 Optimization Strategies

1. **Memoization** - Cache expression evaluation results
2. **Virtual rendering** - Only render visible rows
3. **Web Workers** - Offload heavy computations (sorting large datasets)
4. **Debouncing** - Debounce filter input and resize events
5. **Lazy evaluation** - Compute highlights only for visible cells

---

## 7. Dependencies

### 7.1 Required Grafana Packages

```json
{
  "@grafana/data": "^12.0.0",
  "@grafana/ui": "^12.0.0",
  "@grafana/runtime": "^12.0.0"
}
```

### 7.2 Additional Dependencies

```json
{
  "expr-eval": "^2.0.0", // Safe expression parsing
  "react-window": "^1.8.0", // Virtual scrolling
  "@emotion/css": "^11.0.0", // Styling (included with Grafana)
  "lodash": "^4.17.0" // Utilities (partial import)
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

- Expression evaluator: security and correctness
- Highlight engine: rule matching and priority
- Data transformer: DataFrame conversion
- Sort/filter utilities: correctness and edge cases

### 8.2 Integration Tests

- Panel rendering with various data shapes
- User interactions (sort, filter, pagination)
- Configuration changes via panel editor
- Theme compatibility (light/dark)

### 8.3 Performance Tests

- Render timing with large datasets
- Memory profiling
- Virtual scroll smoothness

### 8.4 Container-Based Testing

To enable rapid plugin development and testing, the project uses Docker to provision a fresh Grafana instance with the plugin pre-installed and configured.

#### 8.4.1 Docker Setup

**Prerequisites:**

- Docker Desktop installed and running
- Plugin built and available in `dist/` directory

**Container Configuration:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:12.0.0
    container_name: grafana-enhancedgrid-dev
    ports:
      - '3000:3000'
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_AUTH_BASIC_ENABLED=false
      - GF_AUTH_DISABLE_LOGIN_FORM=true
      - GF_SECURITY_ALLOW_EMBEDDING=true
      - GF_INSTALL_PLUGINS=marcusolsson-json-datasource,yesoreyeram-infinity-datasource
    volumes:
      - ./dist:/var/lib/grafana/plugins/custom-enhancedgrid-panel
      - ./provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-data:
```

#### 8.4.2 Provisioning Structure

Create a `provisioning/` directory with the following structure:

```
provisioning/
├── datasources/
│   ├── datasource-testdata.yml
│   └── datasource-infinity.yml
└── dashboards/
    ├── dashboard.yml
    └── test-dashboard.json
```

**Datasource Provisioning (provisioning/datasources/datasource-testdata.yml):**

```yaml
apiVersion: 1

datasources:
  - name: TestData
    type: testdata
    access: proxy
    uid: testdata-uid
    isDefault: true
    editable: false
    jsonData:
      name: TestData
```

**Datasource Provisioning (provisioning/datasources/datasource-infinity.yml):**

```yaml
apiVersion: 1

datasources:
  - name: Infinity
    type: yesoreyeram-infinity-datasource
    access: proxy
    uid: infinity-uid
    isDefault: false
    editable: true
    jsonData:
      name: Infinity
```

**Dashboard Provisioning (provisioning/dashboards/dashboard.yml):**

```yaml
apiVersion: 1

providers:
  - name: 'Test Dashboards'
    orgId: 1
    folder: 'Testing'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

**Test Dashboard (provisioning/dashboards/test-dashboard.json):**

```json
{
  "dashboard": {
    "title": "Enhanced Grid Test Dashboard",
    "uid": "enhanced-grid-test",
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "5s",
    "panels": [
      {
        "type": "custom-enhancedgrid-panel",
        "title": "Sample Grid - Random Walk",
        "gridPos": { "x": 0, "y": 0, "w": 24, "h": 12 },
        "id": 1,
        "targets": [
          {
            "refId": "A",
            "scenarioId": "random_walk",
            "datasource": {
              "type": "testdata",
              "uid": "testdata-uid"
            }
          }
        ],
        "options": {
          "display": {
            "showHeader": true,
            "showRowNumbers": true,
            "rowStripeEnabled": true,
            "rowStripeColor": "#f5f5f5",
            "headerBackgroundColor": "#1f1f1f",
            "borderStyle": "horizontal"
          },
          "pagination": {
            "enabled": true,
            "pageSize": 25,
            "pageSizeOptions": [10, 25, 50, 100]
          },
          "highlightRules": [
            {
              "id": "rule-1",
              "name": "Positive Values",
              "targetFields": "*",
              "expression": "value > 0",
              "style": {
                "backgroundColor": "#22bb33",
                "textColor": "#ffffff",
                "fontWeight": "bold"
              },
              "priority": 1,
              "enabled": true
            },
            {
              "id": "rule-2",
              "name": "Negative Values",
              "targetFields": "*",
              "expression": "value < 0",
              "style": {
                "backgroundColor": "#bb2124",
                "textColor": "#ffffff",
                "fontWeight": "bold"
              },
              "priority": 2,
              "enabled": true
            }
          ]
        }
      },
      {
        "type": "custom-enhancedgrid-panel",
        "title": "Sample Grid - CSV Data",
        "gridPos": { "x": 0, "y": 12, "w": 24, "h": 12 },
        "id": 2,
        "targets": [
          {
            "refId": "A",
            "scenarioId": "csv_content",
            "csvContent": "status,count,threshold,message\nerror,150,100,Critical error detected\nwarning,75,50,Warning threshold exceeded\nok,25,50,System operating normally\nerror,200,100,Database connection failed\nok,10,50,All systems green",
            "datasource": {
              "type": "testdata",
              "uid": "testdata-uid"
            }
          }
        ],
        "options": {
          "display": {
            "showHeader": true,
            "showRowNumbers": false,
            "rowStripeEnabled": true,
            "borderStyle": "all"
          },
          "highlightRules": [
            {
              "id": "status-error",
              "name": "Error Status",
              "targetFields": ["status"],
              "expression": "value === 'error'",
              "style": {
                "backgroundColor": "#ff0000",
                "textColor": "#ffffff",
                "fontWeight": "bold"
              },
              "priority": 1,
              "enabled": true
            },
            {
              "id": "count-threshold",
              "name": "Count Exceeds Threshold",
              "targetFields": ["count"],
              "expression": "value > row.threshold",
              "style": {
                "backgroundColor": "#ffaa00",
                "textColor": "#000000",
                "fontWeight": "bold"
              },
              "priority": 1,
              "enabled": true
            }
          ]
        }
      }
    ]
  },
  "overwrite": true
}
```

#### 8.4.3 Development Workflow

**1. Initial Setup:**

```bash
# Build the plugin
npm run build

# Start Grafana container
docker-compose up -d

# View logs
docker-compose logs -f grafana
```

**2. Access Grafana:**

- Open browser to `http://localhost:3000`
- No login required (anonymous admin access enabled)
- Navigate to "Testing" folder to find test dashboard

**3. Development Cycle:**

```bash
# Make code changes
# ...

# Rebuild plugin
npm run build

# Restart Grafana to reload plugin
docker-compose restart grafana

# Or use watch mode for automatic rebuilds
npm run dev

# Grafana will hot-reload the plugin (may require manual page refresh)
```

**4. Cleanup:**

```bash
# Stop and remove container
docker-compose down

# Remove volumes (resets all Grafana data)
docker-compose down -v
```

#### 8.4.4 Testing Scenarios

The provisioned test dashboard includes:

1. **Random Walk Data:** Tests dynamic, continuously updating numerical data
   - Validates real-time rendering
   - Tests positive/negative value highlighting
   - Verifies performance with updating data

2. **CSV Data:** Tests row-based conditional logic
   - Cross-field expressions (count > threshold)
   - Status-based highlighting
   - Multiple rule priorities

**Additional Test Scenarios to Add:**

3. **Large Dataset Test:**
   - Use TestData datasource with "CSV Metric Values" scenario
   - Generate 10,000+ rows
   - Test virtual scrolling performance
   - Validate pagination

4. **Complex Expressions:**
   - Nested calculations
   - String operations
   - Null/undefined handling

5. **Column Configuration:**
   - Test column visibility toggles
   - Column reordering persistence
   - Width adjustments
   - Custom formatters

#### 8.4.5 CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# .github/workflows/test.yml (example)
name: Test Plugin

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Start Grafana
        run: docker-compose up -d

      - name: Wait for Grafana
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:3000/api/health; do sleep 2; done'

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Stop Grafana
        run: docker-compose down
```

#### 8.4.6 Troubleshooting

**Plugin not appearing in panel list:**

- Verify `dist/` folder contains plugin.json and module.js
- Check Grafana logs for plugin loading errors: `docker-compose logs grafana | grep -i error`
- Ensure plugin ID matches: `custom-enhancedgrid-panel`

**Dashboard not provisioning:**

- Check JSON syntax in test-dashboard.json
- Verify provisioning path in docker-compose.yml
- Look for provisioning errors in logs

**Permission issues:**

- On Linux/Mac, ensure proper ownership: `sudo chown -R 472:472 ./provisioning`
- Or run with user override in docker-compose.yml:
  ```yaml
  user: '${UID}:${GID}'
  ```

---

## 9. Implementation Phases

### Phase 1: Core Grid with Highlighting

**Milestone 1.1: Project Setup**

- Scaffold plugin with `@grafana/create-plugin`
- Configure TypeScript, testing, and build
- Set up development environment

**Milestone 1.2: Basic Grid**

- Data frame to grid transformation
- Basic table rendering
- Column headers and rows
- Client-side sorting (single column)

**Milestone 1.3: Column Configuration**

- Column visibility toggle
- Column reordering
- Width configuration
- Value formatters

**Milestone 1.4: Highlighting System**

- Expression evaluator implementation
- Highlight rule configuration UI
- Rule priority and matching
- Predefined templates

**Milestone 1.5: Advanced Features**

- Multi-column sorting
- Column filtering
- Pagination
- Virtual scrolling option

**Milestone 1.6: Polish**

- Theme compatibility
- Accessibility (keyboard navigation, ARIA)
- Documentation
- Performance optimization

### Phase 2: Server-Side Operations (Future)

**Milestone 2.1: Architecture**

- Query interception design
- Infinity datasource integration research
- OData query builder

**Milestone 2.2: Implementation**

- Server-side sort with query modification
- Server-side filter with query modification
- Mode toggle and state management

**Milestone 2.3: Refinement**

- Error handling and fallbacks
- Loading states
- Cache management

---

## 10. Design Decisions (Implementation Phase 1 - January 2026)

### 10.1 Grid Implementation Choice

**Decision:** Custom grid with react-window for virtualization (instead of using pre-built library)

**Rationale:**

- **Full Control:** Complete control over rendering enables perfect Grafana integration
- **Bundle Size:** Lighter weight compared to full-featured libraries like Mantine React Table
- **Custom Highlighting:** Easier to implement custom row-based highlighting logic without library constraints
- **Field Config Integration:** Better integration with Grafana's field configuration system
- **Performance:** Optimized specifically for our requirements without unnecessary features

**Alternatives Considered:**

1. **Mantine React Table** - Feature-rich but has own styling system that may conflict with Grafana
2. **React Data Grid (Comcast)** - More lightweight but still has styling constraints

---

### 10.2 Expression System Architecture Change

**Original TRD Approach:** JavaScript-like expressions evaluated with expr-eval library

```typescript
// Original approach (from initial TRD)
expression: "value > row.threshold && row.status === 'error'";
```

**Implemented Approach:** Structured condition objects configured via UI

```typescript
// New approach (implemented)
conditions: [
  {
    sourceField: 'value',
    operator: 'greater_than',
    compareField: 'threshold',
    logicalOperator: 'AND',
  },
  {
    sourceField: 'status',
    operator: 'equals',
    compareValue: 'error',
  },
];
```

**Rationale for Change:**

1. **Security:** No code execution risk (expr-eval has known security vulnerabilities)
2. **User Experience:** Visual condition builder is more accessible to non-technical users
3. **Grafana Consistency:** Matches Grafana's transformation UI patterns (familiar UX)
4. **Maintainability:** Easier to validate, test, and extend operators
5. **Type Safety:** Enum-based operators ensure correctness at compile time
6. **Debugging:** Structured data is easier to inspect and debug than text expressions

**Implementation Details:**

- Operators defined as TypeScript enums (`ComparisonOperator` type)
- Safe evaluation using switch statements (no `eval()`, no `Function()`)
- UI built with Grafana's standard components (Combobox, Input, etc.)

---

### 10.3 Supported Operators

**Comparison Operators:**

- `equals` - Strict equality (===)
- `not_equals` - Strict inequality (!==)
- `greater_than` - Numeric comparison (>)
- `less_than` - Numeric comparison (<)
- `greater_than_or_equal` - Numeric comparison (>=)
- `less_than_or_equal` - Numeric comparison (<=)

**String Operators:**

- `contains` - Case-insensitive substring match
- `not_contains` - Case-insensitive substring non-match
- `starts_with` - Case-insensitive prefix match
- `ends_with` - Case-insensitive suffix match

**Null Operators:**

- `is_null` - Checks for null or undefined
- `is_not_null` - Checks for non-null and non-undefined

**Logical Operators:**

- `AND` - All conditions must be true
- `OR` - At least one condition must be true

All operators include type checking before evaluation to prevent runtime errors.

---

### 10.4 Highlighting Architecture

**Two-Level Rule System:**

1. **Global Rules** (Panel Options)
   - Defined in panel configuration under "Highlighting" category
   - Apply across all columns by default
   - Can be scoped to specific columns via `targetFields` property

2. **Column-Specific Rules** (Field Overrides)
   - Defined per-column in Grafana's field override system
   - Apply only to the specific column
   - Combined with global rules during evaluation

**Rule Priority:**

- Rules are evaluated in priority order (lower number = higher priority)
- First matching rule wins (no rule cascading)
- Column-specific rules and global rules share the same priority space

**Rule Structure:**

```typescript
interface HighlightRule {
  id: string; // Unique identifier
  name: string; // User-friendly name
  enabled: boolean; // Enable/disable without deletion
  priority: number; // Evaluation order (lower = first)
  targetFields: string[] | '*'; // Which columns to apply to
  conditions: HighlightCondition[]; // Evaluation logic
  style: CellStyle; // Styles to apply when matched
}
```

---

### 10.5 Component Architecture

**Directory Structure:**

```
src/
├── types.ts                          # All TypeScript interfaces
├── module.ts                         # Plugin registration and config
├── components/
│   ├── EnhancedGridPanel.tsx        # Main panel entry point
│   ├── Grid/
│   │   ├── Grid.tsx                 # Container with sort/filter logic
│   │   ├── GridHeader.tsx           # Column headers
│   │   ├── GridBody.tsx             # Virtual scrolled body
│   │   └── GridCell.tsx             # Individual cell renderer
│   └── ConfigEditor/
│       ├── HighlightRuleEditor.tsx  # Rule management UI
│       └── ConditionBuilder.tsx     # Condition configuration UI
└── utils/
    ├── conditionEvaluator.ts        # Safe condition evaluation
    ├── highlightEngine.ts           # Rule matching logic
    └── dataTransformer.ts           # DataFrame → Grid data
```

**Key Design Patterns:**

- **Separation of Concerns:** UI components separate from business logic
- **React Hooks:** Use memoization for performance (useMemo, useCallback)
- **Type Safety:** All interfaces defined in types.ts, imported throughout
- **Grafana Integration:** Uses Grafana's standard UI components (@grafana/ui)

---

### 10.6 Dependencies

**Production Dependencies:**

- `react-window` (1.8.10) - Virtual scrolling for performance
- Grafana packages already in project (@grafana/data, @grafana/ui, etc.)

**Why react-window:**

- Lightweight (smaller bundle than react-virtualized)
- Well-maintained and widely used
- Simple API that fits our needs
- Used by many Grafana plugins

**Rejected Dependencies:**

- `expr-eval` - Security concerns (code execution)
- `lodash` - Unnecessary, using native JS methods
- Grid libraries - Better to build custom for our specific needs

---

### 10.7 Performance Considerations

**Virtual Scrolling:**

- Renders only visible rows + overscan buffer
- Default overscan: 5 rows
- Handles 10,000+ rows smoothly

**Memoization:**

- Column transformations memoized (useMemo)
- Highlight style computation memoized per cell
- Sort/filter operations memoized

**Evaluation Efficiency:**

- Condition evaluation uses switch statements (fast)
- No string parsing or regex compilation
- Early exit on first matching rule

---

### 10.8 Integration with Grafana Field Config

**Per-Column Configuration:**
Users can configure columns via Grafana's field override system:

1. **Standard Options Available:**
   - Unit formatting
   - Decimal places
   - Display name
   - No value text
   - Color configuration

2. **Custom Options:**
   - Column width (pixels)
   - Text alignment (left, center, right)
   - Column-specific highlight rules

**Configuration Flow:**

```
User edits field override
  → Saved to panel's fieldConfig
  → Passed to panel via props
  → Extracted in dataTransformer
  → Applied to GridColumn objects
  → Used by GridCell for rendering
```

---

### 10.9 Future Extensibility

**Phase 2 Preparation:**
The architecture supports future server-side operations:

- Grid component receives rows as prop (easy to swap data source)
- Sort/filter logic isolated in Grid.tsx (can be conditionally bypassed)
- Query modification can be added via panel options
- Toggle between client-side and server-side modes

**Potential Enhancements:**

- Additional operators (regex, date comparisons)
- Rule templates/presets
- Import/export rule configurations
- Column reordering via drag-and-drop
- Keyboard navigation improvements
- Export to CSV with highlighted cells

---

## 11. Open Questions

1. **Expression Security:** Should we support a custom DSL instead of JavaScript-like expressions for better security guarantees?

2. **Column Width Persistence:** Should column widths be persisted per-user (browser storage) or per-dashboard (panel config)?

3. **Export Functionality:** Should the grid support CSV/Excel export with highlighting information?

4. **Row Actions:** Should we support configurable row click actions (links, drilldown)?

5. **Phase 2 Scope:** Should server-side operations support other query types beyond OData (GraphQL, custom REST)?

---

## 11. Appendix

### A. Expression Examples

```javascript
// Highlight cell red if status is 'error'
row.status === 'error';

// Highlight if value exceeds threshold from another column
value >
  row.threshold(
    // Percentage-based highlighting
    row.used / row.total
  ) *
    100 >
  80;

// Complex condition
row.priority === 'high' && row.age > 24;

// String matching
row.message.toLowerCase().includes('warning');

// Null handling
value !== null && value !== undefined && value > 0;

// Date comparison (assuming numeric timestamp)
Date.now() - row.lastUpdated > 86400000; // Older than 24 hours
```

### B. OData Query Examples (Phase 2)

```
# Sort ascending by Name
$orderby=Name

# Sort descending by Date, then ascending by Name
$orderby=Date desc, Name asc

# Filter equals
$filter=Status eq 'Active'

# Filter with multiple conditions
$filter=Status eq 'Active' and Priority gt 5

# Filter with contains (OData v4)
$filter=contains(Name, 'test')
```

---

_End of Document_
