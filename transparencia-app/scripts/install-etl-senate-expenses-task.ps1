param([string]$TaskName = "Cambiometro - ETL gastos Senado", [string]$At = "05:30")
$ErrorActionPreference = "Stop"
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $appRoot "scripts\etl-senate-expenses-local.ps1"
$action = New-ScheduledTaskAction -Execute (Get-Command powershell.exe).Source -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $appRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { throw "La tarea ya existe; revisar antes de sustituirla." }
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
Write-Output "Tarea registrada: $TaskName. Extrae los días 2, 12 y 22, a las $At America/Santiago."
