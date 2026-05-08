import { IConcurrencyProvider } from '../interfaces/IConcurrencyProvider.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ConcurrencyLimiter');

class Semaphore {
  private max: number;
  private current: number;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>;

  constructor(max: number) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  acquire(timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.current < this.max) {
        this.current++;
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        const index = this.queue.findIndex(item => item.timer === timer);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        logger.warn('Concurrency slot timeout', { timeout, current: this.current, max: this.max });
        reject(new Error(`Request timed out after ${timeout}ms waiting for concurrency slot`));
      }, timeout);

      this.queue.push({ resolve, reject, timer });
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this.current = Math.max(0, this.current - 1);
    }
  }

  setMax(max: number): void {
    if (this.max !== max) {
      logger.debug('Concurrency max updated', { from: this.max, to: max });
    }
    this.max = max;
    while (this.queue.length > 0 && this.current < this.max) {
      const next = this.queue.shift()!;
      clearTimeout(next.timer);
      this.current++;
      next.resolve();
    }
  }

  getCurrent(): number {
    return this.current;
  }

  getMax(): number {
    return this.max;
  }
}

export class ConcurrencyLimiter {
  private semaphore: Semaphore;
  private concurrencyProvider: IConcurrencyProvider;
  private timeout: number;

  constructor(concurrencyProvider: IConcurrencyProvider, initialMax: number, timeout: number) {
    this.semaphore = new Semaphore(initialMax);
    this.concurrencyProvider = concurrencyProvider;
    this.timeout = timeout;
  }

  async acquire(): Promise<void> {
    await this.refreshConcurrency();
    return this.semaphore.acquire(this.timeout);
  }

  async release(): Promise<void> {
    await this.refreshConcurrency();
    this.semaphore.release();
  }

  async refreshConcurrency(): Promise<void> {
    try {
      const maxConcurrency = await this.concurrencyProvider.getMaxConcurrency();
      this.semaphore.setMax(maxConcurrency);
    } catch (error) {
      logger.error('Failed to refresh concurrency', { error: String(error) });
    }
  }

  getStatus(): { current: number; max: number; timeout: number } {
    return {
      current: this.semaphore.getCurrent(),
      max: this.semaphore.getMax(),
      timeout: this.timeout,
    };
  }
}
