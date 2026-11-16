"use client";

import Link from "next/link";
import { EscalateSymbol } from "@/src/components/brand/EscalateLogo";

export default function LandingPlaceholderPage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-4xl text-center space-y-8">
        {/* Brand Hero Icon */}
        <div className="inline-flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center p-3.5 shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-500/30 transition-transform duration-300 hover:scale-105">
            <EscalateSymbol className="w-full h-full fill-white" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            ESCALATE • QUANTUM WEALTH &amp; MARKET INTELLIGENCE
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
            Plataforma Quantitativa de Acompanhamento Patrimonial
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Conecte suas contas de investimento, acompanhe sua rentabilidade no Calendario Bifasico, execute analises criticas nas 8 classes de produtos e utilize o Agente Preditivo com Caminhada Quantica (DTQW) e GoRules ZEN Engine.
          </p>
        </div>

        {/* 3 Primary Modules Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-2">
          <Link
            href="/investimentos"
            className="bg-[#0f172a] border border-slate-800 hover:border-indigo-500 rounded-lg p-5 transition-all space-y-2"
          >
            <span className="font-mono text-xs text-indigo-400 font-semibold">
              ABA 01 — INVESTIMENTOS
            </span>
            <h2 className="text-base font-bold text-slate-100">
              Calendario Bifasico &amp; Minha Carteira
            </h2>
            <p className="text-xs text-slate-400">
              Rentabilidade realizada e futura (P10/P50/P90), classes em 10.000 bps, escada de liquidez e metas fracionadas.
            </p>
          </Link>

          <Link
            href="/produtos"
            className="bg-[#0f172a] border border-slate-800 hover:border-indigo-500 rounded-lg p-5 transition-all space-y-2"
          >
            <span className="font-mono text-xs text-emerald-400 font-semibold">
              ABA 02 — PRODUTOS (8 CLASSES)
            </span>
            <h2 className="text-base font-bold text-slate-100">
              Analise Critica System Design
            </h2>
            <p className="text-xs text-slate-400">
              Renda Fixa, Fundos, Bolsa, COE, Cripto, Tesouro Direto, Cambio e ETFs auditados em 5 blocos estruturais.
            </p>
          </Link>

          <Link
            href="/agent"
            className="bg-[#0f172a] border border-slate-800 hover:border-indigo-500 rounded-lg p-5 transition-all space-y-2"
          >
            <span className="font-mono text-xs text-cyan-400 font-semibold">
              ABA 03 — QUANTUM AGENT
            </span>
            <h2 className="text-base font-bold text-slate-100">
              Matematica Quantica &amp; GoRules ZEN
            </h2>
            <p className="text-xs text-slate-400">
              Simulacao DTQW SU(2), Matriz Densidade, Entropia de Von Neumann S(rho) e grafos JDM deterministicos.
            </p>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/investimentos"
            className="w-full sm:w-auto min-w-[180px] px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold tracking-wide transition-all text-center"
          >
            Acessar Plataforma
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto min-w-[140px] px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-sm font-semibold tracking-wide transition-all text-center"
          >
            Entrar
          </Link>

          <Link
            href="/registro"
            className="w-full sm:w-auto min-w-[140px] px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-sm font-semibold tracking-wide transition-all text-center"
          >
            Criar conta
          </Link>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <Link href="/investimentos/objetivos" className="hover:text-slate-200 hover:underline">
            Projetor de Juros &amp; Metas
          </Link>
          <span>|</span>
          <Link href="/produtos/renda-fixa" className="hover:text-slate-200 hover:underline">
            Comparador de Renda Fixa
          </Link>
          <span>|</span>
          <Link href="/sobre" className="hover:text-slate-200 hover:underline">
            Documentacao Tecnica &amp; ADRs -&gt;
          </Link>
        </div>
      </div>
    </main>
  );
}
