import { buildTopLevelFormattingItems, flattenTopLevelItems } from '../highlightRuleGrouping';
import { HighlightRule } from '../../types';

// Minimal rule; only id/groupId/groupName/priority matter for grouping/order.
function rule(id: string, groupId?: string, groupName?: string): HighlightRule {
  return {
    id,
    name: id,
    enabled: true,
    priority: 1,
    ruleType: 'conditional',
    groupId,
    groupName,
    targetFields: [],
    style: {},
  } as HighlightRule;
}

const names = new Map<string, string>([
  ['g1', 'Group 1'],
  ['g2', 'Group 2'],
]);

describe('buildTopLevelFormattingItems', () => {
  it('renders ungrouped rules as standalone items in order', () => {
    const items = buildTopLevelFormattingItems([rule('a'), rule('b')], names);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(items.every((i) => i.type === 'rule')).toBe(true);
  });

  it('collapses a group into one card anchored at its first member', () => {
    const rules = [rule('a', 'g1'), rule('b', 'g1'), rule('c')];
    const items = buildTopLevelFormattingItems(rules, names);
    expect(items.map((i) => `${i.type}:${i.id}`)).toEqual(['group:g1', 'rule:c']);
    const group = items[0];
    expect(group.type === 'group' && group.rules.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('uses the shared group name, falling back to the rule-level name', () => {
    const known = buildTopLevelFormattingItems([rule('a', 'g1')], names)[0];
    expect(known.type === 'group' && known.name).toBe('Group 1');

    const fallback = buildTopLevelFormattingItems([rule('a', 'gX', 'Ad-hoc')], names)[0];
    expect(fallback.type === 'group' && fallback.name).toBe('Ad-hoc');
  });

  it('pulls non-contiguous group members together without dropping any rule', () => {
    // Interleaved: g1 members straddle an ungrouped rule and a g2 member.
    const rules = [rule('a', 'g1'), rule('b'), rule('c', 'g2'), rule('d', 'g1')];
    const items = buildTopLevelFormattingItems(rules, names);

    // Group g1 is anchored at 'a' and gathers 'd'; every rule still appears once.
    expect(items.map((i) => `${i.type}:${i.id}`)).toEqual(['group:g1', 'rule:b', 'group:g2']);
    const g1 = items[0];
    expect(g1.type === 'group' && g1.rules.map((r) => r.id)).toEqual(['a', 'd']);

    const flattened = flattenTopLevelItems(items);
    expect(flattened.map((r) => r.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(flattened).toHaveLength(4); // no loss, no duplication
  });
});

describe('flattenTopLevelItems', () => {
  it('is a lossless round-trip for already-contiguous input', () => {
    const rules = [rule('a', 'g1'), rule('b', 'g1'), rule('c')];
    const flattened = flattenTopLevelItems(buildTopLevelFormattingItems(rules, names));
    expect(flattened.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
