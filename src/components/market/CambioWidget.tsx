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
          return "Par de moedas nao reconhecido.";
        case "RATE_LIMIT":
          return "Limite de requisicoes atingido. Tente em instantes.";
        case "ERRO_REDE":
          return "Falha de conexao com a API de cambio.";
        default:
          return "Erro ao buscar cotacao de cambio.";
      }
    }
    return "Falha na comunicacao com o provedor Alpha Vantage.";
  };

  return (
    <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--ds-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-quant)]" />
            <h3 className="text-sm font-bold text-[var(--ds-text-primary)] uppercase tracking-wider font-[family-name:var(--ds-font-mono)]">
              Cotacoes de Cambio &amp; Remessas Internacionais
            </h3>
          </div>
          <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
            Dados fornecidos via Alpha Vantage FX com cache distribuido Upstash Redis
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[var(--ds-bg-primary)] rounded-lg border border-[var(--ds-border-subtle)]">
          <button
            type="button"
            onClick={() => setSelectedPair("USD-BRL")}
            className={`px-3 py-1.5 text-xs font-[family-name:var(--ds-font-mono)] font-bold rounded transition-colors cursor-pointer ${
              selectedPair === "USD-BRL"
                ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
            }`}
          >
            USD / BRL
          </button>
          <button
            type="button"
            onClick={() => setSelectedPair("EUR-BRL")}
            className={`px-3 py-1.5 text-xs font-[family-name:var(--ds-font-mono)] font-bold rounded transition-colors cursor-pointer ${
              selectedPair === "EUR-BRL"
                ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
            }`}
          >
            EUR / BRL
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 bg-[var(--ds-bg-primary)] rounded-lg animate-pulse border border-[var(--ds-border-subtle)]" />
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-[var(--ds-market-negative)]/10 border border-[var(--ds-market-negative)]/30 text-[var(--ds-market-negative)] text-xs font-medium">
          {getMensagemErro(error)}
        </div>
      ) : cambioRes?.dados ? (
        <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--ds-font-mono)] text-base font-bold text-[var(--ds-text-primary)]">
                {selectedPair === "USD-BRL" ? "Dolar Comercial" : "Euro Comercial"}
              </span>
              <span className="font-[family-name:var(--ds-font-mono)] text-xs text-[var(--ds-text-secondary)]">
                ({selectedPair})
              </span>
            </div>
            <div className="text-[11px] tabular-financial text-[var(--ds-text-secondary)] mt-1 flex items-center gap-2">
              <span>Sincronizado: {formatarHora(cambioRes.atualizadoEm)}</span>
              {isFetching && (
                <span className="animate-pulse text-[var(--ds-accent-quant)]">• atualizando</span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-extrabold text-[var(--ds-text-primary)] tabular-financial">
              {formatarReal(cambioRes.dados.taxa)}
            </div>
            <div className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mt-0.5">
              Paridade cambial a vista
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
