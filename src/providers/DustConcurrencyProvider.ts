import { IConcurrencyProvider } from '../interfaces/IConcurrencyProvider.js';
import { MidnightWalletSDK } from 'midnight-crosschain';
import {WalletService} from '../services/WalletService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('DustConcurrency');

/**
 * 基于DUST availableCoins个数的并发度实现
 * 使用钱包的DUST可用硬币数量作为最大并发度
 */
export class DustConcurrencyProvider implements IConcurrencyProvider {
  private walletService: WalletService;

  constructor(walletService: WalletService) {
    this.walletService = walletService;
  }

  async getMaxConcurrency(): Promise<number> {
    try {
      const availableCoins = await this.walletService.getWalletSdk().getAvailableCoins();
      const dustCount = availableCoins.dustAvailableCoins.length;
      logger.debug('Dust available coins count', { dustCount });
      return dustCount;
    } catch (error) {
      logger.error('Failed to get dust available coins for concurrency', { error: String(error) });
      return 0;
    }
  }
}
