param(
  [Parameter(Mandatory = $true)][string]$AdminDatabaseUrl,
  [Parameter(Mandatory = $true)][string]$BackupPath
)

$ErrorActionPreference = "Stop"
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if ([IO.Path]::GetExtension($resolvedBackup) -ne ".dump") { throw "Le fichier doit être une sauvegarde .dump." }

$databaseName = "mikconnect_restore_test_$([Guid]::NewGuid().ToString('N').Substring(0, 10))"
try {
  & createdb --maintenance-db=$AdminDatabaseUrl $databaseName
  if ($LASTEXITCODE -ne 0) { throw "Impossible de créer la base temporaire $databaseName." }
  & pg_restore --exit-on-error --no-owner --no-acl --dbname=$databaseName $resolvedBackup
  if ($LASTEXITCODE -ne 0) { throw "La restauration de contrôle a échoué." }
  & psql --dbname=$databaseName --tuples-only --command='SELECT COUNT(*) FROM "Tenant";'
  if ($LASTEXITCODE -ne 0) { throw "La vérification de la base restaurée a échoué." }
  Write-Output "Restauration vérifiée dans la base temporaire $databaseName."
} finally {
  if ($databaseName -match '^mikconnect_restore_test_[a-f0-9]{10}$') {
    & dropdb --if-exists --force --maintenance-db=$AdminDatabaseUrl $databaseName
  }
}
