# Escalate - Diretrizes de Identidade Visual e Uso da Marca

> Guia oficial de aplicacao do logotipo, design tokens e ativos visuais da marca Escalate.

---

## 1. O Logotipo e Conceito
- **Conceito Central:** "Ascensao Aritmetica e Escalonamento Patrimonial". O simbolo e formado por um glifo arquitetural da letra 'E', estruturado em tres tiers horizontais em progressao aritmetica (expansao de exatamente 28px por nivel com espacamentos de 28px). Representa os tres estagios da acumulacao de riqueza: capital inicial ancorado, aportes periodicos e a aceleracao exponencial dos juros compostos.
- **Versoes da Marca:**
  - **Simbolo Isolado (`escalate-symbol.svg`):** Uso em favicons, app icons, avatares e marcadores compactos.
  - **Lockup Horizontal (`escalate-lockup.svg`):** Versao primaria para cabecalhos de navegacao, barras de status e apresentacoes.
  - **Lockup Dark (`escalate-lockup-dark.svg`):** Versao otimizada para temas escuros com tipografia em tom `#F4F4F5`.
  - **Monocromatico Branco (`escalate-lockup-white.svg`):** Aplicacao sobre fundos escuros e midia rica.
  - **Monocromatico Preto (`escalate-lockup-black.svg`):** Aplicacao para impressao preto e branco e carimbos.

---

## 2. Area de Respiro (Clear Space)
- A margem minima de protecao em torno do logotipo e de **1X**, onde **X = 40px** (equivalente a espessura da barra horizontal do simbolo).
- Nenhum elemento grafico, texto ou borda deve invadir essa zona de isolamento.

---

## 3. Tamanhos Minimos de Aplicacao
| Versao | Digital | Impresso |
| :--- | :--- | :--- |
| Lockup Horizontal | 120px de largura | 35mm de largura |
| Simbolo Isolado | 16px (usar `favicon.svg` ou `favicon-16.png`) | 8mm de largura |

---

## 4. Paleta Cromatica Oficial (Design Tokens)
Os valores de cor derivam diretamente do Design System central do projeto (`src/app/globals.css`):

| Nome do Token | HEX | Uso Recomendado |
| :--- | :--- | :--- |
| **Indigo 600 (Primary Brand)** | `#6366F1` | Simbolo principal, aneis de foco (`--ring`), destaques interativos |
| **Indigo 700 (Deep Foundation)** | `#4338CA` | Base institucional, graficos de juros (`--juros`, `--chart-5`) |
| **Indigo 300 (Soft Accent)** | `#A5B4FC` | Aportes investidos (`--investido`, `--chart-2`) |
| **Surface Dark (Dark Background)** | `#0A0A0A` | Superficie de fundo no tema escuro |
| **Surface Dark Card** | `#18181B` | Paineis e containers escuros |
| **Surface Light (Light Background)** | `#FFFFFF` | Fundo principal da aplicacao |
| **Surface Light Subtle** | `#EEF2FF` | Bordas e inputs (`--border`, `--input`) |
| **Text Primary (Light Mode)** | `#171717` | Tipografia principal do wordmark em tema claro |
| **Text Primary (Dark Mode)** | `#F4F4F5` | Tipografia principal do wordmark em tema escuro |
| **Success Emerald** | `#059669` / `#34D399` | Indicadores de rentabilidade positiva e superavit |

---

## 5. Tipografia da Marca
- **Wordmark Oficial:** Tipografia geometrica proprietaria vetorizada diretamente em curvas matematicas (sem dependencia de fontes de sistema no logo final).
- **Tipografia da Aplicacao:** `Geist Sans`, `Inter` ou stack nativa sem serifa (`sans-serif`).
- **Tipografia de Numeros e Tabelas:** `Geist Mono` ou fonte monoespacada com alinhamento tabular (`font-mono`) para matrizes de centavos e calculos de juros.

---

## 6. Regras de Proibicao (Don'ts)
- Nao distorcer proporcoes (altura x largura).
- Nao alterar as cores dos degraus ou do texto fora dos tokens definidos.
- Nao adicionar sombras projetadas, chanfros 3D ou degradês no simbolo oficial.
- Nao trocar a posicao relativa entre o simbolo e a palavra ESCALATE no lockup oficial.
- Nao substituir a tipografia vetorizada por caixas de texto com fontes genericas.
