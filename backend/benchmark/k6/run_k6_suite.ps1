# Master CarryGo k6 Benchmark and Testing Orchestrator
$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[CarryGo] Comprehensive k6 Performance and Stress Test Suite" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$k6Bin = "C:\Program Files\k6\k6.exe"
if (-not (Test-Path $k6Bin)) {
    $k6Cmd = Get-Command k6 -ErrorAction SilentlyContinue
    if ($k6Cmd) {
        $k6Bin = $k6Cmd.Source
    } else {
        Write-Error "k6 binary not found on system!"
        exit 1
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Resolve-Path "$scriptDir\..\.."
$distServer = "$backendDir\dist\local-server.js"

# 1. Check if server is running
$serverStartedByScript = $false
$serverProcess = $null

try {
    $healthCheck = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] CarryGo local backend is already running on http://127.0.0.1:4000" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Server not running. Building and starting local backend..." -ForegroundColor Yellow
    
    Set-Location $backendDir
    & pnpm run build
    
    $envFile = "$backendDir\.env"
    $nodeArgs = "--env-file=`"$envFile`" `"$distServer`""
    $serverProcess = Start-Process -FilePath "node" -ArgumentList $nodeArgs -PassThru -NoNewWindow
    $serverStartedByScript = $true
    
    # Wait for readiness
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 1 -ErrorAction Stop
            if ($resp.status -eq 'ok') {
                $ready = $true
                break
            }
        } catch {}
    }
    
    if (-not $ready) {
        Write-Error "Failed to start local backend on port 4000."
        if ($serverProcess) { Stop-Process -Id $serverProcess.Id -Force }
        exit 1
    }
    Write-Host "[OK] Local backend started successfully (PID: $($serverProcess.Id))" -ForegroundColor Green
}

Set-Location $scriptDir

$tests = @(
    @{ Name = "01: App Status & Health Probes"; File = "01_app_status_health.js" },
    @{ Name = "02: Functional API & Idempotency Suite"; File = "02_api_functional_suite.js" },
    @{ Name = "03: Request & Booking Lifecycle Flow"; File = "03_request_lifecycle_flow.js" },
    @{ Name = "04: Throttling, Burst & Rate Limits"; File = "04_throttling_rate_limits.js" },
    @{ Name = "05: Stress, Concurrency & Load Shedding"; File = "05_stress_and_load.js" },
    @{ Name = "06: Network Resilience & Latencies"; File = "06_network_resilience.js" },
    @{ Name = "07: Supabase Cloud Database Performance"; File = "07_supabase_cloud.js" }
)

$results = @()

foreach ($t in $tests) {
    Write-Host ""
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host ">> Running Test: $($t.Name)" -ForegroundColor Magenta
    Write-Host "   File: $($t.File)" -ForegroundColor DarkGray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Magenta
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & "$k6Bin" run "$($t.File)"
    $exitCode = $LASTEXITCODE
    $sw.Stop()
    
    $status = if ($exitCode -eq 0) { "PASSED" } else { "FAILED (Code: $exitCode)" }
    $results += [PSCustomObject]@{
        Test = $t.Name
        Status = $status
        DurationSec = [Math]::Round($sw.Elapsed.TotalSeconds, 2)
    }
}

# Cleanup server if we started it
if ($serverStartedByScript -and $serverProcess) {
    Write-Host ""
    Write-Host "[CLEANUP] Shutting down backend process (PID: $($serverProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $serverProcess.Id -Force
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[SUMMARY] Final CarryGo k6 Benchmark Execution Summary" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
