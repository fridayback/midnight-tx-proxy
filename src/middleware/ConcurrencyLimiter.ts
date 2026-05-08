import { IConcurrencyProvider } from '../interfaces/IConcurrencyProvider.js';

/**
 * 信号量实现
 */
class Semaphore {
  private max: number;
  private current: number;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>;

  constructor(max: number) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  /**
   * 尝试获取一个许可
   * @param timeout 超时时间（毫秒）
   * @returns 如果获取成功返回true，超时抛出错误
   */
  acquire(timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.current < this.max) {
        this.current++;
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        // 从队列中移除当前请求
        const index = this.queue.findIndex(item => item.timer === timer);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error(`Request timed out after ${timeout}ms waiting for concurrency slot`));
      }, timeout);

      this.queue.push({ resolve, reject, timer });
    });
  }

  /**
   * 释放一个许可
   */
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this.current = Math.max(0, this.current - 1);
    }
  }

  /**
   * 更新最大并发度
   */
  setMax(max: number): void {
    this.max = max;
    // 尝试唤醒等待队列中的请求
    while (this.queue.length > 0 && this.current < this.max) {
      const next = this.queue.shift()!;
      clearTimeout(next.timer);
      this.current++;
      next.resolve();
    }
  }

  /**
   * 获取当前并发数
   */
  getCurrent(): number {
    return this.current;
  }

  /**
   * 获取最大并发数
   */
  getMax(): number {
    return this.max;
  }
}

/**
 * 并发度控制中间件
 * 控制交易操作的并发执行数量
 */
export class ConcurrencyLimiter {
  private semaphore: Semaphore;
  private concurrencyProvider: IConcurrencyProvider;
  private timeout: number;

  constructor(concurrencyProvider: IConcurrencyProvider, initialMax: number, timeout: number) {
    this.semaphore = new Semaphore(initialMax);
    this.concurrencyProvider = concurrencyProvider;
    this.timeout = timeout;
  }

  /**
   * 在交易前刷新并发度并获取许可
   */
  async acquire(): Promise<void> {
    // 交易前刷新并发度
    await this.refreshConcurrency();
    return this.semaphore.acquire(this.timeout);
  }

  /**
   * 在交易后释放许可并刷新并发度
   */
  async release(): Promise<void> {
    // 交易后刷新并发度
    await this.refreshConcurrency();
    this.semaphore.release();
  }

  /**
   * 从provider刷新并发度上限
   */
  async refreshConcurrency(): Promise<void> {
    try {
      const maxConcurrency = await this.concurrencyProvider.getMaxConcurrency();
      this.semaphore.setMax(maxConcurrency);
    } catch (error) {
      console.error('Failed to refresh concurrency:', error);
    }
  }

  /**
   * 获取当前并发状态
   */
  getStatus(): { current: number; max: number; timeout: number } {
    return {
      current: this.semaphore.getCurrent(),
      max: this.semaphore.getMax(),
      timeout: this.timeout,
    };
  }
}
