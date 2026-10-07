import { describe, expect, it } from 'vitest';
import {
  calculatorReducer,
  currentValue,
  displayValue,
  initialState,
  MAX_INPUT_DIGITS,
  percentageBase,
  type CalculatorAction,
  type CalculatorState,
  type Digit,
} from './reducer';

function reduce(actions: CalculatorAction[], state: CalculatorState = initialState): CalculatorState {
  return actions.reduce(calculatorReducer, state);
}

function typeDigits(digits: string): CalculatorAction[] {
  return [...digits].map((char) => (char === '.' ? { type: 'decimal' } : { type: 'digit', digit: char as Digit }));
}

describe('number entry', () => {
  it('starts at zero', () => {
    expect(displayValue(initialState)).toBe('0');
  });

  it('replaces the leading zero', () => {
    expect(reduce(typeDigits('007')).entry).toBe('7');
  });

  it('builds multi-digit numbers with grouping', () => {
    expect(displayValue(reduce(typeDigits('1234567')))).toBe('1,234,567');
  });

  it('allows a single decimal point', () => {
    expect(reduce(typeDigits('1.2.3')).entry).toBe('1.23');
  });

  it('starts decimals with a leading zero', () => {
    expect(reduce(typeDigits('.5')).entry).toBe('0.5');
  });

  it(`stops accepting digits after ${MAX_INPUT_DIGITS}`, () => {
    const state = reduce(typeDigits('1234567890123456789'));
    expect(state.entry).toBe('123456789012345');
  });

  it('does not count the sign and decimal point as digits', () => {
    const state = reduce([...typeDigits('1.2345678901234'), { type: 'toggleSign' }, ...typeDigits('56')]);
    expect(state.entry).toBe('-1.23456789012345');
  });
});

describe('delete', () => {
  it('removes the last character', () => {
    expect(reduce([...typeDigits('123'), { type: 'delete' }]).entry).toBe('12');
  });

  it('falls back to zero when everything is deleted', () => {
    expect(reduce([...typeDigits('5'), { type: 'toggleSign' }, { type: 'delete' }]).entry).toBe('0');
    expect(reduce([...typeDigits('5'), { type: 'delete' }]).entry).toBe('0');
  });

  it('clears a result instead of editing it', () => {
    const state = reduce([{ type: 'delete' }], { ...initialState, entry: '42', overwrite: true });
    expect(state).toMatchObject({ entry: '0', overwrite: false });
  });

  it('does nothing while waiting for the second operand', () => {
    const waiting = reduce([...typeDigits('5'), { type: 'operator', operator: 'add' }]);
    expect(reduce([{ type: 'delete' }], waiting)).toBe(waiting);
  });
});

describe('toggle sign', () => {
  it('negates and restores the entry', () => {
    const negative = reduce([...typeDigits('12'), { type: 'toggleSign' }]);
    expect(displayValue(negative)).toBe('−12');
    expect(reduce([{ type: 'toggleSign' }], negative).entry).toBe('12');
  });

  it('lets the user type a negative number from zero', () => {
    expect(reduce([{ type: 'toggleSign' }, ...typeDigits('7')]).entry).toBe('-7');
  });

  it('starts a negative second operand after an operator', () => {
    const state = reduce([...typeDigits('5'), { type: 'operator', operator: 'add' }, { type: 'toggleSign' }]);
    expect(state).toMatchObject({ entry: '-0', overwrite: false });
  });
});

describe('operators', () => {
  it('stores the first operand and shows it in the expression', () => {
    const state = reduce([...typeDigits('12'), { type: 'operator', operator: 'multiply' }]);
    expect(state).toMatchObject({ accumulator: 12, pendingOperator: 'multiply', entry: null, expression: '12 ×' });
    expect(displayValue(state)).toBe('12');
  });

  it('replaces an operator chosen right after another', () => {
    const state = reduce([
      ...typeDigits('12'),
      { type: 'operator', operator: 'multiply' },
      { type: 'operator', operator: 'subtract' },
    ]);
    expect(state).toMatchObject({ accumulator: 12, pendingOperator: 'subtract', expression: '12 −' });
  });
});

