import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubBackend } from '../test/fakeBackend';
import { displayValue, isPanelOpen, renderCalculator } from '../test/renderCalculator';
import { Calculator } from './Calculator';

beforeEach(() => {
  stubBackend();
});

const historyPanel = () => screen.getByRole('dialog', { name: 'History' });

describe('History', () => {
  it('shows an empty state and focuses the close button', async () => {
    const { click } = renderCalculator();

    await click('History');

    expect(isPanelOpen('History')).toBe(true);
    expect(within(historyPanel()).getByText('No calculations yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close History' })).toHaveFocus();
  });

  it('groups chained calculations on one tape', async () => {
    const { click } = renderCalculator();

    await click('2', 'Add', '3', 'Multiply', '4', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^20$/));
    await click('9', 'Square root');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^3$/));
    await click('History');

    const first = within(historyPanel()).getByRole('button', { name: '2 + 3 = 5' });
    const second = within(historyPanel()).getByRole('button', { name: '5 × 4 = 20' });
    const separate = within(historyPanel()).getByRole('button', { name: '√(9) = 3' });
    const tapeOf = (element: HTMLElement) => element.closest('ol')?.closest('li');
    expect(tapeOf(first)).toBe(tapeOf(second));
    expect(tapeOf(separate)).not.toBe(tapeOf(first));
    expect(within(historyPanel()).getByText('Today')).toBeInTheDocument();
  });

  it('does not record failed calculations', async () => {
    const { click } = renderCalculator();

    await click('8', 'Divide', '0', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent('Cannot divide by zero'));
    await click('History');

    expect(within(historyPanel()).getByText('No calculations yet')).toBeInTheDocument();
  });

  it('reuses a result and returns to the calculator', async () => {
    const { click } = renderCalculator();

    await click('6', 'Multiply', '7', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^42$/));
    await click('All clear', '1', '0', '0', 'Add', 'History', '6 × 7 = 42');

    expect(isPanelOpen('History')).toBe(false);
    expect(screen.getByRole('button', { name: 'History' })).toHaveFocus();
    expect(displayValue()).toHaveTextContent(/^42$/);

    await click('Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^142$/));
  });

  it('keeps the history after a reload', async () => {
    const { click } = renderCalculator();
    await click('1', 'Add', '1', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^2$/));

    // Simulate a page reload: a fresh app that reads the same storage.
    document.body.innerHTML = '';
    render(<Calculator />);
    await click('History');

    expect(within(historyPanel()).getByRole('button', { name: '1 + 1 = 2' })).toBeInTheDocument();
  });

  it('keeps working when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const { click } = renderCalculator();

    await click('1', 'Add', '1', 'Equals', 'History');

    expect(await within(historyPanel()).findByRole('button', { name: '1 + 1 = 2' })).toBeInTheDocument();
  });

  it('asks for confirmation before clearing', async () => {
    const { click } = renderCalculator();
    await click('1', 'Add', '1', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^2$/));
    await click('History', 'Clear');

    expect(within(historyPanel()).getByRole('button', { name: '1 + 1 = 2' })).toBeInTheDocument();

    await click('Clear all?');

    expect(within(historyPanel()).getByText('No calculations yet')).toBeInTheDocument();
  });

  it('closes with Escape and pauses calculator shortcuts while open', async () => {
    const { user, click } = renderCalculator();
    await click('7', 'History');

    await user.keyboard('5');
    expect(displayValue()).toHaveTextContent(/^7$/);

    await user.keyboard('{Escape}');
    expect(isPanelOpen('History')).toBe(false);
    expect(displayValue()).toHaveTextContent(/^7$/);

    await user.keyboard('5');
    expect(displayValue()).toHaveTextContent(/^75$/);
  });
});
