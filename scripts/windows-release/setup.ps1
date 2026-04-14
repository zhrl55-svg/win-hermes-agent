# Hermes Agent for Windows - Installer Script
# Run as: powershell -ExecutionPolicy Bypass -File setup.ps1

param(
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$SkipFrontendBuild,
    [switch]$AutoStart,
    [string]$HermesHome = "$env:USERPROFILE\.hermes",
    [string]$InstallDir = "$env:LOCALAPPDATA\HermesAgent"
)

$ErrorActionPreference = "Stop"
$SCRIPT_VERSION = "1.0.0"
$REPO_URL = "https://github.com/zhrl55-svg/win-hermes"

# ANSI colours
function Write-Step($msg) { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[-] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }

$Separator = { Write-Host "----------------------------------------" -ForegroundColor DarkGray }

# Banner
Write-Host ""
Write-Host "  Hermes Agent for Windows" -ForegroundColor White
Write-Host "  Version $SCRIPT_VERSION  |  Windows native adaptation" -ForegroundColor DarkGray
Write-Host ""
& $Separator

# Step 0: Determine install mode
$USE_BUNDLED = -not $SkipPython
$PYTHON_MIN = "3.9"
$NODE_MIN = "18"

Write-Step "Installation directory: $InstallDir"
Write-Info "Hermes home (config): $HermesHome"
Write-Info "Auto-start at login: $AutoStart"
Write-Host ""

# Step 1: Ensure Python
function Get-PythonVersion {
    try {
        $v = python --version 2>&1
        if ($v -match "Python (\d+)\.(\d+)") {
            return [PSCustomObject]@{ Major = [int]$Matches[1]; Minor = [int]$Matches[2]; Path = (python).Replace("\python.exe","") }
        }
    } catch {}
    return $null
}

function Get-NodeVersion {
    try {
        $v = node --version 2>&1
        if ($v -match "v(\d+)\.(\d+)") {
            return [PSCustomObject]@{ Major = [int]$Matches[1]; Minor = [int]$Matches[2]; Path = (node).Replace("\node.exe","").Replace("/node","") }
        }
    } catch {}
    return $null
}

if (-not $SkipPython) {
    & $Separator
    Write-Step "Checking Python..."
    $py = Get-PythonVersion
    if ($null -eq $py) {
        Write-Warn "Python not found."
        $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
        if ($null -ne $hasWinget) {
            Write-Info "Installing Python via winget..."
            winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements --silent
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            $py = Get-PythonVersion
        }
        if ($null -eq $py) {
            Write-Err "Python is required. Install from: https://www.python.org/downloads/"
            Write-Info "Or run with -SkipPython if Python is already installed."
            exit 1
        }
    }
    if ($py.Major -lt 3 -or ($py.Major -eq 3 -and $py.Minor -lt 9)) {
        Write-Err "Python $($py.Major).$($py.Minor) found, but 3.9+ is required."
        exit 1
    }
    Write-Success "Python $($py.Major).$($py.Minor) found at: $($py.Path)"
}

# Step 2: Ensure Node.js
if (-not $SkipNode) {
    & $Separator
    Write-Step "Checking Node.js..."
    $node = Get-NodeVersion
    if ($null -eq $node) {
        Write-Warn "Node.js not found."
        $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
        if ($null -ne $hasWinget) {
            Write-Info "Installing Node.js LTS via winget..."
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            $node = Get-NodeVersion
        }
        if ($null -eq $node) {
            Write-Err "Node.js is required. Install from: https://nodejs.org/"
            exit 1
        }
    }
    if ($node.Major -lt 18) {
        Write-Err "Node.js v$($node.Major).$($node.Minor) found, but 18+ is required."
        exit 1
    }
    Write-Success "Node.js v$($node.Major).$($node.Minor) found"
}

# Step 3: Create install dir
& $Separator
Write-Step "Setting up installation directory..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Set-Location $InstallDir

# Step 4: Create venv
& $Separator
Write-Step "Creating Python virtual environment..."
if (Test-Path "venv") {
    Write-Info "Removing existing venv..."
    Remove-Item -Recurse -Force "venv"
}
python -m venv venv
if (-not $LASTEXITCODE -eq 0) { exit 1 }

$PYTHON = "$InstallDir\venv\Scripts\python.exe"
$WHL_PIP = "$InstallDir\venv\Scripts\pip.exe"

Write-Success "Virtual environment created"

# Step 5: Upgrade pip
Write-Step "Upgrading pip..."
& $PYTHON -m pip install --upgrade pip --quiet 2>$null
Write-Success "pip upgraded"

