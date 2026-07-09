import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedRoute {
  id: string;
  fromCity: string;
  toCity: string;
  savedAt: string;
  useCount: number;
}

const STORAGE_KEY = '@carrygo:saved_routes';
const RECENT_KEY = '@carrygo:recent_routes';
const MAX_SAVED = 20;
const MAX_RECENT = 5;

export function useSavedRoutes() {
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setIsLoading(true);
    const [savedJson, recentJson] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(RECENT_KEY),
    ]);
    if (savedJson) setSavedRoutes(JSON.parse(savedJson));
    if (recentJson) setRecentRoutes(JSON.parse(recentJson));
    setIsLoading(false);
  };

  const saveRoute = useCallback(async (fromCity: string, toCity: string) => {
    const existing = savedRoutes.find(
      r => r.fromCity.toLowerCase() === fromCity.toLowerCase() &&
           r.toCity.toLowerCase() === toCity.toLowerCase()
    );

    let updated: SavedRoute[];
    if (existing) {
      updated = savedRoutes.map(r =>
        r.id === existing.id ? { ...r, useCount: r.useCount + 1 } : r
      );
    } else {
      const newRoute: SavedRoute = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromCity,
        toCity,
        savedAt: new Date().toISOString(),
        useCount: 1,
      };
      updated = [newRoute, ...savedRoutes].slice(0, MAX_SAVED);
    }

    setSavedRoutes(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [savedRoutes]);

  const removeRoute = useCallback(async (id: string) => {
    const updated = savedRoutes.filter(r => r.id !== id);
    setSavedRoutes(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [savedRoutes]);

  const recordRouteUsage = useCallback(async (fromCity: string, toCity: string) => {
    const entry: SavedRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromCity,
      toCity,
      savedAt: new Date().toISOString(),
      useCount: 1,
    };

    const filtered = recentRoutes.filter(
      r => !(r.fromCity.toLowerCase() === fromCity.toLowerCase() &&
             r.toCity.toLowerCase() === toCity.toLowerCase())
    );
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    setRecentRoutes(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }, [recentRoutes]);

  const isSaved = useCallback((fromCity: string, toCity: string): boolean => {
    return savedRoutes.some(
      r => r.fromCity.toLowerCase() === fromCity.toLowerCase() &&
           r.toCity.toLowerCase() === toCity.toLowerCase()
    );
  }, [savedRoutes]);

  return {
    savedRoutes,
    recentRoutes,
    isLoading,
    saveRoute,
    removeRoute,
    recordRouteUsage,
    isSaved,
    refresh: loadRoutes,
  };
}
