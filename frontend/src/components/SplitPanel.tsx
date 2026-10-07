import type { ReactNode } from 'react';
import { formatCurrency } from '../calculator/format';
import type { SplitState } from '../hooks/useSplit';
import { InfoIcon } from './icons';
import { Panel } from './Panel';
import styles from './SplitPanel.module.css';

interface SplitPanelProps {
  open: boolean;
  state: SplitState;
  onClose: () => void;
}

export function SplitPanel({ open, state, onClose }: SplitPanelProps) {
  return (
    <Panel title="Split in 4" subtitle="Equal payments every 2 weeks" placement="bottom" open={open} onClose={onClose}>
      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        <SplitContent state={state} />
      </div>
    </Panel>
  );
}

function SplitContent({ state }: { state: SplitState }) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <ScheduleSkeleton />;
    case 'invalid':
      return <Notice>{state.message}</Notice>;
    case 'error':
      return (
        <Notice>
          {state.message}
          {state.retry && (
            <button type="button" className={styles.retry} onClick={state.retry}>
              Try again
            </button>
          )}
        </Notice>
      );
    case 'success': {
      const { plan, rounded } = state;
      return (
        <>
          <div className={styles.total}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalAmount}>{formatCurrency(plan.amountCents)}</span>
            {rounded && <span className={styles.rounded}>Rounded to the nearest cent</span>}
          </div>
          <ol className={styles.schedule}>
            {plan.payments.map((payment) => (
              <li key={payment.number} className={styles.payment}>
                <ProgressRing step={payment.number} steps={plan.payments.length} />
                <span className={styles.when}>
                  <span className={styles.relative}>{describeDue(payment.dueInDays)}</span>
                  <span className={styles.date}>{formatDueDate(payment.dueInDays)}</span>
                </span>
                <span className={styles.amount}>{formatCurrency(payment.amountCents)}</span>
              </li>
            ))}
          </ol>
        </>
      );
    }
  }
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className={styles.notice}>
      <InfoIcon className={styles.noticeIcon} />
      <p className={styles.noticeText}>{children}</p>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div aria-label="Loading payment plan">
      <div className={`${styles.total} ${styles.skeleton}`} />
      <ol className={styles.schedule}>
        {[1, 2, 3, 4].map((step) => (
          <li key={step} className={`${styles.payment} ${styles.skeletonRow}`} />
        ))}
      </ol>
    </div>
  );
}

/** A ring that fills a quarter more with each payment. */
function ProgressRing({ step, steps }: { step: number; steps: number }) {
  return (
    <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden="true">
      <circle className={styles.ringTrack} cx="18" cy="18" r="14" />
      <circle
        className={styles.ringFill}
        cx="18"
        cy="18"
        r="14"
        pathLength={100}
        strokeDasharray={`${(step / steps) * 100} 100`}
      />
    </svg>
  );
}

function describeDue(days: number): string {
  if (days === 0) return 'Today';
  if (days % 7 === 0) return days === 7 ? 'In 1 week' : `In ${days / 7} weeks`;
  return `In ${days} days`;
}

function formatDueDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
