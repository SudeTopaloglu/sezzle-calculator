import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../calculator/format';
import { groupHistory, type HistoryEntry } from '../calculator/history';
import { describeCalculation } from '../calculator/operations';
import styles from './HistoryPanel.module.css';
import { HistoryIcon } from './icons';
import { Panel } from './Panel';

interface HistoryPanelProps {
  open: boolean;
  entries: readonly HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onClose: () => void;
}

export function HistoryPanel({ open, entries, onSelect, onClear, onClose }: HistoryPanelProps) {
  const days = useMemo(() => groupHistory(entries), [entries]);
  const isEmpty = days.length === 0;

  return (
    <Panel
      title="History"
      subtitle={isEmpty ? undefined : 'Tap a result to use it'}
      placement="side"
      open={open}
      onClose={onClose}
      actions={!isEmpty && <ClearButton onClear={onClear} />}
    >
      {isEmpty ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <HistoryIcon width={28} height={28} />
          </span>
          <p className={styles.emptyTitle}>No calculations yet</p>
          <p className={styles.emptyText}>Your results will be saved here, even after a reload.</p>
        </div>
      ) : (
        <ol className={styles.days}>
          {days.map((day) => (
            <li key={day.id}>
              <h3 className={styles.dayLabel}>{day.label}</h3>
              <ol className={styles.groups}>
                {day.groups.map((group) => (
                  <li key={group.id} className={styles.tape}>
                    <time className={styles.time} dateTime={new Date(group.entries[0].timestamp).toISOString()}>
                      {formatTime(group.entries[0].timestamp)}
                    </time>
                    <ol className={styles.steps}>
                      {group.entries.map((entry) => (
                        <li key={entry.id}>
                          <button type="button" className={styles.step} onClick={() => onSelect(entry)}>
                            <span className={styles.expression}>{describeCalculation(entry.calculation)}</span>{' '}
                            <span className={styles.result}>= {formatNumber(entry.result)}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

const CONFIRM_TIMEOUT_MS = 3_000;

/** Clearing takes two taps, so history isn't lost to a stray click. */
function ClearButton({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <button
      type="button"
      className={styles.clear}
      data-confirming={confirming || undefined}
      onClick={() => {
        if (confirming) {
          onClear();
        }
        setConfirming(!confirming);
      }}
    >
      {confirming ? 'Clear all?' : 'Clear'}
    </button>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
