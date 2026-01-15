import React from 'react';
import {
  Button,
  Combobox,
  ComboboxOption,
  Input,
  InlineField,
  InlineFieldRow,
  IconButton,
  useStyles2,
} from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import {
  HighlightCondition,
  ConditionGroup,
  ConditionElement,
  ComparisonOperator,
  LogicalOperator,
  isConditionGroup,
} from '../../types';

interface ConditionGroupBuilderProps {
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  availableFields: string[];
  depth?: number;
}

const OPERATOR_OPTIONS: Array<ComboboxOption<ComparisonOperator>> = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not Equals', value: 'not_equals' },
  { label: 'Greater Than', value: 'greater_than' },
  { label: 'Less Than', value: 'less_than' },
  { label: 'Greater or Equal', value: 'greater_than_or_equal' },
  { label: 'Less or Equal', value: 'less_than_or_equal' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not Contains', value: 'not_contains' },
  { label: 'Starts With', value: 'starts_with' },
  { label: 'Ends With', value: 'ends_with' },
  { label: 'Is Null', value: 'is_null' },
  { label: 'Is Not Null', value: 'is_not_null' },
];

const LOGICAL_OPERATOR_OPTIONS: Array<ComboboxOption<LogicalOperator>> = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
];

const getStyles = (theme: GrafanaTheme2, depth: number) => ({
  groupContainer: css`
    border-left: 2px solid ${theme.colors.border.medium};
    padding-left: ${theme.spacing(2)};
    margin-left: ${depth * Number(theme.spacing(2))}px;
    margin-bottom: ${theme.spacing(1)};
  `,
  groupHeader: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(1)};
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.radius.default};
  `,
  conditionRow: css`
    margin-bottom: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.5)};
    background: ${theme.colors.background.primary};
    border-radius: ${theme.shape.radius.default};
  `,
  operatorBadge: css`
    display: inline-block;
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
    margin: ${theme.spacing(0.5)} 0;
    font-weight: bold;
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.primary.text};
    background: ${theme.colors.primary.transparent};
    border-radius: ${theme.shape.radius.default};
  `,
  addButtons: css`
    display: flex;
    gap: ${theme.spacing(1)};
    margin-top: ${theme.spacing(1)};
  `,
});

export const ConditionGroupBuilder: React.FC<ConditionGroupBuilderProps> = ({
  group,
  onChange,
  availableFields,
  depth = 0,
}) => {
  const styles = useStyles2((theme) => getStyles(theme, depth));

  const fieldOptions = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  const addCondition = () => {
    const newCondition: HighlightCondition = {
      id: `condition-${Date.now()}`,
      sourceField: availableFields[0] || '',
      operator: 'equals',
      compareType: 'value',
      compareValue: '',
    };

    onChange({
      ...group,
      items: [...group.items, newCondition],
    });
  };

  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      type: 'group',
      logicalOperator: 'AND',
      items: [],
    };

    onChange({
      ...group,
      items: [...group.items, newGroup],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...group,
      items: group.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, updates: ConditionElement) => {
    const updated = [...group.items];
    updated[index] = updates;
    onChange({
      ...group,
      items: updated,
    });
  };

  const updateGroupOperator = (operator: LogicalOperator) => {
    onChange({
      ...group,
      logicalOperator: operator,
    });
  };

  return (
    <div className={styles.groupContainer}>
      {/* Group header with operator selector */}
      <div className={styles.groupHeader}>
        <span>Group operator:</span>
        <Combobox
          options={LOGICAL_OPERATOR_OPTIONS}
          value={group.logicalOperator}
          onChange={(v) => v && updateGroupOperator(v.value)}
          width={12}
        />
        <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
          (Combines all items below with {group.logicalOperator})
        </span>
      </div>

      {/* Render all items in the group */}
      {group.items.map((item, index) => (
        <div key={item.id}>
          {/* Show operator badge between items */}
          {index > 0 && (
            <div className={styles.operatorBadge}>
              {group.logicalOperator}
            </div>
          )}

          {isConditionGroup(item) ? (
            // Render nested group
            <div style={{ position: 'relative' }}>
              <ConditionGroupBuilder
                group={item}
                onChange={(updated) => updateItem(index, updated)}
                availableFields={availableFields}
                depth={depth + 1}
              />
              <div style={{ position: 'absolute', top: 4, right: 4 }}>
                <IconButton
                  name="trash-alt"
                  tooltip="Remove group"
                  onClick={() => removeItem(index)}
                />
              </div>
            </div>
          ) : (
            // Render single condition
            <div className={styles.conditionRow}>
              <InlineFieldRow>
                {/* Source field */}
                <InlineField label="Field" labelWidth={12}>
                  <Combobox
                    options={fieldOptions}
                    value={item.sourceField}
                    onChange={(v) =>
                      v && updateItem(index, { ...item, sourceField: v.value })
                    }
                    width={20}
                  />
                </InlineField>

                {/* Operator */}
                <InlineField label="Operator" labelWidth={12}>
                  <Combobox
                    options={OPERATOR_OPTIONS}
                    value={item.operator}
                    onChange={(v) =>
                      v && updateItem(index, { ...item, operator: v.value })
                    }
                    width={20}
                  />
                </InlineField>

                {/* Compare type and value */}
                {!['is_null', 'is_not_null'].includes(item.operator) && (
                  <>
                    <InlineField label="Compare to" labelWidth={12}>
                      <Combobox
                        options={[
                          { label: 'Value', value: 'value' },
                          { label: 'Field', value: 'field' },
                        ]}
                        value={item.compareType}
                        onChange={(v) =>
                          v && updateItem(index, {
                            ...item,
                            compareType: v.value as 'value' | 'field',
                          })
                        }
                        width={15}
                      />
                    </InlineField>

                    {item.compareType === 'value' ? (
                      <InlineField label="Value" labelWidth={12}>
                        <Input
                          value={String(item.compareValue ?? '')}
                          onChange={(e) =>
                            updateItem(index, {
                              ...item,
                              compareValue: e.currentTarget.value,
                            })
                          }
                          width={20}
                        />
                      </InlineField>
                    ) : (
                      <InlineField label="Field" labelWidth={12}>
                        <Combobox
                          options={fieldOptions}
                          value={item.compareField}
                          onChange={(v) =>
                            updateItem(index, {
                              ...item,
                              compareField: v.value!,
                            })
                          }
                          width={20}
                        />
                      </InlineField>
                    )}
                  </>
                )}

                {/* Remove button */}
                <IconButton
                  name="trash-alt"
                  tooltip="Remove condition"
                  onClick={() => removeItem(index)}
                />
              </InlineFieldRow>
            </div>
          )}
        </div>
      ))}

      {/* Add buttons */}
      <div className={styles.addButtons}>
        <Button icon="plus" onClick={addCondition} variant="secondary" size="sm">
          Add Condition
        </Button>
        <Button icon="folder-plus" onClick={addGroup} variant="secondary" size="sm">
          Add Group
        </Button>
      </div>
    </div>
  );
};
