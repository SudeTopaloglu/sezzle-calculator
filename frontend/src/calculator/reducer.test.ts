import { describe, expect, it } from 'vitest';
import {
  calculatorReducer,
  currentValue,
  displayValue,
  initialState,
  MAX_INPUT_DIGITS,
  operandFor,
  percentageBase,
  type CalculatorAction,
  type CalculatorState,
  type Digit,
} from './reducer';

function reduce(actions: CalculatorAction[], state: CalculatorState = initialState): CalculatorState {
  return actions.reduce(calculatorReducer, state);
}

/** Types numbers and queues operators, e.g. "12+3*" (operators never evaluate here). */
function type(keys: string): CalculatorAction[] {
  const operators = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '^': 'power' } as const;
  return [...keys].map((key): CalculatorAction => {
    if (key === '.') return { type: 'decimal' };
    if (key in operators) return { type: 'operator', operator: operators[key as keyof typeof operators] };
    return { type: 'digit', digit: key as Digit };
  });
}

describe('number entry', () => {
  it('starts at zero', () => {
    expect(displayValue(initialState)).toBe('0');
  });

  it('replaces the leading zero', () => {
    expect(reduce(type('007')).entry).toBe('7');
  });

  it('builds multi-digit numbers with grouping', () => {
    expect(displayValue(reduce(type('1234567')))).toBe('1,234,567');
  });

  it('allows a single decimal point', () => {
    expect(reduce(type('1.2.3')).entry).toBe('1.23');
  });

  it('starts decimals with a leading zero', () => {
    expect(reduce(type('.5')).entry).toBe('0.5');
  });

  it(`stops accepting digits after ${MAX_INPUT_DIGITS}`, () => {
    expect(reduce(type('1234567890123456789')).entry).toBe('123456789012345');
  });

  it('does not count the sign and decimal point as digits', () => {
    const state = reduce([...type('1.2345678901234'), { type: 'toggleSign' }, ...type('56')]);
    expect(state.entry).toBe('-1.23456789012345');
  });
});

describe('delete', () => {
  it('removes the last character', () => {
    expect(reduce([...type('123'), { type: 'delete' }]).entry).toBe('12');
  });

  it('falls back to zero when everything is deleted', () => {
    expect(reduce([...type('5'), { type: 'toggleSign' }, { type: 'delete' }]).entry).toBe('0');
    expect(reduce([...type('5'), { type: 'delete' }]).entry).toBe('0');
  });

  it('clears a result instead of editing it', () => {
    const state = reduce([{ type: 'delete' }], { ...initialState, entry: '42', overwrite: true });
    expect(state).toMatchObject({ entry: '0', overwrite: false });
  });

  it('does nothing while waiting for the next operand', () => {
    const waiting = reduce(type('5+'));
    expect(reduce([{ type: 'delete' }], waiting)).toBe(waiting);
  });
});

describe('toggle sign', () => {
  it('negates and restores the entry', () => {
    const negative = reduce([...type('12'), { type: 'toggleSign' }]);
    expect(displayValue(negative)).toBe('−12');
    expect(reduce([{ type: 'toggleSign' }], negative).entry).toBe('12');
  });

  it('lets the user type a negative number from zero', () => {
    expect(reduce([{ type: 'toggleSign' }, ...type('7')]).entry).toBe('-7');
  });

  it('starts a negative operand after an operator', () => {
    expect(reduce([...type('5+'), { type: 'toggleSign' }])).toMatchObject({ entry: '-0', overwrite: false });
  });
});

describe('operators', () => {
  it('queue the operand and show the expression so far', () => {
    const state = reduce(type('2+3*'));
    expect(state.pending).toEqual([
      { value: 2, operator: 'add' },
      { value: 3, operator: 'multiply' },
    ]);
    expect(state).toMatchObject({ entry: null, expression: '2 + 3 ×' });
    expect(displayValue(state)).toBe('3');
  });

  it('keep the expression line while the next operand is typed', () => {
    expect(reduce(type('2+34')).expression).toBe('2 +');
  });

  it('replace an operator chosen right after another', () => {
    const state = reduce(type('12*-'));
    expect(state.pending).toEqual([{ value: 12, operator: 'subtract' }]);
    expect(state.expression).toBe('12 −');
  });

  it('wrap negative operands in parentheses', () => {
    const state = reduce([...type('5*3'), { type: 'toggleSign' }, ...type('+')]);
    expect(state.expression).toBe('5 × (−3) +');
  });
});

describe('operandFor', () => {
  it('adds the current operand to the expression', () => {
    expect(operandFor(reduce(type('2+3')), true)).toEqual({
      pending: [{ value: 2, operator: 'add' }],
      tokens: ['2', '+', '3'],
      operand: 3,
    });
  });

  it('reopens the last step when an operator follows an operator', () => {
    expect(operandFor(reduce(type('2+3*')), true)).toEqual({
      pending: [{ value: 2, operator: 'add' }],
      tokens: ['2', '+', '3'],
      operand: 3,
    });
  });

  it('reuses the last operand for "=" right after an operator', () => {
    expect(operandFor(reduce(type('5*')), false)).toEqual({
      pending: [{ value: 5, operator: 'multiply' }],
      tokens: ['5', '×', '5'],
      operand: 5,
    });
  });
});

