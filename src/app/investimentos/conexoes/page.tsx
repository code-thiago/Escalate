"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import { INITIAL_CONNECTED_ACCOUNTS } from "@/src/core/finance/demo-portfolio";
import { formatCentsBRL } from "@/src/lib/formatters";

function VaultTabSync({ onVaultMode }: { onVaultMode: (active: boolean) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onVaultMode(searchParams?.get("tab") === "vault");
  }, [searchParams, onVaultMode]);
  return null;
}

export default function ConexoesPage() {
  const [syncResult, setSyncResult] = useState<{
    providerType: string;
    syncedCount: number;
    message: string;
  } | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isVaultHighlighted, setIsVaultHighlighted] = useState(false);

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
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors"
        >
          Voltar ao Dashboard
        </Link>
      }
    >
      <Suspense fallback={null}>
        <VaultTabSync onVaultMode={setIsVaultHighlighted} />
      </Suspense>

      {isVaultHighlighted && (
        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-accent-quant)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)]">
            [AES-256-GCM API VAULT ACTIVE]: Credenciais e tokens read-only cifrados com chave mestre isolada e rotacao automatica.
          </div>
          <span className="text-[11px] tabular-financial px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/10 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30">
            0-TOKEN PARSER
          </span>
        </div>
      )}

      {/* Active Connected Institutions */}
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
          Contas e Custodiantes Conectados ({INITIAL_CONNECTED_ACCOUNTS.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INITIAL_CONNECTED_ACCOUNTS.map((acc) => (
            <div
              key={acc.id}
              className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-[family-name:var(--ds-font-mono)] text-[10px] px-2 py-0.5 rounded bg-[var(--ds-accent-quant)]/15 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
                    {acc.providerType}
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mt-1.5">
                    {acc.institutionName}
                  </h3>
                </div>
                <span className="font-[family-name:var(--ds-font-mono)] text-[10px] px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30">
                  {acc.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--ds-border-subtle)] text-xs tabular-financial">
                <span className="text-[var(--ds-text-secondary)]">
                  {acc.assetsCount} ativos sincronizados
                </span>
                <span className="text-[var(--ds-text-primary)] font-semibold">
                  {formatCentsBRL(acc.totalNetCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Connector Adapters Trigger Panel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-[family-name:var(--ds-font-mono)] text-[11px] text-[var(--ds-accent-quant)] uppercase">
              Adapter 01 — API Read-Only
            </span>
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              Open Finance Brasil Sandbox
            </h3>
            <p className="text-xs text-[var(--ds-text-secondary)]">
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
            className="w-full py-2 px-3 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "OPEN_FINANCE_SANDBOX"
              ? "Sincronizando..."
              : "Sincronizar Open Finance"}
          </button>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-[family-name:var(--ds-font-mono)] text-[11px] text-[var(--ds-market-positive)] uppercase">
              Adapter 02 — Parser CEI/B3
            </span>
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              Importador B3 Area do Investidor (CSV)
            </h3>
            <p className="text-xs text-[var(--ds-text-secondary)]">
              Processa arquivos CSV exportados da B3 convertendo valores em Reais para centavos inteiros sem perda de ponto flutuante.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => handleTriggerSync("B3_CSV", "B3 Custodia Consolidada")}
            className="w-full py-2 px-3 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-market-positive)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "B3_CSV"
              ? "Processando CSV..."
              : "Testar Importacao B3 CSV"}
          </button>
        </div>

        <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="font-[family-name:var(--ds-font-mono)] text-[11px] text-[var(--ds-accent-quant)] uppercase">
              Adapter 03 — Entrada Assistida
            </span>
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              Custodia Direta / Cold Wallet Manual
            </h3>
            <p className="text-xs text-[var(--ds-text-secondary)]">
              Adiciona ativos internacionais, criptoativos em hardware wallet ou emissoes privadas com validacao estrita Zod.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() =>
              handleTriggerSync("MANUAL", "Custodia Manual Assistida")
            }
            className="w-full py-2 px-3 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingProvider === "MANUAL"
              ? "Validando..."
              : "Simular Registro Manual"}
          </button>
        </div>
      </section>

      {syncResult && (
        <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-accent-quant)] rounded-xl p-4 font-[family-name:var(--ds-font-mono)] text-xs text-[var(--ds-text-primary)] tabular-financial">
          [STATUS SINCRONIZACAO]: {syncResult.message}
        </div>
      )}
    </PlatformShell>
  );
}
