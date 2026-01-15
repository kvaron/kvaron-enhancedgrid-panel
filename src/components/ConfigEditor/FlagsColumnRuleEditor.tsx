import React, { useState } from 'react';
import { StandardEditorProps, GrafanaTheme2, SelectableValue, IconName } from '@grafana/data';
import {
  Button,
  Input,
  Stack,
  Field,
  useStyles2,
  RadioButtonGroup,
  ColorPicker,
  Slider,
  IconButton,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { HighlightRule, FlagDefinition, IconValue, IconSource } from '../../types';
import { ConditionGroupBuilder } from './ConditionGroupBuilder';
import { EnhancedIconPicker } from '../IconPickers/EnhancedIconPicker';

const getStyles = (theme: GrafanaTheme2) => ({
  flagDefinition: css`
    background: ${theme.colors.background.secondary};
    padding: ${theme.spacing(2)};
    border-radius: ${theme.shape.radius.default};
    margin-bottom: ${theme.spacing(2)};
  `,
  flagHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  flagTitle: css`
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.primary};
  `,
  inlineRow: css`
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: ${theme.spacing(1)};
    align-items: center;
    margin-bottom: ${theme.spacing(1)};
  `,
  colorPickerWrapper: css`
    padding: ${theme.spacing(0.5)};
    border: 1px solid ${theme.colors.border.medium};
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.primary};
    display: inline-flex;
  `,
});

const positionOptions: Array<SelectableValue<'first' | 'last'>> = [
  { label: 'First (before data columns)', value: 'first' },
  { label: 'Last (after data columns)', value: 'last' },
];

interface FlagsColumnRuleEditorProps extends StandardEditorProps<HighlightRule> {}

export const FlagsColumnRuleEditor: React.FC<FlagsColumnRuleEditorProps> = ({
  value: rule,
  onChange,
  context,
  item,
}) => {
  const styles = useStyles2(getStyles);
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);

  const handleIconChange = (index: number, icon: IconValue | null, source: IconSource) => {
    updateFlagDefinition(index, {
      icon: icon as IconName,
      iconSource: source,
    });
    setIconPickerOpen(null);
  };

  // Auto-generate column name based on existing flags columns
  const generateColumnName = (): string => {
    // Get all existing flags column rules from panel options
    const allRules = context.options?.highlightRules || [];
    const flagsRules = allRules.filter((r: HighlightRule) => r.ruleType === 'flagsColumn' && r.id !== rule.id);
    
    // Find highest number
    let maxNum = 0;
    flagsRules.forEach((r: HighlightRule) => {
      const match = r.flagsColumnName?.match(/^flags(\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });
    
    return `flags${maxNum + 1}`;
  };

  // Initialize defaults if not set
  React.useEffect(() => {
    if (!rule.flagsColumnName) {
      const columnName = generateColumnName();
      onChange({
        ...rule,
        flagsColumnName: columnName,
        flagsColumnPosition: rule.flagsColumnPosition || 'last',
        flagsColumnWidth: rule.flagsColumnWidth || 80,
        flagDefinitions: rule.flagDefinitions || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleChange = (updates: Partial<HighlightRule>) => {
    onChange({ ...rule, ...updates });
  };

  const addFlagDefinition = () => {
    const newFlag: FlagDefinition = {
      id: crypto.randomUUID(),
      name: `Flag ${(rule.flagDefinitions?.length || 0) + 1}`,
      conditionGroup: {
        id: crypto.randomUUID(),
        type: 'group',
        logicalOperator: 'AND',
        items: [],
      },
      icon: 'circle' as IconName,
      iconType: 'default',
      iconColor: '#e02f44',
      tooltipText: '',
    };

    handleChange({
      flagDefinitions: [...(rule.flagDefinitions || []), newFlag],
    });
  };

  const removeFlagDefinition = (index: number) => {
    const updated = [...(rule.flagDefinitions || [])];
    updated.splice(index, 1);
    handleChange({ flagDefinitions: updated });
  };

  const updateFlagDefinition = (index: number, updates: Partial<FlagDefinition>) => {
    const updated = [...(rule.flagDefinitions || [])];
    updated[index] = { ...updated[index], ...updates };
    handleChange({ flagDefinitions: updated });
  };

  return (
    <Stack direction="column" gap={2}>
      {/* Column Configuration */}
      <Field label="Column Name">
        <Input
          value={rule.flagsColumnName || ''}
          onChange={(e) => handleChange({ flagsColumnName: e.currentTarget.value })}
          placeholder="e.g., flags1"
          width={30}
        />
      </Field>

      <Field label="Position">
        <RadioButtonGroup
          options={positionOptions}
          value={rule.flagsColumnPosition || 'last'}
          onChange={(value) => handleChange({ flagsColumnPosition: value })}
        />
      </Field>

      <Field label="Column Width (px)">
        <Slider
          inputId="flags-column-width"
          min={20}
          max={200}
          step={5}
          value={rule.flagsColumnWidth || 80}
          onChange={(value) => handleChange({ flagsColumnWidth: value })}
        />
      </Field>

      {/* Flag Definitions */}
      <Field label="Flag Definitions">
        <Stack direction="column" gap={1}>
          <Button icon="plus" variant="secondary" size="sm" onClick={addFlagDefinition}>
            Add Flag
          </Button>

          {(rule.flagDefinitions || []).map((flag, index) => (
            <div key={flag.id} className={styles.flagDefinition}>
              <div className={styles.flagHeader}>
                <div className={styles.flagTitle}>
                  Flag {index + 1}
                </div>
                <IconButton
                  name="trash-alt"
                  tooltip="Remove flag"
                  onClick={() => removeFlagDefinition(index)}
                  aria-label="Remove flag"
                />
              </div>

              {/* Inline row: Flag Name | Icon Picker | Color */}
              <div className={styles.inlineRow}>
                <Input
                  placeholder="Flag name"
                  value={flag.name}
                  onChange={(e) => updateFlagDefinition(index, { name: e.currentTarget.value })}
                />

                <div style={{ position: 'relative' }}>
                  <Button
                    icon={flag.iconSource === 'grafana' ? flag.icon as IconName : undefined}
                    onClick={() => setIconPickerOpen(iconPickerOpen === index ? null : index)}
                    tooltip="Select icon or emoji"
                    variant="secondary"
                    size="md"
                  >
                    {flag.iconSource === 'emoji' && flag.icon ? flag.icon : ''}
                  </Button>

                  <EnhancedIconPicker
                    value={flag.icon}
                    iconSource={flag.iconSource}
                    onChange={(icon, source) => handleIconChange(index, icon, source)}
                    onClose={() => setIconPickerOpen(null)}
                    isOpen={iconPickerOpen === index}
                  />
                </div>

                <div className={styles.colorPickerWrapper}>
                  <ColorPicker
                    color={flag.iconColor || '#000000'}
                    onChange={(color) => updateFlagDefinition(index, { iconColor: color })}
                  />
                </div>
              </div>

              <Stack direction="column" gap={1}>
                <Field label="Tooltip" description="Use {columnName} to insert column values">
                  <Input
                    placeholder="e.g. Status: {status}, Value: {amount}"
                    value={flag.tooltipText || ''}
                    onChange={(e) => updateFlagDefinition(index, { tooltipText: e.currentTarget.value })}
                  />
                </Field>

                <Field label="Conditions">
                  <ConditionGroupBuilder
                    group={flag.conditionGroup}
                    onChange={(newGroup) => updateFlagDefinition(index, { conditionGroup: newGroup })}
                    availableFields={availableFields}
                  />
                </Field>
              </Stack>
            </div>
          ))}
        </Stack>
      </Field>
    </Stack>
  );
};
