import { useRef, useState } from 'react';
import {
  CalculatorApiError,
  splitIntoInstallments,
  toUserMessage,
  type InstallmentPlan,
} from '../api/calculatorApi';
import { formatPlain } from '../calculator/format';

export type InstallmentsState =
  | { status: 'idle' }
  | { status: 'invalid'; message: string }
  | { status: 'loading' }
  | { status: 'success'; plan: InstallmentPlan; rounded: boolean }
  | { status: 'error'; message: string; retry: (() => void) | null };

/** Loads a Pay in 4 plan for the number on screen. */
export function useInstallments(fetchPlan: (amountCents: number) => Promise<InstallmentPlan> = splitIntoInstallments) {
  const [state, setState] = useState<InstallmentsState>({ status: 'idle' });
  // Only the latest request may update the state, so a slow answer never
  // overwrites the plan for a newer amount.
  const latestRequest = useRef(0);

  async function load(amountCents: number, rounded: boolean) {
    const request = ++latestRequest.current;
    setState({ status: 'loading' });
    try {
      const plan = await fetchPlan(amountCents);
      if (request === latestRequest.current) {
        setState({ status: 'success', plan, rounded });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        const canRetry = error instanceof CalculatorApiError && error.isRetryable;
        setState({
          status: 'error',
          message: toUserMessage(error),
          retry: canRetry ? () => void load(amountCents, rounded) : null,
        });
      }
    }
  }

  function start(value: number) {
    const amountCents = Math.round(value * 100);
    if (amountCents <= 0) {
      latestRequest.current++;
      setState({ status: 'invalid', message: 'Enter an amount above $0.00 to split it.' });
      return;
    }
    if (!Number.isSafeInteger(amountCents)) {
      latestRequest.current++;
      setState({ status: 'invalid', message: 'This amount is too large to split.' });
      return;
    }
    const decimals = formatPlain(value).split('.')[1] ?? '';
    void load(amountCents, decimals.length > 2);
  }

  return { state, start };
}
