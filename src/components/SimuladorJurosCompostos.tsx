"use client";

import React, { useState, useEffect, useMemo } from "react";
import { calcularJurosCompostos, PontoEvolucao } from "../core/jurosCompostos";
import { formatarMoeda } from "@/src/lib/formatters";
import BlocoSalvarSimulacao from "./BlocoSalvarSimulacao";
import GraficoEvolucao from "./GraficoEvolucao";

const VALOR_MAXIMO = 1_000_000_000; // R$ 1 bilhao
const TAXA_MAXIMA = 100; // 100% a.a.
const PERIODO_MAXIMO_MESES = 1200; // 100 anos
const RESULTADO_MAXIMO_EXIBIVEL = 1_000_000_000_000_000; // R$ 1 quatrilhao

export default function SimuladorJurosCompostos() {
  const [isMounted, setIsMounted] = useState(false);

  const [valorInicialStr, setValorInicialStr] = useState<string>("1000");
  const [aporteMensalStr, setAporteMensalStr] = useState<string>("100");
  const [taxaAnualStr, setTaxaAnualStr] = useState<string>("12");
  const [periodoStr, setPeriodoStr] = useState<string>("5");
  const [periodoUnidade, setPeriodoUnidade] = useState<"meses" | "anos">("anos");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const valorInicial = valorInicialStr === "" ? 0 : parseFloat(valorInicialStr);
  const aporteMensal = aporteMensalStr === "" ? 0 : parseFloat(aporteMensalStr);
  const taxaAnual = taxaAnualStr === "" ? 0 : parseFloat(taxaAnualStr);
  const periodo = periodoStr === "" ? 0 : parseFloat(periodoStr);

  const periodoMeses = Math.round(
    periodoUnidade === "anos" ? periodo * 12 : periodo
  );

  const isInputValid =
    !isNaN(valorInicial) &&
    valorInicial >= 0 &&
    valorInicial <= VALOR_MAXIMO &&
    !isNaN(aporteMensal) &&
    aporteMensal >= 0 &&
    aporteMensal <= VALOR_MAXIMO &&
    !isNaN(taxaAnual) &&
    taxaAnual >= 0 &&
    taxaAnual <= TAXA_MAXIMA &&
    !isNaN(periodo) &&
    periodo > 0 &&
    !isNaN(periodoMeses) &&
    periodoMeses > 0 &&
    periodoMeses <= PERIODO_MAXIMO_MESES;

  const pontosCalculados: PontoEvolucao[] = useMemo(() => {
    if (!isInputValid) return [];
    try {
      return calcularJurosCompostos({
        valorInicial,
        aporteMensal,
        taxaAnual,
        periodoMeses,
      });
    } catch {
      return [];
    }
  }, [valorInicial, aporteMensal, taxaAnual, periodoMeses, isInputValid]);

  const valorCalculadoFinal =
    isInputValid && pontosCalculados.length > 0
      ? pontosCalculados[pontosCalculados.length - 1].valorTotal
      : 0;

  const resultadoExcedeLimite =
    valorCalculadoFinal > RESULTADO_MAXIMO_EXIBIVEL ||
    !Number.isFinite(valorCalculadoFinal);

  const isValid = isInputValid && !resultadoExcedeLimite;
  const pontos = useMemo(
    () => (isValid ? pontosCalculados : []),
    [isValid, pontosCalculados]
  );

  const dadosGrafico: PontoEvolucao[] = useMemo(() => {
    if (!isValid) return [];
    const pontoZero: PontoEvolucao = {
      mes: 0,
      valorInvestido: valorInicial,
      valorTotal: valorInicial,
      jurosAcumulados: 0,
    };
    return [pontoZero, ...pontos];
  }, [isValid, valorInicial, pontos]);

  const valorFinalTotal = isValid && pontos.length > 0 ? pontos[pontos.length - 1].valorTotal : 0;
  const totalInvestido = isValid && pontos.length > 0 ? pontos[pontos.length - 1].valorInvestido : 0;
  const totalJuros = isValid && pontos.length > 0 ? pontos[pontos.length - 1].jurosAcumulados : 0;

  const parametrosSalvar = useMemo(() => ({
    valorInicial,
    aporteMensal,
    taxaAnual,
    periodo,
    periodoUnidade,
    periodoMeses,
  }), [valorInicial, aporteMensal, taxaAnual, periodo, periodoUnidade, periodoMeses]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Cabecalho */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
          Simulador de Juros Compostos
        </h2>
        <p className="text-xs text-[var(--ds-text-secondary)] mt-1">
          Projete o crescimento do seu patrimonio com aportes mensais e juros compostos.
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Resumo + Formulario */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          {/* Resumo em Destaque no Topo */}
          <div className="flex flex-col gap-4">
            <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-accent-quant)]/40 transition-colors">
              <span className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                Valor Total Estimado
              </span>
              <div className="text-3xl font-bold text-[var(--ds-accent-quant)] mt-1 tabular-financial">
                {formatarMoeda(valorFinalTotal)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--ds-surface-card)] p-4 rounded-xl border-l-4 border-l-[var(--ds-text-secondary)] border-t border-r border-b border-[var(--ds-border-subtle)] transition-colors">
                <span className="text-[10px] font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                  Total Investido
                </span>
                <div className="text-lg font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
                  {formatarMoeda(totalInvestido)}
                </div>
              </div>

              <div className="bg-[var(--ds-surface-card)] p-4 rounded-xl border-l-4 border-l-[var(--ds-market-positive)] border-t border-r border-b border-[var(--ds-border-subtle)] transition-colors">
                <span className="text-[10px] font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                  Total em Juros
                </span>
                <div className="text-lg font-bold text-[var(--ds-market-positive)] mt-1 tabular-financial">
                  {formatarMoeda(totalJuros)}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-border-subtle)] space-y-4">
            <h3 className="text-sm font-bold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] uppercase tracking-wider border-b border-[var(--ds-border-subtle)] pb-2">
              Configuracoes do Investimento
            </h3>

            <div className="space-y-1.5">
              <label htmlFor="valorInicial" className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
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
              <label htmlFor="aporteMensal" className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                Aporte Mensal (R$)
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ds-text-secondary)] font-medium select-none tabular-financial">
                  R$
                </span>
                <input
                  id="aporteMensal"
                  type="number"
                  min="0"
                  max={VALOR_MAXIMO}
                  step="any"
                  placeholder="0,00"
                  value={aporteMensalStr}
                  onChange={(e) => setAporteMensalStr(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] pl-9 pr-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="taxaAnual" className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                  Taxa de Juros Anual (%)
                </label>
                <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                  <input
                    id="taxaAnual"
                    type="number"
                    min="0"
                    max={TAXA_MAXIMA}
                    step="any"
                    placeholder="0"
                    value={taxaAnualStr}
                    onChange={(e) => setTaxaAnualStr(e.target.value)}
                    className="w-full bg-[var(--ds-bg-primary)] px-3 py-2.5 text-base font-semibold text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50 tabular-financial"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ds-text-secondary)] font-medium select-none pointer-events-none tabular-financial">
                    % a.a.
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="periodo" className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block">
                  Periodo
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
            </div>

            {!isValid && (
              <div className="text-xs text-[var(--ds-market-warning)] mt-2 bg-[var(--ds-market-warning)]/10 p-2.5 rounded-lg border border-[var(--ds-market-warning)]/30 font-[family-name:var(--ds-font-mono)]">
                [ALERTA DE VALIDACAO]: Insira um periodo valido (maior que 0 e ate 100 anos), uma taxa entre 0% e 100%, e valores ate R$ 1 bilhao para simular. Se o resultado for maior que R$ 1 quatrilhao, reduza os valores de entrada.
              </div>
            )}
          </div>

          <BlocoSalvarSimulacao
            tipo="juros_compostos"
            parametros={parametrosSalvar}
            isValid={isValid}
          />
        </div>

        {/* Lado Direito: Grafico */}
        <div className="lg:col-span-7 w-full">
          <GraficoEvolucao
            dados={dadosGrafico}
            periodoUnidade={periodoUnidade}
            isMounted={isMounted}
          />
        </div>
      </div>
    </div>
  );
}
