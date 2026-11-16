import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { connectorSyncLimiter, getClientIp } from "@/src/lib/rate-limit";
import { accountConnectorProvider } from "@/src/connectors";
import { INITIAL_CONNECTED_ACCOUNTS } from "@/src/core/finance/demo-portfolio";
import { serializeBigIntJson } from "@/src/lib/formatters";

export const runtime = "nodejs";

const SyncRequestSchema = z.object({
  providerType: z.enum(["OPEN_FINANCE_SANDBOX", "B3_CSV", "MANUAL"]),
  institutionName: z.string().min(2).max(120),
  payload: z.unknown().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  return NextResponse.json({
    authenticated: Boolean(session?.user),
    userId: session?.user?.id ?? "guest-sandbox",
    accounts: serializeBigIntJson(INITIAL_CONNECTED_ACCOUNTS),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (connectorSyncLimiter) {
      const ip = getClientIp(request);
      const check = await connectorSyncLimiter.limit(ip);
      if (!check.success) {
        return NextResponse.json(
          { error: "Limite de sincronizacao de contas excedido (ADR-002)." },
          { status: 429 },
        );
      }
    }

    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const effectiveUserId = session?.user?.id ?? "guest-sandbox";

    const body = await request.json().catch(() => null);
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de sincronizacao invalido.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { providerType, payload } = parsed.data;
    const connector = accountConnectorProvider.getAdapter(providerType);
    const syncedPositions = await connector.syncPositions(
      effectiveUserId,
      payload ?? (providerType === "OPEN_FINANCE_SANDBOX" ? { scenario: "balanced" } : undefined),
    );

    return NextResponse.json({
      status: "SYNC_COMPLETED",
      providerType,
      userId: effectiveUserId,
      syncedCount: syncedPositions.length,
      positions: serializeBigIntJson(syncedPositions),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao sincronizar conta de investimento.",
      },
      { status: 500 },
    );
  }
}
