import React from 'react';
import { StandardEditorProps, GrafanaTheme2, FieldColorModeId, SelectableValue } from '@grafana/data';
import {
  Button,
  Input,
  Combobox,
  ComboboxOption,
  MultiCombobox,
  Stack,
  Field,
  useStyles2,
  RadioButtonGroup,
  Slider,
  ColorPicker,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { HighlightRule } from '../../types';
import { ColorSchemeSelect } from './ColorSchemeSelect';

const getStyles = (theme: GrafanaTheme2) => ({
  stackColorRow: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(1)};
  `,
  stackColorLabel: css`
    min-width: 100px;
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.primary};
  `,
  colorPickerWrapper: css`
    padding: ${theme.spacing(0.5)};
    border: 1px solid ${theme.colors.border.medium};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    display: inline-flex;
  `,
});

const modeOptions: Array<ComboboxOption<'line' | 'bar' | 'stack' | 'bullet'>> = [
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Stack', value: 'stack' },
  { label: 'Bullet', value: 'bullet' },
];

const scaleModeOptions: Array<ComboboxOption<'cell' | 'column' | 'global'>> = [
  { label: 'Data', value: 'cell' },
  { label: 'Field', value: 'column' },
  { label: 'Column', value: 'global' },
];

const stackScaleModeOptions: Array<ComboboxOption<'full' | 'column' | 'global'>> = [
  { label: '100%', value: 'full' },
  { label: 'Field', value: 'column' },
  { label: 'Column', value: 'global' },
];

export const SparkChartRuleEditor: React.FC<StandardEditorProps<HighlightRule>> = ({
  value,
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
  const rule = value;

  // Get available fields from data
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  const fieldOptions: Array<ComboboxOption<string>> = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  const targetFieldOptions: Array<ComboboxOption<string>> = availableFields.map((field) => ({
    label: field,
    value: field,
  }));

  // Update handlers
  const updateSourceField = (selected: ComboboxOption<string> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      sparkChartSourceField: selected.value,
      // Default targetFields to match source field if not already set
      targetFields: rule.targetFields || (selected.value ? [selected.value] : []),
    });
  };

  const updateMode = (selected: ComboboxOption<'line' | 'bar' | 'stack' | 'bullet'> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      sparkChartMode: selected.value,
    });
  };

  const updateDataSeparator = (e: React.FormEvent<HTMLInputElement>) => {
    onChange({
      ...rule,
      sparkChartDataSeparator: e.currentTarget.value,
    });
  };

  const updateColorScheme = (selected: SelectableValue<string>) => {
    if (!selected?.value) { return; }
    if (selected.value === 'fixed') {
      onChange({
        ...rule,
        sparkChartColorMode: 'solid',
        sparkChartColorScheme: undefined,
        sparkChartSolidColor: rule.sparkChartSolidColor || '#3274D9',
      });
    } else if (selected.value === FieldColorModeId.Shades) {
      // Shades mode uses a base color and generates shades from it
      onChange({
        ...rule,
        sparkChartColorMode: 'scheme',
        sparkChartColorScheme: FieldColorModeId.Shades,
        sparkChartSolidColor: rule.sparkChartSolidColor || '#3274D9',
      });
    } else if (selected.value === FieldColorModeId.PaletteClassic) {
      // Classic palette uses sequential colors
      onChange({
        ...rule,
        sparkChartColorMode: 'scheme',
        sparkChartColorScheme: FieldColorModeId.PaletteClassic,
      });
    } else if (selected.value === FieldColorModeId.Thresholds) {
      // Thresholds mode uses panel threshold configuration
      onChange({
        ...rule,
        sparkChartColorMode: 'scheme',
        sparkChartColorScheme: FieldColorModeId.Thresholds,
      });
    } else {
      // All other modes (gradients) use scheme mode
      onChange({
        ...rule,
        sparkChartColorMode: 'scheme',
        sparkChartColorScheme: selected.value,
      });
    }
  };

  const updateSolidColor = (color?: string) => {
    onChange({
      ...rule,
      sparkChartSolidColor: color || '#3274D9',
      // Keep existing mode settings (could be 'solid' for fixed or shades)
    });
  };

  const updateHeight = (value: number) => {
    onChange({
      ...rule,
      sparkChartHeight: value,
    });
  };

  const updateStackColor = (index: number, color: string) => {
    const stackColors = { ...(rule.sparkChartStackColors || {}) };
    stackColors[index] = color;
    onChange({
      ...rule,
      sparkChartStackColors: stackColors,
    });
  };

  const removeStackColor = (index: number) => {
    const stackColors = { ...(rule.sparkChartStackColors || {}) };
    delete stackColors[index];
    onChange({
      ...rule,
      sparkChartStackColors: stackColors,
    });
  };

  const addStackColor = () => {
    const stackColors = { ...(rule.sparkChartStackColors || {}) };
    const maxIndex = Math.max(-1, ...Object.keys(stackColors).map(k => parseInt(k, 10)));
    stackColors[maxIndex + 1] = '#3274D9';
    onChange({
      ...rule,
      sparkChartStackColors: stackColors,
    });
  };

  const updateTargetFields = (selected: Array<ComboboxOption<string>>) => {
    onChange({
      ...rule,
      targetFields: selected.map((s) => s.value),
    });
  };

  const updateStackScaleMode = (value: 'full' | 'column' | 'global') => {
    onChange({
      ...rule,
      sparkChartStackScaleMode: value,
      sparkChartScaleMode: value === 'full' ? 'cell' : value, // Sync for backward compatibility
    });
  };

  const updateStackScaleField = (selected: ComboboxOption<string> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      sparkChartStackScaleField: selected.value,
      sparkChartScaleField: selected.value, // Sync for backward compatibility
    });
  };

  const updateScaleMode = (selected: ComboboxOption<'cell' | 'column' | 'global'> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      sparkChartScaleMode: selected.value,
    });
  };

  const updateScaleField = (selected: ComboboxOption<string> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      sparkChartScaleField: selected.value,
    });
  };

  const updateStateTimeline = (value: boolean) => {
    onChange({
      ...rule,
      sparkChartStateTimeline: value,
    });
  };

  const updateBulletBgColorMode = (selected: SelectableValue<string>) => {
    if (!selected?.value) { return; }
    onChange({
      ...rule,
      sparkChartBulletBgColorMode: selected.value === 'fixed' ? 'solid' : 'scheme',
      sparkChartBulletBgColorScheme: selected.value === 'fixed' ? undefined : selected.value,
    });
  };

  const updateBulletBgColor = (color?: string) => {
    onChange({
      ...rule,
      sparkChartBulletBgColor: color || '#888888',
    });
  };

  const updateBulletFgColorMode = (selected: SelectableValue<string>) => {
    if (!selected?.value) { return; }
    onChange({
      ...rule,
      sparkChartBulletFgColorMode: selected.value === 'fixed' ? 'solid' : 'scheme',
      sparkChartBulletFgColorScheme: selected.value === 'fixed' ? undefined : selected.value,
    });
  };

  const updateBulletFgColor = (color?: string) => {
    onChange({
      ...rule,
      sparkChartBulletFgColor: color || '#3274D9',
    });
  };

  const updateBulletLineColorMode = (selected: SelectableValue<string>) => {
    if (!selected?.value) { return; }
    onChange({
      ...rule,
      sparkChartBulletLineColorMode: selected.value === 'fixed' ? 'solid' : 'scheme',
      sparkChartBulletLineColorScheme: selected.value === 'fixed' ? undefined : selected.value,
    });
  };

  const updateBulletLineColor = (color?: string) => {
    onChange({
      ...rule,
      sparkChartBulletLineColor: color || '#FF0000',
    });
  };

  return (
    <Stack direction="column" gap={2}>
      {/* Source Field Selector */}
      <Field label="Source Field" description="Select the field containing array or delimited string data">
        <Combobox
          options={fieldOptions}
          value={rule.sparkChartSourceField}
          onChange={updateSourceField}
          placeholder="Select field"
          width={40}
        />
      </Field>

      {/* Mode Selector */}
      <Field label="Chart Mode" description="Select visualization type">
        <RadioButtonGroup
          options={modeOptions}
          value={rule.sparkChartMode || 'line'}
          onChange={(value) => updateMode({ value })}
        />
      </Field>

      {/* State Timeline Toggle (Bar Mode Only) */}
      {rule.sparkChartMode === 'bar' && (
        <Field 
          label="State Timeline Mode" 
          description="Fix vertical scaling and remove spacing between bars"
        >
          <RadioButtonGroup
            options={[
              { label: 'Off', value: 'off' },
              { label: 'On', value: 'on' },
            ]}
            value={rule.sparkChartStateTimeline ? 'on' : 'off'}
            onChange={(value) => updateStateTimeline(value === 'on')}
          />
        </Field>
      )}

      {/* Data Separator */ }
      <Field label="Data Separator" description="Character used to split string values (e.g., comma, pipe)">
        <Input
          value={rule.sparkChartDataSeparator || ','}
          onChange={updateDataSeparator}
          placeholder=','
          width={10}
        />
      </Field>

      {/* Color Selection (Line, Bar, Stack only) */}
      {rule.sparkChartMode !== 'bullet' && (
      <Field label="Color" description="Select a gradient scheme or fixed color">
        <ColorSchemeSelect
          value={
            rule.sparkChartColorScheme === FieldColorModeId.Shades
              ? FieldColorModeId.Shades
              : rule.sparkChartColorMode === 'scheme' && rule.sparkChartColorScheme
              ? rule.sparkChartColorScheme
              : 'fixed'
          }
          onChange={updateColorScheme}
          color={rule.sparkChartSolidColor}
          onColorChange={updateSolidColor}
          defaultColor="#3274D9"
          showReverseToggle={true}
          reverseGradient={rule.sparkChartReverseGradient}
          onReverseChange={(reverse) => onChange({ ...rule, sparkChartReverseGradient: reverse })}
        />
      </Field>
      )}

      {/* Scale Mode for Line and Bar Charts */}
      {(rule.sparkChartMode === 'line' || (rule.sparkChartMode === 'bar' && !rule.sparkChartStateTimeline)) && (
        <>
          <Field label="Scale" description="How to scale the chart height and color gradient">
            <RadioButtonGroup
              options={scaleModeOptions}
              value={rule.sparkChartScaleMode || 'cell'}
              onChange={(value) => updateScaleMode({ value })}
            />
          </Field>

          {/* Scale Field (only for 'column' mode) */}
          {rule.sparkChartScaleMode === 'column' && (
            <Field label="Scale Field" description="Column containing min/max values">
              <Combobox
                options={availableFields.map((field) => ({ label: field, value: field }))}
                value={rule.sparkChartScaleField}
                onChange={updateScaleField}
                placeholder="Select scale field"
                width={40}
              />
            </Field>
          )}
        </>
      )}

      {/* Line Interpolation Mode - Only for Line Mode */}
      {rule.sparkChartMode === 'line' && (
        <Field label="Line Interpolation" description="How to connect data points">
          <RadioButtonGroup
            options={[
              { label: 'Linear', value: 'linear', description: 'Straight lines between points' },
              { label: 'Step', value: 'step', description: 'Horizontal then vertical lines' },
              { label: 'Curve', value: 'curve', description: 'Smooth Bézier curves' },
            ]}
            value={rule.sparkChartLineInterpolation || 'linear'}
            onChange={(value) =>
              onChange({
                ...rule,
                sparkChartLineInterpolation: value as 'linear' | 'step' | 'curve',
              })
            }
          />
        </Field>
      )}

      {/* Stack Mode Configuration */}
      {rule.sparkChartMode === 'stack' && (
        <Stack direction="column" gap={2}>
          {/* Stack Scale Mode */}
          <Field label="Scale Mode" description="How to scale the stack bar width">
            <RadioButtonGroup
              options={stackScaleModeOptions}
              value={rule.sparkChartScaleMode === 'cell' ? 'full' : rule.sparkChartScaleMode || 'full'}
              onChange={updateStackScaleMode}
            />
          </Field>

          {/* Scale Field (only for 'column' mode) */}
          {rule.sparkChartScaleMode === 'column' && (
            <Field label="Scale Field" description="Column containing the scale value (soft-max)">
              <Combobox
                options={availableFields.map((field) => ({ label: field, value: field }))}
                value={rule.sparkChartScaleField}
                onChange={updateStackScaleField}
                placeholder="Select scale field"
                width={40}
              />
            </Field>
          )}

          {/* Segment Colors */}
          <Field label="Segment Colors (Optional)" description="Set colors for specific segments by position">
            <div>
              {Object.entries(rule.sparkChartStackColors || {})
                .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                .map(([indexStr, color]) => {
                  const index = parseInt(indexStr, 10);
                  return (
                    <div key={index} className={styles.stackColorRow}>
                      <div className={styles.stackColorLabel}>Segment {index + 1}</div>
                      <div className={styles.colorPickerWrapper}>
                        <ColorPicker color={color} onChange={(c) => updateStackColor(index, c)} />
                      </div>
                      <Button
                        icon="trash-alt"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeStackColor(index)}
                        aria-label="Remove segment color"
                      />
                    </div>
                  );
                })}
              <Button icon="plus" variant="secondary" size="sm" onClick={addStackColor}>
                Add Segment Color
              </Button>
            </div>
          </Field>
        </Stack>
      )}

      {/* Bullet Chart Configuration */}
      {rule.sparkChartMode === 'bullet' && (
        <Stack direction="column" gap={2}>
          {/* Background Color */}
          <Field label="Background Color" description="Color scheme for background blocks">
            <ColorSchemeSelect
              value={
                rule.sparkChartBulletBgColorMode === 'solid'
                  ? 'fixed'
                  : rule.sparkChartBulletBgColorScheme || 'fixed'
              }
              onChange={updateBulletBgColorMode}
              color={rule.sparkChartBulletBgColor}
              onColorChange={updateBulletBgColor}
              defaultColor="#888888"
              showReverseToggle={true}
              reverseGradient={rule.sparkChartBulletBgReverse}
              onReverseChange={(reverse) => onChange({ ...rule, sparkChartBulletBgReverse: reverse })}
            />
          </Field>

          {/* Foreground Bar Color */}
          <Field label="Foreground Bar Color" description="Color scheme for foreground bar">
            <ColorSchemeSelect
              value={
                rule.sparkChartBulletFgColorMode === 'solid'
                  ? 'fixed'
                  : rule.sparkChartBulletFgColorScheme || 'fixed'
              }
              onChange={updateBulletFgColorMode}
              color={rule.sparkChartBulletFgColor}
              onColorChange={updateBulletFgColor}
              defaultColor="#3274D9"
              showReverseToggle={true}
              reverseGradient={rule.sparkChartBulletFgReverse}
              onReverseChange={(reverse) => onChange({ ...rule, sparkChartBulletFgReverse: reverse })}
            />
          </Field>

          {/* Target Line Color */}
          <Field label="Target Line Color" description="Color scheme for target line">
            <ColorSchemeSelect
              value={
                rule.sparkChartBulletLineColorMode === 'solid'
                  ? 'fixed'
                  : rule.sparkChartBulletLineColorScheme || 'fixed'
              }
              onChange={updateBulletLineColorMode}
              color={rule.sparkChartBulletLineColor}
              onColorChange={updateBulletLineColor}
              defaultColor="#FF0000"
              showReverseToggle={true}
              reverseGradient={rule.sparkChartBulletLineReverse}
              onReverseChange={(reverse) => onChange({ ...rule, sparkChartBulletLineReverse: reverse })}
            />
          </Field>
        </Stack>
      )}

      {/* Height Slider */}
      <Field label="Chart Height" description="Chart height as percentage of cell height">
        <Slider
          inputId="spark-chart-height-slider"
          min={10}
          max={100}
          step={5}
          value={rule.sparkChartHeight || 80}
          onChange={updateHeight}
        />
      </Field>

      {/* Target Fields Selector */}
      <Field label="Apply To" description="Select which columns should display the spark chart">
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
