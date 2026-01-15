import { IconName } from '@grafana/data';

// Filter operators for column filtering
export type FilterOperator =
  // Text operators
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  // Numeric operators
  | 'eq' // equals
  | 'ne' // not equals
  | 'gt' // greater than
  | 'lt' // less than
  | 'gte' // greater than or equal
  | 'lte' // less than or equal
  | 'between'
  // Common operators
  | 'blank'
  | 'not_blank';

// Column filter state
export interface ColumnFilter {
  operator: FilterOperator;
  value: string | number;
  value2?: string | number; // For 'between' operator
}

// Column type for smart filtering
export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

// Filter style for header display
export type FilterStyle = 'filterRow' | 'filterButton' | 'none';

// Comparison operators (enum-based, safe)
export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null';

// Logical operators for combining conditions
export type LogicalOperator = 'AND' | 'OR';

// Single condition definition
export interface HighlightCondition {
  id: string;

  // Source field (the field we're checking)
  sourceField: string;

  // Operator
  operator: ComparisonOperator;

  // Comparison: either compare to a fixed value OR another field
  compareType: 'value' | 'field';
  compareValue?: string | number | boolean;
  compareField?: string;
}

// Condition group (supports nested groups for complex logic like (A && B) || C)
export interface ConditionGroup {
  id: string;

  // Type discriminator
  type: 'group';

  // Logical operator to combine items in this group (AND/OR)
  logicalOperator: LogicalOperator;

  // Items can be either individual conditions or nested groups
  items: Array<HighlightCondition | ConditionGroup>;
}

// Union type for condition elements
export type ConditionElement = HighlightCondition | ConditionGroup;

// Type guard functions
export function isConditionGroup(element: ConditionElement): element is ConditionGroup {
  return (element as ConditionGroup).type === 'group';
}

export function isCondition(element: ConditionElement): element is HighlightCondition {
  return !isConditionGroup(element);
}

// Icon source discriminator
export type IconSource = 'grafana' | 'emoji';

// Flexible icon value supporting both Grafana icons and emojis
export type IconValue = IconName | string;

// Icon definition with source metadata
export interface IconDefinition {
  value: IconValue;
  source: IconSource;
  type?: 'mono' | 'default' | 'solid'; // Only relevant for Grafana icons
}

// Type guards
export function isGrafanaIcon(value: IconValue, allIcons: string[]): boolean {
  return allIcons.includes(value);
}

export function isEmoji(value: IconValue, allIcons: string[]): boolean {
  return !allIcons.includes(value) && value.length <= 4; // Emojis are typically 1-4 chars
}

// Flag definition for flags column rule
export interface FlagDefinition {
  id: string;
  name: string;
  conditionGroup: ConditionGroup; // Reuse existing condition system
  icon: IconValue;
  iconSource?: IconSource; // Optional for backward compatibility (defaults to 'grafana')
  iconType?: 'mono' | 'default' | 'solid';
  iconColor?: string;
  tooltipText?: string; // Custom tooltip with {columnName} interpolation support
}

// Cell style definition
export interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through'; // Underline and strikethrough support
  borderColor?: string;
  borderWidth?: number;

  // Icon support
  icon?: IconValue;
  iconSource?: IconSource; // Optional for backward compatibility
  iconType?: 'mono' | 'default' | 'solid'; // Icon style
  iconPosition?: 'left' | 'right'; // Icon position

  // Custom renderer support
  customRenderer?: 'sparkChart' | 'flagsColumn';
  customRendererConfig?: SparkChartConfig | any;
}

/**
 * Spark chart configuration for custom cell rendering.
 * Used when customRenderer is set to 'sparkChart'.
 */
export interface SparkChartConfig {
  mode: 'line' | 'bar' | 'stack' | 'bullet';
  data: number[];
  colorMode: 'solid' | 'scheme';
  solidColor?: string;
  colorScheme?: string;
  height: number; // percentage of cell height
  stackColors?: Record<number, string>; // position-based colors for stack mode
  theme: any; // GrafanaTheme2 - avoid circular import

  // Scaling options for gradients (line/bar) and width (stack)
  scaleMode?: 'cell' | 'column' | 'global'; // cell=local, column=use scale field, global=column-wide
  scaleMin?: number; // computed min value for gradient scaling
  scaleMax?: number; // computed max value for gradient scaling
  stateTimeline?: boolean; // state timeline mode for bar charts (fixed scaling, no spacing)

  // Bullet chart specific properties
  bulletBgColorMode?: 'solid' | 'scheme';
  bulletBgColor?: string;
  bulletBgColorScheme?: string;
  bulletFgColorMode?: 'solid' | 'scheme';
  bulletFgColor?: string;
  bulletFgColorScheme?: string;
  bulletLineColorMode?: 'solid' | 'scheme';
  bulletLineColor?: string;
  bulletLineColorScheme?: string;