describe('evaluation results', () => {
  it('marks the state as calculating', () => {
    expect(reduce([{ type: 'calculationStarted' }]).isCalculating).toBe(true);
  });

  it('shows the result and the full expression after "="', () => {
    const state = reduce(
      [{ type: 'calculationStarted' }, { type: 'evaluated', result: 14, steps: 2, nextOperator: null }],
      reduce(type('2+3*4')),
    );
    expect(state).toMatchObject({ entry: '14', overwrite: true, pending: [], expression: '2 + 3 × 4 =', isCalculating: false });
  });

  it('keeps lower-precedence steps pending when an operator evaluates part of the expression', () => {
    // "1 + 2 × 3 −": 2 × 3 = 6 and 1 + 6 = 7 are both evaluated, then − is queued.
    const state = reduce([{ type: 'evaluated', result: 7, steps: 2, nextOperator: 'subtract' }], reduce(type('1+2*3')));
    expect(state.pending).toEqual([{ value: 7, operator: 'subtract' }]);
    expect(state.expression).toBe('1 + 2 × 3 −');
    expect(displayValue(state)).toBe('7');
  });

  it('evaluates only the steps it is told to', () => {
    // "1 + 2 ^ 3 ×": only 2 ^ 3 = 8 is evaluated; 1 + waits for the × to finish.
    const state = reduce([{ type: 'evaluated', result: 8, steps: 1, nextOperator: 'multiply' }], reduce(type('1+2^3')));
    expect(state.pending).toEqual([
      { value: 1, operator: 'add' },
      { value: 8, operator: 'multiply' },
    ]);
  });

  it('starts a new number when typing after a result', () => {
    const result = reduce([{ type: 'evaluated', result: 15, steps: 1, nextOperator: null }], reduce(type('12+3')));
    expect(reduce(type('7'), result)).toMatchObject({ entry: '7', expression: '' });
    expect(reduce(type('.'), result).entry).toBe('0.');
  });

  it('continues from a result', () => {
    const result = reduce([{ type: 'evaluated', result: 15, steps: 1, nextOperator: null }], reduce(type('12+3')));
    expect(reduce(type('+'), result).expression).toBe('15 +');
  });

  it('formats results for display', () => {
    const state = reduce([{ type: 'evaluated', result: 0.30000000000000004, steps: 1, nextOperator: null }], reduce(type('.1+.2')));
    expect(displayValue(state)).toBe('0.3');
  });
});

describe('immediate operations', () => {
  it('complete a standalone calculation', () => {
    const state = reduce([
      { type: 'immediateApplied', calculation: { operation: 'percentage', a: 50, b: 1 }, result: 0.5 },
    ], reduce(type('50')));
    expect(state).toMatchObject({ entry: '0.5', overwrite: true, entryLabel: null, expression: '50% =' });
  });

  it('become the next operand inside an expression', () => {
    const state = reduce(
      [{ type: 'immediateApplied', calculation: { operation: 'sqrt', a: 9 }, result: 3 }],
      reduce(type('12+9')),
    );
    expect(state).toMatchObject({ entry: '3', entryLabel: '√(9)', expression: '12 + √(9)' });
    expect(currentValue(state)).toBe(3);
    expect(reduce(type('*'), state).expression).toBe('12 + √(9) ×');
  });

  it('show a percentage inside an addition as "50 + 10%"', () => {
    const state = reduce(
      [{ type: 'immediateApplied', calculation: { operation: 'percentage', a: 10, b: 50 }, result: 5 }],
      reduce(type('50+10')),
    );
    expect(state).toMatchObject({ entry: '5', expression: '50 + 10%' });
  });
});

describe('percentageBase', () => {
  it('is the number before + or −', () => {
    expect(percentageBase(reduce(type('50+10')))).toBe(50);
    expect(percentageBase(reduce(type('50-10')))).toBe(50);
  });

  it('is 1 everywhere else', () => {
    expect(percentageBase(reduce(type('50*10')))).toBe(1);
    expect(percentageBase(reduce(type('50/10')))).toBe(1);
    expect(percentageBase(reduce(type('100+2*10')))).toBe(1);
    expect(percentageBase(reduce(type('50')))).toBe(1);
  });
});

describe('recall', () => {
  it('shows the recalled number as a result', () => {
    const state = reduce([...type('9'), { type: 'recall', value: 162.46 }]);
    expect(state).toMatchObject({ entry: '162.46', overwrite: true, expression: '' });
    expect(reduce(type('1'), state).entry).toBe('1');
  });

  it('becomes the next operand when an operator is pending', () => {
    const state = reduce([...type('100+'), { type: 'recall', value: 36 }]);
    expect(state).toMatchObject({ entry: '36', expression: '100 +' });
    expect(state.pending).toEqual([{ value: 100, operator: 'add' }]);
  });
});

describe('errors', () => {
  const failed = reduce([{ type: 'calculationFailed', expression: '2 + 8 ÷ 0 =', message: 'Cannot divide by zero' }], reduce(type('2+8/0')));

  it('reset the calculation and show the error', () => {
    expect(failed).toMatchObject({ error: 'Cannot divide by zero', expression: '2 + 8 ÷ 0 =', pending: [], isCalculating: false });
  });

  it('start over on the next input', () => {
    expect(reduce(type('4'), failed)).toMatchObject({ entry: '4', error: null, expression: '' });
  });

  it('are replaced by a recalled number', () => {
    expect(reduce([{ type: 'recall', value: 7 }], failed)).toMatchObject({ entry: '7', error: null });
  });

  it('clear back to the initial state', () => {
    expect(reduce([{ type: 'clear' }], failed)).toEqual(initialState);
  });
});
