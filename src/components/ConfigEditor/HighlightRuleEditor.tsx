import React, { useMemo, useState } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import {
  DragDropContext,
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
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
import { EnhancedGridOptions, HighlightRule } from '../../types';
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

// Keep grouped sections and standalone rules in one drag-and-drop list.
type TopLevelFormattingItem =
  | {
      type: 'group';
      id: string;
      name: string;
      rules: HighlightRule[];
    }
  | {
      type: 'rule';
      id: string;
      rule: HighlightRule;
    };

const EMPTY_RULES: HighlightRule[] = [];
const EMPTY_GROUPS: EnhancedGridOptions['highlightRuleGroups'] = [];

const getStyles = (theme: GrafanaTheme2) => ({
  sectionHeader: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 0.75),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    borderRadius: theme.shape.radius.default,
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.medium}`,
    borderLeft: `3px solid ${theme.colors.primary.main}`,
  }),
  sectionHeaderDisabled: css({
    borderLeftColor: theme.colors.border.medium,
  }),
  sectionTitle: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    minWidth: 0,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  sectionTitleRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: '100%',
  }),
  sectionTitleText: css({
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    flex: 1,
  }),
  sectionTitleButton: css({
    minWidth: 0,
    padding: 0,
    justifyContent: 'flex-start',
  }),
  sectionName: css({
    color: theme.colors.text.link,
    fontWeight: theme.typography.fontWeightBold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  sectionActions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
  }),
  sectionDragHandle: css({
    cursor: 'grab',
    color: theme.colors.text.disabled,
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      color: theme.colors.text.primary,
    },
  }),
  emptyGroup: css({
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: theme.colors.text.secondary,
    border: `1px dashed ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
  }),
  groupedRules: css({
    marginLeft: theme.spacing(2.25),
    paddingLeft: theme.spacing(1.25),
    borderLeft: `2px solid ${theme.colors.primary.main}`,
  }),
  groupedRulesDisabled: css({
    borderLeftColor: theme.colors.border.medium,
  }),
  groupAddRuleRow: css({
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: theme.spacing(0.5),
  }),
  groupedRulesList: css({
    width: '100%',
  }),
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
  compactMetaRow: css({
    marginBottom: theme.spacing(1),
    opacity: 0.9,
  }),
  cellStyleWrapper: css({
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing(0.75),
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
});

