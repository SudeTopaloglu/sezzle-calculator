import styles from './Display.module.css';

interface DisplayProps {
  value: string;
  expression: string;
  error: string | null;
  isCalculating: boolean;
}

/** Long values get a smaller font so they always fit on one line. */
function sizeFor(text: string): 'large' | 'medium' | 'small' {
  if (text.length <= 9) return 'large';
  if (text.length <= 13) return 'medium';
  return 'small';
}

export function Display({ value, expression, error, isCalculating }: DisplayProps) {
  const text = error ?? value;

  return (
    <output className={styles.display} aria-live="polite" aria-busy={isCalculating}>
      <span className={styles.expression} data-testid="display-expression">
        {expression}
      </span>
      <span
        className={styles.value}
        data-testid="display-value"
        data-size={sizeFor(text)}
        data-error={error !== null || undefined}
      >
        {text}
      </span>
    </output>
  );
}
