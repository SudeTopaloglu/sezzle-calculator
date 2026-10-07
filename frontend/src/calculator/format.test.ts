import { describe, expect, it } from 'vitest';
import { formatCurrency, formatEntry, formatNumber, formatPlain } from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [42, '42'],
    [-42, '−42'],
    [1234567.891, '1,234,567.891'],
    [0.1 + 0.2, '0.3'],
    [2 / 3, '0.666666666666667'],
    [0.000001, '0.000001'],
    [999_999_999_999_999, '999,999,999,999,999'],
    [1e15, '1e15'],
    [1.5e21, '1.5e21'],
    [-2.5e-7, '−2.5e-7'],
    [1 / 3e10, '3.33333333e-11'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

describe('formatEntry', () => {
  it.each([
    ['0', '0'],
    ['0.', '0.'],
    ['1234', '1,234'],
    ['1234.500', '1,234.500'],
    ['-1234567', '−1,234,567'],
    ['-0', '−0'],
  ])('formats %s as %s', (entry, expected) => {
    expect(formatEntry(entry)).toBe(expected);
  });
});

describe('formatPlain', () => {
  it.each([
    [1234.5, '1234.5'],
    [-42, '-42'],
    [0.1 + 0.2, '0.3'],
    [1.5e21, '1.5e+21'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatPlain(value)).toBe(expected);
  });
});

describe('formatCurrency', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [2501, '$25.01'],
    [123456789, '$1,234,567.89'],
    [Number.MAX_SAFE_INTEGER, '$90,071,992,547,409.91'],
  ])('formats %s cents as %s', (cents, expected) => {
    expect(formatCurrency(cents)).toBe(expected);
  });
});
