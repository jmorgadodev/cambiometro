param(
  [string]$TaskName = "Cambiometro - ETL Personal de Apoyo Cámara local",
  [string]$At = "09:30",
  [switch]$ExternalAdvisories
)

$ErrorActionPreference = "Stop"
if ($ExternalAdvisories -and -not $PSBoundParameters.ContainsKey("TaskName")) {
  $TaskName = "Cambiometro - Asesorias externas Camara mensual"
}
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $PSScriptRoot "etl-personal-apoyo-camara-runtime.mjs"
$node = (Get-Command node.exe).Source
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
  throw "La tarea '$TaskName' ya existe; no se reemplazó. Revísala antes de modificarla."
}

if ($ExternalAdvisories) { & $node $runner --prepare-only --external-advisories }
else { & $node $runner --prepare-only }
if ($LASTEXITCODE -ne 0) { throw "La validación previa del runner falló: $LASTEXITCODE" }

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($ExternalAdvisories) {
  # Task Scheduler admite un calendario mensual sin contraseña ni elevación.
  $escape = { param($value) [System.Security.SecurityElement]::Escape($value) }
  $boundary = (Get-Date -Format "yyyy-MM-dd") + "T" + $At + ":00"
  $taskXml = @"
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers><CalendarTrigger><StartBoundary>$boundary</StartBoundary><Enabled>true</Enabled><ScheduleByMonth><DaysOfMonth><Day>15</Day></DaysOfMonth><Months><January/><February/><March/><April/><May/><June/><July/><August/><September/><October/><November/><December/></Months></ScheduleByMonth></CalendarTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$(& $escape $identity)</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable><ExecutionTimeLimit>PT4H</ExecutionTimeLimit><RestartOnFailure><Interval>PT24H</Interval><Count>2</Count></RestartOnFailure></Settings>
  <Actions Context="Author"><Exec><Command>$(& $escape $node)</Command><Arguments>$(& $escape ('"' + $runner + '" --external-advisories'))</Arguments><WorkingDirectory>$(& $escape $appRoot)</WorkingDirectory></Exec></Actions>
</Task>
"@
  Register-ScheduledTask -TaskName $TaskName -Xml $taskXml | Out-Null
  Write-Output "Tarea registrada: $TaskName; día 15 de cada mes a las $At, en la sesión local."
  return
}
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$runner`"" -WorkingDirectory $appRoot
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Description "Actualiza Personal de Apoyo de Cámara desde la red local cuando hay cambios; conserva el release R2 y no usa D1." | Out-Null
Write-Output "Tarea registrada: $TaskName"
Write-Output "Ejecución semanal lunes $At; si el equipo está apagado, se ejecuta al volver a estar disponible."
