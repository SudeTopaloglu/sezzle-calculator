import { useCallback, useState } from 'react';
import { formatPlain } from '../calculator/format';
import type { HistoryEntry } from '../calculator/history';
import { useCalculator } from '../hooks/useCalculator';
import { useHistory } from '../hooks/useHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useInstallments } from '../hooks/useInstallments';
import styles from './Calculator.module.css';
import { Display } from './Display';
import { HistoryPanel } from './HistoryPanel';
import { InstallmentsPanel } from './InstallmentsPanel';
import { Keypad } from './Keypad';
import { Toolbar } from './Toolbar';

type OpenPanel = 'history' | 'installments' | null;

export function Calculator() {
  const history = useHistory();
  const calculator = useCalculator({ onCompleted: history.add });
  const installments = useInstallments();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const activeKeyId = useKeyboardShortcuts((key) => calculator.press(key.input), openPanel === null);

  const closePanel = useCallback(() => setOpenPanel(null), []);
  const { value, recall } = calculator;
  const usable = value !== null && !calculator.isCalculating;

  function openInstallments() {
    if (usable) {
      installments.start(value);
      setOpenPanel('installments');
    }
  }

  function reuseHistoryEntry(entry: HistoryEntry) {
    recall(entry.result);
    closePanel();
  }

  return (
    <main className={styles.page}>
      <section className={styles.calculator} aria-labelledby="calculator-title">
        <h1 id="calculator-title" className="visually-hidden">
          Calculator
        </h1>
        {/* Inert while a panel is open, so focus and screen readers stay in the panel. */}
        <div className={styles.content} inert={openPanel !== null}>
          <Toolbar
            onOpenHistory={() => setOpenPanel('history')}
            onOpenInstallments={openInstallments}
            copyText={usable ? formatPlain(value) : null}
          />
          <Display
            value={calculator.display}
            expression={calculator.expression}
            error={calculator.error}
            isCalculating={calculator.isCalculating}
          />
          <Keypad onPress={calculator.press} activeKeyId={activeKeyId} />
        </div>

        <HistoryPanel
          open={openPanel === 'history'}
          entries={history.entries}
          onSelect={reuseHistoryEntry}
          onClear={history.clear}
          onClose={closePanel}
        />
        <InstallmentsPanel open={openPanel === 'installments'} state={installments.state} onClose={closePanel} />
      </section>
    </main>
  );
}
