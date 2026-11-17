"use client";

import React, { useState, useEffect } from "react";
import { useCotacaoAcao } from "@/src/api/hooks";
import { CotacaoError } from "@/src/api/client";
import { formatarReal } from "@/src/lib/formatters";

function formatarHora(isoString?: string) {
  if (!isoString) return "";
  try {
    const data = new Date(isoString);
    const horas = String(data.getHours()).padStart(2, "0");
    const minutos = String(data.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  } catch {
    return "";
  }
}

export default function AcoesB3Widget() {
  const [tickerInput, setTickerInput] = useState("PETR4");
  const [debouncedTicker, setDebouncedTicker] = useState("PETR4");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTicker(tickerInput.trim().toUpperCase());
    }, 500);
    return () => clearTimeout(handler);
  }, [tickerInput]);

  const {
    data: acaoRes,
    isLoading,
    error,
    isFetching,
  } = useCotacaoAcao(debouncedTicker);

  const getMensagemErro = (err: unknown) => {
    if (err instanceof CotacaoError || (err && typeof err === "object" && "tipo" in err)) {
      const cotacaoErr = err as { tipo: string };
      switch (cotacaoErr.tipo) {
        case "SIMBOLO_INVALIDO":
          return "Ticker nao encontrado na B3. Verifique o codigo.";
        case "RATE_LIMIT":
          return "Limite de requisicoes atingido. Tente em instantes.";
        case "ERRO_REDE":
          return "Falha de conexao. Tente novamente.";
        default:
          return "Erro ao buscar cotacao.";
      }
    }
    return "Falha na comunicacao com o provedor de mercado.";
  };

  const quickTickers = ["PETR4", "VALE3", "ITUB4", "BBAS3", "B3SA3"];

  return (
    <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--ds-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--ds-market-positive)]" />
            <h3 className="text-sm font-bold text-[var(--ds-text-primary)] uppercase tracking-wider font-[family-name:var(--ds-font-mono)]">
              Cotacoes em Tempo Real — B3 Acoes
            </h3>
          </div>
          <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
            Consulta direta a API Brapi com cache distribuido Upstash Redis e taxa de atualizacao instantanea
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {quickTickers.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTickerInput(t)}
              className={`px-2 py-1 text-[11px] font-[family-name:var(--ds-font-mono)] rounded border transition-colors cursor-pointer ${
                debouncedTicker === t
                  ? "bg-[var(--ds-accent-quant)] border-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] font-semibold"
                  : "bg-[var(--ds-bg-primary)] border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder="Digite o ticker (ex: VALE3, PETR4, WEGE3)..."
            maxLength={6}
            className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3.5 py-2.5 text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-secondary)]/50 focus:outline-none focus:border-[var(--ds-accent-quant)]"
          />
          {isFetching && (
            <span className="absolute right-3 top-2.5 text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] animate-pulse">
              atualizando...
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 bg-[var(--ds-bg-primary)] rounded-lg animate-pulse border border-[var(--ds-border-subtle)]" />
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-[var(--ds-market-negative)]/10 border border-[var(--ds-market-negative)]/30 text-[var(--ds-market-negative)] text-xs font-medium">
          {getMensagemErro(error)}
        </div>
      ) : acaoRes?.dados ? (
        <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--ds-font-mono)] text-base font-bold text-[var(--ds-text-primary)]">
                {acaoRes.dados.simbolo}
              </span>
              <span className="text-xs text-[var(--ds-text-secondary)] font-medium truncate max-w-[200px]">
                {acaoRes.dados.nome}
              </span>
            </div>
            <div className="text-[11px] tabular-financial text-[var(--ds-text-secondary)] mt-1">
              Ultima sincronizacao: {formatarHora(acaoRes.atualizadoEm)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-2xl font-extrabold text-[var(--ds-text-primary)] tabular-financial">
                {formatarReal(acaoRes.dados.preco)}
              </div>
              <div
                className={`text-xs font-semibold tabular-financial mt-0.5 ${
                  acaoRes.dados.variacao >= 0
                    ? "text-[var(--ds-market-positive)]"
                    : "text-[var(--ds-market-negative)]"
                }`}
              >
                {acaoRes.dados.variacao >= 0 ? "+" : ""}
                {acaoRes.dados.variacao.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
