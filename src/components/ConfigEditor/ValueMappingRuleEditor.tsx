import React from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import {
  Button,
  Input,
  InlineField,
  InlineFieldRow,
  Combobox,
  ComboboxOption,
  MultiCombobox,
  Stack,
  Field,
  useStyles2,
  IconButton,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { HighlightRule, ValueMappingEntry } from '../../types';
import { CellStyleEditor } from './CellStyleEditor';

const getStyles = (theme: GrafanaTheme2) => ({
  valueMappingContainer: css`
    border: 1px solid ${theme.colors.border.medium};
    padding: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(1)};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
  `,
  valueMappingHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing(2)};
  `,
  addButton: css`
    margin-top: ${theme.spacing(2)};
  `,
  cellStyleWrapper: css`
    background-color: ${theme.colors.background.secondary};
    padding: ${theme.spacing(0.75)};
    border-radius: ${theme.shape.radius.default};
    border: 1px solid ${theme.colors.border.weak};
    margin-top: ${theme.spacing(1)};
  `,
});

export const ValueMappingRuleEditor: React.FC<StandardEditorProps<HighlightRule>> = ({ value, onChange, context }) => {
  const styles = useStyles2(getStyles);
  const rule = value;

  // Get all available fields from data (any type, not just numeric)
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  const fieldOptions: Array<ComboboxOption<string>> = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  const targetFieldOptions: Array<ComboboxOption<string>> = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  const updateValueMappingField = (selected: ComboboxOption<string> | null) => {
    if (!selected) {
      return;
    }
    onChange({
      ...rule,
      valueMappingField: selected.value,
    });
  };

  const updateTargetFields = (selected: Array<ComboboxOption<string>>) => {
    onChange({
      ...rule,
      targetFields: selected.map((s) => s.value),
    });
  };

  const addValueMapping = () => {
    const newMapping: ValueMappingEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mapping-${Date.now()}`,
      value: '',
      style: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
      },
    };

    onChange({
      ...rule,
      valueMappings: [...(rule.valueMappings || []), newMapping],
    });
  };

  const removeValueMapping = (index: number) => {
    onChange({
      ...rule,
      valueMappings: (rule.valueMappings || []).filter((_, i) => i !== index),
    });
  };

  const updateValueMapping = (index: number, updates: Partial<ValueMappingEntry>) => {
    const updated = [...(rule.valueMappings || [])];
    updated[index] = { ...updated[index], ...updates };
    onChange({
      ...rule,
      valueMappings: updated,
    });
  };

  const parseValueInput = (input: string): string | number | boolean => {
    // Try to parse as boolean
    if (input.toLowerCase() === 'true') {
      return true;
    }
    if (input.toLowerCase() === 'false') {
      return false;
    }

    // Try to parse as number
    const num = Number(input);
    if (!isNaN(num) && input.trim() !== '') {
      return num;
    }

    // Return as string
    return input;
  };

  const formatValueForDisplay = (val: string | number | boolean): string => {
    if (typeof val === 'boolean') {
      return val.toString();
    }
    if (typeof val === 'number') {
      return val.toString();
    }
    return val;
  };

  return (
    <Stack direction="column">
      {/* Value Mapping Field Selector */}
      <Field label="Value Mapping Field" description="Select the field to check for exact value matches">
        <Combobox
          options={fieldOptions}
          value={rule.valueMappingField}
          onChange={updateValueMappingField}
          placeholder="Select field"
          width={40}
        />
      </Field>

      {/* Target Fields Selector */}
      <Field label="Applies To" description="Select which columns should be highlighted">
        <MultiCombobox
          options={targetFieldOptions}
          value={rule.targetFields || []}
          onChange={updateTargetFields}
          enableAllOption={false}
          placeholder="Select target fields"
          width={40}
        />
      </Field>

      {/* Value Mappings */}
      <Field label="Value Mappings" description="Define exact values and their styles">
        <Stack direction="column">
          {(rule.valueMappings || []).map((mapping, index) => (
            <div key={mapping.id} className={styles.valueMappingContainer}>
              <div className={styles.valueMappingHeader}>
                <InlineFieldRow>
                  <InlineField label="Match Value" labelWidth={20}>
                    <Input
                      type="text"
                      value={formatValueForDisplay(mapping.value)}
                      onChange={(e) => {
                        const parsedValue = parseValueInput(e.currentTarget.value);
                        updateValueMapping(index, { value: parsedValue });
                      }}
                      placeholder="e.g., error, true, 123"
                      width={30}
                    />
                  </InlineField>
                </InlineFieldRow>
                <IconButton name="trash-alt" tooltip="Remove value mapping" onClick={() => removeValueMapping(index)} />
              </div>
              <div className={styles.cellStyleWrapper}>
                <CellStyleEditor
                  value={mapping.style}
                  onChange={(style) => updateValueMapping(index, { style })}
                  label={`Mapping ${index + 1}`}
                />
              </div>
            </div>
          ))}

          <Button icon="plus" variant="secondary" onClick={addValueMapping} className={styles.addButton}>
            Add Value Mapping
          </Button>
        </Stack>
      </Field>
    </Stack>
  );
};
