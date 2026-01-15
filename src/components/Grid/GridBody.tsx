import React, { useMemo, useEffect, forwardRef, useRef, useImperativeHandle, useState, useCallback } from 'react';
import { List, ListImperativeAPI } from 'react-window';
import { css } from '@emotion/css';
import { useTheme2 } from '@grafana/ui';
import { EnhancedGridOptions, HighlightRule, EnhancedGridFieldConfig } from '../../types';
import { GridColumn, GridRow } from '../../utils/dataTransformer';
import { GridCell } from './GridCell';
import { ColumnGroups, buildGridTemplateColumns } from '../../utils/frozenColumnManager';

// Threshold for warning about non-virtual scrolling performance
const NON_VIRTUAL_ROW_WARNING_THRESHOLD = 1000;

interface GridBodyProps {
  columns: GridColumn[];
  rows: GridRow[];
  highlightRules: HighlightRule[];
  options: EnhancedGridOptions;
  height: number;
  fieldRanges: Record<string, { min: number; max: number }>;
  sparkChartGlobalRanges: Record<string, { min: number; max: number }>;
  fieldConfig?: Record<string, EnhancedGridFieldConfig>; // Field config by fieldName
  /** Calculated total width of all columns for horizontal scrolling */
  totalWidth?: number;
  /** Callback when the scroll container element is available */
  onScrollContainerReady?: () => void;
  /** Column groups for frozen column support */
  columnGroups?: ColumnGroups;
  /** Whether frozen columns are enabled */
  frozenColumnsEnabled?: boolean;
  /** Height of horizontal scrollbar in center section for frozen column compensation */
  horizontalScrollbarHeight?: number;
}

/** Handle for accessing the scroll container */
export interface GridBodyHandle {
  getScrollContainer: () => HTMLDivElement | null;
}

