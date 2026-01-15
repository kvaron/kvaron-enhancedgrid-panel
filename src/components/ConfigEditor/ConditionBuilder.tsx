import React from 'react';
import {
  Button,
  Combobox,
  ComboboxOption,
  Input,
  InlineField,
  InlineFieldRow,
  IconButton
} from '@grafana/ui';
import {
  HighlightCondition,
  ComparisonOperator
} from '../../types';

interface ConditionBuilderProps {
  conditions: HighlightCondition[];
  onChange: (conditions: HighlightCondition[]) => void;
  availableFields: string[];
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

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditions,
  onChange,
  availableFields,
}) => {
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

    onChange([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<HighlightCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <div>
      {conditions.map((condition, index) => (
        <div key={condition.id}>
          <InlineFieldRow>
            {/* Source field */}
            <InlineField label="Field" labelWidth={12}>
              <Combobox
                options={fieldOptions}
                value={condition.sourceField}
                onChange={(v) => v && updateCondition(index, { sourceField: v.value })}
                width={20}
              />
            </InlineField>

            {/* Operator */}
            <InlineField label="Operator" labelWidth={12}>
              <Combobox
                options={OPERATOR_OPTIONS}
                value={condition.operator}
                onChange={(v) => v && updateCondition(index, { operator: v.value })}
                width={20}
              />
            </InlineField>

            {/* Compare type (value or field) */}
            {!['is_null', 'is_not_null'].includes(condition.operator) && (
              <>
                <InlineField label="Compare to" labelWidth={12}>
                  <Combobox
                    options={[
                      { label: 'Value', value: 'value' },
                      { label: 'Field', value: 'field' },
                    ]}
                    value={condition.compareType}
                    onChange={(v) => v && updateCondition(index, { compareType: v.value as 'value' | 'field' })}
                    width={15}
                  />
                </InlineField>

                {/* Compare value/field */}
                {condition.compareType === 'value' ? (
                  <InlineField label="Value" labelWidth={12}>
                    <Input
                      value={String(condition.compareValue ?? '')}
                      onChange={(e) => updateCondition(index, { compareValue: e.currentTarget.value })}
                      width={20}
                    />
                  </InlineField>
                ) : (
                  <InlineField label="Field" labelWidth={12}>
                    <Combobox
                      options={fieldOptions}
                      value={condition.compareField}
                      onChange={(v) => v && updateCondition(index, { compareField: v.value })}
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
              onClick={() => removeCondition(index)}
            />
          </InlineFieldRow>


        </div>
      ))}

      <Button icon="plus" onClick={addCondition} variant="secondary">
        Add Condition
      </Button>
    </div>
  );
};
