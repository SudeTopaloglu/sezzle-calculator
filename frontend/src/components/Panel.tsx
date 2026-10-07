import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  /** "side" slides in from the right, "bottom" rises like a sheet. */
  placement: 'side' | 'bottom';
  /** Extra header buttons, shown before the close button. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * A dialog that slides over the calculator. It stays mounted so it can
 * animate both ways; while closed it is inert, so it can't be focused or read.
 */
export function Panel({ title, subtitle, open, onClose, placement, actions, children }: PanelProps) {
  const titleId = useId();
  const layer = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus({ preventScroll: true });
    // On screens shorter than the card, bring the edge the panel opens from into view.
    layer.current?.scrollIntoView?.({ block: placement === 'bottom' ? 'end' : 'start' });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      opener?.focus();
    };
  }, [open, placement]);

  return (
    <div ref={layer} className={styles.layer} data-placement={placement} data-open={open || undefined} inert={!open}>
      <div className={styles.backdrop} onClick={onClose} />
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <div className={styles.actions}>
            {actions}
            <button ref={closeButton} type="button" className={styles.close} aria-label={`Close ${title}`} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </div>
  );
}
