param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$canonicalApp = 'C:\Users\jorge\Proyectos\cambiometro-public\transparencia-app'
$backup = 'C:\Users\jorge\Backups\Cambiometro\20261118-consolidacion'
if (-not (Test-Path -LiteralPath (Join-Path $backup 'inventory.json'))) { throw 'Verified backup required' }
$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -match 'Cambi[oó]metro' }
foreach ($task in $tasks) {
  if (@($task.Actions).Count -ne 1) { throw ('Unexpected action count: ' + $task.TaskName) }
  $oldAction = $task.Actions[0]
  $runner = if ($oldAction.Arguments -match 'etl-senado-votaciones-runtime.mjs') { 'etl-senado-votaciones-runtime.mjs' }
    elseif ($oldAction.Arguments -match 'etl-personal-apoyo-camara-runtime.mjs') { 'etl-personal-apoyo-camara-runtime.mjs' }
    elseif ($oldAction.Arguments -match 'etl-expenses-local.ps1') { 'etl-expenses-local.ps1' }
    else { throw ('Unrecognized task: ' + $task.TaskName) }
  $runnerPath = Join-Path (Join-Path $canonicalApp 'scripts') $runner
  if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) { throw ('Missing canonical runner: ' + $runner) }
  $arguments = if ($runner.EndsWith('.ps1')) { '-NoProfile -ExecutionPolicy Bypass -File "' + $runnerPath + '"' }
    else { '"' + $runnerPath + '"' + $(if ($oldAction.Arguments -match '--external-advisories') { ' --external-advisories' } else { '' }) }
  if ($Apply) {
    Export-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath | Set-Content -LiteralPath (Join-Path $backup (($task.TaskName -replace '[^\p{L}\p{N} -]','_') + '-before-migration.xml')) -Encoding utf8
    $action = New-ScheduledTaskAction -Execute $oldAction.Execute -Argument $arguments -WorkingDirectory $canonicalApp
    Set-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -Action $action | Out-Null
    $updated = Get-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath
    if ($updated.Actions[0].WorkingDirectory -ne $canonicalApp -or $updated.Actions[0].Arguments -ne $arguments) { throw 'Task action verification failed' }
  }
  [pscustomobject]@{task=$task.TaskName;runner=$runner;mode=if($Apply){'migrated'}else{'preview'};enabled=($task.State -ne 'Disabled')}
}
# Enablement is separate: first validate credentials and source access from the canonical location.
