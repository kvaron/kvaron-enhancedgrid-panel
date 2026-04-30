import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Input, Combobox, ComboboxOption, useStyles2 } from '@grafana/ui';

interface PaginationControlsProps {
  currentPage: number; // 0-based
  pageSize: number;
  totalRows: number | null; // null if unknown (server-side without count)
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
}) => {
  const styles = useStyles2(getStyles);

  const totalPages = totalRows != null ? Math.ceil(totalRows / pageSize) : null;
  const startRow = currentPage * pageSize + 1;
  const endRow = totalRows != null ? Math.min((currentPage + 1) * pageSize, totalRows) : (currentPage + 1) * pageSize;

  const canGoPrevious = currentPage > 0;
  const canGoNext = totalPages != null ? currentPage < totalPages - 1 : true;

  const pageSizeOptions = [10, 20, 50, 100, 200];

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      const pageNumber = value - 1; // Convert to 0-based
      if (totalPages == null || pageNumber < totalPages) {
        onPageChange(pageNumber);
      }
    }
  };

  const handlePageSizeChange = (option: ComboboxOption<number> | null) => {
    if (!option) {
      return;
    }
    const newPageSize = option.value;
    onPageSizeChange(newPageSize);
    // Reset to first page when changing page size
    onPageChange(0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        {totalRows != null ? (
          <span>
            Showing {startRow} to {endRow} of {totalRows.toLocaleString()} rows
          </span>
        ) : (
          <span>
            Showing {startRow} to {endRow}
          </span>
        )}
      </div>

      <div className={styles.centerSection}>
        <Button
          variant="secondary"
          size="sm"
          icon="angle-left"
          onClick={() => onPageChange(0)}
          disabled={!canGoPrevious}
          title="First page"
          aria-label="First page"
          className={styles.pageButton}
        />
        <Button
          variant="secondary"
          size="sm"
          icon="angle-left"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          title="Previous page"
          aria-label="Previous page"
          className={styles.pageButton}
        />

        <div className={styles.pageInfo}>
          <span className={styles.pageText}>Page</span>
          <Input
            type="number"
            value={currentPage + 1}
            onChange={handlePageInputChange}
            min={1}
            max={totalPages || undefined}
            className={styles.pageInput}
          />
          {totalPages != null && <span className={styles.pageText}>of {totalPages}</span>}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon="angle-right"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          title="Next page"
          aria-label="Next page"
          className={styles.pageButton}
        />
        {totalPages != null && (
          <Button
            variant="secondary"
            size="sm"
            icon="angle-right"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!canGoNext}
            title="Last page"
            aria-label="Last page"
            className={styles.pageButton}
          />
        )}
      </div>

      <div className={styles.rightSection}>
        <span>Rows per page:</span>
        <Combobox
          value={pageSize}
          options={pageSizeOptions.map((size) => ({ label: String(size), value: size }))}
          onChange={handlePageSizeChange}
          width={16}
          data-testid="pagination-page-size"
        />
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing(1, 1.5)};
    background: ${theme.colors.background.secondary};
    border-top: 1px solid ${theme.colors.border.medium};
    gap: ${theme.spacing(1.5)};
  `,
  leftSection: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
  centerSection: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `,
  rightSection: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  pageButton: css`
    min-width: ${theme.spacing(theme.components.height.md)};
    height: ${theme.spacing(theme.components.height.md)};
    padding: ${theme.spacing(0, 1)};
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  pageInput: css`
    width: ${theme.spacing(7.5)};
    text-align: center;
  `,
  pageSizeSelect: css`
    width: ${theme.spacing(10)};
    min-height: ${theme.spacing(theme.components.height.md)};
    line-height: ${theme.typography.body.lineHeight};
  `,
  pageInfo: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
  `,
  pageText: css`
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
});
