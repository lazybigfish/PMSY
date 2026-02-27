[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

chcp 65001 | Out-Null

# ==========================================
# PMSY Development Environment Restart Script
# ==========================================
#
# Function: Stop all services (including Docker), compile code, then restart everything
# Usage: .\deploy\windows\dev-scripts\restart-dev.ps1 [-KeepDocker]
#
# Parameters:
#   -KeepDocker: Keep Docker services running (only restart frontend and backend)
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

# Get script and project paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $ScriptDir))

# Parse parameters
$KeepDocker = $false
foreach ($arg in $args) {
    if ($arg -eq "-KeepDocker" -or $arg -eq "--keep-docker" -or $arg -eq "-k") {
        $KeepDocker = $true
    }
}

Write-Host ""
Write-Host "${Blue}==========================================${Reset}"
Write-Host "${Blue}PMSY Development Environment Restart${Reset}"
Write-Host "${Blue}==========================================${Reset}"
Write-Host ""

if ($KeepDocker) {
    Write-Host "${Cyan}Mode: Keep Docker running (only restart frontend/backend)${Reset}"
} else {
    Write-Host "${Cyan}Mode: Full restart (including Docker services)${Reset}"
}
Write-Host ""

# Step 1: Stop all services
Write-Host "${Cyan}Step 1/3: Stopping all services${Reset}"
try {
    if ($KeepDocker) {
        & "$ScriptDir\stop-dev.ps1" -KeepDocker
    } else {
        & "$ScriptDir\stop-dev.ps1"
    }
} catch {
    Write-Host "${Red}Error: Failed to stop services: $($_.Exception.Message)${Reset}"
    exit 1
}

Write-Host ""
Write-Host "${Cyan}Waiting 2 seconds to ensure services are fully stopped...${Reset}"
Start-Sleep -Seconds 2
Write-Host ""

# Step 2: Compile backend (only if not keeping Docker, or if explicitly needed)
Write-Host "${Cyan}Step 2/3: Compiling backend code${Reset}"
cd "$ProjectDir\api-new"

try {
    if (!(Test-Path "node_modules")) {
        Write-Host "${Yellow}Warning: Backend dependencies not installed, installing...${Reset}"
        npm install
    }

    Write-Host "${Cyan}Compiling backend TypeScript...${Reset}"
    $BuildResult = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "${Green}Success: Backend compilation successful${Reset}"
    } else {
        Write-Host "${Red}Error: Backend compilation failed, please check error messages${Reset}"
        Write-Host $BuildResult
        exit 1
    }
} catch {
    Write-Host "${Red}Error: Compilation failed: $($_.Exception.Message)${Reset}"
    exit 1
}
Write-Host ""

# Step 3: Start all services
Write-Host "${Cyan}Step 3/3: Starting all services${Reset}"
try {
    & "$ScriptDir\start-dev.ps1"
} catch {
    Write-Host "${Red}Error: Failed to start services: $($_.Exception.Message)${Reset}"
    exit 1
}

Write-Host ""
Write-Host "${Green}==========================================${Reset}"
Write-Host "${Green}Restart completed!${Reset}"
Write-Host "${Green}==========================================${Reset}"
Write-Host ""
