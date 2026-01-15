import React, { useState } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { css, cx } from '@emotion/css';
import {
  Button,
  Input,
  InlineField,
  InlineFieldRow,
  Combobox,
  ComboboxOption,
  MultiCombobox,
  Field,
  Icon,
  IconButton,
  Stack,
  useStyles2,
} from '@grafana/ui';
import { HighlightRule } from '../../types';
import { ConditionGroupBuilder } from './ConditionGroupBuilder';
import { ThresholdRuleEditor } from './ThresholdRuleEditor';
import { ValueMappingRuleEditor } from './ValueMappingRuleEditor';
import { DataRangeGradientRuleEditor } from './DataRangeGradientRuleEditor';
import { SparkChartRuleEditor } from './SparkChartRuleEditor';
import { FlagsColumnRuleEditor } from './FlagsColumnRuleEditor';
import { CellStyleEditor } from './CellStyleEditor';

const ruleTypeOptions: Array<
  ComboboxOption<'conditional' | 'threshold' | 'valueMapping' | 'dataRangeGradient' | 'sparkChart' | 'flagsColumn'>
> = [
  { label: 'Conditional Logic', value: 'conditional' },
  { label: 'Threshold', value: 'threshold' },
  { label: 'Value Mapping', value: 'valueMapping' },
  { label: 'Data Range Gradient', value: 'dataRangeGradient' },
  { label: 'Spark Chart', value: 'sparkChart' },
  { label: 'Flags Column', value: 'flagsColumn' },
];

