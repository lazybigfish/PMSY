# PMSY 桌面版

PMSY 项目管理系统的桌面离线版本，基于 Electron + SQLite 构建。

## 特性

- **完全离线运行**：无需网络连接，数据存储在本地
- **功能完整保留**：与 Web 版完全一致的功能体验
- **自动数据迁移**：首次启动自动执行数据库迁移
- **数据备份恢复**：支持数据库备份和恢复功能
- **跨平台支持**：支持 macOS、Windows、Linux

## 项目结构

```
desktop/
├── electron/
│   ├── main/              # 主进程代码
│   │   ├── index.ts       # 入口文件
│   │   ├── database.ts    # SQLite 数据库管理
│   │   ├── server.ts      # Express API 服务
│   │   ├── ipc-handlers.ts # IPC 通信处理
│   │   ├── middleware/    # Express 中间件
│   │   ├── routes/        # API 路由
│   │   └── utils/         # 工具函数
│   ├── preload/           # Preload 脚本
│   │   └── index.ts
│   └── renderer/          # 渲染进程入口
│       └── index.html
├── src/                   # 桌面版特有代码
│   ├── api-adapter.ts     # API 适配层
│   └── types.d.ts         # 类型声明
├── resources/             # 应用资源（图标等）
├── dist/                  # 构建输出
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 配置
└── README.md              # 本文档
```

## 开发环境

### 前提条件

- Node.js >= 20.0.0
- npm >= 10.0.0

### 安装依赖

```bash
cd desktop
npm install
```

### 开发模式

```bash
# 启动开发服务器（同时启动 Electron 和 Vite）
npm run dev
```

### 构建

```bash
# 构建所有代码
npm run build

# 打包应用（不生成安装包）
npm run pack

# 生成安装包
npm run dist

# 仅生成 macOS 安装包
npm run dist:mac

# 仅生成 Windows 安装包
npm run dist:win
```

## 技术栈

| 层级 | 技术 | 说明 |
|-----|------|------|
| 桌面框架 | Electron 33+ | 跨平台桌面应用 |
| 前端框架 | React 18 | 与 Web 版保持一致 |
| 构建工具 | Vite 6+ | 快速开发和构建 |
| 后端服务 | Express 4 | RESTful API |
| 数据库 | SQLite + better-sqlite3 | 本地数据存储 |
| 打包工具 | electron-builder | 应用分发 |

## 数据库迁移

桌面版会自动执行数据库迁移：

1. 首次启动时，自动创建 SQLite 数据库
2. 自动执行 `api-new/database/migrations` 目录下的 SQL 迁移文件
3. 自动转换 PostgreSQL 语法到 SQLite 语法
4. 自动插入默认管理员账号

### 默认管理员账号

- 邮箱：`admin@pmsy.local`
- 密码：`admin123`

**注意**：首次登录后请立即修改密码。

## API 适配

桌面版通过 API 适配层保持与 Web 版的兼容性：

```typescript
// 检测是否在 Electron 环境
import { isElectron, api } from '@desktop/api-adapter';

// 自动选择正确的 API 端点
const projects = await api.get('/rest/v1/projects');

// 桌面版特有功能
if (isElectron()) {
  const { desktopApi } = await import('@desktop/api-adapter');
  await desktopApi.backupDatabase();
}
```

## 数据存储位置

### macOS

```
~/Library/Application Support/PMSY/
├── database/
│   └── pmsy.db              # 主数据库
├── storage/                 # 文件存储
│   ├── avatars/
│   ├── documents/
│   └── uploads/
├── backups/                 # 数据库备份
└── logs/                    # 应用日志
```

### Windows

```
%APPDATA%\PMSY\
├── database\
│   └── pmsy.db
├── storage\
├── backups\
└── logs\
```

## 常见问题

### 1. 数据库迁移失败

**问题**：启动时提示数据库迁移失败

**解决**：
1. 删除数据目录重新启动
2. 检查迁移文件语法是否正确

### 2. 端口被占用

**问题**：提示端口被占用

**解决**：桌面版使用随机端口，通常不会出现此问题。如遇到，请重启应用。

### 3. 文件上传失败

**问题**：无法上传文件

**解决**：检查存储目录权限，确保应用有写入权限。

## 发布流程

1. 更新版本号（`package.json`）
2. 执行完整构建：`npm run build`
3. 测试功能完整性
4. 生成安装包：`npm run dist`
5. 上传安装包到发布服务器

## 许可证

MIT
