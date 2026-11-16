import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isTest = process.env.NODE_ENV === "test";

const redis =
  !isTest &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

/**
 * Limitador GLOBAL para Cambio (Alpha Vantage)
 */
export const cambioGlobalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:cambio:global",
      analytics: true,
    })
  : null;

/**
 * Limitador POR IP para Cambio (Alpha Vantage)
 */
export const cambioIpLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      prefix: "ratelimit:cambio:ip",
      analytics: true,
    })
  : null;

/**
 * Limitador GLOBAL para Acoes (Brapi)
 */
export const acaoGlobalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "60 s"),
      prefix: "ratelimit:acao:global",
      analytics: true,
    })
  : null;

/**
 * Limitador POR IP para Acoes (Brapi)
 */
export const acaoIpLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit:acao:ip",
      analytics: true,
    })
  : null;

/**
 * Limitador Granular para o Quantum & ZEN Agent (/api/agent/forecast) - ADR-002
 */
export const agentForecastLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "midas:rl:agent",
      analytics: true,
    })
  : null;

/**
 * Limitador Granular para Sincronizacao de Contas (/api/conexoes) - ADR-002
 */
export const connectorSyncLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "midas:rl:sync",
      analytics: true,
    })
  : null;

/**
 * Extrai o endereco IP do cliente a partir do cabecalho x-forwarded-for
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  return "unknown";
}
