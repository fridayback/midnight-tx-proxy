# Midnight Tx Proxy

Midnight 跨链交易的 HTTP 代理服务，提供基于 REST API 的交易提交、钱包管理、健康检查等功能。

## 环境要求

- Node.js >= 18
- npm >= 9

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板并编辑：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```ini
# 钱包种子（必填）- 用于恢复/创建钱包
SEED=0000000000000000000000000000000000000000000000000000000000000001

# 网络ID（可选，默认：preprod）
# 可选值: preprod | preview | mainnet | undeployed
NETWORK_ID=preprod

# 合约地址（可选，覆盖config.json中的配置）
CONTRACT_ADDRESS=
```

### 3. 配置服务参数

编辑 `config.json`，按网络配置服务：

```json
{
  "preprod": {
    "indexer": "https://indexer.preprod.midnight.network/api/v4/graphql",
    "indexerWS": "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
    "node": "https://rpc.preprod.midnight.network",
    "proofServer": "http://35.163.105.105:6300",
    "networkId": "preprod",
    "contractAddress": "0x...",
    "serverPort": 3000,
    "requestTimeout": 300000,
    "log": {
      "path": "./log",
      "retentionDays": 7,
      "level": "info"
    }
  }
}
```

**配置参数说明：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `indexer` | Indexer HTTP 地址 | - |
| `indexerWS` | Indexer WebSocket 地址 | - |
| `node` | Midnight 节点地址 | - |
| `proofServer` | 零知识证明服务器地址 | - |
| `networkId` | 网络标识 | `preprod` |
| `contractAddress` | 跨链合约地址（hex格式） | - |
| `zkConfigPath` | ZK 验证密钥路径 | `./node_modules/midnight-crosschain/dist/managed/crosschain/keys/` |
| `serverPort` | HTTP 服务端口 | `3000` |
| `requestTimeout` | 请求超时时间（毫秒） | `300000`（5分钟） |
| `log.path` | 日志文件存储路径 | `./log` |
| `log.retentionDays` | 日志保留天数 | `7` |
| `log.level` | 日志输出级别（error/warn/info/debug） | `info` |

### 4. 启动服务

```bash
# 开发模式（使用 tsx 直接运行）
npm run dev

# 生产模式（先构建再运行）
npm run build
npm start
```

启动成功后，控制台输出示例：

```
====================================================
  Midnight Tx Proxy Service Started
  Port: 3000
  Network: preprod
  Contract: 0x...
  Max Concurrency: 5
  Request Timeout: 300000ms
  Health: http://localhost:3000/health
  Wallet: http://localhost:3000/info/wallet
  Balances: http://localhost:3000/info/balances
  Memory: http://localhost:3000/info/memory
====================================================
```

---

## API 使用指南

### 基础响应格式

所有接口统一返回 JSON 格式：

**成功响应：**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应：**
```json
{
  "success": false,
  "error": "错误描述"
}
```

---

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

**响应示例：**
```json
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2026-05-07T12:00:00.000Z"
}
```
### 日志级别管理

**查看当前日志级别：**
```bash
curl http://localhost:3000/log/level
```

**动态修改日志级别：**
```bash
curl -X POST http://localhost:3000/log/level \
  -H "Content-Type: application/json" \
  -d '{"level": "debug"}'
```

支持级别：`error` | `warn` | `info` | `debug`

---

## 日志系统

### 日志格式

每条日志包含：日期时间、日志级别、所属模块、消息内容。

**控制台输出（带颜色）：**
```
[2026-05-07 12:00:00.123] info  [Main              ] Service started
```

**文件输出（纯文本）：**
```
[2026-05-07 12:00:00.123] [INFO ] [Main] Service started
```

### 日志文件存储

- 所有模块的日志统一存储在一个日志文件中
- 文件名格式：`midnight-tx-proxy-YYYY-MM-DD.log`
- 按日期轮转，超过 `retentionDays` 配置天数的日志文件自动清理
- 每条日志中的 `[Module]` 字段标示来源模块，用于区分

### 关键日志模块

| 模块 | 关键日志场景 |

---

### 2. 查询钱包地址

```bash
curl http://localhost:3000/info/wallet
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "shieldedAddress": "mn_shield-addr_test1...",
    "unshieldedAddress": "mn_addr_test1...",
    "dustAddress": "mn_dust-addr_test1...",
    "coinPublicKey": "..."
  }
}
```

---

### 3. 查询钱包余额

```bash
curl http://localhost:3000/info/balances
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "dustBalance": "1000000",
    "shieldedBlance": { ... },
    "unshieldedBlance": { ... }
  }
}
```

---

### 4. 查询内存使用

```bash
curl http://localhost:3000/info/memory
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "rss": "125.34 MB",
    "heapTotal": "85.12 MB",
    "heapUsed": "45.67 MB",
    "external": "12.34 MB",
    "arrayBuffers": "5.67 MB"
  }
}
```

---

### 5. 查询并发度状态

```bash
curl http://localhost:3000/info/concurrency
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "current": 2,
    "max": 5,
    "timeout": 300000
  }
}
```

---

### 6. 提交交易操作

#### 6.1 smgMint - SMG 铸币

```bash
curl -X POST http://localhost:3000/tx-service/smgMint \
  -H "Content-Type: application/json" \
  -d '{
    "uniqueId": "0000000000000000000000000000000000000000000000000000000000000638",
    "smgId": "000000000000000000000000000000000000000000000000006465765f323739",
    "tokenPairId": 1236,
    "amount": 12345678,
    "fee": 100,
    "toAddr": "mn_addr_preprod1urga0fpp2xpuxud2wyjvydaax9cf0jvnm7h0pusujkm5h88xj03smqxxve",
    "ttl": 1762836067000
  }'
```

