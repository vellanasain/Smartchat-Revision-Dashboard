import { useEffect, useState } from 'react';

export function useQueryLite(key, queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.resolve(queryFn())
      .then((payload) => alive && setData(payload))
      .catch((err) => alive && setError(err?.message || 'Request failed'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  return { data, loading, error, setData };
}
