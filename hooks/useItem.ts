// src/hooks/useItem.ts
import { useEffect, useState, useCallback } from 'react';
import { Item } from '../types/items';
import { getItemById } from '../services/itemService';

export function useItem(id: number) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getItemById(id);
      setItem(res);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch item');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return { item, loading, error, refresh: fetchItem };
}
