import { useCallback, useState } from 'react';
import { formatPlain } from '../calculator/format';
import type { HistoryEntry } from '../calculator/history';
import { useCalculator } from '../hooks/useCalculator';
import { useHistory } from '../hooks/useHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSplit } from '../hooks/useSplit';
import styles from './Calculator.module.css';
import { Display } from './Display';
import { HistoryPanel } from './HistoryPanel';
import { Keypad } from './Keypad';
import { SplitPanel } from './SplitPanel';
import { Toolbar } from './Toolbar';

type OpenPanel = 'history' | 'split' | null;

export function Calculator() {
  const history = useHistory();
  const calculator = useCalculator({ onCalculated: history.add });
  const split = useSplit();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const activeKeyId = useKeyboardShortcuts((key) => calculator.press(key.input), openPanel === null);

  const closePanel = useCallback(() => setOpenPanel(null), []);
  const { value, recall } = calculator;
  const usable = value !== null && !calculator.isCalculating;

  function openSplit() {
    if (usable) {
      split.start(value);
      setOpenPanel('split');
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
            onOpenSplit={openSplit}
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
        <SplitPanel open={openPanel === 'split'} state={split.state} onClose={closePanel} />
      </section>
    </main>
  );
}
