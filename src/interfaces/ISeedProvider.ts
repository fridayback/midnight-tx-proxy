/**
 * Seed提供接口
 * 用于获取钱包的seed，实现解耦
 */
export interface ISeedProvider {
  /**
   * 获取钱包seed
   * @returns wallet seed hex string
   */
  getSeed(): string;
}
