"use client";

import React, { memo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatarMoeda } from "@/src/lib/formatters";

export interface ItemDadoGraficoComparacao {
  name: string;
  produto: "CDB" | "TESOURO_SELIC" | "POUPANCA";
  valorLiquido: number;
  valorBruto: number;
}

export interface GraficoComparacaoProps {
  dados: ItemDadoGraficoComparacao[];
  isValid: boolean;
  isMounted: boolean;
}

const obterCorProduto = (produto: "CDB" | "TESOURO_SELIC" | "POUPANCA") => {
  switch (produto) {
    case "CDB":
      return "var(--ds-accent-quant)";
    case "TESOURO_SELIC":
      return "var(--ds-market-positive)";
    case "POUPANCA":
      return "var(--ds-text-secondary)";
  }
};

const formatarEixoY = (val: number) => {
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
  return `R$ ${val}`;
};

export const GraficoComparacao = memo(function GraficoComparacao({
  dados,
  isValid,
  isMounted,
}: GraficoComparacaoProps) {
  return (
    <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-border-subtle)] flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-bold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] uppercase tracking-wider">
          Comparacao de Valor Liquido
        </h3>
        <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
          Valores acumulados apos o periodo simulado.
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        {isMounted ? (
          isValid ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--ds-border-subtle)"
                />
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[var(--ds-surface-card)] p-4 rounded-xl border border-[var(--ds-border-subtle)] shadow-xl text-xs space-y-2">
                          <p className="font-bold text-[var(--ds-text-primary)] border-b border-[var(--ds-border-subtle)] pb-1">
                            {data.name}
                          </p>
                          <div className="space-y-1 tabular-financial">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                                Valor Bruto:
                              </span>
                              <span className="font-bold tabular-financial text-[var(--ds-text-primary)]">
                                {formatarMoeda(data.valorBruto)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6 border-t border-[var(--ds-border-subtle)] pt-1 font-bold">
                              <span className="text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-sans)]">
                                Valor Liquido:
                              </span>
                              <span className="tabular-financial text-[var(--ds-accent-quant)]">
                                {formatarMoeda(data.valorLiquido)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valorLiquido" radius={[6, 6, 0, 0]}>
                  {dados.map((entry, index) => {
                    const color = obterCorProduto(entry.produto);
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--ds-bg-primary)] border border-dashed border-[var(--ds-border-subtle)] rounded-xl p-6 text-center">
              <p className="text-sm font-semibold text-[var(--ds-text-secondary)]">
                Preencha os dados
              </p>
              <p className="text-xs text-[var(--ds-text-secondary)] mt-1 max-w-xs">
                Insira as configuracoes de comparacao para visualizar o grafico.
              </p>
            </div>
          )
        ) : (
          <div className="w-full h-full bg-[var(--ds-bg-primary)] animate-pulse rounded-xl border border-[var(--ds-border-subtle)]" />
        )}
      </div>
    </div>
  );
});

export default GraficoComparacao;
