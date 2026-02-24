[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

chcp 65001 | Out-Null

# ==========================================
# PMSY Development Environment Start Script
# ==========================================
#
# Function: Compile and start backend API service and frontend dev server
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

# Compile backend service
function Build-Backend {
    Write-Host "${Cyan}[0/2] Compiling backend API service...${Reset}"
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
    Write-Host "${Cyan}[1/2] Starting backend API service...${Reset}"
    if (Check-Port 3001) {
        Write-Host "${Yellow}Warning: Port 3001 is already in use, backend service may already be running${Reset}"
        Write-Host "${Yellow}Attempting to restart backend service...${Reset}"
        # Stop existing service
        try {
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 3001 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId | Stop-Process -Force
            }
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "${Yellow}Warning: Failed to stop existing service, may need manual stop${Reset}"
        }
    }

    Write-Host "${Green}Starting backend service (http://localhost:3001)${Reset}"
    cd "$ProjectDir\api-new"

    # Start backend service
    $NpmPath = (Get-Command npm).Source
    $BackendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", "`"$NpmPath`"", "start" -WorkingDirectory "$ProjectDir\api-new" -NoNewWindow -PassThru
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
    Write-Host "${Cyan}[2/2] Starting frontend development server...${Reset}"
    if (Check-Port 5173) {
        Write-Host "${Yellow}Warning: Port 5173 is already in use, frontend service may already be running${Reset}"
        Write-Host "${Yellow}Attempting to restart frontend service...${Reset}"
        # Stop existing service
        try {
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5173 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId | Stop-Process -Force
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

    # Start frontend service
    $NpmPath = (Get-Command npm).Source
    $FrontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", "`"$NpmPath`"", "run", "client:dev" -WorkingDirectory "$ProjectDir" -NoNewWindow -PassThru
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
    Write-Host "  - Frontend: http://localhost:5173"
    Write-Host "  - Backend: http://localhost:3001"
    Write-Host ""
    Write-Host "Stop services:"
    Write-Host "  .\deploy\windows\dev-scripts\stop-dev.ps1"
    Write-Host ""
}

# Main process
function Main {
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
