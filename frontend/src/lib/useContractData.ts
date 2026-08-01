'use client';

import { useEffect, useState } from 'react';

interface ContractDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches data from the GenLayer contract on mount and on an optional poll
 * interval. Poll refreshes keep the last good data if a transient RPC/read
 * error occurs, so a healthy page does not blank itself on one bad tick.
 */
export function useContractData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  pollMs?: number,
): ContractDataState<T> {
  const [state, setState] = useState<ContractDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;


    async function load() {
      try {
        const data = await fetcher();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load contract data';
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: prev.data ? null : message,
          }));
        }
      }
    }

    load();

    if (pollMs) {
      const interval = setInterval(load, pollMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
