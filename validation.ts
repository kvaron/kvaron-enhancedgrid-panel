/**
 * Simple validation script to test nested conditions
 * Run with: node --loader ts-node/esm validation.ts
 */

import { evaluateConditionGroup, RowContext } from './src/utils/conditionEvaluator';
import { ConditionGroup } from './src/types';

// Test data
const mockContext: RowContext = {
  row: {
    status: 'active',
    value: 1500,
    region: 'US',
    vip: true,
  },
  rowIndex: 0,
  currentField: 'status',
};

// Test case: (status == "active" AND value > 1000) OR vip == true
const testGroup: ConditionGroup = {
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
      compareValue: false,
    },
  ],
};

console.log('Testing nested conditions...');
console.log('Expression: (status == "active" AND value > 1000) OR vip == false');
console.log('Data:', mockContext.row);

const result = evaluateConditionGroup(testGroup, mockContext);
console.log('Result:', result);
console.log('Expected: true (because status is "active" AND value (1500) > 1000)');
console.log('Test', result === true ? 'PASSED ✓' : 'FAILED ✗');
