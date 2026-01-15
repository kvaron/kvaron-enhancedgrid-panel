import React from 'react';
import { StandardEditorProps, FieldType, GrafanaTheme2, SelectableValue } from '@grafana/data';
import {
  Input,
  InlineField,
  InlineFieldRow,
  Combobox,
  ComboboxOption,
  MultiCombobox,
  Stack,
  Field,
  useStyles2,
  RadioButtonGroup,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { HighlightRule } from '../../types';
import { ColorSchemeSelect } from './ColorSchemeSelect';

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    border: 1px solid ${theme.colors.border.medium};
    padding: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(1)};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
  `,
  gradientPreview: css`
    height: 8px;
    width: 100%;
    border-radius: ${theme.shape.radius.default};
    margin: 2px 0;
  `,
});

const rangeModeOptions: Array<ComboboxOption<'auto' | 'manual'>> = [
  { label: 'Auto-detect from data', value: 'auto' },
  { label: 'Manual entry', value: 'manual' },
];

const applyToOptions: Array<ComboboxOption<'background' | 'foreground'>> = [
  { label: 'Background', value: 'background' },
  { label: 'Foreground (Text)', value: 'foreground' },
];

export const DataRangeGradientRuleEditor: React.FC<StandardEditorProps<HighlightRule>> = ({
  value,
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
  const rule = value;

  // Get available numeric fields from data
  const numericFields =
    context.data[0]?.fields
      .filter((f) => f.type === FieldType.number)
      .map((f) => f.name) || [];

  // Get all available fields for target fields
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  const numericFieldOptions: Array<ComboboxOption<string>> = numericFields.map((field) => ({
    label: field,
    value: field,
  }));

  const targetFieldOptions: Array<ComboboxOption<string>> = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  const updateSourceField = (selected: ComboboxOption<string> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      dataRangeSourceField: selected.value,
    });
  };

  const updateRangeMode = (selected: ComboboxOption<'auto' | 'manual'> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      dataRangeMode: selected.value,
    });
  };

  const updateMin = (e: React.FormEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    if (!isNaN(value)) {
      onChange({
        ...rule,
        dataRangeMin: value,
      });
    }
  };

  const updateMax = (e: React.FormEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    if (!isNaN(value)) {
      onChange({
        ...rule,
        dataRangeMax: value,
      });
    }
  };

  const updateColorScheme = (selected: SelectableValue<string>) => {
    if (!selected?.value) { return; }
    onChange({
      ...rule,
      dataRangeColorScheme: selected.value,
    });
  };

  const updateApplyTo = (value: 'background' | 'foreground') => {
    onChange({
      ...rule,
      dataRangeApplyTo: value,
    });
  };

  const updateTargetFields = (selected: Array<ComboboxOption<string>>) => {
    onChange({
      ...rule,
      targetFields: selected.map((s) => s.value),
    });
  };

  return (
    <Stack direction="column">
      {/* Source Field Selector */}
      <Field label="Source Field" description="Select the numeric field to calculate gradient from">
        <Combobox
          options={numericFieldOptions}
          value={rule.dataRangeSourceField}
          onChange={updateSourceField}
          placeholder="Select numeric field"
          width={40}
        />
      </Field>

      {/* Range Mode */}
      <Field label="Range Mode" description="How to determine min/max values for gradient">
        <Combobox
          options={rangeModeOptions}
          value={rule.dataRangeMode || 'auto'}
          onChange={updateRangeMode}
          width={40}
        />
      </Field>

      {/* Manual Min/Max Inputs (shown only in manual mode) */}
      {rule.dataRangeMode === 'manual' && (
        <div className={styles.container}>
          <InlineFieldRow>
            <InlineField label="Minimum Value" labelWidth={20}>
              <Input
                type="number"
                value={rule.dataRangeMin ?? 0}
                onChange={updateMin}
                width={20}
                placeholder="Min value"
              />
            </InlineField>
          </InlineFieldRow>
          <InlineFieldRow>
            <InlineField label="Maximum Value" labelWidth={20}>
              <Input
                type="number"
                value={rule.dataRangeMax ?? 100}
                onChange={updateMax}
                width={20}
                placeholder="Max value"
              />
            </InlineField>
          </InlineFieldRow>
        </div>
      )}

      {/* Color Scheme Selector */}
      <Field label="Color Scheme" description="Select a Grafana color scheme for the gradient">
        <ColorSchemeSelect
          value={rule.dataRangeColorScheme}
          onChange={updateColorScheme}
          includeFixed={false}
          placeholder="Select color scheme"
          showReverseToggle={true}
          reverseGradient={rule.dataRangeReverseGradient}
          onReverseChange={(reverse) => onChange({ ...rule, dataRangeReverseGradient: reverse })}
        />
      </Field>

      {/* Apply To (Background or Foreground) */}
      <Field label="Apply Gradient To" description="Apply gradient colors to background or text">
        <RadioButtonGroup
          options={applyToOptions}
          value={rule.dataRangeApplyTo || 'background'}
          onChange={updateApplyTo}
        />
      </Field>

      {/* Target Fields Selector */}
      <Field label="Applies To" description="Select which columns should display the gradient">
        <MultiCombobox
          options={targetFieldOptions}
          value={rule.targetFields || []}
          onChange={updateTargetFields}
          enableAllOption={false}
          placeholder="Select target fields"
          width={40}
        />
      </Field>
    </Stack>
  );
};
