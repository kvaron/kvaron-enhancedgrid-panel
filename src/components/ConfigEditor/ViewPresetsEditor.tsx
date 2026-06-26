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
import { ConditionGroup, EnhancedGridOptions, ViewPreset } from '../../types';
import { SortKey } from '../../utils/odataQueryBuilder';
import { ConditionGroupBuilder } from './ConditionGroupBuilder';

const DIRECTION_OPTIONS: Array<ComboboxOption<'asc' | 'desc'>> = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' },
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
  presetContent: css({
    padding: theme.spacing(2),
  }),
  sortRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    background: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
  }),
});

/**
 * Custom panel-option editor for view presets. Each preset is a collapsible
 * card with an inline-editable name, a visible-columns multiselect, a lazily
 * created nested filter, and an ordered sort-key list. Mirrors the patterns in
 * HighlightRuleEditor. Never mutates the incoming arrays in place — every
 * change emits a fresh array via onChange.
 */
export const ViewPresetsEditor: React.FC<StandardEditorProps<ViewPreset[]>> = ({ value, onChange, context }) => {
  const presets = value || [];
  const styles = useStyles2(getStyles);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);

  // Fields present in the current data frame (may be empty when no query has run).
  const availableFields = context.data[0]?.fields.map((f) => f.name) || [];

  const toggleExpansion = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) {
      return;
    }
    const reordered = Array.from(presets);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered);
  };

  const reportDragMousePosition = () => {};

  const addPreset = () => {
    const id = `preset-${crypto.randomUUID()}`;
    const newPreset: ViewPreset = {
      id,
      name: `Preset ${presets.length + 1}`,
      visibleColumns: [],
      sort: [],
    };
    setExpanded((prev) => new Set([...prev, id]));
    onChange([...presets, newPreset]);
  };

  const removePreset = (index: number) => {
    const removed = presets[index];
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
    onChange(presets.filter((_, i) => i !== index));
  };

  const updatePreset = (index: number, updates: Partial<ViewPreset>) => {
    const updated = [...presets];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Stack direction="column" gap={0}>
        <Droppable droppableId="view-presets">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={{ width: '100%' }}>
              {presets.map((preset, index) => {
                const isExpanded = expanded.has(preset.id);
                const isEditing = editingName === preset.id;

                // Merge stored values with available fields so saved presets
                // still render their selections when the frame is empty.
                const columnOptions = Array.from(
                  new Set([...availableFields, ...(preset.visibleColumns || [])])
                ).map((f) => ({ label: f, value: f }));
                const sortFieldOptions = Array.from(
                  new Set([...availableFields, ...preset.sort.map((s) => s.field)])
                ).map((f) => ({ label: f, value: f }));

                const addSortKey = () => {
                  // Pick the first field not already used as a sort key.
                  const used = new Set(preset.sort.map((s) => s.field));
                  const candidate = sortFieldOptions.map((o) => o.value).find((f) => !used.has(f)) || '';
                  updatePreset(index, {
                    sort: [...preset.sort, { field: candidate, direction: 'asc' as const }],
                  });
                };

                const updateSortKey = (sortIndex: number, updates: Partial<SortKey>) => {
                  const nextSort = preset.sort.map((s, i) => (i === sortIndex ? { ...s, ...updates } : s));
                  // Dedupe by field, keeping the first occurrence (the one just edited wins
                  // because edits replace in place).
                  const seen = new Set<string>();
                  const deduped = nextSort.filter((s) => {
                    if (seen.has(s.field)) {
                      return false;
                    }
                    seen.add(s.field);
                    return true;
                  });
                  updatePreset(index, { sort: deduped });
                };

                const removeSortKey = (sortIndex: number) => {
                  updatePreset(index, { sort: preset.sort.filter((_, i) => i !== sortIndex) });
                };

                const handleSortDragEnd = (result: DropResult) => {
                  if (!result.destination || result.source.index === result.destination.index) {
                    return;
                  }
                  const reordered = Array.from(preset.sort);
                  const [moved] = reordered.splice(result.source.index, 1);
                  reordered.splice(result.destination.index, 0, moved);
                  updatePreset(index, { sort: reordered });
                };

                const addFilter = () => {
                  const group: ConditionGroup = {
                    id: `group-${crypto.randomUUID()}`,
                    type: 'group',
                    logicalOperator: 'AND',
                    items: [],
                  };
                  updatePreset(index, { filter: group });
                };

                const removeFilter = () => {
                  updatePreset(index, { filter: undefined });
                };

                return (
                  <Draggable key={preset.id} draggableId={preset.id} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          marginBottom: 8,
                          width: '100%',
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <div className={styles.header}>
                          <div className={styles.column}>
                            <IconButton
                              name={isExpanded ? 'angle-down' : 'angle-right'}
                              tooltip={isExpanded ? 'Collapse preset' : 'Expand preset'}
                              className={styles.collapseIcon}
                              onClick={() => toggleExpansion(preset.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`preset-content-${preset.id}`}
                            />
                            <div className={styles.titleWrapper}>
                              {isEditing ? (
                                <Input
                                  value={preset.name}
                                  onChange={(e) => updatePreset(index, { name: e.currentTarget.value })}
                                  onBlur={() => setEditingName(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      setEditingName(null);
                                    }
                                  }}
                                  autoFocus
                                  width={30}
                                />
                              ) : (
                                <Button
                                  fill="text"
                                  onClick={() => setEditingName(preset.id)}
                                  tooltip="Edit preset name"
                                  aria-label={`Edit preset name: ${preset.name}`}
                                  style={{ padding: 0, minHeight: 0 }}
                                >
                                  <span className={cx(styles.title)}>{preset.name}</span>
                                  <Icon name="pen" size="sm" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <Stack gap={1} alignItems="center">
                            <IconButton
                              name="trash-alt"
                              tooltip="Remove preset"
                              onClick={() => removePreset(index)}
                              aria-label="Remove preset"
                            />
                            <div onMouseMove={reportDragMousePosition} {...dragProvided.dragHandleProps}>
                              <Icon
                                title="Drag and drop to reorder"
                                name="draggabledots"
                                size="lg"
                                className={styles.dragIcon}
                              />
                            </div>
                          </Stack>
                        </div>

                        {isExpanded && (
                          <div id={`preset-content-${preset.id}`} className={styles.presetContent}>
                            {/* Visible columns */}
                            <InlineFieldRow>
                              <InlineField label="Visible columns" labelWidth={16}>
                                <MultiCombobox
                                  options={columnOptions}
                                  value={Array.isArray(preset.visibleColumns) ? preset.visibleColumns : []}
                                  onChange={(selected) =>
                                    updatePreset(index, { visibleColumns: selected.map((s) => s.value as string) })
                                  }
                                  enableAllOption={false}
                                  width={40}
                                />
                              </InlineField>
                            </InlineFieldRow>

                            {/* Nested filter (lazily created) */}
                            <Field label="Filter" style={{ marginTop: 16, marginBottom: 16 }}>
                              <div>
                                {preset.filter ? (
                                  <>
                                    <ConditionGroupBuilder
                                      group={preset.filter}
                                      onChange={(filter) => updatePreset(index, { filter })}
                                      availableFields={availableFields}
                                    />
                                    <Button
                                      icon="trash-alt"
                                      variant="secondary"
                                      size="sm"
                                      onClick={removeFilter}
                                      style={{ marginTop: 8 }}
                                    >
                                      Remove filter
                                    </Button>
                                  </>
                                ) : (
                                  <Button icon="plus" variant="secondary" size="sm" onClick={addFilter}>
                                    Add filter
                                  </Button>
                                )}
                              </div>
                            </Field>

                            {/* Ordered sort keys */}
                            <Field label="Sort">
                              <div>
                                <DragDropContext onDragEnd={handleSortDragEnd}>
                                  <Droppable droppableId={`sort-${preset.id}`}>
                                    {(sortProvided) => (
                                      <div {...sortProvided.droppableProps} ref={sortProvided.innerRef}>
                                        {preset.sort.map((key, sortIndex) => (
                                          <Draggable
                                            key={`${preset.id}-sort-${sortIndex}`}
                                            draggableId={`${preset.id}-sort-${sortIndex}`}
                                            index={sortIndex}
                                          >
                                            {(sortDrag) => (
                                              <div
                                                ref={sortDrag.innerRef}
                                                {...sortDrag.draggableProps}
                                                className={styles.sortRow}
                                                style={{ ...sortDrag.draggableProps.style }}
                                              >
                                                <div
                                                  onMouseMove={reportDragMousePosition}
                                                  {...sortDrag.dragHandleProps}
                                                >
                                                  <Icon
                                                    title="Drag and drop to reorder"
                                                    name="draggabledots"
                                                    className={styles.dragIcon}
                                                  />
                                                </div>
                                                <Combobox
                                                  options={sortFieldOptions}
                                                  value={key.field}
                                                  onChange={(v) => v && updateSortKey(sortIndex, { field: v.value })}
                                                  width={24}
                                                />
                                                <Combobox
                                                  options={DIRECTION_OPTIONS}
                                                  value={key.direction}
                                                  onChange={(v) => v && updateSortKey(sortIndex, { direction: v.value })}
                                                  width={20}
                                                />
                                                <IconButton
                                                  name="trash-alt"
                                                  tooltip="Remove sort key"
                                                  onClick={() => removeSortKey(sortIndex)}
                                                  aria-label="Remove sort key"
                                                />
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {sortProvided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </DragDropContext>
                                <Button icon="plus" variant="secondary" size="sm" onClick={addSortKey}>
                                  Add sort key
                                </Button>
                              </div>
                            </Field>
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

        <Button icon="plus" onClick={addPreset} variant="primary">
          Add View Preset
        </Button>
      </Stack>
    </DragDropContext>
  );
};

/**
 * Small select for the default preset id. Reads the preset list from the panel
 * options so the dropdown stays in sync with whatever the user has defined.
 */
export const DefaultPresetSelect: React.FC<StandardEditorProps<string | undefined>> = ({
  value,
  onChange,
  context,
}) => {
  const presets = ((context.options as EnhancedGridOptions | undefined)?.viewPresets || []) as ViewPreset[];
  const options: Array<ComboboxOption<string>> = [
    { label: '(None)', value: '' },
    ...presets.map((p) => ({ label: p.name, value: p.id })),
  ];
  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onChange={(v) => onChange(v ? v.value || undefined : undefined)}
      width={40}
    />
  );
};
