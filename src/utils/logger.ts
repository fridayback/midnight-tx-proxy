import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';

export interface LogConfig {
  path: string;
  retentionDays: number;
  level: string;
}

const DEFAULT_LOG_CONFIG: LogConfig = {
  path: './log',
  retentionDays: 7,
  level: 'info',
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

class LoggerManager {
  private globalLogger: winston.Logger | null = null;
  private config: LogConfig = { ...DEFAULT_LOG_CONFIG };

  /**
   * 初始化日志管理器，必须在服务启动时调用
   */
  init(config: LogConfig): void {
    this.config = { ...config };
    // 确保日志目录存在
    const logDir = path.resolve(this.config.path);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logDirResolved = path.resolve(this.config.path);

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, module, stack }) => {
        const moduleStr = (module as string || 'Unknown').padEnd(18);
        let log = `[${timestamp}] ${level} [${moduleStr}] ${message}`;
        if (stack) {
          log += `\n${stack}`;
        }
        return log;
      })
    );

    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, module, stack }) => {
        const levelStr = (level as string).toUpperCase().padEnd(5);
        const moduleStr = (module as string || 'Unknown');
        let log = `[${timestamp}] [${levelStr}] [${moduleStr}] ${message}`;
        if (stack) {
          log += `\n${stack}`;
        }
        return log;
      })
    );

    this.globalLogger = winston.createLogger({
      level: this.config.level,
      format: fileFormat,
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
        }),
        new DailyRotateFile({
          filename: path.join(logDirResolved, 'midnight-tx-proxy-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: `${this.config.retentionDays}d`,
          format: fileFormat,
          zippedArchive: false,
        }),
      ],
    });
  }

  /**
   * 获取指定模块的 logger（所有模块共享同一个底层日志文件）
   */
  getLogger(module: string): winston.Logger {
    // 如果还未初始化，先使用默认配置初始化
    if (!this.globalLogger) {
      this.init(DEFAULT_LOG_CONFIG);
    }

    // 使用 child logger 携带模块名，所有 child 共享同一个文件输出
    return this.globalLogger!.child({ module });
  }

  /**
   * 动态设置日志级别
   */
  setLevel(level: string): void {
    if (!LOG_LEVELS.includes(level as LogLevel)) {
      throw new Error(`Invalid log level: ${level}. Valid levels: ${LOG_LEVELS.join(', ')}`);
    }
    this.config.level = level;
    if (this.globalLogger) {
      this.globalLogger.level = level;
    }
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): string {
    return this.config.level;
  }

  /**
   * 获取当前日志配置
   */
  getConfig(): LogConfig {
    return { ...this.config };
  }
}

// 单例
export const loggerManager = new LoggerManager();

/**
 * 获取指定模块的 logger
 */
export function getLogger(module: string): winston.Logger {
  return loggerManager.getLogger(module);
}
