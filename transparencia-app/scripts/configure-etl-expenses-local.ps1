param(
  [switch]$SkipHydration
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "Configuración única del ETL local de gastos operacionales."
Write-Host "El token se guardará sólo en las variables de usuario de Windows; no se subirá a Git."
$secureToken = Read-Host "Token Cloudflare con permiso Workers R2 Storage - Editar" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($token)) { throw "Falta el token de Cloudflare." }

  $accountId = $null
  try {
    $response = Invoke-RestMethod -Method Get -Uri "https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50" -Headers @{ Authorization = "Bearer $token" }
    $accounts = @($response.result)
    $preferred = @($accounts | Where-Object { $_.name -eq "Jorge" })
    if ($preferred.Count -eq 1) {
      $accountId = [string]$preferred[0].id
    } elseif ($accounts.Count -eq 1) {
      $accountId = [string]$accounts[0].id
    }
  } catch {
    Write-Host "Cloudflare no permitió descubrir la cuenta automáticamente."
  }

  if ([string]::IsNullOrWhiteSpace($accountId)) {
    $accountId = Read-Host "Account ID de Cloudflare (se muestra en Workers y Pages)"
  }
  if ([string]::IsNullOrWhiteSpace($accountId)) { throw "Falta el Account ID de Cloudflare." }

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
