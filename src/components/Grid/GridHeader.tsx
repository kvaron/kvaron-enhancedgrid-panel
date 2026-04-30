import React, { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/css';
import { useTheme2, Icon, Tooltip } from '@grafana/ui';
import { GridColumn } from '../../utils/dataTransformer';
import { ColumnFilter, FilterStyle, EnhancedGridFieldConfig } from '../../types';
import { ColumnFilterDropdown } from './ColumnFilterDropdown';
import { detectColumnType } from '../../utils/columnTypeDetector';
import { ColumnGroups, buildGridTemplateColumns } from '../../utils/frozenColumnManager';

interface GridHeaderProps {
  columns: GridColumn[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (fieldName: string) => void;
  onFilter: (fieldName: string, filter: ColumnFilter | null) => void;
  filters: Record<string, ColumnFilter>;
  minHeight: number;
  maxHeight: number;
  rows: any[]; // For type detection
  compactHeaders?: boolean;
  filterStyle?: FilterStyle;
  filterRowHeight?: number;
  showRowNumbers?: boolean;
  fieldConfig?: Record<string, EnhancedGridFieldConfig>; // Field config by fieldName
  /** Calculated total width of all columns for horizontal scrolling */
  totalWidth?: number;
  /** Scrollbar width to compensate for body's vertical scrollbar */
  scrollbarWidth?: number;
  /** Column groups for frozen column support */
  columnGroups?: ColumnGroups;
  /** Whether frozen columns are enabled */
  frozenColumnsEnabled?: boolean;
}

export const GridHeader = forwardRef<HTMLDivElement, GridHeaderProps>(
  (
    {
      columns,
      sortField,
      sortDirection,
      onSort,
      onFilter,
      filters,
      minHeight,
      maxHeight,
      rows,
      compactHeaders = false,
      filterStyle = 'filterRow',
      filterRowHeight = 32,
      showRowNumbers = false,
      fieldConfig = {},
      totalWidth,
      scrollbarWidth = 0,
      columnGroups,
      frozenColumnsEnabled = false,
    },
    ref
  ) => {
    const theme = useTheme2();
    const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
    const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
    const [filterAnchorElement, setFilterAnchorElement] = useState<HTMLElement | null>(null);
    const filterDropdownRef = useRef<HTMLDivElement | null>(null);

    const closeFilter = useCallback(() => {
      setOpenFilterColumn(null);
      setFilterAnchorRect(null);
      setFilterAnchorElement(null);
    }, []);

    const isFilterInteractionTarget = useCallback((target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) {
        return false;
      }

      return !!filterDropdownRef.current?.contains(target) || !!filterAnchorElement?.contains(target);
    }, [filterAnchorElement]);

    const handleFilterClick = (fieldName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (openFilterColumn === fieldName) {
        closeFilter();
        return;
      }

      setOpenFilterColumn(fieldName);
      setFilterAnchorRect(e.currentTarget.getBoundingClientRect());
      setFilterAnchorElement(e.currentTarget as HTMLElement);
    };

    const handleFilterChange = (fieldName: string, filter: ColumnFilter | null) => {
      onFilter(fieldName, filter);
      closeFilter();
    };

    useEffect(() => {
      if (!openFilterColumn) {
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (!isFilterInteractionTarget(event.target)) {
          closeFilter();
        }
      };

      const handleFocusIn = (event: FocusEvent) => {
        if (!isFilterInteractionTarget(event.target)) {
          closeFilter();
        }
      };

      const handleScroll = (event: Event) => {
        if (!isFilterInteractionTarget(event.target)) {
          closeFilter();
        }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeFilter();
        }
      };

      document.addEventListener('pointerdown', handlePointerDown, true);
      document.addEventListener('focusin', handleFocusIn, true);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', closeFilter);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('pointerdown', handlePointerDown, true);
        document.removeEventListener('focusin', handleFocusIn, true);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', closeFilter);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [closeFilter, isFilterInteractionTarget, openFilterColumn]);

    const getFilterLabel = (fieldName: string): string => {
      const filter = filters[fieldName];
      if (!filter) {
        return 'Filter';
      }

      const { operator, value, value2 } = filter;

      if (operator === 'blank') {
        return 'Is Blank';
      }
      if (operator === 'not_blank') {
        return 'Not Blank';
      }
      if (operator === 'between' && value2) {
        return `${value} - ${value2}`;
      }

      // Truncate long values
      const valueStr = value.toString();
      return valueStr.length > 15 ? `${valueStr.substring(0, 15)}...` : valueStr;
    };

    const renderFilterDropdown = (column: GridColumn, columnType: ReturnType<typeof detectColumnType>) => {
      if (openFilterColumn !== column.fieldName || !filterAnchorRect || typeof document === 'undefined') {
        return null;
      }

      const dropdownWidth = 250;
      const viewportPadding = 8;
      const left = Math.max(
        viewportPadding,
        Math.min(filterAnchorRect.left, window.innerWidth - dropdownWidth - viewportPadding)
      );
      const top = Math.min(filterAnchorRect.bottom + 2, window.innerHeight - viewportPadding);

      return createPortal(
        <div ref={filterDropdownRef} className={styles.filterDropdownPortal} style={{ left, top }}>
          <ColumnFilterDropdown
            fieldName={column.fieldName}
            columnType={columnType}
            currentFilter={filters[column.fieldName]}
            onFilterChange={(filter) => handleFilterChange(column.fieldName, filter)}
          />
        </div>,
        document.body
      );
    };

    // Helper to render a single header cell (with integrated filter row if needed)
    const renderHeaderCell = (column: GridColumn, index: number, totalColumnsInGroup: number, styles: any) => {
      const isSorted = sortField === column.fieldName;
      const hasFilter = !!filters[column.fieldName];

      const sampleValues = rows.slice(0, 100).map((row) => row.data[column.fieldName]);
      const columnType = detectColumnType(column.field, sampleValues);

      const colFieldConfig = fieldConfig[column.fieldName] || {};
      const headerBgColor = colFieldConfig.headerBackgroundColor;
      const headerTextColor = colFieldConfig.headerTextColor;
      const headerBorderColor = colFieldConfig.headerBorderColor;
      const headerBorderWidth = colFieldConfig.headerBorderWidth || 0;
      const tooltip = colFieldConfig.tooltip;

      const headerCellWithConfig = css`
        ${headerBgColor ? `background-color: ${headerBgColor};` : ''}
        ${headerTextColor ? `color: ${headerTextColor};` : ''}
        ${headerBorderWidth && headerBorderWidth > 0
          ? `box-shadow: inset 0 0 0 ${headerBorderWidth}px ${headerBorderColor || theme.colors.border.medium};`
          : ''}
      `;

      const handleClearFilter = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilter(column.fieldName, null);
      };

      return (
        <div key={column.fieldName} className={styles.columnContainer} data-testid="header-cell">
          <div
            className={`${styles.headerCell} ${headerCellWithConfig}`}
            onClick={() => onSort(column.fieldName)}
            title={`Click to sort by ${column.displayName}`}
          >
            {tooltip && (
              <Tooltip content={tooltip} placement="top">
                <span className={styles.infoIcon} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Icon name="info-circle" size="sm" />
                </span>
              </Tooltip>
            )}
            {isSorted && (
              <span className={styles.sortIcon}>
                <Icon name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size="sm" />
              </span>
            )}
            <span className={styles.headerText}>{column.displayName}</span>
          </div>

          {/* Filter button mode */}
          {filterStyle === 'filterButton' && (
            <button
              className={`${styles.filterButtonInline} ${hasFilter ? styles.filterButtonInlineActive : ''}`}
              onClick={(e) => handleFilterClick(column.fieldName, e)}
              title="Click to filter this column"
              aria-label={`Filter ${column.displayName}`}
            >
              <Icon name="filter" size="sm" />
            </button>
          )}

          {/* Filter row mode - integrated into cell */}
          {filterStyle === 'filterRow' && (
            <div className={styles.filterSection}>
              <button
                className={styles.filterRowButton}
                onClick={(e) => handleFilterClick(column.fieldName, e)}
                title="Click to filter this column"
                aria-label={`Filter ${column.displayName}`}
              >
                <Icon name="filter" size="sm" />
                <span className={styles.filterRowButtonText}>{getFilterLabel(column.fieldName)}</span>
                {hasFilter && (
                  <span className={styles.filterRowClearButton} onClick={handleClearFilter} title="Clear filter">
                    <Icon name="times" size="sm" />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Filter dropdown */}
          {renderFilterDropdown(column, columnType)}
        </div>
      );
    };

    const gridTemplateColumns = `${showRowNumbers ? '50px ' : ''}${columns.map((col) => (col.width ? `${col.width}px` : 'minmax(auto, 1fr)')).join(' ')}`;

    // Build grid template for frozen sections when enabled
    const leftGridTemplate =
      frozenColumnsEnabled && columnGroups
        ? buildGridTemplateColumns(columnGroups.left, showRowNumbers && columnGroups.left.length > 0, false)
        : '';
    const centerGridTemplate =
      frozenColumnsEnabled && columnGroups
        ? buildGridTemplateColumns(columnGroups.center, false, true) // Allow flexible for center scrollable region
        : '';
    const rightGridTemplate =
      frozenColumnsEnabled && columnGroups ? buildGridTemplateColumns(columnGroups.right, false, false) : '';

    const styles = {
      // Main wrapper - when frozen columns enabled, it's a positioning container
      wrapper: css`
        position: relative;
        overflow-x: ${frozenColumnsEnabled ? 'hidden' : 'auto'};
        overflow-y: hidden;
        flex-shrink: 0;
        width: 100%;
        /* Hide scrollbar but allow programmatic scrolling */
        scrollbar-width: none;
        -ms-overflow-style: none;
        &::-webkit-scrollbar {
          display: none;
        }
      `,
      headerContent: css`
        ${totalWidth !== undefined ? `min-width: ${totalWidth}px;` : ''}
        /* Add padding for scrollbar compensation */
        padding-right: ${scrollbarWidth}px;
      `,
      header: css`
        display: grid;
        grid-template-columns: ${gridTemplateColumns};
        min-height: ${minHeight}px;
        max-height: ${maxHeight}px;
        background: ${theme.colors.background.secondary};
        border-bottom: 2px solid ${theme.colors.border.medium};
      `,
      // Frozen column container styles
      frozenContainer: css`
        display: flex;
        width: 100%;
        position: relative;
      `,
      frozenLeft: css`
        position: absolute;
        left: 0;
        top: 0;
        z-index: 2;
        background: ${theme.colors.background.secondary};
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
      `,
      frozenRight: css`
        position: absolute;
        right: ${scrollbarWidth}px;
        top: 0;
        z-index: 2;
        background: ${theme.colors.background.secondary};
        box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
      `,
      frozenCenterWrapper: css`
        margin-left: ${columnGroups?.leftWidth || 0}px;
        margin-right: ${(columnGroups?.rightWidth || 0) + scrollbarWidth}px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        &::-webkit-scrollbar {
          display: none;
        }
      `,
      frozenHeader: css`
        display: grid;
        min-height: ${minHeight}px;
        max-height: ${maxHeight}px;
        background: ${theme.colors.background.secondary};
        border-bottom: 2px solid ${theme.colors.border.medium};
      `,
      frozenLeftHeader: css`
        grid-template-columns: ${leftGridTemplate};
      `,
      frozenCenterHeader: css`
        grid-template-columns: ${centerGridTemplate};
        ${columnGroups?.centerWidth !== undefined ? `min-width: ${columnGroups.centerWidth}px;` : ''}
      `,
      frozenRightHeader: css`
        grid-template-columns: ${rightGridTemplate};
      `,
      columnContainer: css`
        position: relative;
        display: flex;
        flex-direction: column;
        border-right: 1px solid ${theme.colors.border.weak};
        height: 100%;
      `,
      headerCell: css`
        padding: ${compactHeaders ? '2px 4px' : '4px 8px'};
        font-weight: bold;
        font-size: ${compactHeaders ? '12px' : '13px'};
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 4px;
        cursor: pointer;
        user-select: none;
        ${filterStyle === 'filterRow' ? 'flex: 0 0 auto;' : 'flex: 1;'}
        min-height: 0;
        overflow: hidden;

        &:hover {
          background: ${theme.colors.action.hover};
        }
      `,
      filterSection: css`
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px 4px;
        height: ${filterRowHeight}px;
        background: ${theme.colors.background.secondary};
      `,
      sortIcon: css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        padding-top: 2px;
      `,
      infoIcon: css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        padding-top: 2px;
        cursor: help;
      `,
      headerText: css`
        overflow: hidden;
        min-width: 0;
        flex: 1;
        ${compactHeaders
          ? `
          white-space: nowrap;
          text-overflow: ellipsis;
        `
          : `
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          word-break: break-word;
        `}
      `,
      // Filter Row styles (separate row below header)
      filterRow: css`
        display: grid;
        grid-template-columns: ${gridTemplateColumns};
        height: ${filterRowHeight}px;
        background: ${theme.colors.background.secondary};
        border-bottom: 2px solid ${theme.colors.border.medium};
      `,
      filterRowCell: css`
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px 4px;
        border-right: 1px solid ${theme.colors.border.weak};
      `,
      filterRowButton: css`
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid ${theme.colors.border.medium};
        background: ${theme.colors.background.primary};
        color: ${theme.colors.text.secondary};
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
        width: 100%;
        height: 100%;
        max-height: 26px;
        transition: all 0.15s;

        &:hover {
          background: ${theme.colors.action.hover};
          border-color: ${theme.colors.border.strong};
        }
      `,
      filterRowButtonText: css`
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
      `,
      filterRowClearButton: css`
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        margin-left: auto;
        border-radius: 2px;
        color: ${theme.colors.text.secondary};
        transition: all 0.15s;

        &:hover {
          background: ${theme.colors.action.hover};
          color: ${theme.colors.text.primary};
        }
      `,
      // Inline filter button styles (overlays header cell)
      filterButtonInline: css`
        position: absolute;
        bottom: ${compactHeaders ? '2px' : '6px'};
        right: 2px;
        padding: 2px;
        border-radius: 3px;
        border: 1px solid ${theme.colors.border.weak};
        background: ${theme.colors.background.secondary};
        color: ${theme.colors.text.secondary};
        cursor: pointer;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        z-index: 5;
        opacity: 0.85;
        transition: all 0.15s;

        &:hover {
          background: ${theme.colors.action.hover};
          border-color: ${theme.colors.border.medium};
          opacity: 1;
        }
      `,
      filterButtonInlineActive: css`
        background: ${theme.colors.primary.transparent};
        border-color: ${theme.colors.primary.border};
        color: ${theme.colors.primary.text};
        opacity: 1;
      `,
      filterDropdownPortal: css`
        position: fixed;
        z-index: ${theme.zIndex.dropdown};
      `,
    };

    // Row number cell renderer (with integrated filter section if needed)
    const renderRowNumberCell = () => (
      <div className={styles.columnContainer}>
        <div className={styles.headerCell}>
          <span className={styles.headerText}>#</span>
        </div>
        {filterStyle === 'filterRow' && (
          <div className={styles.filterSection}>{/* Empty filter section for row number column */}</div>
        )}
      </div>
    );

    // Frozen columns layout
    if (frozenColumnsEnabled && columnGroups) {
      return (
        <div className={styles.wrapper} data-testid="grid-header">
          {/* Left frozen section */}
          {columnGroups.left.length > 0 && (
            <div className={styles.frozenLeft} style={{ width: columnGroups.leftWidth }}>
              <div className={`${styles.frozenHeader} ${styles.frozenLeftHeader}`} data-testid="header-content">
                {showRowNumbers && renderRowNumberCell()}
                {columnGroups.left.map((col, idx) => renderHeaderCell(col, idx, columnGroups.left.length, styles))}
              </div>
            </div>
          )}

          {/* Center scrollable section */}
          <div ref={ref} className={styles.frozenCenterWrapper}>
            <div className={`${styles.frozenHeader} ${styles.frozenCenterHeader}`}>
              {columnGroups.center.map((col, idx) => renderHeaderCell(col, idx, columnGroups.center.length, styles))}
            </div>
          </div>

          {/* Right frozen section */}
          {columnGroups.right.length > 0 && (
            <div className={styles.frozenRight} style={{ width: columnGroups.rightWidth }}>
              <div className={`${styles.frozenHeader} ${styles.frozenRightHeader}`}>
                {columnGroups.right.map((col, idx) => renderHeaderCell(col, idx, columnGroups.right.length, styles))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Standard layout (no frozen columns)
    return (
      <div ref={ref} className={styles.wrapper} data-testid="grid-header">
        <div className={styles.headerContent} data-testid="header-content">
          {/* Header Row with integrated filter sections */}
          <div className={styles.header}>
            {showRowNumbers && renderRowNumberCell()}
            {columns.map((col, idx) => renderHeaderCell(col, idx, columns.length, styles))}
          </div>
        </div>
      </div>
    );
  }
);

GridHeader.displayName = 'GridHeader';
