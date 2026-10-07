import { vi } from 'vitest';

/** Answers API requests the way the Go service does, so UI tests run end to end. */
export async function fakeBackend(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const path = String(input).split('/').pop() ?? '';
  const body = JSON.parse(String(init?.body));

  if (path === 'installments') {
    const { amountCents, count } = body as { amountCents: number; count: number };
    if (amountCents < count) {
      return Response.json({ error: { code: 'AMOUNT_TOO_SMALL', message: 'amount is too small to split' } }, { status: 422 });
    }
    const base = Math.floor(amountCents / count);
    const payments = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      dueInDays: i * 14,
      amountCents: base + (i < amountCents % count ? 1 : 0),
    }));
    return Response.json({ amountCents, count, intervalDays: 14, payments });
  }

  const { a, b } = body as { a: number; b: number };
  if (path === 'divide' && b === 0) {
    return Response.json({ error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }, { status: 422 });
  }
  const results: Record<string, number> = {
    add: a + b,
    subtract: a - b,
    multiply: a * b,
    divide: a / b,
    power: a ** b,
    sqrt: Math.sqrt(a),
    percentage: (a * b) / 100,
  };
  return Response.json({ operation: path, a, b, result: results[path] });
}

/** Installs a fetch mock backed by fakeBackend and returns it for assertions. */
export function stubBackend() {
  const fetchMock = vi.fn(fakeBackend);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The JSON body of the n-th request a fetch mock received. */
export function requestBody(fetchMock: ReturnType<typeof stubBackend>, n = 0): unknown {
  return JSON.parse(String(fetchMock.mock.calls[n][1]?.body));
}
