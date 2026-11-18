param(
  [string]$TaskName = "Cambiometro - ETL gastos operacionales Cámara",
  [string]$At = "06:30"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $repoRoot "scripts\etl-expenses-local.ps1"
$powershell = (Get-Command powershell.exe).Source
$action = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 6)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Output "Tarea registrada: $TaskName"
Write-Output "Se ejecutará diariamente a las $At; el runner procesa los días 2, 12 y 22 en America/Santiago."
