param(
  [Parameter(Mandatory = $true)][string]$DatabaseUrl,
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = "Stop"
$resolvedDestination = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $resolvedDestination -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedDestination "mikconnect-$timestamp.dump"

& pg_dump --format=custom --no-owner --no-acl --file=$backupPath $DatabaseUrl
if ($LASTEXITCODE -ne 0) { throw "pg_dump a échoué avec le code $LASTEXITCODE." }

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath
"$($hash.Hash)  $([IO.Path]::GetFileName($backupPath))" | Set-Content -LiteralPath "$backupPath.sha256"
Write-Output $backupPath
