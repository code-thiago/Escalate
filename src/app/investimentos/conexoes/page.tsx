"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import { INITIAL_CONNECTED_ACCOUNTS } from "@/src/core/finance/demo-portfolio";
import { formatCentsBRL } from "@/src/lib/formatters";

export default function ConexoesPage() {
  const [syncResult, setSyncResult] = useState<{
    providerType: string;
    syncedCount: number;
    message: string;
  } | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function handleTriggerSync(
    providerType: "OPEN_FINANCE_SANDBOX" | "B3_CSV" | "MANUAL",
    institutionName: string,
  ) {
    setLoadingProvider(providerType);
    try {
      const payload =
        providerType === "OPEN_FINANCE_SANDBOX"
          ? { scenario: "balanced" }
          : providerType === "B3_CSV"
            ? "Produto;Instituicao;Quantidade;Valor Atual\nWEGE3 - WEG SA;XP INVESTIMENTOS;200;R$ 10.800,00\nTESOURO SELIC 2029;BTG PACTUAL;5;R$ 75.400,00"
            : {
                institutionId: "MANUAL_CUSTODY",
                productClass: "renda_fixa",
                tickerOrCode: "CDB-BANCO-INTER",
                assetName: "CDB Inter 105% CDI Liquidez Diaria",
                investedCents: 2500000,
                currentGrossCents: 2740000,
                currentNetCents: 2690000,
                annualRateBps: 1380,
                indexer: "CDI",
                liquidityTier: "D_0",
                liquidityDays: 0,
                fgcCovered: true,
              };

      const res = await fetch("/api/conexoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerType, institutionName, payload }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncResult({
          providerType,
          syncedCount: data.syncedCount ?? 0,
          message: `Sincronizacao concluida com sucesso via ${providerType}: ${data.syncedCount} posicoes normalizadas em centavos (BigInt).`,
        });
      } else {
        setSyncResult({
          providerType,
          syncedCount: 0,
          message: data.error || "Falha ao sincronizar conta.",
        });
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <PlatformShell
      title="Conexoes de Contas — Open Finance, B3 Area do Investidor & Custodia Manual"
      subtitle="Arquitetura Adapter Pattern (AccountConnectorProvider) com criptografia AES-256-GCM para tokens de leitura e normalizacao deterministica em centavos"
      actions={
        <Link
          href="/investimentos"
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          Voltar ao Dashboard
        </Link>
      }
    >
      {/* Active Connected Institutions */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-100">
          Contas e Custodiantes Conectados ({INITIAL_CONNECTED_ACCOUNTS.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INITIAL_CONNECTED_ACCOUNTS.map((acc) => (
            <div
              key={acc.id}
              className="bg-slate-900/80 border border-slate-800 rounded-md p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {acc.providerType}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100 mt-1.5">
                    {acc.institutionName}
                  </h4>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {acc.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono tabular-nums">
                <span className="text-slate-400">
                  {acc.assetsCount} ativos sincronizados
                </span>
                <span className="text-slate-100 font-semibold">
                  {formatCentsBRL(acc.totalNetCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Connector Adapters Trigger Panel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-indigo-400 uppercase">
              Adapter 01 — API Read-Only
            </span>
            <h4 className="text-sm font-semibold text-slate-100">
              Open Finance Brasil Sandbox
            </h4>
            <p className="text-xs text-slate-400">
              Sincroniza CDBs, LCIs, Fundos e Tesouro Direto de instituicoes participantes com tokens protegidos via AES-256-GCM.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() =>
              handleTriggerSync(
                "OPEN_FINANCE_SANDBOX",
                "BTG Pactual Open Finance",
              )
            }
            className="w-full py-2 px-3 rounded text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "OPEN_FINANCE_SANDBOX"
              ? "Sincronizando..."
              : "Sincronizar Open Finance"}
          </button>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-emerald-400 uppercase">
              Adapter 02 — Parser CEI/B3
            </span>
            <h4 className="text-sm font-semibold text-slate-100">
              Importador B3 Area do Investidor (CSV)
            </h4>
            <p className="text-xs text-slate-400">
              Processa arquivos CSV exportados da B3 convertendo valores em Reais para centavos inteiros sem perda de ponto flutuante.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => handleTriggerSync("B3_CSV", "B3 Custodia Consolidada")}
            className="w-full py-2 px-3 rounded text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "B3_CSV"
              ? "Processando CSV..."
              : "Testar Importacao B3 CSV"}
          </button>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-cyan-400 uppercase">
              Adapter 03 — Entrada Assistida
            </span>
            <h4 className="text-sm font-semibold text-slate-100">
              Custodia Direta / Cold Wallet Manual
            </h4>
            <p className="text-xs text-slate-400">
              Adiciona ativos internacionais, criptoativos em hardware wallet ou emissoes privadas com validacao estrita Zod.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() =>
              handleTriggerSync("MANUAL", "Custodia Manual Assistida")
            }
            className="w-full py-2 px-3 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "MANUAL"
              ? "Validando..."
              : "Simular Registro Manual"}
          </button>
        </div>
      </section>

      {syncResult && (
        <div className="bg-indigo-950/40 border border-indigo-500/60 rounded-lg p-4 font-mono text-xs text-indigo-200">
          [STATUS SINCRONIZACAO]: {syncResult.message}
        </div>
      )}
    </PlatformShell>
  );
}
