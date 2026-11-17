"use client";

import React, { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PontoEvolucao } from "../core/jurosCompostos";
import { formatarMoeda } from "@/src/lib/formatters";

export interface GraficoEvolucaoProps {
  dados: PontoEvolucao[];
  periodoUnidade: "meses" | "anos";
  isMounted: boolean;
}

const criarFormatadorEixoX = (periodoUnidade: "meses" | "anos") => (mes: number) => {
  if (mes === 0) return "Inicio";
  if (periodoUnidade === "anos") {
    if (mes % 12 === 0) {
      const ano = mes / 12;
      return `${ano} ${ano === 1 ? "ano" : "anos"}`;
    }
    return "";
  }
  return `${mes}m`;
};

const formatarLabelTooltip = (label: string | number | undefined) => {
  if (label === undefined || label === null) return "";
  const mes = Number(label);
  if (isNaN(mes)) return "";
  if (mes === 0) return "Inicio (Mes 0)";
  if (mes % 12 === 0) {
    const ano = mes / 12;
    return `Mes ${mes} (${ano} ${ano === 1 ? "ano" : "anos"})`;
  }
  return `Mes ${mes}`;
};

const formatarEixoY = (val: number) => {
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
  return `R$ ${val}`;
};

export const GraficoEvolucao = memo(function GraficoEvolucao({
  dados,
  periodoUnidade,
  isMounted,
}: GraficoEvolucaoProps) {
  const formatarEixoX = criarFormatadorEixoX(periodoUnidade);

  return (
    <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-border-subtle)] flex flex-col w-full h-[480px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--ds-border-subtle)] pb-4 mb-4 gap-2">
        <div>
          <h3 className="font-bold text-[var(--ds-text-primary)]">
            Evolucao Patrimonial
          </h3>
          <p className="text-xs text-[var(--ds-text-secondary)]">
            Comparativo da evolucao patrimonial acumulada no periodo.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-[var(--ds-text-secondary)]"></span>
            <span className="text-[var(--ds-text-secondary)]">Investido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-[var(--ds-accent-quant)]"></span>
            <span className="text-[var(--ds-text-secondary)]">Juros</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        {isMounted ? (
          dados.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dados}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--ds-border-subtle)"
                />
                <XAxis
                  dataKey="mes"
                  tickFormatter={formatarEixoX}
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatarEixoY}
                  dx={-5}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[var(--ds-surface-card)] p-4 rounded-xl border border-[var(--ds-border-subtle)] shadow-xl text-xs space-y-2">
                          <p className="font-bold text-[var(--ds-text-primary)] border-b border-[var(--ds-border-subtle)] pb-1 tabular-financial">
                            {formatarLabelTooltip(label)}
                          </p>
                          <div className="space-y-1.5 tabular-financial">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                                Investido:
                              </span>
                              <span className="font-bold tabular-financial text-[var(--ds-text-primary)]">
                                {formatarMoeda(data.valorInvestido)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                                Juros:
                              </span>
                              <span className="font-bold tabular-financial text-[var(--ds-market-positive)]">
                                +{formatarMoeda(data.jurosAcumulados)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6 border-t border-[var(--ds-border-subtle)] pt-1.5 font-bold">
                              <span className="text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-sans)]">
                                Total:
                              </span>
                              <span className="tabular-financial text-[var(--ds-accent-quant)]">
                                {formatarMoeda(data.valorTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="valorInvestido"
                  stackId="1"
                  stroke="var(--ds-text-secondary)"
                  fill="var(--ds-text-secondary)"
                  fillOpacity={0.35}
                />
                <Area
                  type="monotone"
                  dataKey="jurosAcumulados"
                  stackId="1"
                  stroke="var(--ds-accent-quant)"
                  fill="var(--ds-accent-quant)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--ds-bg-primary)] border border-dashed border-[var(--ds-border-subtle)] rounded-xl p-6 text-center">
              <p className="text-sm font-semibold text-[var(--ds-text-secondary)]">
                Nenhum dado para exibir
              </p>
              <p className="text-xs text-[var(--ds-text-secondary)] mt-1 max-w-xs">
                Preencha os valores do investimento a esquerda para gerar o grafico de projecao.
              </p>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--ds-bg-primary)] rounded-xl animate-pulse border border-[var(--ds-border-subtle)]">
            <span className="text-[var(--ds-text-secondary)] text-xs font-semibold">
              Carregando grafico de evolucao...
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default GraficoEvolucao;
