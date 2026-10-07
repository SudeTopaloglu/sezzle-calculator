import { formatNumber } from './format';

/** Operators wait for a second operand: "12 ×" … "3 =". */
export type Operator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power';
/** Immediate operations act on the number on screen as soon as they are pressed. */
export type ImmediateOperation = 'sqrt' | 'percentage';
/** Every operation the backend supports: POST /api/v1/{operation}. */
export type Operation = Operator | ImmediateOperation;

/** A single request to the backend. */
export type Calculation =
  | { operation: Operator | 'percentage'; a: number; b: number }
  | { operation: 'sqrt'; a: number };

export const OPERATOR_SYMBOLS: Record<Operator, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
};

export const OPERATIONS: readonly Operation[] = [
  ...(Object.keys(OPERATOR_SYMBOLS) as Operator[]),
  'sqrt',
  'percentage',
];

export function isImmediate(operation: Operation): operation is ImmediateOperation {
  return operation === 'sqrt' || operation === 'percentage';
}

/** Renders a calculation on its own, e.g. "12 × (−3)", "√(9)", "10% of 50". */
export function describeCalculation(calculation: Calculation): string {
  const a = formatNumber(calculation.a);
  switch (calculation.operation) {
    case 'sqrt':
      return `√(${a})`;
    case 'percentage':
      return calculation.b === 1 ? `${a}%` : `${a}% of ${formatNumber(calculation.b)}`;
    default: {
      const b = formatNumber(calculation.b);
      return `${a} ${OPERATOR_SYMBOLS[calculation.operation]} ${calculation.b < 0 ? `(${b})` : b}`;
    }
  }
}

/** Renders an immediate operation inside a pending expression, e.g. the "10%" in "50 + 10%". */
export function describeOperand(calculation: Calculation): string {
  return calculation.operation === 'percentage' ? `${formatNumber(calculation.a)}%` : describeCalculation(calculation);
}
