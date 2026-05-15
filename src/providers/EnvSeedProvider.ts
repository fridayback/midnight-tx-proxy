import { ISeedProvider } from '../interfaces/ISeedProvider.js';
import { ConfigManager } from '../utils/app-config.js';

/**
 * 基于环境变量的SeedProvider实现
 * 通过全局 ConfigManager 获取钱包 seed
 */
export class EnvSeedProvider implements ISeedProvider {
  getSeed(): string {
    const seed = ConfigManager.getInstance().getSeed();
    if (!seed) {
      throw new Error('SEED environment variable is not set');
    }
    return seed;
  }
}

