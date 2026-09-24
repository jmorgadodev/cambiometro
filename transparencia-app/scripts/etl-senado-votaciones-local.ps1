param(
  [switch]$DryRun,
  [int]$LookbackDays = 3
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logRoot = Join-Path $env:ProgramData "Cambiometro\votaciones-senado\logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logPath = Join-Path $logRoot ("run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
$lockPath = Join-Path $env:ProgramData "Cambiometro\votaciones-senado\etl.lock"
$lock = $null
$transcriptStarted = $false

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Host "[senado-votaciones-local] $Label"
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "SENADO_LOCAL_STEP_FAILED:$Label`:$LASTEXITCODE"
  }
}

try {
  Start-Transcript -Path $logPath -Append | Out-Null
  $transcriptStarted = $true

  if ($LookbackDays -lt 1 -or $LookbackDays -gt 14) {
    throw "SENADO_LOCAL_INVALID_LOOKBACK_DAYS:$LookbackDays"
  }
  $hasAccountId = -not [string]::IsNullOrWhiteSpace($env:CLOUDFLARE_ACCOUNT_ID)
  $hasApiToken = -not [string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)
  if (-not $hasAccountId -or -not $hasApiToken) {
    throw "SENADO_LOCAL_MISSING_CLOUDFLARE_CREDENTIALS"
  }

  try {
    $lock = [System.IO.File]::Open(
      $lockPath,
      [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
  } catch [System.IO.IOException] {
    Write-Host "[senado-votaciones-local] ya existe una ejecución activa; no se inicia otra"
    exit 0
  }

  $to = [DateTime]::UtcNow.Date
  $from = $to.AddDays(-$LookbackDays)
  $fromText = $from.ToString("yyyy-MM-dd")
  $toText = $to.ToString("yyyy-MM-dd")
  $periodTo = $to.ToString("yyyy-MM")
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
  $node = (Get-Command node.exe -ErrorAction Stop).Source

  Push-Location $repoRoot
  try {
    Invoke-Step "preparar espacio local" $npm @("run", "etl:prepare")

    $catalogPath = Join-Path $repoRoot "data\lake\catalog\v1\manifest.json"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $catalogPath) | Out-Null
    $wrangler = Join-Path $repoRoot "node_modules\wrangler\bin\wrangler.js"
    Invoke-Step "leer catalogo productivo R2" $node @(
      $wrangler,
      "r2", "object", "get",
      "transparencia-public-data/catalog/v1/manifest.json",
      "--file", $catalogPath,
      "--remote"
    )

    Invoke-Step "hidratar snapshot vigente desde R2" $npm @(
      "run", "data:hydrate:static", "--",
      "--required",
      "--required-files", "data/politicos-votaciones.json",
      "--only-files", "data/politicos-votaciones.json",
      "--force"
    )

    Invoke-Step "consultar votaciones oficiales del Senado ($fromText a $toText)" $npm @(
      "run", "etl", "--",
      "--from", $fromText,
      "--to", $toText,
      "--source", "votaciones_senado"
    )

    $statusPath = Join-Path $repoRoot "data\etl\status.json"
    if (-not (Test-Path -LiteralPath $statusPath -PathType Leaf)) {
      throw "SENADO_LOCAL_PUBLICATION_STATUS_MISSING"
    }
    $status = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
    $recordCount = 0L
    $hasRecordCount = $null -ne $status.votaciones_senado_ingresadas
    $hasValidRecordCount = $hasRecordCount -and [long]::TryParse([string]$status.votaciones_senado_ingresadas, [ref]$recordCount)
    if (-not $hasValidRecordCount -or $recordCount -lt 0) {
      throw "SENADO_LOCAL_PUBLICATION_STATUS_INVALID"
    }
    $publish = $recordCount -gt 0

    if (-not $publish) {
      Write-Host "[senado-votaciones-local] sin novedades verificadas; R2 queda intacto"
      exit 0
    }
    if ($DryRun) {
      Write-Host "[senado-votaciones-local] DRY RUN: hay datos listos, pero no se publica"
      exit 0
    }

    # El publicador del lake usa GH_TOKEN. La tarea programada corre bajo la
    # sesión interactiva del usuario, donde GitHub CLI ya está autenticado;
    # reutilizar esa sesión evita que una novedad quede sin publicar por no
    # tener GH_TOKEN definido como variable persistente del sistema.
    if ([string]::IsNullOrWhiteSpace($env:GH_TOKEN)) {
      $gh = Get-Command gh.exe -ErrorAction SilentlyContinue
      if (-not $gh) { $gh = Get-Command gh -ErrorAction SilentlyContinue }
      if ($gh) {
        $tokenOutput = & $gh.Source auth token 2>$null
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($tokenOutput | Select-Object -First 1))) {
          $env:GH_TOKEN = [string]($tokenOutput | Select-Object -First 1).Trim()
        }
      }
    }
    if ([string]::IsNullOrWhiteSpace($env:GH_TOKEN)) {
      throw "SENADO_LOCAL_MISSING_GH_TOKEN: autentica GitHub CLI con acceso al repositorio"
    }

    Invoke-Step "construir release R2 del Senado" $npm @(
      "run", "data:lake", "--",
      "--source", "votaciones_senado",
      "--hydrate-history"
    )
    Invoke-Step "publicar release con guardas de presupuesto R2" $npm @("run", "data:publish")
    Invoke-Step "actualizar proyeccion parlamentaria local" $npm @(
      "run", "ingest:votaciones-full", "--", "--source", "senado"
    )
    Invoke-Step "sincronizar proyeccion estatica Senado 2026+" $node @(
      "scripts/sync-senado-votes-static.mjs",
      "--from", "2026-01",
      "--to", $periodTo
    )
    Invoke-Step "construir subconjuntos estaticos" $npm @("run", "data:build:subsets")
    Invoke-Step "publicar entradas estaticas del Parlamento" $npm @(
      "run", "data:publish:static", "--", "--groups", "parlamento"
    )

    Write-Host "[senado-votaciones-local] publicación completada"
  } finally {
    Pop-Location
  }
} catch {
  Write-Error "[senado-votaciones-local] error fatal: $_"
  exit 1
} finally {
  if ($lock) { $lock.Dispose() }
  if ($transcriptStarted) { Stop-Transcript | Out-Null }
}
