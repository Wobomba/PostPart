const CACHE_PREFIX = 'postpart_admin_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Cache utility with TTL support for web (localStorage)
 */
export class Cache {
  /**
   * Get cached data if it exists and hasn't expired
   */
  static get<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const ttl = entry.ttl || CACHE_TTL;
      const now = Date.now();

      // Check if cache has expired
      if (now - entry.timestamp > ttl) {
        // Cache expired, remove it
        this.remove(key);
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
  static set<T>(key: string, data: T, ttl?: number): void {
    try {
      if (typeof window === 'undefined') return;
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || CACHE_TTL,
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Remove cached data
   */
  static remove(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Cache remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  static clear(): void {
    try {
      if (typeof window === 'undefined') return;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Invalidate cache for a specific key (force refresh)
   */
  static invalidate(key: string): void {
    this.remove(key);
  }

  /**
   * Invalidate multiple cache keys
   */
  static invalidateMultiple(keys: string[]): void {
    keys.forEach(key => this.remove(key));
  }
}

// Cache key constants
export const CacheKeys = {
  DASHBOARD_STATS: 'dashboard_stats',
  DASHBOARD_ACTIVITY: 'dashboard_activity',
  PARENTS_LIST: 'parents_list',
  PARENTS_STATS: 'parents_stats',
  CENTERS_LIST: 'centers_list',
  CENTERS_STATS: 'centers_stats',
  ORGANIZATIONS_LIST: 'organizations_list',
  ALLOCATIONS_LIST: 'allocations_list',
} as const;


