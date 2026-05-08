import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import { AppConfig } from './types.js';
import { EnvSeedProvider, DustConcurrencyProvider } from './providers/index.js';
import { WalletService } from './services/WalletService.js';
import { ContractService } from './services/ContractService.js';
import { TxService } from './services/TxService.js';
import { ConcurrencyLimiter } from './middleware/ConcurrencyLimiter.js';
import { createHealthRouter } from './routes/health.js';
import { createTxRouter } from './routes/tx.js';

const startTime = Date.now();

async function loadConfig(): Promise<AppConfig> {
  const networkId = process.env.NETWORK_ID || 'preprod';
  const configContent = await fs.readFile('./config.json', 'utf-8');
  const configAll = JSON.parse(configContent);
  const config = configAll[networkId];
  if (!config) {
    throw new Error(`Configuration for network '${networkId}' not found in config.json`);
  }
  return {
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    proofServer: config.proofServer,
    networkId: config.networkId || networkId,
    contractAddress: process.env.CONTRACT_ADDRESS || config.contractAddress || '',
    zkConfigPath: config.zkConfigPath || '',
    serverPort: config.serverPort || 3000,
    requestTimeout: config.requestTimeout || 300000,
  };
}

async function main(): Promise<void> {
  console.info('Starting midnight-tx-proxy service...');

  // 加载配置
  const config = await loadConfig();
  console.info('Config loaded:', JSON.stringify({ ...config, contractAddress: config.contractAddress ? '***' : '' }));

  // 创建seed provider（从环境变量获取seed）
  const seedProvider = new EnvSeedProvider();

  // 创建钱包服务
  const walletService = new WalletService(config, seedProvider);
  await walletService.initialize();
  console.info('Wallet service initialized');

  // 获取wallet SDK并创建并发度provider
  const walletSdk = walletService.getWalletSdk();
  const concurrencyProvider = new DustConcurrencyProvider(walletSdk);

  // 初始化并发度
  const initialConcurrency = await concurrencyProvider.getMaxConcurrency();
  const concurrencyLimiter = new ConcurrencyLimiter(concurrencyProvider, initialConcurrency, config.requestTimeout);
  console.info(`Concurrency limiter initialized with max ${initialConcurrency}`);

  // 创建合约服务
  const contractService = new ContractService(config, walletService);
  await contractService.initialize();
  console.info('Contract service initialized');

  // 创建交易服务
  const txService = new TxService(contractService, concurrencyLimiter);
  console.info('Tx service initialized');

  // 创建Express应用
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());

  // 注册路由
  app.use(createHealthRouter(walletService, contractService, txService, startTime));
  app.use(createTxRouter(txService));

  // 启动服务
  const port = config.serverPort;
  app.listen(port, () => {
    console.info(`
====================================================
  Midnight Tx Proxy Service Started
  Port: ${port}
  Network: ${config.networkId}
  Contract: ${config.contractAddress || 'Not configured'}
  Max Concurrency: ${initialConcurrency}
  Request Timeout: ${config.requestTimeout}ms
  Health: http://localhost:${port}/health
  Wallet: http://localhost:${port}/info/wallet
  Balances: http://localhost:${port}/info/balances
  Memory: http://localhost:${port}/info/memory
====================================================
    `);
  });
}

main().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
