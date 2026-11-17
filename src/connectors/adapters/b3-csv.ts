import { z } from "zod";
import { AccountConnector, NormalizedPositionDTO, ProductClass } from "../types";

export const B3RowSchema = z.object({
  instituicao: z.string().min(1, "Instituição é obrigatória"),
  codigoNegociacao: z.string().min(1, "Código de negociação é obrigatório").max(20),
  tipoAtivo: z.string().min(1, "Tipo de ativo é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser estritamente positiva"),
  precoMedio: z.number().nonnegative("Preço médio não pode ser negativo"),
  valorAtualizado: z.number().nonnegative("Valor atualizado não pode ser negativo"),
  vencimento: z.string().nullable().optional(),
});

export type B3Row = z.infer<typeof B3RowSchema>;

export class B3CsvValidationError extends Error {
  constructor(message: string, public readonly rowNumber: number, public readonly details?: unknown) {
    super(`Erro de validação no CSV da B3 (linha ${rowNumber}): ${message}`);
    this.name = "B3CsvValidationError";
  }
}

export class B3CsvAdapter implements AccountConnector {
  private parseBrazilianNumber(value: string): number {
    const sanitized = value.trim().replace(/\s/g, "");
    if (!sanitized) return 0;
    // Handle both 1.250,50 and 1250.50
    const dotIndex = sanitized.lastIndexOf(".");
    const commaIndex = sanitized.lastIndexOf(",");
    if (commaIndex > dotIndex) {
      // Brazilian format: 1.250,50 -> 1250.50
      const standard = sanitized.replace(/\./g, "").replace(",", ".");
      return Number.parseFloat(standard);
    }
    // Standard format: 1,250.50 -> 1250.50
    const standard = sanitized.replace(/,/g, "");
    return Number.parseFloat(standard);
  }

  private inferProductClass(ticker: string, tipoAtivo: string): ProductClass {
    const t = ticker.toUpperCase();
    const tipo = tipoAtivo.toLowerCase();

    if (tipo.includes("tesouro")) return "tesouro_direto";
    if (tipo.includes("cdb") || tipo.includes("lci") || tipo.includes("lca") || tipo.includes("debenture")) return "renda_fixa";
    if (tipo.includes("coe")) return "coe";
    if (t === "BOVA11" || t === "SMAL11" || t === "IVVB11" || t === "HASH11" || tipo.includes("etf")) return "etfs";
    if (t.endsWith("11") || tipo.includes("fii") || tipo.includes("fundo")) return "fundos";
    if (t.endsWith("3") || t.endsWith("4") || t.endsWith("5") || t.endsWith("6") || t.endsWith("34") || tipo.includes("ação") || tipo.includes("acao")) return "bolsa";

    return "bolsa";
  }

  async syncPositions(_userId: string, credentialsOrData: unknown): Promise<NormalizedPositionDTO[]> {
    let csvText = "";
    let defaultInstitutionId = "B3_CUSTODY";

    if (typeof credentialsOrData === "string") {
      csvText = credentialsOrData;
    } else if (credentialsOrData && typeof credentialsOrData === "object") {
      const payload = credentialsOrData as { csvContent?: string; defaultInstitutionId?: string };
      csvText = payload.csvContent ?? "";
      if (payload.defaultInstitutionId) {
        defaultInstitutionId = payload.defaultInstitutionId;
      }
    }

    if (!csvText.trim()) {
      return [];
    }

    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      // Only headers or empty
      return [];
    }

    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") ? ";" : ",";
    const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

    const getColIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const instIdx = getColIndex(["instituicao", "instituição", "corretora"]);
    const codeIdx = getColIndex(["codigo", "código", "codigonegociacao", "código negociação", "ticker"]);
    const tipoIdx = getColIndex(["tipo", "tipoativo", "tipo de ativo", "classe"]);
    const qtdIdx = getColIndex(["quantidade", "qtd", "posicao", "posição"]);
    const precoMedioIdx = getColIndex(["precomedio", "preço médio", "preco_medio", "preço"]);
    const valorAtualIdx = getColIndex(["valoratualizado", "valor atualizado", "valor_atualizado", "valortotal", "total"]);
    const vencIdx = getColIndex(["vencimento", "data_vencimento", "maturity"]);

    if (codeIdx === -1 || qtdIdx === -1 || valorAtualIdx === -1) {
      throw new B3CsvValidationError("Colunas obrigatórias não encontradas no cabeçalho (esperado Código, Quantidade, Valor Atualizado)", 1);
    }

    const parsedPositions: NormalizedPositionDTO[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));

      const instituicao = instIdx !== -1 && cols[instIdx] ? cols[instIdx] : defaultInstitutionId;
      const codigoNegociacao = cols[codeIdx] || "";
      const tipoAtivo = tipoIdx !== -1 && cols[tipoIdx] ? cols[tipoIdx] : "Ação";
      const quantidade = qtdIdx !== -1 && cols[qtdIdx] ? this.parseBrazilianNumber(cols[qtdIdx]) : NaN;
      const precoMedio = precoMedioIdx !== -1 && cols[precoMedioIdx] ? this.parseBrazilianNumber(cols[precoMedioIdx]) : 0;
      const valorAtualizado = cols[valorAtualIdx] ? this.parseBrazilianNumber(cols[valorAtualIdx]) : NaN;
      const vencimento = vencIdx !== -1 && cols[vencIdx] ? cols[vencIdx] : null;

      const validationResult = B3RowSchema.safeParse({
        instituicao,
        codigoNegociacao,
        tipoAtivo,
        quantidade,
        precoMedio,
        valorAtualizado,
        vencimento,
      });

      if (!validationResult.success) {
        throw new B3CsvValidationError(
          validationResult.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join(", "),
          i + 1,
          validationResult.error
        );
      }

      const row = validationResult.data;
      const productClass = this.inferProductClass(row.codigoNegociacao, row.tipoAtivo);
      const investedCents = BigInt(Math.round(row.quantidade * row.precoMedio * 100));
      const currentGrossCents = BigInt(Math.round(row.valorAtualizado * 100));

      parsedPositions.push({
        institutionId: row.instituicao,
        productClass,
        tickerOrCode: row.codigoNegociacao.toUpperCase(),
        assetName: `${row.codigoNegociacao.toUpperCase()} (${row.tipoAtivo})`,
        currency: "BRL",
        investedCents,
        currentGrossCents,
        currentNetCents: currentGrossCents,
        annualRateBps: 0,
        indexer: productClass === "bolsa" || productClass === "etfs" ? "IBOV" : "CDI",
        liquidityTier: "D_1_TO_5",
        liquidityDays: 2,
        fgcCovered: false,
        maturityDate: row.vencimento || null,
        metadataParameters: { quantity: row.quantidade, averagePrice: row.precoMedio },
      });
    }

    return parsedPositions;
  }
}
