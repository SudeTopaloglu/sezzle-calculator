import { KEYS, type KeyInput } from '../calculator/keys';
import styles from './Keypad.module.css';

interface KeypadProps {
  onPress: (input: KeyInput) => void;
  /** Key to show as pressed, e.g. while its keyboard shortcut is used. */
  activeKeyId: string | null;
}

export function Keypad({ onPress, activeKeyId }: KeypadProps) {
  return (
    <div className={styles.keypad} role="group" aria-label="Keypad">
      {KEYS.map((key) => (
        <button
          key={key.id}
          type="button"
          className={styles.key}
          data-variant={key.variant}
          data-span={key.span}
          data-active={key.id === activeKeyId || undefined}
          aria-label={key.ariaLabel}
          onClick={() => onPress(key.input)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
