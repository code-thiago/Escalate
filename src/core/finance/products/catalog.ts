import type { ProductClass } from "@/src/connectors/types";
import {
  analyzeBolsa,
  analyzeCambio,
  analyzeCoe,
  analyzeCripto,
  analyzeEtfs,
  analyzeFundos,
  analyzeRendaFixa,
  analyzeTesouroDireto,
  type StandardProductAnalysisResult,
} from "./index";

export interface ProductCategoryMeta {
  slug: string;
  productClass: ProductClass;
  title: string;
  shortTitle: string;
  subtitle: string;
  defaultProductName: string;
  defaultInvestedCents: bigint;
  defaultAnnualRateBps: number;
  defaultHoldingDays: number;
  defaultFeeBps: number;
  systemDesignFocus: string;
}

export const PRODUCT_CATEGORIES_CATALOG: ProductCategoryMeta[] = [
  {
    slug: "tesouro-direto",
    productClass: "tesouro_direto",
    title: "Tesouro Direto — Titulos Publicos Federais",
    shortTitle: "Tesouro Direto",
    subtitle: "Tesouro Selic, Tesouro IPCA+, Prefixado e Renda+",
    defaultProductName: "Tesouro IPCA+ 2035 Soberano",
    defaultInvestedCents: 12000000n,
    defaultAnnualRateBps: 1125,
    defaultHoldingDays: 1095,
    defaultFeeBps: 20,
    systemDesignFocus:
      "Risco soberano livre de default domestico, taxa de custodia B3 (0,20% a.a. com isencao ate R$ 10k no Selic) e sensibilidade de Marcacao a Mercado.",
  },
  {
    slug: "renda-fixa",
    productClass: "renda_fixa",
    title: "Renda Fixa Bancaria & Credito Privado",
    shortTitle: "Renda Fixa",
    subtitle: "CDB, LCI, LCA, CRI, CRA e Debentures Incentivadas",
    defaultProductName: "CDB Liquidez Diaria 110% CDI",
    defaultInvestedCents: 15000000n,
    defaultAnnualRateBps: 1450,
    defaultHoldingDays: 730,
    defaultFeeBps: 0,
    systemDesignFocus:
      "Equivalencia tributaria (Isento vs Tributado), tabela regressiva IR/IOF e teto FGC R$ 250k por conglomerado.",
  },
  {
    slug: "previdencia",
    productClass: "fundos",
    title: "Previdencia Privada (PGBL & VGBL)",
    shortTitle: "Previdencia",
    subtitle: "Beneficio Fiscal PGBL (12% Renda Bruta) e Tabela Regressiva Definitiva 10%",
    defaultProductName: "Previdencia VGBL Soberano Regressivo",
    defaultInvestedCents: 12000000n,
    defaultAnnualRateBps: 1280,
    defaultHoldingDays: 1825,
    defaultFeeBps: 90,
    systemDesignFocus:
      "Otimizacao tributaria PGBL vs VGBL, aliquota regressiva ate 10% apos 10 anos, ausencia de come-cotas e portabilidade sem IR.",
  },
  {
    slug: "bolsa-br",
    productClass: "bolsa",
    title: "Bolsa de Valores B3 (Acoes & FIIs)",
    shortTitle: "Bolsa B3",
    subtitle: "Acoes ON/PN, Units e Fundos Imobiliarios na B3",
    defaultProductName: "Carteira Acoes B3 Swing Trade (WEGE3 / ITUB4)",
    defaultInvestedCents: 8000000n,
    defaultAnnualRateBps: 1650,
    defaultHoldingDays: 730,
    defaultFeeBps: 3,
    systemDesignFocus:
      "Limite de isencao mensal de R$ 20.000 em alienacoes Swing Trade (15%) vs Day Trade (20%), emolumentos B3 e IRRF dedo-duro.",
  },
  {
    slug: "bolsa-global",
    productClass: "bolsa",
    title: "Global Equities (NYSE / NASDAQ & BDRs)",
    shortTitle: "Bolsa Global",
    subtitle: "Stocks Americanas, ADRs e BDRs Patrocinados",
    defaultProductName: "Portfolio Tech US (NVDA / MSFT) via Avenue/IBKR",
    defaultInvestedCents: 9500000n,
    defaultAnnualRateBps: 1850,
    defaultHoldingDays: 1095,
    defaultFeeBps: 15,
    systemDesignFocus:
      "Tributacao anual unificada de 15% sobre ganho de capital offshore (Lei 14.754), retencao de 30% sobre dividendos nos EUA e spread cambial.",
  },
  {
    slug: "ofertas-publicas",
    productClass: "bolsa",
    title: "Ofertas Publicas (IPOs & Follow-ons CVM 160)",
    shortTitle: "IPOs & Follow-on",
    subtitle: "Emissoes Primarias, Secundarias e Bookbuilding Institucional",
    defaultProductName: "Alocacao Institucional IPO / Follow-on B3",
    defaultInvestedCents: 5000000n,
    defaultAnnualRateBps: 1420,
    defaultHoldingDays: 365,
    defaultFeeBps: 50,
    systemDesignFocus:
      "Assimetria de informacao no prospecto preliminar, periodo de lock-up contratual, rateio institucional vs varejo e tributacao de ganho de capital.",
  },
  {
    slug: "fundos",
    productClass: "fundos",
    title: "Fundos de Investimentos (CVM 175)",
    shortTitle: "Fundos CVM",
    subtitle: "Renda Fixa, Multimercados, Acoes e Fundos Imobiliarios",
    defaultProductName: "Fundo Multimercado Macro 2.0% + 20% Perf",
    defaultInvestedCents: 10000000n,
    defaultAnnualRateBps: 1380,
    defaultHoldingDays: 1095,
    defaultFeeBps: 200,
    systemDesignFocus:
      "Erosao composta do come-cotas semestral (Maio/Novembro), taxa de administracao + performance e ausencia de FGC.",
  },
  {
    slug: "etfs",
    productClass: "etfs",
    title: "ETFs — Exchange-Traded Funds",
    shortTitle: "ETFs",
    subtitle: "ETFs de Indice Acoes (BOVA11, IVVB11) e Renda Fixa",
    defaultProductName: "IVVB11 iShares S&P 500 ETF",
    defaultInvestedCents: 10000000n,
    defaultAnnualRateBps: 1520,
    defaultHoldingDays: 730,
    defaultFeeBps: 23,
    systemDesignFocus:
      "Vantagem estrutural da ausencia de come-cotas vs ausencia de isencao mensal de R$ 20.000 e analise de tracking error.",
  },
  {
    slug: "coe",
    productClass: "coe",
    title: "COE — Certificado de Operacoes Estruturadas",
    shortTitle: "COE",
    subtitle: "Capital Protegido Nominal vs Capital em Risco",
    defaultProductName: "COE Tech Global Capital Protegido 3 Anos",
    defaultInvestedCents: 10000000n,
    defaultAnnualRateBps: 1020,
    defaultHoldingDays: 1095,
    defaultFeeBps: 400,
    systemDesignFocus:
      "Decomposicao do spread bancario embutido na estrutura derivativa, perda inflacionaria do Capital Protegido e ausencia de FGC.",
  },
  {
    slug: "cripto",
    productClass: "cripto",
    title: "Criptoativos & Ativos Digitais",
    shortTitle: "Cripto",
    subtitle: "Bitcoin (BTC), Ethereum (ETH) & Stablecoins",
    defaultProductName: "Bitcoin (BTC) Hardware Wallet Self-Custody",
    defaultInvestedCents: 5000000n,
    defaultAnnualRateBps: 2200,
    defaultHoldingDays: 730,
    defaultFeeBps: 50,
    systemDesignFocus:
      "Isencao mensal ate R$ 35.000 em alienacoes nacionais, tabela progressiva de ganho de capital (15% a 22,5%) e risco de custodia.",
  },
  {
    slug: "ouro",
    productClass: "etfs",
    title: "Ouro Spot & Metais Preciosos (OZ1D / GOLD11 / IAU)",
    shortTitle: "Ouro (Gold)",
    subtitle: "Contratos Spot B3, ETFs Lastreados em Ouro Fisico e Hedge Inflacionario",
    defaultProductName: "GOLD11 / Spot Ouro B3 Hedge Soberano",
    defaultInvestedCents: 4500000n,
    defaultAnnualRateBps: 1500,
    defaultHoldingDays: 730,
    defaultFeeBps: 30,
    systemDesignFocus:
      "Descorrelacao estrutural em crises geopoliticas, tributacao de 15% sobre ganho de capital sem come-cotas e custo de custodia.",
  },
  {
    slug: "cambio",
    productClass: "cambio",
    title: "Cambio & Remessas Internacionais",
    shortTitle: "Cambio",
    subtitle: "Dolar Comercial (PTAX), Remessa Investimento e Papel Moeda",
    defaultProductName: "Remessa USD Conta Investimento Exterior",
    defaultInvestedCents: 6000000n,
    defaultAnnualRateBps: 1150,
    defaultHoldingDays: 365,
    defaultFeeBps: 120,
    systemDesignFocus:
      "Decomposicao do Valor Efetivo Total (VET): Spread comercial sobre a PTAX do Banco Central + IOF cambial por modalidade.",
  },
];

