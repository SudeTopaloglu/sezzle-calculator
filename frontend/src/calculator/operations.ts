import { formatNumber } from './format';

/** Operators wait for a second operand: "12 ×" … "3 =". */
export type Operator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power';
/** Immediate operations act on the number on screen as soon as they are pressed. */
export type ImmediateOperation = 'sqrt' | 'percentage';

/** A single request to the backend: POST /api/v1/{operation}. */
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

const PRECEDENCE: Record<Operator, number> = { add: 1, subtract: 1, multiply: 2, divide: 2, power: 3 };

/**
 * Whether a pending operator must be evaluated before the next one is applied.
 * Higher precedence goes first (2 + 3 × 4 = 14), equal precedence runs left to
 * right (10 − 2 − 3 = 5), except ^, which is right-associative (2 ^ 3 ^ 2 = 512).
 * A next operator of null means "=", which evaluates everything.
 */
export function evaluatesBefore(pending: Operator, next: Operator | null): boolean {
  if (next === null) return true;
  if (pending === 'power' && next === 'power') return false;
  return PRECEDENCE[pending] >= PRECEDENCE[next];
}

/** How many pending operators, counted from the most recent, must be evaluated before next. */
export function stepsToEvaluate(pending: readonly Operator[], next: Operator | null): number {
  let steps = 0;
  while (steps < pending.length && evaluatesBefore(pending[pending.length - 1 - steps], next)) {
    steps++;
  }
  return steps;
}

/** Renders a calculation, e.g. "12 × 3", "√(9)" or "10%". */
export function describeCalculation(calculation: Calculation): string {
  const a = formatNumber(calculation.a);
  switch (calculation.operation) {
    case 'sqrt':
      return `√(${a})`;
    case 'percentage':
      return `${a}%`;
    default:
      return `${a} ${OPERATOR_SYMBOLS[calculation.operation]} ${formatNumber(calculation.b)}`;
  }
}
