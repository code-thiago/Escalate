/**
 * Legacy formatter for standard float Reais (used by SimuladorJurosCompostos & ComparadorInvestimentos).
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Legacy alias for formatarMoeda (used by CotacaoWidget).
 */
export function formatarReal(valor: number): string {
  return formatarMoeda(valor);
}

/**
 * Formats integer cents (bigint or number) as Brazilian Real (BRL).
 */
export function formatCentsBRL(cents: bigint | number): string {
  const numCents = typeof cents === "bigint" ? Number(cents) : cents;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numCents / 100);
}

/**
 * Formats integer basis points (100 bps = 1.00%) as a percentage string.
 */
export function formatBpsPercent(bps: number, showSign = false): string {
  const pct = bps / 100;
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pct);
  if (showSign && bps > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

/**
 * Recursively converts BigInt properties in an object to strings for JSON serialization over HTTP.
 */
export function serializeBigIntJson<T>(data: T): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return data.toString();
  if (Array.isArray(data)) return data.map(serializeBigIntJson);
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = serializeBigIntJson(v);
    }
    return out;
  }
  return data;
}
