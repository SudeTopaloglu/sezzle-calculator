import { formatEntry, formatNumber } from './format';
import { describeCalculation, OPERATOR_SYMBOLS, type Calculation, type Operator } from './operations';

/** float64 represents integers exactly up to about 15 digits. */
export const MAX_INPUT_DIGITS = 15;

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** An operand waiting for its operator to be evaluated, e.g. the "2 +" in "2 + 3 ×". */
export interface PendingStep {
  value: number;
  operator: Operator;
}

export interface CalculatorState {
  /** The number being typed or the last result; null right after an operator is chosen. */
  entry: string | null;
  /** True when entry is a computed result, so typing starts a new number. */
  overwrite: boolean;
  /** How the entry appears in the expression when √ or % produced it, e.g. "√(9)". */
  entryLabel: string | null;
  /** Steps not evaluated yet, lowest precedence first. */
  pending: PendingStep[];
  /** The expression typed so far, e.g. ["2", "+", "3", "×"]. */
  tokens: string[];
  /** Secondary display line, e.g. "2 + 3 ×" or "2 + 3 × 4 =". */
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
  /** Puts a number on screen, e.g. a result picked from the history. */
  | { type: 'recall'; value: number }
  /** Queues an operator that doesn't need anything evaluated first. */
  | { type: 'operator'; operator: Operator }
  | { type: 'calculationStarted' }
  /** The last `steps` pending operations were evaluated; nextOperator null means "=". */
  | { type: 'evaluated'; result: number; steps: number; nextOperator: Operator | null }
  | { type: 'immediateApplied'; calculation: Calculation; result: number }
  | { type: 'calculationFailed'; expression: string; message: string };

type EditAction = Extract<CalculatorAction, { type: 'digit' | 'decimal' | 'delete' | 'toggleSign' | 'recall' | 'operator' }>;

export const initialState: CalculatorState = {
  entry: '0',
  overwrite: false,
  entryLabel: null,
  pending: [],
  tokens: [],
  expression: '',
  error: null,
  isCalculating: false,
};

/**
 * Pure state transitions for a calculator with operator precedence. Arithmetic
 * is never done here: results arrive from the backend via the hook.
 */
export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState;
    case 'calculationStarted':
      return { ...state, isCalculating: true };
    case 'evaluated':
      return applyEvaluation(state, action.result, action.steps, action.nextOperator);
    case 'immediateApplied': {
      const completed = state.pending.length === 0;
      return {
        ...state,
        entry: String(action.result),
        overwrite: true,
        // Standalone, "√(9) =" is finished; inside "2 + √(9)" it is still an operand.
        entryLabel: completed ? null : describeCalculation(action.calculation),
        expression: immediateExpression(state, action.calculation),
        isCalculating: false,
      };
    }
    case 'calculationFailed':
      return { ...initialState, error: action.message, expression: action.expression };
    default:
      // Any input after an error starts over from a clean state.
      return applyEdit(state.error === null ? state : initialState, action);
  }
}

function applyEdit(state: CalculatorState, action: EditAction): CalculatorState {
  if (action.type === 'operator') {
    const { pending, tokens, operand } = operandFor(state, true);
    const nextTokens = [...tokens, OPERATOR_SYMBOLS[action.operator]];
    return {
      ...state,
      entry: null,
      overwrite: false,
      entryLabel: null,
      pending: [...pending, { value: operand, operator: action.operator }],
      tokens: nextTokens,
      expression: nextTokens.join(' '),
    };
  }
  const entry = editEntry(state, action);
  if (entry === null) {
    return state;
  }
  return { ...state, ...entry, entryLabel: null, expression: state.tokens.join(' ') };
}

