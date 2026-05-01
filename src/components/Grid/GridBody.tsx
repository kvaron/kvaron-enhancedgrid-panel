import React, { useMemo, useEffect, forwardRef, useRef, useImperativeHandle, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { css } from '@emotion/css';
import { useTheme2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { EnhancedGridOptions, HighlightRule, EnhancedGridFieldConfig } from '../../types';
import { GridColumn, GridRow } from '../../utils/dataTransformer';
import { GridCell } from './GridCell';
import { ColumnGroups, buildGridTemplateColumns } from '../../utils/frozenColumnManager';

// Threshold for warning about non-virtual scrolling performance
const NON_VIRTUAL_ROW_WARNING_THRESHOLD = 1000;

// Row renderers are defined at module scope (not inside GridBody) so React keeps
// the same component type across parent re-renders. Without this, scroll-driven
// re-renders of GridBody would force every visible row to remount — which
// re-runs `React.useId()` inside each SparkChart, generating new gradient IDs
// and producing a visible flicker on the sparkline strokes during scroll.
interface GridRowItemProps {
  index: number;
  style: React.CSSProperties;
  rows: GridRow[];
  columns: GridColumn[];
  fieldConfig: Record<string, EnhancedGridFieldConfig>;
  theme: GrafanaTheme2;
  gridTemplateColumns: string;
  rowStripeEnabled: boolean;
  showRowNumbers: boolean;
  compactMode: boolean;
  stripeColor: string;
  totalWidth?: number;
  highlightRules: HighlightRule[];
  fieldRanges: Record<string, { min: number; max: number }>;
  sparkChartGlobalRanges: Record<string, { min: number; max: number }>;
}

const GridRowItem = React.memo(function GridRowItem({
  index,
  style,
  rows,
  columns,
  fieldConfig,
  theme,
  gridTemplateColumns,
  rowStripeEnabled,
  showRowNumbers,
  compactMode,
  stripeColor,
  totalWidth,
  highlightRules,
  fieldRanges,
  sparkChartGlobalRanges,
}: GridRowItemProps) {
  const row = rows[index];
  const isEvenRow = index % 2 === 0;

  const rowStyles = css`
    display: grid;
    grid-template-columns: ${gridTemplateColumns};
    background: ${rowStripeEnabled && !isEvenRow ? stripeColor : 'transparent'};
    ${totalWidth !== undefined ? `min-width: ${totalWidth}px;` : ''}
  `;

  return (
    <div style={style} className={rowStyles} data-testid="grid-row">
      {showRowNumbers && (
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
          compactMode={compactMode}
        />
      )}
      {columns.map((column) => (
        <GridCell
          key={column.fieldName}
          column={column}
          row={row}
          highlightRules={highlightRules}
          fieldRanges={fieldRanges}
          sparkChartGlobalRanges={sparkChartGlobalRanges}
          theme={theme}
          compactMode={compactMode}
          fieldConfig={fieldConfig[column.fieldName]}
        />
      ))}
    </div>
  );
});

interface GridCenterRowItemProps {
  index: number;
  style: React.CSSProperties;
  rows: GridRow[];
  centerColumns: GridColumn[];
  fieldConfig: Record<string, EnhancedGridFieldConfig>;
  theme: GrafanaTheme2;
  centerGridTemplate: string;
  rowStripeEnabled: boolean;
  compactMode: boolean;
  stripeColor: string;
  centerWidth?: number;
  highlightRules: HighlightRule[];
  fieldRanges: Record<string, { min: number; max: number }>;
  sparkChartGlobalRanges: Record<string, { min: number; max: number }>;
}

const GridCenterRowItem = React.memo(function GridCenterRowItem({
  index,
  style,
  rows,
  centerColumns,
  fieldConfig,
  theme,
  centerGridTemplate,
  rowStripeEnabled,
  compactMode,
  stripeColor,
  centerWidth,
  highlightRules,
  fieldRanges,
  sparkChartGlobalRanges,
}: GridCenterRowItemProps) {
  const row = rows[index];
  const isEvenRow = index % 2 === 0;

  const centerRowStyle = css`
    display: grid;
    grid-template-columns: ${centerGridTemplate};
    background: ${rowStripeEnabled && !isEvenRow ? stripeColor : 'transparent'};
    ${centerWidth !== undefined ? `min-width: ${centerWidth}px;` : ''}
  `;

  return (
    <div style={style} className={centerRowStyle} data-testid="grid-row">
      {centerColumns.map((column) => (
        <GridCell
          key={column.fieldName}
          column={column}
          row={row}
          highlightRules={highlightRules}
          fieldRanges={fieldRanges}
          sparkChartGlobalRanges={sparkChartGlobalRanges}
          theme={theme}
          compactMode={compactMode}
          fieldConfig={fieldConfig[column.fieldName]}
        />
      ))}
    </div>
  );
});

interface GridFrozenRowItemProps {
  index: number;
  style: React.CSSProperties;
  rows: GridRow[];
  frozenColumns: GridColumn[];
  fieldConfig: Record<string, EnhancedGridFieldConfig>;
  theme: GrafanaTheme2;
  gridTemplate: string;
  rowStripeEnabled: boolean;
  includeRowNumbers: boolean;
  compactMode: boolean;
  stripeColor: string;
  highlightRules: HighlightRule[];
  fieldRanges: Record<string, { min: number; max: number }>;
  sparkChartGlobalRanges: Record<string, { min: number; max: number }>;
}

const GridFrozenRowItem = React.memo(function GridFrozenRowItem({
  index,
  style,
  rows,
  frozenColumns,
  fieldConfig,
  theme,
  gridTemplate,
  rowStripeEnabled,
  includeRowNumbers,
  compactMode,
  stripeColor,
  highlightRules,
  fieldRanges,
  sparkChartGlobalRanges,
}: GridFrozenRowItemProps) {
  const row = rows[index];
  const isEvenRow = index % 2 === 0;

  const frozenRowStyle = css`
    display: grid;
    grid-template-columns: ${gridTemplate};
    background: ${rowStripeEnabled && !isEvenRow ? stripeColor : theme.colors.background.primary};
  `;

  return (
    <div style={style} className={frozenRowStyle} data-testid="grid-row">
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
          compactMode={compactMode}
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
          compactMode={compactMode}
          fieldConfig={fieldConfig[column.fieldName]}
        />
      ))}
    </div>
  );
});

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
  /** Width of vertical scrollbar in center section for frozen column compensation */
  scrollbarWidth?: number;
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
      scrollbarWidth = 0,
    },
    ref
  ) => {
    const theme = useTheme2();
    // Element ref backing the virtualized scroll container; tracked as state so
    // effects re-run once the element is mounted.
    const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
    const scrollContainerRefCallback = useCallback(
      (el: HTMLDivElement | null) => {
        setScrollContainer(el);
        if (el) {
          onScrollContainerReady?.();
        }
      },
      [onScrollContainerReady]
    );
    // Refs for frozen column containers (for scroll sync)
    const leftFrozenRef = useRef<HTMLDivElement>(null);
    const rightFrozenRef = useRef<HTMLDivElement>(null);

    // Expose the scroll container to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        getScrollContainer: () => scrollContainer,
      }),
      [scrollContainer]
    );

    // Sync frozen columns vertical scroll with center scroll
    useEffect(() => {
      if (!frozenColumnsEnabled || !scrollContainer) {
        return;
      }

      const handleScroll = () => {
        const scrollTop = scrollContainer.scrollTop;
        if (leftFrozenRef.current) {
          leftFrozenRef.current.scrollTop = scrollTop;
        }
        if (rightFrozenRef.current) {
          rightFrozenRef.current.scrollTop = scrollTop;
        }
      };

      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [frozenColumnsEnabled, scrollContainer]);

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

    // Calculate row height
    const effectiveRowHeight = options.compactMode
      ? options.rowHeight
        ? Math.min(options.rowHeight, 24)
        : 24
      : options.rowHeight || 32;

    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => scrollContainer,
      estimateSize: () => effectiveRowHeight,
      overscan: options.overscanRows ?? 5,
    });
    const virtualRows = virtualizer.getVirtualItems();
    const virtualTotalHeight = virtualizer.getTotalSize();

    const getVirtualRowStyle = (start: number, size: number): React.CSSProperties => ({
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${size}px`,
      transform: `translateY(${start}px)`,
    });

    const focusScrollContainer = useCallback(() => {
      scrollContainer?.focus({ preventScroll: true });
    }, [scrollContainer]);

    const isInteractiveKeyTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        target.closest('input, textarea, select, button, [role="button"], [role="textbox"], [role="combobox"]') !== null
      );
    };

    const handleScrollKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!scrollContainer || isInteractiveKeyTarget(event.target)) {
          return;
        }

        const pageStep = Math.max(scrollContainer.clientHeight - effectiveRowHeight, effectiveRowHeight);
        const horizontalStep = Math.max(effectiveRowHeight * 2, 40);
        let top = 0;
        let left = 0;

        switch (event.key) {
          case 'ArrowDown':
            top = effectiveRowHeight;
            break;
          case 'ArrowUp':
            top = -effectiveRowHeight;
            break;
          case 'PageDown':
            top = pageStep;
            break;
          case 'PageUp':
            top = -pageStep;
            break;
          case 'ArrowRight':
            left = horizontalStep;
            break;
          case 'ArrowLeft':
            left = -horizontalStep;
            break;
          default:
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        scrollContainer.scrollBy({ left, top, behavior: 'auto' });
      },
      [effectiveRowHeight, scrollContainer]
    );

    const handleGridMouseDown = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isInteractiveKeyTarget(event.target)) {
          focusScrollContainer();
        }
      },
      [focusScrollContainer]
    );

    const handleFrozenWheel = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        if (!scrollContainer) {
          return;
        }

        event.preventDefault();
        focusScrollContainer();
        scrollContainer.scrollBy({
          left: event.deltaX,
          top: event.deltaY,
          behavior: 'auto',
        });
      },
      [focusScrollContainer, scrollContainer]
    );

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
        right: ${scrollbarWidth}px;
        top: 0;
        height: 100%;
        overflow: hidden;
        z-index: 2;
        background: ${theme.colors.background.primary};
        box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
      `,
      centerWrapper: css`
        margin-left: ${columnGroups?.leftWidth || 0}px;
        margin-right: 0;
        height: 100%;
        overflow: auto;
        /* Suppress the browser default focus ring on the scroll container.
           The container is intentionally focusable via tabIndex={0} so keyboard
           users can arrow-scroll, but the default outline draws a wide white
           box around the panel that is louder than we want as the focus
           indicator. */
        outline: none;
      `,
      frozenContent: css`
        overflow-y: hidden;
        overflow-x: hidden;
        height: 100%;
        outline: none;
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
                <div
                  ref={leftFrozenRef}
                  className={frozenBodyStyles.frozenContent}
                  onMouseDown={handleGridMouseDown}
                  onWheel={handleFrozenWheel}
                >
                  <div style={{ height: `${virtualTotalHeight}px`, position: 'relative' }}>
                    {virtualRows.map((virtualRow) => (
                      <GridFrozenRowItem
                        key={virtualRow.key}
                        index={virtualRow.index}
                        style={getVirtualRowStyle(virtualRow.start, virtualRow.size)}
                        rows={rows}
                        frozenColumns={columnGroups.left}
                        fieldConfig={fieldConfig}
                        theme={theme}
                        gridTemplate={frozenGridTemplates.left}
                        rowStripeEnabled={options.rowStripeEnabled ?? false}
                        includeRowNumbers={options.showRowNumbers ?? false}
                        compactMode={options.compactMode ?? false}
                        stripeColor={stripeColor}
                        highlightRules={highlightRules}
                        fieldRanges={fieldRanges}
                        sparkChartGlobalRanges={sparkChartGlobalRanges}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Center scrollable section (virtualized) */}
            <div
              ref={scrollContainerRefCallback}
              className={frozenBodyStyles.centerWrapper}
              data-testid="grid-body-scroll-container"
              tabIndex={0}
              onKeyDown={handleScrollKeyDown}
              onMouseDown={handleGridMouseDown}
            >
              <div
                style={{
                  height: `${virtualTotalHeight}px`,
                  width: columnGroups.centerWidth !== undefined ? `${columnGroups.centerWidth}px` : '100%',
                  position: 'relative',
                }}
              >
                {virtualRows.map((virtualRow) => (
                  <GridCenterRowItem
                    key={virtualRow.key}
                    index={virtualRow.index}
                    style={getVirtualRowStyle(virtualRow.start, virtualRow.size)}
                    rows={rows}
                    centerColumns={columnGroups.center}
                    fieldConfig={fieldConfig}
                    theme={theme}
                    centerGridTemplate={frozenGridTemplates.center}
                    rowStripeEnabled={options.rowStripeEnabled ?? false}
                    compactMode={options.compactMode ?? false}
                    stripeColor={stripeColor}
                    centerWidth={columnGroups.centerWidth}
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
                <div
                  ref={rightFrozenRef}
                  className={frozenBodyStyles.frozenContent}
                  onMouseDown={handleGridMouseDown}
                  onWheel={handleFrozenWheel}
                >
                  <div style={{ height: `${virtualTotalHeight}px`, position: 'relative' }}>
                    {virtualRows.map((virtualRow) => (
                      <GridFrozenRowItem
                        key={virtualRow.key}
                        index={virtualRow.index}
                        style={getVirtualRowStyle(virtualRow.start, virtualRow.size)}
                        rows={rows}
                        frozenColumns={columnGroups.right}
                        fieldConfig={fieldConfig}
                        theme={theme}
                        gridTemplate={frozenGridTemplates.right}
                        rowStripeEnabled={options.rowStripeEnabled ?? false}
                        includeRowNumbers={false}
                        compactMode={options.compactMode ?? false}
                        stripeColor={stripeColor}
                        highlightRules={highlightRules}
                        fieldRanges={fieldRanges}
                        sparkChartGlobalRanges={sparkChartGlobalRanges}
                      />
                    ))}
                  </div>
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
              <div
                ref={leftFrozenRef}
                className={frozenBodyStyles.frozenContent}
                onMouseDown={handleGridMouseDown}
                onWheel={handleFrozenWheel}
              >
                {rows.map((row, index) =>
                  renderFrozenRow(row, index, columnGroups.left, frozenGridTemplates.left, options.showRowNumbers)
                )}
              </div>
            </div>
          )}

          {/* Center scrollable section */}
          <div
            ref={scrollContainerRefCallback}
            className={frozenBodyStyles.centerWrapper}
            data-testid="grid-body-scroll-container"
            tabIndex={0}
            onKeyDown={handleScrollKeyDown}
            onMouseDown={handleGridMouseDown}
          >
            <div style={columnGroups.centerWidth !== undefined ? { minWidth: columnGroups.centerWidth } : {}}>
              {rows.map((row, index) => (
                <GridCenterRowItem
                  key={row.index}
                  index={index}
                  style={{}}
                  rows={rows}
                  centerColumns={columnGroups.center}
                  fieldConfig={fieldConfig}
                  theme={theme}
                  centerGridTemplate={frozenGridTemplates.center}
                  rowStripeEnabled={options.rowStripeEnabled ?? false}
                  compactMode={options.compactMode ?? false}
                  stripeColor={stripeColor}
                  centerWidth={columnGroups.centerWidth}
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
              <div
                ref={rightFrozenRef}
                className={frozenBodyStyles.frozenContent}
                onMouseDown={handleGridMouseDown}
                onWheel={handleFrozenWheel}
              >
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
        <div
          ref={scrollContainerRefCallback}
          style={{ height, width: '100%', overflow: 'auto', outline: 'none' }}
          data-testid="grid-body"
          data-height={height}
          tabIndex={0}
          onKeyDown={handleScrollKeyDown}
          onMouseDown={handleGridMouseDown}
        >
          <div
            style={{
              height: `${virtualTotalHeight}px`,
              width: totalWidth !== undefined ? `${totalWidth}px` : '100%',
              position: 'relative',
            }}
          >
            {virtualRows.map((virtualRow) => (
              <GridRowItem
                key={virtualRow.key}
                index={virtualRow.index}
                style={getVirtualRowStyle(virtualRow.start, virtualRow.size)}
                rows={rows}
                columns={columns}
                fieldConfig={fieldConfig}
                theme={theme}
                gridTemplateColumns={gridTemplateColumns}
                rowStripeEnabled={options.rowStripeEnabled ?? false}
                showRowNumbers={options.showRowNumbers ?? false}
                compactMode={options.compactMode ?? false}
                stripeColor={stripeColor}
                totalWidth={totalWidth}
                highlightRules={highlightRules}
                fieldRanges={fieldRanges}
                sparkChartGlobalRanges={sparkChartGlobalRanges}
              />
            ))}
          </div>
        </div>
      );
    }

    // Non-virtual fallback
    return (
      <div
        ref={scrollContainerRefCallback}
        style={{ height, overflow: 'auto', outline: 'none' }}
        data-testid="grid-body"
        data-height={height}
        tabIndex={0}
        onKeyDown={handleScrollKeyDown}
        onMouseDown={handleGridMouseDown}
      >
        <div style={{ minWidth: totalWidth }}>
          {rows.map((row, index) => (
            <GridRowItem
              key={row.index}
              index={index}
              style={{}}
              rows={rows}
              columns={columns}
              fieldConfig={fieldConfig}
              theme={theme}
              gridTemplateColumns={gridTemplateColumns}
              rowStripeEnabled={options.rowStripeEnabled ?? false}
              showRowNumbers={options.showRowNumbers ?? false}
              compactMode={options.compactMode ?? false}
              stripeColor={stripeColor}
              totalWidth={totalWidth}
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
