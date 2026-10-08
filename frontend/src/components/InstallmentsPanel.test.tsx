import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBackend, requestBody, stubBackend } from '../test/fakeBackend';
import { displayValue, isPanelOpen, renderCalculator } from '../test/renderCalculator';

let fetchMock: ReturnType<typeof stubBackend>;

beforeEach(() => {
  fetchMock = stubBackend();
});

const planPanel = () => screen.getByRole('dialog', { name: 'Pay in 4' });

describe('Pay in 4', () => {
  it('shows four payments that add up to the total', async () => {
    const { click } = renderCalculator();

    await click('1', '0', '0', 'Decimal point', '0', '1', 'Pay in 4');

    expect(isPanelOpen('Pay in 4')).toBe(true);
    const items = await within(planPanel()).findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Today.*\$25\.01$/),
      expect.stringMatching(/^In 2 weeks.*\$25\.00$/),
      expect.stringMatching(/^In 4 weeks.*\$25\.00$/),
      expect.stringMatching(/^In 6 weeks.*\$25\.00$/),
    ]);
    expect(within(planPanel()).getByText('$100.01')).toBeInTheDocument();
    expect(requestBody(fetchMock)).toEqual({ amountCents: 10001, count: 4 });
    expect(within(planPanel()).queryByText('Rounded to the nearest cent')).not.toBeInTheDocument();
    expect(within(planPanel()).getByText('4 interest-free payments over 6 weeks')).toBeInTheDocument();
    expect(within(planPanel()).getByText('Estimate only. Fees and plans may vary.')).toBeInTheDocument();
  });

  it('splits a result and notes when it was rounded to cents', async () => {
    const { click } = renderCalculator();

    await click('1', '0', '0', 'Divide', '3', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent('33.3333'));
    await click('Pay in 4');

    expect(await within(planPanel()).findByText('$33.33')).toBeInTheDocument();
    expect(within(planPanel()).getByText('Rounded to the nearest cent')).toBeInTheDocument();
  });

  it('asks for a positive amount without calling the API', async () => {
    const { click } = renderCalculator();

    await click('Pay in 4');

    expect(within(planPanel()).getByText('Enter an amount above $0.00 to split it.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects amounts too large to represent in cents', async () => {
    const { click } = renderCalculator();

    await click(...'999999999999999'.split(''), 'Multiply', '1', '0', '0', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent('e17'));
    await click('Pay in 4');

    expect(within(planPanel()).getByText('This amount is too large to split.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('explains when an amount is too small to split', async () => {
    const { click } = renderCalculator();

    await click('0', 'Decimal point', '0', '3', 'Pay in 4');

    expect(await within(planPanel()).findByText('This amount is too small to split')).toBeInTheDocument();
    expect(within(planPanel()).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers a retry when the service is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { click } = renderCalculator();

    await click('8', '0', 'Pay in 4');
    expect(await within(planPanel()).findByText('Service unavailable')).toBeInTheDocument();

    fetchMock.mockImplementation(fakeBackend);
    await click('Try again');

    expect(await within(planPanel()).findByText('$80.00')).toBeInTheDocument();
  });

  it('closes and gives the keyboard back to the calculator', async () => {
    const { user, click } = renderCalculator();
    await click('4', '0', 'Pay in 4');
    await within(planPanel()).findByText('$40.00');

    await click('Close Pay in 4');

    expect(isPanelOpen('Pay in 4')).toBe(false);
    expect(screen.getByRole('button', { name: 'Pay in 4' })).toHaveFocus();
    await user.keyboard('1');
    expect(displayValue()).toHaveTextContent(/^401$/);
  });
});
