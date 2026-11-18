param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = 'C:\Users\jorge\Proyectos'
$backup = 'C:\Users\jorge\Backups\Cambiometro\20261118-consolidacion'
$archive = Join-Path $backup 'retired'
$canonical = Join-Path $projectRoot 'cambiometro-public'
$audit = Join-Path $projectRoot 'cambiometro-audit'
if (-not (Test-Path -LiteralPath (Join-Path $backup 'inventory.json'))) { throw 'Verified snapshot required' }
foreach ($bundleRepository in @('cambiometro-public','cambiometro-audit')) {
  & git -C $canonical bundle verify (Join-Path (Join-Path $backup $bundleRepository) 'history.bundle') *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Recovery bundle verification failed' }
}
$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -match 'Cambi[oó]metro' }
foreach ($task in $tasks) {
  foreach ($action in $task.Actions) {
    if ($action.WorkingDirectory -ne (Join-Path $canonical 'transparencia-app') -or $action.Arguments -notlike ('*' + $canonical + '*')) { throw ('Unmigrated task: ' + $task.TaskName) }
    if ($task.State -eq 'Running') { throw ('Wait for running task: ' + $task.TaskName) }
  }
}
$linked = @(
  @{name='cambiometro-cplt-central-scope';owner=$audit},
  @{name='cambiometro-promote-ui';owner=$audit},
  @{name='cambiometro-remuneraciones-api-20260913';owner=$canonical}
)
if (-not $Apply) { Write-Output 'Preview: archive three linked phase folders and the audit clone; no data deletion.'; return }
New-Item -ItemType Directory -Force -Path $archive | Out-Null
foreach ($item in $linked) {
  $source = [IO.Path]::GetFullPath((Join-Path $projectRoot $item.name))
  $destination = [IO.Path]::GetFullPath((Join-Path $archive $item.name))
  if ((Split-Path -Parent $source) -ne $projectRoot -or (Split-Path -Parent $destination) -ne $archive) { throw 'Unsafe archive target' }
  if (Test-Path -LiteralPath $destination) { throw 'Archive already exists' }
  & git -C $item.owner worktree move $source $destination
  if ($LASTEXITCODE -ne 0) { throw ('Worktree archive failed: ' + $item.name) }
}
$auditArchive = Join-Path $archive 'cambiometro-audit'
if ((Split-Path -Parent $audit) -ne $projectRoot -or (Split-Path -Parent $auditArchive) -ne $archive) { throw 'Unsafe audit archive target' }
if (Test-Path -LiteralPath $auditArchive) { throw 'Audit archive already exists' }
# Same-volume move retains ignored files, datasets and evidence without deleting bytes.
[IO.Directory]::Move($audit, $auditArchive)
$nested = Join-Path $auditArchive '.worktrees\renovacion-parlamentaria'
$repairPaths = @((Join-Path $archive 'cambiometro-cplt-central-scope'), (Join-Path $archive 'cambiometro-promote-ui'))
if (Test-Path -LiteralPath $nested) { $repairPaths += $nested }
& git -C $auditArchive worktree repair @repairPaths
if ($LASTEXITCODE -ne 0) { throw 'Archived Git links require repair' }
foreach ($item in $linked) {
  & git -C (Join-Path $archive $item.name) rev-parse HEAD
  if ($LASTEXITCODE -ne 0) { throw 'Archived worktree unreadable' }
}
$verifiedFiles = 0
foreach ($entry in (Get-Content -LiteralPath (Join-Path $backup 'inventory.json') -Raw | ConvertFrom-Json)) {
  if (-not $entry.worktree) { continue }
  $original = [IO.Path]::GetFullPath((Join-Path $entry.worktree $entry.path))
  foreach ($retiredName in @($linked.name) + 'cambiometro-audit') {
    $oldPrefix = (Join-Path $projectRoot $retiredName) + '\'
    if (-not $original.StartsWith($oldPrefix, [StringComparison]::OrdinalIgnoreCase)) { continue }
    $movedFile = Join-Path (Join-Path $archive $retiredName) $original.Substring($oldPrefix.Length)
    if ((Get-FileHash -LiteralPath $movedFile -Algorithm SHA256).Hash -ne $entry.sha256) { throw ('Archived content changed: ' + $entry.path) }
    $verifiedFiles++
    break
  }
}
$report = [pscustomobject]@{archivedAt=(Get-Date).ToUniversalTime().ToString('o');canonical=$canonical;archive=$archive;dataDeleted=$false;verifiedFiles=$verifiedFiles;retired=@($linked.name) + 'cambiometro-audit'}
$report | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $backup 'retirement.json') -Encoding utf8
$report | ConvertTo-Json -Depth 3