export const GridBody = forwardRef<GridBodyHandle, GridBodyProps>(
  (
    {
      columns,
      rows,
      highlightRules,
      options,
      height,
      fieldRanges,
      sparkChartGlobalRanges,
      fieldConfig = {},
      totalWidth,
      onScrollContainerReady,
      columnGroups,
      frozenColumnsEnabled = false,
      horizontalScrollbarHeight = 0,
    },
    ref
  ) => {
    const theme = useTheme2();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Track whether the list element is available
    const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
    // Refs for frozen column containers (for scroll sync)
    const leftFrozenRef = useRef<HTMLDivElement>(null);
    const rightFrozenRef = useRef<HTMLDivElement>(null);

    // Callback ref for react-window 2.x listRef - captures the API and notifies when ready
    const listRefCallback = useCallback(
      (api: ListImperativeAPI | null) => {
        if (api?.element) {
          setListElement(api.element);
          onScrollContainerReady?.();
        } else {
          setListElement(null);
        }
      },
      [onScrollContainerReady]
    );

    // Expose the scroll container to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        getScrollContainer: () => {
          // For virtual mode, return the captured list element
          // For non-virtual mode, return the wrapper div
          if (options.virtualScrollEnabled) {
            return listElement;
          }
          return scrollContainerRef.current;
        },
      }),
      [options.virtualScrollEnabled, listElement]
    );

    // Sync frozen columns vertical scroll with center scroll
    useEffect(() => {
      if (!frozenColumnsEnabled) {
        return;
      }

      const centerContainer = options.virtualScrollEnabled ? listElement : scrollContainerRef.current;
      if (!centerContainer) {
        return;
      }

      const handleScroll = () => {
        const scrollTop = centerContainer.scrollTop;
        if (leftFrozenRef.current) {
          leftFrozenRef.current.scrollTop = scrollTop;
        }
        if (rightFrozenRef.current) {
          rightFrozenRef.current.scrollTop = scrollTop;
        }
      };

      centerContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => centerContainer.removeEventListener('scroll', handleScroll);
    }, [frozenColumnsEnabled, options.virtualScrollEnabled, listElement]);

    // Warn if rendering many rows without virtual scrolling
    useEffect(() => {
      if (!options.virtualScrollEnabled && rows.length > NON_VIRTUAL_ROW_WARNING_THRESHOLD) {
        console.warn(
          `[EnhancedGrid] Rendering ${rows.length} rows without virtual scrolling. ` +
            `This may cause performance issues. Consider enabling virtual scrolling in panel options.`
        );
      }
    }, [options.virtualScrollEnabled, rows.length]);

    // Pre-compute grid template columns string (optimization: avoid recalculating per row)
    const gridTemplateColumns = useMemo(() => {
      const rowNumCol = options.showRowNumbers ? '50px ' : '';
      const dataCols = columns.map((col) => (col.width ? `${col.width}px` : 'minmax(auto, 1fr)')).join(' ');
      return rowNumCol + dataCols;
    }, [columns, options.showRowNumbers]);

    // Pre-compute frozen column grid templates
    const frozenGridTemplates = useMemo(() => {
      if (!frozenColumnsEnabled || !columnGroups) {
        return { left: '', center: '', right: '' };
      }
      return {
        left: buildGridTemplateColumns(
          columnGroups.left,
          options.showRowNumbers && columnGroups.left.length > 0,
          false
        ),
        center: buildGridTemplateColumns(columnGroups.center, false, true), // Allow flexible for center scrollable region
        right: buildGridTemplateColumns(columnGroups.right, false, false),
      };
    }, [frozenColumnsEnabled, columnGroups, options.showRowNumbers]);

    // Pre-compute stripe color (optimization: avoid recalculating per row)
    const stripeColor = useMemo(() => {
      return options.rowStripeColor || theme.colors.background.secondary;
    }, [options.rowStripeColor, theme.colors.background.secondary]);

    // Row renderer for react-window 2.x
    // Props are passed via rowProps to ensure react-window detects changes and re-renders
    const Row = ({
      index,
      style,
      highlightRules: propHighlightRules,
      fieldRanges: propFieldRanges,
      sparkChartGlobalRanges: propSparkChartGlobalRanges,
    }: any) => {
      const row = rows[index];
      const isEvenRow = index % 2 === 0;

      // Use pre-computed values for better performance
      const rowStyles = css`
        display: grid;
        grid-template-columns: ${gridTemplateColumns};
        background: ${options.rowStripeEnabled && !isEvenRow ? stripeColor : 'transparent'};
        ${totalWidth !== undefined ? `min-width: ${totalWidth}px;` : ''}
      `;

      return (
        <div style={style} className={rowStyles} data-testid="grid-row">
          {options.showRowNumbers && (
            <GridCell
              column={{
                field: { name: '#', type: 'number', config: {}, values: [] } as any,
                fieldName: '#',
                displayName: '#',
                align: 'center',
              }}
              row={row}
              highlightRules={[]}
              fieldRanges={propFieldRanges}
              sparkChartGlobalRanges={propSparkChartGlobalRanges}
              theme={theme}
              isRowNumber
              compactMode={options.compactMode}
            />
          )}
          {columns.map((column) => (
            <GridCell
              key={column.fieldName}
              column={column}
              row={row}
              highlightRules={propHighlightRules}
              fieldRanges={propFieldRanges}
              sparkChartGlobalRanges={propSparkChartGlobalRanges}
              theme={theme}
              compactMode={options.compactMode}
              fieldConfig={fieldConfig[column.fieldName]}
            />
          ))}
        </div>
      );
    };

    // Calculate row height
    const effectiveRowHeight = options.compactMode
      ? options.rowHeight
        ? Math.min(options.rowHeight, 24)
        : 24
      : options.rowHeight || 32;

    // Render a frozen row (left or right section)
    const renderFrozenRow = (
      row: GridRow,
      index: number,
      frozenColumns: GridColumn[],
      gridTemplate: string,
      includeRowNumbers: boolean
    ) => {
      const isEvenRow = index % 2 === 0;
      const frozenRowStyle = css`
        display: grid;
        grid-template-columns: ${gridTemplate};
        height: ${effectiveRowHeight}px;
        background: ${options.rowStripeEnabled && !isEvenRow ? stripeColor : theme.colors.background.primary};
      `;

      return (
        <div key={row.index} className={frozenRowStyle} data-testid="grid-row">
          {includeRowNumbers && (
            <GridCell
              column={{
                field: { name: '#', type: 'number', config: {}, values: [] } as any,
                fieldName: '#',
                displayName: '#',
                align: 'center',
              }}
              row={row}
              highlightRules={[]}
              fieldRanges={fieldRanges}
              sparkChartGlobalRanges={sparkChartGlobalRanges}
              theme={theme}
              isRowNumber
              compactMode={options.compactMode}
            />
          )}
          {frozenColumns.map((column) => (
            <GridCell
              key={column.fieldName}
              column={column}
              row={row}
              highlightRules={highlightRules}
              fieldRanges={fieldRanges}
              sparkChartGlobalRanges={sparkChartGlobalRanges}
              theme={theme}
              compactMode={options.compactMode}
              fieldConfig={fieldConfig[column.fieldName]}
            />
          ))}
        </div>
      );
    };

    // Center row for frozen layout (used with virtual scrolling)
    // Props are passed via rowProps to ensure react-window detects changes and re-renders
    const CenterRow = ({
      index,
      style,
      highlightRules: propHighlightRules,
      fieldRanges: propFieldRanges,
      sparkChartGlobalRanges: propSparkChartGlobalRanges,
    }: any) => {
      const row = rows[index];
      const isEvenRow = index % 2 === 0;

      const centerRowStyle = css`
        display: grid;
        grid-template-columns: ${frozenGridTemplates.center};
        background: ${options.rowStripeEnabled && !isEvenRow ? stripeColor : 'transparent'};
        ${columnGroups?.centerWidth !== undefined ? `min-width: ${columnGroups.centerWidth}px;` : ''}
      `;

      return (
        <div style={style} className={centerRowStyle} data-testid="grid-row">
          {columnGroups?.center.map((column) => (
            <GridCell
              key={column.fieldName}
              column={column}
              row={row}
              highlightRules={propHighlightRules}
              fieldRanges={propFieldRanges}
              sparkChartGlobalRanges={propSparkChartGlobalRanges}
              theme={theme}
              compactMode={options.compactMode}
              fieldConfig={fieldConfig[column.fieldName]}
            />
          ))}
        </div>
      );
    };

    // Styles for frozen body layout
    const frozenBodyStyles = {
      container: css`
        position: relative;
        height: ${height}px;
        width: 100%;
        overflow: hidden;
      `,
      frozenLeft: css`
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        overflow: hidden;
        z-index: 2;
        background: ${theme.colors.background.primary};
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
      `,
      frozenRight: css`
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        overflow: hidden;
        z-index: 2;
        background: ${theme.colors.background.primary};
        box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
      `,
      centerWrapper: css`
        margin-left: ${columnGroups?.leftWidth || 0}px;
        margin-right: ${columnGroups?.rightWidth || 0}px;
        height: 100%;
        overflow: auto;
      `,
      frozenContent: css`
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
        /* Add padding to compensate for horizontal scrollbar in center section */
        ${horizontalScrollbarHeight > 0 ? `padding-bottom: ${horizontalScrollbarHeight}px;` : ''}
        /* Hide scrollbar */
        scrollbar-width: none;
        -ms-overflow-style: none;
        &::-webkit-scrollbar {
          display: none;
        }
      `,
    };

    // Frozen columns layout
    if (frozenColumnsEnabled && columnGroups) {
      if (options.virtualScrollEnabled) {
        return (
          <div className={frozenBodyStyles.container} data-testid="grid-body" data-height={height}>
            {/* Left frozen section */}
            {columnGroups.left.length > 0 && (
              <div className={frozenBodyStyles.frozenLeft} style={{ width: columnGroups.leftWidth }}>
                <div ref={leftFrozenRef} className={frozenBodyStyles.frozenContent}>
                  {rows.map((row, index) =>
                    renderFrozenRow(row, index, columnGroups.left, frozenGridTemplates.left, options.showRowNumbers)
                  )}
                </div>
              </div>
            )}

            {/* Center scrollable section (virtualized) */}
            <div className={frozenBodyStyles.centerWrapper}>
              <List
                listRef={listRefCallback}
                defaultHeight={height}
                rowComponent={CenterRow}
                rowProps={{
                  highlightRules,
                  fieldRanges,
                  sparkChartGlobalRanges,
                }}
                rowCount={rows.length}
                rowHeight={effectiveRowHeight}
                overscanCount={options.overscanRows || 5}
                style={{ height, width: '100%', overflow: 'auto' }}
              />
            </div>

            {/* Right frozen section */}
            {columnGroups.right.length > 0 && (
              <div className={frozenBodyStyles.frozenRight} style={{ width: columnGroups.rightWidth }}>
                <div ref={rightFrozenRef} className={frozenBodyStyles.frozenContent}>
                  {rows.map((row, index) =>
                    renderFrozenRow(row, index, columnGroups.right, frozenGridTemplates.right, false)
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      // Non-virtual frozen layout
      return (
        <div className={frozenBodyStyles.container} data-testid="grid-body" data-height={height}>
          {/* Left frozen section */}
          {columnGroups.left.length > 0 && (
            <div className={frozenBodyStyles.frozenLeft} style={{ width: columnGroups.leftWidth }}>
              <div ref={leftFrozenRef} className={frozenBodyStyles.frozenContent}>
                {rows.map((row, index) =>
                  renderFrozenRow(row, index, columnGroups.left, frozenGridTemplates.left, options.showRowNumbers)
                )}
              </div>
            </div>
          )}

          {/* Center scrollable section */}
          <div ref={scrollContainerRef} className={frozenBodyStyles.centerWrapper}>
            <div style={columnGroups.centerWidth !== undefined ? { minWidth: columnGroups.centerWidth } : {}}>
              {rows.map((row, index) => (
                <CenterRow
                  key={row.index}
                  index={index}
                  style={{}}
                  highlightRules={highlightRules}
                  fieldRanges={fieldRanges}
                  sparkChartGlobalRanges={sparkChartGlobalRanges}
                />
              ))}
            </div>
          </div>

          {/* Right frozen section */}
          {columnGroups.right.length > 0 && (
            <div className={frozenBodyStyles.frozenRight} style={{ width: columnGroups.rightWidth }}>
              <div ref={rightFrozenRef} className={frozenBodyStyles.frozenContent}>
                {rows.map((row, index) =>
                  renderFrozenRow(row, index, columnGroups.right, frozenGridTemplates.right, false)
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Standard layout (no frozen columns)
    if (options.virtualScrollEnabled) {
      return (
        <List
          listRef={listRefCallback}
          defaultHeight={height}
          rowComponent={Row}
          rowProps={{
            highlightRules,
            fieldRanges,
            sparkChartGlobalRanges,
          }}
          rowCount={rows.length}
          rowHeight={effectiveRowHeight}
          overscanCount={options.overscanRows || 5}
          style={{ height, width: '100%', overflow: 'auto' }}
          data-testid="grid-body"
        />
      );
    }

    // Non-virtual fallback
    return (
      <div ref={scrollContainerRef} style={{ height, overflow: 'auto' }} data-testid="grid-body" data-height={height}>
        <div style={{ minWidth: totalWidth }}>
          {rows.map((row, index) => (
            <Row
              key={row.index}
              index={index}
              style={{}}
              highlightRules={highlightRules}
              fieldRanges={fieldRanges}
              sparkChartGlobalRanges={sparkChartGlobalRanges}
            />
          ))}
        </div>
      </div>
    );
  }
);

GridBody.displayName = 'GridBody';
