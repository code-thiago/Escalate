import { describe, it, expect } from 'vitest';
import { POST } from '../../../src/app/api/escalate/custody/route';

describe('WP-05.3: Live COE vs. CDI Opportunity Cost Audit (/api/escalate/custody)', () => {
  it('flags locked COEs yielding below CDI + illiquidity penalty as SUBOPTIMAL_VS_CDI and competitive structures as COMPETITIVE', async () => {
    const suboptimalRequest = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'AUDIT_COE',
        coeTicker: 'COE-SP500-LOCK-2029',
        expectedReturnAnnual: 0.105,
        cdiBenchmarkAnnual: 0.1115,
        liquidityDays: 1095,
      }),
    });

    const suboptimalResponse = await POST(suboptimalRequest);
    expect(suboptimalResponse.status).toBe(200);

    const suboptimalBody = await suboptimalResponse.json();
    expect(suboptimalBody.status).toBe('ok');
    expect(suboptimalBody.llmTokensUsed).toBe(0);
    expect(suboptimalBody.audit).toMatchObject({
      coeTicker: 'COE-SP500-LOCK-2029',
      illiquidityPenaltyAnnual: 0.0225,
      netSpreadVsCdiAnnual: -0.029,
      verdict: 'SUBOPTIMAL_VS_CDI',
    });

    const competitiveRequest = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'AUDIT_COE',
        coeTicker: 'COE-IPCA-PLUS-2027',
        expectedReturnAnnual: 0.155,
        cdiBenchmarkAnnual: 0.1115,
        liquidityDays: 730,
      }),
    });

    const competitiveResponse = await POST(competitiveRequest);
    expect(competitiveResponse.status).toBe(200);

    const competitiveBody = await competitiveResponse.json();
    expect(competitiveBody.status).toBe('ok');
    expect(competitiveBody.llmTokensUsed).toBe(0);
    expect(competitiveBody.audit).toMatchObject({
      coeTicker: 'COE-IPCA-PLUS-2027',
      illiquidityPenaltyAnnual: 0.015,
      netSpreadVsCdiAnnual: 0.0285,
      verdict: 'COMPETITIVE',
    });
  });
});
