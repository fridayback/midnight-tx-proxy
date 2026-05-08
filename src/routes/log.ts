import { Router, Request, Response } from 'express';
import { loggerManager } from '../utils/logger.js';

/**
 * 日志管理路由
 * 支持查看和动态修改日志级别
 */
export function createLogRouter(): Router {
  const router = Router();

  /**
   * GET /log/level - 查看当前日志级别
   */
  router.get('/log/level', (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          level: loggerManager.getLevel(),
          config: loggerManager.getConfig(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /log/level - 动态设置日志级别
   * Body: { level: "debug" | "info" | "warn" | "error" }
   */
  router.post('/log/level', (req: Request, res: Response) => {
    try {
      const { level } = req.body;
      if (!level) {
        res.status(400).json({ success: false, error: 'Missing required parameter: level' });
        return;
      }
      loggerManager.setLevel(level);
      res.json({
        success: true,
        data: {
          level: loggerManager.getLevel(),
          message: `Log level changed to ${level}`,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
}