export const HighlightRuleEditor: React.FC<StandardEditorProps<HighlightRule[]>> = ({ value, onChange, context }) => {
  const rules = value ?? EMPTY_RULES;
  const options = context.options as EnhancedGridOptions | undefined;
  const groups = options?.highlightRuleGroups ?? EMPTY_GROUPS;
  const styles = useStyles2(getStyles);

  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingRuleName, setEditingRuleName] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  // Prefer shared group metadata, but keep older rule-level names working.
  const groupNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const group of groups) {
      names.set(group.id, group.name);
    }
    for (const rule of rules) {
      if (rule.groupId && rule.groupName) {
        names.set(rule.groupId, rule.groupName);
      }
    }
    return names;
  }, [groups, rules]);

  const groupOptions = useMemo<Array<ComboboxOption<string>>>(
    () => [
      { label: 'Ungrouped', value: '' },
      ...Array.from(groupNames.entries()).map(([id, name]) => ({ label: name, value: id })),
    ],
    [groupNames]
  );

  // Render grouped rules as one top-level item so group reorder stays intact.
  const topLevelItems = useMemo<TopLevelFormattingItem[]>(() => {
    const byGroup = new Map<string, HighlightRule[]>();
    for (const rule of rules) {
      if (!rule.groupId) {
        continue;
      }
      if (!byGroup.has(rule.groupId)) {
        byGroup.set(rule.groupId, []);
      }
      byGroup.get(rule.groupId)!.push(rule);
    }

    const seenGroups = new Set<string>();
    const items: TopLevelFormattingItem[] = [];
    for (const rule of rules) {
      if (!rule.groupId) {
        items.push({ type: 'rule', id: rule.id, rule });
        continue;
      }

      if (!seenGroups.has(rule.groupId)) {
        seenGroups.add(rule.groupId);
        items.push({
          type: 'group',
          id: rule.groupId,
          name: groupNames.get(rule.groupId) || rule.groupName || 'Formatting group',
          rules: byGroup.get(rule.groupId) || [],
        });
      }
    }

    return items;
  }, [groupNames, rules]);

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

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Persist editor order back into the flat priority list used at runtime.
  const emitRules = (nextRules: HighlightRule[]) => {
    onChange(nextRules.map((rule, index) => ({ ...rule, priority: index + 1 })));
  };

  const flattenTopLevelItems = (items: TopLevelFormattingItem[]) =>
    items.flatMap((item) => (item.type === 'group' ? item.rules : [item.rule]));

  const createGroupRuleLists = () =>
    new Map(
      topLevelItems
        .filter((item): item is Extract<TopLevelFormattingItem, { type: 'group' }> => item.type === 'group')
        .map((item) => [item.id, [...item.rules]])
    );

  const flattenGroupRuleLists = (groupRuleLists: Map<string, HighlightRule[]>) =>
    topLevelItems.flatMap((item) => {
      if (item.type === 'group') {
        return groupRuleLists.get(item.id) || [];
      }
      return [item.rule];
    });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    // Top-level drags move either a standalone rule or a whole formatting group.
    if (result.type === 'TOP_LEVEL') {
      const reorderedItems = [...topLevelItems];
      const [movedItem] = reorderedItems.splice(result.source.index, 1);
      if (!movedItem) {
        return;
      }
      reorderedItems.splice(result.destination.index, 0, movedItem);
      emitRules(flattenTopLevelItems(reorderedItems));
      return;
    }

    // Rule drags only reorder entries inside the grouped section structure.
    const groupRuleLists = createGroupRuleLists();
    const sourceList = groupRuleLists.get(result.source.droppableId);
    const destinationList = groupRuleLists.get(result.destination.droppableId);
    if (!sourceList || !destinationList) {
      return;
    }

    const [movedRule] = sourceList.splice(result.source.index, 1);
    if (!movedRule) {
      return;
    }

    const destinationGroupId = result.destination.droppableId;
    const destinationGroupName = destinationGroupId ? groupNames.get(destinationGroupId) : undefined;
    destinationList.splice(result.destination.index, 0, {
      ...movedRule,
      groupId: destinationGroupId,
      groupName: destinationGroupName,
    });

    emitRules(flattenGroupRuleLists(groupRuleLists));
  };

  const reportDragMousePosition = () => {};

  const addRule = (groupId?: string, groupName?: string) => {
    const ruleId = crypto.randomUUID();
    const conditionGroupId = crypto.randomUUID();
    const newRuleId = `rule-${ruleId}`;
    const newRule: HighlightRule = {
      id: newRuleId,
      name: `Rule ${rules.length + 1}`,
      enabled: true,
      priority: rules.length + 1,
      ruleType: 'conditional',
      groupId,
      groupName,
      targetFields: [],
      conditionGroup: {
        id: `group-${conditionGroupId}`,
        type: 'group',
        logicalOperator: 'AND',
        items: [],
      },
      // New rules start neutral so they only affect cells after styling.
      style: {},
    };

    if (!groupId) {
      setExpandedRules((prev) => new Set([...prev, newRuleId]));
      emitRules([...rules, newRule]);
      return;
    }

    const groupRuleLists = createGroupRuleLists();
    const targetList = groupRuleLists.get(groupId);
    if (!targetList) {
      setExpandedRules((prev) => new Set([...prev, newRuleId]));
      emitRules([...rules, newRule]);
      return;
    }
    targetList.push(newRule);
    groupRuleLists.set(groupId, targetList);

    setExpandedRules((prev) => new Set([...prev, newRuleId]));
    emitRules(flattenGroupRuleLists(groupRuleLists));
  };

  const addGroup = () => {
    const groupId = `rule-group-${crypto.randomUUID()}`;
    const groupName = `Group ${topLevelItems.filter((item) => item.type === 'group').length + 1}`;
    setEditingGroupId(groupId);
    addRule(groupId, groupName);
  };

  const removeRule = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      next.delete(ruleId);
      return next;
    });
    emitRules(rules.filter((rule) => rule.id !== ruleId));
  };

  const setGroupEnabled = (groupId: string, enabled: boolean) => {
    onChange(rules.map((rule) => (rule.groupId === groupId ? { ...rule, enabled } : rule)));
  };

  const updateRule = (ruleId: string, updates: Partial<HighlightRule>) => {
    if ('groupId' in updates) {
      const currentRule = rules.find((rule) => rule.id === ruleId);
      if (!currentRule) {
        return;
      }

      const destinationGroupName = updates.groupId ? groupNames.get(updates.groupId) : undefined;
      const updatedRule = { ...currentRule, ...updates, groupName: destinationGroupName };
      const originalIndex = rules.findIndex((rule) => rule.id === ruleId);
      const nextRules = rules.filter((rule) => rule.id !== ruleId);
      let destinationIndex = originalIndex;

      if (updatedRule.groupId) {
        destinationIndex = -1;
        for (let index = nextRules.length - 1; index >= 0; index--) {
          if (nextRules[index].groupId === updatedRule.groupId) {
            destinationIndex = index + 1;
            break;
          }
        }
      }

      if (destinationIndex < 0 || destinationIndex > nextRules.length) {
        nextRules.push(updatedRule);
      } else {
        nextRules.splice(destinationIndex, 0, updatedRule);
      }

      emitRules(nextRules);
      return;
    }

    onChange(rules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule)));
  };

  const renameGroup = (groupId: string, groupName: string) => {
    onChange(rules.map((rule) => (rule.groupId === groupId ? { ...rule, groupName } : rule)));
  };

  const removeGroup = (groupId: string) => {
    onChange(
      rules.map((rule) => (rule.groupId === groupId ? { ...rule, groupId: undefined, groupName: undefined } : rule))
    );
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const replaceRule = (updatedRule: HighlightRule) => {
    onChange(rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)));
  };

  const createEmptyConditionGroup = () => ({
    id: `group-${crypto.randomUUID()}`,
    type: 'group' as const,
    logicalOperator: 'AND' as const,
    items: [],
  });

  // Drop stale per-type settings when a rule changes editors.
  const buildRuleTypeUpdates = (
    rule: HighlightRule,
    newRuleType: NonNullable<HighlightRule['ruleType']>
  ): Partial<HighlightRule> => {
    const updates: Partial<HighlightRule> = { ruleType: newRuleType };

    if (newRuleType === 'conditional') {
      updates.conditionGroup = rule.conditionGroup || createEmptyConditionGroup();
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
      return updates;
    }

    if (newRuleType === 'threshold') {
      updates.valueMappingField = undefined;
      updates.valueMappings = undefined;
      updates.dataRangeSourceField = undefined;
      updates.dataRangeMode = undefined;
      updates.dataRangeMin = undefined;
      updates.dataRangeMax = undefined;
      updates.dataRangeColorScheme = undefined;
      updates.dataRangeApplyTo = undefined;
      return updates;
    }

    if (newRuleType === 'valueMapping') {
      updates.thresholdField = undefined;
      updates.thresholdLevels = undefined;
      updates.baseStyle = undefined;
      updates.dataRangeSourceField = undefined;
      updates.dataRangeMode = undefined;
      updates.dataRangeMin = undefined;
      updates.dataRangeMax = undefined;
      updates.dataRangeColorScheme = undefined;
      updates.dataRangeApplyTo = undefined;
      return updates;
    }

    if (newRuleType === 'dataRangeGradient') {
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
      return updates;
    }

    if (newRuleType === 'sparkChart' || newRuleType === 'flagsColumn') {
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
    }

    if (newRuleType === 'flagsColumn') {
      updates.sparkChartSourceField = undefined;
      updates.sparkChartMode = undefined;
      updates.sparkChartDataSeparator = undefined;
      updates.sparkChartColorMode = undefined;
      updates.sparkChartSolidColor = undefined;
      updates.sparkChartColorScheme = undefined;
      updates.sparkChartHeight = undefined;
      updates.sparkChartStackColors = undefined;
    }

    return updates;
  };

  const renderRuleBody = (rule: HighlightRule) => {
    const currentRuleType = rule.ruleType || 'conditional';
    return (
      <div id={`rule-content-${rule.id}`} className={styles.ruleContent}>
        <InlineFieldRow className={styles.compactMetaRow}>
          <InlineField label="Group" labelWidth={8}>
            <Combobox
              options={groupOptions}
              value={rule.groupId || ''}
              onChange={(v) => updateRule(rule.id, { groupId: v?.value || undefined })}
              width={20}
            />
          </InlineField>

          <InlineField label="Type" labelWidth={6}>
            <Combobox
              options={ruleTypeOptions}
              value={currentRuleType}
              onChange={(v) => {
                if (v) {
                  updateRule(rule.id, buildRuleTypeUpdates(rule, v.value));
                }
              }}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>

        {currentRuleType === 'conditional' && (
          <>
            <InlineFieldRow>
              <InlineField label="Apply to" labelWidth={12}>
                <MultiCombobox
                  options={availableFields.map((f) => ({ label: f, value: f }))}
                  value={Array.isArray(rule.targetFields) ? rule.targetFields : []}
                  onChange={(selected) => updateRule(rule.id, { targetFields: selected.map((s) => s.value) })}
                  enableAllOption={false}
                  width={30}
                />
              </InlineField>
            </InlineFieldRow>

            <Field label="Conditions" style={{ marginTop: 16, marginBottom: 16 }}>
              <div>
                {rule.conditionGroup ? (
                  <ConditionGroupBuilder
                    group={rule.conditionGroup}
                    onChange={(conditionGroup) => updateRule(rule.id, { conditionGroup })}
                    availableFields={availableFields}
                  />
                ) : (
                  <Button
                    icon="plus"
                    variant="secondary"
                    onClick={() => updateRule(rule.id, { conditionGroup: createEmptyConditionGroup() })}
                  >
                    Add Condition Group
                  </Button>
                )}
              </div>
            </Field>

            <Field label="Style" style={{ marginTop: 16 }}>
              <div className={styles.cellStyleWrapper}>
                <CellStyleEditor value={rule.style} onChange={(style) => updateRule(rule.id, { style })} />
              </div>
            </Field>
          </>
        )}

        {currentRuleType === 'threshold' && (
          <ThresholdRuleEditor value={rule} onChange={(updatedRule) => updatedRule && replaceRule(updatedRule)} context={context} item={{} as any} />
        )}

        {currentRuleType === 'valueMapping' && (
          <ValueMappingRuleEditor value={rule} onChange={(updatedRule) => updatedRule && replaceRule(updatedRule)} context={context} item={{} as any} />
        )}

        {currentRuleType === 'dataRangeGradient' && (
          <DataRangeGradientRuleEditor value={rule} onChange={(updatedRule) => updatedRule && replaceRule(updatedRule)} context={context} item={{} as any} />
        )}

        {currentRuleType === 'sparkChart' && (
          <SparkChartRuleEditor value={rule} onChange={(updatedRule) => updatedRule && replaceRule(updatedRule)} context={context} item={{} as any} />
        )}

        {currentRuleType === 'flagsColumn' && (
          <FlagsColumnRuleEditor value={rule} onChange={(updatedRule) => updatedRule && replaceRule(updatedRule)} context={context} item={{} as any} />
        )}
      </div>
    );
  };

  const renderRuleCard = (rule: HighlightRule, dragHandleProps?: DraggableProvidedDragHandleProps | null) => {
    const isExpanded = expandedRules.has(rule.id);
    const isEditing = editingRuleName === rule.id;

    return (
      <>
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
                  onChange={(e) => updateRule(rule.id, { name: e.currentTarget.value })}
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
                  style={{ padding: 0, minHeight: 0 }}
                >
                  <span className={cx(styles.title, !rule.enabled && styles.disabled)}>{rule.name}</span>
                  <Icon name="pen" size="sm" />
                </Button>
              )}
            </div>
          </div>

          <Stack gap={1} alignItems="center">
            <IconButton
              name={rule.enabled ? 'eye' : 'eye-slash'}
              tooltip={rule.enabled ? 'Disable rule' : 'Enable rule'}
              onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
              aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
            />
            <IconButton
              name="trash-alt"
              tooltip="Remove rule"
              onClick={() => removeRule(rule.id)}
              aria-label="Remove rule"
            />
            <div onMouseMove={reportDragMousePosition} {...dragHandleProps}>
              <Icon title="Drag and drop to reorder" name="draggabledots" size="lg" className={styles.dragIcon} />
            </div>
          </Stack>
        </div>

        {isExpanded && renderRuleBody(rule)}
      </>
    );
  };

  const renderRule = (rule: HighlightRule, index: number) => {
    return (
      <Draggable key={rule.id} draggableId={rule.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{ marginBottom: 8, width: '100%', ...provided.draggableProps.style }}
          >
            {renderRuleCard(rule, provided.dragHandleProps)}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Stack direction="column" gap={0}>
        <Droppable droppableId="top-level-formatting-items" type="TOP_LEVEL">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {topLevelItems.map((item, index) => {
                if (item.type === 'rule') {
                  return (
                    <Draggable key={item.id} draggableId={`top-rule-${item.id}`} index={index}>
                      {(itemProvided) => (
                        <div
                          ref={itemProvided.innerRef}
                          {...itemProvided.draggableProps}
                          style={{ marginBottom: 8, width: '100%', ...itemProvided.draggableProps.style }}
                        >
                          {renderRuleCard(item.rule, itemProvided.dragHandleProps)}
                        </div>
                      )}
                    </Draggable>
                  );
                }

                const isCollapsed = collapsedGroups.has(item.id);
                const isEditing = editingGroupId === item.id;
                const isGroupEnabled = item.rules.some((rule) => rule.enabled);

                return (
                  <Draggable key={item.id} draggableId={`top-group-${item.id}`} index={index}>
                    {(itemProvided) => (
                      <div
                        ref={itemProvided.innerRef}
                        {...itemProvided.draggableProps}
                        style={{ marginBottom: 8, width: '100%', ...itemProvided.draggableProps.style }}
                      >
                        <div>
                          <div className={cx(styles.sectionHeader, !isGroupEnabled && styles.sectionHeaderDisabled)}>
                            <div className={styles.sectionTitle}>
                              <div className={styles.sectionTitleRow}>
                                <IconButton
                                  name={isCollapsed ? 'angle-right' : 'angle-down'}
                                  tooltip={isCollapsed ? 'Expand group' : 'Collapse group'}
                                  onClick={() => toggleGroupCollapse(item.id)}
                                  aria-expanded={!isCollapsed}
                                />
                                {isEditing ? (
                                  <div className={styles.sectionTitleText}>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => renameGroup(item.id, e.currentTarget.value)}
                                      onBlur={() => setEditingGroupId(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                          setEditingGroupId(null);
                                        }
                                      }}
                                      autoFocus
                                      width={24}
                                    />
                                  </div>
                                ) : (
                                  <div className={styles.sectionTitleText}>
                                    <Button
                                      fill="text"
                                      className={styles.sectionTitleButton}
                                      onClick={() => setEditingGroupId(item.id)}
                                      tooltip="Rename group"
                                      aria-label={`Rename formatting group ${item.name}`}
                                    >
                                      <span className={styles.sectionName}>{item.name}</span>
                                      <Icon name="pen" size="sm" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className={styles.sectionActions}>
                              <IconButton
                                name={isGroupEnabled ? 'eye' : 'eye-slash'}
                                tooltip={isGroupEnabled ? 'Disable group' : 'Enable group'}
                                onClick={() => setGroupEnabled(item.id, !isGroupEnabled)}
                                aria-label={isGroupEnabled ? 'Disable group' : 'Enable group'}
                              />
                              <IconButton
                                name="trash-alt"
                                tooltip="Remove group"
                                onClick={() => removeGroup(item.id)}
                                aria-label={`Remove formatting group ${item.name}`}
                              />
                              <div
                                {...itemProvided.dragHandleProps}
                                className={styles.sectionDragHandle}
                                title="Drag and drop to reorder group"
                              >
                                <Icon name="draggabledots" size="lg" />
                              </div>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className={cx(styles.groupedRules, !isGroupEnabled && styles.groupedRulesDisabled)}>
                              <div className={styles.groupAddRuleRow}>
                                <Button
                                  icon="plus"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => addRule(item.id, item.name)}
                                >
                                  Add Rule
                                </Button>
                              </div>
                              <Droppable droppableId={item.id} type="RULE">
                                {(ruleListProvided) => (
                                  <div
                                    {...ruleListProvided.droppableProps}
                                    ref={ruleListProvided.innerRef}
                                    className={styles.groupedRulesList}
                                  >
                                    {item.rules.length === 0 ? (
                                      <div className={styles.emptyGroup}>No formatting rules in this group.</div>
                                    ) : (
                                      item.rules.map((rule, index) => renderRule(rule, index))
                                    )}
                                    {ruleListProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </div>
                      </div>
                      )}
                    </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Button icon="plus" onClick={() => addRule()} variant="primary">
          Add Highlight Rule
        </Button>
        <Button icon="folder-plus" onClick={addGroup} variant="secondary">
          Add Formatting Group
        </Button>
      </Stack>
    </DragDropContext>
  );
};
