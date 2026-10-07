import { useCalculator } from '../hooks/useCalculator';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import styles from './Calculator.module.css';
import { Display } from './Display';
import { Keypad } from './Keypad';

export function Calculator() {
  const { display, expression, error, isCalculating, press } = useCalculator();
  const activeKeyId = useKeyboardShortcuts((key) => press(key.input));

  return (
    <main className={styles.page}>
      <section className={styles.calculator} aria-labelledby="calculator-title">
        <h1 id="calculator-title" className={styles.visuallyHidden}>
          Calculator
        </h1>
        <Display value={display} expression={expression} error={error} isCalculating={isCalculating} />
        <Keypad onPress={press} activeKeyId={activeKeyId} />
      </section>
    </main>
  );
}
