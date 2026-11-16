import "server-only";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

export interface ZenDecisionTrace {
  graphName: string;
  performanceMs: number;
  nodeExecutionTrace: unknown[];
  result: unknown;
}

export interface GoalGuardInput {
  totalAllocatedBps: number;
  assetLiquidityDays: number;
  goalTargetDays: number;
  assetLiquidityTier?: string;
  goalHorizonMonths?: number;
  allocationBps?: number;
  riskProfile?: "CONSERVADOR" | "MODERADO" | "ARROJADO" | string;
}

export interface GoalGuardOutput {
  status: "APPROVED" | "WARNING" | "REJECTED";
  approved: boolean;
  adjustedAllocationBps: number;
  warningFlags: string[];
  trace: unknown;
}

export interface ProductAnalysisInput {
  productClass: string;
  annualRateBps: number;
  feeBps: number;
  fgcCovered: boolean;
  liquidityTier: string;
  holdingPeriodDays?: number;
  isExemptTax?: boolean;
  performanceFeeBps?: number;
}

export interface ProductAnalysisOutput {
  criticalScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  redFlags: string[];
  strengths: string[];
  recommendation: string;
  trace: unknown;
}

export interface PortfolioHealthInput {
  normalizedEntropyScoreBps: number;
  quantumTailRisk99Bps: number;
  fgcExcessCents: bigint | number;
  liquidityMismatchCount: number;
  vonNeumannEntropy?: number;
  systemicCoherenceIndex?: number;
  d0LiquidityBps?: number;
  hhiConcentration?: number;
}

export interface PortfolioHealthOutput {
  healthState: "HEALTHY" | "WARNING" | "CRITICAL";
  healthScore: number;
  systemicRiskGrade: string;
  rebalanceRequired: boolean;
  alerts: string[];
  actions: string[];
  trace: unknown;
}

export interface ZenService {
  evaluateDecision<T = unknown>(
    graphName: string,
    inputData: Record<string, unknown>,
    options?: { trace?: boolean },
  ): Promise<{ result: T; performanceMs: number; trace: unknown }>;

  evaluateGoalGuard(input: GoalGuardInput): Promise<GoalGuardOutput>;
  evaluateProductAnalysis(
    input: ProductAnalysisInput,
  ): Promise<ProductAnalysisOutput>;
  evaluatePortfolioHealth(
    input: PortfolioHealthInput,
  ): Promise<PortfolioHealthOutput>;

  preloadGraphs(): Promise<void>;
  clearCache(): void;
}

/**
 * Recursively converts all BigInt values in an object to safe Numbers.
 * Throws RangeError if a BigInt exceeds Number.MAX_SAFE_INTEGER.
 */
export function sanitizeZenInput<T>(input: T): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === "bigint") {
    if (
      input > BigInt(Number.MAX_SAFE_INTEGER) ||
      input < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new RangeError(
        `BigInt value ${input.toString()} exceeds safe JavaScript Number bounds for ZenEngine.`,
      );
    }
    return Number(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeZenInput);
  }
  if (typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeZenInput(value);
    }
    return sanitized;
  }
  return input;
}

/**
 * Resolves standard graph file path in src/core/decision/graphs/
 */
export function resolveGraphPath(graphName: string): string {
  const normalizedName = graphName.endsWith(".jdm.json")
    ? graphName
    : graphName.endsWith(".json")
      ? graphName
      : `${graphName}.jdm.json`;

  return path.resolve(
    process.cwd(),
    "src",
    "core",
    "decision",
    "graphs",
    normalizedName,
  );
}

/**
 * Evaluates a single ZEN unary condition expression against an input value.
 */
