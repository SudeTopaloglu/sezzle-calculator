import { formatNumber } from './format';

/** Operation names match the backend endpoints: POST /api/v1/{operation}. */
export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power';
export type UnaryOperation = 'sqrt' | 'percentage';
export type Operation = BinaryOperation | UnaryOperation;

/** A single request to the backend. */
export type Calculation =
  | { operation: BinaryOperation; a: number; b: number }
  | { operation: UnaryOperation; a: number };

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
};

export function isUnary(operation: Operation): operation is UnaryOperation {
  return operation === 'sqrt' || operation === 'percentage';
}

/** Renders a calculation for the expression line, e.g. "12 × (−3)", "√(9)" or "50%". */
export function describeCalculation(calculation: Calculation): string {
  const a = formatNumber(calculation.a);
  switch (calculation.operation) {
    case 'sqrt':
      return `√(${a})`;
    case 'percentage':
      return `${a}%`;
    default: {
      const b = formatNumber(calculation.b);
      return `${a} ${OPERATOR_SYMBOLS[calculation.operation]} ${calculation.b < 0 ? `(${b})` : b}`;
    }
  }
}
