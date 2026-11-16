"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/src/lib/auth-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EscalateSymbol } from "@/src/components/brand/EscalateLogo";

interface NavItem {
  id: string;
  label: string;
  code: string;
  href: string;
  subtitle: string;
  subLinks?: Array<{ label: string; href: string }>;
}

const PRIMARY_TABS: NavItem[] = [
  {
    id: "investimentos",
    code: "01",
    label: "Investimentos",
    href: "/investimentos",
    subtitle: "Calendario Bifasico & Minha Carteira",
    subLinks: [
      { label: "Dashboard & Calendario", href: "/investimentos" },
      { label: "Minha Carteira (Classes & Liquidez)", href: "/investimentos/carteira" },
      { label: "Objetivos & Metas (Bps)", href: "/investimentos/objetivos" },
      { label: "Conectar Contas (Open Finance / B3)", href: "/investimentos/conexoes" },
    ],
  },
  {
    id: "produtos",
    code: "02",
    label: "Produtos",
    href: "/produtos",
    subtitle: "Analise Critica System Design (8 Classes)",
    subLinks: [
      { label: "Visao Geral (8 Classes)", href: "/produtos" },
      { label: "Renda Fixa", href: "/produtos/renda-fixa" },
      { label: "Fundos de Investimentos", href: "/produtos/fundos" },
      { label: "Bolsa de Valores (B3 & Global)", href: "/produtos/bolsa" },
      { label: "COE (Estruturados)", href: "/produtos/coe" },
      { label: "Criptoativos", href: "/produtos/cripto" },
      { label: "Tesouro Direto", href: "/produtos/tesouro-direto" },
      { label: "Cambio & Remessas", href: "/produtos/cambio" },
      { label: "ETFs", href: "/produtos/etfs" },
    ],
  },
  {
    id: "agent",
    code: "03",
    label: "Agent",
    href: "/agent",
    subtitle: "Matematica Quantica (DTQW) & GoRules ZEN",
  },
];

export function PlatformShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isTabActive = (tab: NavItem) => {
    if (pathname === tab.href) return true;
    if (pathname.startsWith(`${tab.href}/`)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-indigo-500/30">
      {/* 3-Tab Institutional Sidebar */}
      <aside
        aria-label="Navegacao Principal da Plataforma Escalate"
        className="w-full lg:w-72 shrink-0 bg-[#070a12] border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between"
      >
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-800/80">
            <Link href="/" className="flex items-center gap-2.5 group transition-opacity hover:opacity-90">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center p-1.5 shadow-xs group-hover:bg-indigo-500 transition-colors">
                <EscalateSymbol className="w-full h-full fill-white" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold block">
                  ESCALATE
                </span>
                <h1 className="text-sm font-semibold text-slate-100">
                  Wealth &amp; Market Intelligence
                </h1>
              </div>
            </Link>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 tabular-nums">
              v2.0 ZEN
            </span>
          </div>

          {/* 3 Primary Sidebar Tabs */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-2">
              Modulos Principais (3 Abas)
            </div>
            <nav className="space-y-2" aria-label="Abas Principais">
              {PRIMARY_TABS.map((tab) => {
                const active = isTabActive(tab);
                return (
                  <div key={tab.id} className="space-y-1">
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`group block rounded-md px-3 py-2.5 border transition-colors ${
                        active
                          ? "bg-indigo-950/50 border-indigo-500/60 text-white"
                          : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm tracking-tight">
                          {tab.label}
                        </span>
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums ${
                            active
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          ABA {tab.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {tab.subtitle}
                      </p>
                    </Link>

                    {/* Contextual sub-navigation when tab is active */}
                    {active && tab.subLinks && (
                      <div className="pl-3 ml-2 border-l border-slate-800 space-y-1 py-1">
                        {tab.subLinks.map((sub) => {
                          const subActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`block px-2.5 py-1.5 rounded text-xs transition-colors ${
                                subActive
                                  ? "bg-indigo-500/15 text-indigo-300 font-medium border-l-2 border-indigo-400"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Session & Institutional Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#05080f] space-y-3">
          {/* Auth Session Card */}
          {isPending ? (
            <div className="h-10 rounded bg-slate-900/60 animate-pulse border border-slate-800" />
          ) : session?.user ? (
            <div className="rounded bg-slate-900/90 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                  {session.user.name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">
                    {session.user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {session.user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded border border-transparent transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? "..." : "Sair"}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
            >
              Entrar na Conta
            </Link>
          )}

          <div className="rounded bg-slate-900/90 border border-slate-800 p-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>ENGINE STATUS</span>
              <span className="text-emerald-400 font-semibold">NODE.JS ATIVO</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400 font-mono space-y-0.5 tabular-nums">
              <div>Precisao: BigInt Cents / 10000 bps</div>
              <div>Regras: GoRules ZEN JDM</div>
              <div>Quant: DTQW SU(2) + Von Neumann</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <Link href="/sobre" className="hover:text-indigo-400 transition-colors">
              Arquitetura &amp; ADRs
            </Link>
            <span>•</span>
            <span className="text-[11px] text-slate-400">Escalate v2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#0b101d] border-b border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
