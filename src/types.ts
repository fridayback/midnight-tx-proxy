export interface AppConfig {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkId: string;
  readonly contractAddress: string;
  readonly zkConfigPath: string;
  readonly serverPort: number;
  readonly requestTimeout: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

export interface WalletInfo {
  shieldedAddress: string;
  unshieldedAddress: string;
  dustAddress: string;
  coinPublicKey: string;
}

export interface BalancesInfo {
  dustBalance: string;
  shieldedBlance: unknown;
  unshieldedBlance: unknown;
}

export interface MemoryInfo {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
  arrayBuffers: string;
}

export interface TxResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
