"use client";

import React, { useState } from "react";
import { useCotacaoCambio } from "@/src/api/hooks";
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

export default function CambioWidget() {
  const [selectedPair, setSelectedPair] = useState<"USD-BRL" | "EUR-BRL">("USD-BRL");

  const {
    data: cambioRes,
    isLoading,
    error,
    isFetching,
  } = useCotacaoCambio(selectedPair);

  const getMensagemErro = (err: unknown) => {
    if (err instanceof CotacaoError || (err && typeof err === "object" && "tipo" in err)) {
      const cotacaoErr = err as { tipo: string };
      switch (cotacaoErr.tipo) {
        case "SIMBOLO_INVALIDO":
          return "Par de moedas não reconhecido.";
        case "RATE_LIMIT":
          return "Limite de requisições atingido. Tente em instantes.";
        case "ERRO_REDE":
          return "Falha de conexão com a API de câmbio.";
        default:
          return "Erro ao buscar cotação de câmbio.";
      }
    }
    return "Falha na comunicação com o provedor Alpha Vantage.";
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Cotações de Câmbio & Remessas Internacionais
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados fornecidos via Alpha Vantage FX com cache distribuído Upstash Redis
          </p>
        </div>

        {/* Pair Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setSelectedPair("USD-BRL")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
              selectedPair === "USD-BRL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            USD / BRL
          </button>
          <button
            onClick={() => setSelectedPair("EUR-BRL")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
              selectedPair === "EUR-BRL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            EUR / BRL
          </button>
        </div>
      </div>

      {/* Result Display */}
      {isLoading ? (
        <div className="h-20 bg-slate-900/60 rounded-lg animate-pulse border border-slate-800/60" />
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {getMensagemErro(error)}
        </div>
      ) : cambioRes?.dados ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-100">
                {selectedPair === "USD-BRL" ? "Dólar Comercial" : "Euro Comercial"}
              </span>
              <span className="font-mono text-xs text-slate-400">
                ({selectedPair})
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
              <span>Sincronizado: {formatarHora(cambioRes.atualizadoEm)}</span>
              {isFetching && <span className="animate-pulse text-indigo-400">• atualizando</span>}
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-2xl font-extrabold text-slate-100 tabular-nums">
              {formatarReal(cambioRes.dados.taxa)}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
              Paridade cambial à vista
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
