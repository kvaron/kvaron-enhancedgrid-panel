import {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateConditionElement,
  RowContext,
} from '../src/utils/conditionEvaluator';
import { HighlightCondition, ConditionGroup } from '../src/types';

describe('Nested Condition Groups', () => {
  const mockContext: RowContext = {
    row: {
      status: 'active',
      value: 1500,
      region: 'US',
      vip: true,
      priority: 'high',
    },
    rowIndex: 0,
    currentField: 'status',
  };

  describe('Simple conditions', () => {
    it('should evaluate equals condition', () => {
      const condition: HighlightCondition = {
        id: 'c1',
        sourceField: 'status',
        operator: 'equals',
        compareType: 'value',
        compareValue: 'active',
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate greater than condition', () => {
      const condition: HighlightCondition = {
        id: 'c2',
        sourceField: 'value',
        operator: 'greater_than',
        compareType: 'value',
        compareValue: 1000,
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });
  });

  describe('Simple groups', () => {
    it('should evaluate AND group with all true conditions', () => {
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'AND',
        items: [
          {
            id: 'c1',
            sourceField: 'status',
            operator: 'equals',
            compareType: 'value',
            compareValue: 'active',
          },
          {
            id: 'c2',
            sourceField: 'value',
            operator: 'greater_than',
            compareType: 'value',
            compareValue: 1000,
          },
        ],
      };

      expect(evaluateConditionGroup(group, mockContext)).toBe(true);
    });

    it('should evaluate AND group with one false condition', () => {
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'AND',
        items: [
          {
            id: 'c1',
            sourceField: 'status',
            operator: 'equals',
            compareType: 'value',
            compareValue: 'active',
          },
          {
            id: 'c2',
            sourceField: 'value',
            operator: 'greater_than',
            compareType: 'value',
            compareValue: 2000,
          },
        ],
      };

      expect(evaluateConditionGroup(group, mockContext)).toBe(false);
    });

    it('should evaluate OR group with one true condition', () => {
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'OR',
        items: [
          {
            id: 'c1',
            sourceField: 'status',
            operator: 'equals',
            compareType: 'value',
            compareValue: 'inactive',
          },
          {
            id: 'c2',
            sourceField: 'vip',
            operator: 'equals',
            compareType: 'value',
            compareValue: true,
          },
        ],
      };

      expect(evaluateConditionGroup(group, mockContext)).toBe(true);
    });
  });

  describe('Nested groups', () => {
    it('should evaluate (A && B) || C pattern', () => {
      // (status == "active" AND value > 1000) OR vip == true
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'OR',
        items: [
          {
            id: 'g2',
            type: 'group',
            logicalOperator: 'AND',
            items: [
              {
                id: 'c1',
                sourceField: 'status',
                operator: 'equals',
                compareType: 'value',
                compareValue: 'active',
              },
              {
                id: 'c2',
                sourceField: 'value',
                operator: 'greater_than',
                compareType: 'value',
                compareValue: 1000,
              },
            ],
          },
          {
            id: 'c3',
            sourceField: 'vip',
            operator: 'equals',
            compareType: 'value',
            compareValue: false, // This will be false
          },
        ],
      };

      // Should be true because (active AND value > 1000) is true
      expect(evaluateConditionGroup(group, mockContext)).toBe(true);
    });

    it('should evaluate complex nested structure', () => {
      // (region == "US" AND value > 1000) OR (region == "EU" AND value > 800) OR priority == "high"
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'OR',
        items: [
          {
            id: 'g2',
            type: 'group',
            logicalOperator: 'AND',
            items: [
              {
                id: 'c1',
                sourceField: 'region',
                operator: 'equals',
                compareType: 'value',
                compareValue: 'US',
              },
              {
                id: 'c2',
                sourceField: 'value',
                operator: 'greater_than',
                compareType: 'value',
                compareValue: 1000,
              },
            ],
          },
          {
            id: 'g3',
            type: 'group',
            logicalOperator: 'AND',
            items: [
              {
                id: 'c3',
                sourceField: 'region',
                operator: 'equals',
                compareType: 'value',
                compareValue: 'EU',
              },
              {
                id: 'c4',
                sourceField: 'value',
                operator: 'greater_than',
                compareType: 'value',
                compareValue: 800,
              },
            ],
          },
          {
            id: 'c5',
            sourceField: 'priority',
            operator: 'equals',
            compareType: 'value',
            compareValue: 'high',
          },
        ],
      };

      // Should be true because region == "US" AND value > 1000
      expect(evaluateConditionGroup(group, mockContext)).toBe(true);
    });

    it('should handle deeply nested groups', () => {
      // ((A && B) || (C && D)) && E
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'AND',
        items: [
          {
            id: 'g2',
            type: 'group',
            logicalOperator: 'OR',
            items: [
              {
                id: 'g3',
                type: 'group',
                logicalOperator: 'AND',
                items: [
                  {
                    id: 'c1',
                    sourceField: 'status',
                    operator: 'equals',
                    compareType: 'value',
                    compareValue: 'active',
                  },
                  {
                    id: 'c2',
                    sourceField: 'value',
                    operator: 'greater_than',
                    compareType: 'value',
                    compareValue: 1000,
                  },
                ],
              },
              {
                id: 'g4',
                type: 'group',
                logicalOperator: 'AND',
                items: [
                  {
                    id: 'c3',
                    sourceField: 'region',
                    operator: 'equals',
                    compareType: 'value',
                    compareValue: 'EU',
                  },
                  {
                    id: 'c4',
                    sourceField: 'priority',
                    operator: 'equals',
                    compareType: 'value',
                    compareValue: 'low',
                  },
                ],
              },
            ],
          },
          {
            id: 'c5',
            sourceField: 'vip',
            operator: 'equals',
            compareType: 'value',
            compareValue: true,
          },
        ],
      };

      // Should be true because ((active AND value > 1000) is true) AND vip is true
      expect(evaluateConditionGroup(group, mockContext)).toBe(true);
    });
  });

  describe('evaluateConditionElement', () => {
    it('should handle single condition', () => {
      const condition: HighlightCondition = {
        id: 'c1',
        sourceField: 'status',
        operator: 'equals',
        compareType: 'value',
        compareValue: 'active',
      };

      expect(evaluateConditionElement(condition, mockContext)).toBe(true);
    });

    it('should handle condition group', () => {
      const group: ConditionGroup = {
        id: 'g1',
        type: 'group',
        logicalOperator: 'AND',
        items: [
          {
            id: 'c1',
            sourceField: 'status',
            operator: 'equals',
            compareType: 'value',
            compareValue: 'active',
          },
          {
            id: 'c2',
            sourceField: 'vip',
            operator: 'equals',
            compareType: 'value',
            compareValue: true,
          },
        ],
      };

      expect(evaluateConditionElement(group, mockContext)).toBe(true);
    });
  });
});