  // Stack-specific scaling (for width calculation)
  stackScaleMode?: 'full' | 'column' | 'global'; // full=100%, column=scale field, global=max total
  stackScaleValue?: number; // computed scale value (for rendering)

  /** Line interpolation mode for spark chart lines */
  lineInterpolation?: 'linear' | 'step' | 'curve';

  /** Reverse the gradient direction (1-value instead of value) */
  reverseGradient?: boolean;
  /** Reverse bullet chart background gradient */
  bulletBgReverse?: boolean;
  /** Reverse bullet chart foreground gradient */
  bulletFgReverse?: boolean;
  /** Reverse bullet chart target line gradient */
  bulletLineReverse?: boolean;
}

/**
 * Threshold level definition for threshold-based highlighting.
 * Each level defines a minimum value and the style to apply when exceeded.
 */
export interface ThresholdLevel {
  id: string;
  minValue: number;
  style: CellStyle;
}

/**
 * Value mapping entry for value-mapping-based highlighting.
 * Maps specific values to styles.
 */
export interface ValueMappingEntry {
  id: string;
  value: string | number | boolean;
  style: CellStyle;
}

/**
 * Highlight rule definition.
 * Supports three rule types:
 * - 'conditional': Rule based on condition groups (default, backward compatible)
 * - 'threshold': Rule based on numeric thresholds
 * - 'valueMapping': Rule based on exact value matches
 */
export interface HighlightRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Which columns this rule applies to (always an array, use MultiCombobox with enableAllOption for "all columns")
  targetFields: string[];

  // Rule type discriminator (defaults to 'conditional' for backward compatibility)
  ruleType?: 'conditional' | 'threshold' | 'valueMapping' | 'dataRangeGradient' | 'sparkChart' | 'flagsColumn';

  // ===== Conditional rule properties =====
  // Root condition group (supports nested logic like (A && B) || C)
  conditionGroup?: ConditionGroup;

  // Style to apply when conditions match (for conditional rules)
  style: CellStyle;

  // ===== Threshold rule properties =====
  /** Field to apply threshold comparison to */
  thresholdField?: string;
  /** Ordered threshold levels (evaluated from highest to lowest minValue) */
  thresholdLevels?: ThresholdLevel[];
  /** Base style to apply when no thresholds are met */
  baseStyle?: CellStyle;

  // ===== Value mapping rule properties =====
  /** Field to apply value mapping to */
  valueMappingField?: string;
  /** Value-to-style mappings */
  valueMappings?: ValueMappingEntry[];

  // ===== Data range gradient rule properties =====
  /** Source field for gradient calculation (numeric values) */
  dataRangeSourceField?: string;
  /** Range mode: auto-detect from data or manual entry */
  dataRangeMode?: 'auto' | 'manual';
  /** Manual minimum value for gradient range */
  dataRangeMin?: number;
  /** Manual maximum value for gradient range */
  dataRangeMax?: number;
  /** Grafana color scheme name (e.g., 'Green-Yellow-Red', 'Blues') */
  dataRangeColorScheme?: string;
  /** Apply gradient to background or foreground (text color) */
  dataRangeApplyTo?: 'background' | 'foreground';
  /** Reverse the data range gradient direction */
  dataRangeReverseGradient?: boolean;

  // ===== Spark chart rule properties =====
  /** Source field containing array or delimited string data */
  sparkChartSourceField?: string;
  /** Visualization mode: line, bar, stack, or bullet */
  sparkChartMode?: 'line' | 'bar' | 'stack' | 'bullet';
  /** Data separator character (default: ',') */
  sparkChartDataSeparator?: string;
  /** Color mode: solid color or gradient scheme */
  sparkChartColorMode?: 'solid' | 'scheme';
  /** Solid color (when colorMode is 'solid') */
  sparkChartSolidColor?: string;
  /** Grafana color scheme ID (when colorMode is 'scheme') */
  sparkChartColorScheme?: string;
  /** Chart height as percentage of cell height (default: 80) */
  sparkChartHeight?: number;
  /** Position-based color mapping for stack mode: {0: '#color1', 1: '#color2'} */
  sparkChartStackColors?: Record<number, string>;

  /** Scale mode for all chart types: 'cell' (local min/max), 'column' (use scale field), 'global' (column-wide min/max) */
  sparkChartScaleMode?: 'cell' | 'column' | 'global';
  /** Column to use for min/max when scaleMode is 'column' */
  sparkChartScaleField?: string;
  /** State timeline mode for bar charts: fixed vertical scaling and no horizontal spacing */
  sparkChartStateTimeline?: boolean;

  /** Line interpolation mode for spark chart lines: linear (straight lines), step (horizontal then vertical), or curve (smooth Bézier curves) */
  sparkChartLineInterpolation?: 'linear' | 'step' | 'curve';
  /** Reverse the spark chart gradient direction (line/bar/stack) */
  sparkChartReverseGradient?: boolean;

  // ===== Bullet chart properties =====
  /** Bullet chart background color mode: solid, scheme */
  sparkChartBulletBgColorMode?: 'solid' | 'scheme';
  /** Bullet chart background solid color */
  sparkChartBulletBgColor?: string;
  /** Bullet chart background color scheme */
  sparkChartBulletBgColorScheme?: string;
  /** Bullet chart foreground color mode: solid, scheme */
  sparkChartBulletFgColorMode?: 'solid' | 'scheme';
  /** Bullet chart foreground solid color */
  sparkChartBulletFgColor?: string;
  /** Bullet chart foreground color scheme */
  sparkChartBulletFgColorScheme?: string;
  /** Bullet chart target line color mode: solid, scheme */
  sparkChartBulletLineColorMode?: 'solid' | 'scheme';
  /** Bullet chart target line solid color */
  sparkChartBulletLineColor?: string;
  /** Bullet chart target line color scheme */
  sparkChartBulletLineColorScheme?: string;
  /** Reverse bullet chart background gradient */
  sparkChartBulletBgReverse?: boolean;
  /** Reverse bullet chart foreground gradient */
  sparkChartBulletFgReverse?: boolean;
  /** Reverse bullet chart target line gradient */
  sparkChartBulletLineReverse?: boolean;

  /** @deprecated Use sparkChartScaleMode instead */
  sparkChartStackScaleMode?: 'full' | 'column' | 'global';
  /** @deprecated Use sparkChartScaleField instead */
  sparkChartStackScaleField?: string;

  // ===== Flags column rule properties =====
  /** Name of the synthetic flags column */
  flagsColumnName?: string;
  /** Position of the flags column: first data column or last column */
  flagsColumnPosition?: 'first' | 'last';
  /** Width of the flags column in pixels (default: 60) */
  flagsColumnWidth?: number;
  /** Array of flag definitions with conditions and visual properties */
  flagDefinitions?: FlagDefinition[];
}

