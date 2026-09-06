import { useEffect, useState } from 'react';
import type { RxQuery } from 'rxdb';

type AnyRxQuery = Pick<RxQuery, '$'> | null | undefined;

interface RxLikeDoc {
  toJSON: () => unknown;
}

/** Subscribe to an RxDB query and get plain JSON rows back.
 *  `factory` is re-run whenever `deps` change. */
export function useRxQuery<T>(
  factory: () => AnyRxQuery,
  deps: readonly unknown[],
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = factory();
    if (!query) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const sub = query.$.subscribe((result: unknown) => {
      const docs = (result as RxLikeDoc[]) ?? [];
      setData(docs.map((d) => d.toJSON() as T));
      setLoading(false);
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
