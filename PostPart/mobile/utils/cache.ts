import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@postpart_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

// Platform-specific storage helpers
const isWeb = Platform.OS === 'web';

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
  getAllKeys: async (): Promise<string[]> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        return Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
      }
      return [];
    }
    return await AsyncStorage.getAllKeys();
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        keys.forEach(key => localStorage.removeItem(key));
      }
      return;
    }
    await AsyncStorage.multiRemove(keys);
  },
};

/**
 * Cache utility with TTL support (works on both mobile and web)
 */
export class Cache {
  /**
   * Get cached data if it exists and hasn't expired
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await storage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const ttl = entry.ttl || CACHE_TTL;
      const now = Date.now();

      // Check if cache has expired
      if (now - entry.timestamp > ttl) {
        // Cache expired, remove it
        await this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with optional custom TTL
   */
  static async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || CACHE_TTL,
      };
      await storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Remove cached data
   */
  static async remove(key: string): Promise<void> {
    try {
      await storage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Cache remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  static async clear(): Promise<void> {
    try {
      const keys = await storage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await storage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Invalidate cache for a specific key (force refresh)
   */
  static async invalidate(key: string): Promise<void> {
    await this.remove(key);
  }

  /**
   * Invalidate multiple cache keys
   */
  static async invalidateMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.remove(key)));
  }
}

// Cache key constants
export const CacheKeys = {
  USER_PROFILE: 'user_profile',
  USER_CHILDREN: 'user_children',
  USER_STATS: 'user_stats',
  RECENT_CHECKINS: 'recent_checkins',
  ACTIVE_CHECKIN: 'active_checkin',
  FEATURED_CENTERS: 'featured_centers',
  FREQUENT_CENTERS: 'frequent_centers',
  NOTIFICATION_COUNT: 'notification_count',
  CENTERS_LIST: 'centers_list',
} as const;


