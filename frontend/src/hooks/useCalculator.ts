import { useReducer, useRef } from 'react';
import { calculate as calculateWithApi, toUserMessage } from '../api/calculatorApi';
import type { KeyInput } from '../calculator/keys';
import {
  describeCalculation,
  OPERATOR_SYMBOLS,
  stepsToEvaluate,
  type Calculation,
  type ImmediateOperation,
  type Operator,
} from '../calculator/operations';
import {
  calculatorReducer,
  currentValue,
  displayValue,
  immediateExpression,
  initialState,
  operandFor,
  percentageBase,
} from '../calculator/reducer';

interface Options {
  calculate?: (calculation: Calculation) => Promise<number>;
  /** Called when an expression is finished, e.g. "2 + 3 × 4" = 14, to record it in the history. */
  onCompleted?: (expression: string, result: number) => void;
}

/**
 * Connects the calculator state machine to the backend: editing keys update
 * local state, while every arithmetic step is sent to the API.
 */
export function useCalculator({ calculate = calculateWithApi, onCompleted }: Options = {}) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  // A ref, not state, so a second key press in the same render is also ignored.
  const isBusy = useRef(false);

  /** Marks the calculator busy while the task talks to the API, and shows failures. */
  async function run(task: () => Promise<void>, failedExpression: string) {
    isBusy.current = true;
    dispatch({ type: 'calculationStarted' });
    try {
      await task();
    } catch (error) {
      dispatch({ type: 'calculationFailed', expression: failedExpression, message: toUserMessage(error) });
    } finally {
      isBusy.current = false;
    }
  }

  /** Applies an operator, or "=" when nextOperator is null, evaluating whatever must come first. */
  function evaluate(nextOperator: Operator | null) {
    const { pending, tokens, operand } = operandFor(state, nextOperator !== null);
    const steps = stepsToEvaluate(
      pending.map((step) => step.operator),
      nextOperator,
    );
    if (nextOperator !== null && steps === 0) {
      dispatch({ type: 'operator', operator: nextOperator });
      return;
    }

    const expression = tokens.join(' ');
    const ending = nextOperator === null ? '=' : OPERATOR_SYMBOLS[nextOperator];
    void run(async () => {
      // Evaluate from the most recent step down: in "2 + 3 × 4", first 3 × 4, then 2 + 12.
      let result = operand;
      for (const step of pending.slice(pending.length - steps).reverse()) {
        result = await calculate({ operation: step.operator, a: step.value, b: result });
      }
      dispatch({ type: 'evaluated', result, steps, nextOperator });
      if (nextOperator === null) {
        onCompleted?.(expression, result);
      }
    }, `${expression} ${ending}`);
  }

  function applyImmediate(operation: ImmediateOperation) {
    const a = currentValue(state);
    const calculation: Calculation =
      operation === 'sqrt' ? { operation, a } : { operation, a, b: percentageBase(state) };

    void run(async () => {
      const result = await calculate(calculation);
      dispatch({ type: 'immediateApplied', calculation, result });
      if (state.pending.length === 0) {
        onCompleted?.(describeCalculation(calculation), result);
      }
    }, immediateExpression(state, calculation));
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
        evaluate(input.operator);
        return;
      case 'equals':
        // Without a second operand the last one is reused: "5 × =" gives 25.
        if (state.pending.length > 0) {
          evaluate(null);
        }
        return;
      case 'immediate':
        applyImmediate(input.operation);
        return;
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
