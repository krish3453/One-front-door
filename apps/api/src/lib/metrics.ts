type Metrics = {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  rateLimited: number;
  errors: number;
  totalLatencyMs: number;
};

const metrics: Metrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rateLimited: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export function recordRequest() {
  metrics.totalRequests++;
}

export function recordCacheHit() {
  metrics.cacheHits++;
}

export function recordCacheMiss() {
  metrics.cacheMisses++;
}

export function recordRateLimited() {
  metrics.rateLimited++;
}

export function recordError() {
  metrics.errors++;
}

export function recordLatency(
  latencyMs: number
) {
  metrics.totalLatencyMs += latencyMs;
}

export function getMetrics() {
  const averageLatencyMs =
    metrics.totalRequests > 0
      ? Math.round(
          metrics.totalLatencyMs /
            metrics.totalRequests
        )
      : 0;

  const cacheLookups =
    metrics.cacheHits +
    metrics.cacheMisses;

  const cacheHitRate =
    cacheLookups > 0
      ? Number(
          (
            (metrics.cacheHits /
              cacheLookups) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    ...metrics,
    averageLatencyMs,
    cacheHitRate,
  };
}