## 项目现状分析

当前项目根目录存在以下问题：
1. 配置文件散乱（多个 .env 文件、docker-compose.yml、nginx.conf 等）
2. 根目录下有多个 README 和文档文件
3. scripts 目录包含开发和生产混合脚本
4. 缺少统一的项目入口文档

## 重构计划

### 第一阶段：配置文件整理

#### 1. 创建 `config/` 目录存放所有配置文件
```
config/
├── docker/
│   ├── docker-compose.yml      # 从根目录移动
│   ├── docker-compose.prod.yml # 生产环境配置（如有）
│   └── Dockerfile.api          # 从根目录移动
├── nginx/
│   └── nginx.conf              # 从根目录移动
├── env/
│   ├── .env.example            # 开发环境示例
│   ├── .env.production         # 生产环境配置
│   └── .env.supabase           # Supabase 完整配置
└── tsconfig/
    ├── tsconfig.json           # 从根目录移动
    └── tsconfig.app.json       # 如有
```

**需要更新的引用**：
- `deploy/fresh-install/deploy.sh` 中的 docker-compose.yml 路径
- `deploy/fresh-install/deploy.sh` 中的 nginx.conf 路径
- `deploy/fresh-install/deploy.sh` 中的 Dockerfile.api 路径
- `package.json` 中的脚本路径（如有）

#### 2. 整理文档文件
```
docs/
├── README.md                   # 项目主文档（新建，整合现有内容）
├── DEPLOY.md                   # 从 README-DEPLOY.md 移动并重命名
├── DEPLOY_CHECKLIST.md         # 从根目录移动
├── DATABASE_DIFF_REPORT.md     # 从根目录移动
├── architecture/
│   └── technical.md            # 技术架构文档（从 .trae/documents 整合）
└── modules/
    └── README.md               # 模块说明（从 .trae/documents 整合）
```

**需要更新的引用**：
- 删除根目录下的 README-DEPLOY.md、DEPLOY_CHECKLIST.md、DATABASE_DIFF_REPORT.md
- 更新所有内部文档链接

#### 3. 整理脚本文件
```
scripts/
├── dev/                        # 开发脚本
│   ├── seed-data.js            # 从 scripts/ 移动
│   ├── create-admin.js         # 从 scripts/ 移动
│   └── check-*.js              # 其他检查脚本
├── deploy/                     # 部署相关脚本（已存在，保持不变）
│   ├── fresh-install/
│   ├── update/
│   └── scripts/
└── db/                         # 数据库脚本
    ├── migrations/             # 从 supabase/migrations 创建符号链接或移动
    └── init/                   # 初始化脚本
```

**需要更新的引用**：
- `package.json` 中的脚本路径
- 部署脚本中的数据库迁移路径

#### 4. 清理根目录文件
删除或移动以下文件：
- `deploy.sh` → 删除（已整合到 deploy/fresh-install/）
- `generate-jwt.js` → 移动到 scripts/dev/
- `README-DEPLOY.md` → 移动到 docs/
- `DEPLOY_CHECKLIST.md` → 移动到 docs/
- `DATABASE_DIFF_REPORT.md` → 移动到 docs/
- `nginx.conf` → 移动到 config/nginx/
- `docker-compose.yml` → 移动到 config/docker/
- `Dockerfile.api` → 移动到 config/docker/

### 第二阶段：更新引用路径

#### 需要修改的文件清单：

1. **deploy/fresh-install/deploy.sh**
   - 更新 docker-compose.yml 引用路径
   - 更新 nginx.conf 引用路径
   - 更新 Dockerfile.api 引用路径

2. **deploy/update/deploy.sh**
   - 更新配置文件路径

3. **package.json**
   - 如有需要，更新脚本路径

4. **.gitignore**
   - 更新忽略路径（config/docker/.env 等）

### 第三阶段：创建项目主 README

新建根目录 `README.md`，包含：
- 项目简介
- 技术栈
- 快速开始
- 目录结构说明
- 开发指南
- 部署指南
- 贡献指南

## 预期最终目录结构

```
PMSY/
├── README.md                   # 项目主文档
├── package.json
├── .gitignore
├── config/                     # 所有配置文件
│   ├── docker/
│   ├── nginx/
│   └── env/
├── docs/                       # 项目文档
│   ├── README.md
│   ├── DEPLOY.md
│   ├── DEPLOY_CHECKLIST.md
│   └── ...
├── src/                        # 前端源码（保持不变）
├── api/                        # 后端 API（保持不变）
├── scripts/                    # 脚本文件
│   ├── dev/
│   └── db/
├── deploy/                     # 部署相关（保持不变）
├── supabase/                   # Supabase 配置（保持不变）
├── tests/                      # 测试文件（保持不变）
├── public/                     # 静态资源（保持不变）
├── .trae/                      # AI 助手配置（保持不变）
└── .deploy-cache/              # 部署缓存（已配置 gitignore）
```

## 实施建议

1. **分步实施**：建议按阶段逐步执行，每完成一个阶段进行测试
2. **备份重要**：移动文件前确保已提交到 git
3. **测试验证**：每次修改后运行部署脚本验证路径是否正确
4. **文档同步**：及时更新相关文档中的路径引用

请确认此计划后，我将开始执行具体的文件移动和引用更新操作。