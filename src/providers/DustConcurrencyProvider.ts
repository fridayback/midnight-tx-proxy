import { IConcurrencyProvider } from '../interfaces/IConcurrencyProvider.js';
import { MidnightWalletSDK } from 'midnight-crosschain';

/**
 * 基于DUST availableCoins个数的并发度实现
 * 使用钱包的DUST可用硬币数量作为最大并发度
 */
export class DustConcurrencyProvider implements IConcurrencyProvider {
  private walletSdk: MidnightWalletSDK;

  constructor(walletSdk: MidnightWalletSDK) {
    this.walletSdk = walletSdk;
  }

  async getMaxConcurrency(): Promise<number> {
    try {
      const availableCoins = await this.walletSdk.getAvailableCoins();
      const dustCount = availableCoins.dustAvailableCoins.length;
    return dustCount;
    } catch (error) {
      console.error('Failed to get dust available coins for concurrency:', error);
      // 出错时返回0，表示没有可用的并发
      return 0;
    }
  }
}
