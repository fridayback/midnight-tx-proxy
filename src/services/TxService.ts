import { FinalizedCallTxData } from '@midnight-ntwrk/midnight-js-contracts';
import { ContractService } from './ContractService.js';
import { ConcurrencyLimiter } from '../middleware/ConcurrencyLimiter.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('TxService');

/**
 * 交易操作服务
 * 支持 smgMint | voteMultiCrossProposal | smgRelease | executeCrossProposal 操作
 */
export class TxService {
  private contractService: ContractService;
  private concurrencyLimiter: ConcurrencyLimiter;

  constructor(
    contractService: ContractService,
    concurrencyLimiter: ConcurrencyLimiter
  ) {
    this.contractService = contractService;
    this.concurrencyLimiter = concurrencyLimiter;
  }

  /**
   * 执行 smgMint 操作
   */
  async smgMint(params: {
    uniqueId: string;
    smgId: string;
    tokenPairId: string | number | bigint;
    amount: string | number | bigint;
    fee: string | number | bigint;
    toAddr: string;
    ttl: number;
  }): Promise<Record<string, unknown>> {
    logger.info('smgMint start', { uniqueId: params.uniqueId, tokenPairId: params.tokenPairId });
    await this.concurrencyLimiter.acquire();
    try {
      const api = this.contractService.getApi();
      const result = await api.smgMint(
        params.uniqueId,
        params.smgId,
        params.tokenPairId,
        params.amount,
        params.fee,
        params.toAddr,
        params.ttl
      );
      logger.info('smgMint success', { blockHeight: result.public.blockHeight?.toString(), txHash: result.public.txHash });
      return this.formatResult(result);
    } catch (error: any) {
      logger.error('smgMint failed', { error: error.message });
      throw error;
    } finally {
      await this.concurrencyLimiter.release();
    }
  }

  /**
   * 执行 voteMultiCrossProposal 操作
   */
  async voteMultiCrossProposal(params: {
    uniqueIds: Array<{ uniqueId: string; ttl: string | number | bigint }>;
  }): Promise<Record<string, unknown>> {
    logger.info('voteMultiCrossProposal start', { count: params.uniqueIds.length });
    await this.concurrencyLimiter.acquire();
    try {
      const api = this.contractService.getApi();
      const result = await api.voteMultiCrossProposal(params.uniqueIds);
      logger.info('voteMultiCrossProposal success', { blockHeight: result.public.blockHeight?.toString(), txHash: result.public.txHash });
      return this.formatResult(result);
    } catch (error: any) {
      logger.error('voteMultiCrossProposal failed', { error: error.message });
      throw error;
    } finally {
      await this.concurrencyLimiter.release();
    }
  }

  /**
   * 执行 smgRelease 操作
   */
  async smgRelease(params: {
    uniqueId: string;
    smgId: string;
    tokenPairId: string | number | bigint;
    amount: string | number | bigint;
    fee: string | number | bigint;
    toAddr: string;
    ttl: number;
  }): Promise<Record<string, unknown>> {
    logger.info('smgRelease start', { uniqueId: params.uniqueId, tokenPairId: params.tokenPairId });
    await this.concurrencyLimiter.acquire();
    try {
      const api = this.contractService.getApi();
      const result = await api.smgRelease(
        params.uniqueId,
        params.smgId,
        params.tokenPairId,
        params.amount,
        params.fee,
        params.toAddr,
        params.ttl
      );
      logger.info('smgRelease success', { blockHeight: result.public.blockHeight?.toString(), txHash: result.public.txHash });
      return this.formatResult(result);
    } catch (error: any) {
      logger.error('smgRelease failed', { error: error.message });
      throw error;
    } finally {
      await this.concurrencyLimiter.release();
    }
  }

  /**
   * 执行 executeCrossProposal 操作
   */
  async executeCrossProposal(params: {
    uniqueId: string;
  }): Promise<Record<string, unknown>> {
    logger.info('executeCrossProposal start', { uniqueId: params.uniqueId });
    await this.concurrencyLimiter.acquire();
    try {
      const api = this.contractService.getApi();
      const result = await api.executeCrossProposal(params.uniqueId);
      logger.info('executeCrossProposal success', { blockHeight: result.public.blockHeight?.toString(), txHash: result.public.txHash });
      return this.formatResult(result);
    } catch (error: any) {
      logger.error('executeCrossProposal failed', { error: error.message });
      throw error;
    } finally {
      await this.concurrencyLimiter.release();
    }
  }

  private formatResult(result: FinalizedCallTxData<any, any>): Record<string, unknown> {
    return {
      public: {
        blockHeight: result.public.blockHeight?.toString() ?? '',
        blockHash: result.public.blockHash ?? '',
        txHash: result.public.txHash ?? '',
        txId: result.public.txId ?? '',
        status: result.public.status ?? '',
        blockTimestamp: result.public.blockTimestamp?.toString() ?? '',
        fees: result.public.fees,
        identifiers: result.public.identifiers,
        indexerId: result.public.indexerId,
        blockAuthor: result.public.blockAuthor ?? '',
      },
      private: {},
    };
  }

  getConcurrencyLimiter(): ConcurrencyLimiter {
    return this.concurrencyLimiter;
  }
}
