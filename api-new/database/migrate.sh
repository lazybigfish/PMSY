#!/bin/bash
# ==========================================
# PMSY 数据库迁移脚本 (Docker 版本)
# ==========================================
# 此脚本用于在更新部署时自动执行数据库迁移
# 支持 Docker 容器内的 PostgreSQL
# 支持幂等执行，可以重复运行
#
# 特性：
# - 自动检测并跳过已存在的表/对象
# - 确保开发和生产环境数据库结构一致
# - 记录迁移历史，避免重复执行
#
# 使用方法:
#   ./database/migrate.sh [选项]
#
# 选项:
#   --docker          使用 Docker 执行（默认自动检测）
#   --docker-compose  使用 docker-compose 执行（推荐）
#   --local           使用本地 psql 执行
#   --check-only      只检查，不执行迁移
#
# 环境变量:
#   DB_HOST - 数据库主机 (默认: postgres)
#   DB_PORT - 数据库端口 (默认: 5432)
#   DB_USER - 数据库用户 (默认: pmsy)
#   DB_PASSWORD - 数据库密码
#   DB_NAME - 数据库名 (默认: pmsy)
#   DOCKER_CONTAINER - Docker 容器名 (默认: pmsy-postgres)
# ==========================================

# 注意：不使用 set -e，因为我们自己处理错误
# set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

# 数据库连接配置
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-pmsy}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-pmsy}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-pmsy-postgres}"

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# 执行模式：auto|docker|docker-compose|local
EXEC_MODE="auto"
CHECK_ONLY=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            EXEC_MODE="docker"
            shift
            ;;
        --docker-compose)
            EXEC_MODE="docker-compose"
            shift
            ;;
        --local)
            EXEC_MODE="local"
            shift
            ;;
        --check-only)
            CHECK_ONLY=true
            shift
            ;;
        *)
            echo "未知选项: $1"
            exit 1
            ;;
    esac
done

# 检测执行模式
if [ "$EXEC_MODE" = "auto" ]; then
    if command -v docker-compose &> /dev/null && docker-compose ps 2>/dev/null | grep -q "postgres"; then
        EXEC_MODE="docker-compose"
    elif command -v docker &> /dev/null && docker ps 2>/dev/null | grep -q "$DOCKER_CONTAINER"; then
        EXEC_MODE="docker"
    elif command -v psql &> /dev/null; then
        EXEC_MODE="local"
    else
        echo -e "${RED}❌ 错误: 未找到可用的数据库连接方式${NC}"
        echo "请安装 psql 或确保 Docker 容器正在运行"
        exit 1
    fi
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🔄 PMSY 数据库迁移脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${CYAN}执行模式: $EXEC_MODE${NC}"
if [ "$CHECK_ONLY" = true ]; then
    echo -e "${CYAN}运行模式: 仅检查${NC}"
fi
echo -e "${CYAN}数据库配置:${NC}"
echo "  主机: $DB_HOST:$DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 构建执行命令 - 使用文件输入而不是 -c 参数
build_psql_file_cmd() {
    local file="$1"
    case $EXEC_MODE in
        docker-compose)
            echo "docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -f -"
            ;;
        docker)
            echo "docker exec -i $DOCKER_CONTAINER psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -f -"
            ;;
        local)
            export PGPASSWORD="$DB_PASSWORD"
            echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -f -"
            ;;
    esac
}

# 执行 SQL 文件的包装函数 - 通过 stdin 传递
exec_sql_file() {
    local file="$1"
    local cmd
    cmd=$(build_psql_file_cmd "$file")
    cat "$file" | eval "$cmd" 2>&1
    return 0
}

# 执行单行 SQL 的包装函数
exec_sql() {
    local sql="$1"
    local cmd
    case $EXEC_MODE in
        docker-compose)
            cmd="docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -c \"$sql\""
            ;;
        docker)
            cmd="docker exec -i $DOCKER_CONTAINER psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -c \"$sql\""
            ;;
        local)
            export PGPASSWORD="$DB_PASSWORD"
            cmd="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=0 -c \"$sql\""
            ;;
    esac
    eval "$cmd" 2>&1
    return 0
}

# 检查必要的环境变量
if [ "$EXEC_MODE" = "local" ] && [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 错误: 本地模式需要设置 DB_PASSWORD 环境变量${NC}"
    exit 1
fi

# 检查数据库连接
echo -e "${YELLOW}[1/4] 检查数据库连接...${NC}"

# 先检查 Docker 容器状态
if [ "$EXEC_MODE" = "docker-compose" ]; then
    if ! docker-compose ps 2>/dev/null | grep -E "postgres.*Up" > /dev/null; then
        echo -e "${RED}❌ 错误: PostgreSQL 容器未运行${NC}"
        echo ""
        echo "启动容器: docker-compose up -d postgres"
        exit 1
    fi
elif [ "$EXEC_MODE" = "docker" ]; then
    if ! docker ps 2>/dev/null | grep -q "$DOCKER_CONTAINER"; then
        echo -e "${RED}❌ 错误: PostgreSQL 容器未运行${NC}"
        exit 1
    fi
fi

# 测试数据库连接
if ! exec_sql "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 无法连接到数据库${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ 数据库连接正常${NC}"

# 创建迁移记录表（如果不存在）
echo -e "${YELLOW}[2/4] 初始化迁移记录表...${NC}"
INIT_SQL="CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    checksum TEXT,
    execution_time_ms INTEGER,
    status TEXT DEFAULT 'success'
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);"

exec_sql "$INIT_SQL" > /dev/null 2>&1
echo -e "${GREEN}   ✅ 迁移记录表已就绪${NC}"

