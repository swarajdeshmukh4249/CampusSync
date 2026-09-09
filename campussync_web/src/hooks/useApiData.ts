import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads data from the API, tracking loading and error state so no screen
 * silently renders an empty list when the backend is unreachable.
 *
 * `deps` should hold anything the fetcher closes over (userId, filters).
 */
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });

  // The fetcher is a fresh closure on every render; key it off deps instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setState(s => ({ ...s, loading: true, error: null }));
      try {
        const data = await run();
        setState({ data, loading: false, error: null });
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Something went wrong',
        });
      }
    },
    [run],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await run();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Something went wrong',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [run]);

  return { ...state, reload: load };
}
