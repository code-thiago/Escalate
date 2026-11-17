import { AccountConnector, NormalizedPositionDTO, ProviderType } from "./types";
import { OpenFinanceSandboxAdapter } from "./adapters/open-finance";
import { B3CsvAdapter } from "./adapters/b3-csv";
import { ManualAssetAdapter } from "./adapters/manual";

export * from "./types";
export * from "./adapters/open-finance";
export * from "./adapters/b3-csv";
export * from "./adapters/manual";

export class AccountConnectorProvider {
  private adapters: Map<ProviderType, AccountConnector>;

  constructor(customAdapters?: Partial<Record<ProviderType, AccountConnector>>) {
    this.adapters = new Map();
    this.adapters.set(
      "OPEN_FINANCE_SANDBOX",
      customAdapters?.OPEN_FINANCE_SANDBOX ?? new OpenFinanceSandboxAdapter()
    );
    this.adapters.set("B3_CSV", customAdapters?.B3_CSV ?? new B3CsvAdapter());
    this.adapters.set("MANUAL", customAdapters?.MANUAL ?? new ManualAssetAdapter());
  }

  getAdapter(providerType: ProviderType): AccountConnector {
    const adapter = this.adapters.get(providerType);
    if (!adapter) {
      throw new Error(`Unsupported provider type: ${providerType}`);
    }
    return adapter;
  }

  async sync(
    providerType: ProviderType,
    credentialsOrData: unknown,
    userId: string = "sandbox-user"
  ): Promise<NormalizedPositionDTO[]> {
    const adapter = this.getAdapter(providerType);
    return adapter.syncPositions(userId, credentialsOrData);
  }
}

export const accountConnectorProvider = new AccountConnectorProvider();
