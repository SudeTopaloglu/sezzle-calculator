/** float64 is reliable to 15 significant digits; rounding there hides floating-point noise. */
const MAX_SIGNIFICANT_DIGITS = 15;
/** Magnitudes outside [1e-6, 1e15) are shown in scientific notation. */
const MIN_PLAIN_MAGNITUDE = 1e-6;
const MAX_PLAIN_MAGNITUDE = 1e15;
const MINUS_SIGN = '\u2212'; // typographic minus, as wide as "+"

/**
 * Formats a computed number for display, e.g. 1234.5 → "1,234.5",
 * 0.1 + 0.2 → "0.3" and 1.5e21 → "1.5e21".
 */
export function formatNumber(value: number): string {
  if (value === 0) {
    return '0';
  }
  const magnitude = Math.abs(value);
  const text =
    magnitude < MIN_PLAIN_MAGNITUDE || magnitude >= MAX_PLAIN_MAGNITUDE
      ? formatScientific(magnitude)
      : groupThousands(String(Number(magnitude.toPrecision(MAX_SIGNIFICANT_DIGITS))));
  return value < 0 ? MINUS_SIGN + text : text;
}

/**
 * Formats a number the user is still typing. The text is kept exactly as
 * typed (including a trailing "." or zeros) and only gains digit grouping.
 */
export function formatEntry(entry: string): string {
  return entry.startsWith('-') ? MINUS_SIGN + groupThousands(entry.slice(1)) : groupThousands(entry);
}

/**
 * Formats a number for pasting elsewhere: rounded like the display, but
 * without digit grouping or the typographic minus, e.g. "-1234.5".
 */
export function formatPlain(value: number): string {
  return String(Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS)));
}

/** Formats integer cents as US dollars, e.g. 123456 → "$1,234.56". Exact for any safe integer. */
export function formatCurrency(cents: number): string {
  const dollars = groupThousands(String(Math.trunc(cents / 100)));
  return `$${dollars}.${String(cents % 100).padStart(2, '0')}`;
}

function formatScientific(magnitude: number): string {
  const [mantissa, exponent] = magnitude.toExponential(8).split('e');
  return `${Number(mantissa)}e${exponent.replace('+', '')}`;
}

function groupThousands(digits: string): string {
  const [integer, fraction] = digits.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
