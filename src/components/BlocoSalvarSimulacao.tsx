"use client";

import React, { useState } from "react";
import { useSession } from "@/src/lib/auth-client";
import { useSalvarSimulacao } from "../api/useSalvarSimulacao";

export interface BlocoSalvarSimulacaoProps {
  tipo: "juros_compostos" | "comparador";
  parametros: Record<string, unknown>;
  isValid: boolean;
  titulo?: string;
  placeholder?: string;
  botaoTexto?: string;
  idInput?: string;
}

export default function BlocoSalvarSimulacao({
  tipo,
  parametros,
  isValid,
  titulo = tipo === "juros_compostos" ? "Salvar Simulacao" : "Salvar Comparacao",
  placeholder = tipo === "juros_compostos"
    ? "Ex: Aposentadoria 10 anos"
    : "Ex: CDB vs Selic 12m",
  botaoTexto = tipo === "juros_compostos" ? "Salvar Simulacao" : "Salvar Comparacao",
  idInput = tipo === "juros_compostos" ? "nomeSimulacao" : "nomeComparacao",
}: BlocoSalvarSimulacaoProps) {
  const { data: session } = useSession();
  const { salvar, salvando, sucesso, erro } = useSalvarSimulacao();
  const [nomeSimulacao, setNomeSimulacao] = useState("");

  if (!isValid || !session?.user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const res = await salvar({
      tipo,
      nome: nomeSimulacao,
      parametros,
    });

    if (res.ok) {
      setNomeSimulacao("");
    }
  };

  return (
    <div className="bg-[var(--ds-surface-card)] p-6 rounded-xl border border-[var(--ds-border-subtle)] space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-2">
        <h3 className="text-sm font-bold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] uppercase tracking-wider">
          {titulo}
        </h3>
        <span className="text-[10px] font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-market-positive)] bg-[var(--ds-market-positive)]/10 border border-[var(--ds-market-positive)]/30 px-2 py-0.5 rounded-full">
          Logado
        </span>
      </div>

      {sucesso && (
        <div
          role="status"
          className="p-3 rounded-xl bg-[var(--ds-market-positive)]/10 border border-[var(--ds-market-positive)]/30 text-[var(--ds-market-positive)] text-xs font-medium flex items-center gap-2"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>
            {tipo === "juros_compostos"
              ? "Simulacao salva com sucesso!"
              : "Comparacao salva com sucesso!"}
          </span>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-[var(--ds-market-negative)]/10 border border-[var(--ds-market-negative)]/30 text-[var(--ds-market-negative)] text-xs font-medium"
        >
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={idInput}
            className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider block"
          >
            Nome da simulacao (opcional)
          </label>
          <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
            <input
              id={idInput}
              type="text"
              placeholder={placeholder}
              value={nomeSimulacao}
              onChange={(e) => setNomeSimulacao(e.target.value)}
              className="w-full bg-[var(--ds-bg-primary)] px-3.5 py-2 text-sm font-medium text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--ds-accent-quant)] hover:opacity-90 text-[var(--ds-bg-primary)] text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {salvando ? (
            <>
              <svg
                className="animate-spin h-3.5 w-3.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Salvando...</span>
            </>
          ) : (
            botaoTexto
          )}
        </button>
      </form>
    </div>
  );
}
