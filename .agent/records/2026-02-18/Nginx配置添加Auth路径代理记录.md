# Nginx 配置添加 /auth 路径代理记录

## 问题描述

**时间**: 2026-02-18

**背景**: 在修复开发环境新增用户 404 错误时，发现服务器环境的 Nginx 配置也没有包含 `/auth` 路径的代理规则。

## 分析

### 服务器架构

```
用户浏览器 → Nginx (80端口) → API 服务 (3001端口)
                ↓
            静态文件 (dist)
```

### 原 Nginx 配置

```nginx
location /api/ {
    proxy_pass http://api:3001/api/;
    ...
}

location /health {
    proxy_pass http://api:3001/health;
    ...
}
```

**问题**: 缺少 `/auth` 路径的代理配置，导致认证相关接口无法访问。

## 修复方案

在 `nginx.conf` 中添加 `/auth/` 路径的代理配置：

```nginx
location /auth/ {
    proxy_pass http://api:3001/auth/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;

    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

## 修改文件

| 文件 | 修改内容 |
|-----|---------|
| `config/nginx/nginx.conf` | 添加 `/auth/` 路径代理配置 |

## 后续操作

1. **部署到服务器** - 使用 `./deploy/update/deploy.sh` 更新服务器配置
2. **验证修复** - 在服务器环境测试新增用户功能

## 经验总结

1. **配置一致性** - 开发环境和生产环境的代理配置需要保持一致
2. **路径规划** - 建议统一 API 路径前缀，简化代理配置
3. **部署检查** - 新增接口路径时，需要同时检查 vite.config.ts 和 nginx.conf