const getStyles = (theme: GrafanaTheme2) => ({
  header: css({
    label: 'Header',
    padding: theme.spacing(0.5, 0.5),
    borderRadius: theme.shape.radius.default,
    background: theme.colors.background.secondary,
    minHeight: theme.spacing(4),
    display: 'grid',
    gridTemplateColumns: '1fr min-content',
    alignItems: 'center',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
    '&:focus': {
      outline: 'none',
    },
  }),
  column: css({
    label: 'Column',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  }),
  dragIcon: css({
    cursor: 'grab',
    color: theme.colors.text.disabled,
    margin: theme.spacing(0, 0.5),
    '&:hover': {
      color: theme.colors.text.primary,
    },
  }),
  collapseIcon: css({
    marginLeft: theme.spacing(0.5),
    color: theme.colors.text.disabled,
  }),
  titleWrapper: css({
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    overflow: 'hidden',
    marginRight: theme.spacing(0.5),
  }),
  title: css({
    fontWeight: theme.typography.fontWeightBold,
    color: theme.colors.text.link,
    marginLeft: theme.spacing(0.5),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  disabled: css({
    color: theme.colors.text.disabled,
  }),
  ruleContent: css({
    padding: theme.spacing(2),
  }),
  cellStyleWrapper: css({
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing(0.75),
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
});

export const HighlightRuleEditor: React.FC<StandardEditorProps<HighlightRule[]>> = ({ value, onChange, context }) => {
  const rules = value || [];
  const styles = useStyles2(getStyles);

  // State for expanded rules (collapsed by default)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // State for rule name editing
  const [editingRuleName, setEditingRuleName] = useState<string | null>(null);

  // Get available fields from data
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  // Toggle rule expansion
  const toggleRuleExpansion = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    const reordered = Array.from(rules);
    const [movedRule] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, movedRule);

    // Recalculate priorities based on new order
    const withPriorities = reordered.map((rule, index) => ({
      ...rule,
      priority: index + 1,
    }));

    onChange(withPriorities);
  };

  // No-op handler for drag mouse position (required by drag handle)
  const reportDragMousePosition = () => {};

  const addRule = () => {
    const ruleId = crypto.randomUUID();
    const groupId = crypto.randomUUID();
    const newRuleId = `rule-${ruleId}`;
    const newRule: HighlightRule = {
      id: newRuleId,
      name: `Rule ${rules.length + 1}`,
      enabled: true,
      priority: rules.length + 1,
      targetFields: [],
      conditionGroup: {
        id: `group-${groupId}`,
        type: 'group',
        logicalOperator: 'AND',
        items: [],
      },
      style: {
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
      },
    };

    // Add new rule to expanded set
    setExpandedRules((prev) => new Set([...prev, newRuleId]));
    onChange([...rules, newRule]);
  };

  const removeRule = (index: number) => {
    const removedRule = rules[index];
    setExpandedRules((prev) => {
      const next = new Set(prev);
      next.delete(removedRule.id);
      return next;
    });
    onChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<HighlightRule>) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Stack direction="column" gap={0}>
        <Droppable droppableId="highlight-rules">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={{ width: '100%' }}>
              {rules.map((rule, index) => {
                const currentRuleType = rule.ruleType || 'conditional';
                const isExpanded = expandedRules.has(rule.id);
                const isEditing = editingRuleName === rule.id;

                return (
                  <Draggable key={rule.id} draggableId={rule.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          marginBottom: 8,
                          width: '100%',
                          ...provided.draggableProps.style,
                        }}
                      >
                        {/* Rule header matching QueryOperationRowHeader */}
                        <div className={styles.header}>
                          <div className={styles.column}>
                            <IconButton
                              name={isExpanded ? 'angle-down' : 'angle-right'}
                              tooltip={isExpanded ? 'Collapse rule' : 'Expand rule'}
                              className={styles.collapseIcon}
                              onClick={() => toggleRuleExpansion(rule.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`rule-content-${rule.id}`}
                            />
                            <div className={styles.titleWrapper}>
                              {isEditing ? (
                                <Input
                                  value={rule.name}
                                  onChange={(e) => updateRule(index, { name: e.currentTarget.value })}
                                  onBlur={() => setEditingRuleName(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      setEditingRuleName(null);
                                    }
                                  }}
                                  autoFocus
                                  width={30}
                                />
                              ) : (
                                <Button
                                  fill="text"
                                  onClick={() => setEditingRuleName(rule.id)}
                                  tooltip="Edit rule name"
                                  aria-label={`Edit rule name: ${rule.name}`}
                                  style={{
                                    padding: 0,
                                    minHeight: 0,
                                  }}
                                >
                                  <span className={cx(styles.title, !rule.enabled && styles.disabled)}>
                                    {rule.name}
                                  </span>
                                  <Icon name="pen" size="sm" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <Stack gap={1} alignItems="center">
                            <IconButton
                              name={rule.enabled ? 'eye' : 'eye-slash'}
                              tooltip={rule.enabled ? 'Disable rule' : 'Enable rule'}
                              onClick={() => updateRule(index, { enabled: !rule.enabled })}
                              aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                            />
                            <IconButton
                              name="trash-alt"
                              tooltip="Remove rule"
                              onClick={() => removeRule(index)}
                              aria-label="Remove rule"
                            />
                            <div onMouseMove={reportDragMousePosition} {...provided.dragHandleProps}>
                              <Icon
                                title="Drag and drop to reorder"
                                name="draggabledots"
                                size="lg"
                                className={styles.dragIcon}
                              />
                            </div>
                          </Stack>
                        </div>

                        {/* Rule content - only visible when expanded */}
                        {isExpanded && (
                          <div id={`rule-content-${rule.id}`} className={styles.ruleContent}>
                            {/* Rule Type Selector */}
                            <Field label="Rule Type" description="Select the type of rule to apply">
                              <Combobox
                                options={ruleTypeOptions}
                                value={currentRuleType}
                                onChange={(v) => {
                                  if (!v) {
                                    return;
                                  }
                                  const newRuleType = v.value;
                                  const updates: Partial<HighlightRule> = { ruleType: newRuleType };

                                  // Clear type-specific properties when changing type
                                  if (newRuleType === 'conditional') {
                                    updates.thresholdField = undefined;
                                    updates.thresholdLevels = undefined;
                                    updates.baseStyle = undefined;
                                    updates.valueMappingField = undefined;
                                    updates.valueMappings = undefined;
                                    updates.dataRangeSourceField = undefined;
                                    updates.dataRangeMode = undefined;
                                    updates.dataRangeMin = undefined;
                                    updates.dataRangeMax = undefined;
                                    updates.dataRangeColorScheme = undefined;
                                    updates.dataRangeApplyTo = undefined;
                                  } else if (newRuleType === 'threshold') {
                                    updates.conditionGroup = undefined;
                                    updates.valueMappingField = undefined;
                                    updates.valueMappings = undefined;
                                    updates.dataRangeSourceField = undefined;
                                    updates.dataRangeMode = undefined;
                                    updates.dataRangeMin = undefined;
                                    updates.dataRangeMax = undefined;
                                    updates.dataRangeColorScheme = undefined;
                                    updates.dataRangeApplyTo = undefined;
                                  } else if (newRuleType === 'valueMapping') {
                                    updates.conditionGroup = undefined;
                                    updates.thresholdField = undefined;
                                    updates.thresholdLevels = undefined;
                                    updates.baseStyle = undefined;
                                    updates.dataRangeSourceField = undefined;
                                    updates.dataRangeMode = undefined;
                                    updates.dataRangeMin = undefined;
                                    updates.dataRangeMax = undefined;
                                    updates.dataRangeColorScheme = undefined;
                                    updates.dataRangeApplyTo = undefined;
                                  } else if (newRuleType === 'dataRangeGradient') {
                                    updates.conditionGroup = undefined;
                                    updates.thresholdField = undefined;
                                    updates.thresholdLevels = undefined;
                                    updates.baseStyle = undefined;
                                    updates.valueMappingField = undefined;
                                    updates.valueMappings = undefined;
                                    updates.sparkChartSourceField = undefined;
                                    updates.sparkChartMode = undefined;
                                    updates.sparkChartDataSeparator = undefined;
                                    updates.sparkChartColorMode = undefined;
                                    updates.sparkChartSolidColor = undefined;
                                    updates.sparkChartColorScheme = undefined;
                                    updates.sparkChartHeight = undefined;
                                    updates.sparkChartStackColors = undefined;
                                  } else if (newRuleType === 'sparkChart') {
                                    updates.conditionGroup = undefined;
                                    updates.thresholdField = undefined;
                                    updates.thresholdLevels = undefined;
                                    updates.baseStyle = undefined;
                                    updates.valueMappingField = undefined;
                                    updates.valueMappings = undefined;
                                    updates.dataRangeSourceField = undefined;
                                    updates.dataRangeMode = undefined;
                                    updates.dataRangeMin = undefined;
                                    updates.dataRangeMax = undefined;
                                    updates.dataRangeColorScheme = undefined;
                                    updates.dataRangeApplyTo = undefined;
                                  } else if (newRuleType === 'flagsColumn') {
                                    updates.conditionGroup = undefined;
                                    updates.thresholdField = undefined;
                                    updates.thresholdLevels = undefined;
                                    updates.baseStyle = undefined;
                                    updates.valueMappingField = undefined;
                                    updates.valueMappings = undefined;
                                    updates.dataRangeSourceField = undefined;
                                    updates.dataRangeMode = undefined;
                                    updates.dataRangeMin = undefined;
                                    updates.dataRangeMax = undefined;
                                    updates.dataRangeColorScheme = undefined;
                                    updates.dataRangeApplyTo = undefined;
                                    updates.sparkChartSourceField = undefined;
                                    updates.sparkChartMode = undefined;
                                    updates.sparkChartDataSeparator = undefined;
                                    updates.sparkChartColorMode = undefined;
                                    updates.sparkChartSolidColor = undefined;
                                    updates.sparkChartColorScheme = undefined;
                                    updates.sparkChartHeight = undefined;
                                    updates.sparkChartStackColors = undefined;
                                  }

                                  updateRule(index, updates);
                                }}
                                width={30}
                              />
                            </Field>

                            {/* Target fields (only for conditional rules) */}
                            {currentRuleType === 'conditional' && (
                              <InlineFieldRow>
                                <InlineField label="Apply to" labelWidth={12}>
                                  <MultiCombobox
                                    options={availableFields.map((f) => ({ label: f, value: f }))}
                                    value={Array.isArray(rule.targetFields) ? rule.targetFields : []}
                                    onChange={(selected) => {
                                      updateRule(index, { targetFields: selected.map((s) => s.value) });
                                    }}
                                    enableAllOption={false}
                                    width={30}
                                  />
                                </InlineField>
                              </InlineFieldRow>
                            )}

                            {/* Conditional rendering based on rule type */}
                            {currentRuleType === 'conditional' && (
                              <>
                                {/* Conditions */}
                                <Field label="Conditions" style={{ marginTop: 16, marginBottom: 16 }}>
                                  <div>
                                    {rule.conditionGroup ? (
                                      <ConditionGroupBuilder
                                        group={rule.conditionGroup}
                                        onChange={(conditionGroup) => updateRule(index, { conditionGroup })}
                                        availableFields={availableFields}
                                      />
                                    ) : (
                                      <div>No conditions defined</div>
                                    )}
                                  </div>
                                </Field>

                                {/* Style */}
                                <Field label="Style" style={{ marginTop: 16 }}>
                                  <div className={styles.cellStyleWrapper}>
                                    <CellStyleEditor
                                      value={rule.style}
                                      onChange={(style) => updateRule(index, { style })}
                                    />
                                  </div>
                                </Field>
                              </>
                            )}

                            {currentRuleType === 'threshold' && (
                              <ThresholdRuleEditor
                                value={rule}
                                onChange={(updatedRule) => {
                                  if (updatedRule) {
                                    const updated = [...rules];
                                    updated[index] = updatedRule;
                                    onChange(updated);
                                  }
                                }}
                                context={context}
                                item={{} as any}
                              />
                            )}

                            {currentRuleType === 'valueMapping' && (
                              <ValueMappingRuleEditor
                                value={rule}
                                onChange={(updatedRule) => {
                                  if (updatedRule) {
                                    const updated = [...rules];
                                    updated[index] = updatedRule;
                                    onChange(updated);
                                  }
                                }}
                                context={context}
                                item={{} as any}
                              />
                            )}

                            {currentRuleType === 'dataRangeGradient' && (
                              <DataRangeGradientRuleEditor
                                value={rule}
                                onChange={(updatedRule) => {
                                  if (updatedRule) {
                                    const updated = [...rules];
                                    updated[index] = updatedRule;
                                    onChange(updated);
                                  }
                                }}
                                context={context}
                                item={{} as any}
                              />
                            )}

                            {currentRuleType === 'sparkChart' && (
                              <SparkChartRuleEditor
                                value={rule}
                                onChange={(updatedRule) => {
                                  if (updatedRule) {
                                    const updated = [...rules];
                                    updated[index] = updatedRule;
                                    onChange(updated);
                                  }
                                }}
                                context={context}
                                item={{} as any}
                              />
                            )}

                            {currentRuleType === 'flagsColumn' && (
                              <FlagsColumnRuleEditor
                                value={rule}
                                onChange={(updatedRule) => {
                                  if (updatedRule) {
                                    const updated = [...rules];
                                    updated[index] = updatedRule;
                                    onChange(updated);
                                  }
                                }}
                                context={context}
                                item={{} as any}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Button icon="plus" onClick={addRule} variant="primary">
          Add Highlight Rule
        </Button>
      </Stack>
    </DragDropContext>
  );
};
