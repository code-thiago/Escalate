"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/src/lib/auth-client";
import { formatarMoeda } from "@/src/lib/formatters";
import {
  calcularJurosCompostos,
  ParametrosSimulacao,
} from "@/src/core/jurosCompostos";
import {
  compararInvestimentos,
  ParametrosComparador,
} from "@/src/core/comparadorInvestimentos";

interface SimulacaoDb {
  id: string;
  tipo: "juros_compostos" | "comparador";
  nome: string | null;
  parametros: Record<string, unknown>;
  criadoEm: string;
}

interface ResumoJurosCompostos {
  tipo: "juros_compostos";
  valorFinal: number;
  totalInvestido: number;
  totalJuros: number;
  parametros: {
    valorInicial: number;
    aporteMensal: number;
    taxaAnual: number;
    periodoMeses: number;
  };
}

interface ResumoComparador {
  tipo: "comparador";
  produtoVencedor: "CDB" | "TESOURO_SELIC" | "POUPANCA";
  valorLiquidoVencedor: number;
  parametros: {
    valorInicial: number;
    periodoMeses: number;
    taxaSelicAnual: number;
    percentualCDI: number;
  };
}

type ResultadoRecalculo =
  | { sucesso: true; resumo: ResumoJurosCompostos | ResumoComparador }
  | { sucesso: false; mensagemErro: string };

function recalcularSimulacao(item: SimulacaoDb): ResultadoRecalculo {
  try {
    if (item.tipo === "juros_compostos") {
      const p = item.parametros || {};
      const valorInicial = Number(p.valorInicial ?? 0);
      const aporteMensal = Number(p.aporteMensal ?? 0);
      const taxaAnual = Number(p.taxaAnual ?? 0);
      const periodoMeses = Number(
        p.periodoMeses ??
        (Number(p.periodo ?? 0) * (p.periodoUnidade === "anos" ? 12 : 1))
      );

      const params: ParametrosSimulacao = {
        valorInicial,
        aporteMensal,
        taxaAnual,
        periodoMeses,
      };

      const pontos = calcularJurosCompostos(params);
      if (!pontos || pontos.length === 0) {
        throw new Error("Período inválido");
      }

      const pontoFinal = pontos[pontos.length - 1];

      return {
        sucesso: true,
        resumo: {
          tipo: "juros_compostos",
          valorFinal: pontoFinal.valorTotal,
          totalInvestido: pontoFinal.valorInvestido,
          totalJuros: pontoFinal.jurosAcumulados,
          parametros: {
            valorInicial,
            aporteMensal,
            taxaAnual,
            periodoMeses,
          },
        },
      };
    } else if (item.tipo === "comparador") {
      const p = item.parametros || {};
      const valorInicial = Number(p.valorInicial ?? 0);
      const periodoMeses = Number(
        p.periodoMeses ??
        (Number(p.periodo ?? 0) * (p.periodoUnidade === "anos" ? 12 : 1))
      );
      const taxaSelicAnual = Number(p.taxaSelicAnual ?? 0);
      const percentualCDI = Number(p.percentualCDI ?? 0);

      const params: ParametrosComparador = {
        valorInicial,
        periodoMeses,
        taxaSelicAnual,
        percentualCDI,
      };

      const resultados = compararInvestimentos(params);
      if (!resultados || resultados.length === 0) {
        throw new Error("Falha na comparação");
      }

      const vencedor = resultados[0];

      return {
        sucesso: true,
        resumo: {
          tipo: "comparador",
          produtoVencedor: vencedor.produto,
          valorLiquidoVencedor: vencedor.valorLiquido,
          parametros: {
            valorInicial,
            periodoMeses,
            taxaSelicAnual,
            percentualCDI,
          },
        },
      };
    } else {
      return {
        sucesso: false,
        mensagemErro: "Tipo de simulação desconhecido",
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      sucesso: false,
      mensagemErro: error?.message || "Erro no recálculo",
    };
  }
}

export default function HistoricoSimulacoes() {
  const { data: session, isPending: isSessionPending } = useSession();
  const [simulacoes, setSimulacoes] = useState<SimulacaoDb[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const carregarSimulacoes = useCallback(async () => {
    if (!session?.user) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/simulacoes");
      if (!res.ok) {
        throw new Error("Erro ao buscar simulações");
      }
      const data = await res.json();
      setSimulacoes(data.simulacoes || []);
    } catch {
      setErrorMessage("Não foi possível carregar as simulações salvas.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      carregarSimulacoes();
    }
  }, [session?.user, carregarSimulacoes]);

  const handleExcluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta simulação?")) return;
    try {
      setDeletandoId(id);
      const res = await fetch(`/api/simulacoes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Falha ao excluir simulação");
      }
      setSimulacoes((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erro ao excluir simulação. Tente novamente.");
    } finally {
      setDeletandoId(null);
    }
  };

  if (isSessionPending) {
    return (
      <div className="h-28 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 text-center space-y-3">
        <h4 className="text-sm font-semibold text-slate-100">
          Acesse sua conta para visualizar simulações salvas
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Faça login para armazenar múltiplos cenários de investimento e recarregá-los a qualquer momento.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          Entrar na Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
            Histórico de Simulações Salvas ({simulacoes.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Recálculo determinístico em tempo real a partir dos parâmetros brutos persistidos no banco
          </p>
        </div>
        <button
          onClick={carregarSimulacoes}
          disabled={isLoading}
          className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      {isLoading && simulacoes.length === 0 ? (
        <div className="space-y-2">
          <div className="h-16 bg-slate-900/60 rounded-lg animate-pulse border border-slate-800" />
          <div className="h-16 bg-slate-900/60 rounded-lg animate-pulse border border-slate-800" />
        </div>
      ) : simulacoes.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          Nenhuma simulação salva encontrada. Use o formulário acima para salvar cenários.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {simulacoes.map((item) => {
            const recalculo = recalcularSimulacao(item);
            const isDeleting = deletandoId === item.id;

            return (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-400 block">
                      {item.nome || (item.tipo === "juros_compostos" ? "Juros Compostos" : "Comparador Renda Fixa")}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExcluir(item.id)}
                    disabled={isDeleting}
                    className="text-[11px] font-mono text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Excluindo..." : "Excluir"}
                  </button>
                </div>

                {recalculo.sucesso ? (
                  recalculo.resumo.tipo === "juros_compostos" ? (
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-800/60 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Investido</span>
                        <span className="font-semibold text-slate-200">
                          {formatarMoeda(recalculo.resumo.totalInvestido)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Juros</span>
                        <span className="font-semibold text-emerald-400">
                          {formatarMoeda(recalculo.resumo.totalJuros)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Final</span>
                        <span className="font-bold text-slate-100">
                          {formatarMoeda(recalculo.resumo.valorFinal)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Melhor Opção</span>
                        <span className="font-bold text-emerald-400">
                          {recalculo.resumo.produtoVencedor}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Valor Líquido</span>
                        <span className="font-bold text-slate-100">
                          {formatarMoeda(recalculo.resumo.valorLiquidoVencedor)}
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-xs text-rose-400 font-mono">
                    {recalculo.mensagemErro}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
