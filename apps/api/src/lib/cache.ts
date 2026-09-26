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

export async function getCachedResponse<T>(
  message: string
): Promise<T | null> {
  const key = createCacheKey(message);

  const cached = await redis.get(key);

  if (!cached) {
    console.log(`[Redis] Cache MISS: ${key}`);
    return null;
  }

  console.log(`[Redis] Cache HIT: ${key}`);

  try {
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(
      "[Redis] Invalid cached response:",
      error
    );

    await redis.del(key);

    return null;
  }
}

export async function setCachedResponse<T>(
  message: string,
  response: T
): Promise<void> {
  const key = createCacheKey(message);

  await redis.set(
    key,
    JSON.stringify(response),
    "EX",
    CACHE_TTL_SECONDS
  );

  console.log(
    `[Redis] Cached response: ${key} | TTL=${CACHE_TTL_SECONDS}s`
  );
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