function matchesUnaryCondition(conditionRaw: string, val: unknown): boolean {
  const condition = conditionRaw.trim();
  if (!condition || condition === "-") {
    return true;
  }

  // Range expression: [min..max]
  const rangeMatch = /^\[(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)\]$/.exec(
    condition,
  );
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    const numVal = Number(val);
    return !Number.isNaN(numVal) && numVal >= min && numVal <= max;
  }

  if (condition.startsWith(">=")) {
    const target = Number(condition.slice(2).trim());
    return Number(val) >= target;
  }
  if (condition.startsWith("<=")) {
    const target = Number(condition.slice(2).trim());
    return Number(val) <= target;
  }
  if (condition.startsWith(">")) {
    const target = Number(condition.slice(1).trim());
    return Number(val) > target;
  }
  if (condition.startsWith("<")) {
    const target = Number(condition.slice(1).trim());
    return Number(val) < target;
  }
  if (condition.startsWith("==")) {
    const rawTarget = condition
      .slice(2)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    return String(val) === rawTarget;
  }

  if (condition === "true" || condition === "false") {
    return Boolean(val) === (condition === "true");
  }

  // Comma-separated list of quoted strings, e.g. "'D_0', 'D_1_TO_5'"
  if (condition.includes("'")) {
    const parts = condition
      .split(",")
      .map((p) => p.trim().replace(/^['"]|['"]$/g, ""));
    return parts.includes(String(val));
  }

  return String(val) === condition;
}

/**
 * Deterministic JDM Graph Evaluator (Supports native @gorules/zen-engine & portable TS JDM execution)
 */
function evaluateJdmModel(
  rawContent: string,
  context: Record<string, unknown>,
): { result: Record<string, unknown>; trace: Record<string, unknown> } {
  const model = JSON.parse(rawContent);
  const dtNode = model.nodes?.find(
    (n: { type: string }) => n.type === "decisionTableNode",
  );
  if (!dtNode || !dtNode.content) {
    return { result: {}, trace: { fallback: true } };
  }

  const { inputs, outputs, rules } = dtNode.content;
  let matchedRule: Record<string, string> | null = null;
  let matchedIndex = -1;

  for (let idx = 0; idx < (rules || []).length; idx++) {
    const rule = rules[idx];
    let allInputsMatch = true;
    for (const inp of inputs || []) {
      const field = inp.field;
      const condition = rule[inp.id] ?? "";
      if (!matchesUnaryCondition(condition, context[field])) {
        allInputsMatch = false;
        break;
      }
    }
    if (allInputsMatch) {
      matchedRule = rule;
      matchedIndex = idx;
      break; // hitPolicy: "first"
    }
  }

  const result: Record<string, unknown> = {};
  if (matchedRule) {
    for (const out of outputs || []) {
      const rawVal = matchedRule[out.id]?.trim();
      if (rawVal !== undefined) {
        if (rawVal === "true") {
          result[out.field] = true;
        } else if (rawVal === "false") {
          result[out.field] = false;
        } else if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
          result[out.field] = Number(rawVal);
        } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
          result[out.field] = rawVal.slice(1, -1);
        } else if (rawVal in context) {
          result[out.field] = context[rawVal];
        } else {
          result[out.field] = rawVal;
        }
      }
    }
  }

  return {
    result,
    trace: {
      inputNode: {
        id: model.nodes?.[0]?.id ?? "input",
        input: context,
      },
      decisionTableNode: {
        id: dtNode.id,
        name: dtNode.name,
        matchedRuleId: matchedRule?._id ?? null,
        matchedRuleDescription: matchedRule?._description ?? null,
        ruleIndex: matchedIndex,
        output: result,
      },
    },
  };
}

class ZenServiceImpl implements ZenService {
  private rawGraphCache = new Map<string, string>();
  private nativeEngine: unknown = null;
  private nativeInitialized = false;

  private async tryGetNativeEngine(): Promise<{
    createDecision: (buf: Buffer) => Promise<{
      evaluate: (
        ctx: unknown,
        opts: { trace: boolean },
      ) => Promise<{ result: unknown; trace: unknown }>;
    }>;
  } | null> {
    if (this.nativeInitialized) {
      return this.nativeEngine as never;
    }
    this.nativeInitialized = true;
    try {
      const mod = await import("@gorules/zen-engine");
      if (mod && typeof mod.ZenEngine === "function") {
        this.nativeEngine = new mod.ZenEngine();
      }
    } catch {
      this.nativeEngine = null;
    }
    return this.nativeEngine as never;
  }

  clearCache(): void {
    this.rawGraphCache.clear();
  }

  async preloadGraphs(): Promise<void> {
    const graphs = [
      "goal-allocation-guard",
      "product-critical-analysis",
      "portfolio-quantum-health",
    ];
    for (const graph of graphs) {
      await this.loadRawGraph(graph);
    }
  }

  private async loadRawGraph(graphName: string): Promise<string> {
    const normalizedKey = graphName.replace(/\.jdm\.json$|\.json$/, "");
    if (this.rawGraphCache.has(normalizedKey)) {
      return this.rawGraphCache.get(normalizedKey)!;
    }
    const filePath = resolveGraphPath(normalizedKey);
    const rawContent = await fs.readFile(filePath, "utf-8");
    this.rawGraphCache.set(normalizedKey, rawContent);
    return rawContent;
  }

