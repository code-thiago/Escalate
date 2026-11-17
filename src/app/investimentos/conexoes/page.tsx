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
  const [sinacorBatchResult, setSinacorBatchResult] = useState<{
    assetsCount: number;
    llmTokensUsed: number;
  } | null>(null);
  const [loadingSinacor, setLoadingSinacor] = useState(false);
  const [vaultEnvelopeProof, setVaultEnvelopeProof] = useState<{
    keyId: string;
    provider: string;
    ivHex: string;
    authTagHex: string;
  } | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);

  async function handleSinacorBatchTrigger() {
    setLoadingSinacor(true);
    try {
      const res = await fetch("/api/escalate/custody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARSE_SINACOR_B3",
          rows: [
            {
              assetId: "b3-1",
              ticker: "PETR4",
              rawCategory: "EQUITY_BR",
              quantity: "100",
              unitPrice: "38.50",
              expectedReturnAnnual: "0.14",
              liquidityDays: "2",
            },
            {
              assetId: "b3-2",
              ticker: "TESOURO-IPCA-2035",
              rawCategory: "TESOURO",
              quantity: "10",
              unitPrice: "3100.00",
              expectedReturnAnnual: "0.12",
              liquidityDays: "1",
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const assets = Array.isArray(data.assets)
          ? data.assets
          : Array.isArray(data.data?.assets)
            ? data.data.assets
            : [];
        const tokens =
          typeof data.llmTokensUsed === "number"
            ? data.llmTokensUsed
            : typeof data.data?.llmTokensUsed === "number"
              ? data.data.llmTokensUsed
              : 0;
        setSinacorBatchResult({
          assetsCount: assets.length,
          llmTokensUsed: tokens,
        });
      }
    } finally {
      setLoadingSinacor(false);
    }
  }

  async function handleVaultSealTrigger() {
    setLoadingVault(true);
    try {
      const res = await fetch("/api/escalate/custody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "STORE_BROKER_KEY",
          keyId: "binance-ro-01",
          provider: "BINANCE_READONLY",
          plaintextKey:
            "demo-readonly-binance-key-64-chars-minimum-length-for-aes-256-gcm",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const source =
          data.record ?? data.envelope ?? data.vaultRecord ?? data.data ?? data;
        setVaultEnvelopeProof({
          keyId: String(source?.keyId ?? "binance-ro-01"),
          provider: String(source?.provider ?? "BINANCE_READONLY"),
          ivHex: String(source?.ivHex ?? ""),
          authTagHex: String(source?.authTagHex ?? ""),
        });
      }
    } finally {
      setLoadingVault(false);
    }
  }

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

      <section
        className={`bg-[var(--ds-surface-card)] border ${
          isVaultHighlighted
            ? "border-[var(--ds-accent-quant)]"
            : "border-[var(--ds-border-subtle)]"
        } rounded-xl p-4 space-y-3`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)]">
            [AES-256-GCM API VAULT ACTIVE]: Credenciais e tokens read-only cifrados com chave mestre isolada e rotacao automatica.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-financial px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/10 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30">
              0-TOKEN PARSER
            </span>
            <button
              type="button"
              disabled={loadingVault}
              onClick={handleVaultSealTrigger}
              className="py-1.5 px-3 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              Selar Chave Read-Only (AES-256-GCM)
            </button>
          </div>
        </div>

        {vaultEnvelopeProof && (
          <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-[family-name:var(--ds-font-mono)] tabular-financial">
            <div className="text-[var(--ds-text-secondary)]">
              KEY ID / PROVIDER:{" "}
              <span className="text-[var(--ds-text-primary)] tabular-financial">
                {vaultEnvelopeProof.keyId} ({vaultEnvelopeProof.provider})
              </span>
            </div>
            <div className="text-[var(--ds-text-secondary)]">
              IV (96-BIT HEX):{" "}
              <span className="text-[var(--ds-accent-quant)] tabular-financial">
                {vaultEnvelopeProof.ivHex}
              </span>
            </div>
            <div className="md:col-span-2 text-[var(--ds-text-secondary)]">
              AUTH TAG (128-BIT HEX):{" "}
              <span className="text-[var(--ds-market-positive)] tabular-financial">
                {vaultEnvelopeProof.authTagHex}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* SINACOR / B3 0-Token Deterministic Trigger */}
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
              Motor SINACOR / B3 — Ingestao Deterministica Zero-LLM
            </h2>
            <p className="text-xs text-[var(--ds-text-secondary)]">
              Converte lotes brutos SINACOR/B3 em vetores matematicos exatos Decimal.js sem consumo de tokens de LLM.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingSinacor}
            onClick={handleSinacorBatchTrigger}
            className="py-2 px-3 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-market-positive)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            Simular Lote SINACOR/B3 (0 Tokens)
          </button>
        </div>

        {sinacorBatchResult && (
          <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] rounded-lg p-3 flex items-center justify-between text-xs font-[family-name:var(--ds-font-mono)] tabular-financial">
            <span className="text-[var(--ds-text-primary)] tabular-financial">
              Ativos Normalizados: {sinacorBatchResult.assetsCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30 tabular-financial">
              llmTokensUsed: {sinacorBatchResult.llmTokensUsed}
            </span>
          </div>
        )}
      </section>

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
