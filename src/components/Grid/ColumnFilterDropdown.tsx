import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Combobox, ComboboxOption, Input, useStyles2 } from '@grafana/ui';
import { FilterOperator, ColumnFilter, ColumnType } from '../../types';

interface ColumnFilterDropdownProps {
  fieldName: string;
  columnType: ColumnType;
  currentFilter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter | null) => void;
}

// Operator options based on column type
const getOperatorOptions = (columnType: ColumnType): Array<ComboboxOption<FilterOperator>> => {
  const commonOptions: Array<ComboboxOption<FilterOperator>> = [
    { label: 'Is Blank', value: 'blank' },
    { label: 'Is Not Blank', value: 'not_blank' },
  ];

  if (columnType === 'number') {
    return [
      { label: 'Equals (=)', value: 'eq' },
      { label: 'Not Equals (≠)', value: 'ne' },
      { label: 'Greater Than (>)', value: 'gt' },
      { label: 'Less Than (<)', value: 'lt' },
      { label: 'Greater or Equal (≥)', value: 'gte' },
      { label: 'Less or Equal (≤)', value: 'lte' },
      { label: 'Between', value: 'between' },
      ...commonOptions,
    ];
  }

  // Text, date, and boolean all use text-style operators
  return [
    { label: 'Contains', value: 'contains' },
    { label: 'Equals', value: 'equals' },
    { label: 'Starts With', value: 'starts_with' },
    { label: 'Ends With', value: 'ends_with' },
    ...commonOptions,
  ];
};

export const ColumnFilterDropdown: React.FC<ColumnFilterDropdownProps> = ({
  fieldName,
  columnType,
  currentFilter,
  onFilterChange,
}) => {
  const styles = useStyles2(getStyles);
  const operatorOptions = getOperatorOptions(columnType);

  // Initialize state from current filter or defaults
  const defaultOperator = columnType === 'number' ? 'eq' : 'contains';
  const [operator, setOperator] = useState<FilterOperator>(currentFilter?.operator || defaultOperator);
  const [value, setValue] = useState<string>(currentFilter?.value?.toString() || '');
  const [value2, setValue2] = useState<string>(currentFilter?.value2?.toString() || '');
  const [comboboxPortalContainer, setComboboxPortalContainer] = useState<HTMLDivElement | null>(null);

  const needsValue = operator !== 'blank' && operator !== 'not_blank';
  const needsValue2 = operator === 'between';

  const handleApply = () => {
    if (operator === 'blank' || operator === 'not_blank') {
      onFilterChange({ operator, value: '' });
      return;
    }

    if (!value || value.trim() === '') {
      onFilterChange(null);
      return;
    }

    // Validate numeric values before applying filter
    if (columnType === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        // Invalid number - don't apply filter
        return;
      }

      const filter: ColumnFilter = {
        operator,
        value: numValue,
      };

      if (needsValue2 && value2 && value2.trim() !== '') {
        const numValue2 = Number(value2);
        if (!isNaN(numValue2)) {
          filter.value2 = numValue2;
        }
      }

      onFilterChange(filter);
      return;
    }

    // Text filter
    const filter: ColumnFilter = {
      operator,
      value: value,
    };

    if (needsValue2 && value2 && value2.trim() !== '') {
      filter.value2 = value2;
    }

    onFilterChange(filter);
  };

  const handleClear = () => {
    setValue('');
    setValue2('');
    onFilterChange(null);
  };

  const handleOperatorChange = (selected: ComboboxOption<FilterOperator> | null) => {
    if (selected?.value) {
      setOperator(selected.value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div
      className={styles.container}
      onClick={(e) => e.stopPropagation()}
      ref={setComboboxPortalContainer}
      data-testid={`column-filter-dropdown-${fieldName}`}
    >
      <div className={styles.row}>
        <label className={styles.label}>Operator</label>
        <Combobox
          value={operator}
          options={operatorOptions}
          onChange={handleOperatorChange}
          width={30}
          portalContainer={comboboxPortalContainer ?? undefined}
        />
      </div>

      {needsValue && (
        <div className={styles.row}>
          <label className={styles.label}>{needsValue2 ? 'From' : 'Value'}</label>
          <Input
            type={columnType === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Enter ${columnType === 'number' ? 'number' : 'text'}...`}
            aria-label={`${fieldName} filter value`}
            data-testid="column-filter-value-input"
          />
        </div>
      )}

      {needsValue2 && (
        <div className={styles.row}>
          <label className={styles.label}>To</label>
          <Input
            type={columnType === 'number' ? 'number' : 'text'}
            value={value2}
            onChange={(e) => setValue2(e.currentTarget.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter number..."
            aria-label={`${fieldName} filter value to`}
            data-testid="column-filter-value2-input"
          />
        </div>
      )}

      <div className={styles.buttonRow}>
        <button className={styles.button} onClick={handleClear}>
          Clear
        </button>
        <button className={styles.applyButton} onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    padding: ${theme.spacing(1)};
    min-width: ${theme.spacing(31.25)};
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    box-shadow: ${theme.shadows.z3};
  `,
  row: css`
    margin-bottom: ${theme.spacing(1)};
    &:last-child {
      margin-bottom: 0;
    }
  `,
  label: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing(0.5)};
    display: block;
  `,
  buttonRow: css`
    display: flex;
    gap: ${theme.spacing(1)};
    margin-top: ${theme.spacing(1)};
  `,
  button: css`
    flex: 1;
    padding: ${theme.spacing(0.75, 1.5)};
    border-radius: ${theme.shape.radius.default};
    border: 1px solid ${theme.colors.border.medium};
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    cursor: pointer;
    font-size: ${theme.typography.bodySmall.fontSize};

    &:hover {
      background: ${theme.colors.action.hover};
    }
  `,
  applyButton: css`
    flex: 1;
    padding: ${theme.spacing(0.75, 1.5)};
    border-radius: ${theme.shape.radius.default};
    border: none;
    background: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
    cursor: pointer;
    font-size: ${theme.typography.bodySmall.fontSize};

    &:hover {
      background: ${theme.colors.primary.shade};
    }
  `,
});
