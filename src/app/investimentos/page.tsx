"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import { computeFullPortfolioDashboardState } from "@/src/core/finance/demo-portfolio";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";

export default function InvestimentosCalendarDashboardPage() {
  const [horizonMonths, setHorizonMonths] = useState<number>(6);
  const [selectedMonthYM, setSelectedMonthYM] = useState<string>("2026-11");

  const dashboard = useMemo(
    () => computeFullPortfolioDashboardState(undefined, horizonMonths),
    [horizonMonths],
  );

  const selectedMonth = useMemo(
    () =>
      dashboard.calendarMonths.find((m) => m.yearMonth === selectedMonthYM) ??
      dashboard.calendarMonths[0],
    [dashboard.calendarMonths, selectedMonthYM],
  );

  const totalGainCents =
    dashboard.consolidation.totalNetCents -
    dashboard.positions.reduce((acc, p) => acc + p.investedCents, 0n);

  return (
    <PlatformShell
      title="Aba 01 — Investimentos: Calendario Financeiro Bifasico"
      subtitle="Acompanhamento unificado de rentabilidade realizada (historico contabilmente verificado) e projecao estocastica futura (P10 / P50 / P90)"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/investimentos/carteira"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity"
          >
            Minha Carteira
          </Link>
          <Link
            href="/investimentos/objetivos"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors"
          >
            Objetivos (Bps)
          </Link>
          <Link
            href="/investimentos/conexoes"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors tabular-financial"
          >
            Conectar Contas ({dashboard.accounts.length})
          </Link>
        </div>
      }
    >
      {/* Top KPI Ribbon */}
      <section
        aria-label="Indicadores Consolidados do Patrimonio"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4">
          <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
            Patrimonio Liquido Consolidado
          </span>
          <div className="text-xl xl:text-2xl font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
            {formatCentsBRL(dashboard.consolidation.totalNetCents)}
          </div>
          <div className="text-xs text-[var(--ds-market-positive)] mt-1 tabular-financial">
            Bruto: {formatCentsBRL(dashboard.consolidation.totalGrossCents)}
          </div>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4">
          <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
            Lucro Liquido Acumulado
          </span>
          <div className="text-xl xl:text-2xl font-bold text-[var(--ds-market-positive)] mt-1 tabular-financial">
            +{formatCentsBRL(totalGainCents)}
          </div>
          <div className="text-xs text-[var(--ds-text-secondary)] mt-1 tabular-financial">
            Realizado no Calendario:{" "}
            {formatCentsBRL(dashboard.calendarSummary.totalRealizedYieldCents)}
          </div>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4">
          <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)] tabular-financial">
            Previsao de Renda Futura (P50 - {horizonMonths}m)
          </span>
          <div className="text-xl xl:text-2xl font-bold text-[var(--ds-accent-quant)] mt-1 tabular-financial">
            +{formatCentsBRL(dashboard.calendarSummary.totalProjectedP50YieldCents)}
          </div>
          <div className="text-xs text-[var(--ds-text-secondary)] mt-1 tabular-financial">
            Vencimentos Programados:{" "}
            {formatCentsBRL(dashboard.calendarSummary.totalMaturitiesCents)}
          </div>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4">
          <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)] tabular-financial">
            Cobertura FGC (Teto R$ 250k / R$ 1M)
          </span>
          <div className="text-xl xl:text-2xl font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
            {formatCentsBRL(dashboard.fgcAnalysis.coveredCents)}
          </div>
          <div
            className={`text-xs mt-1 tabular-financial ${
              dashboard.fgcAnalysis.uncoveredCents > 0n
                ? "text-[var(--ds-market-warning)]"
                : "text-[var(--ds-market-positive)]"
            }`}
          >
            Descoberto Elegivel:{" "}
            {formatCentsBRL(dashboard.fgcAnalysis.uncoveredCents)}
          </div>
        </div>
      </section>

      {/* Biphasic Calendar Controls & Grid */}
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--ds-border-subtle)] pb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--ds-text-primary)]">
              Calendario Financeiro Bifasico (Passado Realizado vs. Futuro Projetado)
            </h2>
            <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
              Clique em qualquer mes para inspecionar os eventos contabeis realizados ou as bandas de rentabilidade futura P10, P50 e P90.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="horizon-select"
              className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]"
            >
              Horizonte Futuro:
            </label>
            <select
              id="horizon-select"
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-1.5 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
            >
              <option value={3}>+3 Meses</option>
              <option value={6}>+6 Meses</option>
              <option value={12}>+12 Meses</option>
              <option value={24}>+24 Meses</option>
            </select>
          </div>
        </div>

        {/* Biphasic Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-[family-name:var(--ds-font-mono)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[var(--ds-market-positive)]/20 border border-[var(--ds-market-positive)]/60 inline-block" />
            <span className="text-[var(--ds-text-secondary)]">
              FASE 1: REALIZADO (Contabil / Proventos / Accrual)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[var(--ds-accent-quant)]/20 border border-[var(--ds-accent-quant)]/60 inline-block" />
            <span className="text-[var(--ds-text-secondary)]">
              FASE 2: PROJETADO (Estocastico P10 / P50 / P90 &amp; Vencimentos)
            </span>
          </div>
        </div>

        {/* Calendar Months Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {dashboard.calendarMonths.map((month) => {
            const isRealized = month.phase === "realized";
            const isSelected = selectedMonth?.yearMonth === month.yearMonth;

            return (
              <button
                key={month.yearMonth}
                type="button"
                onClick={() => setSelectedMonthYM(month.yearMonth)}
                className={`text-left rounded-lg p-3.5 border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--ds-surface-elevated)] border-[var(--ds-accent-quant)] ring-1 ring-[var(--ds-accent-quant)]"
                    : isRealized
                      ? "bg-[var(--ds-bg-primary)] border-[var(--ds-market-positive)]/30 hover:border-[var(--ds-market-positive)]"
                      : "bg-[var(--ds-bg-primary)] border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-quant)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ds-text-primary)] tabular-financial">
                    {month.yearMonth}
                  </span>
                  <span
                    className={`font-[family-name:var(--ds-font-mono)] text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      isRealized
                        ? "bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)]"
                        : "bg-[var(--ds-accent-quant)]/15 text-[var(--ds-accent-quant)]"
                    }`}
                  >
                    {isRealized ? "REALIZADO" : "PROJETADO"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] text-[var(--ds-text-secondary)]">
                    {isRealized ? "Rendimento Realizado" : "Rendimento Esperado (P50)"}
                  </div>
                  <div
                    className={`text-sm font-semibold tabular-financial mt-0.5 ${
                      isRealized
                        ? "text-[var(--ds-market-positive)]"
                        : "text-[var(--ds-accent-quant)]"
                    }`}
                  >
                    +{formatCentsBRL(month.totalYieldCents)}
                  </div>
                  <div className="text-[11px] text-[var(--ds-text-secondary)] tabular-financial">
                    Taxa Mensal: {formatBpsPercent(month.yieldBps, true)}
                  </div>
                </div>

                {month.projectedPercentiles && (
                  <div className="mt-2 pt-2 border-t border-[var(--ds-border-subtle)] text-[10px] text-[var(--ds-text-secondary)] space-y-0.5 tabular-financial">
                    <div>P10: {formatCentsBRL(month.projectedPercentiles.p10Cents)}</div>
                    <div>P90: {formatCentsBRL(month.projectedPercentiles.p90Cents)}</div>
                  </div>
                )}

                <div className="mt-2 text-[11px] text-[var(--ds-text-secondary)] tabular-financial">
                  Eventos: {month.events.length}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Month Detail Drawer */}
        {selectedMonth && (
          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--ds-border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
                  Detalhamento Mensal: {selectedMonth.yearMonth} (
                  {selectedMonth.phase === "realized"
                    ? "Fase Realizada"
                    : "Fase Projetada"}
                  )
                </h3>
                <p className="text-xs text-[var(--ds-text-secondary)]">
                  Fluxo de Caixa Liquido do Mes:{" "}
                  <span className="text-[var(--ds-text-primary)] tabular-financial">
                    {formatCentsBRL(selectedMonth.netCashflowCents ?? 0n)}
                  </span>
                </p>
              </div>

              {selectedMonth.projectedPercentiles && (
                <div className="flex flex-wrap items-center gap-4 text-xs tabular-financial">
                  <span className="text-[var(--ds-market-warning)]">
                    Pessimista (P10):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p10Cents)}
                  </span>
                  <span className="text-[var(--ds-accent-quant)] font-semibold">
                    Base (P50):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p50Cents)}
                  </span>
                  <span className="text-[var(--ds-market-positive)]">
                    Otimista (P90):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p90Cents)}
                  </span>
                </div>
              )}
            </div>

            {selectedMonth.events.length === 0 ? (
              <p className="text-xs text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-mono)] py-2">
                Nenhum vencimento extraordinario neste mes; rendimento composto por accrual continuo da carteira.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-mono)]">
                      <th className="py-2 pr-4">Data</th>
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Ativo</th>
                      <th className="py-2 pr-4">Descricao</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ds-border-subtle)] tabular-financial">
                    {selectedMonth.events.map((ev, i) => (
                      <tr key={`${ev.date}-${i}`} className="text-[var(--ds-text-primary)]">
                        <td className="py-2 pr-4 tabular-financial">{ev.date}</td>
                        <td className="py-2 pr-4 uppercase text-[var(--ds-accent-quant)]">
                          {ev.type}
                        </td>
                        <td className="py-2 pr-4">{ev.assetId ?? "-"}</td>
                        <td className="py-2 pr-4 font-[family-name:var(--ds-font-sans)] text-[var(--ds-text-secondary)]">
                          {ev.description}
                        </td>
                        <td className="py-2 text-right text-[var(--ds-market-positive)] font-semibold tabular-financial">
                          {formatCentsBRL(ev.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Preview of Minha Carteira & Objetivos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
              Resumo Minha Carteira (Conservacao Exata 10.000 bps)
            </h3>
            <Link
              href="/investimentos/carteira"
              className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)] hover:underline"
            >
              Ver Carteira Completa -&gt;
            </Link>
          </div>
          <div className="space-y-2.5">
            {Object.entries(dashboard.consolidation.classAllocations).map(
              ([cls, data]) =>
                data && (
                  <div
                    key={cls}
                    className="flex items-center justify-between text-xs bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2"
                  >
                    <span className="font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
                      {cls.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-4 tabular-financial">
                      <span className="text-[var(--ds-text-primary)]">
                        {formatCentsBRL(data.totalCents)}
                      </span>
                      <span className="text-[var(--ds-accent-quant)] font-semibold w-16 text-right">
                        {formatBpsPercent(data.shareBps)}
                      </span>
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              Metas &amp; Objetivos Financeiros (Alocacao Fracionada)
            </h3>
            <Link
              href="/investimentos/objetivos"
              className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)] hover:underline"
            >
              Gerenciar Objetivos -&gt;
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.goalsProgress.map((gp) => (
              <div
                key={gp.goalId}
                className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ds-text-primary)]">{gp.title}</span>
                  <span className="text-[var(--ds-accent-quant)] font-semibold tabular-financial">
                    {formatBpsPercent(gp.progressBps)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--ds-surface-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--ds-accent-quant)]"
                    style={{ width: `${Math.min(100, gp.progressBps / 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--ds-text-secondary)] tabular-financial">
                  <span>
                    Alocado: {formatCentsBRL(gp.totalAllocatedCents)} /{" "}
                    {formatCentsBRL(gp.targetAmountCents)}
                  </span>
                  <span>{gp.allocationsCount} ativos vinculados</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PlatformShell>
  );
}