# 确保基础函数存在（用于触发器）
echo -e "${YELLOW}   检查基础函数...${NC}"
FUNCTION_SQL="CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';"
exec_sql "$FUNCTION_SQL" > /dev/null 2>&1
echo -e "${GREEN}   ✅ 基础函数已就绪${NC}"

# 获取已执行的迁移列表
echo -e "${YELLOW}[3/4] 检查待执行迁移...${NC}"
EXECUTED_MIGRATIONS=$(exec_sql "SELECT filename FROM schema_migrations WHERE status = 'success' ORDER BY filename" | tail -n +3 | head -n -2 2>/dev/null || echo "")

# 获取所有迁移文件
ALL_MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort | xargs -n1 basename)

# 找出待执行的迁移
PENDING_MIGRATIONS=""
SKIPPED_COUNT=0
for migration in $ALL_MIGRATIONS; do
    if echo "$EXECUTED_MIGRATIONS" | grep -q "^${migration}$"; then
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    else
        PENDING_MIGRATIONS="$PENDING_MIGRATIONS $migration"
    fi
done

echo -e "${CYAN}   数据库中已有: $SKIPPED_COUNT 个迁移记录${NC}"
echo -e "${CYAN}   待执行迁移: $(echo $PENDING_MIGRATIONS | wc -w) 个${NC}"

if [ -z "$PENDING_MIGRATIONS" ]; then
    echo -e "${GREEN}   ✅ 所有迁移已是最新${NC}"
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}🎉 数据库迁移完成（无需执行）${NC}"
    echo -e "${GREEN}==========================================${NC}"
    exit 0
fi

if [ "$CHECK_ONLY" = true ]; then
    echo ""
    echo -e "${YELLOW}待执行的迁移文件:${NC}"
    for migration in $PENDING_MIGRATIONS; do
        echo "   - $migration"
    done
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}ℹ️  仅检查模式，未执行任何迁移${NC}"
    echo -e "${BLUE}==========================================${NC}"
    exit 0
fi

# 执行迁移
echo ""
echo -e "${YELLOW}[4/4] 执行数据库迁移...${NC}"
echo ""

FAILED_MIGRATIONS=""
SUCCESS_COUNT=0
ALREADY_EXISTS_COUNT=0

for migration in $PENDING_MIGRATIONS; do
    migration_file="$MIGRATIONS_DIR/$migration"
    
    echo -e "${CYAN}执行: $migration${NC}"
    
    # 计算文件校验和
    CHECKSUM=$(md5 -q "$migration_file" 2>/dev/null || md5sum "$migration_file" | cut -d' ' -f1)
    
    # 记录开始时间
    START_TIME=$(date +%s%N)
    
    # 执行迁移 - 通过 stdin 传递 SQL 文件内容
    RESULT=$(exec_sql_file "$migration_file")
    
    # 检查执行结果
    if echo "$RESULT" | grep -qiE "ERROR|错误|FATAL|致命"; then
        # 检查是否是"已存在"的错误
        if echo "$RESULT" | grep -qiE "already exists|relation.*already exists|duplicate key|已经存在"; then
            echo -e "${GRAY}   ⏭️  已存在，跳过${NC}"
            ALREADY_EXISTS_COUNT=$((ALREADY_EXISTS_COUNT + 1))
            
            # 记录为已执行（因为对象已存在，相当于已迁移）
            END_TIME=$(date +%s%N)
            EXECUTION_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
            INSERT_SQL="INSERT INTO schema_migrations (filename, checksum, execution_time_ms, status) VALUES ('$migration', '$CHECKSUM', $EXECUTION_TIME, 'success') ON CONFLICT (filename) DO UPDATE SET status = 'success', execution_time_ms = $EXECUTION_TIME"
            exec_sql "$INSERT_SQL" > /dev/null 2>&1
        else
            echo -e "${RED}   ❌ 失败${NC}"
            ERROR_MSG=$(echo "$RESULT" | grep -iE "ERROR|错误" | head -1 | cut -c1-100)
            echo -e "${GRAY}   错误: $ERROR_MSG${NC}"
            FAILED_MIGRATIONS="$FAILED_MIGRATIONS $migration"
        fi
    else
        # 计算执行时间
        END_TIME=$(date +%s%N)
        EXECUTION_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
        
        # 记录迁移
        INSERT_SQL="INSERT INTO schema_migrations (filename, checksum, execution_time_ms, status) VALUES ('$migration', '$CHECKSUM', $EXECUTION_TIME, 'success') ON CONFLICT (filename) DO UPDATE SET status = 'success', execution_time_ms = $EXECUTION_TIME"
        exec_sql "$INSERT_SQL" > /dev/null 2>&1
        
        echo -e "${GREEN}   ✅ 成功 (${EXECUTION_TIME}ms)${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
done

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}🎉 数据库迁移完成!${NC}"
echo -e "${GREEN}   成功: $SUCCESS_COUNT 个迁移${NC}"
echo -e "${GRAY}   跳过（已存在）: $ALREADY_EXISTS_COUNT 个迁移${NC}"
if [ -n "$FAILED_MIGRATIONS" ]; then
    echo -e "${RED}   失败:$(echo $FAILED_MIGRATIONS | wc -w) 个迁移${NC}"
    echo ""
    echo -e "${RED}失败的迁移:${NC}"
    for migration in $FAILED_MIGRATIONS; do
        echo "   - $migration"
    done
fi
echo -e "${BLUE}==========================================${NC}"

if [ -n "$FAILED_MIGRATIONS" ]; then
    exit 1
fi
exit 0
