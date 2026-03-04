# 里程碑附件下载 HTTPS 报错修复记录

## 问题描述

在服务器环境下载里程碑附件时，控制台报错：

```
The file at 'blob:http://106.227.19.2:6969/96a961f8-2323-4192-8a81-5d70d6fbf45d' was loaded over an insecure connection. This file should be served over HTTPS.
```

这是典型的**混合内容（Mixed Content）**问题：页面通过 HTTPS 加载，但附件 URL 使用 HTTP 协议，浏览器出于安全考虑阻止了下载。

## 问题分析

### 根本原因

1. 附件存储在 Supabase Storage 中，通过 `getPublicUrl` 获取的 URL 基于 `API_BASE_URL`
2. 服务器环境的 `API_BASE_URL` 配置为 `http://106.227.19.2:6969`（HTTP 协议）
3. 用户通过 HTTPS 访问页面时，浏览器阻止从 HTTP URL 下载文件

### 相关代码

**文件**: `src/pages/projects/tabs/Milestones.tsx` (第 468-471 行)

```typescript
// 下载单个文件
const downloadFile = async (url: string, filename: string): Promise<Blob> => {
  const response = await fetch(url);  // 直接访问 HTTP URL，导致混合内容问题
  return await response.blob();
};
```

## 解决方案

通过后端 API 代理下载文件，避免直接访问存储服务的 HTTP URL。

### 修改内容

#### 1. 修改 `downloadFile` 函数

**文件**: `src/pages/projects/tabs/Milestones.tsx`

```typescript
// 下载单个文件 - 通过后端 API 下载以避免混合内容问题
const downloadFile = async (url: string, filename: string): Promise<Blob> => {
  // 从 URL 中提取存储路径
  const urlMatch = url.match(/\/project-documents\/(.+?)(?:\?|$)/);
  if (!urlMatch || !urlMatch[1]) {
    throw new Error('无法解析文件路径');
  }
  const filePath = urlMatch[1];

  // 使用后端 API 下载文件，避免混合内容问题
  return await api.storage.from('project-documents').download(filePath);
};
```

#### 2. 修改 Storage API 的 `download` 方法

**文件**: `src/lib/api.ts`

```typescript
download: async (path: string): Promise<Blob> => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/storage/v1/object/${bucket}/${path}`, {
    headers: {
      'Accept': '*/*',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '下载失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.blob();
},
```

## 修复效果

- 附件下载不再直接访问存储服务的 HTTP URL
- 通过后端 API 代理下载，使用与页面相同的协议（HTTPS）
- 消除混合内容警告，下载功能正常工作

## 影响范围

- **功能**: 里程碑附件打包下载（阶段下载、完整打包下载）
- **文件**: 
  - `src/pages/projects/tabs/Milestones.tsx`
  - `src/lib/api.ts`

## 测试建议

1. 在 HTTPS 环境下测试里程碑附件下载功能
2. 验证阶段下载和完整打包下载都能正常工作
3. 检查浏览器控制台是否还有混合内容警告

## 相关文档

- [里程碑任务附件上传修复记录](./里程碑任务附件上传修复记录.md)
