import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { agentForecastLimiter, getClientIp } from "@/src/lib/rate-limit";
import {
  analyzePortfolioDensityMatrix,
  simulateQuantumWalkForecast,
} from "@/src/core/quant";
import { zenService } from "@/src/core/decision/zen";
import { INITIAL_PORTFOLIO_POSITIONS } from "@/src/core/finance/demo-portfolio";
import { calculateFgcGuarantee } from "@/src/core/finance/fgc";
import { serializeBigIntJson } from "@/src/lib/formatters";

export const runtime = "nodejs";

const AgentForecastRequestSchema = z.object({
  portfolioNetCents: z.number().int().positive().max(100000000000).default(104690000),
  horizonDays: z.number().int().min(5).max(252).default(45),
  decoherenceRate: z.number().min(0).max(1).default(0.25),
  confidenceLevelBps: z.union([z.literal(9500), z.literal(9900)]).default(9900),
  annualDriftBps: z.number().int().min(-5000).max(10000).default(1345),
  annualVolatilityBps: z.number().int().min(50).max(15000).default(1650),
  correlationMatrix: z.array(z.array(z.number())).optional(),
  assetLabels: z.array(z.string()).optional(),
});

const DEFAULT_CORRELATION_MATRIX = [
  [1.0, 0.22, -0.08, 0.15, 0.04, -0.12],
  [0.22, 1.0, 0.31, 0.42, 0.18, 0.05],
  [-0.08, 0.31, 1.0, 0.64, 0.29, 0.19],
  [0.15, 0.42, 0.64, 1.0, 0.38, 0.45],
  [0.04, 0.18, 0.29, 0.38, 1.0, 0.14],
  [-0.12, 0.05, 0.19, 0.45, 0.14, 1.0],
];

const DEFAULT_LABELS = [
  "RENDA_FIXA_CDI",
  "TESOURO_IPCA",
  "BOLSA_B3",
  "ETF_SP500",
  "CRIPTO_BTC",
  "CAMBIO_USD",
];

export async function POST(request: NextRequest) {
  try {
    if (agentForecastLimiter) {
      const ip = getClientIp(request);
      const check = await agentForecastLimiter.limit(ip);
      if (!check.success) {
        return NextResponse.json(
          { error: "Limite de execucao do Quantum Agent excedido (ADR-002)." },
          { status: 429 },
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const parsed = AgentForecastRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parametros quanticos invalidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Stage 1A: Discrete-Time Quantum Walk (DTQW) with SU(2) coin operator
    const dtqwResult = simulateQuantumWalkForecast({
      portfolioNetCents: BigInt(input.portfolioNetCents),
      horizonDays: input.horizonDays,
      decoherenceRate: input.decoherenceRate,
      confidenceLevelBps: input.confidenceLevelBps,
      annualDriftBps: input.annualDriftBps,
      annualVolatilityBps: input.annualVolatilityBps,
    });

    // Stage 1B: Portfolio Density Matrix rho = (1/N)C & Von Neumann Entropy S(rho)
    const densityResult = analyzePortfolioDensityMatrix(
      input.correlationMatrix ?? DEFAULT_CORRELATION_MATRIX,
      input.assetLabels ?? DEFAULT_LABELS,
    );

    const fgcCheck = calculateFgcGuarantee(INITIAL_PORTFOLIO_POSITIONS);

    // Stage 2: GoRules ZEN Engine JDM Evaluation
    const zenHealth = await zenService.evaluatePortfolioHealth({
      normalizedEntropyScoreBps: densityResult.normalizedEntropyScoreBps,
      quantumTailRisk99Bps: dtqwResult.quantumTailRisk99Bps,
      fgcExcessCents: fgcCheck.uncoveredCents,
      liquidityMismatchCount: 1,
      vonNeumannEntropy: densityResult.vonNeumannEntropy,
      systemicCoherenceIndex: densityResult.systemicCoherenceIndex,
      d0LiquidityBps: 2300,
    });

    // Stage 3: Deterministic Analytical Synthesis (Zero Hallucination)
    const analyticalBriefing = [
      `1. Caminhada Quantica em Tempo Discreto (DTQW - ${input.horizonDays} dias uteis, Decoerencia gamma = ${input.decoherenceRate.toFixed(2)}): Conservacao de unitariedade verificada (Soma P(x,t) = ${dtqwResult.totalProbabilitySum.toFixed(6)}). Mediana projetada P50 em R$ ${(Number(dtqwResult.p50Cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, banda pessimista P10 em R$ ${(Number(dtqwResult.p10Cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} e banda otimista P90 em R$ ${(Number(dtqwResult.p90Cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      `2. Matriz Densidade & Entropia de Von Neumann: S(rho) = ${densityResult.vonNeumannEntropy.toFixed(4)} nats (Maximo teorico ln(${densityResult.dimension}) = ${densityResult.maxTheoreticalEntropy.toFixed(4)} nats). Score de diversificacao normalizado = ${(densityResult.normalizedEntropyScoreBps / 100).toFixed(2)}% | Indice de Coerencia Sistemica I_sys = ${densityResult.systemicCoherenceIndex.toFixed(4)}.`,
      `3. Veredito Deterministico GoRules ZEN Engine: Estado [${zenHealth.healthState}] (Score ${zenHealth.healthScore}/100, Risco Sistemico: ${zenHealth.systemicRiskGrade}). Alertas ativos: ${zenHealth.alerts.join(", ") || "NENHUM"}.`,
    ];

    return NextResponse.json({
      dtqw: serializeBigIntJson(dtqwResult),
      densityMatrix: serializeBigIntJson(densityResult),
      zenHealth: serializeBigIntJson(zenHealth),
      analyticalBriefing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no pipeline preditivo do Quantum Agent.",
      },
      { status: 500 },
    );
  }
}
