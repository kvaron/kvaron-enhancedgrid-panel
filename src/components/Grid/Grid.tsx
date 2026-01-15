import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { DataFrame } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { locationService } from '@grafana/runtime';
import { css } from '@emotion/css';
import { EnhancedGridOptions, HighlightRule, ColumnFilter, EnhancedGridFieldConfig } from '../../types';
import { transformDataFrame, GridColumn } from '../../utils/dataTransformer';
import { calculateColumnMetrics } from '../../utils/columnWidthManager';
import { GridHeader } from './GridHeader';
import { GridBody, GridBodyHandle } from './GridBody';
import { PaginationControls } from './PaginationControls';
import { buildODataQuery, buildSQLQuery, buildGenericQuery, PaginationState } from '../../utils/odataQueryBuilder';
import { isBlank } from '../../utils/columnTypeDetector';
import { getScrollbarWidth, hasVerticalScrollbar, hasHorizontalScrollbar } from '../../utils/scrollbarUtils';
import { calculateColumnWidth, getFontOptions } from '../../utils/textMeasurement';
import { classifyColumns, hasFrozenColumns, ColumnGroups } from '../../utils/frozenColumnManager';

// Debounce delay for URL updates (ms) - prevents excessive API calls during rapid changes
const URL_UPDATE_DEBOUNCE_MS = 300;

// Constants for auto-sizing
const DEFAULT_AUTO_SIZE_PADDING = 16;
const DEFAULT_AUTO_SIZE_SAMPLE_SIZE = 100;
const MIN_COLUMN_WIDTH = 50;
const MAX_COLUMN_WIDTH = 500;

interface GridProps {
  data: DataFrame | undefined;
  options: EnhancedGridOptions;
  width: number;
  height: number;
  highlightRules: HighlightRule[];
}

