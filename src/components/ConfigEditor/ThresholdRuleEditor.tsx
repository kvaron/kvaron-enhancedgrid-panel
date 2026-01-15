import React, { useState, useRef, useEffect } from 'react';
import { StandardEditorProps, FieldType, GrafanaTheme2 } from '@grafana/data';
import {
  Button,
  Input,
  Combobox,
  ComboboxOption,
  MultiCombobox,
  Stack,
  Field,
  useStyles2,
  IconButton,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { HighlightRule, ThresholdLevel } from '../../types';
import { CellStyleEditor } from './CellStyleEditor';

const getStyles = (theme: GrafanaTheme2) => ({
  thresholdLevelContainer: css`
    border: 1px solid ${theme.colors.border.medium};
    padding: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(1)};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
  `,
  thresholdLevelHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing(2)};
  `,
  addButton: css`
    margin-top: ${theme.spacing(2)};
  `,
  valueColumn: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(0.5)};
  `,
  columnLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing(0.5)};
  `,
});

export const ThresholdRuleEditor: React.FC<StandardEditorProps<HighlightRule>> = ({
  value,
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
  const rule = value;
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
    };
  }, []);

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

  const updateThresholdField = (selected: ComboboxOption<string> | null) => {
    if (!selected) { return; }
    onChange({
      ...rule,
      thresholdField: selected.value,
    });
  };

  const updateTargetFields = (selected: Array<ComboboxOption<string>>) => {
    onChange({
      ...rule,
      targetFields: selected.map((s) => s.value),
    });
  };

  const updateBaseStyle = (baseStyle: any) => {
    onChange({
      ...rule,
      baseStyle,
    });
  };

  const addThresholdLevel = () => {
    const newLevel: ThresholdLevel = {
      id: crypto.randomUUID ? crypto.randomUUID() : `threshold-${Date.now()}`,
      minValue: 0,
      style: {
        backgroundColor: 'transparent',
      },
    };

    onChange({
      ...rule,
      thresholdLevels: [...(rule.thresholdLevels || []), newLevel],
    });
  };

  const removeThresholdLevel = (index: number) => {
    onChange({
      ...rule,
      thresholdLevels: (rule.thresholdLevels || []).filter((_, i) => i !== index),
    });
  };

  const updateThresholdLevel = (index: number, updates: Partial<ThresholdLevel>) => {
    const updated = [...(rule.thresholdLevels || [])];
    updated[index] = { ...updated[index], ...updates };
    onChange({
      ...rule,
      thresholdLevels: updated,
    });
  };

  // Sort threshold levels by minValue for display, but delay sorting when editing
  const sortedLevels = editingThreshold 
    ? (rule.thresholdLevels || []) 
    : [...(rule.thresholdLevels || [])].sort((a, b) => a.minValue - b.minValue);

  return (
    <Stack direction="column">
      {/* Threshold Field Selector */}
      <Field label="Threshold Field" description="Select the numeric field to apply threshold comparison">
        <Combobox
          options={numericFieldOptions}
          value={rule.thresholdField}
          onChange={updateThresholdField}
          placeholder="Select numeric field"
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

      {/* Base Style */}
      <Field label="Base Style" description="Style applied when value is below all thresholds">
        <CellStyleEditor
          value={rule.baseStyle || { backgroundColor: 'transparent' }}
          onChange={updateBaseStyle}
        />
      </Field>

      {/* Threshold Levels */}
      <Field label="Threshold Levels" description="Define threshold levels and their styles">
        <Stack direction="column">
          {sortedLevels.map((level, index) => {
            // Find the original index for update operations
            const originalIndex = (rule.thresholdLevels || []).findIndex((l) => l.id === level.id);
            
            return (
              <div key={level.id} className={styles.thresholdLevelContainer}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div className={styles.valueColumn}>
                    <div className={styles.columnLabel} title="Threshold Value">
                      Value
                    </div>
                    <Input
                      type="number"
                      value={level.minValue}
                      onFocus={() => setEditingThreshold(level.id)}
                      onBlur={() => {
                        // Delay sorting after user stops editing
                        if (sortTimeoutRef.current) {
                          clearTimeout(sortTimeoutRef.current);
                        }
                        sortTimeoutRef.current = setTimeout(() => {
                          setEditingThreshold(null);
                        }, 500);
                      }}
                      onChange={(e) => {
                        const minValue = parseFloat(e.currentTarget.value);
                        if (!isNaN(minValue)) {
                          updateThresholdLevel(originalIndex, { minValue });
                        }
                      }}
                      width={10}
                      placeholder=">="
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <CellStyleEditor
                      value={level.style}
                      onChange={(style) => updateThresholdLevel(originalIndex, { style })}
                    />
                  </div>
                  <div style={{ marginTop: '24px' }}>
                    <IconButton
                      name="trash-alt"
                      tooltip="Remove threshold level"
                      onClick={() => removeThresholdLevel(originalIndex)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            icon="plus"
            variant="secondary"
            onClick={addThresholdLevel}
            className={styles.addButton}
          >
            Add Threshold Level
          </Button>
        </Stack>
      </Field>
    </Stack>
  );
};