// Column configuration (stored in panel options)
export interface ColumnConfig {
  field: string;
  visible: boolean;
  width?: number;
  order: number;
}

// Main panel options
export interface EnhancedGridOptions {
  // Display settings
  showHeader: boolean;
  showRowNumbers: boolean;
  rowHeight: number;
  headerHeight: number;
  compactMode: boolean;
  compactHeaders: boolean;
  filterStyle: FilterStyle;

  // Frozen columns (count-based)
  freezeLeftColumns: number; // Number of columns to freeze on the left (0 = none)
  freezeRightColumns: number; // Number of columns to freeze on the right (0 = none)

  // Striping
  rowStripeEnabled: boolean;
  rowStripeColor?: string;

  // Borders
  borderStyle: 'none' | 'horizontal' | 'vertical' | 'all';

  // Column configurations
  columns: ColumnConfig[];

  // Global highlight rules
  highlightRules: HighlightRule[];

  // Pagination
  paginationEnabled: boolean;
  pageSize: number;

  // Virtual scrolling (alternative to pagination)
  virtualScrollEnabled: boolean;
  overscanRows: number;

  // Auto-size columns to content
  autoSizeAllColumns: boolean;
  autoSizeSampleSize: number;

  // Server-side filtering and sorting
  serverSideMode: boolean;
  filterVariableName: string;
  sortVariableName: string;
  queryFormat: 'odata' | 'sql' | 'json'; // Query format: OData, SQL WHERE/ORDER BY, or JSON

  // Server-side pagination
  serverSidePagination: boolean;
  skipVariableName: string; // For OData $skip / SQL OFFSET
  topVariableName: string; // For OData $top / SQL LIMIT
  countVariableName: string; // For total count (optional for SQL)
  includeCount: boolean; // Whether to include $count=true for OData
}

// Field config custom options (per-column in field overrides)
export interface EnhancedGridFieldConfig {
  // Column width
  width?: number;

  // Text alignment
  align?: 'left' | 'center' | 'right';

  // Tooltip (displayed on hover of info icon in header)
  tooltip?: string;

  // Header styling (applies only to header cell)
  headerBackgroundColor?: string;
  headerBorderColor?: string;
  headerBorderWidth?: number;
  headerTextColor?: string;

  // Column styling (applies only to data cells in this column)
  columnBackgroundColor?: string;
  columnTextColor?: string;
  columnFontWeight?: 'normal' | 'bold';
  columnFontStyle?: 'normal' | 'italic';
  columnTextDecoration?: 'none' | 'line-through';
}
