import { HighlightRule } from '../types';

/**
 * A top-level entry in the rule editor: either a standalone (ungrouped) rule or
 * a group card that owns an ordered list of its member rules. Groups and
 * standalone rules share one drag-and-drop list, so they are modeled together.
 */
export type TopLevelFormattingItem =
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

const DEFAULT_GROUP_NAME = 'Formatting group';

/**
 * Reconstruct the editor's top-level display order from the flat rule list.
 *
 * Group membership lives on each rule (`groupId`), so a group is rendered as a
 * single card anchored at the position of its first member; any later members
 * are pulled into that card. This means the display always shows a group's
 * rules contiguously even if the saved array interleaves them with other rules.
 *
 * Every rule appears exactly once and no rule is dropped, so flattening the
 * result (see {@link flattenTopLevelItems}) is a safe, lossless reordering.
 */
export function buildTopLevelFormattingItems(
  rules: HighlightRule[],
  groupNames: Map<string, string>
): TopLevelFormattingItem[] {
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
        name: groupNames.get(rule.groupId) || rule.groupName || DEFAULT_GROUP_NAME,
        rules: byGroup.get(rule.groupId) || [],
      });
    }
  }

  return items;
}

/** Flatten top-level items back to a single ordered rule list (groups expanded in place). */
export function flattenTopLevelItems(items: TopLevelFormattingItem[]): HighlightRule[] {
  return items.flatMap((item) => (item.type === 'group' ? item.rules : [item.rule]));
}
