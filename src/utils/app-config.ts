import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from '../types.js';

/**
 * 全局配置管理器（单例模式）
 * - 在模块加载时同步加载 config.json 和所有环境变量配置
 * - 任何模块可通过 getConfig() 或 ConfigManager.getInstance() 获取配置
 * - 配置优先级：环境变量 > config.json 中的网络配置 > 默认值
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config!: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 获取 ConfigManager 单例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取完整的 AppConfig 配置对象
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * 通过 key 获取特定配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * 获取钱包 seed（优先从 CONFIG_SEED 环境变量获取，兼容 SEED）
   */
  getSeed(): string {
    return process.env.CONFIG_SEED || process.env.SEED || '';
  }

  /**
   * 同步加载所有配置（config.json + 环境变量）
   */
  private loadConfig(): AppConfig {
    // 1. 确定网络 ID
    const networkId = process.env.NETWORK_ID || 'preprod';

    // 2. 同步读取 config.json
    const configPath = process.env.CONFIG_PATH || path.resolve('./config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const configAll = JSON.parse(configContent);
    const networkConfig = configAll[networkId];

    if (!networkConfig) {
      throw new Error(
        `Configuration for network '${networkId}' not found in config.json`,
      );
    }

    // 3. 合并配置（环境变量优先于 config.json，config.json 优先于默认值）
    return {
      indexer:
        process.env.INDEXER ||
        networkConfig.indexer,
      indexerWS:
        process.env.INDEXER_WS ||
        networkConfig.indexerWS,
      node:
        process.env.NODE ||
        networkConfig.node,
      proofServer:
        process.env.PROOF_SERVER ||
        networkConfig.proofServer,
      networkId,
      contractAddress:
        process.env.CONTRACT_ADDRESS ||
        networkConfig.contractAddress ||
        '',
      zkConfigPath:
        process.env.ZK_CONFIG_PATH ||
        networkConfig.zkConfigPath ||
        '',
      serverPort:
        parseInt(
          process.env.SERVER_PORT ||
            String(networkConfig.serverPort ?? 3000),
          10,
        ),
      requestTimeout:
        parseInt(
          process.env.REQUEST_TIMEOUT ||
            String(networkConfig.requestTimeout ?? 300000),
          10,
        ),
      log: {
        "uniqueId": process.env.LOG_UNIQUE_ID || networkConfig.log?.uniqueId || 'default',
        path:
          process.env.LOG_PATH ||
          networkConfig.log?.path ||
          './log',
        retentionDays:
          parseInt(
            process.env.LOG_RETENTION_DAYS ||
              String(networkConfig.log?.retentionDays ?? 7),
            10,
          ),
        level:
          process.env.LOG_LEVEL ||
          networkConfig.log?.level ||
          'info',
        logServer: networkConfig.log?.logServer || undefined,
      },
      wallet: {
        snapshotIntervalSec:
          parseInt(
            process.env.WALLET_SNAPSHOT_INTERVAL_SEC ||
              String(networkConfig.wallet?.snapshotIntervalSec ?? 60),
            10,
          ),
        walletSnapshotPath:
          process.env.WALLET_SNAPSHOT_PATH ||
          networkConfig.wallet?.walletSnapshotPath,
        walletSnapshotName:
          process.env.WALLET_SNAPSHOT_NAME ||
          networkConfig.wallet?.walletSnapshotName,
      },
    };
  }
}

/**
 * 便捷函数：获取全局 AppConfig 配置
 * 在任何模块中直接调用即可获得完整的配置对象
 */
export function getConfig(): AppConfig {
  return ConfigManager.getInstance().getConfig();
}
