import { Router, Request, Response } from 'express';
import { TxService } from '../services/TxService.js';
import { TxResponse } from '../types.js';

/**
 * 交易操作路由
 * 支持 POST /tx-service/smgMint
 *      POST /tx-service/voteMultiCrossProposal
 *      POST /tx-service/smgRelease
 *      POST /tx-service/executeCrossProposal
 */
export function createTxRouter(txService: TxService): Router {
  const router = Router();

  /**
   * POST /tx-service/smgMint
   */
  router.post('/tx-service/smgMint', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      const result = await txService.smgMint(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      console.error('smgMint error:', error);
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(429).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(500).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  /**
   * POST /tx-service/voteMultiCrossProposal
   */
  router.post('/tx-service/voteMultiCrossProposal', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      const result = await txService.voteMultiCrossProposal(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      console.error('voteMultiCrossProposal error:', error);
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(429).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(500).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  /**
   * POST /tx-service/smgRelease
   */
  router.post('/tx-service/smgRelease', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      const result = await txService.smgRelease(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      console.error('smgRelease error:', error);
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(429).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(500).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  /**
   * POST /tx-service/executeCrossProposal
   */
  router.post('/tx-service/executeCrossProposal', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      const result = await txService.executeCrossProposal(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      console.error('executeCrossProposal error:', error);
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(429).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(500).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  return router;
}
