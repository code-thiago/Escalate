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
        throw new Error("Periodo invalido");
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
        throw new Error("Falha na comparacao");
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
        mensagemErro: "Tipo de simulacao desconhecido",
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      sucesso: false,
      mensagemErro: error?.message || "Erro no recalculo",
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
        throw new Error("Erro ao buscar simulacoes");
      }
      const data = await res.json();
      setSimulacoes(data.simulacoes || []);
    } catch {
      setErrorMessage("Nao foi possivel carregar as simulacoes salvas.");
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
    if (!confirm("Tem certeza que deseja excluir esta simulacao?")) return;
    try {
      setDeletandoId(id);
      const res = await fetch(`/api/simulacoes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Falha ao excluir simulacao");
      }
      setSimulacoes((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erro ao excluir simulacao. Tente novamente.");
    } finally {
      setDeletandoId(null);
    }
  };

  if (isSessionPending) {
    return (
      <div className="h-28 bg-[var(--ds-surface-card)] rounded-xl animate-pulse border border-[var(--ds-border-subtle)]" />
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-6 text-center space-y-3">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
          Acesse sua conta para visualizar simulacoes salvas
        </h3>
        <p className="text-xs text-[var(--ds-text-secondary)] max-w-md mx-auto">
          Faca login para armazenar multiplos cenarios de investimento e recarrega-los a qualquer momento.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ds-accent-quant)] hover:opacity-90 text-[var(--ds-bg-primary)] text-xs font-semibold transition-opacity"
        >
          Entrar na Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-mono)] uppercase tracking-wider tabular-financial">
            Historico de Simulacoes Salvas ({simulacoes.length})
          </h3>
          <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">
            Recalculo deterministico em tempo real a partir dos parametros brutos persistidos no banco
          </p>
        </div>
        <button
          type="button"
          onClick={carregarSimulacoes}
          disabled={isLoading}
          className="px-2.5 py-1 text-xs font-[family-name:var(--ds-font-mono)] rounded-lg bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-[var(--ds-market-negative)]/10 border border-[var(--ds-market-negative)]/30 text-[var(--ds-market-negative)] text-xs">
          {errorMessage}
        </div>
      )}

      {isLoading && simulacoes.length === 0 ? (
        <div className="space-y-2">
          <div className="h-16 bg-[var(--ds-bg-primary)] rounded-lg animate-pulse border border-[var(--ds-border-subtle)]" />
          <div className="h-16 bg-[var(--ds-bg-primary)] rounded-lg animate-pulse border border-[var(--ds-border-subtle)]" />
        </div>
      ) : simulacoes.length === 0 ? (
        <div className="text-center py-8 text-xs text-[var(--ds-text-secondary)]">
          Nenhuma simulacao salva encontrada. Use o formulario acima para salvar cenarios.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {simulacoes.map((item) => {
            const recalculo = recalcularSimulacao(item);
            const isDeleting = deletandoId === item.id;

            return (
              <div
                key={item.id}
                className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-[family-name:var(--ds-font-mono)] text-xs font-bold text-[var(--ds-accent-quant)] block">
                      {item.nome || (item.tipo === "juros_compostos" ? "Juros Compostos" : "Comparador Renda Fixa")}
                    </span>
                    <span className="text-[10px] tabular-financial text-[var(--ds-text-secondary)]">
                      {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExcluir(item.id)}
                    disabled={isDeleting}
                    className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-market-negative)] hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Excluindo..." : "Excluir"}
                  </button>
                </div>

                {recalculo.sucesso ? (
                  recalculo.resumo.tipo === "juros_compostos" ? (
                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-[var(--ds-border-subtle)] tabular-financial">
                      <div>
                        <span className="text-[10px] text-[var(--ds-text-secondary)] block font-[family-name:var(--ds-font-sans)]">
                          Investido
                        </span>
                        <span className="font-semibold text-[var(--ds-text-primary)] tabular-financial">
                          {formatarMoeda(recalculo.resumo.totalInvestido)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--ds-text-secondary)] block font-[family-name:var(--ds-font-sans)]">
                          Juros
                        </span>
                        <span className="font-semibold text-[var(--ds-market-positive)] tabular-financial">
                          {formatarMoeda(recalculo.resumo.totalJuros)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--ds-text-secondary)] block font-[family-name:var(--ds-font-sans)]">
                          Total Final
                        </span>
                        <span className="font-bold text-[var(--ds-text-primary)] tabular-financial">
                          {formatarMoeda(recalculo.resumo.valorFinal)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--ds-border-subtle)] tabular-financial">
                      <div>
                        <span className="text-[10px] text-[var(--ds-text-secondary)] block font-[family-name:var(--ds-font-sans)]">
                          Melhor Opcao
                        </span>
                        <span className="font-bold text-[var(--ds-market-positive)] tabular-financial">
                          {recalculo.resumo.produtoVencedor}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[var(--ds-text-secondary)] block font-[family-name:var(--ds-font-sans)]">
                          Valor Liquido
                        </span>
                        <span className="font-bold text-[var(--ds-text-primary)] tabular-financial">
                          {formatarMoeda(recalculo.resumo.valorLiquidoVencedor)}
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-xs text-[var(--ds-market-negative)] font-[family-name:var(--ds-font-mono)]">
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
