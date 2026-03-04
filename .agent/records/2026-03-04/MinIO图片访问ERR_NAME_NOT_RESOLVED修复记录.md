# MinIO 图片访问 ERR_NAME_NOT_RESOLVED 修复记录

## 问题描述

服务器环境更新后，图片上传功能正常，但图片无法显示，控制台报错：

```
minio:9000/files/forum:1   GET `http://minio:9000/files/forum`  net::ERR_NAME_NOT_RESOLVED
```

## 问题分析

### 根本原因

1. **后端配置**：服务器环境的 `MINIO_ENDPOINT` 设置为 `minio:9000`（Docker 内部网络主机名）
2. **URL 生成逻辑错误**：`storageService.ts` 直接调用了 `getDirectUrl()` 函数
3. **函数行为**：`getDirectUrl()` 直接返回 `http://minio:9000/...` 的 URL
4. **前端问题**：浏览器无法解析 `minio` 这个 Docker 内部主机名，导致 `ERR_NAME_NOT_RESOLVED` 错误

### 相关代码

**问题代码**（`api-new/src/services/storageService.ts` 第 77 行）：

```typescript
// 错误：直接调用 getDirectUrl，返回 minio:9000 的 URL
const url = fileAccessService.getDirectUrl(bucket, filePath);
```

**修复后代码**：

```typescript
// 正确：调用 getFileUrl，根据策略返回代理 URL
const url = await fileAccessService.getFileUrl(bucket, filePath);
```

**后端 URL 生成逻辑**（`api-new/src/services/fileAccessService.ts` 第 69-72 行）：

```typescript
export function getDirectUrl(bucket: string, filePath: string): string {
  const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 
    `http://${MINIO_CONFIG.endPoint}:${MINIO_PORT}`;
  return `${MINIO_PUBLIC_URL}/${bucket}/${filePath}`;
}
```

## 解决方案

### ✅ 最终方案：使用后端代理访问（已实施）

**原因**：服务器环境只有 6969 端口可以外部访问，无法直接访问 MinIO 的 9000 端口。

**修改方法**：

在 `api-new/src/services/fileAccessService.ts` 中，清空公开 bucket 列表，强制所有图片通过后端代理访问：

```typescript
// 公开访问的 bucket 列表（可以直接访问）
// 注意：服务器环境只有 6969 端口可外部访问，所有 bucket 都通过后端代理访问
const PUBLIC_BUCKETS: string[] = [];
```

**效果**：
- 所有图片 URL 变为 `http://<后端API地址>:6969/api/files/forum/xxx.jpg`
- 图片通过后端代理访问，走 6969 端口
- 浏览器可以正常访问

---

### 其他方案（备选）

#### 方案一：设置 MINIO_PUBLIC_URL 环境变量

适用于 MinIO 端口可外部访问的场景：

```bash
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_URL=http://<服务器公网IP>:9000
```

#### 方案二：使用预签名 URL

适用于需要临时访问控制的场景：

```typescript
const url = await fileAccessService.getPresignedUrl(bucket, filePath, 3600);
```

## 实施步骤（已执行）

### 步骤 1：修改后端代码（两处修改）

#### 修改 1：清空公开 bucket 列表

文件：`api-new/src/services/fileAccessService.ts`

```typescript
// 修改前
const PUBLIC_BUCKETS = ['images', 'forum', 'avatars'];

// 修改后
const PUBLIC_BUCKETS: string[] = [];
```

#### 修改 2：修复 storageService 使用错误的 URL 生成函数

文件：`api-new/src/services/storageService.ts` 第 77 行

```typescript
// 修改前（错误：直接返回 minio:9000 URL）
const url = fileAccessService.getDirectUrl(bucket, filePath);

// 修改后（正确：根据策略返回代理 URL）
const url = await fileAccessService.getFileUrl(bucket, filePath);
```

### 步骤 2：重新构建

```bash
cd api-new
npm run build
```

### 步骤 3：部署到服务器

```bash
# 1. 提交代码
git add api-new/src/services/fileAccessService.ts
git add api-new/src/services/storageService.ts
git commit -m "fix: 修复图片访问 URL 生成逻辑，解决 ERR_NAME_NOT_RESOLVED 错误"
git push

# 2. 执行部署脚本
./deploy/update/deploy.sh
```

### 步骤 4：验证修复

1. 打开前端页面
2. 上传一张新图片
3. 检查返回的 URL 格式是否为 `http://<后端地址>:6969/api/files/forum/xxx.jpg`
4. 确认图片能正常显示

## 配置参考

### 开发环境

```bash
MINIO_ENDPOINT=localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
```

### 服务器环境（Docker）

```bash
MINIO_ENDPOINT=minio:9000          # Docker 内部访问
MINIO_PUBLIC_URL=http://<公网IP>:9000  # 前端访问
```

### 生产环境（HTTPS）

```bash
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_URL=https://files.yourdomain.com
MINIO_USE_SSL=true
```

## 注意事项

1. **防火墙配置**：确保服务器的 9000 端口对外开放（如果使用方案一）
2. **Nginx 反向代理**：如果使用域名，建议通过 Nginx 反向代理到 MinIO
3. **HTTPS**：生产环境建议使用 HTTPS
4. **CORS**：MinIO 需要配置 CORS 允许前端域名访问

## 相关文件

- `api-new/src/services/fileAccessService.ts` - 文件访问服务（定义访问策略）
- `api-new/src/services/storageService.ts` - 存储服务（上传文件时生成 URL）⚠️ **关键修复位置**
- `api-new/src/config/constants.ts` - 配置文件
- `api-new/.env` - 环境变量

## 修复时间

2026-03-04
