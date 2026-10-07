import type { Calculation } from '../calculator/operations';

export const API_BASE_URL = '/api/v1';
const REQUEST_TIMEOUT_MS = 5_000;

/** An error reported by the API, or raised when it cannot be reached. */
export class CalculatorApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CalculatorApiError';
    this.code = code;
  }
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface SuccessBody {
  result: number;
}

/** Sends a calculation to the backend and resolves with its result. */
export async function calculate({ operation, ...operands }: Calculation): Promise<number> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operands),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new CalculatorApiError('NETWORK_ERROR', 'The calculator service could not be reached');
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorBody(body)) {
      throw new CalculatorApiError(body.error.code, body.error.message);
    }
    throw new CalculatorApiError('UNEXPECTED_RESPONSE', `Request failed with status ${response.status}`);
  }
  if (!isSuccessBody(body)) {
    throw new CalculatorApiError('UNEXPECTED_RESPONSE', 'The calculator service returned an invalid response');
  }
  return body.result;
}

function isErrorBody(body: unknown): body is ErrorBody {
  const error = (body as Partial<ErrorBody> | null)?.error;
  return typeof error?.code === 'string' && typeof error.message === 'string';
}

function isSuccessBody(body: unknown): body is SuccessBody {
  return typeof (body as Partial<SuccessBody> | null)?.result === 'number';
}
