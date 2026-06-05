param(
  [int]$Port = 3000,
  [switch]$SkipStart
)

$Root = (Get-Location).Path
$ReportPath = Join-Path $Root "hostinger-preflight-report.txt"
$Failures = 0
$Warnings = 0
$Lines = New-Object System.Collections.Generic.List[string]

function Add-Line {
  param([string]$Text)
  $Lines.Add($Text) | Out-Null
  Write-Host $Text
}

function Pass { param([string]$Text) Add-Line "[PASS] $Text" }
function Warn { param([string]$Text) $script:Warnings++; Add-Line "[WARN] $Text" }
function Fail { param([string]$Text) $script:Failures++; Add-Line "[FAIL] $Text" }

function Run-Command {
  param(
    [string]$Title,
    [string]$Command
  )

  Add-Line ""
  Add-Line "===== $Title ====="
  Add-Line "Command: $Command"

  $OutputFile = Join-Path $Root "preflight-command-output.tmp.txt"

  cmd.exe /c "$Command > `"$OutputFile`" 2>&1"
  $ExitCode = $LASTEXITCODE

  if (Test-Path $OutputFile) {
    Get-Content $OutputFile | ForEach-Object { Add-Line "  $_" }
    Remove-Item $OutputFile -Force -ErrorAction SilentlyContinue
  }

  if ($ExitCode -eq 0) {
    Pass "$Title completed."
  } else {
    Fail "$Title failed with exit code $ExitCode."
  }
}

function Read-TextFile {
  param([string]$Path)
  return [System.IO.File]::ReadAllText($Path)
}

function Read-EnvKeys {
  $Keys = New-Object System.Collections.Generic.HashSet[string]
  $EnvFiles = @(".env", ".env.local", ".env.production") | Where-Object {
    Test-Path (Join-Path $Root $_)
  }

  foreach ($File in $EnvFiles) {
    $FullPath = Join-Path $Root $File
    $Content = Get-Content $FullPath

    foreach ($Line in $Content) {
      if ($Line -match "^\s*#" -or $Line.Trim() -eq "") {
        continue
      }

      if ($Line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=") {
        [void]$Keys.Add($Matches[1])
      }
    }
  }

  return $Keys
}

function Find-ProcessEnvKeys {
  $Keys = New-Object System.Collections.Generic.HashSet[string]
  $ScanRoots = @("app", "components", "lib", "prisma", "scripts") | Where-Object {
    Test-Path (Join-Path $Root $_)
  }

  $Regex = [regex]"process\.env\.([A-Z0-9_]+)"

  foreach ($ScanRoot in $ScanRoots) {
    $Files = Get-ChildItem -Path (Join-Path $Root $ScanRoot) -Recurse -File -Include *.ts,*.tsx,*.js,*.mjs -ErrorAction SilentlyContinue

    foreach ($File in $Files) {
      try {
        $Text = Read-TextFile $File.FullName
        $MatchesFound = $Regex.Matches($Text)

        foreach ($Match in $MatchesFound) {
          [void]$Keys.Add($Match.Groups[1].Value)
        }
      } catch {
      }
    }
  }

  return $Keys
}

Add-Line "Hostinger Preflight Report"
Add-Line "Project: $Root"
Add-Line "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line ""

Add-Line "Recommended Hostinger settings:"
Add-Line "- Framework preset: Next.js"
Add-Line "- Branch: main"
Add-Line "- Node version: 22.x"
Add-Line "- Root directory: ./"
Add-Line "- Build command: npm run build"
Add-Line "- Package manager: npm"
Add-Line "- Output directory: .next"
Add-Line "- Start command: npm start"
Add-Line ""

if (Test-Path "package.json") { Pass "package.json exists." } else { Fail "package.json is missing." }
if (Test-Path "app") { Pass "app directory exists." } else { Fail "app directory is missing." }
if (Test-Path "prisma\schema.prisma") { Pass "prisma/schema.prisma exists." } else { Fail "prisma/schema.prisma is missing." }
if (Test-Path "app\(dashboard)") { Fail "Old path app/(dashboard) exists. This project should use app/dashboard." } else { Pass "No old app/(dashboard) path found." }
if (Test-Path "app\dashboard") { Pass "app/dashboard exists." } else { Warn "app/dashboard was not found." }
if (Test-Path "app\api\dashboard") { Pass "app/api/dashboard exists." } else { Warn "app/api/dashboard was not found." }

try {
  $PackageJson = Read-TextFile (Join-Path $Root "package.json")
  $Package = $PackageJson | ConvertFrom-Json
  $ScriptNames = @()

  if ($Package.scripts) {
    $ScriptNames = $Package.scripts.PSObject.Properties.Name
  }

  if ($ScriptNames -contains "build") { Pass "package.json has build script." } else { Fail "package.json is missing build script." }
  if ($ScriptNames -contains "start") { Pass "package.json has start script." } else { Fail "package.json is missing start script." }
} catch {
  Fail "Could not read package.json."
}

if (Test-Path "package-lock.json") { Pass "package-lock.json exists." } else { Warn "package-lock.json is missing." }

try {
  $NodeVersion = & node -v
  Pass "Node version detected locally: $NodeVersion"
  if ($NodeVersion -notmatch "^v22\.") {
    Warn "Local Node is not v22.x. Hostinger is using Node 22.x."
  }
} catch {
  Fail "Node.js is not available locally."
}

try {
  $NpmVersion = & npm -v
  Pass "npm version detected locally: $NpmVersion"
} catch {
  Fail "npm is not available locally."
}

$EnvKeys = Read-EnvKeys
$ProcessEnvKeys = Find-ProcessEnvKeys
$KnownAutoKeys = @("NODE_ENV", "PORT", "NEXT_RUNTIME", "VERCEL", "CI")

if ($EnvKeys.Count -gt 0) {
  Pass "Environment file found with $($EnvKeys.Count) keys."
} else {
  Warn "No .env/.env.local/.env.production keys found locally."
}

$MissingEnv = @()

foreach ($Key in $ProcessEnvKeys) {
  if ($KnownAutoKeys -contains $Key) {
    continue
  }

  if (-not $EnvKeys.Contains($Key)) {
    $MissingEnv += $Key
  }
}

if ($MissingEnv.Count -eq 0) {
  Pass "No missing process.env keys detected from local env files."
} else {
  Warn "These env keys are used in code but not found locally: $($MissingEnv -join ', ')"
  Warn "Add them in Hostinger Environment Variables if needed."
}

if ($EnvKeys.Contains("DATABASE_URL")) {
  Pass "DATABASE_URL exists locally."
} else {
  Fail "DATABASE_URL is missing locally."
}

New-Item -ItemType Directory -Force -Path "public\uploads" | Out-Null

try {
  $UploadTestFile = "public\uploads\.preflight-write-test.txt"
  Set-Content -Path $UploadTestFile -Value "ok" -Encoding UTF8
  Remove-Item $UploadTestFile -Force
  Pass "public/uploads is writable locally."
} catch {
  Fail "public/uploads is not writable locally."
}

$ImportantRoutes = @(
  "app\api\health\route.ts",
  "app\api\dashboard\evidence\route.ts",
  "app\api\dashboard\data-center\noor-import\preview\route.ts",
  "app\api\dashboard\admin\subscribers\route.ts",
  "app\api\dashboard\admin\subscriptions\route.ts",
  "app\api\dashboard\admin\operational-alerts\route.ts"
)

foreach ($Route in $ImportantRoutes) {
  if (Test-Path $Route) {
    Pass "Route exists: $Route"
  } else {
    Warn "Route not found: $Route"
  }
}

Run-Command "Prisma generate" "npx prisma generate"
Run-Command "Next production build" "npm run build"

if (Test-Path ".next") {
  Pass ".next output exists after build."
} else {
  Fail ".next output is missing after build."
}

if (-not $SkipStart) {
  Add-Line ""
  Add-Line "===== Local start smoke test ====="

  $OutLog = Join-Path $Root "hostinger-start.out.log"
  $ErrLog = Join-Path $Root "hostinger-start.err.log"

  Remove-Item $OutLog -Force -ErrorAction SilentlyContinue
  Remove-Item $ErrLog -Force -ErrorAction SilentlyContinue

  $Process = $null

  try {
    $Process = Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c npm start -- -p $Port" `
      -WorkingDirectory $Root `
      -PassThru `
      -RedirectStandardOutput $OutLog `
      -RedirectStandardError $ErrLog `
      -WindowStyle Hidden

    $Ready = $false

    for ($i = 0; $i -lt 25; $i++) {
      Start-Sleep -Seconds 1

      try {
        Invoke-WebRequest -Uri "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $Ready = $true
        break
      } catch {
      }
    }

    if ($Ready) {
      Pass "Local production server started on port $Port."

      $Endpoints = @("/", "/login", "/api/health")

      foreach ($Endpoint in $Endpoints) {
        try {
          $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port$Endpoint" -UseBasicParsing -TimeoutSec 15
          Pass "Endpoint $Endpoint responded with status $($Response.StatusCode)."
        } catch {
          Fail "Endpoint $Endpoint failed: $($_.Exception.Message)"
        }
      }
    } else {
      Fail "Local production server did not become ready on port $Port."
      if (Test-Path $ErrLog) {
        Add-Line "Last start error log lines:"
        Get-Content $ErrLog -Tail 30 | ForEach-Object { Add-Line "  $_" }
      }
    }
  } catch {
    Fail "Local start smoke test failed: $($_.Exception.Message)"
  } finally {
    if ($Process -and -not $Process.HasExited) {
      Stop-Process -Id $Process.Id -Force
      Pass "Local production server stopped."
    }
  }
} else {
  Warn "Skipped local start smoke test."
}

Add-Line ""
Add-Line "===== Summary ====="
Add-Line "Failures: $Failures"
Add-Line "Warnings: $Warnings"

if ($Failures -eq 0) {
  Add-Line "FINAL RESULT: READY FOR HOSTINGER DEPLOY."
} else {
  Add-Line "FINAL RESULT: NOT READY. Fix failures before redeploy."
}

$Lines | Set-Content -Path $ReportPath -Encoding UTF8
Add-Line ""
Add-Line "Report saved to: $ReportPath"

if ($Failures -gt 0) {
  exit 1
}

exit 0
