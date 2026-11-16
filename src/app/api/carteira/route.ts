import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { computeFullPortfolioDashboardState } from "@/src/core/finance/demo-portfolio";
import { serializeBigIntJson } from "@/src/lib/formatters";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  const { searchParams } = new URL(request.url);
  const horizonParam = Number(searchParams.get("horizonMonths") || "6");
  const horizonMonths = Number.isInteger(horizonParam)
    ? Math.max(1, Math.min(60, horizonParam))
    : 6;

  const dashboardState = computeFullPortfolioDashboardState(undefined, horizonMonths);

  return NextResponse.json({
    authenticated: Boolean(session?.user),
    userId: session?.user?.id ?? "guest-sandbox",
    data: serializeBigIntJson(dashboardState),
  });
}
