"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  compararInvestimentos,
  ResultadoInvestimento,
} from "../core/comparadorInvestimentos";
import { formatarMoeda } from "@/src/lib/formatters";
import BlocoSalvarSimulacao from "./BlocoSalvarSimulacao";
import GraficoComparacao, { ItemDadoGraficoComparacao } from "./GraficoComparacao";

const VALOR_MAXIMO = 1_000_000_000; // R$ 1 bilhao
const TAXA_MAXIMA = 100; // 100% a.a.
const PERIODO_MAXIMO_MESES = 1200; // 100 anos
const PERCENTUAL_CDI_MAXIMO = 1000; // 1000% do CDI
const RESULTADO_MAXIMO_EXIBIVEL = 1_000_000_000_000_000; // R$ 1 quatrilhao

export default function ComparadorInvestimentos() {
  const [isMounted, setIsMounted] = useState(false);

  const [valorInicialStr, setValorInicialStr] = useState<string>("10000");
  const [periodoStr, setPeriodoStr] = useState<string>("12");
  const [periodoUnidade, setPeriodoUnidade] = useState<"meses" | "anos">("meses");
  const [taxaSelicAnualStr, setTaxaSelicAnualStr] = useState<string>("10.75");
  const [percentualCDIStr, setPercentualCDIStr] = useState<string>("100");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const valorInicial = valorInicialStr === "" ? 0 : parseFloat(valorInicialStr);
  const periodo = periodoStr === "" ? 0 : parseFloat(periodoStr);
  const taxaSelicAnual = taxaSelicAnualStr === "" ? 0 : parseFloat(taxaSelicAnualStr);
  const percentualCDI = percentualCDIStr === "" ? 0 : parseFloat(percentualCDIStr);

  const periodoMeses = Math.round(
    periodoUnidade === "anos" ? periodo * 12 : periodo
  );

  const isInputValid =
    !isNaN(valorInicial) &&
    valorInicial >= 0 &&
    valorInicial <= VALOR_MAXIMO &&
    !isNaN(periodo) &&
    periodo > 0 &&
    !isNaN(periodoMeses) &&
    periodoMeses > 0 &&
    periodoMeses <= PERIODO_MAXIMO_MESES &&
    !isNaN(taxaSelicAnual) &&
    taxaSelicAnual >= 0 &&
    taxaSelicAnual <= TAXA_MAXIMA &&
    !isNaN(percentualCDI) &&
    percentualCDI >= 0 &&
    percentualCDI <= PERCENTUAL_CDI_MAXIMO;

  const resultadosCalculados: ResultadoInvestimento[] = useMemo(() => {
    if (!isInputValid) return [];
    try {
      return compararInvestimentos({
        valorInicial,
        periodoMeses,
        taxaSelicAnual,
        percentualCDI,
      });
    } catch {
      return [];
    }
  }, [valorInicial, periodoMeses, taxaSelicAnual, percentualCDI, isInputValid]);

  const maiorValorLiquido = useMemo(() => {
    if (resultadosCalculados.length === 0) return 0;
    return Math.max(...resultadosCalculados.map((r) => r.valorLiquido));
  }, [resultadosCalculados]);

  const resultadoExcedeLimite =
    maiorValorLiquido > RESULTADO_MAXIMO_EXIBIVEL ||
    !Number.isFinite(maiorValorLiquido);

  const isValid = isInputValid && !resultadoExcedeLimite;
  const resultados = useMemo(
    () => (isValid ? resultadosCalculados : []),
    [isValid, resultadosCalculados]
  );

  const resultadosExibicao: ResultadoInvestimento[] = useMemo(() => {
    if (isValid && resultados.length > 0) {
      return resultados;
    }
    const produtosOrdemPadrao = ["CDB", "TESOURO_SELIC", "POUPANCA"] as const;
    return produtosOrdemPadrao.map((p) => ({
      produto: p,
      valorBruto: 0,
      valorLiquido: 0,
      rendimentoLiquido: 0,
      aliquotaIR: p === "POUPANCA" ? null : 0,
    }));
  }, [isValid, resultados]);

  const dadosGrafico: ItemDadoGraficoComparacao[] = useMemo(() => {
    return resultadosExibicao.map((r) => {
      let name = "CDB";
      if (r.produto === "TESOURO_SELIC") name = "Tesouro Selic";
      else if (r.produto === "POUPANCA") name = "Poupanca";

      return {
        name,
        produto: r.produto,
        valorLiquido: r.valorLiquido,
        valorBruto: r.valorBruto,
      };
    });
  }, [resultadosExibicao]);

  const parametrosSalvar = useMemo(() => ({
    valorInicial,
    periodo,
    periodoUnidade,
    periodoMeses,
    taxaSelicAnual,
    percentualCDI,
  }), [valorInicial, periodo, periodoUnidade, periodoMeses, taxaSelicAnual, percentualCDI]);

  const formatarNomeProduto = (produto: "CDB" | "TESOURO_SELIC" | "POUPANCA") => {
    switch (produto) {
      case "CDB":
        return "CDB";
      case "TESOURO_SELIC":
        return "Tesouro Selic";
      case "POUPANCA":
        return "Poupanca";
    }
  };

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

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
          Comparador de Investimentos
        </h2>
        <p className="text-xs text-[var(--ds-text-secondary)] mt-1">
          Compare de forma simples a rentabilidade liquida do CDB, Tesouro Selic e Poupanca.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-border-subtle)] space-y-4">
            <h3 className="text-sm font-bold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] uppercase tracking-wider border-b border-[var(--ds-border-subtle)] pb-2">
              Configuracoes da Comparacao
            </h3>

            <div className="space-y-1.5">
              <label
                htmlFor="valorInicial"
                className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Valor Inicial (R$)
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ds-text-secondary)] font-medium select-none tabular-financial">
                  R$
                </span>
                <input
                  id="valorInicial"
                  type="number"
                  min="0"
                  max={VALOR_MAXIMO}
                  step="any"
                  placeholder="0,00"
                  value={valorInicialStr}
                  onChange={(e) => setValorInicialStr(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] pl-9 pr-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="periodo"
                className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Periodo da Aplicacao
              </label>
              <div className="flex rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors bg-[var(--ds-bg-primary)]">
                <input
                  id="periodo"
                  type="number"
                  min="0"
                  max={periodoUnidade === "anos" ? PERIODO_MAXIMO_MESES / 12 : PERIODO_MAXIMO_MESES}
                  step="any"
                  placeholder="0"
                  value={periodoStr}
                  onChange={(e) => setPeriodoStr(e.target.value)}
                  className="w-full min-w-0 bg-transparent px-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                />
                <div className="flex items-center gap-1 border-l border-[var(--ds-border-subtle)] px-2 py-1 bg-[var(--ds-surface-elevated)] select-none">
                  <button
                    type="button"
                    onClick={() => setPeriodoUnidade("meses")}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                      periodoUnidade === "meses"
                        ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                        : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
                    }`}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodoUnidade("anos")}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                      periodoUnidade === "anos"
                        ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                        : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
                    }`}
                  >
                    Anos
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="taxaSelic"
                className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Taxa Selic Anual (%)
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <input
                  id="taxaSelic"
                  type="number"
                  min="0"
                  max={TAXA_MAXIMA}
                  step="any"
                  placeholder="0,00"
                  value={taxaSelicAnualStr}
                  onChange={(e) => setTaxaSelicAnualStr(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] px-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ds-text-secondary)] font-semibold select-none tabular-financial">
                  % a.a.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="percentualCDI"
                className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Percentual do CDI (%)
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <input
                  id="percentualCDI"
                  type="number"
                  min="0"
                  max={PERCENTUAL_CDI_MAXIMO}
                  step="any"
                  placeholder="100"
                  value={percentualCDIStr}
                  onChange={(e) => setPercentualCDIStr(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] px-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ds-text-secondary)] font-semibold select-none tabular-financial">
                  % do CDI
                </span>
              </div>
            </div>
          </div>

          {!isValid && (
            <div className="text-xs text-[var(--ds-market-warning)] bg-[var(--ds-market-warning)]/10 p-3.5 rounded-xl border border-[var(--ds-market-warning)]/30 font-[family-name:var(--ds-font-mono)]">
              [ALERTA DE VALIDACAO]: Insira um periodo valido (maior que 0 e ate 100 anos), taxa Selic entre 0% e 100%, CDI ate 1000% e valores ate R$ 1 bilhao para simular. Se o resultado for maior que R$ 1 quatrilhao, reduza os valores de entrada.
            </div>
          )}

          <BlocoSalvarSimulacao
            tipo="comparador"
            parametros={parametrosSalvar}
            isValid={isValid}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resultadosExibicao.map((r, index) => {
              const isBest = isValid && index === 0;
              const accentColor = obterCorProduto(r.produto);

              return (
                <div
                  key={r.produto}
                  className={`relative bg-[var(--ds-surface-card)] rounded-xl transition-colors flex flex-col overflow-hidden border ${
                    isBest
                      ? "border-[var(--ds-accent-quant)]"
                      : "border-[var(--ds-border-subtle)]"
                  }`}
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[var(--ds-text-primary)]">
                        {formatarNomeProduto(r.produto)}
                      </span>
                      {isBest && (
                        <span className="px-2 py-0.5 text-[9px] font-[family-name:var(--ds-font-mono)] font-extrabold uppercase tracking-wider rounded bg-[var(--ds-accent-quant)]/15 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
                          Melhor Opcao
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                        Valor Liquido
                      </span>
                      <div
                        className={`text-xl font-extrabold mt-0.5 tabular-financial ${
                          isBest
                            ? "text-[var(--ds-accent-quant)]"
                            : "text-[var(--ds-text-primary)]"
                        }`}
                      >
                        {formatarMoeda(r.valorLiquido)}
                      </div>
                    </div>

                    <div className="border-t border-[var(--ds-border-subtle)] pt-3 mt-auto space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--ds-text-secondary)]">Valor Bruto:</span>
                        <span className="font-semibold text-[var(--ds-text-primary)] tabular-financial">
                          {formatarMoeda(r.valorBruto)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ds-text-secondary)]">Rendimento Liq.:</span>
                        <span className="font-semibold text-[var(--ds-market-positive)] tabular-financial">
                          {formatarMoeda(r.rendimentoLiquido)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ds-text-secondary)]">Aliquota IR:</span>
                        <span className="font-semibold text-[var(--ds-text-primary)] tabular-financial">
                          {r.aliquotaIR !== null ? `${r.aliquotaIR.toFixed(1)}%` : "Isento"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <GraficoComparacao
            dados={dadosGrafico}
            isValid={isValid}
            isMounted={isMounted}
          />
        </div>
      </div>
    </div>
  );
}
