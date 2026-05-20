/**
 * KeystoreSeedProvider 单元测试
 *
 * 运行方式：
 *   npx tsx test/keystore-provider.test.ts
 */
import { KeystoreSeedProvider } from '../src/providers/KeystoreSeedProvider.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================
// 测试常量
// ============================================================
const TEST_SEED = '1111111111111111111111111111111111111111111111111111111111111110';
const TEST_PASSWORD = 'test123456';
const WRONG_PASSWORD = 'wrongpassword';

// ============================================================
// 测试统计
// ============================================================
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${message} — expected: ${expected}, actual: ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedMsg: string, message: string): void {
  try {
    fn();
    throw new Error(`[FAIL] ${message} — expected error but none thrown`);
  } catch (e: any) {
    if (!e.message.includes(expectedMsg)) {
      throw new Error(
        `[FAIL] ${message} — expected error containing "${expectedMsg}", got: "${e.message}"`,
      );
    }
  }
}

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    failures.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 生成测试用的 keystore JSON 文件，返回文件路径 */
function generateKeystoreFile(): string {
 const __dirname = path.dirname(new URL(import.meta.url).pathname);
 const keystoreDir = path.join(__dirname,'../keystore');

  if (!fs.existsSync(keystoreDir)) {
    fs.mkdirSync(keystoreDir, { recursive: true });
  }
  const filePath = path.join(keystoreDir, './keystore.json');
  const keystoreJson = KeystoreSeedProvider.getKeyStore(TEST_SEED, TEST_PASSWORD);
  fs.writeFileSync(filePath, keystoreJson, 'utf-8');
  return filePath;
}

/** 清理临时文件 */
function cleanupFile(filePath: string): void {
  // try {
  //   fs.unlinkSync(filePath);
  //   fs.rmdirSync(path.dirname(filePath));
  // } catch {
  //   // ignore cleanup errors
  // }
}

/** 保存当前环境变量并清除指定 key */
function clearEnv(...keys: string[]): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of keys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  return saved;
}

/** 恢复环境变量 */
function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

// ============================================================
// 测试用例
// ============================================================

