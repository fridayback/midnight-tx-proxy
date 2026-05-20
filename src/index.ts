import express from 'express';
import cors from 'cors';
import { EnvSeedProvider, KeystoreSeedProvider, DustConcurrencyProvider } from './providers/index.js';
import { WalletService } from './services/WalletService.js';
import { ContractService } from './services/ContractService.js';
import { TxService } from './services/TxService.js';
import { ConcurrencyLimiter } from './middleware/ConcurrencyLimiter.js';
import { createHealthRouter } from './routes/health.js';
import { createTxRouter } from './routes/tx.js';
import { createLogRouter } from './routes/log.js';
import { loggerManager, getLogger } from './utils/logger.js';
import { ConfigManager, getConfig } from './utils/app-config.js';
import * as fs from 'fs';

const startTime = Date.now();
const logger = getLogger('Main');

async function main(): Promise<void> {
  // 通过全局 ConfigManager 同步加载配置（config.json + 环境变量）
  const config = getConfig();

  // 初始化日志管理器
  // loggerManager.init(config.log);
  logger.info('Starting midnight-tx-proxy service...');
  logger.info('Config loaded', { networkId: config.networkId, serverPort: config.serverPort, contractAddress: config.contractAddress, requestTimeout: config.requestTimeout, logLevel: logger.level });

  // 解析命令行参数：--keystore <path> --keystore-password <password>
  const args = process.argv.slice(2);
  let keystorePath: string | undefined;
  let keystorePassword: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keystore' && i + 1 < args.length) {
      keystorePath = args[++i];
    }
    if (args[i] === '--keystore-password' && i + 1 < args.length) {
      keystorePassword = args[++i];
    }
  }

  // 确定 keystore 路径：命令行参数优先，其次环境变量
  const effectiveKeystorePath = keystorePath || process.env.KEYSTORE_PATH;

  // 根据是否提供 keystore 路径选择 seed provider
  const seedProvider = effectiveKeystorePath
    ? new KeystoreSeedProvider(effectiveKeystorePath, keystorePassword)
    : new EnvSeedProvider();
  logger.info(`Using seed provider: ${effectiveKeystorePath ? 'KeystoreSeedProvider' : 'EnvSeedProvider'}`);

  // 创建钱包服务
  const walletService = new WalletService(config, seedProvider);
  // await walletService.initialize();
  // logger.info('Wallet service initialized');

  // 获取wallet SDK并创建并发度provider
  // const walletSdk = walletService.getWalletSdk();
  const concurrencyProvider = new DustConcurrencyProvider(walletService);

  // 初始化并发度
  const initialConcurrency = 0;//await concurrencyProvider.getMaxConcurrency();
  const concurrencyLimiter = new ConcurrencyLimiter(concurrencyProvider, initialConcurrency, config.requestTimeout);
  logger.info(`Concurrency limiter initialized with max ${initialConcurrency}`);

  // 创建合约服务
  const contractService = new ContractService(config, walletService);

  // 创建交易服务
  const txService = new TxService(contractService, concurrencyLimiter);
  logger.info('Tx service initialized');

  // 创建Express应用
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());

  // 注册路由
  app.use(createHealthRouter(walletService, contractService, txService, startTime));
  app.use(createTxRouter(txService));
  app.use(createLogRouter());

  // 从package.json获取版本号
  const ver = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

  // 启动服务
  const port = config.serverPort;
  app.listen(port, () => {
    logger.info(`
====================================================
  Midnight Tx Proxy Service Started [${ver}]
  Port: ${port}
  Network: ${config.networkId}
  Contract: ${config.contractAddress || 'Not configured'}
  Max Concurrency: ${initialConcurrency}
  Request Timeout: ${config.requestTimeout}ms
  Log Level: ${loggerManager.getLevel()}
  Log Path: ${config.log.path}
====================================================
    `);
  });

  await walletService.initialize();
  logger.info('Wallet service initialized');

  await contractService.initialize();
  logger.info('Contract service initialized');
}

main().catch((error) => {
  logger.error('Failed to start service', { error: String(error) });
  process.exit(1);
});
