# ====================================================
# Dockerfile - midnight-tx-proxy
# 多阶段构建
# ====================================================

# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 编译 TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建运行时数据目录
RUN mkdir -p /app/log /app/wallet-snapshots /app/midnight-level-db

EXPOSE 3000

# 配置文件路径，可通过 docker-compose 挂载覆盖
ENV CONFIG_PATH=/app/config/config.json

CMD ["node", "dist/index.js"]
