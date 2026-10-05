import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

export const redis = new Redis(redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  lazyConnect: false,
  retryStrategy(times) {
    return Math.min(times * 2000, 10000);
  },
});

let isRedisConnected = false;

redis.on("connect", () => {
  isRedisConnected = true;
  console.log("[Redis] Connected");
});

redis.on("error", (error) => {
  if (isRedisConnected) {
    console.error("[Redis] Error:", error.message);
  }
  isRedisConnected = false;
});

type RedisSetOptions = {
  expiration?: {
    type: string;
    value: number;
  };
};

type RedisScanOptions = {
  MATCH: string;
  COUNT: number;
};

// In-memory fallback session store if Redis is unavailable
const memorySessionStore = new Map<string, { value: string; expiresAt?: number }>();

/*
 * connect-redis v10 talks to the node-redis client API.
 * This adapter maps those calls onto ioredis, with automatic in-memory fallback if Redis is offline.
 */
export const sessionRedisClient = {
  async get(key: string) {
    try {
      if (isRedisConnected) {
        return await redis.get(key);
      }
    } catch {
      // Fall through to memory store
    }
    const mem = memorySessionStore.get(key);
    if (!mem) return null;
    if (mem.expiresAt && mem.expiresAt < Date.now()) {
      memorySessionStore.delete(key);
      return null;
    }
    return mem.value;
  },

  async set(key: string, value: string, options?: RedisSetOptions) {
    const ttl =
      options?.expiration?.type === "EX"
        ? options.expiration.value
        : undefined;

    try {
      if (isRedisConnected) {
        if (ttl && ttl > 0) {
          return await redis.set(key, value, "EX", ttl);
        }
        return await redis.set(key, value);
      }
    } catch {
      // Fall through to memory store
    }

    memorySessionStore.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    });
    return "OK";
  },

  async del(keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys];

    if (list.length === 0) {
      return 0;
    }

    try {
      if (isRedisConnected) {
        return await redis.del(...list);
      }
    } catch {
      // Fall through
    }

    let deleted = 0;
    for (const k of list) {
      if (memorySessionStore.delete(k)) deleted++;
    }
    return deleted;
  },

  async expire(key: string, seconds: number) {
    try {
      if (isRedisConnected) {
        return await redis.expire(key, seconds);
      }
    } catch {
      // Fall through
    }

    const mem = memorySessionStore.get(key);
    if (mem) {
      mem.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  },

  async mGet(keys: string[]) {
    if (keys.length === 0) {
      return [];
    }

    try {
      if (isRedisConnected) {
        return await redis.mget(...keys);
      }
    } catch {
      // Fall through
    }

    return keys.map((k) => {
      const mem = memorySessionStore.get(k);
      if (!mem) return null;
      if (mem.expiresAt && mem.expiresAt < Date.now()) {
        memorySessionStore.delete(k);
        return null;
      }
      return mem.value;
    });
  },

  async *scanIterator(options: RedisScanOptions) {
    if (isRedisConnected) {
      try {
        let cursor = "0";
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            "MATCH",
            options.MATCH,
            "COUNT",
            options.COUNT
          );

          cursor = nextCursor;

          if (keys.length > 0) {
            yield keys;
          }
        } while (cursor !== "0");
        return;
      } catch {
        // Fall through
      }
    }

    // Memory fallback scan
    const keys = Array.from(memorySessionStore.keys());
    if (keys.length > 0) {
      yield keys;
    }
  },
};