import {
  CrossChainApi,
  getContractState,
} from 'midnight-crosschain';
import { AppConfig } from '../types.js';
import { WalletService } from './WalletService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ContractService');

/**
 * 合约实例管理服务
 * 负责初始化合约、加入合约、提供合约API
 */
export class ContractService {
  private api: CrossChainApi | null = null;
  private contractAddress: string | null = null;
  private config: AppConfig;
  private walletService: WalletService;
  private initialized = false;

  constructor(config: AppConfig, walletService: WalletService) {
    this.config = config;
    this.walletService = walletService;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isWalletReady(): boolean {
    return this.walletService.isInitialized;
  }

  /**
   * 初始化合约API并加入合约
   */
  async initialize(): Promise<void> {
    const walletSdk = this.walletService.getWalletSdk();

    this.api = new CrossChainApi();
    logger.info('Initializing CrossChainApi...');

    await this.api.init(this.config, walletSdk);
    logger.info('CrossChainApi initialized');

    // 加入合约
    if (this.config.contractAddress) {
      logger.info('Joining contract', { contractAddress: this.config.contractAddress });
      await this.api.join(this.config.contractAddress);
      this.contractAddress = this.config.contractAddress;
      this.initialized = true;
      logger.info('Contract joined successfully');
    } else {
      logger.warn('No contract address configured');
      throw new Error('Contract address not configured');
    }
  }

  /**
   * 获取CrossChainApi实例
   */
  getApi(): CrossChainApi {
    if (!this.api) {
      throw new Error('Contract service not initialized');
    }
    return this.api;
  }

  /**
   * 获取合约地址
   */
  getContractAddress(): string | null {
    return this.contractAddress;
  }

  /**
   * 获取Ledger状态
   */
  async getLedgerState(): Promise<any> {
    if (!this.api) {
      throw new Error('Contract not initialized');
    }
    return await this.api.getLedgerState();
  }

  /**
   * 获取合约状态（含余额）
   */
  async getContractState(): Promise<any> {
    if (!this.contractAddress) {
      throw new Error('Contract not initialized');
    }
    return await getContractState(this.config, this.contractAddress);
  }
}
