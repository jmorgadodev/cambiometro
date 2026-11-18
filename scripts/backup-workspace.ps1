param([Parameter(Mandatory)][string]$BackupRoot)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = 'C:\Users\jorge\Proyectos'
$backupPath = [IO.Path]::GetFullPath($BackupRoot)
if (-not $backupPath.StartsWith('C:\Users\jorge\Backups\Cambiometro\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe backup path' }
if (Test-Path -LiteralPath $backupPath) { throw 'Backup destination already exists' }
New-Item -ItemType Directory -Path $backupPath | Out-Null
$repositories = @('cambiometro-public', 'cambiometro-audit')
$inventory = [Collections.Generic.List[object]]::new()
foreach ($repository in $repositories) {
  $repositoryPath = Join-Path $projectRoot $repository
  $repositoryBackup = Join-Path $backupPath $repository
  New-Item -ItemType Directory -Path $repositoryBackup | Out-Null
  $bundle = Join-Path $repositoryBackup 'history.bundle'
  & git -C $repositoryPath bundle create $bundle --all
  if ($LASTEXITCODE -ne 0) { throw 'Bundle creation failed' }
  & git -C $repositoryPath bundle verify $bundle *> (Join-Path $repositoryBackup 'bundle-verification.txt')
  if ($LASTEXITCODE -ne 0) { throw 'Bundle verification failed' }
  $worktreeLines = @(& git -C $repositoryPath worktree list --porcelain)
  $worktreeLines | Set-Content -LiteralPath (Join-Path $repositoryBackup 'worktrees.txt') -Encoding utf8
  & git -C $repositoryPath show-ref | Set-Content -LiteralPath (Join-Path $repositoryBackup 'refs.txt') -Encoding utf8
  $worktreeIndex = 0
  foreach ($line in $worktreeLines) {
    if (-not $line.StartsWith('worktree ')) { continue }
    $worktreePath = $line.Substring(9)
    if (-not (Test-Path -LiteralPath $worktreePath)) { continue }
    $worktreeIndex++
    $snapshot = Join-Path $repositoryBackup ('worktree-' + $worktreeIndex)
    New-Item -ItemType Directory -Path $snapshot | Out-Null
    $worktreePath | Set-Content -LiteralPath (Join-Path $snapshot 'source.txt') -Encoding utf8
    & git -C $worktreePath status --short --branch | Set-Content -LiteralPath (Join-Path $snapshot 'status.txt') -Encoding utf8
    & git -C $worktreePath diff --binary HEAD ('--output=' + (Join-Path $snapshot 'changes.patch'))
    if ($LASTEXITCODE -ne 0) { throw 'Diff capture failed' }
    $fileList = & git -C $worktreePath -c core.quotepath=false ls-files -z -m -o --exclude-standard
    if ($LASTEXITCODE -ne 0) { throw 'File inventory failed' }
    $files = ($fileList -join "`n").Split([char]0, [StringSplitOptions]::RemoveEmptyEntries) | Sort-Object -Unique
    foreach ($relativePath in $files) {
      # The nested worktree has its own independent snapshot below.
      if ($relativePath.StartsWith('.worktrees/')) { continue }
      $source = [IO.Path]::GetFullPath((Join-Path $worktreePath $relativePath))
      if (-not $source.StartsWith([IO.Path]::GetFullPath($worktreePath) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'File escaped source' }
      if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
      $destination = Join-Path (Join-Path $snapshot 'files') $relativePath
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
      Copy-Item -LiteralPath $source -Destination $destination
      $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
      if ($sourceHash -ne (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash) { throw 'Snapshot checksum mismatch' }
      $inventory.Add([pscustomobject]@{repository=$repository;worktree=$worktreePath;path=$relativePath;backup=$destination.Substring($backupPath.Length + 1);sha256=$sourceHash;bytes=(Get-Item -LiteralPath $source).Length})
    }
    Write-Output ('Verified snapshot: ' + $worktreePath)
  }
  $inventory.Add([pscustomobject]@{repository=$repository;worktree=$null;path='history.bundle';backup=$bundle.Substring($backupPath.Length + 1);sha256=(Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash;bytes=(Get-Item -LiteralPath $bundle).Length})
}
$inventory | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backupPath 'inventory.json') -Encoding utf8
Get-ScheduledTask | Where-Object { $_.TaskName -match 'Cambi[oó]metro|Senado|C[aá]mara' } | ForEach-Object {
  Export-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath | Set-Content -LiteralPath (Join-Path $backupPath (($_.TaskName -replace '[^\p{L}\p{N} -]','_') + '.xml')) -Encoding utf8
}
Write-Output ('BACKUP_VERIFIED ' + $backupPath + ' files=' + $inventory.Count)
