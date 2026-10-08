import { describe, expect, it } from 'vitest';
import { describeCalculation, evaluatesBefore, stepsToEvaluate } from './operations';

describe('evaluatesBefore', () => {
  it.each([
    ['multiply', 'add', true],
    ['divide', 'subtract', true],
    ['add', 'add', true],
    ['multiply', 'divide', true],
    ['power', 'multiply', true],
    ['add', 'multiply', false],
    ['multiply', 'power', false],
    ['power', 'power', false],
  ] as const)('%s before %s: %s', (pending, next, expected) => {
    expect(evaluatesBefore(pending, next)).toBe(expected);
  });

  it('evaluates everything before "="', () => {
    expect(evaluatesBefore('add', null)).toBe(true);
  });
});

describe('stepsToEvaluate', () => {
  it.each([
    { pending: ['add'], next: 'multiply', steps: 0, example: '2 + 3 ×: wait' },
    { pending: ['multiply'], next: 'add', steps: 1, example: '2 × 3 +: do 2 × 3' },
    { pending: ['add', 'multiply'], next: 'subtract', steps: 2, example: '1 + 2 × 3 −: do both' },
    { pending: ['add', 'power'], next: 'multiply', steps: 1, example: '1 + 2 ^ 3 ×: do 2 ^ 3 only' },
    { pending: ['power'], next: 'power', steps: 0, example: '2 ^ 3 ^: wait (right-associative)' },
    { pending: ['add', 'multiply', 'power'], next: null, steps: 3, example: '"=": do everything' },
    { pending: [], next: 'add', steps: 0, example: 'nothing pending' },
  ] as const)('$example', ({ pending, next, steps }) => {
    expect(stepsToEvaluate(pending, next)).toBe(steps);
  });
});

describe('describeCalculation', () => {
  it.each([
    [{ operation: 'multiply', a: 12, b: 3 }, '12 × 3'],
    [{ operation: 'subtract', a: -1500, b: 0.5 }, '−1,500 − 0.5'],
    [{ operation: 'sqrt', a: 9 }, '√(9)'],
    [{ operation: 'percentage', a: 10, b: 50 }, '10%'],
  ] as const)('describes %o as %s', (calculation, expected) => {
    expect(describeCalculation(calculation)).toBe(expected);
  });
});
