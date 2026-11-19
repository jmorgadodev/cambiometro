param([switch]$Force, [switch]$FullHistory)
$ErrorActionPreference = "Stop"
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logRoot = Join-Path $env:ProgramData "Cambiometro\gastos-senado\logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logPath = Join-Path $logRoot ("run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
$arguments = @("scripts/etl-senate-expenses-local.mjs")
if ($Force) { $arguments += "--force" }
if ($FullHistory) { $arguments += "--full-history" }
Push-Location $appRoot
try {
  & node @arguments 2>&1 | Tee-Object -FilePath $logPath
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
