import { Router, Request, Response } from 'express';
import { TxService } from '../services/TxService.js';
import { TxResponse } from '../types.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('TxRoutes');

export function createTxRouter(txService: TxService): Router {
  const router = Router();

  router.post('/tx-service/smgMint', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      logger.info('POST smgMint request received', { uniqueId: params.uniqueId });
      const result = await txService.smgMint(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      logger.error('POST smgMint error', { error: error.message });
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(200).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(200).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  router.post('/tx-service/voteMultiCrossProposal', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      logger.info('POST voteMultiCrossProposal request received', { count: params?.length });
      const result = await txService.voteMultiCrossProposal(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      logger.error('POST voteMultiCrossProposal error', { error: error.message });
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(200).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(200).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  router.post('/tx-service/smgRelease', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      logger.info('POST smgRelease request received', { uniqueId: params.uniqueId });
      const result = await txService.smgRelease(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      logger.error('POST smgRelease error', { error: error.message });
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(200).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(200).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  router.post('/tx-service/executeCrossProposal', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      logger.info('POST executeCrossProposal request received', { uniqueId: params.uniqueId });
      const result = await txService.executeCrossProposal(params);
      const response: TxResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      logger.error('POST executeCrossProposal error', { error: error.message });
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        res.status(200).json({ success: false, error: `Too many requests, please try again later. ${error.message}` });
      } else {
        res.status(200).json({ success: false, error: error.message ?? String(error) });
      }
    }
  });

  return router;
}
