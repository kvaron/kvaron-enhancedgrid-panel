import React, { useMemo, useRef, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { Icon, Tooltip } from '@grafana/ui';
import { GrafanaTheme2, formattedValueToString, IconName } from '@grafana/data';
import { HighlightRule, EnhancedGridFieldConfig } from '../../types';
import { computeCellStyle, EnhancedRowContext } from '../../utils/highlightEngine';
import { GridColumn, GridRow } from '../../utils/dataTransformer';
import { SparkChart } from '../SparkChart/SparkChart';

interface GridCellProps {
  column: GridColumn;
  row: GridRow;
  highlightRules: HighlightRule[];
  fieldRanges: Record<string, { min: number; max: number }>;
  sparkChartGlobalRanges: Record<string, { min: number; max: number }>;
  theme: GrafanaTheme2;
  isRowNumber?: boolean;
  compactMode?: boolean;
  fieldConfig?: EnhancedGridFieldConfig; // Field config for this column
}

export const GridCell: React.FC<GridCellProps> = ({
  column,
  row,
  highlightRules,
  fieldRanges,
  sparkChartGlobalRanges,
  theme,
  isRowNumber,
  compactMode = false,
  fieldConfig,
}) => {
  // Compute highlight style for this cell
  const highlightStyle = useMemo(() => {
    if (isRowNumber) {
      return null;
    }

    const context: EnhancedRowContext = {
      row: row.data,
      rowIndex: row.index,
      currentField: column.fieldName,
      fieldRanges,
      sparkChartGlobalRanges,
      theme,
    };

    // If this is a flags column, only evaluate its specific rule
    if ((column as any).isFlagsColumn && (column as any).flagsRuleId) {
      const flagsRule = highlightRules.find((r) => r.id === (column as any).flagsRuleId);
      if (flagsRule) {
        return computeCellStyle([flagsRule], context);
      }
      return null;
    }

    // For data columns, exclude flagsColumn rules
    const dataColumnRules = highlightRules.filter((r) => r.ruleType !== 'flagsColumn');
    return computeCellStyle(dataColumnRules, context);
  }, [column, row, highlightRules, fieldRanges, sparkChartGlobalRanges, theme, isRowNumber]);

  // Get cell value
  const value = isRowNumber ? row.index + 1 : row.data[column.fieldName];

  // Format value using field's display processor
  const displayValue = useMemo(() => {
    if (isRowNumber) {
      return String(value);
    }

    if (column.field.display) {
      const formatted = column.field.display(value);
      // Use formattedValueToString to include prefix and suffix (e.g., units)
      return formattedValueToString(formatted);
    }

    return String(value ?? '');
  }, [value, column.field, isRowNumber]);

  // Track cell dimensions for spark chart rendering
  const cellRef = useRef<HTMLDivElement>(null);
  const [cellDimensions, setCellDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (cellRef.current && highlightStyle?.customRenderer === 'sparkChart') {
      const { width, height } = cellRef.current.getBoundingClientRect();
      setCellDimensions({ width, height });
    }
  }, [highlightStyle]); // Use full highlightStyle to catch all relevant changes

  // Build styles
  const cellStyles = useMemo(() => {
    const padding = compactMode ? '4px 8px' : '8px 12px';
    const fontSize = compactMode ? '12px' : '14px';

    // Generate box-shadow for border if needed (doesn't affect layout)
    const borderBoxShadow = highlightStyle?.borderColor
      ? `inset 0 0 0 ${highlightStyle.borderWidth || 1}px ${highlightStyle.borderColor}`
      : '';

    // Determine background and text color
    // Priority: highlightStyle > columnFieldConfig > defaults
    // Note: Row number cells should not inherit column styling
    let backgroundColor = 'transparent';
    let textColor = theme.colors.text.primary;
    let fontWeight = 'normal';
    let fontStyle = 'normal';
    let textDecoration = 'none';

    if (highlightStyle?.backgroundColor) {
      backgroundColor = highlightStyle.backgroundColor;
    } else if (!isRowNumber && fieldConfig?.columnBackgroundColor) {
      backgroundColor = fieldConfig.columnBackgroundColor;
    }

    if (highlightStyle?.textColor) {
      textColor = highlightStyle.textColor;
    } else if (!isRowNumber && fieldConfig?.columnTextColor) {
      textColor = fieldConfig.columnTextColor;
    }

    if (highlightStyle?.fontWeight) {
      fontWeight = highlightStyle.fontWeight;
    } else if (!isRowNumber && fieldConfig?.columnFontWeight) {
      fontWeight = fieldConfig.columnFontWeight;
    }

    if (highlightStyle?.fontStyle) {
      fontStyle = highlightStyle.fontStyle;
    } else if (!isRowNumber && fieldConfig?.columnFontStyle) {
      fontStyle = fieldConfig.columnFontStyle;
    }

    if (highlightStyle?.textDecoration) {
      textDecoration = highlightStyle.textDecoration;
    } else if (!isRowNumber && fieldConfig?.columnTextDecoration) {
      textDecoration = fieldConfig.columnTextDecoration;
    }

    const baseStyle = css`
      display: flex;
      align-items: center;
      padding: ${highlightStyle?.customRenderer === 'sparkChart' ? '0' : padding};
      font-size: ${fontSize};
      border-bottom: 1px solid ${theme.colors.border.weak};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: ${isRowNumber ? 'center' : column.align};
      justify-content: ${isRowNumber
        ? 'center'
        : column.align === 'center'
          ? 'center'
          : column.align === 'right'
            ? 'flex-end'
            : 'flex-start'};
      background: ${backgroundColor};
      background-clip: padding-box;
      color: ${textColor};
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      text-decoration: ${textDecoration};
      ${borderBoxShadow ? `box-shadow: ${borderBoxShadow};` : ''}
      position: relative;
    `;

    return baseStyle;
  }, [theme, column.align, highlightStyle, fieldConfig, isRowNumber, compactMode]);

  // Container style for icon layout
  const containerStyles = useMemo(() => {
    if (!highlightStyle?.icon) {
      return undefined;
    }

    return css`
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
    `;
  }, [highlightStyle?.icon]);

  // Determine icon position based on column alignment
  // Right-aligned columns: icon on left (far side from text start)
  // Left/center-aligned columns: icon on right (far side from text start)
  const effectiveIconPosition = highlightStyle?.iconPosition || (column.align === 'right' ? 'left' : 'right');

  return (
    <div ref={cellRef} className={cellStyles} title={displayValue} data-testid="grid-cell">
      {highlightStyle?.customRenderer === 'sparkChart' && highlightStyle.customRendererConfig ? (
        <SparkChart
          config={highlightStyle.customRendererConfig}
          width={cellDimensions.width}
          height={cellDimensions.height}
        />
      ) : highlightStyle?.customRenderer === 'flagsColumn' && highlightStyle.customRendererConfig ? (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'nowrap',
          }}
        >
          {highlightStyle.customRendererConfig?.icons?.map((iconData: any, idx: number) => (
            <Tooltip
              key={idx}
              content={
                <div
                  style={{
                    whiteSpace: 'normal',
                    maxWidth: '400px',
                    wordWrap: 'break-word',
                  }}
                >
                  {iconData.tooltip}
                </div>
              }
              placement="top"
            >
              <Icon
                name={iconData.icon}
                type={iconData.iconType || 'default'}
                size="sm"
                style={{ color: iconData.color, flexShrink: 0 }}
              />
            </Tooltip>
          ))}
        </div>
      ) : highlightStyle?.icon ? (
        <span className={containerStyles}>
          {effectiveIconPosition === 'left' &&
            (highlightStyle.iconSource === 'emoji' ? (
              <span style={{ fontSize: '1.2em', lineHeight: 1 }}>{highlightStyle.icon}</span>
            ) : (
              <Icon name={highlightStyle.icon as IconName} type={highlightStyle.iconType || 'default'} size="sm" />
            ))}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayValue}</span>
          {effectiveIconPosition === 'right' &&
            (highlightStyle.iconSource === 'emoji' ? (
              <span style={{ fontSize: '1.2em', lineHeight: 1 }}>{highlightStyle.icon}</span>
            ) : (
              <Icon name={highlightStyle.icon as IconName} type={highlightStyle.iconType || 'default'} size="sm" />
            ))}
        </span>
      ) : (
        displayValue
      )}
    </div>
  );
};
