[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

chcp 65001 | Out-Null

# ==========================================
# PMSY Development Environment Start Script
# ==========================================
#
# Function: Start Docker services, compile and start backend API service and frontend dev server
# Usage: .\deploy\windows\dev-scripts\start-dev.ps1
#
# ==========================================

# Set error handling
$ErrorActionPreference = "Stop"

# Color definitions using [char] for compatibility
$Red = [char]0x1B + "[91m"
$Green = [char]0x1B + "[92m"
$Yellow = [char]0x1B + "[93m"
$Blue = [char]0x1B + "[94m"
$Cyan = [char]0x1B + "[96m"
$Reset = [char]0x1B + "[0m"

# Get project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $ScriptDir))

Write-Host "${Blue}==========================================${Reset}"
Write-Host "${Blue}PMSY Development Environment Start${Reset}"
Write-Host "${Blue}==========================================${Reset}"
Write-Host ""

cd $ProjectDir

# Check port usage
function Check-Port {
    param([int]$Port)
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    try {
        $TcpClient.Connect("localhost", $Port)
        $TcpClient.Close()
        return $true
    } catch {
        return $false
    }
}

# Check if Docker is running
function Check-Docker {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Start Docker services
function Start-DockerServices {
    Write-Host "${Cyan}[1/4] Starting Docker services...${Reset}"

    # Check Docker is running
    if (!(Check-Docker)) {
        Write-Host "${Red}Error: Docker is not running. Please start Docker Desktop first.${Reset}"
        exit 1
    }

    # Check if docker-compose.yml exists
    $DockerComposePath = "$ProjectDir\config\docker\docker-compose.yml"
    if (!(Test-Path $DockerComposePath)) {
        Write-Host "${Red}Error: Docker compose file not found at $DockerComposePath${Reset}"
        exit 1
    }

    # Start Docker services
    Write-Host "${Cyan}Starting PostgreSQL, Redis, MinIO...${Reset}"
    try {
        docker-compose -f "$DockerComposePath" up -d
        if ($LASTEXITCODE -ne 0) {
            throw "Docker compose up failed"
        }
    } catch {
        Write-Host "${Red}Error: Failed to start Docker services: $($_.Exception.Message)${Reset}"
        exit 1
    }

    # Wait for services to be healthy
    Write-Host "${Cyan}Waiting for Docker services to be healthy...${Reset}"
    $maxAttempts = 30
    $attempt = 0
    $servicesReady = $false

    while ($attempt -lt $maxAttempts -and !$servicesReady) {
        $attempt++
        Start-Sleep -Seconds 2

        # Check PostgreSQL
        $pgReady = docker exec pmsy-postgres pg_isready -U pmsy 2>$null
        $pgHealthy = $LASTEXITCODE -eq 0

        # Check Redis
        $redisHealthy = $false
        try {
            $redisPing = docker exec pmsy-redis redis-cli ping 2>$null
            $redisHealthy = $redisPing -eq "PONG"
        } catch {}

        # Check MinIO
        $minioHealthy = $false
        try {
            $minioResponse = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -UseBasicParsing -TimeoutSec 5 2>$null
            $minioHealthy = $minioResponse.StatusCode -eq 200
        } catch {}

        if ($pgHealthy -and $redisHealthy -and $minioHealthy) {
            $servicesReady = $true
            Write-Host "${Green}All Docker services are ready${Reset}"
        } else {
            Write-Host "${Cyan}Waiting... (PostgreSQL: $pgHealthy, Redis: $redisHealthy, MinIO: $minioHealthy)${Reset}"
        }
    }

    if (!$servicesReady) {
        Write-Host "${Yellow}Warning: Docker services may not be fully ready, continuing anyway...${Reset}"
    }
    Write-Host ""
}

# Compile backend service
function Build-Backend {
    Write-Host "${Cyan}[2/4] Compiling backend API service...${Reset}"
    cd "$ProjectDir\api-new"

    if (!(Test-Path "node_modules")) {
        Write-Host "${Yellow}Warning: Backend dependencies not installed, installing...${Reset}"
        npm install
    }

    Write-Host "${Cyan}Compiling TypeScript...${Reset}"
    try {
        npm run build
        Write-Host "${Green}Backend compilation successful${Reset}"
    } catch {
        Write-Host "${Red}Backend compilation failed, please check error messages${Reset}"
        exit 1
    }
    Write-Host ""
}

# Start backend service
function Start-Backend {
    Write-Host "${Cyan}[3/4] Starting backend API service...${Reset}"
    if (Check-Port 3001) {
        Write-Host "${Yellow}Warning: Port 3001 is already in use, backend service may already be running${Reset}"
        Write-Host "${Yellow}Attempting to restart backend service...${Reset}"
        # Stop existing service
        try {
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 3001 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId -ErrorAction SilentlyContinue | Stop-Process -Force
            }
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "${Yellow}Warning: Failed to stop existing service, may need manual stop${Reset}"
        }
    }

    Write-Host "${Green}Starting backend service (http://localhost:3001)${Reset}"
    cd "$ProjectDir\api-new"

    # Start backend service in new window
    $BackendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ProjectDir\api-new'; npm start" -PassThru
    $BackendProcess.Id | Out-File -FilePath "$env:TEMP\pmsy-api.pid" -Force

    # Wait for backend to start
    Write-Host "${Cyan}Waiting for backend service to start...${Reset}"
    for ($i = 1; $i -le 30; $i++) {
        if (Check-Port 3001) {
            Write-Host "${Green}Backend service is ready${Reset}"
            break
        }
        Start-Sleep -Seconds 1
        if ($i -eq 30) {
            Write-Host "${Red}Backend service startup timeout, please check error messages${Reset}"
            exit 1
        }
    }
}

# Start frontend service
function Start-Frontend {
    Write-Host ""
    Write-Host "${Cyan}[4/4] Starting frontend development server...${Reset}"
    if (Check-Port 5173) {
        Write-Host "${Yellow}Warning: Port 5173 is already in use, frontend service may already be running${Reset}"
        Write-Host "${Yellow}Attempting to restart frontend service...${Reset}"
        # Stop existing service
        try {
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5173 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId -ErrorAction SilentlyContinue | Stop-Process -Force
            }
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "${Yellow}Warning: Failed to stop existing service, may need manual stop${Reset}"
        }
    }

    cd "$ProjectDir"

    if (!(Test-Path "node_modules")) {
        Write-Host "${Yellow}Warning: Frontend dependencies not installed, installing...${Reset}"
        npm install
    }

    Write-Host "${Green}Starting frontend service${Reset}"

    # Start frontend service in new window
    $FrontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ProjectDir'; npm run client:dev" -PassThru
    $FrontendProcess.Id | Out-File -FilePath "$env:TEMP\pmsy-client.pid" -Force

    # Wait for frontend to start
    Write-Host "${Cyan}Waiting for frontend service to start...${Reset}"
    for ($i = 1; $i -le 30; $i++) {
        if (Check-Port 5173) {
            Write-Host "${Green}Frontend service is ready${Reset}"
            break
        }
        Start-Sleep -Seconds 1
        if ($i -eq 30) {
            Write-Host "${Red}Frontend service startup timeout, please check error messages${Reset}"
            exit 1
        }
    }
}

# Show completion information
function Show-Completion {
    Write-Host ""
    Write-Host "${Green}==========================================${Reset}"
    Write-Host "${Green}Development environment started successfully!${Reset}"
    Write-Host "${Green}==========================================${Reset}"
    Write-Host ""
    Write-Host "Access addresses:"
    Write-Host "  - Frontend:    http://localhost:5173"
    Write-Host "  - Backend:     http://localhost:3001"
    Write-Host "  - PostgreSQL:  localhost:5432"
    Write-Host "  - Redis:       localhost:6379"
    Write-Host "  - MinIO:       http://localhost:9000 (Console: 9001)"
    Write-Host ""
    Write-Host "Stop services:"
    Write-Host "  .\deploy\windows\dev-scripts\stop-dev.ps1"
    Write-Host ""
}

# Main process
function Main {
    # Start Docker services
    Start-DockerServices

    # Compile backend
    Build-Backend

    # Start backend
    Start-Backend

    # Start frontend
    Start-Frontend

    # Show completion information
    Show-Completion
}

# Execute main function
Main
