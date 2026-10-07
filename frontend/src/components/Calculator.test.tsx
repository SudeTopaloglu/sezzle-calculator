import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Calculator } from './Calculator';

/** Answers API requests the way the Go service does. */
async function fakeBackend(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const operation = String(input).split('/').pop() ?? '';
  const { a, b } = JSON.parse(String(init?.body)) as { a: number; b: number };
  if (operation === 'divide' && b === 0) {
    return Response.json({ error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }, { status: 422 });
  }
  const results: Record<string, number> = {
    add: a + b,
    subtract: a - b,
    multiply: a * b,
    divide: a / b,
    power: a ** b,
    sqrt: Math.sqrt(a),
    percentage: a / 100,
  };
  return Response.json({ operation, a, b, result: results[operation] });
}

const fetchMock = vi.fn(fakeBackend);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(fakeBackend);
  vi.stubGlobal('fetch', fetchMock);
});

function setup() {
  const user = userEvent.setup();
  render(<Calculator />);
  const click = async (...names: string[]) => {
    for (const name of names) {
      await user.click(screen.getByRole('button', { name }));
    }
  };
  return { user, click };
}

const displayValue = () => screen.getByTestId('display-value');
const expression = () => screen.getByTestId('display-expression');

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
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/add');
    expect(JSON.parse(String(init?.body))).toEqual({ a: 12, b: 7 });
  });

  it('evaluates chained operations from left to right', async () => {
    const { click } = setup();

    await click('2', 'Add', '3', 'Multiply');
    await waitFor(() => expect(expression()).toHaveTextContent('5 ×'));
    await click('4', 'Equals');

    await waitFor(() => expect(displayValue()).toHaveTextContent(/^20$/));
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
    { keys: ['5', '0', 'Percent'], result: '0.5', shown: '50% =' },
    { keys: ['2', 'Power', '1', '0', 'Equals'], result: '1,024', shown: '2 ^ 10 =' },
    { keys: ['7', 'Toggle sign', 'Subtract', '3', 'Equals'], result: '−10', shown: '−7 − 3 =' },
    { keys: ['1', 'Decimal point', '5', 'Divide', '4', 'Equals'], result: '0.375', shown: '1.5 ÷ 4 =' },
  ])('calculates $shown', async ({ keys, result, shown }) => {
    const { click } = setup();

    await click(...keys);

    await waitFor(() => expect(displayValue()).toHaveTextContent(result));
    expect(expression()).toHaveTextContent(shown);
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
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (respond = resolve)));
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

  it('leaves browser shortcuts alone', async () => {
    const { user } = setup();

    await user.keyboard('{Control>}r{/Control}');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
