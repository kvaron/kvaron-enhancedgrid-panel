import { HighlightRule, CellStyle, SparkChartConfig } from '../types';
import { evaluateConditionGroup, RowContext } from './conditionEvaluator';
import { getColorFromScheme, getContrastingTextColor } from './colorUtils';
import { GrafanaTheme2 } from '@grafana/data';

// Re-export RowContext for use by other modules
export type { RowContext };

/**
 * Enhanced RowContext with optional range data for auto-detect mode.
 */
export interface EnhancedRowContext extends RowContext {
  /** Pre-calculated min/max ranges for numeric fields (used in auto-detect mode) */
  fieldRanges?: Record<string, { min: number; max: number }>;
  /** Theme for color scheme resolution */
  theme?: GrafanaTheme2;
  /** Global min/max values for spark chart fields (used for 'global' scale mode) */
  sparkChartGlobalRanges?: Record<string, { min: number; max: number }>;
}

/**
 * Evaluate a threshold rule against a row context.
 * Returns the style from the matching threshold level, or baseStyle if no match.
 */
function evaluateThresholdRule(rule: HighlightRule, context: RowContext): CellStyle | null {
  // Check if threshold field is defined
  if (!rule.thresholdField) {
    return null;
  }

  // Get the value from the row
  const rawValue = context.row[rule.thresholdField];

  // Convert to number and validate
  const numValue = Number(rawValue);
  if (isNaN(numValue)) {
    return null;
  }

  // If no threshold levels defined, return baseStyle
  if (!rule.thresholdLevels || rule.thresholdLevels.length === 0) {
    return rule.baseStyle || null;
  }

  // Sort threshold levels by minValue descending (highest to lowest)
  const sortedLevels = [...rule.thresholdLevels].sort((a, b) => b.minValue - a.minValue);

  // Find first level where value >= minValue
  for (const level of sortedLevels) {
    if (numValue >= level.minValue) {
      return level.style;
    }
  }

  // No level matched, return baseStyle
  return rule.baseStyle || null;
}

/**
 * Evaluate a value mapping rule against a row context.
 * Returns the style from the matching value mapping, or null if no match.
 */
function evaluateValueMappingRule(rule: HighlightRule, context: RowContext): CellStyle | null {
  // Check if value mapping field is defined
  if (!rule.valueMappingField) {
    return null;
  }

  // Get the value from the row
  const fieldValue = context.row[rule.valueMappingField];

  // If no value mappings defined, return null
  if (!rule.valueMappings || rule.valueMappings.length === 0) {
    return null;
  }

  // Find exact match using strict equality
  for (const mapping of rule.valueMappings) {
    if (mapping.value === fieldValue) {
      return mapping.style;
    }
  }

  // No match found
  return null;
}

/**
 * Evaluate a data range gradient rule against a row context.
 * Returns a style with gradient color applied to background or foreground.
 */
