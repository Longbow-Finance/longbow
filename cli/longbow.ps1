# Longbow CLI launcher for PowerShell.
#
#   ./longbow.ps1              # interactive menu
#   ./longbow.ps1 stats        # token statistics
#   ./longbow.ps1 how          # how it works
#
# Your private key never leaves this machine. See cli/src/client.ts.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is required. Install it from https://nodejs.org (LTS)." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path (Join-Path $here "node_modules"))) {
    Write-Host "First run: installing dependencies..." -ForegroundColor DarkGray
    npm install --silent
}

# Pass all arguments through to the CLI.
npx --yes tsx src/index.ts @args
