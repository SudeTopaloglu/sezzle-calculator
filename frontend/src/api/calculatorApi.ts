import type { Calculation } from '../calculator/operations';

const API_BASE_URL = '/api/v1';
const REQUEST_TIMEOUT_MS = 5_000;

/** An error reported by the API, or raised when it cannot be reached. */
export class CalculatorApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CalculatorApiError';
    this.code = code;
  }

  /** True for failures worth retrying: the request never got a real answer. */
  get isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'UNEXPECTED_RESPONSE';
  }
}

const USER_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  NEGATIVE_SQUARE_ROOT: 'No real square root',
  UNDEFINED_RESULT: 'Result is undefined',
  RESULT_OUT_OF_RANGE: 'Result is too large',
  AMOUNT_TOO_SMALL: 'This amount is too small to split',
  AMOUNT_TOO_LARGE: 'This amount is too large to split',
  NETWORK_ERROR: 'Service unavailable',
  UNEXPECTED_RESPONSE: 'Service unavailable',
};

/** A short message for people, based on the error code. */
export function toUserMessage(error: unknown): string {
  return (error instanceof CalculatorApiError && USER_MESSAGES[error.code]) || 'Something went wrong';
}

export interface Installment {
  number: number;
  dueInDays: number;
  amountCents: number;
}

export interface InstallmentPlan {
  amountCents: number;
  count: number;
  intervalDays: number;
  payments: Installment[];
}

/** Sends a calculation to the backend and resolves with its result. */
export async function calculate({ operation, ...operands }: Calculation): Promise<number> {
  const body = await post(`/${operation}`, operands);
  if (typeof (body as { result?: unknown } | null)?.result !== 'number') {
    throw invalidResponse();
  }
  return (body as { result: number }).result;
}

/** Asks the backend to split an amount into equal payments every two weeks. */
export async function splitIntoInstallments(amountCents: number, count = 4): Promise<InstallmentPlan> {
  const body = await post('/installments', { amountCents, count });
  if (!isInstallmentPlan(body)) {
    throw invalidResponse();
  }
  return body;
}

async function post(path: string, payload: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new CalculatorApiError('NETWORK_ERROR', 'The calculator service could not be reached');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    if (typeof error?.code === 'string' && typeof error.message === 'string') {
      throw new CalculatorApiError(error.code, error.message);
    }
    throw new CalculatorApiError('UNEXPECTED_RESPONSE', `Request failed with status ${response.status}`);
  }
  return body;
}

function invalidResponse(): CalculatorApiError {
  return new CalculatorApiError('UNEXPECTED_RESPONSE', 'The calculator service returned an invalid response');
}

function isInstallmentPlan(body: unknown): body is InstallmentPlan {
  const plan = body as Partial<InstallmentPlan> | null;
  return (
    Number.isInteger(plan?.amountCents) &&
    Number.isInteger(plan?.intervalDays) &&
    Array.isArray(plan?.payments) &&
    plan.payments.length > 0 &&
    plan.payments.every(
      (payment: Partial<Installment>) =>
        Number.isInteger(payment.number) && Number.isInteger(payment.dueInDays) && Number.isInteger(payment.amountCents),
    )
  );
}
