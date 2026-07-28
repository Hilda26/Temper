'use client';

import { useEffect, useState } from 'react';

interface ContractDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches data from the GenLayer contract on mount and on an optional poll
 * interval. Returns loading/error state alongside the data so pages can
 * render a live-connection indicator instead of hardcoded placeholders.
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
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load contract data',
          });
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