/** The new entry after an edit, or null when the edit changes nothing. */
function editEntry(
  state: CalculatorState,
  action: Exclude<EditAction, { type: 'operator' }>,
): Pick<CalculatorState, 'entry' | 'overwrite'> | null {
  const { entry } = state;
  const startsNew = entry === null || state.overwrite;

  switch (action.type) {
    case 'digit':
      if (startsNew) return { entry: action.digit, overwrite: false };
      if (entry === '0' || entry === '-0') return { entry: entry.replace('0', action.digit), overwrite: false };
      if (countDigits(entry) >= MAX_INPUT_DIGITS) return null;
      return { entry: entry + action.digit, overwrite: false };

    case 'decimal':
      if (startsNew) return { entry: '0.', overwrite: false };
      return entry.includes('.') ? null : { entry: `${entry}.`, overwrite: false };

    case 'delete': {
      if (entry === null) return null;
      if (state.overwrite) return { entry: '0', overwrite: false };
      const shortened = entry.slice(0, -1);
      return { entry: shortened === '' || shortened === '-' ? '0' : shortened, overwrite: false };
    }

    case 'toggleSign': {
      const value = entry ?? '0';
      return {
        entry: value.startsWith('-') ? value.slice(1) : `-${value}`,
        overwrite: entry === null ? false : state.overwrite,
      };
    }

    case 'recall':
      return { entry: String(action.value), overwrite: true };
  }
}

function applyEvaluation(
  state: CalculatorState,
  result: number,
  steps: number,
  nextOperator: Operator | null,
): CalculatorState {
  const { pending, tokens } = operandFor(state, nextOperator !== null);
  if (nextOperator === null) {
    return { ...initialState, entry: String(result), overwrite: true, expression: `${tokens.join(' ')} =` };
  }
  const nextTokens = [...tokens, OPERATOR_SYMBOLS[nextOperator]];
  return {
    ...initialState,
    entry: null,
    pending: [...pending.slice(0, pending.length - steps), { value: result, operator: nextOperator }],
    tokens: nextTokens,
    expression: nextTokens.join(' '),
  };
}

/**
 * The operand an operator or "=" applies to, plus the pending steps and
 * expression it joins. Pressing a second operator in a row replaces the
 * first, so that operand's step is reopened instead of adding a new one.
 */
export function operandFor(
  state: CalculatorState,
  isOperator: boolean,
): { pending: PendingStep[]; tokens: string[]; operand: number } {
  const last = state.pending.at(-1);
  if (isOperator && state.entry === null && last) {
    return { pending: state.pending.slice(0, -1), tokens: state.tokens.slice(0, -1), operand: last.value };
  }
  return { pending: state.pending, tokens: [...state.tokens, operandText(state)], operand: currentValue(state) };
}

/** The expression line after √ or %: "2 + √(9)" inside an expression, "√(9) =" on its own. */
export function immediateExpression(state: CalculatorState, calculation: Calculation): string {
  const description = describeCalculation(calculation);
  return state.pending.length === 0 ? `${description} =` : [...state.tokens, description].join(' ');
}

/** How the current operand is written in the expression, e.g. "12", "(−3)" or "√(9)". */
function operandText(state: CalculatorState): string {
  if (state.entryLabel !== null) return state.entryLabel;
  const value = currentValue(state);
  const text = formatNumber(value);
  return value < 0 && state.tokens.length > 0 ? `(${text})` : text;
}

function countDigits(entry: string): number {
  return entry.replace(/\D/g, '').length;
}

/** The number on screen, which is also the operand the next operation will use. */
export function currentValue(state: CalculatorState): number {
  return state.entry === null ? (state.pending.at(-1)?.value ?? 0) : Number(state.entry);
}

/**
 * What "%" takes a percentage of. After + or − it is the number before the
 * operator, so "50 + 10%" adds 10% of 50; everywhere else it is 1, so "50%" is 0.5.
 */
export function percentageBase(state: CalculatorState): number {
  const last = state.pending.at(-1);
  return last && (last.operator === 'add' || last.operator === 'subtract') ? last.value : 1;
}

/** The main display text. */
export function displayValue(state: CalculatorState): string {
  if (state.entry === null || state.overwrite) {
    return formatNumber(currentValue(state));
  }
  return formatEntry(state.entry);
}
