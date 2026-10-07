import { formatEntry, formatNumber } from './format';
import {
  describeCalculation,
  isUnary,
  OPERATOR_SYMBOLS,
  type BinaryOperation,
  type Calculation,
} from './operations';

/** float64 represents integers exactly up to about 15 digits. */
export const MAX_INPUT_DIGITS = 15;

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface CalculatorState {
  /** The number being typed or the last result; null right after an operator is chosen. */
  entry: string | null;
  /** True when entry is a computed result, so typing starts a new number. */
  overwrite: boolean;
  /** Left operand of the pending operation. */
  accumulator: number | null;
  pendingOperator: BinaryOperation | null;
  /** Secondary display line, e.g. "12 ×" or "12 × 3 =". */
  expression: string;
  error: string | null;
  isCalculating: boolean;
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'delete' }
  | { type: 'clear' }
  | { type: 'toggleSign' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'calculationStarted' }
  | {
      type: 'calculationSucceeded';
      calculation: Calculation;
      result: number;
      /** Operator to continue with when the calculation was triggered by chaining, e.g. "2 + 3 ×". */
      nextOperator: BinaryOperation | null;
    }
  | { type: 'calculationFailed'; calculation: Calculation; message: string };

type InputAction = Extract<CalculatorAction, { type: 'digit' | 'decimal' | 'delete' | 'toggleSign' | 'operator' }>;
type SuccessAction = Extract<CalculatorAction, { type: 'calculationSucceeded' }>;

export const initialState: CalculatorState = {
  entry: '0',
  overwrite: false,
  accumulator: null,
  pendingOperator: null,
  expression: '',
  error: null,
  isCalculating: false,
};

/**
 * Pure state transitions for an immediate-execution calculator. Arithmetic is
 * never done here: results arrive from the backend via calculationSucceeded.
 */
export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState;
    case 'calculationStarted':
      return { ...state, isCalculating: true };
    case 'calculationSucceeded':
      return applyResult(state, action);
    case 'calculationFailed':
      return { ...initialState, error: action.message, expression: `${describeCalculation(action.calculation)} =` };
    default:
      // Any input after an error starts over from a clean state.
      return applyInput(state.error === null ? state : initialState, action);
  }
}

function applyInput(state: CalculatorState, action: InputAction): CalculatorState {
  const { entry } = state;
  switch (action.type) {
    case 'digit':
      if (entry === null || state.overwrite) {
        return { ...state, entry: action.digit, overwrite: false };
      }
      if (entry === '0' || entry === '-0') {
        return { ...state, entry: entry.replace('0', action.digit) };
      }
      if (countDigits(entry) >= MAX_INPUT_DIGITS) {
        return state;
      }
      return { ...state, entry: entry + action.digit };

    case 'decimal':
      if (entry === null || state.overwrite) {
        return { ...state, entry: '0.', overwrite: false };
      }
      return entry.includes('.') ? state : { ...state, entry: `${entry}.` };

    case 'delete': {
      if (entry === null) {
        return state;
      }
      if (state.overwrite) {
        return { ...state, entry: '0', overwrite: false };
      }
      const shortened = entry.slice(0, -1);
      return { ...state, entry: shortened === '' || shortened === '-' ? '0' : shortened };
    }

    case 'toggleSign': {
      const value = entry ?? '0';
      return {
        ...state,
        entry: value.startsWith('-') ? value.slice(1) : `-${value}`,
        overwrite: entry === null ? false : state.overwrite,
      };
    }

    case 'operator': {
      // Choosing an operator right after another one replaces it.
      const accumulator = currentValue(state);
      return {
        ...state,
        accumulator,
        pendingOperator: action.operator,
        entry: null,
        overwrite: false,
        expression: `${formatNumber(accumulator)} ${OPERATOR_SYMBOLS[action.operator]}`,
      };
    }
  }
}

function applyResult(state: CalculatorState, { calculation, result, nextOperator }: SuccessAction): CalculatorState {
  if (isUnary(calculation.operation)) {
    // A unary result becomes the current operand; a pending operation stays pending.
    const description = describeCalculation(calculation);
    const expression =
      state.pendingOperator !== null && state.accumulator !== null
        ? `${formatNumber(state.accumulator)} ${OPERATOR_SYMBOLS[state.pendingOperator]} ${description}`
        : `${description} =`;
    return { ...state, entry: String(result), overwrite: true, expression, isCalculating: false };
  }
  if (nextOperator !== null) {
    return {
      ...initialState,
      accumulator: result,
      pendingOperator: nextOperator,
      entry: null,
      expression: `${formatNumber(result)} ${OPERATOR_SYMBOLS[nextOperator]}`,
    };
  }
  return {
    ...initialState,
    entry: String(result),
    overwrite: true,
    expression: `${describeCalculation(calculation)} =`,
  };
}

function countDigits(entry: string): number {
  return entry.replace(/\D/g, '').length;
}

/** The number on screen, which is also the operand the next operation will use. */
export function currentValue(state: CalculatorState): number {
  return state.entry === null ? (state.accumulator ?? 0) : Number(state.entry);
}

/** The main display text. */
export function displayValue(state: CalculatorState): string {
  if (state.entry === null || state.overwrite) {
    return formatNumber(currentValue(state));
  }
  return formatEntry(state.entry);
}
