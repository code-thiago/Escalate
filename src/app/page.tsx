"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, Layers, Cpu, Target, UploadCloud, ShieldCheck } from "lucide-react";
import { EscalateTerminalShell } from "@/src/components/shell/EscalateTerminalShell";
import { EscalateSymbol } from "@/src/components/brand/EscalateLogo";

const TERMINAL_MODULES = [
  {
    code: "MOD 01",
    badge: "REALIZADO + P10/P50/P90",
    title: "Calendario Financeiro Bifasico",
    description:
      "Fluxo mensal contabil realizado combinado com projecao estocastica P10/P50/P90, vencimentos programados e cobertura FGC.",
    href: "/investimentos",
    metricLabel: "Horizonte",
    metricValue: "3m — 24m",
    icon: Calendar,
    tone: "positive" as const,
  },
  {
    code: "MOD 02",
    badge: "10.000 BPS INVARIANT",
    title: "Minha Carteira & Escada de Liquidez",
    description:
      "Consolidacao multi-custodia com metodo Hare-Niemeyer em 10.000 bps e mapeamento de disponibilidade do D+0 ao vencimento.",
    href: "/investimentos/carteira",
    metricLabel: "Tiers de Liquidez",
    metricValue: "5 Niveis (D+0..Mat)",
    icon: Layers,
    tone: "quant" as const,
  },
  {
    code: "MOD 03",
    badge: "12 SLUGS / 5 BLOCOS",
    title: "Analise Critica de Produtos",
    description:
      "Inspecao deterministica de Renda Fixa, Tesouro, Previdencia, Acoes B3/Global, IPOs, Fundos, ETFs, COE, Cripto, Ouro e Cambio.",
    href: "/produtos",
    metricLabel: "Equacao Fisher",
    metricValue: "IR + IPCA + Drag",
    icon: ShieldCheck,
    tone: "positive" as const,
  },
  {
    code: "MOD 04",
    badge: "DTQW SU(2) + ZEN JDM",
    title: "Quantum Agent & GoRules ZEN",
    description:
      "Caminhada quantica discreta, Matriz Densidade, Entropia de Von Neumann S(rho) e auditoria deterministica em grafos JDM.",
    href: "/agent",
    metricLabel: "Alucinacao LLM",
    metricValue: "0.00% (Deterministico)",
    icon: Cpu,
    tone: "quant" as const,
  },
  {
    code: "MOD 05",
    badge: "FRACIONAL 1..10.000 BPS",
    title: "Objetivos, Metas & Simulador",
    description:
      "Alocacao fracionada de ativos por meta com guarda de liquidez ZEN e simulador de juros compostos com historico.",
    href: "/investimentos/objetivos",
    metricLabel: "Precisao",
    metricValue: "BigInt Cents",
    icon: Target,
    tone: "quant" as const,
  },
  {
    code: "MOD 06",
    badge: "AES-256-GCM / 0-TOKEN",
    title: "Conexoes Open Finance & B3 CSV",
    description:
      "Adapter Pattern para Open Finance Brasil Sandbox, parser deterministico B3 CEI/SINACOR e custodia manual auditada.",
    href: "/investimentos/conexoes",
    metricLabel: "Custo Parser",
    metricValue: "0 Tokens",
    icon: UploadCloud,
    tone: "positive" as const,
  },
];

export default function TerminalOverviewPage() {
  return (
    <EscalateTerminalShell initialActiveId="overview" showOverviewCards>
      <div className="space-y-6">
        {/* Terminal Identity Header Strip */}
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] flex items-center justify-center p-2.5 shrink-0">
              <EscalateSymbol className="w-full h-full fill-[var(--ds-accent-quant)]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-[family-name:var(--ds-font-mono)] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ds-accent-quant)]/10 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
                  ESCALATE • QUANTUM WEALTH TERMINAL
                </span>
                <span className="text-[10px] tabular-financial px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/10 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30">
                  WCAG 2.2 AAA
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-[var(--ds-text-primary)] tracking-tight">
                Mesa Consolidada de Acompanhamento Patrimonial &amp; Engenharia Quantitativa
              </h1>
              <p className="text-xs text-[var(--ds-text-secondary)] max-w-3xl">
                Selecione um modulo operacional abaixo ou utilize a arvore de custodia de 11 classes e os motores quantitativos na barra lateral (atalho Ctrl+K).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/investimentos"
              className="px-3.5 py-2 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-medium bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity"
            >
              Abrir Calendario
            </Link>
            <Link
              href="/sobre"
              className="px-3.5 py-2 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-quant)] transition-colors"
            >
              ADRs &amp; Arquitetura
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] bg-[var(--ds-bg-primary)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)] hover:text-[var(--ds-text-primary)] transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/registro"
              className="px-3.5 py-2 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] bg-[var(--ds-bg-primary)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)] hover:text-[var(--ds-text-primary)] transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </section>

        {/* Interactive Module Launch Grid */}
        <section aria-label="Modulos Operacionais do Terminal" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TERMINAL_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-quant)] rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="w-4 h-4 text-[var(--ds-accent-quant)]"
                        strokeWidth={1.5}
                      />
                      <span className="text-[10px] font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                        {mod.code}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] tabular-financial px-2 py-0.5 rounded border ${
                        mod.tone === "positive"
                          ? "bg-[var(--ds-market-positive)]/10 text-[var(--ds-market-positive)] border-[var(--ds-market-positive)]/30"
                          : "bg-[var(--ds-accent-quant)]/10 text-[var(--ds-accent-quant)] border-[var(--ds-accent-quant)]/30"
                      }`}
                    >
                      {mod.badge}
                    </span>
                  </div>

                  <h2 className="text-sm font-semibold text-[var(--ds-text-primary)] group-hover:text-[var(--ds-accent-quant)] transition-colors flex items-center justify-between gap-2">
                    <span>{mod.title}</span>
                    <ArrowUpRight className="w-4 h-4 shrink-0 text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-accent-quant)]" />
                  </h2>

                  <p className="text-xs text-[var(--ds-text-secondary)] leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-between text-[11px]">
                  <span className="font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]">
                    {mod.metricLabel}
                  </span>
                  <span className="tabular-financial font-medium text-[var(--ds-text-primary)]">
                    {mod.metricValue}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </EscalateTerminalShell>
  );
}
