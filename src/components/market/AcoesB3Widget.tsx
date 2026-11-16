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
          return "Ticker não encontrado na B3. Verifique o código.";
        case "RATE_LIMIT":
          return "Limite de requisições atingido. Tente em instantes.";
        case "ERRO_REDE":
          return "Falha de conexão. Tente novamente.";
        default:
          return "Erro ao buscar cotação.";
      }
    }
    return "Falha na comunicação com o provedor de mercado.";
  };

  const quickTickers = ["PETR4", "VALE3", "ITUB4", "BBAS3", "B3SA3"];

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Cotações em Tempo Real — B3 Ações
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta direta à API Brapi com cache distribuído Upstash Redis e taxa de atualização instantânea
          </p>
        </div>

        {/* Quick Tickers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {quickTickers.map((t) => (
            <button
              key={t}
              onClick={() => setTickerInput(t)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                debouncedTicker === t
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder="Digite o ticker (ex: VALE3, PETR4, WEGE3)..."
            maxLength={6}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          {isFetching && (
            <span className="absolute right-3 top-2.5 text-[11px] font-mono text-slate-500 animate-pulse">
              atualizando...
            </span>
          )}
        </div>
      </div>

      {/* Result Display */}
      {isLoading ? (
        <div className="h-20 bg-slate-900/60 rounded-lg animate-pulse border border-slate-800/60" />
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {getMensagemErro(error)}
        </div>
      ) : acaoRes?.dados ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-100">
                {acaoRes.dados.simbolo}
              </span>
              <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                {acaoRes.dados.nome}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Última sincronização: {formatarHora(acaoRes.atualizadoEm)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="font-mono text-2xl font-extrabold text-slate-100 tabular-nums">
                {formatarReal(acaoRes.dados.preco)}
              </div>
              <div
                className={`text-xs font-mono font-semibold tabular-nums mt-0.5 ${
                  acaoRes.dados.variacao >= 0 ? "text-emerald-400" : "text-rose-400"
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
