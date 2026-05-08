import { ISeedProvider } from '../interfaces/ISeedProvider.js';

/**
 * 基于环境变量的SeedProvider实现
 * 从环境变量 SEED 中获取钱包seed
 */
export class EnvSeedProvider implements ISeedProvider {
  getSeed(): string {
    const seed = process.env.SEED;
    if (!seed) {
      throw new Error('SEED environment variable is not set');
    }
    return seed;
  }
}