export function getProductCategoryBySlug(
  slug: string,
): ProductCategoryMeta | undefined {
  const normalizedSlug = slug === "bolsa" ? "bolsa-br" : slug;
  return PRODUCT_CATEGORIES_CATALOG.find((c) => c.slug === normalizedSlug);
}

export function runCatalogProductAnalysis(
  meta: ProductCategoryMeta,
  overrides?: {
    investedCents?: bigint;
    annualRateBps?: number;
    holdingDays?: number;
    feeBps?: number;
    isExemptTax?: boolean;
  },
): StandardProductAnalysisResult {
  const investedCents = overrides?.investedCents ?? meta.defaultInvestedCents;
  const annualRateBps = overrides?.annualRateBps ?? meta.defaultAnnualRateBps;
  const holdingDays = overrides?.holdingDays ?? meta.defaultHoldingDays;
  const feeBps = overrides?.feeBps ?? meta.defaultFeeBps;
  const isExemptTax = overrides?.isExemptTax ?? false;

  switch (meta.productClass) {
    case "renda_fixa":
      return analyzeRendaFixa({
        productName: meta.defaultProductName,
        subType: isExemptTax ? "LCI" : "CDB",
        investedCents,
        annualRateBps,
        holdingDays,
        isExemptTax,
        brokerFeeBps: feeBps,
      });
    case "fundos":
      return analyzeFundos({
        productName: meta.defaultProductName,
        subType: "MULTIMERCADO",
        investedCents,
        grossAnnualReturnBps: annualRateBps,
        managementFeeBps: feeBps,
        holdingDays,
      });
    case "bolsa":
      return analyzeBolsa({
        productName: meta.defaultProductName,
        investedCents,
        capitalGainCents: (investedCents * BigInt(Math.max(0, annualRateBps))) / 10000n,
        monthlySalesCents: investedCents,
        holdingDays,
        b3FeeBps: feeBps,
      });
    case "coe":
      return analyzeCoe({
        productName: meta.defaultProductName,
        investedCents,
        expectedNominalReturnBps: annualRateBps,
        embeddedSpreadBps: feeBps,
        holdingDays,
      });
    case "cripto":
      return analyzeCripto({
        productName: meta.defaultProductName,
        investedCents,
        capitalGainCents: (investedCents * BigInt(Math.max(0, annualRateBps))) / 10000n,
        monthlySalesCents: investedCents,
        holdingDays,
        exchangeFeeBps: feeBps,
      });
    case "tesouro_direto":
      return analyzeTesouroDireto({
        productName: meta.defaultProductName,
        subType: "TESOURO_IPCA",
        investedCents,
        annualRateBps,
        holdingDays,
      });
    case "cambio":
      return analyzeCambio({
        productName: meta.defaultProductName,
        investedCents,
        ptaxRateCents: 580n,
        spreadBps: feeBps,
        expectedCurrencyAppreciationBps: annualRateBps,
        holdingDays,
      });
    case "etfs":
      return analyzeEtfs({
        productName: meta.defaultProductName,
        investedCents,
        grossAnnualReturnBps: annualRateBps,
        expenseRatioBps: feeBps,
        holdingDays,
      });
  }
}
