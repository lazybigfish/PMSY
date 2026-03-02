# ==========================================
# 🆕 PMSY 全新部署脚本 v2.0 (fresh-install)
# ==========================================
#
# 【执行环境】此脚本必须在开发机上执行！
#
# 特性：
# - 使用合并后的 SQL 初始化文件（database/init/）
# - 无需执行 ALTER 语句，部署更快更稳定
# - 支持在线/半离线/完全离线三种部署模式
# - 架构检测和跨平台构建支持
# - 详细的配置验证和错误处理
#
# 使用方法:
#   .\deploy\windows\fresh-install\deploy.ps1
#
# =========================================

param(
    [string]$ServerIp = "",
    [string]$ServerPort = "",
    [string]$ServerUser = "",
    [string]$DeployDir = ""
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Cyan = "`e[96m"
$Reset = "`e[0m"

Write-Host "$Red==========================================$Reset"
Write-Host "$Red🆕 PMSY 全新部署脚本 (fresh-install)$Reset"
Write-Host "$Red==========================================$Reset"
Write-Host ""

# 获取项目根目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

cd $ProjectDir

if (!(Test-Path "$ProjectDir\config\docker\docker-compose.yml") -or !(Test-Path "$ProjectDir\deploy")) {
    Write-Host "$Red❌ 错误: 请在项目根目录执行此脚本$Reset"
    Write-Host "   正确用法: .\deploy\windows\fresh-install\deploy.ps1"
    exit 1
}

Write-Host "$Green✅ 执行环境检查通过$Reset"
Write-Host ""

# ==========================================
# 步骤 0: 配置一致性检查
# ==========================================
Write-Host "$Blue[步骤 0/6] 执行配置一致性检查...$Reset"
Write-Host ""

function Check-ConfigConsistency {
    $Errors = 0
    $Warnings = 0
    
    $DockerComposeFile = "$ProjectDir\config\docker\docker-compose.yml"
    $NginxConfFile = "$ProjectDir\config\nginx\nginx.conf"
    $EnvFile = "$ProjectDir\config\env\.env.production"
    $InitSqlDir = "$ProjectDir\api-new\database\init"
    
    function Write-Error($message) {
        Write-Host "$Red  ❌ 错误: $message$Reset"
        $script:Errors++
    }
    
    function Write-Warning($message) {
        Write-Host "$Yellow  ⚠️  警告: $message$Reset"
        $script:Warnings++
    }
    
    function Write-Success($message) {
        Write-Host "$Green  ✅ $message$Reset"
    }
    
    function Write-Info($message) {
        Write-Host "$Cyan  ℹ️  $message$Reset"
    }
    
    Write-Host "$Cyan  [1/5] 检查配置文件存在性...$Reset"
    if (Test-Path $DockerComposeFile) {
        Write-Success "docker-compose.yml 存在"
    } else {
        Write-Error "docker-compose.yml 不存在"
    }
    
    if (Test-Path $NginxConfFile) {
        Write-Success "nginx.conf 存在"
    } else {
        Write-Error "nginx.conf 不存在"
    }
    
    if (Test-Path $EnvFile) {
        Write-Success ".env.production 存在"
    } else {
        Write-Warning ".env.production 不存在（将使用 .env.example）"
    }
    
    if (Test-Path $InitSqlDir) {
        Write-Success "database/init 目录存在"
    } else {
        Write-Error "database/init 目录不存在"
    }
    
    Write-Host "$Cyan  [2/5] 检查 SQL 初始化文件...$Reset"
    if (Test-Path $InitSqlDir) {
        $SqlFiles = Get-ChildItem -Path $InitSqlDir -Filter "*.sql" -ErrorAction SilentlyContinue
        if ($SqlFiles.Count -gt 0) {
            Write-Success "找到 $($SqlFiles.Count) 个 SQL 初始化文件"
            Write-Info "SQL 文件列表:"
            foreach ($f in $SqlFiles) {
                Write-Host "    - $($f.Name)"
            }
        } else {
            Write-Error "未找到 SQL 初始化文件"
        }
    }
    
    Write-Host "$Cyan  [3/5] 检查 Nginx 代理配置...$Reset"
    if (Test-Path $NginxConfFile) {
        $Content = Get-Content $NginxConfFile -Raw
        $ProxyPass = Select-String -InputObject $Content -Pattern "proxy_pass http://[a-zA-Z0-9_-]+:[0-9]+" -AllMatches
        if ($ProxyPass.Matches.Count -gt 0) {
            $Services = $ProxyPass.Matches.Value | ForEach-Object { $_.Replace('proxy_pass http://', '') } | ForEach-Object { $_.Split(':')[0] } | Select-Object -Unique
            Write-Info "代理目标: $($Services -join ', ')"
            if (Test-Path $DockerComposeFile) {
                $DockerContent = Get-Content $DockerComposeFile -Raw
                foreach ($service in $Services) {
                    if ($DockerContent -match "^\s*${service}:") {
                        Write-Success "'$service' 在 docker-compose.yml 中存在"
                    } else {
                        Write-Error "'$service' 在 docker-compose.yml 中不存在！"
                    }
                }
            }
        } else {
            Write-Warning "未找到 proxy_pass 配置"
        }
    }
    
    Write-Host "$Cyan  [4/5] 检查服务配置...$Reset"
    if (Test-Path $DockerComposeFile) {
        $Content = Get-Content $DockerComposeFile -Raw
        if ($Content -match "postgres:") {
            Write-Success "PostgreSQL 服务配置存在"
        }
        if ($Content -match "redis:") {
            Write-Success "Redis 服务配置存在"
        }
        if ($Content -match "minio:") {
            Write-Success "MinIO 服务配置存在"
        }
        if ($Content -match "api:") {
            Write-Success "API 服务配置存在"
        }
        if ($Content -match "nginx:") {
            Write-Success "Nginx 服务配置存在"
        }
    }
    
    Write-Host "$Cyan  [5/5] 检查 api-new 目录...$Reset"
    if (Test-Path "$ProjectDir\api-new") {
        Write-Success "api-new 目录存在"
        if (Test-Path "$ProjectDir\api-new\package.json") {
            Write-Success "api-new\package.json 存在"
        }
        if (Test-Path "$ProjectDir\api-new\dist") {
            Write-Success "api-new\dist 目录存在（已构建）"
        } else {
            Write-Warning "api-new\dist 目录不存在（需要构建）"
        }
    } else {
        Write-Error "api-new 目录不存在"
    }
    
    Write-Host ""
    if ($Errors -eq 0 -and $Warnings -eq 0) {
        Write-Host "$Green  🎉 配置检查通过$Reset"
        return $true
    } elseif ($Errors -eq 0) {
        Write-Host "$Yellow  ⚠️  检查通过，但有 $Warnings 个警告$Reset"
        return $true
    } else {
        Write-Host "$Red  ❌ 检查失败: $Errors 个错误，$Warnings 个警告$Reset"
        return $false
    }
}

if (!(Check-ConfigConsistency)) {
    Write-Host ""
    Write-Host "$Red========================================$Reset"
    Write-Host "$Red❌ 配置一致性检查未通过$Reset"
    Write-Host "$Red========================================$Reset"
    Write-Host ""
    Write-Host "请修复上述错误后再进行部署"
    exit 1
}

Write-Host "$Green✅ 配置一致性检查通过$Reset"
Write-Host ""

Write-Host "$Yellow⚠️  警告：此操作将清空服务器所有现有 PMSY 数据！$Reset"
Write-Host "$Yellow   - 删除现有 PostgreSQL 数据$Reset"
Write-Host "$Yellow   - 删除现有 Redis 数据$Reset"
Write-Host "$Yellow   - 删除现有 MinIO 数据$Reset"
Write-Host "$Yellow   - 重新初始化所有配置$Reset"
Write-Host ""

$Confirm = Read-Host "是否继续? (yes/no)"
if ($Confirm -notmatch "^[Yy][Ee][Ss]$*") {
    Write-Host "已取消部署"
    exit 1
}

# 选择部署模式
Write-Host ""
Write-Host "$Blue========================================$Reset"
Write-Host "$Blue请选择部署模式:$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""
Write-Host "$Green模式1: 在线部署$Reset"
Write-Host "  ✓ 开发机可连接服务器"
Write-Host "  ✓ 服务器可在线拉取 Docker 镜像"
Write-Host "  → 自动上传代码，服务器在线拉取镜像"
Write-Host ""
Write-Host "$Yellow模式2: 半离线部署$Reset"
Write-Host "  ✓ 开发机可连接服务器"
Write-Host "  ✗ 服务器无法连接 Docker Hub"
Write-Host "  → 自动导出镜像并上传，服务器导入镜像"
Write-Host ""
Write-Host "$Cyan模式3: 完全离线部署$Reset"
Write-Host "  ✗ 开发机无法连接服务器"
Write-Host "  ✗ 服务器无法连接 Docker Hub"
Write-Host "  → 生成离线部署包，用户手动上传部署"
Write-Host ""

$DeployMode = ""
while ($true) {
    $ModeChoice = Read-Host "请选择部署模式 (1/2/3)"
    switch ($ModeChoice) {
        "1" {
            $DeployMode = "online"
            Write-Host "$Green   已选择: 在线部署模式$Reset"
            break
        }
        "2" {
            $DeployMode = "semi-offline"
            Write-Host "$Yellow   已选择: 半离线部署模式$Reset"
            break
        }
        "3" {
            $DeployMode = "offline"
            Write-Host "$Cyan   已选择: 完全离线部署模式$Reset"
            break
        }
        default {
            Write-Host "$Yellow   无效选择，请重新输入$Reset"
            continue
        }
    }
    break
}

Write-Host ""

# ==========================================
# 公共步骤：配置服务器信息
# ==========================================
Write-Host "$Blue[步骤 1/5] 配置服务器信息$Reset"
Write-Host ""

# 读取或输入服务器配置
if (Test-Path ".env.deploy") {
    $ConfigContent = Get-Content ".env.deploy" -Raw
    $ServerIp = ($ConfigContent | Select-String "DEPLOY_SERVER_IP=(.*)").Matches.Groups[1].Value
    $ServerPort = ($ConfigContent | Select-String "DEPLOY_SERVER_PORT=(.*)").Matches.Groups[1].Value
    $ServerUser = ($ConfigContent | Select-String "DEPLOY_SERVER_USER=(.*)").Matches.Groups[1].Value
    $DeployDir = ($ConfigContent | Select-String "DEPLOY_REMOTE_DIR=(.*)").Matches.Groups[1].Value
    Write-Host "$Green   ✅ 已加载配置文件 .env.deploy$Reset"
} else {
    Write-Host "$Yellow   未找到 .env.deploy，请输入服务器配置$Reset"
}

# 输入服务器信息
if ([string]::IsNullOrEmpty($ServerIp)) {
    $ServerIp = Read-Host "   服务器 IP"
}
Write-Host "   服务器 IP: $ServerIp"

if ([string]::IsNullOrEmpty($ServerPort)) {
    $DefaultPort = "9022"
    $InputPort = Read-Host "   SSH 端口 [$DefaultPort]"
    $ServerPort = if (![string]::IsNullOrEmpty($InputPort)) { $InputPort } else { $DefaultPort }
}
Write-Host "   SSH 端口: $ServerPort"

if ([string]::IsNullOrEmpty($ServerUser)) {
    $DefaultUser = "ubuntu"
    $InputUser = Read-Host "   服务器用户名 [$DefaultUser]"
    $ServerUser = if (![string]::IsNullOrEmpty($InputUser)) { $InputUser } else { $DefaultUser }
}
Write-Host "   服务器用户名: $ServerUser"

if ([string]::IsNullOrEmpty($DeployDir)) {
    $DefaultDir = "/opt/pmsy"
    $InputDir = Read-Host "   部署目录 [$DefaultDir]"
    $DeployDir = if (![string]::IsNullOrEmpty($InputDir)) { $InputDir } else { $DefaultDir }
}
Write-Host "   部署目录: $DeployDir"

# 保存配置
@"
# PMSY 部署配置
DEPLOY_SERVER_IP=$ServerIp
DEPLOY_SERVER_PORT=$ServerPort
DEPLOY_SERVER_USER=$ServerUser
DEPLOY_REMOTE_DIR=$DeployDir
"@ | Out-File -FilePath ".env.deploy" -Force
Write-Host "$Green   ✅ 服务器配置已保存到 .env.deploy$Reset"
Write-Host ""

# ==========================================
# 公共步骤：检测生产服务器环境
# ==========================================
Write-Host "$Blue[步骤 2/5] 检测生产服务器环境...$Reset"
Write-Host ""

Write-Host "$Yellow   检查服务器连接...$Reset"
try {
    # 测试服务器连接
    $TestConnection = Test-Connection -ComputerName $ServerIp -Count 1 -Quiet
    if (!$TestConnection) {
        throw "无法ping通服务器"
    }
    
    # 测试SSH连接
    $SshTest = ssh -p $ServerPort $ServerUser@$ServerIp "echo OK"
    if ($SshTest -ne "OK") {
        throw "SSH连接失败"
    }
    Write-Host "$Green   ✅ 服务器连接正常$Reset"
} catch {
    Write-Host "$Red❌ 错误: 无法连接到服务器 $ServerIp$Reset"
    Write-Host "   请检查:"
    Write-Host "   1. 服务器 IP 是否正确"
    Write-Host "   2. SSH 服务是否运行"
    Write-Host "   3. 用户名是否正确"
    exit 1
}

Write-Host "$Yellow   检查现有 PMSY 环境...$Reset"
try {
    # 检测现有环境
    $CheckEnvScript = @"
if [ -d '$DeployDir' ]; then
    echo 'DIRECTORY_EXISTS'
    if [ -f '$DeployDir/docker-compose.yml' ]; then
        echo 'DOCKER_COMPOSE_EXISTS'
    fi
    if sudo docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qE 'pmsy'; then
        echo 'CONTAINERS_EXISTS'
    fi
    if sudo docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qE 'pmsy'; then
        echo 'DOCKER_VOLUMES_EXISTS'
    fi
else
    echo 'CLEAN'
fi
"@
    
    $ExistingEnv = ssh -p $ServerPort $ServerUser@$ServerIp $CheckEnvScript
    $EnvStatus = "CLEAN"
    
    if ($ExistingEnv -match "DIRECTORY_EXISTS") {
        $EnvStatus = "DIR"
    }
    if ($ExistingEnv -match "DOCKER_COMPOSE_EXISTS") {
        $EnvStatus = "COMPOSE"
    }
    if ($ExistingEnv -match "CONTAINERS_EXISTS") {
        $EnvStatus = "CONTAINERS"
    }
    if ($ExistingEnv -match "DOCKER_VOLUMES_EXISTS") {
        $EnvStatus = "VOLUMES"
    }
    
    switch ($EnvStatus) {
        "CLEAN" {
            Write-Host "$Green   ✅ 服务器环境干净，无现有 PMSY 环境$Reset"
        }
        "DIR" {
            Write-Host "$Yellow⚠️  警告: 检测到部署目录存在，但无 Docker 配置$Reset"
            Write-Host "   目录: $DeployDir"
        }
        "COMPOSE" {
            Write-Host "$Yellow⚠️  警告: 检测到现有 PMSY 部署配置$Reset"
            Write-Host "   目录: $DeployDir"
            Write-Host "   全新部署将覆盖现有配置和数据！"
        }
        "CONTAINERS" {
            Write-Host "$Yellow⚠️  警告: 检测到运行中的 PMSY 容器$Reset"
            Write-Host "   现有容器将被停止并删除"
            Write-Host "   数据卷将被清理"
        }
        "VOLUMES" {
            Write-Host "$Yellow⚠️  警告: 检测到现有数据卷$Reset"
            Write-Host "   数据卷将被删除，所有数据将丢失！"
        }
    }
    
    if ($EnvStatus -ne "CLEAN") {
        Write-Host ""
        Write-Host "$Red========================================$Reset"
        Write-Host "$Red⚠️  重要提示$Reset"
        Write-Host "$Red========================================$Reset"
        Write-Host ""
        Write-Host "全新部署将执行以下操作:"
        Write-Host "  1. 停止并删除所有现有 PMSY 容器"
        Write-Host "  2. 删除所有现有数据卷（包括数据库数据）"
        Write-Host "  3. 删除现有部署目录并重新创建"
        Write-Host "  4. 重新初始化所有配置和数据"
        Write-Host ""
        Write-Host "$Red此操作不可逆，所有现有数据将丢失！$Reset"
        Write-Host ""
        
        # 显示现有容器和数据卷
        Write-Host "$Yellow现有容器列表:$Reset"
        try {
            $Containers = ssh -p $ServerPort $ServerUser@$ServerIp "sudo docker ps -a --format '  {{.Names}} ({{.Status}})' 2>/dev/null | grep -E 'pmsy' || echo '  无运行中的容器'"
            Write-Host $Containers
        } catch {
            Write-Host "  无法获取容器列表"
        }
        Write-Host ""
        
        Write-Host "$Yellow现有数据卷列表:$Reset"
        try {
            $Volumes = ssh -p $ServerPort $ServerUser@$ServerIp "sudo docker volume ls --format '  {{.Name}}' 2>/dev/null | grep -E 'pmsy' || echo '  无相关数据卷'"
            Write-Host $Volumes
        } catch {
            Write-Host "  无法获取数据卷列表"
        }
        Write-Host ""
        
        $Confirm = Read-Host "确认要清空现有环境并重新部署? (yes/no)"
        if ($Confirm -notmatch "^[Yy][Ee][Ss]$") {
            Write-Host ""
            Write-Host "$Yellow已取消部署。如需保留数据，请使用更新部署脚本。$Reset"
            Write-Host "   更新部署脚本: .\deploy\windows\update\deploy.ps1"
            exit 1
        }
        
        Write-Host ""
        Write-Host "$Yellow   正在清空服务器环境...$Reset"
        
        # 执行清理脚本
        $CleanupScript = @"
set -e

echo '   停止现有容器...'
cd $DeployDir 2>/dev/null && sudo docker-compose down 2>/dev/null || true

echo '   删除 PMSY 容器...'
sudo docker rm -f $(sudo docker ps -aq --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true

echo '   删除数据卷...'
sudo docker volume rm $(sudo docker volume ls -q --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true

echo '   清理部署目录...'
sudo rm -rf $DeployDir

echo '   创建新目录...'
sudo mkdir -p $DeployDir
sudo chown $ServerUser:$ServerUser $DeployDir

echo '   ✅ 环境清理完成'
"@
        
        ssh -p $ServerPort $ServerUser@$ServerIp $CleanupScript
        Write-Host "$Green   ✅ 服务器环境已重置$Reset"
    }
} catch {
    Write-Host "$Yellow   ⚠️  无法检查现有环境: $($_.Exception.Message)$Reset"
}

# ==========================================
# 公共步骤：检查并更新配置
# ==========================================
Write-Host "$Blue[步骤 3/5] 检查并更新配置...$Reset"
Write-Host ""

# 检查环境配置文件
if (!(Test-Path "config\env\.env.production") -and !(Test-Path "config\env\.env.example")) {
    Write-Host "$Red❌ 错误: config\env\.env.production 或 config\env\.env.example 文件不存在$Reset"
    Write-Host ""
    Write-Host "配置文件位置: config\env\.env.production"
    Write-Host ""
    Write-Host "请创建配置文件:"
    Write-Host "  Copy-Item config\env\.env.example config\env\.env.production"
    Write-Host ""
    exit 1
}

$EnvSource = "config\env\.env.production"
if (!(Test-Path "config\env\.env.production")) {
    Write-Host "$Yellow⚠️  未找到 config\env\.env.production，将从 .env.example 复制$Reset"
    Copy-Item "config\env\.env.example" "config\env\.env.production" -Force
    Write-Host "$Green✅ 已创建 config\env\.env.production$Reset"
}

Write-Host ""
Write-Host "$Cyan========================================$Reset"
Write-Host "$Cyan📋 部署配置检查$Reset"
Write-Host "$Cyan========================================$Reset"
Write-Host ""
Write-Host "$Yellow⚠️  重要：部署前必须修改以下配置$Reset"
Write-Host ""
Write-Host "配置文件路径: $Cyan$EnvSource$Reset"
Write-Host ""

# 读取当前配置值
$ConfigContent = Get-Content $EnvSource -Raw
$CurrentDbPassword = ($ConfigContent | Select-String "DB_PASSWORD=(.*)").Matches.Groups[1].Value.Trim()
$CurrentJwtSecret = ($ConfigContent | Select-String "JWT_SECRET=(.*)").Matches.Groups[1].Value.Trim()
$CurrentMinioSecret = ($ConfigContent | Select-String "MINIO_SECRET_KEY=(.*)").Matches.Groups[1].Value.Trim()
$CurrentApiUrl = ($ConfigContent | Select-String "API_URL=(.*)").Matches.Groups[1].Value.Trim()

# 检查配置是否需要修改
$NeedsConfigUpdate = $false

Write-Host "┌─────────────────────────────────────────────────────────┐"
Write-Host "│ 配置项              │ 当前值                            │"
Write-Host "├─────────────────────────────────────────────────────────┤"

# DB_PASSWORD
if ([string]::IsNullOrEmpty($CurrentDbPassword) -or $CurrentDbPassword -eq "pmsy_prod_password_change_me" -or $CurrentDbPassword -eq "your_secure_password_here") {
    Write-Host "│ 1. DB_PASSWORD      │ $Red⚠️  未修改 (必须修改)$Reset              │"
    $NeedsConfigUpdate = $true
} else {
    Write-Host "│ 1. DB_PASSWORD      │ $Green✅ 已设置$Reset                        │"
}

# JWT_SECRET
if ([string]::IsNullOrEmpty($CurrentJwtSecret) -or $CurrentJwtSecret -eq "your_jwt_secret_key_here_change_in_production_at_least_32_chars" -or $CurrentJwtSecret -eq "your_production_jwt_secret_key_here") {
    Write-Host "│ 2. JWT_SECRET       │ $Red⚠️  未修改 (必须修改)$Reset              │"
    $NeedsConfigUpdate = $true
} else {
    Write-Host "│ 2. JWT_SECRET       │ $Green✅ 已设置$Reset                        │"
}

# MINIO_SECRET_KEY
if ([string]::IsNullOrEmpty($CurrentMinioSecret) -or $CurrentMinioSecret -eq "minio_secret_key_change_me" -or $CurrentMinioSecret -eq "minioadmin") {
    Write-Host "│ 3. MINIO_SECRET_KEY │ $Red⚠️  未修改 (必须修改)$Reset              │"
    $NeedsConfigUpdate = $true
} else {
    Write-Host "│ 3. MINIO_SECRET_KEY │ $Green✅ 已设置$Reset                        │"
}

# API_URL
if ([string]::IsNullOrEmpty($CurrentApiUrl) -or $CurrentApiUrl -match "localhost" -or $CurrentApiUrl -match "change") {
    Write-Host "│ 4. API_URL          │ $Yellow⚠️  建议修改: http://$ServerIp$Reset │"
    $NeedsConfigUpdate = $true
} else {
    Write-Host "│ 4. API_URL          │ $Green✅ 已设置: $CurrentApiUrl$Reset │"
}

Write-Host "└─────────────────────────────────────────────────────────┘"
Write-Host ""

if ($NeedsConfigUpdate) {
    Write-Host "$Red❌ 检测到配置未正确设置，必须先修改配置文件$Reset"
    Write-Host ""
    Write-Host "必须修改的配置项："
    Write-Host "  1. DB_PASSWORD - 数据库密码（生产环境强密码）"
    Write-Host "  2. JWT_SECRET - JWT签名密钥（至少32位随机字符串）"
    Write-Host "  3. MINIO_SECRET_KEY - MinIO存储密钥（强密码）"
    Write-Host "  4. API_URL - 服务器IP地址"
    Write-Host ""
    Write-Host "生成随机密码命令："
    Write-Host "  [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"
    Write-Host ""
    
    $EditConfig = Read-Host "是否立即编辑配置文件? (yes/no)"
    if ($EditConfig -notmatch "^[Yy][Ee][Ss]$") {
        Write-Host ""
        Write-Host "$Red❌ 部署已取消：配置未正确设置$Reset"
        Write-Host ""
        Write-Host "请手动编辑配置文件后再运行部署脚本："
        Write-Host "  notepad $EnvSource"
        Write-Host ""
        exit 1
    }
    
    Write-Host "$Yellow   正在打开配置文件...$Reset"
    
    try {
        # 尝试使用 VS Code 打开
        if (Get-Command "code" -ErrorAction SilentlyContinue) {
            code "$EnvSource"
            Write-Host "   请在 VS Code 中编辑配置文件"
            Read-Host "   编辑完成后按回车继续..."
        } else {
            # 尝试使用记事本打开
            Start-Process "notepad.exe" "$EnvSource"
            Write-Host "   请在记事本中编辑配置文件"
            Read-Host "   编辑完成后按回车继续..."
        }
    } catch {
        Write-Host "   请手动编辑 $EnvSource 文件，然后按回车继续..."
        Read-Host
    }
    
    # 重新读取配置检查
    $ConfigContent = Get-Content $EnvSource -Raw
    $CurrentDbPassword = ($ConfigContent | Select-String "DB_PASSWORD=(.*)").Matches.Groups[1].Value.Trim()
    $CurrentJwtSecret = ($ConfigContent | Select-String "JWT_SECRET=(.*)").Matches.Groups[1].Value.Trim()
    $CurrentMinioSecret = ($ConfigContent | Select-String "MINIO_SECRET_KEY=(.*)").Matches.Groups[1].Value.Trim()
    
    if ([string]::IsNullOrEmpty($CurrentDbPassword) -or $CurrentDbPassword -eq "pmsy_prod_password_change_me" -or `
       [string]::IsNullOrEmpty($CurrentJwtSecret) -or $CurrentJwtSecret -eq "your_jwt_secret_key_here_change_in_production_at_least_32_chars" -or `
       [string]::IsNullOrEmpty($CurrentMinioSecret) -or $CurrentMinioSecret -eq "minio_secret_key_change_me") {
        Write-Host ""
        Write-Host "$Red❌ 配置仍未正确设置，部署已取消$Reset"
        exit 1
    }
    
    Write-Host "$Green   ✅ 配置已更新$Reset"
    Write-Host "$Green✅ 所有配置项已正确设置$Reset"

Write-Host ""

# 检查服务器上的 Docker 和 Docker Compose
try {
    $DockerCheckScript = @"
if command -v docker > /dev/null 2>&1; then
    echo 'DOCKER_INSTALLED'
    if command -v docker-compose > /dev/null 2>&1; then
        echo 'DOCKER_COMPOSE_INSTALLED'
    fi
else
    echo 'DOCKER_NOT_INSTALLED'
fi
"@
    $DockerCheck = ssh -p $ServerPort $ServerUser@$ServerIp $DockerCheckScript
    
    if ($DockerCheck -match "DOCKER_NOT_INSTALLED") {
        Write-Host "$Red❌ 错误: 服务器上未安装 Docker$Reset"
        Write-Host "   请在服务器上安装 Docker 和 Docker Compose"
        exit 1
    }
    
    Write-Host "$Green   ✅ Docker 已安装$Reset"
    if ($DockerCheck -match "DOCKER_COMPOSE_INSTALLED") {
        Write-Host "$Green   ✅ Docker Compose 已安装$Reset"
    } else {
        Write-Host "$Yellow   ⚠️  Docker Compose 未安装，将在部署时上传$Reset"
    }
} catch {
    Write-Host "$Yellow   ⚠️  无法检查 Docker 安装状态: $($_.Exception.Message)$Reset"
}

# ==========================================
# 公共步骤：构建前端和后端
# ==========================================
Write-Host "$Blue[步骤 4/5] 构建前端和后端...$Reset"
Write-Host ""

Write-Host "$Yellow   构建前端...$Reset"
try {
    # 构建前端 - 使用生产环境配置
    if (Test-Path "$ProjectDir\config\env\.env.production") {
        Write-Host "   使用 config\env\.env.production 进行构建"
        $env:VITE_ENV_FILE = "config\env\.env.production"
    } else {
        Write-Host "   使用 config\env\.env.example 进行构建"
        $env:VITE_ENV_FILE = "config\env\.env.example"
    }
    
    # 使用 --mode production 构建
    npm run build -- --mode production
    Write-Host "$Green   ✅ 前端构建完成$Reset"
} catch {
    Write-Host "$Red❌ 前端构建失败: $($_.Exception.Message)$Reset"
    exit 1
}

Write-Host "$Yellow   构建后端 API...$Reset"
try {
    cd "$ProjectDir\api-new"
    if (!(Test-Path "node_modules")) {
        npm install
    }
    npm run build 2>$null
    cd "$ProjectDir"
    Write-Host "$Green   ✅ 后端构建完成$Reset"
} catch {
    Write-Host "$Yellow   ⚠️  后端构建可能已在 dist 目录中: $($_.Exception.Message)$Reset"
}

Write-Host "$Yellow   检测架构环境...$Reset"

# 获取本地架构
$LocalArch = $env:PROCESSOR_ARCHITECTURE
if ($LocalArch -eq "AMD64") {
    $LocalArchNormalized = "amd64"
} elseif ($LocalArch -eq "ARM64") {
    $LocalArchNormalized = "arm64"
} else {
    $LocalArchNormalized = "amd64"
}

# 获取服务器架构
try {
    $ServerArchRaw = ssh -p $ServerPort $ServerUser@$ServerIp "uname -m"
    if ($ServerArchRaw -match "x86_64") {
        $ServerArchNormalized = "amd64"
    } elseif ($ServerArchRaw -match "arm64" -or $ServerArchRaw -match "aarch64") {
        $ServerArchNormalized = "arm64"
    } else {
        $ServerArchNormalized = "amd64"
    }
} catch {
    $ServerArchNormalized = "amd64"
}

Write-Host "   本地架构: $LocalArch ($LocalArchNormalized)"
Write-Host "   服务器架构: $ServerArchRaw ($ServerArchNormalized)"
Write-Host ""

# 根据架构是否一致决定构建方式
$BuildLocally = $true
$SkipBuildx = $false
$TargetPlatform = "linux/$LocalArchNormalized"

if ($LocalArchNormalized -ne $ServerArchNormalized) {
    # 架构不一致，提供选项
    Write-Host "$Cyan   架构不一致，请选择构建方式：$Reset"
    Write-Host ""
    Write-Host "   1) 本地跨架构构建 (使用 Docker Buildx，需要良好的网络)"
    Write-Host "   2) 在服务器上构建 (推荐，避免跨架构构建问题)"
    Write-Host ""
    
    $BuildChoice = Read-Host "   请输入选项 [1-2] (默认: 2)"
    if ([string]::IsNullOrEmpty($BuildChoice)) {
        $BuildChoice = "2"
    }
    
    switch ($BuildChoice) {
        "1" {
            Write-Host "   选择: 本地跨架构构建"
            $BuildLocally = $true
            $SkipBuildx = $false
            $TargetPlatform = "linux/$ServerArchNormalized"
        }
        "2" {
            Write-Host "   选择: 在服务器上构建镜像"
            $BuildLocally = $false
            $SkipBuildx = $true
        }
        default {
            Write-Host "   选择: 在服务器上构建镜像"
            $BuildLocally = $false
            $SkipBuildx = $true
        }
    }
} else {
    # 架构一致，直接本地构建
    Write-Host "$Green   ✅ 架构一致，直接本地构建镜像$Reset"
    $BuildLocally = $true
    $SkipBuildx = $true
    $TargetPlatform = "linux/$LocalArchNormalized"
}

# 执行构建
if ($BuildLocally) {
    Write-Host "   目标平台: $TargetPlatform"
    cd "$ProjectDir\api-new"
    try {
        if ($SkipBuildx) {
            # 架构一致，直接构建
            docker build -t pmsy-api:latest .
        } else {
            # 跨架构构建
            docker buildx build --platform $TargetPlatform -t pmsy-api:latest --load .
        }
        Write-Host "$Green   ✅ Docker 镜像构建完成$Reset"
    } catch {
        Write-Host "$Yellow   ⚠️  本地构建失败，将在服务器上构建: $($_.Exception.Message)$Reset"
        $BuildLocally = $false
    }
    cd "$ProjectDir"
} else {
    Write-Host "$Yellow   跳过本地构建，将在服务器上构建镜像$Reset"
}

Write-Host ""

# ==========================================
# 根据部署模式执行不同逻辑
# ==========================================

switch ($DeployMode) {
    "online" {
        Write-Host "$Blue[步骤 5/5] 在线部署到服务器...$Reset"
        Write-Host ""
        
        Write-Host "$Yellow   准备部署包...$Reset"
        
        # 创建临时部署目录
        $DeployTmp = New-TemporaryFile | ForEach-Object { $_.FullName + "-dir" } | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }
        $DeployTmp = $DeployTmp.FullName
        $PmsyDir = Join-Path $DeployTmp "pmsy"
        New-Item -ItemType Directory -Path $PmsyDir -Force | Out-Null
        
        # 复制前端构建产物
        Copy-Item -Path "$ProjectDir\dist" -Destination $PmsyDir -Recurse -Force
        
        # 根据构建方式准备部署包
        if ($BuildLocally) {
            # 本地构建：导出镜像
            Write-Host "$Yellow   导出 Docker 镜像...$Reset"
            try {
                docker save pmsy-api:latest -o "$PmsyDir\pmsy-api.tar"
                Write-Host "$Green   ✅ Docker 镜像导出完成$Reset"
            } catch {
                Write-Host "$Yellow   ⚠️  镜像导出失败，将在服务器上构建: $($_.Exception.Message)$Reset"
                $BuildLocally = $false
            }
        }
        
        if (!$BuildLocally) {
            # 服务器构建：复制必要文件
            New-Item -ItemType Directory -Path "$PmsyDir\api-new" -Force | Out-Null
            Copy-Item -Path "$ProjectDir\api-new\Dockerfile" -Destination "$PmsyDir\api-new" -Force
            Copy-Item -Path "$ProjectDir\api-new\package*.json" -Destination "$PmsyDir\api-new" -Force
            Copy-Item -Path "$ProjectDir\api-new\dist" -Destination "$PmsyDir\api-new" -Recurse -Force
            # 复制 database 目录（包含初始化脚本和种子数据）
            if (Test-Path "$ProjectDir\api-new\database") {
                Copy-Item -Path "$ProjectDir\api-new\database" -Destination "$PmsyDir\api-new" -Recurse -Force
            }
        }
        
        # 根据构建方式准备 docker-compose.yml
        if ($BuildLocally) {
            # 本地构建：直接使用镜像
            Copy-Item -Path "$ProjectDir\config\docker\docker-compose.yml" -Destination $PmsyDir -Force
        } else {
            # 服务器构建：添加 build 配置
            $DockerComposeContent = '# services:
#   postgres:
#     image: postgres:15-alpine
#     container_name: pmsy-postgres
#     environment:
#       POSTGRES_USER: ${DB_USER:-pmsy}
#       POSTGRES_PASSWORD: ${DB_PASSWORD:-pmsy_prod_password}
#       POSTGRES_DB: ${DB_NAME:-pmsy}
#     volumes:
#       - postgres_data:/var/lib/postgresql/data
#       - ./api-new/database/init:/docker-entrypoint-initdb.d:ro
#     healthcheck:
#       test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-pmsy} -d ${DB_NAME:-pmsy}"]
#       interval: 5s
#       timeout: 5s
#       retries: 5
#     restart: unless-stopped
#     networks:
#       - pmsy-network
# 
#   redis:
#     image: redis:7-alpine
#     container_name: pmsy-redis
#     volumes:
#       - redis_data:/data
#     healthcheck:
#       test: ["CMD", "redis-cli", "ping"]
#       interval: 5s
#       timeout: 5s
#       retries: 5
#     restart: unless-stopped
#     networks:
#       - pmsy-network
# 
#   minio:
#     image: minio/minio:latest
#     container_name: pmsy-minio
#     command: server /data --console-address ":9001"
#     environment:
#       MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
#       MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
#     volumes:
#       - minio_data:/data
#     healthcheck:
#       test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
#       interval: 10s
#       timeout: 5s
#       retries: 5
#     restart: unless-stopped
#     networks:
#       - pmsy-network
# 
#   api:
#     build:
#       context: ./api-new
#       dockerfile: Dockerfile
#     image: pmsy-api:latest
#     container_name: pmsy-api
#     environment:
#       - NODE_ENV=production
#       - DB_HOST=postgres
#       - DB_PORT=5432
#       - DB_USER=${DB_USER:-pmsy}
#       - DB_PASSWORD=${DB_PASSWORD:-pmsy_prod_password}
#       - DB_NAME=${DB_NAME:-pmsy}
#       - REDIS_URL=redis://redis:6379
#       - MINIO_ENDPOINT=minio:9000
#       - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
#       - MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
#       - MINIO_USE_SSL=false
#       - MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-files}
#       - JWT_SECRET=${JWT_SECRET:-your_jwt_secret_key_change_in_production}
#       - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-7d}
#       - JWT_ISSUER=${JWT_ISSUER:-pmsy-api}
#       - JWT_AUDIENCE=${JWT_AUDIENCE:-pmsy-client}
#       - PORT=3001
#       - API_URL=${API_URL:-http://localhost}
#     depends_on:
#       postgres:
#         condition: service_healthy
#       redis:
#         condition: service_healthy
#       minio:
#         condition: service_healthy
#     restart: unless-stopped
#     networks:
#       - pmsy-network
# 
#   nginx:
#     image: nginx:alpine
#     container_name: pmsy-nginx
#     ports:
#       - "80:80"
#       - "443:443"
#     volumes:
#       - ./nginx.conf:/etc/nginx/nginx.conf:ro
#       - ./dist:/usr/share/nginx/html:ro
#       - ./ssl:/etc/nginx/ssl:ro
#     depends_on:
#       api:
#         condition: service_healthy
#     restart: unless-stopped
#     networks:
#       - pmsy-network
# 
# volumes:
#   postgres_data:
#     driver: local
#   redis_data:
#     driver: local
#   minio_data:
#     driver: local
# 
# networks:
#   pmsy-network:
#     driver: bridge'
            # 暂时使用默认的 docker-compose.yml
            Copy-Item -Path "$ProjectDir\config\docker\docker-compose.yml" -Destination $PmsyDir -Force
        }
        
        # 复制 Nginx 配置
        Copy-Item -Path "$ProjectDir\config\nginx\nginx.conf" -Destination "$PmsyDir\nginx.conf" -Force
        
        # 复制环境配置
        if (Test-Path "$ProjectDir\config\env\.env.production") {
            Copy-Item -Path "$ProjectDir\config\env\.env.production" -Destination "$PmsyDir\.env" -Force
        } elseif (Test-Path "$ProjectDir\config\env\.env.example") {
            Copy-Item -Path "$ProjectDir\config\env\.env.example" -Destination "$PmsyDir\.env" -Force
        }
        
        # 复制部署脚本目录
        New-Item -ItemType Directory -Path "$PmsyDir\deploy" -Force | Out-Null
        Get-ChildItem -Path "$ProjectDir\deploy" -Directory | Where-Object { $_.Name -ne "cache" } | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination "$PmsyDir\deploy" -Recurse -Force
        }
        Get-ChildItem -Path "$ProjectDir\deploy" -File | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination "$PmsyDir\deploy" -Force
        }
        
        Write-Host "$Green   ✅ 部署包准备完成$Reset"
        Write-Host ""
        
        Write-Host "$Yellow   上传到服务器...$Reset"
        try {
            # 检查服务器目录是否存在，不存在则创建
            ssh -p $ServerPort $ServerUser@$ServerIp "mkdir -p '$DeployDir'"
            
            # 上传文件
            Write-Host "   上传前端和后端文件..."
            scp -r "$PmsyDir/*" "${ServerUser}@${ServerIp}:${DeployDir}/"
            
            Write-Host "$Green   ✅ 上传完成$Reset"
        } catch {
            Write-Host "$Red❌ 上传失败: $($_.Exception.Message)$Reset"
            exit 1
        }
        
        # 清理临时目录
        Remove-Item -Path $DeployTmp -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "$Yellow   在服务器上执行部署...$Reset"
        try {
            # 根据构建方式执行不同的远程脚本
            if ($BuildLocally) {
                # 本地构建：导入镜像
                $RemoteScript = @"
set -e

echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo "   请确保当前用户有免密码 sudo 权限"
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "$DeployDir"

echo "   [服务器] 更新配置..."
sed -i "s|API_URL=.*|API_URL=http://$ServerIp|" .env

echo "   [服务器] 导入 Docker 镜像..."
sudo docker load < pmsy-api.tar
rm -f pmsy-api.tar

echo "   [服务器] 拉取基础镜像并启动..."
sudo docker-compose pull postgres redis minio nginx
sudo docker-compose up -d

# 等待服务启动
echo "   [服务器] 等待服务启动..."
sleep 10

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL 就绪"
        break
    fi
    echo "   等待 PostgreSQL... ($i/30)"
    sleep 2
done

for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API 服务就绪"
        break
    fi
    echo "   等待 API 服务... ($i/30)"
    sleep 2
done

echo "   [服务器] 执行数据库初始化..."
# 首先检查数据库是否已初始化（通过检查profiles表是否存在）
if sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -c "SELECT 1 FROM profiles LIMIT 1" > /dev/null 2>&1; then
    echo "   ✅ 数据库已初始化，跳过"
else
    # 执行初始化脚本
    if sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -f /docker-entrypoint-initdb.d/999_complete_schema.sql > /dev/null 2>&1; then
        echo "   ✅ 数据库初始化成功"
    else
        echo "   ⚠️  数据库初始化失败，请手动检查"
    fi
fi

echo "   [服务器] 执行管理员初始化..."
# 只执行管理员用户种子数据，跳过示例项目数据
SEED_OUTPUT=$(sudo docker-compose exec -T api sh -c "cd /app && npx knex seed:run --specific=001_seed_admin_user.ts" 2>&1)
SEED_EXIT_CODE=$?

if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo "   ✅ 管理员初始化成功"
    # 显示管理员信息
    echo "$SEED_OUTPUT" | grep -E "(管理员|admin|已创建|已更新)" | sed 's/^/     /'
else
    echo "   ⚠️  管理员初始化失败，请手动检查"
fi

echo "   [服务器] 检查服务状态..."
if sudo docker-compose ps 2>/dev/null; then
    echo ""
    echo "   ✅ 所有服务运行正常"
else
    echo "   ⚠️  无法获取服务状态，请手动检查"
fi

echo "   [服务器] ✅ 部署完成"
"@
            } else {
                # 服务器构建：在服务器上构建镜像
                $RemoteScript = @"
set -e

echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo "   请确保当前用户有免密码 sudo 权限"
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "$DeployDir"

echo "   [服务器] 更新配置..."
sed -i "s|API_URL=.*|API_URL=http://$ServerIp|" .env

echo "   [服务器] 构建 API Docker 镜像..."
cd api-new
sudo docker build -t pmsy-api:latest .
cd ..

echo "   [服务器] 拉取基础镜像并启动..."
sudo docker-compose pull postgres redis minio nginx
sudo docker-compose up -d

# 等待服务启动
echo "   [服务器] 等待服务启动..."
sleep 10

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL 就绪"
        break
    fi
    echo "   等待 PostgreSQL... ($i/30)"
    sleep 2
done

for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API 服务就绪"
        break
    fi
    echo "   等待 API 服务... ($i/30)"
    sleep 2
done

echo "   [服务器] 执行数据库初始化..."
# 首先检查数据库是否已初始化（通过检查profiles表是否存在）
if sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -c "SELECT 1 FROM profiles LIMIT 1" > /dev/null 2>&1; then
    echo "   ✅ 数据库已初始化，跳过"
else
    # 执行初始化脚本
    if sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -f /docker-entrypoint-initdb.d/999_complete_schema.sql > /dev/null 2>&1; then
        echo "   ✅ 数据库初始化成功"
    else
        echo "   ⚠️  数据库初始化失败，请手动检查"
    fi
fi

echo "   [服务器] 执行管理员初始化..."
# 只执行管理员用户种子数据，跳过示例项目数据
SEED_OUTPUT=$(sudo docker-compose exec -T api sh -c "cd /app && npx knex seed:run --specific=001_seed_admin_user.ts" 2>&1)
SEED_EXIT_CODE=$?

if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo "   ✅ 管理员初始化成功"
    # 显示管理员信息
    echo "$SEED_OUTPUT" | grep -E "(管理员|admin|已创建|已更新)" | sed 's/^/     /'
else
    echo "   ⚠️  管理员初始化失败，请手动检查"
fi

echo "   [服务器] 检查服务状态..."
if sudo docker-compose ps 2>/dev/null; then
    echo ""
    echo "   ✅ 所有服务运行正常"
else
    echo "   ⚠️  无法获取服务状态，请手动检查"
fi

echo "   [服务器] ✅ 部署完成"
"@
            }
            
            # 执行远程脚本
            ssh -p $ServerPort $ServerUser@$ServerIp "$RemoteScript"
            Write-Host "$Green   ✅ 服务器部署完成$Reset"
        } catch {
            Write-Host "$Red❌ 服务器部署失败: $($_.Exception.Message)$Reset"
            exit 1
        }
    }
    "semi-offline" {
        Write-Host "$Blue[步骤 5/5] 半离线部署到服务器...$Reset"
        Write-Host ""
        
        # 导出 Docker 镜像
        Write-Host "$Yellow   导出 Docker 镜像...$Reset"
        New-Item -ItemType Directory -Path "docker-images" -Force | Out-Null
        
        $Images = @(
            "postgres:15-alpine",
            "redis:7-alpine",
            "minio/minio:latest",
            "node:18-alpine",
            "nginx:alpine"
        )
        
        foreach ($Image in $Images) {
            $Filename = $Image -replace '/', '_' -replace ':', '_' + ".tar"
            Write-Host "     导出 $Image..."
            try {
                docker pull $Image 2>$null
                docker save $Image -o "docker-images\$Filename" 2>$null
                Write-Host "     ✅ 导出成功"
            } catch {
                Write-Host "     ⚠️  导出失败: $($_.Exception.Message)"
            }
        }
        
        # 准备部署包
        Write-Host "$Yellow   准备部署包...$Reset"
        $DeployTmp = New-TemporaryFile | ForEach-Object { $_.FullName + "-dir" } | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }
        $DeployTmp = $DeployTmp.FullName
        $PmsyDir = Join-Path $DeployTmp "pmsy"
        New-Item -ItemType Directory -Path $PmsyDir -Force | Out-Null
        
        # 复制前端构建产物
        Copy-Item -Path "$ProjectDir\dist" -Destination $PmsyDir -Recurse -Force
        
        # 复制后端构建产物
        Copy-Item -Path "$ProjectDir\api-new" -Destination $PmsyDir -Recurse -Force
        
        # 复制 Docker 镜像
        Copy-Item -Path "docker-images" -Destination $PmsyDir -Recurse -Force
        
        # 复制配置文件
        Copy-Item -Path "$ProjectDir\config\docker\docker-compose.yml" -Destination $PmsyDir -Force
        Copy-Item -Path "$ProjectDir\config\nginx\nginx.conf" -Destination "$PmsyDir\nginx.conf" -Force
        
        # 复制环境配置
        if (Test-Path "$ProjectDir\config\env\.env.production") {
            Copy-Item -Path "$ProjectDir\config\env\.env.production" -Destination "$PmsyDir\.env" -Force
        } elseif (Test-Path "$ProjectDir\config\env\.env.example") {
            Copy-Item -Path "$ProjectDir\config\env\.env.example" -Destination "$PmsyDir\.env" -Force
        }
        
        Write-Host "$Green   ✅ 部署包准备完成$Reset"
        Write-Host ""
        
        Write-Host "$Yellow   上传到服务器...$Reset"
        try {
            # 检查服务器目录是否存在，不存在则创建
            $MkdirScript = @"
mkdir -p '$DeployDir'
"@
            ssh -p $ServerPort $ServerUser@$ServerIp $MkdirScript
            
            # 上传文件
            Write-Host "   上传部署包..."
            scp -r "$PmsyDir/*" "${ServerUser}@${ServerIp}:${DeployDir}/"
            
            Write-Host "$Green   ✅ 上传完成$Reset"
        } catch {
            Write-Host "$Red❌ 上传失败: $($_.Exception.Message)$Reset"
            exit 1
        }
        
        # 清理临时目录和镜像目录
        Remove-Item -Path $DeployTmp -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "docker-images" -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "$Yellow   在服务器上执行部署...$Reset"
        try {
            # 执行远程脚本
            $RemoteScript = @"
set -e

echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo "   请确保当前用户有免密码 sudo 权限"
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "$DeployDir"

echo "   [服务器] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "     导入 $(basename "$tarfile")..."
        sudo docker load < "$tarfile" || echo "     警告: 导入失败"
    fi
done
rm -rf docker-images

echo "   [服务器] 更新配置..."
sed -i "s|API_URL=.*|API_URL=http://$ServerIp|" .env

echo "   [服务器] 启动服务..."
sudo docker-compose up -d

echo "   [服务器] 等待服务启动..."
sleep 10

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL 就绪"
        break
    fi
    echo "   等待 PostgreSQL... ($i/30)"
    sleep 2
done

for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API 服务就绪"
        break
    fi
    echo "   等待 API 服务... ($i/30)"
    sleep 2
done

echo "   [服务器] 执行数据库初始化..."
sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -f /docker-entrypoint-initdb.d/999_complete_schema.sql 2>/dev/null || true

echo "   [服务器] 执行管理员初始化..."
# 只执行管理员用户种子数据，跳过示例项目数据
sudo docker-compose exec -T api sh -c "cd /app && npx knex seed:run --specific=001_seed_admin_user.ts" 2>/dev/null || true

echo "   [服务器] ✅ 部署完成"
"@
            
            # 执行远程脚本
            ssh -p $ServerPort $ServerUser@$ServerIp "$RemoteScript"
            Write-Host "$Green   ✅ 服务器部署完成$Reset"
        } catch {
            Write-Host "$Red❌ 服务器部署失败: $($_.Exception.Message)$Reset"
            exit 1
        }
    }
    "offline" {
        Write-Host "$Blue[步骤 5/5] 完全离线部署（生成离线部署包）...$Reset"
        Write-Host ""
        
        Write-Host "$Yellow   请选择目标服务器架构:$Reset"
        Write-Host ""
        Write-Host "  [1] AMD64 (x86_64) - 大多数服务器"
        Write-Host "  [2] ARM64 (aarch64) - 树莓派/ARM服务器"
        Write-Host ""
        
        $Arch = ""
        while ($true) {
            $ArchChoice = Read-Host "   请选择架构 (1/2)"
            switch ($ArchChoice) {
                "1" {
                    $Arch = "amd64"
                    Write-Host "$Green   已选择: AMD64 架构$Reset"
                    break
                }
                "2" {
                    $Arch = "arm64"
                    Write-Host "$Green   已选择: ARM64 架构$Reset"
                    break
                }
                default {
                    Write-Host "$Yellow   无效选择，请重新输入$Reset"
                    continue
                }
            }
            break
        }
        
        Write-Host ""
        Write-Host "$Yellow   导出 Docker 镜像（$Arch 架构）...$Reset"
        New-Item -ItemType Directory -Path "docker-images" -Force | Out-Null
        
        $Images = @(
            "postgres:15-alpine",
            "redis:7-alpine",
            "minio/minio:latest",
            "node:18-alpine",
            "nginx:alpine"
        )
        
        foreach ($Image in $Images) {
            $Filename = $Image -replace '/', '_' -replace ':', '_' + ".tar"
            Write-Host "     导出 $Image..."
            try {
                docker pull --platform linux/$Arch "$Image" 2>$null
                docker save "$Image" -o "docker-images\$Filename" 2>$null
                Write-Host "     ✅ 导出成功"
            } catch {
                Write-Host "     ⚠️  导出失败: $($_.Exception.Message)"
            }
        }
        
        # 生成离线部署包
        $OfflineDir = "pmsy-offline-deploy-$Arch-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $OfflineDir -Force | Out-Null
        
        # 复制文件
        Copy-Item -Path "$ProjectDir\dist" -Destination $OfflineDir -Recurse -Force
        Copy-Item -Path "$ProjectDir\api-new" -Destination $OfflineDir -Recurse -Force
        Copy-Item -Path "docker-images" -Destination $OfflineDir -Recurse -Force
        Copy-Item -Path "$ProjectDir\config\docker\docker-compose.yml" -Destination $OfflineDir -Force
        Copy-Item -Path "$ProjectDir\config\nginx\nginx.conf" -Destination "$OfflineDir\nginx.conf" -Force
        
        # 复制环境配置
        if (Test-Path "$ProjectDir\config\env\.env.production") {
            Copy-Item -Path "$ProjectDir\config\env\.env.production" -Destination "$OfflineDir\.env.example" -Force
        } elseif (Test-Path "$ProjectDir\config\env\.env.example") {
            Copy-Item -Path "$ProjectDir\config\env\.env.example" -Destination "$OfflineDir\.env.example" -Force
        }
        
        # 创建部署指导文件
        @"
# PMSY 离线部署指导

## 部署包内容

此部署包包含：
- ✅ 前端构建文件 (dist/)
- ✅ API 服务代码 (api-new/)
- ✅ Docker 镜像文件 (docker-images/)
- ✅ 服务配置文件 (docker-compose.yml)

## 前置要求

目标服务器需要安装：
- Docker
- Docker Compose

## 部署步骤

### 1. 上传部署包到服务器

```bash
scp -r $OfflineDir user@your-server:/opt/
```

### 2. 配置环境变量

```bash
cd /opt/$OfflineDir
cp .env.example .env
vim .env

# 修改以下配置：
# - API_URL: http://你的服务器IP
# - DB_PASSWORD: 数据库密码
# - JWT_SECRET: JWT密钥
# - MINIO_SECRET_KEY: MinIO密钥
```

### 3. 执行部署

```bash
sudo ./deploy/scripts/offline-deploy.sh
```

或手动执行：

```bash
# 导入 Docker 镜像
for tarfile in docker-images/*.tar; do
    sudo docker load < "$tarfile"
done

# 启动服务
sudo docker-compose up -d

# 等待服务启动
sleep 30

# 执行数据库迁移
sudo docker-compose exec api sh -c "cd /app && npm run db:migrate"
```

## 默认账号

- 管理员: admin@pmsy.com / Willyou@2026
"@ | Out-File -FilePath "$OfflineDir\部署指导.md" -Force
        
        # 创建离线部署脚本
        New-Item -ItemType Directory -Path "$OfflineDir\deploy\scripts" -Force | Out-Null
        @"
#!/bin/bash
set -e

echo "=========================================="
echo "PMSY 离线部署脚本"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../.."

if [ ! -d "docker-images" ]; then
    echo "❌ 错误: 未找到 docker-images 目录"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请复制 .env.example 为 .env 并修改配置"
    exit 1
fi

echo "[1/6] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "  导入 $(basename "$tarfile")..."
        sudo docker load < "$tarfile" || echo "  警告: 导入失败"
    fi
done
echo ""

echo "[2/6] 启动服务..."
sudo docker-compose up -d
echo ""

echo "[3/6] 等待服务启动..."
sleep 30

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U pmsy > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL 就绪"
        break
    fi
    echo "  等待 PostgreSQL... ($i/30)"
    sleep 2
done

echo ""
echo "[4/6] 执行数据库迁移..."
sudo docker-compose exec api sh -c "cd /app && npm run db:migrate" 2>/dev/null || echo "  警告: 迁移可能已完成"
echo ""

echo "[5/6] 检查服务状态..."
sudo docker-compose ps
echo ""

echo "[6/6] 部署完成!"
echo ""
echo "访问地址:"
echo "  - 前端: http://$(hostname -I | awk '{print $1}')"
echo "  - API: http://$(hostname -I | awk '{print $1}')/api/health"
echo ""
echo "默认账号:"
echo "  - 管理员: admin@pmsy.com / Willyou@2026"
echo ""
"@ | Out-File -FilePath "$OfflineDir\deploy\scripts\offline-deploy.sh" -Force
        
        # 设置执行权限
        ssh -p $ServerPort $ServerUser@$ServerIp "chmod +x '$OfflineDir/deploy/scripts/offline-deploy.sh'" 2>$null
        
        # 打包
        Write-Host "$Yellow   打包离线部署包...$Reset"
        try {
            tar -czf "$OfflineDir.tar.gz" "$OfflineDir"
            Remove-Item -Path $OfflineDir -Recurse -Force
            
            Write-Host "$Green   ✅ 离线部署包已生成$Reset"
            Write-Host ""
            Write-Host "$Cyan========================================$Reset"
            Write-Host "$Cyan离线部署包: $OfflineDir.tar.gz$Reset"
            Write-Host "$Cyan========================================$Reset"
            Write-Host ""
            Write-Host "请按以下步骤完成部署:"
            Write-Host ""
            Write-Host "1. 将离线包上传到目标服务器:"
            Write-Host "   scp $OfflineDir.tar.gz user@your-server:/opt/"
            Write-Host ""
            Write-Host "2. 在服务器上解压并部署:"
            Write-Host "   ssh user@your-server"
            Write-Host "   cd /opt && tar -xzf $OfflineDir.tar.gz"
            Write-Host "   cd $OfflineDir"
            Write-Host "   vim .env  # 配置服务器IP和密码"
            Write-Host "   sudo ./deploy/scripts/offline-deploy.sh"
            Write-Host ""
        } catch {
            Write-Host "$Red❌ 打包失败: $($_.Exception.Message)$Reset"
        }
    }
    "offline" {
        Write-Host "$Blue[步骤 5/5] 完全离线部署（生成离线部署包）...$Reset"
        Write-Host ""
        
        Write-Host "$Yellow   请选择目标服务器架构:$Reset"
        Write-Host ""
        Write-Host "  [1] AMD64 (x86_64) - 大多数服务器"
        Write-Host "  [2] ARM64 (aarch64) - 树莓派/ARM服务器"
        Write-Host ""
        
        $Arch = ""
        while ($true) {
            $ArchChoice = Read-Host "   请选择架构 (1/2)"
            switch ($ArchChoice) {
                "1" {
                    $Arch = "amd64"
                    Write-Host "$Green   已选择: AMD64 架构$Reset"
                    break
                }
                "2" {
                    $Arch = "arm64"
                    Write-Host "$Green   已选择: ARM64 架构$Reset"
                    break
                }
                default {
                    Write-Host "$Yellow   无效选择，请重新输入$Reset"
                    continue
                }
            }
            break
        }
        
        Write-Host ""
        Write-Host "$Yellow   导出 Docker 镜像（$Arch 架构）...$Reset"
        New-Item -ItemType Directory -Path "docker-images" -Force | Out-Null
        
        $Images = @(
            "postgres:15-alpine",
            "redis:7-alpine",
            "minio/minio:latest",
            "nginx:alpine"
        )
        
        foreach ($Image in $Images) {
            $Filename = $Image -replace '/', '_' -replace ':', '_' + ".tar"
            Write-Host "     导出 $Image..."
            try {
                docker pull --platform linux/$Arch "$Image" 2>$null
                docker save "$Image" -o "docker-images\$Filename" 2>$null
                Write-Host "     ✅ 导出成功"
            } catch {
                Write-Host "     ⚠️  导出失败: $($_.Exception.Message)"
            }
        }
        
        # 导出自定义 API 镜像
        Write-Host "     导出 pmsy-api:latest..."
        try {
            docker save pmsy-api:latest -o "docker-images\pmsy-api_latest.tar" 2>$null
            Write-Host "     ✅ 导出成功"
        } catch {
            Write-Host "     ⚠️  导出失败: $($_.Exception.Message)"
        }
        
        # 生成离线部署包
        $OfflineDir = "pmsy-offline-deploy-$Arch-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $OfflineDir -Force | Out-Null
        
        # 复制文件
        Copy-Item -Path "$ProjectDir\dist" -Destination $OfflineDir -Recurse -Force
        Copy-Item -Path "docker-images" -Destination $OfflineDir -Recurse -Force
        Copy-Item -Path "$ProjectDir\config\docker\docker-compose.yml" -Destination $OfflineDir -Force
        Copy-Item -Path "$ProjectDir\config\nginx\nginx.conf" -Destination "$OfflineDir\nginx.conf" -Force
        
        # 复制环境配置
        if (Test-Path "$ProjectDir\config\env\.env.production") {
            Copy-Item -Path "$ProjectDir\config\env\.env.production" -Destination "$OfflineDir\.env.example" -Force
        } elseif (Test-Path "$ProjectDir\config\env\.env.example") {
            Copy-Item -Path "$ProjectDir\config\env\.env.example" -Destination "$OfflineDir\.env.example" -Force
        }
        
        # 创建部署指导文件
        @"
# PMSY 离线部署指导

## 部署包内容

此部署包包含：
- ✅ 前端构建文件 (dist/)
- ✅ Docker 镜像文件 (docker-images/) - 包含 API 服务镜像
- ✅ 服务配置文件 (docker-compose.yml)
- ✅ 部署脚本 (deploy/)

## 前置要求

目标服务器需要安装：
- Docker
- Docker Compose

## 部署步骤

### 1. 上传部署包到服务器

```bash
scp -r $OfflineDir user@your-server:/opt/
```

### 2. 配置环境变量

```bash
cd /opt/$OfflineDir
cp .env.example .env
vim .env

# 修改以下配置：
# - API_URL: http://你的服务器IP
# - DB_PASSWORD: 数据库密码
# - JWT_SECRET: JWT密钥
# - MINIO_SECRET_KEY: MinIO密钥
```

### 3. 执行部署

```bash
sudo ./deploy/scripts/offline-deploy.sh
```

或手动执行：

```bash
# 导入 Docker 镜像
for tarfile in docker-images/*.tar; do
    sudo docker load < "$tarfile"
done

# 启动服务
sudo docker-compose up -d

# 等待服务启动
sleep 30

# 执行数据库初始化
sudo docker-compose exec postgres psql -U pmsy -d pmsy -f /docker-entrypoint-initdb.d/999_complete_schema.sql

# 执行种子数据
sudo docker-compose exec api sh -c "cd /app && npx knex seed:run --specific=001_seed_admin_user.ts"
```

## 默认账号

### 管理员账号
- **用户名**: admin
- **邮箱**: admin@pmsy.com
- **密码**: Willyou@2026

### 数据库配置
- **数据库**: pmsy
- **用户**: pmsy
- **密码**: (见 .env 文件 DB_PASSWORD)

### MinIO 配置
- **Access Key**: minioadmin
- **Secret Key**: (见 .env 文件 MINIO_SECRET_KEY)
- **管理界面**: http://你的服务器IP:9001

## 故障排查

```bash
# 查看日志
sudo docker-compose logs -f

# 检查服务状态
sudo docker-compose ps
```
"@ | Out-File -FilePath "$OfflineDir\部署指导.md" -Force
        
        # 创建离线部署脚本
        New-Item -ItemType Directory -Path "$OfflineDir\deploy\scripts" -Force | Out-Null
        @"
#!/bin/bash
set -e

echo "=========================================="
echo "PMSY 离线部署脚本"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../.."

if [ ! -d "docker-images" ]; then
    echo "❌ 错误: 未找到 docker-images 目录"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请复制 .env.example 为 .env 并修改配置"
    exit 1
fi

echo "[1/6] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "  导入 $(basename "$tarfile")..."
        sudo docker load < "$tarfile" || echo "  警告: 导入失败"
    fi
done
rm -rf docker-images
echo ""

echo "[2/6] 启动服务..."
sudo docker-compose up -d
echo ""

echo "[3/6] 等待服务启动..."
sleep 30

echo "[4/6] 等待 PostgreSQL 就绪..."
for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U pmsy > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL 就绪"
        break
    fi
    echo "  等待 PostgreSQL... ($i/30)"
    sleep 2
done

echo "[5/6] 执行数据库初始化..."
sudo docker-compose exec -T postgres psql -U pmsy -d pmsy -f /docker-entrypoint-initdb.d/999_complete_schema.sql 2>/dev/null || true
echo ""

echo "[6/6] 执行管理员初始化..."
sudo docker-compose exec -T api sh -c "cd /app && npx knex seed:run --specific=001_seed_admin_user.ts" 2>/dev/null || true
echo ""

echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
echo ""
echo "📍 访问地址:"
echo "  - 前端: http://<服务器IP>"
echo "  - API: http://<服务器IP>/api/health"
echo ""
echo "👤 默认管理员账号:"
echo "  - 用户名: admin"
echo "  - 邮箱: admin@pmsy.com"
echo "  - 密码: Willyou@2026"
echo ""
echo "🗄️  数据库默认配置:"
echo "  - 数据库: pmsy"
echo "  - 用户: pmsy"
echo "  - 密码: (见 .env 文件)"
echo ""
echo "📦 MinIO 默认配置:"
echo "  - Access Key: minioadmin"
echo "  - Secret Key: (见 .env 文件)"
echo "  - 管理界面: http://<服务器IP>:9001"
echo ""
echo "⚠️  请保存以上信息！"
echo ""
"@ | Out-File -FilePath "$OfflineDir\deploy\scripts\offline-deploy.sh" -Force
        
        # 设置执行权限
        try {
            # 在Windows上设置执行权限
            icacls "$OfflineDir\deploy\scripts\offline-deploy.sh" /grant Everyone:F 2>$null
        } catch {
            # 忽略权限设置错误
        }
        
        # 打包
        Write-Host "$Yellow   打包离线部署包...$Reset"
        try {
            # 使用7zip或tar打包
            if (Get-Command "7z" -ErrorAction SilentlyContinue) {
                7z a -tzip "$OfflineDir.zip" "$OfflineDir"
                Remove-Item -Path $OfflineDir -Recurse -Force
                $OfflinePackage = "$OfflineDir.zip"
            } else {
                # 使用PowerShell压缩
                Compress-Archive -Path $OfflineDir -DestinationPath "$OfflineDir.zip" -Force
                Remove-Item -Path $OfflineDir -Recurse -Force
                $OfflinePackage = "$OfflineDir.zip"
            }
            
            Write-Host "$Green   ✅ 离线部署包已生成$Reset"
            Write-Host ""
            Write-Host "$Cyan========================================$Reset"
            Write-Host "$Cyan离线部署包: $OfflinePackage$Reset"
            Write-Host "$Cyan========================================$Reset"
            Write-Host ""
            Write-Host "请按以下步骤完成部署:"
            Write-Host ""
            Write-Host "1. 将离线包上传到目标服务器:"
            Write-Host "   scp $OfflinePackage user@your-server:/opt/"
            Write-Host ""
            Write-Host "2. 在服务器上解压并部署:"
            Write-Host "   ssh user@your-server"
            Write-Host "   cd /opt && unzip $OfflinePackage"
            Write-Host "   cd $OfflineDir"
            Write-Host "   vim .env  # 配置服务器IP和密码"
            Write-Host "   sudo ./deploy/scripts/offline-deploy.sh"
            Write-Host ""
        } catch {
            Write-Host "$Red❌ 打包失败: $($_.Exception.Message)$Reset"
        }
        
        # 清理镜像目录
        Remove-Item -Path "docker-images" -Recurse -Force -ErrorAction SilentlyContinue
        exit 0
    }
}

