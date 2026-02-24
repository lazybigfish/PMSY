[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

chcp 65001 | Out-Null

# ==========================================
# PMSY Development Environment Stop Script
# ==========================================
#
# Function: Stop backend API service and frontend dev server
# Usage: .\deploy\windows\dev-scripts\stop-dev.ps1
#
# ==========================================

# Set error handling
$ErrorActionPreference = "Continue"

# Color definitions using [char] for compatibility
$Red = [char]0x1B + "[91m"
$Green = [char]0x1B + "[92m"
$Yellow = [char]0x1B + "[93m"
$Blue = [char]0x1B + "[94m"
$Cyan = [char]0x1B + "[96m"
$Reset = [char]0x1B + "[0m"

Write-Host "${Blue}==========================================${Reset}"
Write-Host "${Blue}PMSY Development Environment Stop${Reset}"
Write-Host "${Blue}==========================================${Reset}"
Write-Host ""

# Stop backend service
Write-Host "${Cyan}[1/2] Stopping backend API service...${Reset}"
try {
    if (Test-Path "$env:TEMP\pmsy-api.pid") {
        $savedPid = Get-Content "$env:TEMP\pmsy-api.pid"
        try {
            $process = Get-Process -Id $savedPid -ErrorAction Stop
            $process | Stop-Process -Force
            Write-Host "${Green}Backend service stopped (PID: $savedPid)${Reset}"
        } catch {
            Write-Host "${Yellow}Backend service process not found${Reset}"
        }
        Remove-Item -Path "$env:TEMP\pmsy-api.pid" -Force
    } else {
        # Try to find process by port
        try {
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 3001 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId | Stop-Process -Force
                Write-Host "${Green}Backend service stopped (PID: $processId)${Reset}"
            }
            if ($tcpConnections.Count -eq 0) {
                Write-Host "${Yellow}Backend service process not found${Reset}"
            }
        } catch {
            Write-Host "${Yellow}Backend service process not found${Reset}"
        }
    }
} catch {
    Write-Host "${Yellow}Error stopping backend service: $($_.Exception.Message)${Reset}"
}
Write-Host ""

# Stop frontend service
Write-Host "${Cyan}[2/2] Stopping frontend development server...${Reset}"
try {
    if (Test-Path "$env:TEMP\pmsy-client.pid") {
        $savedPid = Get-Content "$env:TEMP\pmsy-client.pid"
        try {
            $process = Get-Process -Id $savedPid -ErrorAction Stop
            $process | Stop-Process -Force
            Write-Host "${Green}Frontend service stopped (PID: $savedPid)${Reset}"
        } catch {
            Write-Host "${Yellow}Frontend service process not found${Reset}"
        }
        Remove-Item -Path "$env:TEMP\pmsy-client.pid" -Force
    } else {
        # Try to find process by port
        $foundProcess = $false
        try {
            # Try port 5173
            $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5173 -and $_.State -eq "Listen"}
            foreach ($conn in $tcpConnections) {
                $processId = $conn.OwningProcess
                Get-Process -Id $processId | Stop-Process -Force
                Write-Host "${Green}Frontend service stopped (PID: $processId)${Reset}"
                $foundProcess = $true
            }

            # Try port 5174
            if (-not $foundProcess) {
                $tcpConnections = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5174 -and $_.State -eq "Listen"}
                foreach ($conn in $tcpConnections) {
                    $processId = $conn.OwningProcess
                    Get-Process -Id $processId | Stop-Process -Force
                    Write-Host "${Green}Frontend service stopped (PID: $processId)${Reset}"
                    $foundProcess = $true
                }
            }

            if (-not $foundProcess) {
                Write-Host "${Yellow}Frontend service process not found${Reset}"
            }
        } catch {
            Write-Host "${Yellow}Frontend service process not found${Reset}"
        }
    }
} catch {
    Write-Host "${Yellow}Error stopping frontend service: $($_.Exception.Message)${Reset}"
}
Write-Host ""

Write-Host "${Green}==========================================${Reset}"
Write-Host "${Green}Development environment stopped${Reset}"
Write-Host "${Green}==========================================${Reset}"
Write-Host ""
Write-Host "Start services:"
Write-Host "  .\deploy\windows\dev-scripts\start-dev.ps1"
Write-Host ""
