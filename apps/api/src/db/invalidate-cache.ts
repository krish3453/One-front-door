import "dotenv/config";

import { invalidateChatCache } from "../lib/cache.js";

async function main() {
  console.log("[Cache] Invalidating chat cache...");

  await invalidateChatCache();

  console.log("[Cache] Chat cache invalidated.");
}

main().catch((error) => {
  console.error(
    "[Cache] Failed to invalidate cache:",
    error
  );

  process.exit(1);
});