import { HighlightCondition, ComparisonOperator, ConditionGroup, ConditionElement, isConditionGroup } from '../types';

// Context for evaluating conditions
export interface RowContext {
  row: Record<string, any>;
  rowIndex: number;
  currentField: string;
}

/**
 * Safely evaluate a single condition against a row context.
 * NO code execution - only enum-based operator matching.
 */
export function evaluateCondition(condition: HighlightCondition, context: RowContext): boolean {
  const sourceValue = context.row[condition.sourceField];

  // Get comparison value (either fixed value or from another field)
  const compareValue =
    condition.compareType === 'field' && condition.compareField
      ? context.row[condition.compareField]
      : condition.compareValue;

  // Evaluate based on operator
  return evaluateOperator(sourceValue, condition.operator, compareValue);
}

/**
 * Coerce a value to a number if it's a numeric string.
 */
function toNumber(value: any): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Evaluate a single operator comparison.
 * Pure function with no side effects or code execution.
 */
function evaluateOperator(sourceValue: any, operator: ComparisonOperator, compareValue: any): boolean {
  switch (operator) {
    case 'equals':
      // Try numeric comparison first, then fall back to strict equality
      const sourceNum = toNumber(sourceValue);
      const compareNum = toNumber(compareValue);
      if (sourceNum !== null && compareNum !== null) {
        return sourceNum === compareNum;
      }
      return sourceValue === compareValue;

    case 'not_equals':
      // Try numeric comparison first, then fall back to strict inequality
      const sourceNum2 = toNumber(sourceValue);
      const compareNum2 = toNumber(compareValue);
      if (sourceNum2 !== null && compareNum2 !== null) {
        return sourceNum2 !== compareNum2;
      }
      return sourceValue !== compareValue;

    case 'greater_than': {
      const sourceNum = toNumber(sourceValue);
      const compareNum = toNumber(compareValue);
      return sourceNum !== null && compareNum !== null && sourceNum > compareNum;
    }

    case 'less_than': {
      const sourceNum = toNumber(sourceValue);
      const compareNum = toNumber(compareValue);
      return sourceNum !== null && compareNum !== null && sourceNum < compareNum;
    }

    case 'greater_than_or_equal': {
      const sourceNum = toNumber(sourceValue);
      const compareNum = toNumber(compareValue);
      return sourceNum !== null && compareNum !== null && sourceNum >= compareNum;
    }

    case 'less_than_or_equal': {
      const sourceNum = toNumber(sourceValue);
      const compareNum = toNumber(compareValue);
      return sourceNum !== null && compareNum !== null && sourceNum <= compareNum;
    }

    case 'contains':
      return (
        typeof sourceValue === 'string' &&
        typeof compareValue === 'string' &&
        sourceValue.toLowerCase().includes(compareValue.toLowerCase())
      );

    case 'not_contains':
      return (
        typeof sourceValue === 'string' &&
        typeof compareValue === 'string' &&
        !sourceValue.toLowerCase().includes(compareValue.toLowerCase())
      );

    case 'starts_with':
      return (
        typeof sourceValue === 'string' &&
        typeof compareValue === 'string' &&
        sourceValue.toLowerCase().startsWith(compareValue.toLowerCase())
      );

    case 'ends_with':
      return (
        typeof sourceValue === 'string' &&
        typeof compareValue === 'string' &&
        sourceValue.toLowerCase().endsWith(compareValue.toLowerCase())
      );

    case 'is_null':
      return sourceValue === null || sourceValue === undefined;

    case 'is_not_null':
      return sourceValue !== null && sourceValue !== undefined;

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluate a condition element (either a single condition or a group).
 */
export function evaluateConditionElement(element: ConditionElement, context: RowContext): boolean {
  if (isConditionGroup(element)) {
    return evaluateConditionGroup(element, context);
  }
  return evaluateCondition(element, context);
}

/**
 * Recursively evaluate a condition group.
 * Supports nested groups like (A && B) || C.
 */
export function evaluateConditionGroup(group: ConditionGroup, context: RowContext): boolean {
  if (group.items.length === 0) {
    return false;
  }

  // Evaluate first item
  let result = evaluateConditionElement(group.items[0], context);

  // Apply logical operator to combine all items in the group
  for (let i = 1; i < group.items.length; i++) {
    const itemResult = evaluateConditionElement(group.items[i], context);

    if (group.logicalOperator === 'AND') {
      result = result && itemResult;
    } else {
      result = result || itemResult;
    }
  }

  return result;
}
