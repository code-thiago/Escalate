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
            className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Minha Carteira
          </Link>
          <Link
            href="/investimentos/objetivos"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Objetivos (Bps)
          </Link>
          <Link
            href="/investimentos/conexoes"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
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
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono uppercase text-slate-400">
            Patrimonio Liquido Consolidado
          </span>
          <div className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">
            {formatCentsBRL(dashboard.consolidation.totalNetCents)}
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-mono tabular-nums">
            Bruto: {formatCentsBRL(dashboard.consolidation.totalGrossCents)}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono uppercase text-slate-400">
            Lucro Liquido Acumulado
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            +{formatCentsBRL(totalGainCents)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            Realizado no Calendario:{" "}
            {formatCentsBRL(dashboard.calendarSummary.totalRealizedYieldCents)}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono uppercase text-slate-400">
            Previsao de Renda Futura (P50 - {horizonMonths}m)
          </span>
          <div className="text-2xl font-bold text-indigo-400 mt-1 tabular-nums">
            +{formatCentsBRL(dashboard.calendarSummary.totalProjectedP50YieldCents)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
            Vencimentos Programados:{" "}
            {formatCentsBRL(dashboard.calendarSummary.totalMaturitiesCents)}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono uppercase text-slate-400">
            Cobertura FGC (Teto R$ 250k / R$ 1M)
          </span>
          <div className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">
            {formatCentsBRL(dashboard.fgcAnalysis.coveredCents)}
          </div>
          <div
            className={`text-xs mt-1 font-mono tabular-nums ${
              dashboard.fgcAnalysis.uncoveredCents > 0n
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            Descoberto Elegivel:{" "}
            {formatCentsBRL(dashboard.fgcAnalysis.uncoveredCents)}
          </div>
        </div>
      </section>

      {/* Biphasic Calendar Controls & Grid */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Calendario Financeiro Bifasico (Passado Realizado vs. Futuro Projetado)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em qualquer mes para inspecionar os eventos contabeis realizados ou as bandas de rentabilidade futura P10, P50 e P90.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="horizon-select"
              className="text-xs font-mono text-slate-300"
            >
              Horizonte Futuro:
            </label>
            <select
              id="horizon-select"
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value={3}>+3 Meses</option>
              <option value={6}>+6 Meses</option>
              <option value={12}>+12 Meses</option>
              <option value={24}>+24 Meses</option>
            </select>
          </div>
        </div>

        {/* Biphasic Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-emerald-500/20 border border-emerald-500/60 inline-block" />
            <span className="text-slate-300">
              FASE 1: REALIZADO (Contabil / Proventos / Accrual)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-indigo-500/20 border border-indigo-500/60 inline-block" />
            <span className="text-slate-300">
              FASE 2: PROJETADO (Estocastico P10 / P50 / P90 & Vencimentos)
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
                className={`text-left rounded-md p-3.5 border transition-all ${
                  isSelected
                    ? "ring-2 ring-indigo-500 bg-slate-900 border-indigo-400"
                    : isRealized
                      ? "bg-emerald-950/15 border-emerald-800/40 hover:border-emerald-600/60"
                      : "bg-indigo-950/15 border-indigo-800/40 hover:border-indigo-600/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-100 tabular-nums">
                    {month.yearMonth}
                  </span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      isRealized
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-indigo-500/20 text-indigo-300"
                    }`}
                  >
                    {isRealized ? "REALIZADO" : "PROJETADO"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] text-slate-400">
                    {isRealized ? "Rendimento Realizado" : "Rendimento Esperado (P50)"}
                  </div>
                  <div
                    className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${
                      isRealized ? "text-emerald-400" : "text-indigo-300"
                    }`}
                  >
                    +{formatCentsBRL(month.totalYieldCents)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                    Taxa Mensal: {formatBpsPercent(month.yieldBps, true)}
                  </div>
                </div>

                {month.projectedPercentiles && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-0.5 tabular-nums">
                    <div>P10: {formatCentsBRL(month.projectedPercentiles.p10Cents)}</div>
                    <div>P90: {formatCentsBRL(month.projectedPercentiles.p90Cents)}</div>
                  </div>
                )}

                <div className="mt-2 text-[11px] font-mono text-slate-400">
                  Eventos: {month.events.length}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Month Detail Drawer */}
        {selectedMonth && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100 font-mono">
                  Detalhamento Mensal: {selectedMonth.yearMonth} (
                  {selectedMonth.phase === "realized"
                    ? "Fase Realizada"
                    : "Fase Projetada"}
                  )
                </h4>
                <p className="text-xs text-slate-400">
                  Fluxo de Caixa Liquido do Mes:{" "}
                  <span className="font-mono text-slate-200 tabular-nums">
                    {formatCentsBRL(selectedMonth.netCashflowCents ?? 0n)}
                  </span>
                </p>
              </div>

              {selectedMonth.projectedPercentiles && (
                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <span className="text-amber-300">
                    Pessimista (P10):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p10Cents)}
                  </span>
                  <span className="text-indigo-300 font-semibold">
                    Base (P50):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p50Cents)}
                  </span>
                  <span className="text-emerald-300">
                    Otimista (P90):{" "}
                    {formatCentsBRL(selectedMonth.projectedPercentiles.p90Cents)}
                  </span>
                </div>
              )}
            </div>

            {selectedMonth.events.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-2">
                Nenhum vencimento extraordinario neste mes; rendimento composto por accrual continuo da carteira.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2 pr-4">Data</th>
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Ativo</th>
                      <th className="py-2 pr-4">Descricao</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                    {selectedMonth.events.map((ev, i) => (
                      <tr key={`${ev.date}-${i}`} className="text-slate-200">
                        <td className="py-2 pr-4">{ev.date}</td>
                        <td className="py-2 pr-4 uppercase text-indigo-300">
                          {ev.type}
                        </td>
                        <td className="py-2 pr-4">{ev.assetId ?? "-"}</td>
                        <td className="py-2 pr-4 font-sans text-slate-300">
                          {ev.description}
                        </td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">
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
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              Resumo Minha Carteira (Conservacao Exata 10.000 bps)
            </h3>
            <Link
              href="/investimentos/carteira"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300"
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
                    className="flex items-center justify-between text-xs bg-slate-900/70 border border-slate-800/80 rounded px-3 py-2"
                  >
                    <span className="font-mono uppercase text-slate-300">
                      {cls.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-4 font-mono tabular-nums">
                      <span className="text-slate-200">
                        {formatCentsBRL(data.totalCents)}
                      </span>
                      <span className="text-indigo-400 font-semibold w-16 text-right">
                        {formatBpsPercent(data.shareBps)}
                      </span>
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              Metas & Objetivos Financeiros (Alocacao Fracionada)
            </h3>
            <Link
              href="/investimentos/objetivos"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300"
            >
              Gerenciar Objetivos -&gt;
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.goalsProgress.map((gp) => (
              <div
                key={gp.goalId}
                className="bg-slate-900/70 border border-slate-800/80 rounded p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{gp.title}</span>
                  <span className="font-mono text-indigo-400 font-semibold tabular-nums">
                    {formatBpsPercent(gp.progressBps)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${Math.min(100, gp.progressBps / 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
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
