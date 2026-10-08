import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestBody, stubBackend } from '../test/fakeBackend';
import { displayExpression as expression, displayValue, renderCalculator as setup } from '../test/renderCalculator';

let fetchMock: ReturnType<typeof stubBackend>;

beforeEach(() => {
  fetchMock = stubBackend();
});


describe('Calculator', () => {
  it('starts at zero', () => {
    setup();
    expect(displayValue()).toHaveTextContent(/^0$/);
    expect(expression()).toBeEmptyDOMElement();
  });

  it('adds two numbers through the API', async () => {
    const { click } = setup();

    await click('1', '2', 'Add', '7', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent(/^19$/));
    expect(expression()).toHaveTextContent('12 + 7 =');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/add');
    expect(requestBody(fetchMock)).toEqual({ a: 12, b: 7 });
  });

  describe('operator precedence', () => {
    it('multiplies before adding, one API call per step', async () => {
      const { click } = setup();

      await click('2', 'Add', '3', 'Multiply');
      expect(expression()).toHaveTextContent('2 + 3 ×');
      expect(fetchMock).not.toHaveBeenCalled();
      await click('4', 'Equals');

      await waitFor(() => expect(displayValue()).toHaveTextContent(/^14$/));
      expect(expression()).toHaveTextContent('2 + 3 × 4 =');
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/v1/multiply', '/api/v1/add']);
      expect(requestBody(fetchMock, 0)).toEqual({ a: 3, b: 4 });
      expect(requestBody(fetchMock, 1)).toEqual({ a: 2, b: 12 });
    });

    it('shows the intermediate result when a lower-precedence operator follows', async () => {
      const { click } = setup();

      await click('2', 'Multiply', '3', 'Add');

      await waitFor(() => expect(displayValue()).toHaveTextContent(/^6$/));
      expect(expression()).toHaveTextContent('2 × 3 +');
      await click('4', 'Equals');
      await waitFor(() => expect(displayValue()).toHaveTextContent(/^10$/));
    });

    it.each([
      { keys: ['1', '0', 'Subtract', '2', 'Subtract', '3', 'Equals'], result: '5', name: 'left to right for −' },
      { keys: ['8', 'Divide', '4', 'Divide', '2', 'Equals'], result: '1', name: 'left to right for ÷' },
      { keys: ['2', 'Power', '3', 'Power', '2', 'Equals'], result: '512', name: 'right to left for ^' },
      { keys: ['2', 'Multiply', '3', 'Power', '2', 'Equals'], result: '18', name: '^ before ×' },
      { keys: ['2', 'Add', '3', 'Multiply', 'Add', '1', 'Equals'], result: '6', name: 'a replaced operator' },
    ])('evaluates $name', async ({ keys, result }) => {
      const { click } = setup();

      await click(...keys);

      await waitFor(() => expect(displayValue()).toHaveTextContent(new RegExp(`^${result}$`)));
    });

    it('reports an error from any step', async () => {
      const { click } = setup();

      await click('2', 'Add', '8', 'Divide', '0', 'Equals');

      await waitFor(() => expect(displayValue()).toHaveTextContent('Cannot divide by zero'));
      expect(expression()).toHaveTextContent('2 + 8 ÷ 0 =');
    });
  });

  it('replaces the operator when two are pressed in a row', async () => {
    const { click } = setup();

    await click('5', 'Add', 'Multiply', '2', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent(/^10$/));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('reuses the first operand when equals follows an operator', async () => {
    const { click } = setup();

    await click('5', 'Multiply', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent(/^25$/));
  });

  it.each([
    { keys: ['9', 'Square root'], result: '3', shown: '√(9) =' },
    { keys: ['2', 'Power', '1', '0', 'Equals'], result: '1,024', shown: '2 ^ 10 =' },
    { keys: ['7', 'Toggle sign', 'Subtract', '3', 'Equals'], result: '−10', shown: '−7 − 3 =' },
    { keys: ['1', 'Decimal point', '5', 'Divide', '4', 'Equals'], result: '0.375', shown: '1.5 ÷ 4 =' },
  ])('calculates $shown', async ({ keys, result, shown }) => {
    const { click } = setup();

    await click(...keys);

    await waitFor(() => expect(displayValue()).toHaveTextContent(result));
    expect(expression()).toHaveTextContent(shown);
  });

  describe('percent', () => {
    it.each([
      { keys: ['5', '0', 'Percent'], result: '0.5', shown: '50% =' },
      { keys: ['5', '0', 'Add', '1', '0', 'Percent', 'Equals'], result: '55', shown: '50 + 10% =' },
      { keys: ['2', '0', '0', 'Subtract', '2', '5', 'Percent', 'Equals'], result: '150', shown: '200 − 25% =' },
      { keys: ['5', '0', 'Multiply', '1', '0', 'Percent', 'Equals'], result: '5', shown: '50 × 10% =' },
      { keys: ['2', '0', '0', 'Divide', '5', '0', 'Percent', 'Equals'], result: '400', shown: '200 ÷ 50% =' },
      { keys: ['1', '0', '0', 'Add', '2', 'Multiply', '1', '0', 'Percent', 'Equals'], result: '100.2', shown: '100 + 2 × 10% =' },
    ])('calculates $shown', async ({ keys, result, shown }) => {
      const { click } = setup();

      await click(...keys);

      await waitFor(() => expect(expression()).toHaveTextContent(shown));
      expect(displayValue()).toHaveTextContent(new RegExp(`^${result}$`));
    });

    it('shows the percentage while the addition is pending', async () => {
      const { click } = setup();

      await click('5', '0', 'Add', '1', '0', 'Percent');

      await waitFor(() => expect(expression()).toHaveTextContent('50 + 10%'));
      expect(displayValue()).toHaveTextContent(/^5$/);
      expect(requestBody(fetchMock)).toEqual({ a: 10, b: 50 });
    });
  });

  it('copies the result without formatting and keeps the keyboard working', async () => {
    const { user, click } = setup();

    await click('1', '2', '3', '4', 'Decimal point', '5', 'Toggle sign', 'Copy result');

    expect(await navigator.clipboard.readText()).toBe('-1234.5');
    expect(screen.getByText('Copied')).toBeVisible();
    await user.keyboard('9');
    expect(displayValue()).toHaveTextContent('−1,234.59');
  });

  it('reports when the clipboard is unavailable', async () => {
    const { click } = setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await click('5', 'Copy result');

    expect(await screen.findByText('Copy failed')).toBeVisible();
  });

  it('disables copy and Pay in 4 while an error is shown', async () => {
    const { click } = setup();

    await click('8', 'Divide', '0', 'Equals');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy result' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Pay in 4' })).toBeDisabled();
  });

  it('shows an error for division by zero and recovers on the next key', async () => {
    const { click } = setup();

    await click('8', 'Divide', '0', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent('Cannot divide by zero'));
    expect(expression()).toHaveTextContent('8 ÷ 0 =');

    await click('4');
    expect(displayValue()).toHaveTextContent(/^4$/);
    expect(expression()).toBeEmptyDOMElement();
  });

  it('clears an error when an operation key is pressed', async () => {
    const { click } = setup();

    await click('8', 'Divide', '0', 'Equals');
    await waitFor(() => expect(displayValue()).toHaveTextContent('Cannot divide by zero'));
    await click('Equals');

    expect(displayValue()).toHaveTextContent(/^0$/);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('shrinks the font as the number grows', async () => {
    const { user } = setup();

    await user.keyboard('123456');
    expect(displayValue()).toHaveAttribute('data-size', 'large');
    await user.keyboard('7890');
    expect(displayValue()).toHaveAttribute('data-size', 'medium');
    await user.keyboard('12345');
    expect(displayValue()).toHaveAttribute('data-size', 'small');
  });

  it('shows an error when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { click } = setup();

    await click('1', 'Add', '1', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent('Service unavailable'));
  });

  it('ignores keys while a calculation is in flight', async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (respond = resolve)));
    const { click } = setup();

    await click('6', 'Multiply', '7', 'Equals', 'Equals', '9');
    respond(Response.json({ result: 42 }));

    await waitFor(() => expect(displayValue()).toHaveTextContent(/^42$/));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('edits the entry with delete and all clear', async () => {
    const { click } = setup();

    await click('1', '2', '3', 'Delete');
    expect(displayValue()).toHaveTextContent(/^12$/);

    await click('All clear');
    expect(displayValue()).toHaveTextContent(/^0$/);
  });

  it('supports keyboard input', async () => {
    const { user } = setup();

    await user.keyboard('1234*2{Enter}');
    await waitFor(() => expect(displayValue()).toHaveTextContent(/^2,468$/));

    await user.keyboard('9{Backspace}5');
    expect(displayValue()).toHaveTextContent(/^5$/);

    await user.keyboard('{Escape}');
    expect(displayValue()).toHaveTextContent(/^0$/);
  });

  it('highlights the key matching a keyboard shortcut', async () => {
    const { user } = setup();

    await user.keyboard('7');

    expect(screen.getByRole('button', { name: '7' })).toHaveAttribute('data-active', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: '7' })).not.toHaveAttribute('data-active'));
  });

  it('ignores keys that are not shortcuts', async () => {
    const { user } = setup();

    await user.keyboard('7a?{Tab}');

    expect(displayValue()).toHaveTextContent(/^7$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves browser shortcuts alone', async () => {
    const { user } = setup();

    await user.keyboard('{Control>}r{/Control}');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