async function runTests(): Promise<void> {
  console.log('\nKeystoreSeedProvider 测试\n');

  // ----- 1. 正常解密 -----
  await test('正常解密：seed 正确还原', () => {
    const keystoreFile = generateKeystoreFile();
    try {
      const provider = new KeystoreSeedProvider(keystoreFile, TEST_PASSWORD);
      assertEqual(provider.getSeed(), TEST_SEED, 'seed 应与原始 seed 一致');
    } finally {
      cleanupFile(keystoreFile);
    }
  });

  // ----- 2. 密码错误 -----
  await test('密码错误：应抛出异常', () => {
    const keystoreFile = generateKeystoreFile();
    try {
      assertThrows(
        () => new KeystoreSeedProvider(keystoreFile, WRONG_PASSWORD),
        'incorrect password',
        '错误密码应抛出 incorrect password 错误',
      );
    } finally {
      cleanupFile(keystoreFile);
    }
  });

  // ----- 3. 缺少 keystore 路径 -----
  await test('缺少 keystore 路径：应抛出异常', () => {
    const savedEnv = clearEnv('KEYSTORE_PATH');
    try {
      assertThrows(
        () => new KeystoreSeedProvider(),
        'Keystore file path not specified',
        '缺少路径时应抛出错误',
      );
    } finally {
      restoreEnv(savedEnv);
    }
  });

  // ----- 4. 缺少密码 -----
  await test('缺少密码：应抛出异常', () => {
    const keystoreFile = generateKeystoreFile();
    const savedEnv = clearEnv('KEYSTORE_PASSWORD');
    try {
      assertThrows(
        () => new KeystoreSeedProvider(keystoreFile),
        'Keystore password not specified',
        '缺少密码时应抛出错误',
      );
    } finally {
      cleanupFile(keystoreFile);
      restoreEnv(savedEnv);
    }
  });

  // ----- 5. 文件不存在 -----
  await test('keystore 文件不存在：应抛出异常', () => {
    assertThrows(
      () => new KeystoreSeedProvider('/nonexistent/path/keystore.json', TEST_PASSWORD),
      'ENOENT',
      '文件不存在时应抛出 ENOENT 错误',
    );
  });

  // ----- 6. 路径优先级：构造函数参数 > 环境变量 -----
  await test('路径优先级：构造函数参数优先于 KEYSTORE_PATH 环境变量', () => {
    // 生成两个不同的 keystore 文件
    const file1 = generateKeystoreFile();       // 使用 TEST_SEED
    const file2Path = path.join(path.dirname(file1), 'keystore2.json');
    const seed2 = '2222222222222222222222222222222222222222222222222222222222222222';
    const keystore2 = KeystoreSeedProvider.getKeyStore(seed2, TEST_PASSWORD);
    fs.writeFileSync(file2Path, keystore2, 'utf-8');

    const savedEnv = clearEnv('KEYSTORE_PATH');
    process.env.KEYSTORE_PATH = file2Path; // 环境变量指向 file2

    try {
      // 构造函数传入 file1，应使用 file1 的 seed
      const provider = new KeystoreSeedProvider(file1, TEST_PASSWORD);
      assertEqual(provider.getSeed(), TEST_SEED, '应使用构造函数传入的 keystore');
    } finally {
      cleanupFile(file1);
      cleanupFile(file2Path);
      restoreEnv(savedEnv);
    }
  });

  // ----- 7. 密码优先级：构造函数参数 > 环境变量 -----
  await test('密码优先级：构造函数参数优先于 KEYSTORE_PASSWORD 环境变量', () => {
    const keystoreFile = generateKeystoreFile();
    const savedEnv = clearEnv('KEYSTORE_PASSWORD');
    process.env.KEYSTORE_PASSWORD = WRONG_PASSWORD; // 环境变量用错误密码

    try {
      // 构造函数传入正确密码，应成功解密
      const provider = new KeystoreSeedProvider(keystoreFile, TEST_PASSWORD);
      assertEqual(provider.getSeed(), TEST_SEED, '应使用构造函数传入的密码');
    } finally {
      cleanupFile(keystoreFile);
      restoreEnv(savedEnv);
    }
  });

  // ----- 8. 仅通过环境变量提供路径和密码 -----
  await test('仅通过环境变量：KEYSTORE_PATH + KEYSTORE_PASSWORD 应正常解密', () => {
    const keystoreFile = generateKeystoreFile();
    const savedEnv = clearEnv('KEYSTORE_PATH', 'KEYSTORE_PASSWORD');
    process.env.KEYSTORE_PATH = keystoreFile;
    process.env.KEYSTORE_PASSWORD = TEST_PASSWORD;

    try {
      const provider = new KeystoreSeedProvider();
      assertEqual(provider.getSeed(), TEST_SEED, '应通过环境变量读取并解密 keystore');
    } finally {
      cleanupFile(keystoreFile);
      restoreEnv(savedEnv);
    }
  });

  // ----- 9. getKeyStore 静态方法 -----
  await test('getKeyStore 静态方法：能生成有效 keystore JSON', () => {
    const keystoreJson = KeystoreSeedProvider.getKeyStore(TEST_SEED, TEST_PASSWORD);
    assert(typeof keystoreJson === 'string', '返回应为字符串');
    assert(keystoreJson.startsWith('{'), '应为 JSON 格式');
    const parsed = JSON.parse(keystoreJson);
    assertEqual(parsed.version, 3, 'keystore version 应为 3');
    assert(typeof parsed.Crypto === 'object', '应包含 Crypto 字段');
  });

  // ----- 10. 多次调用 getSeed() 返回一致 -----
  await test('多次调用 getSeed() 返回结果一致', () => {
    const keystoreFile = generateKeystoreFile();
    try {
      const provider = new KeystoreSeedProvider(keystoreFile, TEST_PASSWORD);
      const seed1 = provider.getSeed();
      const seed2 = provider.getSeed();
      assertEqual(seed1, seed2, '多次调用应返回相同 seed');
      assertEqual(seed1, TEST_SEED, '应与原始 seed 一致');
    } finally {
      cleanupFile(keystoreFile);
    }
  });

  // ============================================================
  // 汇总
  // ============================================================
  console.log('\n=======================');
  console.log(`总计: ${passed + failed}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log('=======================\n');

  if (failures.length > 0) {
    console.log('失败明细:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log();
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('测试执行异常:', e);
  process.exit(1);
});