export const Grid: React.FC<GridProps> = ({ data, options, width, height, highlightRules }) => {
  const theme = useTheme2();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, ColumnFilter>>({});
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(options.pageSize || 50);
  const [scrollbarWidth, setScrollbarWidth] = useState<number>(0);
  const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] = useState<number>(0);
  // Counter to trigger scroll sync re-initialization when scroll container becomes ready
  const [scrollContainerReadyCount, setScrollContainerReadyCount] = useState(0);

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<GridBodyHandle>(null);

  // Callback when body scroll container is ready (for virtual scrolling)
  const handleScrollContainerReady = useCallback(() => {
    setScrollContainerReadyCount((c) => c + 1);
  }, []);

  // Ref to track debounce timeout for URL updates
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update dashboard variables when server-side mode is enabled (debounced)
  useEffect(() => {
    if (!options.serverSideMode) {
      return;
    }

    // Clear any pending debounced update
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    // Debounce URL updates to prevent excessive API calls during rapid changes
    urlUpdateTimeoutRef.current = setTimeout(() => {
      const sortState = { field: sortField, direction: sortDirection };
      const paginationState: PaginationState | null = options.serverSidePagination ? { currentPage, pageSize } : null;

      let filterQuery = '';
      let sortQuery = '';
      let skipQuery = '';
      let topQuery = '';

      // Build queries based on the selected format
      if (options.queryFormat === 'odata') {
        const { filter, orderby, skip, top } = buildODataQuery(filters, sortState, paginationState);
        filterQuery = filter;
        sortQuery = orderby;
        skipQuery = skip;
        topQuery = top;
      } else if (options.queryFormat === 'sql') {
        const { where, orderby, limit, offset } = buildSQLQuery(filters, sortState, paginationState);
        filterQuery = where;
        sortQuery = orderby;
        topQuery = limit;
        skipQuery = offset;
      } else {
        const { filter, sort } = buildGenericQuery(filters, sortState);
        filterQuery = filter;
        sortQuery = sort;
      }

      // Update dashboard variables
      const searchParams = locationService.getSearchObject();
      const newParams = { ...searchParams };

      // Set filter variable
      if (options.filterVariableName) {
        newParams[`var-${options.filterVariableName}`] = filterQuery || '';
      }

      // Set sort variable
      if (options.sortVariableName) {
        newParams[`var-${options.sortVariableName}`] = sortQuery || '';
      }

      // Set pagination variables if enabled
      if (options.serverSidePagination) {
        if (options.skipVariableName) {
          newParams[`var-${options.skipVariableName}`] = skipQuery;
        }
        if (options.topVariableName) {
          newParams[`var-${options.topVariableName}`] = topQuery;
        }
      }

      // Update URL with new variable values (this triggers query refresh)
      locationService.partial(newParams, true);
    }, URL_UPDATE_DEBOUNCE_MS);

    // Cleanup: cancel pending timeout on unmount or dependency change
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [
    filters,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    options.serverSideMode,
    options.serverSidePagination,
    options.queryFormat,
    options.filterVariableName,
    options.sortVariableName,
    options.skipVariableName,
    options.topVariableName,
  ]);

  // Transform data
  const { columns, rows } = useMemo(() => transformDataFrame(data), [data]);

  // Build fieldConfig map from data fields
  const fieldConfigMap = useMemo(() => {
    const configMap: Record<string, EnhancedGridFieldConfig> = {};
    if (data?.fields) {
      data.fields.forEach((field) => {
        const customConfig = field.config.custom as EnhancedGridFieldConfig | undefined;
        if (customConfig) {
          configMap[field.name] = customConfig;
        }
      });
    }
    return configMap;
  }, [data]);

  // Inject synthetic flags columns
  const columnsWithFlags = useMemo(() => {
    const flagsRules = highlightRules.filter((r) => r.enabled && r.ruleType === 'flagsColumn');

    if (flagsRules.length === 0) {
      return columns;
    }

    let modifiedColumns = [...columns];
    const firstColumns: any[] = [];
    const lastColumns: any[] = [];

    flagsRules.forEach((rule) => {
      // Create synthetic field for the flags column
      const syntheticField: any = {
        name: rule.flagsColumnName || 'flags',
        type: 'string',
        config: {},
        values: [],
      };

      const flagColumn = {
        field: syntheticField,
        fieldName: rule.flagsColumnName || 'flags',
        displayName: rule.flagsColumnName || 'Flags',
        width: rule.flagsColumnWidth || 80,
        align: 'center' as const,
        isFlagsColumn: true,
        flagsRuleId: rule.id,
      };

      if (rule.flagsColumnPosition === 'first') {
        firstColumns.push(flagColumn);
      } else {
        lastColumns.push(flagColumn);
      }
    });

    return [...firstColumns, ...modifiedColumns, ...lastColumns];
  }, [columns, highlightRules]);

  // Calculate auto-sized column widths
  const autoSizedColumns = useMemo(() => {
    const fontOptions = getFontOptions(options.compactMode, options.compactHeaders);
    const sampleSize = options.autoSizeSampleSize || DEFAULT_AUTO_SIZE_SAMPLE_SIZE;
    const sampleRows = rows.slice(0, sampleSize);

    // If auto-sizing is enabled, calculate fixed widths
    if (options.autoSizeAllColumns) {
      return columnsWithFlags.map((column): GridColumn => {
        const fieldConf = fieldConfigMap[column.fieldName];

        // Skip if column has manual width set
        if (fieldConf?.width || column.width) {
          return column;
        }

        // Skip flags columns (they have their own fixed width)
        if (column.isFlagsColumn) {
          return column;
        }

        // All columns are auto-sized when global flag is enabled
        // Calculate width based on content
        const cellValues = sampleRows.map((row) => {
          const value = row.data[column.fieldName];
          return value != null ? String(value) : '';
        });

        const calculatedWidth = calculateColumnWidth(column.displayName, cellValues, {
          ...fontOptions,
          padding: DEFAULT_AUTO_SIZE_PADDING,
          minWidth: MIN_COLUMN_WIDTH,
          maxWidth: MAX_COLUMN_WIDTH,
        });

        return { ...column, width: calculatedWidth };
      });
    }

    // Auto-sizing is disabled - check if we should use flexible layout
    // Check if ANY column has explicit width set (excluding flags columns)
    const hasAnyExplicitWidth = columnsWithFlags.some((col) => {
      const fieldConf = fieldConfigMap[col.fieldName];
      return (fieldConf?.width || col.width) && !col.isFlagsColumn;
    });

    // If no explicit widths, calculate minimum widths for flexible layout
    if (!hasAnyExplicitWidth) {
      return columnsWithFlags.map((column): GridColumn => {
        // Skip flags columns - they keep their fixed width
        if (column.isFlagsColumn) {
          return column;
        }

        // Calculate minimum width based on content
        const cellValues = sampleRows.map((row) => {
          const value = row.data[column.fieldName];
          return value != null ? String(value) : '';
        });

        const minWidth = calculateColumnWidth(column.displayName, cellValues, {
          ...fontOptions,
          padding: DEFAULT_AUTO_SIZE_PADDING,
          minWidth: MIN_COLUMN_WIDTH,
          maxWidth: MAX_COLUMN_WIDTH,
        });

        return { ...column, minWidth }; // Store as minWidth, not width
      });
    }

    // Mixed mode or all explicit widths - return as-is
    return columnsWithFlags;
  }, [
    columnsWithFlags,
    rows,
    fieldConfigMap,
    options.autoSizeAllColumns,
    options.autoSizeSampleSize,
    options.compactMode,
    options.compactHeaders,
  ]);

  // Calculate column metrics (single source of truth for widths)
  // This prevents header-body mismatches by using same source for both
  const columnMetrics = useMemo(() => {
    return calculateColumnMetrics(autoSizedColumns, options.showRowNumbers);
  }, [autoSizedColumns, options.showRowNumbers]);

  // Keep totalWidth derived from columnMetrics
  const totalWidth = columnMetrics.totalWidth;

  // Classify columns into frozen left, center, and frozen right groups
  const columnGroups = useMemo((): ColumnGroups => {
    return classifyColumns(
      autoSizedColumns,
      options.freezeLeftColumns || 0,
      options.freezeRightColumns || 0,
      options.showRowNumbers
    );
  }, [autoSizedColumns, options.freezeLeftColumns, options.freezeRightColumns, options.showRowNumbers]);

  // Check if frozen columns are enabled
  const frozenColumnsEnabled = hasFrozenColumns(options.freezeLeftColumns || 0, options.freezeRightColumns || 0);

  // Calculate min/max ranges for numeric fields (used by dataRangeGradient rules with auto-detect mode)
  const fieldRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};

    // Find all numeric columns
    columns.forEach((column) => {
      if (column.field.type === 'number') {
        const fieldName = column.fieldName;
        let min = Infinity;
        let max = -Infinity;

        // Scan all rows to find min/max
        rows.forEach((row) => {
          const value = Number(row.data[fieldName]);
          if (!isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        });

        // Only store if we found valid values
        if (min !== Infinity && max !== -Infinity) {
          ranges[fieldName] = { min, max };
        }
      }
    });

    return ranges;
  }, [columns, rows]);

  // Calculate global ranges for spark chart fields (used for 'global' scale mode)
  const sparkChartGlobalRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};

    // Find all spark chart rules with 'global' scale mode
    const globalScaleRules = highlightRules.filter(
      (rule) =>
        rule.enabled &&
        rule.ruleType === 'sparkChart' &&
        ((rule.sparkChartMode === 'line' && rule.sparkChartScaleMode === 'global') ||
          (rule.sparkChartMode === 'bar' && rule.sparkChartScaleMode === 'global') ||
          (rule.sparkChartMode === 'stack' && rule.sparkChartScaleMode === 'global')) &&
        rule.sparkChartSourceField
    );

    // For each global scale rule, calculate min/max across all rows
    globalScaleRules.forEach((rule) => {
      const sourceField = rule.sparkChartSourceField!;
      const separator = rule.sparkChartDataSeparator || ',';
      let globalMin = Infinity;
      let globalMax = -Infinity;

      rows.forEach((row) => {
        const rawValue = row.data[sourceField];
        if (rawValue != null) {
          // Parse data (same logic as in highlightEngine)
          let data: number[] = [];
          if (Array.isArray(rawValue)) {
            data = rawValue.map((v) => Number(v)).filter((n) => !isNaN(n));
          } else if (typeof rawValue === 'string') {
            data = rawValue
              .split(separator)
              .map((s) => Number(s.trim()))
              .filter((n) => !isNaN(n));
          }

          // For stack charts, use total; for line/bar, use individual values
          if (rule.sparkChartMode === 'stack') {
            const total = data.reduce((sum, val) => sum + val, 0);
            globalMin = Math.min(globalMin, 0); // Stack always starts at 0
            globalMax = Math.max(globalMax, total);
          } else {
            // For line/bar charts, track min/max of all values
            data.forEach((val) => {
              globalMin = Math.min(globalMin, val);
              globalMax = Math.max(globalMax, val);
            });
          }
        }
      });

      if (globalMin !== Infinity && globalMax !== -Infinity) {
        ranges[sourceField] = { min: globalMin, max: globalMax };
      }
    });

    return ranges;
  }, [highlightRules, rows]);

  // Apply sorting (only in client-side mode)
  const sortedRows = useMemo(() => {
    if (options.serverSideMode || !sortField) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a.data[sortField];
      const bVal = b.data[sortField];

      if (aVal === bVal) {
        return 0;
      }

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortField, sortDirection, options.serverSideMode]);

  // Apply filtering (only in client-side mode)
  const filteredRows = useMemo(() => {
    if (options.serverSideMode) {
      return sortedRows;
    }

    return sortedRows.filter((row) => {
      for (const [fieldName, filter] of Object.entries(filters)) {
        if (!filter) {
          continue;
        }

        const cellValue = row.data[fieldName];
        const { operator, value, value2 } = filter;

        // Handle blank/not blank
        if (operator === 'blank') {
          if (!isBlank(cellValue)) {
            return false;
          }
          continue;
        }
        if (operator === 'not_blank') {
          if (isBlank(cellValue)) {
            return false;
          }
          continue;
        }

        const cellStr = String(cellValue || '').toLowerCase();
        const valueStr = String(value).toLowerCase();

        // Text operators
        if (operator === 'contains') {
          if (!cellStr.includes(valueStr)) {
            return false;
          }
        } else if (operator === 'equals') {
          if (cellStr !== valueStr) {
            return false;
          }
        } else if (operator === 'starts_with') {
          if (!cellStr.startsWith(valueStr)) {
            return false;
          }
        } else if (operator === 'ends_with') {
          if (!cellStr.endsWith(valueStr)) {
            return false;
          }
        }
        // Numeric operators
        else if (operator === 'eq') {
          if (Number(cellValue) !== Number(value)) {
            return false;
          }
        } else if (operator === 'ne') {
          if (Number(cellValue) === Number(value)) {
            return false;
          }
        } else if (operator === 'gt') {
          if (Number(cellValue) <= Number(value)) {
            return false;
          }
        } else if (operator === 'lt') {
          if (Number(cellValue) >= Number(value)) {
            return false;
          }
        } else if (operator === 'gte') {
          if (Number(cellValue) < Number(value)) {
            return false;
          }
        } else if (operator === 'lte') {
          if (Number(cellValue) > Number(value)) {
            return false;
          }
        } else if (operator === 'between' && value2 != null) {
          const numValue = Number(cellValue);
          if (numValue < Number(value) || numValue > Number(value2)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [sortedRows, filters, options.serverSideMode]);

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      // Cycle through: asc -> desc -> clear
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Clear sort on third click
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(fieldName);
      setSortDirection('asc');
    }
  };

  const handleFilter = (fieldName: string, filter: ColumnFilter | null) => {
    if (filter === null) {
      // Remove filter
      const newFilters = { ...filters };
      delete newFilters[fieldName];
      setFilters(newFilters);
    } else {
      // Add or update filter
      setFilters({ ...filters, [fieldName]: filter });
    }
    // Reset to first page when filtering
    setCurrentPage(0);
  };

  // Apply client-side pagination (only if enabled and not server-side)
  const paginatedRows = useMemo(() => {
    if (!options.paginationEnabled || options.serverSidePagination) {
      return filteredRows;
    }

    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, currentPage, pageSize, options.paginationEnabled, options.serverSidePagination]);

  // Calculate total count for pagination
  const displayTotalCount = options.serverSidePagination ? null : filteredRows.length;

  // Determine which rows to display
  const displayRows = options.paginationEnabled ? paginatedRows : filteredRows;

  // Track actual body wrapper height using ResizeObserver
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  // Initialize with estimated height (will be updated by ResizeObserver)
  const estimatedBodyHeight = useMemo(() => {
    // Estimate by subtracting header and pagination from total height
    const headerSize = options.showHeader ? (options.compactHeaders ? 24 : options.headerHeight || 60) : 0;
    const filterSize = options.showHeader && options.filterStyle === 'filterRow' ? 32 : 0;
    const paginationSize = options.paginationEnabled ? 58 : 0; // Updated to 58 based on actual measurement
    return Math.max(0, height - headerSize - filterSize - paginationSize);
  }, [
    height,
    options.showHeader,
    options.compactHeaders,
    options.headerHeight,
    options.filterStyle,
    options.paginationEnabled,
  ]);

  const [bodyWrapperHeight, setBodyWrapperHeight] = useState(estimatedBodyHeight);

  // Observe body wrapper size changes using layout effect for immediate measurement
  useLayoutEffect(() => {
    const bodyWrapperElement = bodyWrapperRef.current;
    if (!bodyWrapperElement) {
      return;
    }

    // Measure immediately after layout
    const initialHeight = Math.floor(bodyWrapperElement.getBoundingClientRect().height);
    if (initialHeight > 0) {
      setBodyWrapperHeight(initialHeight);
    }
  }, [estimatedBodyHeight]);

  // Separate effect for ResizeObserver to avoid infinite loops
  useEffect(() => {
    const bodyWrapperElement = bodyWrapperRef.current;
    if (!bodyWrapperElement) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height: observedHeight } = entry.contentRect;
        const newHeight = Math.floor(observedHeight);
        if (newHeight > 0) {
          setBodyWrapperHeight(newHeight);
        }
      }
    });

    resizeObserver.observe(bodyWrapperElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Also update when panel height changes (since flexbox will recalculate)
  useEffect(() => {
    const bodyWrapperElement = bodyWrapperRef.current;
    if (!bodyWrapperElement) {
      return;
    }

    requestAnimationFrame(() => {
      const newHeight = Math.floor(bodyWrapperElement.getBoundingClientRect().height);
      if (newHeight > 0) {
        setBodyWrapperHeight(newHeight);
      }
    });
  }, [
    height,
    options.showHeader,
    options.compactHeaders,
    options.headerHeight,
    options.filterStyle,
    options.paginationEnabled,
  ]);

  // Scroll synchronization effect - bidirectional sync following react-base-table pattern
  // This ensures header and body stay in sync when either is scrolled
  useEffect(() => {
    const bodyScrollContainer = bodyRef.current?.getScrollContainer();
    const headerScrollContainer = headerScrollRef.current;

    if (!bodyScrollContainer || !headerScrollContainer) {
      return;
    }

    // Flag to prevent synchronization loops
    let syncInProgress = false;

    // Sync header scroll when body scrolls
    const handleBodyScroll = () => {
      if (syncInProgress) {
        return;
      }
      syncInProgress = true;
      // Use requestAnimationFrame to batch updates like react-base-table does
      requestAnimationFrame(() => {
        headerScrollContainer.scrollLeft = bodyScrollContainer.scrollLeft;
        syncInProgress = false;
      });
    };

    // Sync body scroll when header scrolls (bidirectional - new feature)
    const handleHeaderScroll = () => {
      if (syncInProgress) {
        return;
      }
      syncInProgress = true;
      requestAnimationFrame(() => {
        bodyScrollContainer.scrollLeft = headerScrollContainer.scrollLeft;
        syncInProgress = false;
      });
    };

    // Check for vertical and horizontal scrollbars and update dimensions
    const updateScrollbarDimensions = () => {
      if (hasVerticalScrollbar(bodyScrollContainer)) {
        setScrollbarWidth(getScrollbarWidth());
      } else {
        setScrollbarWidth(0);
      }

      if (hasHorizontalScrollbar(bodyScrollContainer)) {
        setHorizontalScrollbarHeight(getScrollbarWidth());
      } else {
        setHorizontalScrollbarHeight(0);
      }
    };

    // Initial check
    updateScrollbarDimensions();

    // Add scroll listeners for both directions
    bodyScrollContainer.addEventListener('scroll', handleBodyScroll);
    headerScrollContainer.addEventListener('scroll', handleHeaderScroll);

    // Use ResizeObserver to detect scrollbar appearance
    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarDimensions();
    });
    resizeObserver.observe(bodyScrollContainer);

    return () => {
      bodyScrollContainer.removeEventListener('scroll', handleBodyScroll);
      headerScrollContainer.removeEventListener('scroll', handleHeaderScroll);
      resizeObserver.disconnect();
    };
  }, [displayRows.length, options.virtualScrollEnabled, scrollContainerReadyCount]); // Re-run when row count changes, virtual scrolling mode changes, or scroll container becomes ready

  // Fixed height for filter row when using filterRow style
  const FILTER_ROW_HEIGHT = 32;

  // Header height constraints
  const headerHeightConfig = useMemo(() => {
    if (!options.showHeader) {
      return { minHeight: 0, maxHeight: 0 };
    }

    let minHeight = 24; // ~1 line
    let maxHeight = options.headerHeight || 60; // user configurable max, default ~3 lines

    if (options.compactHeaders) {
      // Compact: fixed single-line height
      minHeight = 24;
      maxHeight = 24;
    }

    // Add filter row height if using filterRow style (filter is integrated into header)
    if (options.filterStyle === 'filterRow') {
      minHeight += FILTER_ROW_HEIGHT;
      maxHeight += FILTER_ROW_HEIGHT;
    }

    return { minHeight, maxHeight };
  }, [options.showHeader, options.compactHeaders, options.headerHeight, options.filterStyle]);

  // Use the observed body wrapper height for GridBody
  // This allows flexbox to naturally size the body based on available space
  const bodyHeight = bodyWrapperHeight;

  const styles = useMemo(
    () => ({
      container: css`
        display: flex;
        flex-direction: column;
        width: ${width}px;
        height: ${height}px;
        background: ${theme.colors.background.primary};
        border: 1px solid ${theme.colors.border.weak};
        overflow: hidden;
      `,
      headerWrapper: css`
        flex: 0 0 auto;
      `,
      bodyWrapper: css`
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      `,
      paginationWrapper: css`
        flex: 0 0 auto;
      `,
    }),
    [width, height, theme.colors.background.primary, theme.colors.border.weak]
  );

  return (
    <div
      className={styles.container}
      data-testid="enhanced-grid-container"
      data-body-height-state={String(bodyWrapperHeight)}
      data-body-height-estimated={String(estimatedBodyHeight)}
      data-body-height-final={String(bodyHeight)}
    >
      {options.showHeader && (
        <div className={styles.headerWrapper}>
          <GridHeader
            ref={headerScrollRef}
            columns={autoSizedColumns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onFilter={handleFilter}
            filters={filters}
            minHeight={headerHeightConfig.minHeight}
            maxHeight={headerHeightConfig.maxHeight}
            rows={rows}
            compactHeaders={options.compactHeaders}
            filterStyle={options.filterStyle}
            filterRowHeight={FILTER_ROW_HEIGHT}
            showRowNumbers={options.showRowNumbers}
            fieldConfig={fieldConfigMap}
            totalWidth={totalWidth}
            scrollbarWidth={scrollbarWidth}
            columnGroups={columnGroups}
            frozenColumnsEnabled={frozenColumnsEnabled}
          />
        </div>
      )}
      <div ref={bodyWrapperRef} className={styles.bodyWrapper}>
        <GridBody
          ref={bodyRef}
          columns={autoSizedColumns}
          rows={displayRows}
          highlightRules={highlightRules}
          fieldRanges={fieldRanges}
          sparkChartGlobalRanges={sparkChartGlobalRanges}
          options={options}
          height={bodyHeight}
          fieldConfig={fieldConfigMap}
          totalWidth={totalWidth}
          onScrollContainerReady={handleScrollContainerReady}
          columnGroups={columnGroups}
          frozenColumnsEnabled={frozenColumnsEnabled}
          horizontalScrollbarHeight={horizontalScrollbarHeight}
        />
      </div>
      {options.paginationEnabled && (
        <div className={styles.paginationWrapper}>
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalRows={displayTotalCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
};
