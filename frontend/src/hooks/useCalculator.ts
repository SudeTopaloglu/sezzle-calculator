import { useReducer, useRef } from 'react';
import { calculate as calculateWithApi, toUserMessage } from '../api/calculatorApi';
import type { KeyInput } from '../calculator/keys';
import type { Calculation, Operator } from '../calculator/operations';
import { calculatorReducer, currentValue, displayValue, initialState, percentageBase } from '../calculator/reducer';

interface Options {
  calculate?: (calculation: Calculation) => Promise<number>;
  /** Called after every successful calculation, e.g. to record it in the history. */
  onCalculated?: (calculation: Calculation, result: number) => void;
}

/**
 * Connects the calculator state machine to the backend: editing keys update
 * local state, while operations are sent to the API.
 */
export function useCalculator({ calculate = calculateWithApi, onCalculated }: Options = {}) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  // A ref, not state, so a second key press in the same render is also ignored.
  const isBusy = useRef(false);

  async function run(calculation: Calculation, nextOperator: Operator | null = null) {
    isBusy.current = true;
    dispatch({ type: 'calculationStarted' });
    try {
      const result = await calculate(calculation);
      dispatch({ type: 'calculationSucceeded', calculation, result, nextOperator });
      onCalculated?.(calculation, result);
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
    if (state.error !== null && (input.type === 'equals' || input.type === 'immediate')) {
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
      case 'immediate': {
        const a = currentValue(state);
        void run(
          input.operation === 'sqrt'
            ? { operation: 'sqrt', a }
            : { operation: 'percentage', a, b: percentageBase(state) },
        );
        return;
      }
      default:
        dispatch(input);
    }
  }

  function recall(value: number) {
    if (!isBusy.current) {
      dispatch({ type: 'recall', value });
    }
  }

  return {
    display: displayValue(state),
    /** The number on screen, or null while an error is shown. */
    value: state.error === null ? currentValue(state) : null,
    expression: state.expression,
    error: state.error,
    isCalculating: state.isCalculating,
    press,
    recall,
  };
}
