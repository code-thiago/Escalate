// apps/api/src/modules/billing/saas-token-meter.ts

export type SaaSSubscriptionTier = 'FREE_TRIAL' | 'PRO_QUANT' | 'INSTITUTIONAL';

export const SAAS_TIER_TOKEN_QUOTAS: Record<SaaSSubscriptionTier, number> = {
  FREE_TRIAL: 25_000,
  PRO_QUANT: 250_000,
  INSTITUTIONAL: 1_000_000,
};

export interface AuthorizeAndDebitParams {
  tenantId: string;
  tier: SaaSSubscriptionTier;
  requestedTokens: number;
  isZeroTokenDeterministicRoute?: boolean;
}

export interface AuthorizeAndDebitResult {
  allowed: boolean;
  remainingTokens: number;
  totalUsedTokens: number;
  reason?: string;
}

export class SaaSTokenMeter {
  private readonly usageLedger = new Map<string, number>();

  public authorizeAndDebitTokens(
    params: AuthorizeAndDebitParams
  ): AuthorizeAndDebitResult {
    const tierQuota = SAAS_TIER_TOKEN_QUOTAS[params.tier];
    const currentUsed = this.usageLedger.get(params.tenantId) ?? 0;

    if (params.isZeroTokenDeterministicRoute === true) {
      return {
        allowed: true,
        remainingTokens: Math.max(0, tierQuota - currentUsed),
        totalUsedTokens: currentUsed,
      };
    }

    const requested = Math.max(0, Math.trunc(params.requestedTokens));

    if (currentUsed + requested > tierQuota) {
      return {
        allowed: false,
        remainingTokens: Math.max(0, tierQuota - currentUsed),
        totalUsedTokens: currentUsed,
        reason: 'SAAS_TOKEN_QUOTA_EXCEEDED',
      };
    }

    const updatedUsed = currentUsed + requested;
    this.usageLedger.set(params.tenantId, updatedUsed);

    return {
      allowed: true,
      remainingTokens: Math.max(0, tierQuota - updatedUsed),
      totalUsedTokens: updatedUsed,
    };
  }

  public getTenantUsage(tenantId: string): number {
    return this.usageLedger.get(tenantId) ?? 0;
  }

  public resetTenantUsage(tenantId: string): void {
    this.usageLedger.delete(tenantId);
  }
}