describe('calculation results', () => {
  const waitingForSecondOperand = reduce([...typeDigits('12'), { type: 'operator', operator: 'add' }, ...typeDigits('3')]);

  it('marks the state as calculating', () => {
    expect(reduce([{ type: 'calculationStarted' }]).isCalculating).toBe(true);
  });

  it('shows a binary result and the full expression', () => {
    const state = reduce(
      [
        { type: 'calculationStarted' },
        { type: 'calculationSucceeded', calculation: { operation: 'add', a: 12, b: 3 }, result: 15, nextOperator: null },
      ],
      waitingForSecondOperand,
    );
    expect(state).toMatchObject({ entry: '15', overwrite: true, pendingOperator: null, expression: '12 + 3 =', isCalculating: false });
  });

  it('wraps a negative second operand in parentheses', () => {
    const state = reduce([
      { type: 'calculationSucceeded', calculation: { operation: 'multiply', a: 2, b: -3 }, result: -6, nextOperator: null },
    ]);
    expect(state.expression).toBe('2 × (−3) =');
    expect(displayValue(state)).toBe('−6');
  });

  it('continues with the next operator when chaining', () => {
    const state = reduce(
      [{ type: 'calculationSucceeded', calculation: { operation: 'add', a: 12, b: 3 }, result: 15, nextOperator: 'divide' }],
      waitingForSecondOperand,
    );
    expect(state).toMatchObject({ accumulator: 15, pendingOperator: 'divide', entry: null, expression: '15 ÷' });
  });

  it('starts a new number when typing after a result', () => {
    const result = { ...initialState, entry: '15', overwrite: true };
    expect(reduce(typeDigits('7'), result).entry).toBe('7');
    expect(reduce(typeDigits('.'), result).entry).toBe('0.');
  });

  it('keeps the pending operation after a unary result', () => {
    const pending = reduce([...typeDigits('12'), { type: 'operator', operator: 'add' }, ...typeDigits('9')]);
    const state = reduce(
      [{ type: 'calculationSucceeded', calculation: { operation: 'sqrt', a: 9 }, result: 3, nextOperator: null }],
      pending,
    );
    expect(state).toMatchObject({ entry: '3', overwrite: true, accumulator: 12, pendingOperator: 'add', expression: '12 + √(9)' });
    expect(currentValue(state)).toBe(3);
  });

  it('shows a standalone unary result as an equation', () => {
    const state = reduce([
      { type: 'calculationSucceeded', calculation: { operation: 'percentage', a: 50, b: 1 }, result: 0.5, nextOperator: null },
    ]);
    expect(state.expression).toBe('50% =');
    expect(displayValue(state)).toBe('0.5');
  });

  it('shows a percentage inside a pending addition as "50 + 10%"', () => {
    const pending = reduce([...typeDigits('50'), { type: 'operator', operator: 'add' }, ...typeDigits('10')]);
    const state = reduce(
      [{ type: 'calculationSucceeded', calculation: { operation: 'percentage', a: 10, b: 50 }, result: 5, nextOperator: null }],
      pending,
    );
    expect(state).toMatchObject({ entry: '5', expression: '50 + 10%', pendingOperator: 'add', accumulator: 50 });
  });

  it('formats results for display', () => {
    const state = reduce([
      { type: 'calculationSucceeded', calculation: { operation: 'add', a: 0.1, b: 0.2 }, result: 0.30000000000000004, nextOperator: null },
    ]);
    expect(displayValue(state)).toBe('0.3');
  });
});

describe('errors', () => {
  const failed = reduce([
    { type: 'calculationFailed', calculation: { operation: 'divide', a: 8, b: 0 }, message: 'Cannot divide by zero' },
  ]);

  it('resets the calculation and shows the error', () => {
    expect(failed).toMatchObject({ error: 'Cannot divide by zero', expression: '8 ÷ 0 =', pendingOperator: null, isCalculating: false });
  });

  it('starts over on the next input', () => {
    expect(reduce(typeDigits('4'), failed)).toMatchObject({ entry: '4', error: null, expression: '' });
  });

  it('clears back to the initial state', () => {
    expect(reduce([{ type: 'clear' }], failed)).toEqual(initialState);
  });
});

describe('percentageBase', () => {
  const pendingWith = (operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'power') =>
    reduce([...typeDigits('50'), { type: 'operator', operator }, ...typeDigits('10')]);

  it('takes the percentage of the first operand when adding or subtracting', () => {
    expect(percentageBase(pendingWith('add'))).toBe(50);
    expect(percentageBase(pendingWith('subtract'))).toBe(50);
  });

  it('uses 1 for other operators and standalone percentages', () => {
    expect(percentageBase(pendingWith('multiply'))).toBe(1);
    expect(percentageBase(pendingWith('divide'))).toBe(1);
    expect(percentageBase(pendingWith('power'))).toBe(1);
    expect(percentageBase(reduce(typeDigits('50')))).toBe(1);
  });
});

describe('recall', () => {
  it('shows the recalled number as a result', () => {
    const state = reduce([...typeDigits('9'), { type: 'recall', value: 162.46 }]);
    expect(state).toMatchObject({ entry: '162.46', overwrite: true, expression: '' });
    expect(reduce(typeDigits('1'), state).entry).toBe('1');
  });

  it('becomes the second operand when an operator is pending', () => {
    const state = reduce([...typeDigits('100'), { type: 'operator', operator: 'add' }, { type: 'recall', value: 36 }]);
    expect(state).toMatchObject({ entry: '36', accumulator: 100, pendingOperator: 'add', expression: '100 +' });
  });

  it('replaces an error', () => {
    const failed = reduce([
      { type: 'calculationFailed', calculation: { operation: 'divide', a: 1, b: 0 }, message: 'Cannot divide by zero' },
    ]);
    expect(reduce([{ type: 'recall', value: 7 }], failed)).toMatchObject({ entry: '7', error: null });
  });
});
