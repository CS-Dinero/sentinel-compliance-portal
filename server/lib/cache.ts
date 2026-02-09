import crypto from "crypto";

interface CacheEntry {
  value: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function generateCacheKey(input: {
  finding_title: string;
  category: string;
  severity: string;
  evidence_snippet?: string;
}): string {
  const normalized = JSON.stringify({
    finding_title: input.finding_title.toLowerCase().trim(),
    category: input.category.toLowerCase().trim(),
    severity: input.severity.toLowerCase().trim(),
    evidence_snippet: (input.evidence_snippet || "").slice(0, 200).toLowerCase().trim(),
  });
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function getCachedRemediation(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setCachedRemediation(key: string, value: string): void {
  cache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

export function clearExpiredCache(): void {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}
