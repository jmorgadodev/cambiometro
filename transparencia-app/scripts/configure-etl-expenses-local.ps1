param(
  [switch]$SkipHydration
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "Configuración única del ETL local de gastos operacionales."
Write-Host "El token se guardará sólo en las variables de usuario de Windows; no se subirá a Git."
$accountId = Read-Host "Account ID de Cloudflare"
if ([string]::IsNullOrWhiteSpace($accountId)) { throw "Falta el Account ID de Cloudflare." }

$secureToken = Read-Host "Token Cloudflare con permiso Workers R2 Storage - Editar" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($token)) { throw "Falta el token de Cloudflare." }

  [Environment]::SetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", $accountId.Trim(), "User")
  [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $token, "User")
  $env:CLOUDFLARE_ACCOUNT_ID = $accountId.Trim()
  $env:CLOUDFLARE_API_TOKEN = $token
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

Push-Location $repoRoot
try {
  Write-Host "Registrando la tarea automática..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts\install-etl-expenses-task.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if (-not $SkipHydration) {
    Write-Host "Probando acceso a R2 sin consultar todavía Cámara..."
    & npm.cmd run etl:expenses:local -- --hydrate-only --force
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "R2 verificado. La automatización quedó preparada."
  }
}
finally {
  Pop-Location
}
