import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService.js';
import { ContractService } from '../services/ContractService.js';
import { TxService } from '../services/TxService.js';
import { HealthStatus, WalletInfo, BalancesInfo, MemoryInfo } from '../types.js';

/**
 * 健康检查和信息查询路由
 */
export function createHealthRouter(
  walletService: WalletService,
  contractService: ContractService,
  txService: TxService,
  startTime: number
): Router {
  const router = Router();

  /**
   * GET /health - 健康检查
   */
  router.get('/health', (_req: Request, res: Response) => {
    const status: HealthStatus = {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
    res.json(status);
  });

  /**
   * GET /info/wallet - 获取钱包地址信息
   */
  router.get('/info/wallet', (_req: Request, res: Response) => {
    try {
      const address = walletService.getWalletAddress();
      const walletInfo: WalletInfo = {
        shieldedAddress: address.shieldedAddress,
        unshieldedAddress: address.unshieldedAddress,
        dustAddress: address.dustAddress,
        coinPublicKey: address.coinPublicKey,
      };
      res.json({ success: true, data: walletInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /info/balances - 获取钱包余额
   */
  router.get('/info/balances', async (_req: Request, res: Response) => {
    try {
      const balances = await walletService.getBalances();
      // 使用 replacer 将 bigint 转换为字符串
      const replacer = (key: any, value: any) => typeof value === 'bigint' ? value.toString() : value;

      // 反序列化，使用 reviver 将字符串转换回 bigint
      // const reviver = (key: any, value: any) => typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : value;
      const serialized = JSON.stringify(balances, replacer);
      const deserialized = JSON.parse(serialized);
      const balancesInfo: BalancesInfo = {
        dustBalance: deserialized.dustBalance?.toString() ?? '0',
        shieldedBlance: deserialized.shieldedBlance,
        unshieldedBlance: deserialized.unshieldedBlance,
      };
      res.json({ success: true, data: balancesInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /info/memory - 获取内存使用情况
   */
  router.get('/info/memory', (_req: Request, res: Response) => {
    try {
      const mem = process.memoryUsage();
      const memoryInfo: MemoryInfo = {
        rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
        arrayBuffers: `${(mem.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
      };
      res.json({ success: true, data: memoryInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /info/concurrency - 获取并发度状态
   */
  router.get('/info/concurrency', (_req: Request, res: Response) => {
    try {
      const concurrencyStatus = txService.getConcurrencyLimiter().getStatus();
      res.json({ success: true, data: concurrencyStatus });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
