import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calculator } from '../components/Calculator';

/** Renders the whole app and returns helpers that drive it like a user. */
export function renderCalculator() {
  const user = userEvent.setup();
  render(<Calculator />);

  async function click(...names: string[]) {
    for (const name of names) {
      await user.click(screen.getByRole('button', { name }));
    }
  }

  return { user, click };
}

export const displayValue = () => screen.getByTestId('display-value');
export const displayExpression = () => screen.getByTestId('display-expression');

/** True while the named panel is open (closed panels stay mounted but inert). */
export function isPanelOpen(name: string): boolean {
  return !screen.getByRole('dialog', { name }).closest('[inert]');
}
