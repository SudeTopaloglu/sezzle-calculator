import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculate, CalculatorApiError, splitIntoInstallments, toUserMessage } from './calculatorApi';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('calculate', () => {
  it('posts the operands to the operation endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { operation: 'divide', a: 10, b: 4, result: 2.5 }));

    await expect(calculate({ operation: 'divide', a: 10, b: 4 })).resolves.toBe(2.5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/divide');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual({ a: 10, b: 4 });
  });

  it('sends only "a" for unary operations', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { operation: 'sqrt', a: 9, result: 3 }));

    await calculate({ operation: 'sqrt', a: 9 });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ a: 9 });
  });

  it('turns API errors into CalculatorApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }),
    );

    await expect(calculate({ operation: 'divide', a: 1, b: 0 })).rejects.toEqual(
      new CalculatorApiError('DIVISION_BY_ZERO', 'division by zero is undefined'),
    );
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(calculate({ operation: 'add', a: 1, b: 2 })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('reports error responses that are not from the API', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    await expect(calculate({ operation: 'add', a: 1, b: 2 })).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
      message: 'Request failed with status 502',
    });
  });

  it('rejects successful responses without a numeric result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { result: 'NaN' }));

    await expect(calculate({ operation: 'add', a: 1, b: 2 })).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE' });
  });
});

describe('splitIntoInstallments', () => {
  const plan = {
    amountCents: 10001,
    count: 4,
    intervalDays: 14,
    payments: [
      { number: 1, dueInDays: 0, amountCents: 2501 },
      { number: 2, dueInDays: 14, amountCents: 2500 },
      { number: 3, dueInDays: 28, amountCents: 2500 },
      { number: 4, dueInDays: 42, amountCents: 2500 },
    ],
  };

  it('posts the amount in cents and returns the plan', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, plan));

    await expect(splitIntoInstallments(10001)).resolves.toEqual(plan);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/installments');
    expect(JSON.parse(String(init?.body))).toEqual({ amountCents: 10001, count: 4 });
  });

  it('turns API errors into CalculatorApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { error: { code: 'AMOUNT_TOO_SMALL', message: 'too small' } }));

    await expect(splitIntoInstallments(3)).rejects.toMatchObject({ code: 'AMOUNT_TOO_SMALL', isRetryable: false });
  });

  it.each([
    ['no payments', { ...plan, payments: [] }],
    ['fractional cents', { ...plan, payments: [{ number: 1, dueInDays: 0, amountCents: 25.5 }] }],
    ['missing fields', { payments: plan.payments }],
  ])('rejects a plan with %s', async (_, body) => {
    fetchMock.mockResolvedValue(jsonResponse(200, body));

    await expect(splitIntoInstallments(10001)).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE', isRetryable: true });
  });
});

describe('toUserMessage', () => {
  it.each([
    ['DIVISION_BY_ZERO', 'Cannot divide by zero'],
    ['AMOUNT_TOO_SMALL', 'This amount is too small to split'],
    ['NETWORK_ERROR', 'Service unavailable'],
    ['SOMETHING_NEW', 'Something went wrong'],
  ])('describes %s as "%s"', (code, message) => {
    expect(toUserMessage(new CalculatorApiError(code, 'details'))).toBe(message);
  });

  it('has a fallback for unknown errors', () => {
    expect(toUserMessage(new Error('boom'))).toBe('Something went wrong');
  });
});