  async evaluateDecision<T = unknown>(
    graphName: string,
    inputData: Record<string, unknown>,
    options: { trace?: boolean } = { trace: true },
  ): Promise<{ result: T; performanceMs: number; trace: unknown }> {
    const sanitizedInput = sanitizeZenInput(inputData) as Record<
      string,
      unknown
    >;
    const startTime = performance.now();
    const rawContent = await this.loadRawGraph(graphName);

    const native = await this.tryGetNativeEngine();
    if (native) {
      try {
        const decision = await native.createDecision(
          Buffer.from(rawContent, "utf-8"),
        );
        const res = await decision.evaluate(sanitizedInput, {
          trace: options.trace ?? true,
        });
        const elapsed = performance.now() - startTime;
        return {
          result: res.result as T,
          performanceMs: Math.max(0.01, Number(elapsed.toFixed(2))),
          trace: options.trace === false ? null : (res.trace ?? {}),
        };
      } catch {
        // Fallback to deterministic JDM engine
      }
    }

    const evaluated = evaluateJdmModel(rawContent, sanitizedInput);
    const elapsed = performance.now() - startTime;

    return {
      result: evaluated.result as T,
      performanceMs: Math.max(0.01, Number(elapsed.toFixed(2))),
      trace: options.trace === false ? null : evaluated.trace,
    };
  }

  async evaluateGoalGuard(input: GoalGuardInput): Promise<GoalGuardOutput> {
    const sanitized = sanitizeZenInput(input) as GoalGuardInput;
    const tier =
      sanitized.assetLiquidityTier ||
      (sanitized.assetLiquidityDays <= 0
        ? "D_0"
        : sanitized.assetLiquidityDays <= 5
          ? "D_1_TO_5"
          : sanitized.assetLiquidityDays <= 30
            ? "D_6_TO_30"
            : sanitized.assetLiquidityDays <= 180
              ? "D_PLUS_30"
              : "AT_MATURITY");

    const horizonMonths =
      sanitized.goalHorizonMonths ??
      Math.max(1, Math.floor(sanitized.goalTargetDays / 30));
    const allocBps = sanitized.allocationBps ?? sanitized.totalAllocatedBps;

    const payload = {
      assetLiquidityTier: tier,
      goalHorizonMonths: horizonMonths,
      allocationBps: allocBps,
      riskProfile: sanitized.riskProfile || "MODERADO",
    };

    const evaluation = await this.evaluateDecision<Record<string, unknown>>(
      "goal-allocation-guard",
      payload,
      { trace: true },
    );

    const res = evaluation.result;
    const approved = res.approved === true;
    const violations = String(res.violations || "NONE");
    const warnings = String(res.warnings || "NONE");
    const adjustedAllocationBps =
      typeof res.adjustedAllocationBps === "number"
        ? res.adjustedAllocationBps
        : allocBps;

    const warningFlags: string[] = [];
    if (violations !== "NONE") warningFlags.push(violations);
    if (warnings !== "NONE") warningFlags.push(warnings);

    // Additional direct check if asset liquidity days exceed goal target days
    if (
      approved &&
      sanitized.assetLiquidityDays > sanitized.goalTargetDays &&
      !warningFlags.includes("LIQUIDITY_MISMATCH_WARNING")
    ) {
      warningFlags.push("LIQUIDITY_MISMATCH_WARNING");
    }

    const status: "APPROVED" | "WARNING" | "REJECTED" = !approved
      ? "REJECTED"
      : warningFlags.length > 0
        ? "WARNING"
        : "APPROVED";

    return {
      status,
      approved,
      adjustedAllocationBps,
      warningFlags,
      trace: evaluation.trace,
    };
  }

