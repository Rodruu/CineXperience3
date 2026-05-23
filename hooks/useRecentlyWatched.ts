import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cx_recently_watched_v2';
const MAX_ITEMS = 20;

export interface RecentItem {
  id: string;
  title: string;
  tipo: 'pelicula' | 'serie';
  poster?: string | null;
  contenidoId?: string;
  iframeUrl?: string;
  tmdbId?: string;
  watchedAt: string;
}

export async function addToRecentlyWatched(item: Omit<RecentItem, 'watchedAt'>) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter((i) => i.id !== item.id);
    const newItems = [
      { ...item, watchedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  } catch {}
}

export function useRecentlyWatched() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RecentItem[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((i) => i.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setItems(filtered);
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setItems([]);
    } catch {}
  }, []);

  return { items, loading, refresh: load, remove, clearAll };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Hace un momento';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}
