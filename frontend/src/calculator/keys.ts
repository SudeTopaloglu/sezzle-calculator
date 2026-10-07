import type { ImmediateOperation, Operator } from './operations';
import type { CalculatorAction, Digit } from './reducer';

/** What a key does, whether it is clicked on screen or typed on a keyboard. */
export type KeyInput =
  | Extract<CalculatorAction, { type: 'digit' | 'decimal' | 'delete' | 'clear' | 'toggleSign' | 'operator' }>
  | { type: 'immediate'; operation: ImmediateOperation }
  | { type: 'equals' };

export type KeyVariant = 'digit' | 'function' | 'operator' | 'equals';

export interface KeyDefinition {
  id: string;
  label: string;
  /** Accessible name, for keys whose label is a symbol. */
  ariaLabel?: string;
  input: KeyInput;
  variant: KeyVariant;
  /** KeyboardEvent.key values that trigger this key. */
  shortcuts: readonly string[];
  /** Keys that cover two grid cells. */
  span?: 'wide' | 'tall';
}

const digit = (value: Digit, span?: KeyDefinition['span']): KeyDefinition => ({
  id: `digit-${value}`,
  label: value,
  input: { type: 'digit', digit: value },
  variant: 'digit',
  shortcuts: [value],
  span,
});

const operator = (
  operation: Operator,
  label: string,
  ariaLabel: string,
  shortcuts: string[],
  variant: KeyVariant = 'operator',
): KeyDefinition => ({
  id: operation,
  label,
  ariaLabel,
  input: { type: 'operator', operator: operation },
  variant,
  shortcuts,
});

/** Keys in visual order, filling a four-column grid left to right. */
export const KEYS: readonly KeyDefinition[] = [
  { id: 'clear', label: 'AC', ariaLabel: 'All clear', input: { type: 'clear' }, variant: 'function', shortcuts: ['Escape', 'Delete'] },
  { id: 'delete', label: 'DEL', ariaLabel: 'Delete', input: { type: 'delete' }, variant: 'function', shortcuts: ['Backspace'] },
  { id: 'percentage', label: '%', ariaLabel: 'Percent', input: { type: 'immediate', operation: 'percentage' }, variant: 'function', shortcuts: ['%'] },
  operator('divide', '÷', 'Divide', ['/']),

  { id: 'sqrt', label: '√', ariaLabel: 'Square root', input: { type: 'immediate', operation: 'sqrt' }, variant: 'function', shortcuts: ['r'] },
  operator('power', 'xʸ', 'Power', ['^'], 'function'),
  { id: 'toggle-sign', label: '±', ariaLabel: 'Toggle sign', input: { type: 'toggleSign' }, variant: 'function', shortcuts: ['n'] },
  operator('multiply', '×', 'Multiply', ['*', 'x']),

  digit('7'), digit('8'), digit('9'),
  operator('subtract', '−', 'Subtract', ['-']),

  digit('4'), digit('5'), digit('6'),
  operator('add', '+', 'Add', ['+']),

  digit('1'), digit('2'), digit('3'),
  { id: 'equals', label: '=', ariaLabel: 'Equals', input: { type: 'equals' }, variant: 'equals', shortcuts: ['Enter', '='], span: 'tall' },

  digit('0', 'wide'),
  { id: 'decimal', label: '.', ariaLabel: 'Decimal point', input: { type: 'decimal' }, variant: 'digit', shortcuts: ['.', ','] },
];
