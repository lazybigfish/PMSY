# PMSY - 项目管理系统

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.95.3-3ECF8E.svg)](https://supabase.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC.svg)](https://tailwindcss.com/)

PMSY 是一个功能完善的项目管理系统，专为工程项目管理设计，支持多项目管理、任务跟踪、供应商管理、里程碑管理等功能。

## 🌟 功能特性

- **项目管理**: 支持多项目并行管理，项目阶段划分，进度跟踪
- **任务管理**: 任务分配、状态跟踪、优先级设置、截止日期管理
- **里程碑管理**: 项目关键节点管理，支持版本控制
- **供应商管理**: 供应商信息维护，付款计划跟踪
- **文件管理**: 项目文档上传、分类、版本管理
- **报表系统**: 项目进度报表、统计图表导出
- **权限控制**: 基于角色的权限管理（RBAC）
- **实时通知**: 任务变更、评论等实时通知

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
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth (GoTrue)
- **实时**: Supabase Realtime
- **存储**: Supabase Storage

### 部署架构
- **容器化**: Docker + Docker Compose
- **网关**: Kong API Gateway
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
├── api/                        # 后端 API
│   ├── routes/                 # API 路由
│   ├── lib/                    # 后端工具库
│   ├── app.ts                  # Express 应用
│   └── server.ts               # 服务器入口
│
├── config/                     # 配置文件
│   ├── docker/                 # Docker 配置
│   │   ├── docker-compose.yml
│   │   └── Dockerfile.api
│   ├── nginx/                  # Nginx 配置
│   │   └── nginx.conf
│   └── env/                    # 环境变量模板
│       ├── .env.example
│       ├── .env.production
│       └── .env.supabase
│
├── deploy/                     # 部署相关
│   ├── fresh-install/          # 全新部署
│   ├── update/                 # 更新部署
│   ├── scripts/                # 部署脚本
│   ├── config/                 # 部署配置
│   └── docs/                   # 部署文档
│
├── docs/                       # 项目文档
│   ├── DEPLOY.md               # 部署指南
│   ├── DEPLOY_CHECKLIST.md     # 部署检查清单
│   └── DATABASE_DIFF_REPORT.md # 数据库差异报告
│
├── scripts/                    # 开发脚本
│   ├── dev/                    # 开发辅助脚本
│   └── db/                     # 数据库脚本
│
├── supabase/                   # Supabase 配置
│   ├── migrations/             # 数据库迁移
│   ├── functions/              # Edge Functions
│   └── volumes/                # 数据卷配置
│
├── tests/                      # 测试文件
├── public/                     # 静态资源
└── .trae/                      # AI 助手配置
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+ 或 yarn 1.22+
- Docker & Docker Compose (可选，用于本地 Supabase)

### 1. 克隆项目

```bash
git clone <repository-url>
cd PMSY
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制开发环境配置
cp config/env/.env.example .env

# 编辑配置
vim .env
```

### 4. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run client:dev    # 前端
npm run server:dev    # 后端
```

访问 http://localhost:5173 查看应用

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

详细部署说明请参考 [docs/DEPLOY.md](docs/DEPLOY.md)

## 🔧 配置说明

### 环境变量文件

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `.env` | 开发环境 | 本地开发 |
| `config/env/.env.production` | 生产环境 | 服务器部署 |
| `config/env/.env.supabase` | 完整配置 | 服务器部署参考 |

### 关键配置项

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 服务器配置（生产环境）
API_EXTERNAL_URL=http://your-server-ip:8000
SITE_URL=http://your-server-ip
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
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
   # 检查 Supabase 服务状态
   docker-compose ps
   
   # 查看数据库日志
   docker-compose logs db
   ```

2. **前端构建失败**
   ```bash
   # 清除缓存重新构建
   rm -rf node_modules dist
   npm install
   npm run build
   ```

3. **部署失败**
   请参考 [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md)

## 📚 文档

- [部署指南](docs/DEPLOY.md) - 详细部署说明
- [部署检查清单](docs/DEPLOY_CHECKLIST.md) - 部署前检查项
- [API 文档](api/README.md) - 后端 API 说明
- [数据库文档](supabase/migrations/README.md) - 数据库迁移说明

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
