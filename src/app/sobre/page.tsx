import type { Metadata } from "next";
import Link from "next/link";
import EscalateLogo from "@/src/components/brand/EscalateLogo";

export const metadata: Metadata = {
  title: "Sobre o Projeto | Escalate",
  description: "Conheca a arquitetura, objetivos matematicos e stack tecnica do Escalate — Simulador Financeiro & Inteligencia Quantitativa.",
};

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)] flex flex-col">
      {/* Cabecalho Simplificado com Identidade Escalate */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EscalateLogo size="md" href="/" />
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors rounded-lg hover:bg-[var(--ds-surface-elevated)]"
          >
            <span aria-hidden="true">&larr;</span> Voltar ao terminal
          </Link>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)]/10 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-quant)]" />
          Documentacao Tecnica
        </span>
      </header>

      {/* Conteudo Principal */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-16 flex-1">
        {/* a) Hero */}
        <section className="space-y-5 text-center sm:text-left">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--ds-text-primary)]">
              Escalate — Simulador Financeiro &amp; Inteligencia Quantitativa
            </h1>
            <p className="text-base sm:text-lg text-[var(--ds-text-secondary)] max-w-2xl leading-relaxed">
              Uma ferramenta de simulacao e comparativo de investimentos orientada pelo rigor matematico, respeito a legislacao fiscal brasileira e decisoes de engenharia pragmaticas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/registro"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--ds-accent-quant)] hover:opacity-90 text-[var(--ds-bg-primary)] text-sm font-semibold tracking-wide transition-opacity text-center"
            >
              Criar conta gratuita
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--ds-surface-card)] hover:bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] text-sm font-semibold tracking-wide transition-colors text-center"
            >
              Voltar ao terminal
            </Link>
          </div>
        </section>

        {/* b) Por que esse projeto existe */}
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
            Por que esse projeto existe
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-[var(--ds-text-secondary)] leading-relaxed">
            <p>
              O diferencial desta aplicacao nao e consumir uma API de cotacao — integrar endpoints externos e algo que qualquer um faz. O que o Escalate demonstra e um entendimento solido da logica financeira e fiscal real por tras da tela.
            </p>
            <p>
              Em vez de adotar aproximacoes simplificadas que geram resultados inconsistentes com o mercado real, o projeto foca no rigor das regras brasileiras:
            </p>
            <ul className="list-disc pl-5 space-y-2.5 text-[var(--ds-text-primary)]">
              <li>
                <strong>Tabela de IR regressivo real:</strong> Aplicacao exata das aliquotas oficiais de Imposto de Renda (de 22,5% a 15%) conforme o prazo do investimento (ate 180 dias, 181 a 360, 361 a 720 e acima de 720 dias).
              </li>
              <li>
                <strong>Regra da poupanca (Lei 12.703/2012):</strong> Alternancia precisa entre 70% da meta da Selic + TR (quando a taxa basica esta em ate 8,5% ao ano) e o rendimento de 0,5% ao mes + TR (quando a Selic ultrapassa 8,5% ao ano).
              </li>
              <li>
                <strong>Aritmetica em centavos:</strong> Operacoes monetarias calculadas com inteiros em centavos para evitar erros de ponto flutuante inerentes ao padrao IEEE 754.
              </li>
              <li>
                <strong>Simulacao salva nunca armazenada como resultado estatico:</strong> O banco armazena estritamente os parametros de entrada. Toda consulta ou historico e sempre recalculado a partir dos parametros originais, utilizando as mesmas funcoes puras e exaustivamente testadas que a tela ao vivo usa.
              </li>
            </ul>
          </div>
        </section>

        {/* c) Funcionalidades */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Funcionalidades
            </h2>
            <p className="text-sm text-[var(--ds-text-secondary)] mt-1">
              Recursos construidos para analise e planejamento financeiro confiavel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-base">
                Simulador de juros compostos
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Calculo de rendimento com aporte mensal e aportes regulares, acompanhado de grafico de evolucao patrimonial discriminando o valor investido dos juros acumulados.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-base">
                Comparador de investimentos
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Comparativo direto entre CDB, Tesouro Selic e Poupanca, considerando aliquotas reais de IR regressivo e taxa de custodia da B3.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-base">
                Cotacao em tempo real
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Acompanhamento de acoes via Brapi e cambio via Alpha Vantage, protegidos por rate limiting em duas camadas para otimizar consumo e estabilidade.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-base">
                Conta de usuario
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Area autenticada para salvar simulacoes preferidas e consultar o historico completo com recalculo ao vivo e deterministico.
              </p>
            </div>
          </div>
        </section>

        {/* d) Stack tecnica */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Stack tecnica
            </h2>
            <p className="text-sm text-[var(--ds-text-secondary)] mt-1">
              Tecnologias selecionadas com foco em tipagem estrita, performance e simplicidade operacional.
            </p>
          </div>

          <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-2xl p-6 divide-y divide-[var(--ds-border-subtle)]">
            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Frontend
              </span>
              <span className="text-sm sm:text-base text-[var(--ds-text-primary)] font-medium">
                Next.js 15 (App Router), TypeScript, Tailwind v4, Recharts, TanStack Query
              </span>
            </div>

            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Dados
              </span>
              <span className="text-sm sm:text-base text-[var(--ds-text-primary)] font-medium">
                Drizzle ORM, Neon (Postgres serverless)
              </span>
            </div>

            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Autenticacao
              </span>
              <span className="text-sm sm:text-base text-[var(--ds-text-primary)] font-medium">
                Better Auth
              </span>
            </div>

            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Infraestrutura
              </span>
              <span className="text-sm sm:text-base text-[var(--ds-text-primary)] font-medium">
                Upstash Redis (rate limiting), Vercel
              </span>
            </div>

            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold font-[family-name:var(--ds-font-mono)] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Testes
              </span>
              <span className="text-sm sm:text-base text-[var(--ds-text-primary)] font-medium">
                Vitest
              </span>
            </div>
          </div>
        </section>

        {/* e) Decisoes tecnicas */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Decisoes tecnicas
            </h2>
            <p className="text-sm text-[var(--ds-text-secondary)] mt-1">
              O porque por tras de cada escolha arquitetural no desenvolvimento da plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-sm sm:text-base">
                Rate limiting em duas camadas
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Combina limitacao global por rota com limitacao individual por IP, protegendo cotas de APIs externas gratuitas e prevenindo abusos sem degradar a experiencia de usuarios legitimos.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-sm sm:text-base">
                Autenticacao em duas camadas
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Utiliza middleware no Edge para redirecionamentos rapidos de rotas protegidas e validacao real da sessao diretamente nos endpoints de API, garantindo seguranca mesmo se o middleware for burlado.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-sm sm:text-base">
                Validacao de formulario em duas camadas
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Aplica teto individual por campo de entrada e teto sobre o resultado calculado, mitigando riscos de estouro numerico decorrentes do crescimento exponencial caracteristico dos juros compostos.
              </p>
            </div>

            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-[var(--ds-text-primary)] text-sm sm:text-base">
                Simulacoes salvas guardam so os parametros
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ds-text-secondary)] leading-relaxed">
                Nunca persistimos o resultado final no banco de dados para evitar duplicacao de logica de calculo e garantir que qualquer evolucao nos algoritmos se aplique automaticamente a todo o historico.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodape simples */}
      <footer className="w-full border-t border-[var(--ds-border-subtle)] mt-12 py-6 text-center text-xs text-[var(--ds-text-secondary)]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Escalate &copy; Todos os direitos reservados.</span>
          <Link
            href="/"
            className="hover:text-[var(--ds-text-primary)] transition-colors"
          >
            Voltar para o terminal &rarr;
          </Link>
        </div>
      </footer>
    </div>
  );
}
