import { createHash } from "node:crypto";
import { redis } from "./redis.js";

const CACHE_TTL_SECONDS = Number(
  process.env.CACHE_TTL_SECONDS ?? 60 * 60
);

const CACHE_VERSION = "v1";

function normalizeMessage(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function createCacheKey(message: string): string {
  const normalizedMessage =
    normalizeMessage(message);

  const hash = createHash("sha256")
    .update(normalizedMessage)
    .digest("hex");

  return `chat:${CACHE_VERSION}:${hash}`;
}

const CONTEXTUAL_PRONOUNS_REGEX =
  /\b(it|its|this|that|these|those|there|they|them|same|previous|above|he|she|his|her|him)\b/i;

export function isContextualQuery(
  message: string,
  historyLength: number = 0
): boolean {
  if (historyLength <= 1) {
    return false;
  }
  return CONTEXTUAL_PRONOUNS_REGEX.test(message);
}

// In-memory fallback cache map for when Redis is offline
const memoryCache = new Map<string, { data: string; expiresAt: number }>();

export async function getCachedResponse<T>(
  message: string
): Promise<T | null> {
  const key = createCacheKey(message);

  // 1. Try Redis first
  try {
    const cached = await redis.get(key);

    if (cached) {
      console.log(`[Redis] Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    // Redis offline - fall through to memory cache
  }

  // 2. Check in-memory fallback cache
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > Date.now()) {
      console.log(`[MemoryCache] Cache HIT: ${key}`);
      return JSON.parse(mem.data) as T;
    }
    memoryCache.delete(key);
  }

  console.log(`[Cache] Cache MISS: ${key}`);
  return null;
}

export async function setCachedResponse<T>(
  message: string,
  response: T
): Promise<void> {
  const key = createCacheKey(message);
  const serialized = JSON.stringify(response);

  // 1. Save to Redis
  try {
    await redis.set(
      key,
      serialized,
      "EX",
      CACHE_TTL_SECONDS
    );

    console.log(
      `[Redis] Cached response: ${key} | TTL=${CACHE_TTL_SECONDS}s`
    );
  } catch (error) {
    // Redis offline - continue
  }

  // 2. Save to memory cache as fallback
  memoryCache.set(key, {
    data: serialized,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  });
}

export async function getChatCache<T>(
  message: string,
  conversationId?: string,
  historyLength: number = 0
): Promise<{ data: T; key: string } | null> {
  const isContextual = isContextualQuery(message, historyLength);

  // 1. Check conversation-specific cache first
  if (conversationId) {
    const convKey = `conversation:${conversationId}:${message}`;
    const cached = await getCachedResponse<T>(convKey);
    if (cached) {
      return { data: cached, key: convKey };
    }
  }

  // 2. If question is standalone (not pronoun-dependent), check global cache
  if (!isContextual) {
    const globalKey = `global:${message}`;
    const cached = await getCachedResponse<T>(globalKey);
    if (cached) {
      return { data: cached, key: globalKey };
    }
  }

  return null;
}

export async function saveChatCache<T>(
  message: string,
  response: T,
  conversationId?: string,
  historyLength: number = 0
): Promise<void> {
  const isContextual = isContextualQuery(message, historyLength);

  // Always cache under conversation key so repeated questions in the same conversation hit immediately
  if (conversationId) {
    const convKey = `conversation:${conversationId}:${message}`;
    await setCachedResponse(convKey, response);
  }

  // If question is standalone (not pronoun-dependent), also cache globally
  if (!isContextual) {
    const globalKey = `global:${message}`;
    await setCachedResponse(globalKey, response);
  }
}

export async function deleteCachedResponse(
  message: string
): Promise<void> {
  const key = createCacheKey(message);

  await redis.del(key);

  console.log(`[Redis] Deleted: ${key}`);
}

export async function invalidateChatCache(): Promise<void> {
  const pattern = `chat:${CACHE_VERSION}:*`;

  let cursor = "0";
  let deleted = 0;

  do {
    const result = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );

    cursor = result[0];

    const keys = result[1];

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  console.log(
    `[Redis] Invalidated ${deleted} cached responses`
  );
}