# Step 6: Install Python dependencies
& $Separator
Write-Step "Installing Python dependencies..."
# Core Hermes dependencies
$DEPS = @(
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.0.0",
    "httpx>=0.27.0",
    "websockets>=12.0",
    "pyyaml>=6.0",
    "python-dotenv>=1.0.0",
    "certifi>=2024.0.0",
    "aiohttp>=3.9.0",
)

foreach ($dep in $DEPS) {
    Write-Info "  Installing $dep..."
    & $WHL_PIP install $dep --quiet 2>$null
}
Write-Success "Python dependencies installed"

# Step 7: Build frontend
if (-not $SkipFrontendBuild) {
    & $Separator
    Write-Step "Checking frontend build..."

    $frontendSrc = "$InstallDir\web-ui\frontend"
    $frontendDist = "$frontendSrc\dist"

    if (-not (Test-Path $frontendSrc)) {
        Write-Warn "Frontend source not found. Skipping build."
    } elseif (Test-Path $frontendDist) {
        Write-Success "Frontend already built at: $frontendDist"
    } else {
        Write-Info "Building frontend (npm install + build)..."
        Push-Location $frontendSrc
        npm install --legacy-peer-deps --silent 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "npm install failed. Skipping frontend build."
        } else {
            npm run build 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Frontend built: $frontendDist"
            } else {
                Write-Warn "npm build failed."
            }
        }
        Pop-Location
    }
}

# Step 8: Register Hermes environment
& $Separator
Write-Step "Configuring Hermes environment..."
[Environment]::SetEnvironmentVariable("HERMES_HOME", $HermesHome, "User")
Write-Info "HERMES_HOME = $HermesHome"

# Step 9: Create launcher shortcuts
& $Separator
Write-Step "Creating Start Menu shortcuts..."

$WScriptShell = New-Object -ComObject WScript.Shell

function New-Shortcut($target, $args, $name, $desc) {
    $shortcut = $WScriptShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$name.lnk")
    $shortcut.TargetPath = "cmd.exe"
    $shortcut.Arguments = "/c `"$target`" $args"
    $shortcut.Description = $desc
    $shortcut.WindowStyle = 1
    $shortcut.Save()
    Write-Info "  Created: $name"
}

New-Shortcut "$InstallDir\start-webui.bat" "" "Hermes Agent (Web UI).lnk" "Start Hermes Agent Web UI"
New-Shortcut "$InstallDir\start-cli.bat" "" "Hermes Agent (CLI).lnk" "Start Hermes Agent CLI"
New-Shortcut "$InstallDir\start-gateway.bat" "" "Hermes Agent (Gateway).lnk" "Start Hermes Agent Gateway"
New-Shortcut "$InstallDir\stop.bat" "" "Hermes Agent (Stop).lnk" "Stop Hermes Agent"

Write-Success "Shortcuts created"

# Step 10: Windows Task Scheduler auto-start
if ($AutoStart) {
    & $Separator
    Write-Step "Installing auto-start via Task Scheduler (requires admin)..."
    $taskCmd = @(
        "schtasks", "/create",
        "/tn", "HermesAgent",
        "/tr", "cmd /c `"$InstallDir\start-gateway.bat`"",
        "/sc", "ONLOGON",
        "/f"
    )
    $result = schtasks /create /tn "HermesAgent" /tr "cmd /c `"$InstallDir\start-gateway.bat`"" /sc ONLOGON /f 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Auto-start task registered"
    } else {
        Write-Warn "Could not create scheduled task (need admin): $result"
    }
}

# Step 11: Desktop shortcut
Write-Step "Creating Desktop shortcut..."
$DesktopShortcut = "$env:USERPROFILE\Desktop\Hermes Agent.lnk"
$shortcut = $WScriptShell.CreateShortcut($DesktopShortcut)
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/k `"$InstallDir\start-webui.bat`""
$shortcut.Description = "Hermes Agent for Windows"
$shortcut.IconLocation = "$InstallDir\hermes.ico"
$shortcut.WindowStyle = 1
$shortcut.Save()
Write-Success "Desktop shortcut created"

# Done
& $Separator
Write-Host ""
Write-Success "Hermes Agent installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Install location: $InstallDir" -ForegroundColor White
Write-Host "  Config location:  $HermesHome" -ForegroundColor White
Write-Host ""
Write-Host "  Launch: Double-click 'Hermes Agent' on your Desktop" -ForegroundColor Cyan
Write-Host "  Or run:  $InstallDir\start-webui.bat" -ForegroundColor Gray
Write-Host ""
