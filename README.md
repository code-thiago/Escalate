# Escalate

**Versao:** `1.1.1`

Plataforma quantitativa e terminal financeiro em TypeScript/Next.js para simulacao patrimonial, analise de produtos financeiros, custodia consolidada, motores estocasticos e governanca deterministica de risco e adequacao (CVM).

---

## Visao Geral

O **Escalate** unifica calculos financeiros de alta precisao, modelagem quantitativa e integracao com dados de mercado em um terminal unico (`EscalateTerminalShell`):

- **Motor Financeiro Deterministico (`src/core/finance`)**: Calculo de juros compostos em aritmetica inteira/decimal sem drift de ponto flutuante, comparador de renda fixa (CDB, Tesouro Selic, Poupanca pela Lei 12.703/2012), tabela regressiva de IR, regras de FGC, metas financeiras e catalogo de 10 classes de produtos (Bolsa, Cambio, COE, Cripto, ETFs, Fundos, Renda Fixa, Tesouro Direto).
- **Motor Quantico e Estocastico (`src/core/quant` e `apps/api/src/modules/quant`)**: Otimizacao de carteira (Markowitz / Black-Litterman), projecao via matriz de densidade e quantum walk, alem de modelos GARCH e filtro de Kalman em worker pool isolado.
- **Regras Deterministicas JDM (`src/core/decision`)**: Avaliacao de adequacao e guardrails via `@gorules/zen-engine` (`cvm-suitability-guard`, `goal-allocation-guard`, `portfolio-quantum-health`, `product-critical-analysis`, `token-metering-gate`).
- **Custodia, SINACOR e OCR (`apps/api/src/modules/portfolio`)**: Parser de notas SINACOR/B3, normalizador de extratos via OCR, bridge de custodia-quant e cofre criptografado AES-256-GCM (`envelope-vault.ts`).
- **Cotacoes e Cache Multi-Tenant**: Integracao com Brapi (acoes B3) e Alpha Vantage (cambio) com cache semantico de 6h e rate limiting distribuido via Upstash Redis.
- **Autenticacao e Persistencia**: Better Auth com sessao verificada no servidor e persistencia no Neon Postgres via Drizzle ORM.

---

## Stack Tecnologica

- **Framework**: Next.js 15 (`App Router`, React 19)
- **Linguagem**: TypeScript 5 (`strict`)
- **Estilizacao**: Tailwind CSS v4 + Design Tokens `--ds-*` (`packages/ui-tokens`)
- **Banco de Dados e ORM**: Neon Serverless Postgres + Drizzle ORM
- **Autenticacao**: Better Auth
- **Rate Limiting e Cache**: Upstash Redis (`@upstash/ratelimit`)
- **Regras de Decisao**: GoRules ZEN Engine (`@gorules/zen-engine`)
- **Precisao Numerica e Validacao**: `decimal.js`, `zod`
- **Estado e Graficos**: TanStack Query v5, Recharts
- **Testes e Seguranca**: Vitest, Gitleaks

---

## Estrutura do Monorepo

```text
Escalate/
├── apps/
│   ├── api/                 # Modulos backend (quant, portfolio/SINACOR/OCR, security vault, agent cache, billing) e testes WP-02..WP-05
│   └── web/                 # Componentes especificos da camada web
├── packages/
│   ├── contracts/           # Contratos Zod compartilhados (AssetVector, schemas de custodia e quant)
│   └── ui-tokens/           # Tokens CSS semanticos (--ds-*)
├── src/
│   ├── core/
│   │   ├── finance/         # Juros compostos, comparador, tributacao, FGC, metas e catalogo de produtos
│   │   ├── quant/           # Matriz de densidade e quantum walk
│   │   └── decision/        # Grafos JDM e executor @gorules/zen-engine
│   ├── api/                 # Cliente HTTP interno e hooks TanStack Query
│   ├── connectors/          # Adaptadores de corretoras e fontes externas
│   ├── db/                  # Schema Drizzle ORM e conexao Neon Postgres
│   ├── lib/                 # Better Auth, Upstash Redis, formatadores e utilitarios
│   ├── components/          # EscalateTerminalShell, brand, market, simulacoes
│   └── app/                 # Next.js App Router (paginas e API Route Handlers)
├── tests/                   # Mocks e testes de banco/integracao
└── scripts/                 # Utilitarios de diagnostico e validacao
```

---

## Rotas Principais

### Interface Web (`src/app`)
- `/` — Terminal principal e entrada unificada (`EscalateTerminalShell`)
- `/agent` — Terminal do agente quantitativo e previsoes
- `/investimentos` — Visao geral de investimentos
- `/investimentos/carteira` — Consolidacao e analise de carteira
- `/investimentos/conexoes` — Gestao de conexoes e custodia
- `/investimentos/objetivos` — Planejamento e acompanhamento de metas
- `/produtos` e `/produtos/[categoria]` — Catalogo e analise critica de produtos financeiros
- `/login`, `/registro` — Fluxos de autenticacao (Better Auth)
- `/sobre` — Documentacao tecnica da arquitetura

### API Route Handlers (`src/app/api`)
- `/api/auth/[...all]` — Endpoints Better Auth
- `/api/escalate/custody` — Custodia e auditoria de ativos/COE
- `/api/escalate/quant` — Execucao de endpoints quantitativos
- `/api/escalate/trading-ocr` — Normalizacao OCR de extratos e notas
- `/api/agent/forecast` — Previsoes e motor de agente
- `/api/carteira`, `/api/conexoes`, `/api/simulacoes` — Gestao autenticada de carteira, conexoes e simulacoes
- `/api/cotacoes/acao`, `/api/cotacoes/cambio` — Cotacoes B3 e cambio
- `/api/produtos/analise` — Analise de produtos via motor de decisao

---

## Configuracao Local

### Pre-requisitos
- Node.js 20+
- Conta [Neon](https://neon.tech) (PostgreSQL)
- Conta [Upstash](https://upstash.com) (Redis)
- Token [Brapi](https://brapi.dev) (acoes B3) e chave [Alpha Vantage](https://www.alphavantage.co) (cambio) — opcionais em dev com mocks

### Variaveis de Ambiente
Copie `.env.example` para `.env.local` na raiz e preencha:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
ALPHA_VANTAGE_API_KEY=
BRAPI_TOKEN=
REDIS_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Instalacao e Execucao

```bash
# 1. Instalar dependencias
npm install

# 2. Aplicar schema no Neon Postgres
npx drizzle-kit push

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`.

---

## Scripts Disponiveis

| Comando | Descricao |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Next.js em modo desenvolvimento |
| `npm run dev:local` | Executa pipelines locais via Turborepo |
| `npm run dev:doppler` | Executa via Turborepo com secrets do Doppler |
| `npm run build` | Gera o build de producao Next.js |
| `npm run start` | Inicia o servidor em modo producao |
| `npm run test` | Executa a suite de testes Vitest |
| `npm run typecheck` | Valida tipos TypeScript (`tsc --noEmit`) |
| `npm run lint` | Executa analise estatica ESLint |
| `npm run security:scan` | Executa varredura de segredos com Gitleaks |

---

## Licenca

Todos os direitos reservados ao autor. Consulte o mantenedor para permissoes de uso ou redistribuicao.
