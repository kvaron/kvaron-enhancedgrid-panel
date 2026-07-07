import { computeCellStyle, EnhancedRowContext } from '../highlightEngine';
import { CellStyle, HighlightRule } from '../../types';

// Build a conditional rule whose single condition matches when row[field] === 'x'.
// The merge tests only care about which style a matching rule contributes, so the
// condition is kept trivial and the interesting variation lives in `style`.
function conditionalRule(
  id: string,
  priority: number,
  style: CellStyle,
  overrides: Partial<HighlightRule> = {}
): HighlightRule {
  return {
    id,
    name: id,
    enabled: true,
    priority,
    ruleType: 'conditional',
    targetFields: ['v'],
    conditionGroup: {
      id: `${id}-group`,
      type: 'group',
      logicalOperator: 'AND',
      items: [
        {
          id: `${id}-cond`,
          sourceField: 'v',
          operator: 'equals',
          compareType: 'value',
          compareValue: 'x',
        },
      ],
    },
    style,
    ...overrides,
  };
}

const context: EnhancedRowContext = {
  row: { v: 'x' },
  rowIndex: 0,
  currentField: 'v',
  theme: {} as any,
};

describe('computeCellStyle merge semantics', () => {
  it('returns null when no rules match', () => {
    const rule = conditionalRule('r1', 1, { backgroundColor: 'red' });
    const noMatch: EnhancedRowContext = { ...context, row: { v: 'other' } };
    expect(computeCellStyle([rule], noMatch)).toBeNull();
  });

  it('returns null when a matching rule contributes no style', () => {
    const rule = conditionalRule('r1', 1, {});
    expect(computeCellStyle([rule], context)).toBeNull();
  });

  it('combines a color-only rule with an icon-only rule (the headline behavior)', () => {
    const colorRule = conditionalRule('color', 1, { backgroundColor: 'red' });
    const iconRule = conditionalRule('icon', 2, { icon: 'star' as any });
    expect(computeCellStyle([iconRule, colorRule], context)).toEqual({
      backgroundColor: 'red',
      icon: 'star',
    });
  });

  it('lets the higher-priority rule win a shared property', () => {
    const high = conditionalRule('high', 1, { backgroundColor: 'red' });
    const low = conditionalRule('low', 2, { backgroundColor: 'blue' });
    // Input order is intentionally reversed to prove sorting by priority, not array order.
    expect(computeCellStyle([low, high], context)?.backgroundColor).toBe('red');
  });

  it('treats transparent background as unset so a later real color wins', () => {
    const transparent = conditionalRule('t', 1, { backgroundColor: 'transparent' });
    const real = conditionalRule('r', 2, { backgroundColor: '#00ff00' });
    expect(computeCellStyle([transparent, real], context)?.backgroundColor).toBe('#00ff00');
  });

  it('ignores disabled rules', () => {
    const disabled = conditionalRule('d', 1, { backgroundColor: 'red' }, { enabled: false });
    const enabled = conditionalRule('e', 2, { backgroundColor: 'blue' });
    expect(computeCellStyle([disabled, enabled], context)?.backgroundColor).toBe('blue');
  });

  it('skips a rule that does not target the current field', () => {
    const otherField = conditionalRule('o', 1, { backgroundColor: 'red' }, { targetFields: ['w'] });
    const thisField = conditionalRule('t', 2, { backgroundColor: 'blue' });
    expect(computeCellStyle([otherField, thisField], context)?.backgroundColor).toBe('blue');
  });

  it('keeps borderWidth of 0 as a real value', () => {
    const rule = conditionalRule('r', 1, { borderWidth: 0, borderColor: '#000' });
    expect(computeCellStyle([rule], context)).toEqual({ borderWidth: 0, borderColor: '#000' });
  });

  describe('custom renderer vs icon slot', () => {
    it('lets a higher-priority custom renderer suppress a lower-priority icon', () => {
      const renderer = conditionalRule('render', 1, { customRenderer: 'sparkChart' });
      const icon = conditionalRule('icon', 2, { icon: 'star' as any });
      const result = computeCellStyle([icon, renderer], context);
      expect(result?.customRenderer).toBe('sparkChart');
      expect(result?.icon).toBeUndefined();
    });

    it('does not let a lower-priority custom renderer clear a higher-priority icon', () => {
      const icon = conditionalRule('icon', 1, { icon: 'star' as any });
      const renderer = conditionalRule('render', 2, { customRenderer: 'sparkChart' });
      const result = computeCellStyle([renderer, icon], context);
      expect(result?.icon).toBe('star');
      expect(result?.customRenderer).toBeUndefined();
    });

    it('still combines a color rule with a custom renderer rule', () => {
      const color = conditionalRule('color', 1, { backgroundColor: 'red' });
      const renderer = conditionalRule('render', 2, { customRenderer: 'sparkChart' });
      const result = computeCellStyle([color, renderer], context);
      expect(result).toMatchObject({ backgroundColor: 'red', customRenderer: 'sparkChart' });
    });

    it('lets the higher-priority renderer win the slot, config and all, over a lower one', () => {
      const high = conditionalRule('high', 1, {
        customRenderer: 'sparkChart',
        customRendererConfig: { mode: 'line' } as any,
      });
      const low = conditionalRule('low', 2, {
        customRenderer: 'flagsColumn' as any,
        customRendererConfig: { mode: 'bar' } as any,
      });
      const result = computeCellStyle([low, high], context);
      expect(result?.customRenderer).toBe('sparkChart');
      expect(result?.customRendererConfig).toEqual({ mode: 'line' });
    });
  });
});
