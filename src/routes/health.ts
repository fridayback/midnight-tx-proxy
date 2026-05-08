import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService.js';
import { ContractService } from '../services/ContractService.js';
import { TxService } from '../services/TxService.js';
import { HealthStatus, WalletInfo, BalancesInfo, MemoryInfo } from '../types.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('HealthRoutes');

export function createHealthRouter(
  walletService: WalletService,
  contractService: ContractService,
  txService: TxService,
  startTime: number
): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    logger.debug('Health check requested');
    const status: HealthStatus = {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
    res.json(status);
  });

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
      logger.error('Failed to get wallet address', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/info/balances', async (_req: Request, res: Response) => {
    try {
      const balances = await walletService.getBalances();
      const replacer = (key: any, value: any) => typeof value === 'bigint' ? value.toString() : value;
      const serialized = JSON.stringify(balances, replacer);
      const deserialized = JSON.parse(serialized);
      const balancesInfo: BalancesInfo = {
        dustBalance: deserialized.dustBalance?.toString() ?? '0',
        shieldedBlance: deserialized.shieldedBlance,
        unshieldedBlance: deserialized.unshieldedBlance,
      };
      res.json({ success: true, data: balancesInfo });
    } catch (error: any) {
      logger.error('Failed to get balances', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

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
      logger.error('Failed to get memory info', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/info/concurrency', (_req: Request, res: Response) => {
    try {
      const concurrencyStatus = txService.getConcurrencyLimiter().getStatus();
      res.json({ success: true, data: concurrencyStatus });
    } catch (error: any) {
      logger.error('Failed to get concurrency status', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
