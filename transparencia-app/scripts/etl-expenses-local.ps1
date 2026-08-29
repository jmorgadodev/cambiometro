param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logRoot = Join-Path $env:ProgramData "Cambiometro\gastos-operacionales\logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logPath = Join-Path $logRoot ("run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
$arguments = @("scripts/etl-expenses-local.mjs", "--trigger-pages")
if ($Force) { $arguments += "--force" }

Push-Location $repoRoot
try {
  & node @arguments 2>&1 | Tee-Object -FilePath $logPath
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