function evaluateDataRangeGradientRule(rule: HighlightRule, context: EnhancedRowContext): CellStyle | null {
  // Validate required fields
  if (!rule.dataRangeSourceField || !rule.dataRangeColorScheme || !rule.dataRangeApplyTo) {
    return null;
  }

  // Check if theme is available
  if (!context.theme) {
    console.warn('Theme not available for gradient color calculation');
    return null;
  }

  // Get the value from the source field
  const rawValue = context.row[rule.dataRangeSourceField];
  const numValue = Number(rawValue);

  // Validate numeric value
  if (isNaN(numValue)) {
    return null;
  }

  // Determine min/max range
  let min: number;
  let max: number;

  if (rule.dataRangeMode === 'auto') {
    // Use pre-calculated ranges from context
    const range = context.fieldRanges?.[rule.dataRangeSourceField];
    if (!range) {
      console.warn(`No range data available for field '${rule.dataRangeSourceField}'`);
      return null;
    }
    min = range.min;
    max = range.max;
  } else {
    // Use manual min/max values
    if (rule.dataRangeMin === undefined || rule.dataRangeMax === undefined) {
      return null;
    }
    min = rule.dataRangeMin;
    max = rule.dataRangeMax;
  }

  // Handle edge case where min === max
  if (min === max) {
    // All values are the same, use middle of gradient
    const color = getColorFromScheme(
      rule.dataRangeColorScheme,
      0.5,
      context.theme,
      rule.dataRangeReverseGradient ?? false
    );
    return rule.dataRangeApplyTo === 'background'
      ? { backgroundColor: color, textColor: getContrastingTextColor(color) }
      : { textColor: color };
  }

  // Normalize value to 0-1 range and clamp
  const normalizedValue = (numValue - min) / (max - min);
  const clampedValue = Math.max(0, Math.min(1, normalizedValue));

  // Get color from scheme at normalized position
  const color = getColorFromScheme(
    rule.dataRangeColorScheme,
    clampedValue,
    context.theme,
    rule.dataRangeReverseGradient ?? false
  );

  // Return style based on applyTo setting
  if (rule.dataRangeApplyTo === 'background') {
    return {
      backgroundColor: color,
      textColor: getContrastingTextColor(color),
    };
  } else {
    return {
      textColor: color,
    };
  }
}

/**
 * Parse spark chart data from various input formats.
 * Supports arrays and delimited strings.
 */
function parseSparkChartData(value: any, separator: string): number[] {
  // Handle arrays directly
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => !isNaN(n));
  }

  // Handle strings with separator
  if (typeof value === 'string') {
    return value
      .split(separator)
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
  }

  return [];
}

/**
 * Sanitize text for safe display in tooltips (prevent XSS)
 */
function sanitizeTooltipText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Evaluate a flags column rule against a row context.
 * Returns a style with custom renderer configuration for flag icons.
 */
function evaluateFlagsColumnRule(rule: HighlightRule, context: EnhancedRowContext): CellStyle | null {
  if (!rule.flagDefinitions || rule.flagDefinitions.length === 0) {
    return null;
  }

  // Get valid field names from context.row for secure interpolation
  const validFieldNames = new Set(Object.keys(context.row));

  const matchedIcons: Array<{
    icon: any;
    iconType?: 'mono' | 'default' | 'solid';
    color: string;
    tooltip: string;
  }> = [];

  for (const flagDef of rule.flagDefinitions) {
    // Evaluate condition group
    const matches = evaluateConditionGroup(flagDef.conditionGroup, context);

    if (matches) {
      // Resolve tooltip with string interpolation support
      let tooltip = flagDef.tooltipText || '';

      // If tooltip is blank, use flag name as default
      if (!tooltip.trim()) {
        tooltip = flagDef.name || '';
      }

      // Support string interpolation with {columnName} placeholders
      // Security: validate column names and sanitize values BEFORE interpolation
      tooltip = tooltip.replace(/\{([^}]+)\}/g, (match, columnName) => {
        const trimmedName = columnName.trim();

        // Only allow interpolation of valid field names (prevent prototype pollution)
        if (!validFieldNames.has(trimmedName)) {
          return match; // Keep original placeholder if field doesn't exist
        }

        const value = context.row[trimmedName];
        if (value == null) {
          return match;
        }

        // Sanitize value BEFORE interpolation and limit length per value
        let sanitizedValue = sanitizeTooltipText(String(value));
        if (sanitizedValue.length > 500) {
          sanitizedValue = sanitizedValue.substring(0, 500) + '...';
        }
        return sanitizedValue;
      });

      // Final sanitization as defense-in-depth (catches any remaining static text)
      tooltip = sanitizeTooltipText(tooltip);

      // Truncate final tooltip at 500 characters
      if (tooltip.length > 500) {
        tooltip = tooltip.substring(0, 500) + '...';
      }

      matchedIcons.push({
        icon: flagDef.icon,
        iconType: flagDef.iconType,
        color: flagDef.iconColor || context.theme?.colors.text.primary || '#000',
        tooltip: tooltip,
      });
    }
  }

  if (matchedIcons.length === 0) {
    return null;
  }

  return {
    customRenderer: 'flagsColumn',
    customRendererConfig: { icons: matchedIcons },
  };
}

