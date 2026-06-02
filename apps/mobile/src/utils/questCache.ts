import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Quest } from 'shared';

const QUEST_CACHE_PREFIX = 'mobile_quest_cache_';
const ADVENTURE_LIST_CACHE_KEY = 'mobile_adventure_list_cache';

export interface AdventureCacheItem {
  id: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  createdAt?: unknown;
  stages?: unknown[];
}

interface CachedValue<T> {
  value: T;
  cachedAt: number;
}

export async function cacheQuestLocally(quest: Quest): Promise<void> {
  try {
    const payload: CachedValue<Quest> = { value: quest, cachedAt: Date.now() };
    await AsyncStorage.setItem(`${QUEST_CACHE_PREFIX}${quest.id}`, JSON.stringify(payload));
  } catch {
    // Ignore storage failures on mobile cache writes.
  }
}

export async function getCachedQuest(questId: string): Promise<Quest | null> {
  try {
    const raw = await AsyncStorage.getItem(`${QUEST_CACHE_PREFIX}${questId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedValue<Quest>;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export async function cacheAdventureList(adventures: AdventureCacheItem[]): Promise<void> {
  try {
    const payload: CachedValue<AdventureCacheItem[]> = { value: adventures, cachedAt: Date.now() };
    await AsyncStorage.setItem(ADVENTURE_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures on mobile cache writes.
  }
}

export async function getCachedAdventureList(): Promise<AdventureCacheItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ADVENTURE_LIST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedValue<AdventureCacheItem[]>;
    return parsed.value ?? [];
  } catch {
    return [];
  }
}