**请求参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `uniqueId` | string | 唯一交易ID（64位hex） |
| `smgId` | string | SMG ID（64位hex） |
| `tokenPairId` | number | 代币对ID |
| `amount` | number | 铸币数量 |
| `fee` | number | 手续费 |
| `toAddr` | string | 接收地址 |
| `ttl` | number | 过期时间戳（毫秒） |

**成功响应：**
```json
{
  "success": true,
  "data": {
    "blockHeight": "12345",
    "blockHash": "0x...",
    "txHash": "0x..."
  }
}
```

---

#### 6.2 smgRelease - SMG 释放

```bash
curl -X POST http://localhost:3000/tx-service/smgRelease \
  -H "Content-Type: application/json" \
  -d '{
    "uniqueId": "0000000000000000000000000000000000000000000000000000000000000012",
    "smgId": "000000000000000000000000000000000000000000000000006465765f323739",
    "tokenPairId": 1245,
    "amount": 123,
    "fee": 100,
    "toAddr": "mn_shield-addr_test1...",
    "ttl": 10000000000
  }'
```

**请求参数：**

同 smgMint。

---

#### 6.3 voteMultiCrossProposal - 投票跨链提案

```bash
curl -X POST http://localhost:3000/tx-service/voteMultiCrossProposal \
  -H "Content-Type: application/json" \
  -d '[
      { "uniqueId": "0x...", "ttl": 1762836067000 },
      { "uniqueId": "0x...", "ttl": 1762836067000 }
    ]'
```

**请求参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `uniqueIds` | array | 提案列表 |
| `uniqueIds[].uniqueId` | string | 提案唯一ID |
| `uniqueIds[].ttl` | number | 提案过期时间 |

---

#### 6.4 executeCrossProposal - 执行跨链提案

```bash
curl -X POST http://localhost:3000/tx-service/executeCrossProposal \
  -H "Content-Type: application/json" \
  -d '{
    "uniqueId": "0x..."
  }'
```

**请求参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `uniqueId` | string | 提案唯一ID |

---

### 7. 并发度超时

当并发度达到上限时，请求会等待直到超时，返回 429 状态码：

```json
// HTTP 429 Too Many Requests
{
  "success": false,
  "error": "Too many requests, please try again later. Request timed out after 300000ms waiting for concurrency slot"
}
```

---

### 8. 错误处理

所有交易操作在失败时返回统一的错误格式：

```json
// HTTP 500 Internal Server Error
{
  "success": false,
  "error": "错误信息描述"
}
```

---

## 架构说明

```
┌─────────────┐     POST /tx-service/*     ┌──────────────────┐
│   Client    │ ──────────────────────────> │  Express Server  │
│  (curl/App) │ <────────────────────────── │  (Port 3000)     │
└─────────────┘     JSON Response           └──────────────────┘
                                                    │
                                          ┌─────────┴──────────┐
                                          │ ConcurrencyLimiter  │
                                          │  (Semaphore模式)    │
                                          └─────────┬──────────┘
                                                    │
                                          ┌─────────┴──────────┐
                                          │     TxService      │
                                          │ smgMint / smgRelease│
                                          │ voteMultiCross /   │
                                          │ executeCross       │
                                          └─────────┬──────────┘
                                                    │
                                          ┌─────────┴──────────┐
                                          │   CrossChainApi    │
                                          │  (midnight-crosschain)│
                                          └─────────┬──────────┘
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                        ┌─────┴─────┐        ┌──────┴──────┐       ┌────┴────┐
                        │  Indexer  │        │    Node     │       │  Proof  │
                        │           │        │             │       │  Server │
                        └───────────┘        └─────────────┘       └─────────┘
```

### 并发度控制机制

1. **信号量（Semaphore）模式**：每个交易请求在开始前必须获取一个许可
2. **动态刷新**：每次交易前/后调用 `DustConcurrencyProvider.getMaxConcurrency()` 刷新并发度上限
3. **并发度依据**：`walletSdk.getAvailableCoins().dustAvailableCoins.length`（钱包中的DUST可用硬币数）
4. **超时处理**：请求在队列中等待超时后返回 429 状态码
5. **至少保证 1**：即使可用硬币数为0，也至少允许1个并发，防止服务完全阻塞

### 扩展点

#### 自定义 Seed Provider

实现 `ISeedProvider` 接口即可替换 seed 来源：

```typescript
import { ISeedProvider } from './interfaces/ISeedProvider.js';

export class CustomSeedProvider implements ISeedProvider {
  getSeed(): string {
    // 从任意来源获取seed
    return 'your-seed-hex';
  }
}
```

#### 自定义 Concurrency Provider

实现 `IConcurrencyProvider` 接口即可替换并发度策略：

```typescript
import { IConcurrencyProvider } from './interfaces/IConcurrencyProvider.js';

export class CustomConcurrencyProvider implements IConcurrencyProvider {
  async getMaxConcurrency(): Promise<number> {
    // 自定义并发度逻辑
    return 10;
  }
}
```

---

## 开发命令

```bash
npm run build    # 编译TypeScript
npm start        # 启动生产服务
npm run dev      # 开发模式（tsx）
npm run clean    # 清理编译产物
```

## 许可证

Apache-2.0
