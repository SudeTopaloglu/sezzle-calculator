import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculate, CalculatorApiError } from './calculatorApi';

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
