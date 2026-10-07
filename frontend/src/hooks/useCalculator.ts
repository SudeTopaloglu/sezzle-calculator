import { useReducer, useRef } from 'react';
import { calculate, CalculatorApiError } from '../api/calculatorApi';
import type { KeyInput } from '../calculator/keys';
import type { BinaryOperation, Calculation } from '../calculator/operations';
import { calculatorReducer, currentValue, displayValue, initialState } from '../calculator/reducer';

const ERROR_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  NEGATIVE_SQUARE_ROOT: 'No real square root',
  UNDEFINED_RESULT: 'Result is undefined',
  RESULT_OUT_OF_RANGE: 'Result is too large',
  NETWORK_ERROR: 'Service unavailable',
  UNEXPECTED_RESPONSE: 'Service unavailable',
};

function toUserMessage(error: unknown): string {
  return (error instanceof CalculatorApiError && ERROR_MESSAGES[error.code]) || 'Something went wrong';
}

/**
 * Connects the calculator state machine to the backend: editing keys update
 * local state, while operations are sent to the API.
 */
export function useCalculator(calculateFn: (calculation: Calculation) => Promise<number> = calculate) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  // A ref, not state, so a second key press in the same render is also ignored.
  const isBusy = useRef(false);

  async function run(calculation: Calculation, nextOperator: BinaryOperation | null = null) {
    isBusy.current = true;
    dispatch({ type: 'calculationStarted' });
    try {
      const result = await calculateFn(calculation);
      dispatch({ type: 'calculationSucceeded', calculation, result, nextOperator });
    } catch (error) {
      dispatch({ type: 'calculationFailed', calculation, message: toUserMessage(error) });
    } finally {
      isBusy.current = false;
    }
  }

  function press(input: KeyInput) {
    if (isBusy.current) {
      return;
    }
    if (state.error !== null && (input.type === 'equals' || input.type === 'unary')) {
      dispatch({ type: 'clear' });
      return;
    }

    switch (input.type) {
      case 'operator':
        // "2 + 3 ×" first resolves 2 + 3, then continues with ×.
        if (state.pendingOperator !== null && state.entry !== null) {
          void run({ operation: state.pendingOperator, a: state.accumulator ?? 0, b: currentValue(state) }, input.operator);
        } else {
          dispatch(input);
        }
        return;
      case 'equals':
        // Without a second operand the first one is reused: "5 × =" gives 25.
        if (state.pendingOperator !== null) {
          void run({ operation: state.pendingOperator, a: state.accumulator ?? 0, b: currentValue(state) });
        }
        return;
      case 'unary':
        void run({ operation: input.operation, a: currentValue(state) });
        return;
      default:
        dispatch(input);
    }
  }

  return {
    display: displayValue(state),
    expression: state.expression,
    error: state.error,
    isCalculating: state.isCalculating,
    press,
  };
}