  async evaluateProductAnalysis(
    input: ProductAnalysisInput,
  ): Promise<ProductAnalysisOutput> {
    const sanitized = sanitizeZenInput(input) as ProductAnalysisInput;
    const payload = {
      productClass: sanitized.productClass,
      managementFeeBps: sanitized.feeBps,
      performanceFeeBps: sanitized.performanceFeeBps ?? 0,
      holdingPeriodDays: sanitized.holdingPeriodDays ?? 365,
      hasFgc: sanitized.fgcCovered,
      isExemptTax: sanitized.isExemptTax ?? false,
    };

    const evaluation = await this.evaluateDecision<Record<string, unknown>>(
      "product-critical-analysis",
      payload,
      { trace: true },
    );

    const res = evaluation.result;
    const criticalScore =
      typeof res.criticalScore === "number" ? res.criticalScore : 65;
    const riskLevelRaw = String(res.riskLevel || "MODERATE") as
      | "LOW"
      | "MODERATE"
      | "HIGH"
      | "CRITICAL";
    const flagsRaw = String(res.hiddenCostFlags || "");
    const recommendation = String(
      res.recommendation || "EVALUATE_NET_SPREAD_AND_HOLDING_HORIZON",
    );

    const parsedFlags = flagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && s !== "NONE");

    const strengths: string[] = [];
    if (sanitized.fgcCovered) strengths.push("FGC_GUARANTEE_ACTIVE");
    if (sanitized.isExemptTax) strengths.push("INCOME_TAX_EXEMPT_PF");
    if (criticalScore >= 85) strengths.push("HIGH_STRUCTURAL_EFFICIENCY");
    if (sanitized.productClass === "tesouro_direto") {
      strengths.push("SOVEREIGN_CREDIT_SAFETY");
    }

    return {
      criticalScore,
      riskLevel: riskLevelRaw,
      redFlags: parsedFlags,
      strengths,
      recommendation,
      trace: evaluation.trace,
    };
  }

  async evaluatePortfolioHealth(
    input: PortfolioHealthInput,
  ): Promise<PortfolioHealthOutput> {
    const sanitized = sanitizeZenInput(input) as Record<string, number>;
    const normalizedEntropyScoreBps =
      sanitized.normalizedEntropyScoreBps ?? 7000;
    const systemicCoherenceIndex =
      sanitized.systemicCoherenceIndex ??
      Number((1 - normalizedEntropyScoreBps / 10000).toFixed(4));
    const vonNeumannEntropy =
      sanitized.vonNeumannEntropy ??
      Number(((normalizedEntropyScoreBps / 10000) * 2.0).toFixed(4));
    const d0LiquidityBps = sanitized.d0LiquidityBps ?? 1000;
    const hhiConcentration =
      sanitized.hhiConcentration ??
      (normalizedEntropyScoreBps < 3500 ? 3000 : 1200);

    const payload = {
      vonNeumannEntropy,
      systemicCoherenceIndex,
      d0LiquidityBps,
      hhiConcentration,
    };

    const evaluation = await this.evaluateDecision<Record<string, unknown>>(
      "portfolio-quantum-health",
      payload,
      { trace: true },
    );

    const res = evaluation.result;
    const healthScore =
      typeof res.healthScore === "number" ? res.healthScore : 72;
    const systemicRiskGrade = String(res.systemicRiskGrade || "MODERATE");
    const rebalanceRequired = Boolean(res.rebalanceRequired);
    const actions = String(res.actions || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const alerts: string[] = [...actions];
    if (normalizedEntropyScoreBps < 3500) {
      alerts.push("QUANTUM_ENTANGLEMENT_ALERT");
    }
    if ((sanitized.fgcExcessCents ?? 0) > 0) {
      alerts.push("FGC_CEILING_EXCEEDED");
    }
    if ((sanitized.liquidityMismatchCount ?? 0) > 0) {
      alerts.push("GOAL_LIQUIDITY_BREACH");
    }

    const healthState: "HEALTHY" | "WARNING" | "CRITICAL" =
      systemicRiskGrade === "CRITICAL" ||
      normalizedEntropyScoreBps < 3500 ||
      (sanitized.fgcExcessCents ?? 0) > 25000000
        ? "CRITICAL"
        : systemicRiskGrade === "HIGH" ||
            rebalanceRequired ||
            (sanitized.fgcExcessCents ?? 0) > 0 ||
            (sanitized.liquidityMismatchCount ?? 0) > 0
          ? "WARNING"
          : "HEALTHY";

    return {
      healthState,
      healthScore,
      systemicRiskGrade,
      rebalanceRequired: rebalanceRequired || healthState !== "HEALTHY",
      alerts,
      actions,
      trace: evaluation.trace,
    };
  }
}

const globalForZen = globalThis as unknown as {
  zenServiceInstance?: ZenService;
};

export const zenService: ZenService =
  globalForZen.zenServiceInstance || new ZenServiceImpl();

if (process.env.NODE_ENV !== "production") {
  globalForZen.zenServiceInstance = zenService;
}
