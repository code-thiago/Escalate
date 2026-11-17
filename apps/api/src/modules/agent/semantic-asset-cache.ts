// apps/api/src/modules/agent/semantic-asset-cache.ts

export interface AssetStructuralComputeResult {
  summary: string;
  geopoliticalShock: number;
  tokensUsed: number;
}

export interface AssetStructuralDigestResponse {
  ticker: string;
  summary: string;
  geopoliticalShock: number;
  cacheHit: boolean;
  tokensSaved: number;
}

interface CacheEntry extends AssetStructuralComputeResult {
  cachedAtMs: number;
}

export const SEMANTIC_CACHE_TTL_MS = 21_600_000; // 6 hours in milliseconds

export class SemanticAssetCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    { startedAtMs: number; promise: Promise<AssetStructuralComputeResult> }
  >();
  private totalTokensSaved = 0;

  public async getOrComputeAssetStructuralDigest(
    ticker: string,
    nowMs: number,
    computeFn: () => Promise<AssetStructuralComputeResult>
  ): Promise<AssetStructuralDigestResponse> {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) {
      throw new Error('SEMANTIC_CACHE_INVALID_TICKER: Ticker must be non-empty');
    }

    const existing = this.entries.get(normalizedTicker);
    if (existing && nowMs - existing.cachedAtMs < SEMANTIC_CACHE_TTL_MS) {
      this.totalTokensSaved += existing.tokensUsed;
      return {
        ticker: normalizedTicker,
        summary: existing.summary,
        geopoliticalShock: existing.geopoliticalShock,
        cacheHit: true,
        tokensSaved: existing.tokensUsed,
      };
    }

    const pending = this.inFlight.get(normalizedTicker);
    if (pending && nowMs - pending.startedAtMs < SEMANTIC_CACHE_TTL_MS) {
      const coalesced = await pending.promise;
      this.totalTokensSaved += coalesced.tokensUsed;
      return {
        ticker: normalizedTicker,
        summary: coalesced.summary,
        geopoliticalShock: coalesced.geopoliticalShock,
        cacheHit: true,
        tokensSaved: coalesced.tokensUsed,
      };
    }

    const computePromise = (async () => {
      try {
        const computed = await computeFn();
        this.entries.set(normalizedTicker, {
          ...computed,
          cachedAtMs: nowMs,
        });
        return computed;
      } finally {
        this.inFlight.delete(normalizedTicker);
      }
    })();

    this.inFlight.set(normalizedTicker, {
      startedAtMs: nowMs,
      promise: computePromise,
    });

    const fresh = await computePromise;
    return {
      ticker: normalizedTicker,
      summary: fresh.summary,
      geopoliticalShock: fresh.geopoliticalShock,
      cacheHit: false,
      tokensSaved: 0,
    };
  }

  public getTotalTokensSaved(): number {
    return this.totalTokensSaved;
  }

  public clear(): void {
    this.entries.clear();
    this.inFlight.clear();
    this.totalTokensSaved = 0;
  }
}
