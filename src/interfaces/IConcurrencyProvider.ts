/**
 * 并发度控制接口
 * 用于决定服务允许的最大并发交易处理数
 */
export interface IConcurrencyProvider {
  /**
   * 获取当前最大并发度
   * @returns 当前允许的最大并发数
   */
  getMaxConcurrency(): Promise<number>;
}
