import { useCopy } from '../hooks/useCopy';
import { CheckIcon, CopyIcon, HistoryIcon, QuartersIcon } from './icons';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onOpenHistory: () => void;
  onOpenInstallments: () => void;
  /** Text the copy button puts on the clipboard; null disables copying and Pay in 4. */
  copyText: string | null;
}

const COPY_FEEDBACK = { idle: '', copied: 'Copied', failed: 'Copy failed' } as const;

export function Toolbar({ onOpenHistory, onOpenInstallments, copyText }: ToolbarProps) {
  const { status, copy } = useCopy();

  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.iconButton} aria-label="History" onClick={onOpenHistory}>
        <HistoryIcon />
      </button>

      <div className={styles.end}>
        <span className={styles.copy}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Copy result"
            data-status={status}
            disabled={copyText === null}
            onClick={() => copyText !== null && void copy(copyText)}
          >
            {status === 'copied' ? <CheckIcon /> : <CopyIcon />}
          </button>
          <span className={styles.feedback} data-status={status} role="status">
            {COPY_FEEDBACK[status]}
          </span>
        </span>
        <button type="button" className={styles.payButton} disabled={copyText === null} onClick={onOpenInstallments}>
          <QuartersIcon width={18} height={18} />
          Pay in 4
        </button>
      </div>
    </div>
  );
}
