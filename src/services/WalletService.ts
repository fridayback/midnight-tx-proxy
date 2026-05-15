import { MidnightWalletSDK, configuration, initNetwork,setLogger } from 'midnight-crosschain';
import { AppConfig } from '../types.js';
import { ISeedProvider } from '../interfaces/ISeedProvider.js';
import * as fs from 'fs/promises';
import { getLogger } from '../utils/logger.js';
import path from 'path';

const logger = getLogger('WalletService');

/**
 * 钱包管理服务
 * 负责钱包的创建、初始化和状态管理
 */
export class WalletService {
  private walletSdk: MidnightWalletSDK | null = null;
  private config: AppConfig;
  private seedProvider: ISeedProvider;
  private networkInitialized = false;

  constructor(config: AppConfig, seedProvider: ISeedProvider) {
    this.config = config;
    this.seedProvider = seedProvider;
  }

  get isInitialized(): boolean {
    return this.walletSdk !== null;
  }

  get walletForceInitTime(): number {
    return this.walletSdk?.walletForceReInitTime ?? 0;
  }

   setWalletForceInitTime(time: number) {
    if (this.walletSdk) {
      this.walletSdk.setForceReInitTime(time);
    }
  }

  private snapshotfile(name:string): string {
    const snapshotDir = this.config.wallet?.walletSnapshotPath || './wallet-snapshots';
    const snapshotName = this.config.wallet?.walletSnapshotName || name+'.json';
    return path.join(snapshotDir, snapshotName);
  }

  /**
   * 初始化网络并构建钱包
   */
  async initialize(): Promise<void> {
    setLogger(logger as any); // 将自定义logger传递给midnight-crosschain使用
    // 初始化网络
    if (!this.networkInitialized) {
      logger.info('Initializing network', { networkId: this.config.networkId });
      initNetwork(this.config.networkId as any);
      this.networkInitialized = true;
    }

    const seed = this.seedProvider.getSeed();
    logger.info('Building Wallet ...');

    const appConfig = configuration(
      this.config.indexer,
      this.config.indexerWS,
      this.config.proofServer,
      this.config.node,
      this.config.networkId as any
    );

    this.walletSdk = new MidnightWalletSDK(appConfig, seed,120*1000,300*1000);

    const snapshotfile = this.snapshotfile(this.walletSdk.getAccountAddress().unshieldedAddress);
    // 如果路径不存在，创建路径
    await fs.mkdir(path.dirname(snapshotfile), { recursive: true });
    const serializedState = await this.readWalletState(snapshotfile);
    logger.info('Initializing wallet SDK...');
    await this.walletSdk.initWallet(
      (state) => this.storeWalletState(state, snapshotfile),
      serializedState,
      (this.config.wallet?.snapshotIntervalSec ?? 60)*1000
    );

    const address = this.walletSdk.getAccountAddress();
    logger.info('Wallet built completely', { shieldedAddress: address.shieldedAddress });
    
    const balances = await this.walletSdk.getBalances();
    logger.info('Wallet balance retrieved', { dustBalance: balances.dustBalance?.toString() });

    await this.walletSdk.registerNightUtxosForDustGeneration();
    logger.info('Night UTXOs registered for dust generation');
  }

  /**
   * 获取钱包SDK实例
   */
  getWalletSdk(): MidnightWalletSDK {
    if (!this.walletSdk) {
      throw new Error('Wallet not initialized');
    }
    return this.walletSdk;
  }

  /**
   * 获取钱包地址信息
   */
  getWalletAddress() {
    if (!this.walletSdk) {
      throw new Error('Wallet not initialized');
    }
    return this.walletSdk.getAccountAddress();
  }

  /**
   * 获取钱包余额
   */
  async getBalances() {
    if (!this.walletSdk) {
      throw new Error('Wallet not initialized');
    }
    return await this.walletSdk.getBalances();
  }

  private async storeWalletState(state: any, snapshotFile: string): Promise<void> {
    try {
      // const filePath = `./serialized-state-${this.config.networkId}-${snapshotFile.substring(0, 8)}`;
      await fs.writeFile(snapshotFile, JSON.stringify(state), 'ascii');
    } catch (error) {
      logger.error('Error storing wallet state', { error: String(error) });
    }
  }

  private async readWalletState(snapshotFile: string): Promise<any> {
    try {
      // const filePath = `./serialized-state-${this.config.networkId}-${snapshotFile.substring(0, 8)}`;
      return JSON.parse(await fs.readFile(snapshotFile, 'ascii'));
    } catch (error) {
      logger.warn('No previous wallet state found, starting fresh', { error: String(error) });
      return undefined;
    }
  }
}
