// src/app/api/escalate/custody/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  parseB3AndSinacorRows,
  auditCoeOpportunityCost,
} from '../../../../../apps/api/src/modules/portfolio/sinacor-b3-parser';
import { encryptBrokerApiKey } from '../../../../../apps/api/src/modules/security/envelope-vault';

const TEST_FALLBACK_MASTER_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const CustodyActionRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PARSE_SINACOR_B3'),
    rows: z.array(z.record(z.string(), z.string())).min(1),
  }),
  z.object({
    action: z.literal('AUDIT_COE'),
    coeTicker: z.string().min(1),
    expectedReturnAnnual: z.number(),
    cdiBenchmarkAnnual: z.number(),
    liquidityDays: z.number().int().min(0),
  }),
  z.object({
    action: z.literal('STORE_BROKER_KEY'),
    keyId: z.string().min(1),
    provider: z.enum(['BINANCE_READONLY', 'B3_CEI']),
    plaintextKey: z.string().min(1),
  }),
]);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json();
    const payload = CustodyActionRequestSchema.parse(rawBody);

    if (payload.action === 'PARSE_SINACOR_B3') {
      const assets = parseB3AndSinacorRows(payload.rows);
      return NextResponse.json(
        {
          status: 'ok',
          llmTokensUsed: 0,
          assets,
        },
        { status: 200 }
      );
    }

    if (payload.action === 'AUDIT_COE') {
      const audit = auditCoeOpportunityCost({
        coeTicker: payload.coeTicker,
        expectedReturnAnnual: payload.expectedReturnAnnual,
        cdiBenchmarkAnnual: payload.cdiBenchmarkAnnual,
        liquidityDays: payload.liquidityDays,
      });

      return NextResponse.json(
        {
          status: 'ok',
          llmTokensUsed: 0,
          audit,
        },
        { status: 200 }
      );
    }

    const masterKeyHex =
      process.env.ESCALATE_VAULT_MASTER_KEY ??
      (process.env.NODE_ENV === 'test' ? TEST_FALLBACK_MASTER_KEY : '');

    if (!masterKeyHex) {
      return NextResponse.json(
        { error: 'VAULT_MASTER_KEY_NOT_CONFIGURED' },
        { status: 400 }
      );
    }

    const vaultRecord = encryptBrokerApiKey({
      keyId: payload.keyId,
      provider: payload.provider,
      plaintextKey: payload.plaintextKey,
      masterKeyHex,
    });

    return NextResponse.json(
      {
        status: 'ok',
        record: {
          keyId: vaultRecord.keyId,
          provider: vaultRecord.provider,
          ciphertextHex: vaultRecord.ciphertextHex,
          ivHex: vaultRecord.ivHex,
          authTagHex: vaultRecord.authTagHex,
          createdAt: vaultRecord.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join('; ')
        : error instanceof Error
          ? error.message
          : 'CUSTODY_API_ERROR';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
