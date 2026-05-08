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

---

## API 使用指南

### 基础响应格式

所有接口统一返回 JSON 格式：

```json
{ "success": true, "data": { ... } }
```

### 健康检查

```bash
curl http://localhost:3000/health
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
|------|-------------|
| `Main` | 服务启动、配置加载 |
| `WalletService` | 网络初始化、钱包构建、余额查询 |
| `ContractService` | Api初始化、合约加入 |
| `TxService` | 交易开始/成功/失败 |
| `ConcurrencyLimiter` | 并发度更新、请求超时 |
| `TxRoutes` | HTTP请求接收/响应 |

---

## 架构说明

```
Client → POST /tx-service/* → ConcurrencyLimiter → TxService → CrossChainApi → Midnight Network
```

## 开发命令

```bash
npm run build    # 编译TypeScript
npm start        # 启动生产服务
npm run dev      # 开发模式（tsx）
npm run clean    # 清理编译产物
```

## 许可证

Apache-2.0
