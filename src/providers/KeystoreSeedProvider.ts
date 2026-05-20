import { ISeedProvider } from '../interfaces/ISeedProvider.js';
import { ethers, getAccountPath } from 'ethers';
import * as fs from 'fs';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('KeystoreSeedProvider');

/**
 * 基于以太坊 keystore file (UTC/JSON) 的 SeedProvider 实现
 *
 * 从以太坊 keystore JSON 文件中解密私钥，作为钱包 seed 使用。
 *
 * 密码优先级：
 *   1. 构造函数参数 password
 *   2. KEYSTORE_PASSWORD 环境变量
 *
 * keystore 路径优先级：
 *   1. 构造函数参数 keystorePath
 *   2. KEYSTORE_PATH 环境变量
 */
export class KeystoreSeedProvider implements ISeedProvider {
  private seed: string;

  constructor(keystorePath?: string, password?: string) {
    // 1. 确定 keystore 文件路径
    const ksPath = keystorePath || process.env.KEYSTORE_PATH;
    if (!ksPath) {
      throw new Error(
        'Keystore file path not specified. Provide via constructor argument, ' +
        '--keystore CLI argument, or KEYSTORE_PATH environment variable',
      );
    }

    // 2. 确定密码：构造函数参数优先，其次环境变量
    const ksPassword = password || process.env.KEYSTORE_PASSWORD;
    if (!ksPassword) {
      throw new Error(
        'Keystore password not specified. Provide via constructor argument, ' +
        '--keystore-password CLI argument, or KEYSTORE_PASSWORD environment variable',
      );
    }

    // 3. 读取 keystore JSON 文件
    logger.info('Reading keystore file', { keystorePath: ksPath });
    const keystoreJson = fs.readFileSync(ksPath, 'utf-8');

    // 4. 解密 keystore 获取私钥
    const keystoreAccount = ethers.decryptKeystoreJsonSync(keystoreJson, ksPassword);

    // 5. 去掉 0x 前缀，作为 seed 返回
    this.seed = keystoreAccount.privateKey.replace('0x', '');

    logger.info('Keystore decrypted successfully');
  }

  getSeed(): string {
    return this.seed;
  }

  static getKeyStore(seed: string,password: string): string{
    const wallet = new ethers.Wallet(seed);
    return wallet.encryptSync(password);
  }
}
