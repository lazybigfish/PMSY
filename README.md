# PMSY - 工程项目管理综合平台

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC.svg)](https://tailwindcss.com/)

PMSY（Project Management System for You）是一款功能完善的工程项目管理综合平台，专为工程建设、软件研发等项目设计。系统支持多项目管理、任务全生命周期跟踪、里程碑阶段管理、供应商管理、团队协作等核心功能，并提供数据分析和报表生成能力。

## 🌟 核心功能特性

### 📁 项目管理
- 多项目并行管理，项目阶段划分与进度跟踪
- 功能模块树形结构，支持父子层级
- 里程碑阶段管理（启动→规划→实施→监控→验收等7阶段）
- 项目成员管理与权限控制

### ✅ 任务中心
- 任务创建、分配、状态流转（待办/进行中/已完成/已取消）
- 优先级管理（低/中/高/紧急）
- 截止日期与提醒设置
- 任务评论与历史记录追踪

### 🏛️ 里程碑管理
- 标准化里程碑模板（适配工程项目全流程）
- 里程碑任务清单管理
- 产出物文档上传与跟踪
- 阶段进度可视化

### 🤝 供应商管理
- 供应商信息库维护
- 付款计划与验收跟踪
- 供应商联系人管理
- 合同文件存储

### 📊 数据分析
- 项目进度统计与趋势图表
- 任务完成情况分析
- 风险统计与预警
- 多维度数据可视化

### 📝 报表系统
- 周报/日报自动生成
- 项目进展摘要
- 风险与问题汇总
- 里程碑进展报告

### 🔐 权限体系
- 基于角色的访问控制（RBAC）
- 三级角色：系统管理员/项目经理/团队成员
- 数据级别隔离
- 操作审计日志

### 📦 其他功能
- 文件管理与云存储（MinIO）
- 热点资讯发布
- 社区论坛交流
- 系统配置管理

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Radix UI + Tailwind CSS
- **状态管理**: Zustand
- **图表**: Recharts
- **表单**: React Hook Form + Zod

### 后端技术栈
- **API 服务**: Express.js (Node.js)
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **文件存储**: MinIO
- **认证**: JWT (jsonwebtoken)

### 部署架构
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **支持环境**: 本地开发、服务器部署、离线部署

## 📁 项目结构

```
PMSY/
├── README.md                   # 项目主文档
├── package.json                # 项目依赖配置
├── .gitignore                  # Git 忽略配置
│
├── src/                        # 前端源码
│   ├── components/             # 通用组件
│   ├── pages/                  # 页面组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具库
│   ├── services/               # API 服务
│   ├── types/                  # TypeScript 类型
│   └── App.tsx                 # 应用入口
│
├── api-new/                    # 后端 API
│   ├── src/                    # API 源码
│   │   ├── routes/             # API 路由
│   │   ├── middleware/         # 中间件
│   │   └── index.ts            # 应用入口
│   ├── database/               # 数据库相关
│   │   ├── migrations/         # 数据库迁移
│   │   └── seeds/              # 种子数据
│   └── package.json            # API 依赖配置
│
├── config/                     # 配置文件
│   ├── docker/                 # Docker 配置
│   │   └── docker-compose.yml
│   ├── nginx/                  # Nginx 配置
│   │   └── nginx.conf
│   └── env/                    # 环境变量模板
│       ├── .env.example
│       └── .env.production.example
│
├── deploy/                     # 部署相关
│   ├── fresh-install/          # 全新部署
│   ├── update/                 # 更新部署
│   └── scripts/                # 部署脚本
│
├── scripts/                    # 开发脚本
│   ├── dev/                    # 开发辅助脚本
│   └── db/                     # 数据库脚本
│
├── tests/                      # 测试文件
├── public/                     # 静态资源
└── .trae/                      # AI 助手配置
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+ 或 yarn 1.22+
- Docker & Docker Compose (用于本地开发)

### 1. 克隆项目

```bash
git clone <repository-url>
cd PMSY
```

### 2. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd api-new && npm install && cd ..
```

### 3. 配置环境变量

```bash
# 复制开发环境配置
cp config/env/.env.example .env
cp config/env/.env.example api-new/.env

# 编辑配置
vim .env
```

### 4. 启动本地服务

```bash
# 启动数据库服务
cd config/docker && docker-compose up -d postgres redis minio && cd ../..

# 运行数据库迁移
cd api-new && npm run db:migrate && npm run db:seed && cd ..

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用

**默认登录信息：**
- 用户名：`admin`
- 密码：`Willyou@2026`

> 注意：登录时使用**用户名**而非邮箱

## 📦 部署指南

### 方式一：在线部署（推荐）

适用于服务器可访问互联网的场景：

```bash
# 执行全新部署脚本
./deploy/fresh-install/deploy.sh

# 选择模式1: 在线部署
```

### 方式二：半离线部署

适用于服务器无法访问 Docker Hub：

```bash
# 执行部署脚本
./deploy/fresh-install/deploy.sh

# 选择模式2: 半离线部署
```

### 方式三：完全离线部署

适用于完全隔离的网络环境：

```bash
# 生成离线部署包
./deploy/fresh-install/deploy.sh

# 选择模式3: 完全离线部署
# 然后将生成的离线包上传到目标服务器
```

详细部署说明请参考 [deploy/README.md](deploy/README.md)

## 🔧 配置说明

### 环境变量文件

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `.env` | 开发环境 | 本地开发 |
| `config/env/.env.production` | 生产环境 | 服务器部署 |
| `config/env/.env.example` | 开发环境模板 | 参考 |

### 关键配置项

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=pmsy
DB_PASSWORD=your_secure_password
DB_NAME=pmsy

# Redis 配置
REDIS_URL=redis://localhost:6379

# MinIO 配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secure_secret

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# API 配置
API_URL=http://localhost:3001
PORT=3001
```

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行类型检查
npm run check

# 运行 ESLint
npm run lint
```

## 📝 开发规范

### 代码风格
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码

### 提交规范
- 使用语义化提交信息
- 重要更改需更新文档

### 分支管理
- `main`: 生产分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

## 🐛 故障排查

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库服务状态
   cd config/docker && docker-compose ps postgres
   
   # 查看数据库日志
   docker-compose logs postgres
   ```

2. **前端构建失败**
   ```bash
   # 清除缓存重新构建
   rm -rf node_modules dist
   npm install
   npm run build
   ```

3. **部署失败**
   请参考 [deploy/README.md](deploy/README.md)

## 📚 文档

- [部署指南](deploy/README.md) - 详细部署说明
- [全新部署](deploy/fresh-install/README.md) - 全新部署说明
- [更新部署](deploy/update/README.md) - 更新部署说明

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

[MIT](LICENSE) © PMSY Team

## 💬 联系方式

- 项目主页: [项目链接]
- 问题反馈: [Issues 链接]
- 邮箱: [联系邮箱]

---

**注意**: 本项目仅供学习和参考使用，生产环境部署前请确保已进行充分测试。
