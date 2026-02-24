# ==========================================
# 🔄 PMSY 更新部署脚本 (update) v2.0
# ==========================================
#
# 【提示】此脚本用于更新现有 PMSY 系统，保留所有数据
# 适用场景：代码更新、配置更新、前端更新、数据库迁移
#
# 特性：
# - 自动检测并执行数据库迁移（支持 Docker 容器）
# - 支持迁移回滚（失败时自动回滚）
# - 保留所有现有数据
# - 迁移记录持久化存储
#
# 使用方法:
#   .\deploy\windows\update\deploy.ps1
#
# ==========================================

param(
    [string]$ServerIp = "",
    [string]$ServerUser = "",
    [string]$DeployDir = ""
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Red = "`e[91m"
$Cyan = "`e[96m"
$Reset = "`e[0m"

Write-Host "$Blue==========================================$Reset"
Write-Host "$Blue🔄 PMSY 更新部署脚本 (update) v2.0$Reset"
Write-Host "$Blue==========================================$Reset"
Write-Host ""

Write-Host "$Yellowℹ️  此脚本将:$Reset"
Write-Host "$Yellow   - 保留所有现有数据$Reset"
Write-Host "$Yellow   - 检测并执行数据库迁移（Docker 模式）$Reset"
Write-Host "$Yellow   - 更新前端代码$Reset"
Write-Host "$Yellow   - 更新 API 代码$Reset"
Write-Host "$Yellow   - 重新构建 API Docker 镜像$Reset"
Write-Host "$Yellow   - 重启服务$Reset"
Write-Host ""

# 获取项目根目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# 配置默认值
if ([string]::IsNullOrEmpty($ServerIp)) {
    $ServerIp = $env:DEPLOY_SERVER_IP
    if ([string]::IsNullOrEmpty($ServerIp)) {
        $ServerIp = "43.136.69.250"  # 默认服务器IP
    }
}

if ([string]::IsNullOrEmpty($ServerUser)) {
    $ServerUser = $env:DEPLOY_SERVER_USER
    if ([string]::IsNullOrEmpty($ServerUser)) {
        $ServerUser = "ubuntu"  # 默认用户名
    }
}

if ([string]::IsNullOrEmpty($DeployDir)) {
    $DeployDir = $env:DEPLOY_REMOTE_DIR
    if ([string]::IsNullOrEmpty($DeployDir)) {
        $DeployDir = "/opt/pmsy"  # 默认部署目录
    }
}

Write-Host "$Cyan部署配置:$Reset"
Write-Host "  服务器: $ServerUser@$ServerIp"
Write-Host "  部署目录: $DeployDir"
Write-Host ""

# ==========================================
# 步骤 1: 检查环境
# ==========================================
Write-Host "$Green[1/7] 检查环境...$Reset"
cd $ProjectRoot

# 检查环境配置文件
$EnvFile = ""
if (Test-Path "$ProjectRoot\config\env\.env.production") {
    $EnvFile = "$ProjectRoot\config\env\.env.production"
} elseif (Test-Path "$ProjectRoot\config\env\.env.example") {
    $EnvFile = "$ProjectRoot\config\env\.env.example"
} else {
    Write-Host "$Red❌ 错误: 未找到环境配置文件$Reset"
    Write-Host "   请创建 config\env\.env.production 文件"
    exit 1
}

Write-Host "$Green   使用配置文件: $EnvFile$Reset"

# ==========================================
# 步骤 2: 检查服务器连接
# ==========================================
Write-Host "$Green[2/7] 检查服务器连接...$Reset"
try {
    # 测试服务器连接
    $TestConnection = Test-Connection -ComputerName $ServerIp -Count 1 -Quiet
    if (!$TestConnection) {
        throw "无法ping通服务器"
    }
    
    # 测试SSH连接
    $SshTest = ssh $ServerUser@$ServerIp "echo OK"
    if ($SshTest -ne "OK") {
        throw "SSH连接失败"
    }
    
    Write-Host "$Green   ✅ 服务器连接正常$Reset"
} catch {
    Write-Host "$Red❌ 错误: 无法连接到服务器$Reset"
    Write-Host "   错误信息: $($_.Exception.Message)"
    exit 1
}

# ==========================================
# 步骤 3: 构建前端
# ==========================================
Write-Host "$Green[3/7] 构建前端...$Reset"

try {
    # 构建前端 - 使用生产环境配置
    Write-Host "   使用 $EnvFile 进行生产环境构建"
    Write-Host "   开始构建前端（可能需要 30-60 秒）..."
    
    # 使用 --mode production 构建
    $env:VITE_ENV_FILE = $EnvFile
    npm run build -- --mode production
    $BuildExitCode = $LASTEXITCODE
    
    if ($BuildExitCode -ne 0) {
        throw "前端构建失败，退出码: $BuildExitCode"
    }
    
    # 显示构建结果
    $DistSize = Get-ChildItem -Path "$ProjectRoot\dist" -Recurse | Measure-Object -Property Length -Sum
    $FileCount = (Get-ChildItem -Path "$ProjectRoot\dist" -Recurse -File).Count
    Write-Host "$Green   ✅ 前端构建完成$Reset"
    Write-Host "   构建产物大小: $([math]::Round($DistSize.Sum / 1MB, 2)) MB"
    Write-Host "   文件数量: $FileCount"
} catch {
    Write-Host "$Red   ❌ 前端构建失败: $($_.Exception.Message)$Reset"
    Write-Host "   请检查错误信息并修复问题后重试"
    exit 1
}

# ==========================================
# 步骤 4: 构建后端 API
# ==========================================
Write-Host "$Green[4/7] 构建后端 API...$Reset"

try {
    cd "$ProjectRoot\api-new"
    if (!(Test-Path "node_modules")) {
        Write-Host "   安装依赖..."
        npm install
    }
    Write-Host "   编译 TypeScript..."
    npm run build
    $ApiBuildExitCode = $LASTEXITCODE
    
    if ($ApiBuildExitCode -ne 0) {
        throw "后端构建失败，退出码: $ApiBuildExitCode"
    }
    
    # 显示构建结果
    $ApiDistSize = Get-ChildItem -Path "$ProjectRoot\api-new\dist" -Recurse | Measure-Object -Property Length -Sum
    $ApiFileCount = (Get-ChildItem -Path "$ProjectRoot\api-new\dist" -Recurse -File).Count
    Write-Host "$Green   ✅ 后端构建完成$Reset"
    Write-Host "   构建产物大小: $([math]::Round($ApiDistSize.Sum / 1MB, 2)) MB"
    Write-Host "   文件数量: $ApiFileCount"
} catch {
    Write-Host "$Red   ❌ 后端构建失败: $($_.Exception.Message)$Reset"
    Write-Host "   请检查错误信息并修复问题后重试"
    exit 1
}

cd $ProjectRoot

# ==========================================
# 步骤 5: 复制文件到服务器
# ==========================================
Write-Host "$Green[5/7] 复制文件到服务器...$Reset"
try {
    Write-Host "   复制前端 dist..."
    scp -r "$ProjectRoot\dist/*" "$ServerUser@$ServerIp:$DeployDir/dist/"
    
    Write-Host "   复制后端 dist..."
    scp -r "$ProjectRoot\api-new\dist/*" "$ServerUser@$ServerIp:$DeployDir/api-new/dist/"
    
    Write-Host "   复制后端 package.json..."
    scp "$ProjectRoot\api-new\package.json" "$ServerUser@$ServerIp:$DeployDir/api-new/"
    
    Write-Host "   复制后端 Dockerfile..."
    scp "$ProjectRoot\api-new\Dockerfile" "$ServerUser@$ServerIp:$DeployDir/api-new/"
    
    Write-Host "   复制数据库迁移文件..."
    if (Test-Path "$ProjectRoot\api-new\database\migrations") {
        # 确保服务器目录存在
        ssh $ServerUser@$ServerIp "mkdir -p '$DeployDir/api-new/database/migrations'"
        scp -r "$ProjectRoot\api-new\database\migrations/*" "$ServerUser@$ServerIp:$DeployDir/api-new/database/migrations/"
    }
    
    Write-Host "   复制迁移脚本..."
    if (Test-Path "$ProjectRoot\api-new\database\migrate.sh") {
        scp "$ProjectRoot\api-new\database\migrate.sh" "$ServerUser@$ServerIp:$DeployDir/api-new/database/"
    }
    
    Write-Host "   复制 docker-compose.yml..."
    if (Test-Path "$ProjectRoot\config\docker\docker-compose.yml") {
        scp "$ProjectRoot\config\docker\docker-compose.yml" "$ServerUser@$ServerIp:$DeployDir/"
    }
    
    Write-Host "   复制 nginx.conf..."
    if (Test-Path "$ProjectRoot\config\nginx\nginx.conf") {
        scp "$ProjectRoot\config\nginx\nginx.conf" "$ServerUser@$ServerIp:$DeployDir/nginx.conf"
    }
    
    Write-Host "$Green   ✅ 文件复制完成$Reset"
} catch {
    Write-Host "$Red❌ 错误: 文件复制失败$Reset"
    Write-Host "   错误信息: $($_.Exception.Message)"
    exit 1
}

# ==========================================
# 步骤 6: 执行数据库迁移
# ==========================================
Write-Host "$Green[6/7] 执行数据库迁移...$Reset"
try {
    Write-Host "   检查服务器容器状态..."
    
    # 先在服务器上检查容器状态
    $ContainerStatus = ssh $ServerUser@$ServerIp "cd '$DeployDir' && docker-compose ps postgres 2>/dev/null | grep -E 'Up|running' || echo 'NOT_RUNNING'"
    
    if ($ContainerStatus -eq "NOT_RUNNING") {
        Write-Host "$Yellow   ⚠️ PostgreSQL 容器未运行，尝试启动...$Reset"
        ssh $ServerUser@$ServerIp "cd '$DeployDir' && docker-compose up -d postgres"
        Start-Sleep -Seconds 5
    }
    
    Write-Host "   使用 Docker 模式执行迁移..."
    
    # 在服务器上使用 Docker 执行数据库迁移
    $MigrationResult = ssh $ServerUser@$ServerIp "cd '$DeployDir' && sudo bash api-new/database/migrate.sh --docker-compose"
    $MigrationExitCode = $LASTEXITCODE
    
    if ($MigrationExitCode -ne 0) {
        throw "数据库迁移失败，退出码: $MigrationExitCode"
    }
    
    Write-Host "$Green   ✅ 数据库迁移完成$Reset"
} catch {
    Write-Host ""
    Write-Host "$Red==========================================$Reset"
    Write-Host "$Red❌ 数据库迁移失败$Reset"
    Write-Host "$Red==========================================$Reset"
    Write-Host ""
    Write-Host "   错误信息: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "   请检查数据库连接和迁移文件"
    Write-Host ""
    Write-Host "   手动调试命令:"
    Write-Host "     ssh $ServerUser@$ServerIp"
    Write-Host "     cd $DeployDir"
    Write-Host "     sudo docker-compose ps"
    Write-Host "     sudo docker-compose logs postgres"
    Write-Host ""
    Write-Host "   手动执行迁移:"
    Write-Host "     sudo bash api-new/database/migrate.sh --docker-compose"
    exit 1
}

# ==========================================
# 步骤 7: 重新构建并重启服务
# ==========================================
Write-Host "$Green[7/7] 重新构建并重启服务...$Reset"
try {
    # 重启 API 服务
    ssh $ServerUser@$ServerIp "cd '$DeployDir' && sudo docker-compose up -d --build --force-recreate api"
    
    # 重启 Nginx 服务
    ssh $ServerUser@$ServerIp "cd '$DeployDir' && sudo docker-compose restart nginx"
    
    Write-Host "$Green   ✅ 服务已重启$Reset"
} catch {
    Write-Host "$Red❌ 错误: 服务重启失败$Reset"
    Write-Host "   错误信息: $($_.Exception.Message)"
    exit 1
}

# ==========================================
# 步骤 8: 验证部署
# ==========================================
Write-Host ""
Write-Host "$Green==========================================$Reset"
Write-Host "$Green🎉 更新部署完成!$Reset"
Write-Host "$Green==========================================$Reset"
Write-Host ""
Write-Host "访问地址:"
Write-Host "  - 前端: http://$ServerIp"
Write-Host "  - API: http://$ServerIp/api/health"
Write-Host ""
Write-Host "$Yellow请测试登录功能确认更新成功$Reset"
Write-Host ""
Write-Host "$Blue查看日志:$Reset"
Write-Host "  ssh $ServerUser@$ServerIp 'cd $DeployDir && sudo docker-compose logs -f api'"
Write-Host ""
Write-Host "$Blue查看迁移记录:$Reset"
Write-Host "  ssh $ServerUser@$ServerIp 'cd $DeployDir && sudo docker-compose exec postgres psql -U pmsy -d pmsy -c "SELECT filename, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at DESC LIMIT 10;"'"
Write-Host ""