# ==========================================
# 公共步骤：验证部署
# ==========================================
Write-Host "$Blue[步骤 6/6] 验证部署...$Reset"
Write-Host ""

if ($DeployMode -ne "offline") {
    sleep 5
    
    Write-Host "   测试 API 健康检查..."
    try {
        $HealthResult = Invoke-RestMethod -Uri "http://$ServerIp/api/health" -ErrorAction SilentlyContinue
        if ($HealthResult) {
            Write-Host "$Green   ✅ API 服务响应正常$Reset"
        } else {
            Write-Host "$Yellow   ⚠️ API 服务可能未就绪，请手动检查$Reset"
        }
    } catch {
        Write-Host "$Yellow   ⚠️ API 服务可能未就绪，请手动检查: $($_.Exception.Message)$Reset"
    }
}

Write-Host ""
Write-Host "$Green==========================================$Reset"
Write-Host "$Green🎉 全新部署完成!$Reset"
Write-Host "$Green==========================================$Reset"
Write-Host ""
Write-Host "📍 访问地址:"
Write-Host "  - 前端: http://$ServerIp`:6969"
Write-Host "  - API: http://$ServerIp`:6969/api/health"
Write-Host ""
Write-Host "👤 默认管理员账号:"
Write-Host "  - 用户名: admin"
Write-Host "  - 邮箱: admin@pmsy.com"
Write-Host "  - 密码: Willyou@2026"
Write-Host ""
Write-Host "🗄️  数据库默认配置:"
Write-Host "  - 数据库: pmsy"
Write-Host "  - 用户: pmsy"
Write-Host "  - 密码: (见 .env 文件 DB_PASSWORD)"
Write-Host ""
Write-Host "📦 MinIO 默认配置:"
Write-Host "  - Access Key: minioadmin"
Write-Host "  - Secret Key: (见 .env 文件 MINIO_SECRET_KEY)"
Write-Host "  - 管理界面: http://$ServerIp:9001"
Write-Host ""
Write-Host "📁 配置文件位置:"
Write-Host "  - 服务器: $DeployDir/.env"
Write-Host ""
Write-Host "$Yellow⚠️  请保存以上信息，并测试登录功能确认部署成功$Reset"
Write-Host ""
Write-Host "$Blue查看日志:$Reset"
$LogCommand = "ssh ${ServerUser}@${ServerIp} 'cd ${DeployDir} && sudo docker-compose logs -f'"
Write-Host "  $LogCommand"
Write-Host ""