/**
 * Evaluate a spark chart rule against a row context.
 * Returns a style with custom renderer configuration.
 */
function evaluateSparkChartRule(rule: HighlightRule, context: EnhancedRowContext): CellStyle | null {
  // Validate required fields
  if (!rule.sparkChartSourceField || !rule.sparkChartMode) {
    return null;
  }

  // Check if theme is available
  if (!context.theme) {
    console.warn('Theme not available for spark chart rendering');
    return null;
  }

  // Get raw value from source field
  const rawValue = context.row[rule.sparkChartSourceField];
  if (rawValue == null) {
    return null;
  }

  // Parse data based on separator
  const separator = rule.sparkChartDataSeparator || ',';
  const data = parseSparkChartData(rawValue, separator);
  if (data.length === 0) {
    return null;
  }

  // Calculate scale value for stack mode
  let stackScaleValue: number | undefined;
  if (rule.sparkChartMode === 'stack') {
    const scaleMode = rule.sparkChartScaleMode || 'full';

    switch (scaleMode) {
      case 'full':
        // 100% - no scaling needed
        stackScaleValue = undefined;
        break;

      case 'column':
        // Use value from scale field
        if (rule.sparkChartScaleField) {
          const scaleFieldValue = context.row[rule.sparkChartScaleField];
          if (typeof scaleFieldValue === 'number' && scaleFieldValue > 0) {
            stackScaleValue = scaleFieldValue;
          }
        }
        break;

      case 'global':
        // Use pre-calculated global max
        if (context.sparkChartGlobalRanges) {
          const globalRange = context.sparkChartGlobalRanges[rule.sparkChartSourceField];
          if (globalRange && globalRange.max > 0) {
            stackScaleValue = globalRange.max;
          }
        }
        break;
    }
  }

  // Calculate scale min/max for line/bar heights and gradients
  let scaleMin: number | undefined;
  let scaleMax: number | undefined;
  const scaleMode = rule.sparkChartScaleMode || 'cell';

  if (rule.sparkChartMode === 'line' || rule.sparkChartMode === 'bar') {
    switch (scaleMode) {
      case 'cell':
        // Use local min/max (will be calculated in SparkChart component)
        scaleMin = undefined;
        scaleMax = undefined;
        break;

      case 'column':
        // Use values from scale field
        const scaleField = rule.sparkChartScaleField;
        if (scaleField) {
          const scaleFieldValue = context.row[scaleField];
          if (typeof scaleFieldValue === 'number') {
            scaleMin = 0; // Assume 0 as min
            scaleMax = scaleFieldValue;
          } else if (typeof scaleFieldValue === 'string') {
            // Try to parse as "min,max" format
            const parts = scaleFieldValue.split(',').map((s) => Number(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              scaleMin = parts[0];
              scaleMax = parts[1];
            }
          } else if (Array.isArray(scaleFieldValue)) {
            // Extract min/max from array
            const numericValues = scaleFieldValue.filter((v) => typeof v === 'number') as number[];
            if (numericValues.length > 0) {
              scaleMin = Math.min(...numericValues);
              scaleMax = Math.max(...numericValues);
            }
          }
        }
        break;

      case 'global':
        // Use pre-calculated global min/max
        if (context.sparkChartGlobalRanges) {
          const globalRange = context.sparkChartGlobalRanges[rule.sparkChartSourceField];
          if (globalRange) {
            scaleMin = globalRange.min;
            scaleMax = globalRange.max;
          }
        }
        break;
    }
  }

  // Build config for renderer
  const config: SparkChartConfig = {
    mode: rule.sparkChartMode,
    data,
    colorMode: rule.sparkChartColorMode || 'solid',
    solidColor: rule.sparkChartSolidColor,
    colorScheme: rule.sparkChartColorScheme,
    reverseGradient: rule.sparkChartReverseGradient,
    height: rule.sparkChartHeight || 80,
    stackColors: rule.sparkChartStackColors,
    theme: context.theme,
    scaleMode,
    scaleMin,
    scaleMax,
    stackScaleMode: rule.sparkChartScaleMode === 'cell' ? 'full' : rule.sparkChartScaleMode,
    stackScaleValue,
    stateTimeline: rule.sparkChartStateTimeline,
    // Bullet chart properties
    bulletBgColorMode: rule.sparkChartBulletBgColorMode,
    bulletBgColor: rule.sparkChartBulletBgColor,
    bulletBgColorScheme: rule.sparkChartBulletBgColorScheme,
    bulletBgReverse: rule.sparkChartBulletBgReverse,
    bulletFgColorMode: rule.sparkChartBulletFgColorMode,
    bulletFgColor: rule.sparkChartBulletFgColor,
    bulletFgColorScheme: rule.sparkChartBulletFgColorScheme,
    bulletFgReverse: rule.sparkChartBulletFgReverse,
    bulletLineColorMode: rule.sparkChartBulletLineColorMode,
    bulletLineColor: rule.sparkChartBulletLineColor,
    bulletLineColorScheme: rule.sparkChartBulletLineColorScheme,
    bulletLineReverse: rule.sparkChartBulletLineReverse,
    // Line interpolation
    lineInterpolation: rule.sparkChartLineInterpolation || 'linear',
  };

  // Return style with custom renderer
  return {
    customRenderer: 'sparkChart',
    customRendererConfig: config,
  };
}

/**
 * Compute the cell style for a given cell based on all applicable rules.
 * Rules are evaluated in priority order (lower number = higher priority).
 * Supports five rule types: conditional, threshold, valueMapping, dataRangeGradient, and sparkChart.
 */
export function computeCellStyle(rules: HighlightRule[], context: EnhancedRowContext): CellStyle | null {
  // Filter enabled rules
  const enabledRules = rules.filter((rule) => rule.enabled);

  // Sort by priority (lower = higher priority)
  const sortedRules = [...enabledRules].sort((a, b) => a.priority - b.priority);

  // Find first matching rule
  for (const rule of sortedRules) {
    // Dispatch to appropriate evaluator based on rule type
    const ruleType = rule.ruleType || 'conditional'; // Default to 'conditional' for backward compatibility

    // For flagsColumn rules, skip field checking (they are synthetic columns)
    // and always evaluate when passed to this function
    const skipFieldCheck = ruleType === 'flagsColumn';

    // Check if rule applies to this field
    if (!skipFieldCheck) {
      const appliesToField = Array.isArray(rule.targetFields) && rule.targetFields.includes(context.currentField);

      if (!appliesToField) {
        continue;
      }
    }

    let resultStyle: CellStyle | null = null;

    switch (ruleType) {
      case 'conditional':
        // Evaluate conditions
        const matches = rule.conditionGroup && evaluateConditionGroup(rule.conditionGroup, context);
        if (matches) {
          resultStyle = rule.style;
        }
        break;

      case 'threshold':
        resultStyle = evaluateThresholdRule(rule, context);
        break;

      case 'valueMapping':
        resultStyle = evaluateValueMappingRule(rule, context);
        break;

      case 'dataRangeGradient':
        resultStyle = evaluateDataRangeGradientRule(rule, context);
        break;

      case 'sparkChart':
        resultStyle = evaluateSparkChartRule(rule, context);
        break;

      case 'flagsColumn':
        resultStyle = evaluateFlagsColumnRule(rule, context);
        break;
    }

    // Return first match (first-match-wins behavior)
    if (resultStyle) {
      return resultStyle;
    }
  }

  return null;
}

/**
 * Get all rules that apply to a specific field.
 */
export function getRulesForField(rules: HighlightRule[], fieldName: string): HighlightRule[] {
  return rules.filter((rule) => Array.isArray(rule.targetFields) && rule.targetFields.includes(fieldName));
}
