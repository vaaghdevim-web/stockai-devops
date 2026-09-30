$ErrorActionPreference = "Stop"

$DatabaseContainer = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "stockai-postgres" }
$DatabaseName = if ($env:DB_NAME) { $env:DB_NAME } else { "stockai" }
$DatabaseUser = if ($env:DB_USER) { $env:DB_USER } else { "stockai" }

$AwsRegion = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$S3Bucket = if ($env:S3_BACKUP_BUCKET) { $env:S3_BACKUP_BUCKET } else { "stockai-postgres-backups-970547378393" }
$S3Prefix = "postgres"

$BackupRoot = Join-Path $PSScriptRoot "output"

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFileName = "stockai-postgres-$Timestamp.dump"
$BackupFile = Join-Path $BackupRoot $BackupFileName
$S3Key = "$S3Prefix/$BackupFileName"

Write-Host "StockAI PostgreSQL snapshot started."
Write-Host "Container: $DatabaseContainer"
Write-Host "Database: $DatabaseName"
Write-Host "S3 bucket: $S3Bucket"
Write-Host "S3 key: $S3Key"

docker exec $DatabaseContainer `
    pg_dump `
    -U $DatabaseUser `
    -d $DatabaseName `
    -Fc `
    -f "/tmp/$BackupFileName"

if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL dump failed."
}

docker cp `
    "${DatabaseContainer}:/tmp/$BackupFileName" `
    $BackupFile

if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy PostgreSQL dump from container."
}

docker exec $DatabaseContainer `
    rm -f "/tmp/$BackupFileName"

if ($LASTEXITCODE -ne 0) {
    throw "Failed to remove temporary database dump from container."
}

$BackupSize = (Get-Item $BackupFile).Length

Write-Host "Local PostgreSQL snapshot completed."
Write-Host "Backup size: $BackupSize bytes"

aws s3 cp `
    $BackupFile `
    "s3://$S3Bucket/$S3Key" `
    --region $AwsRegion

if ($LASTEXITCODE -ne 0) {
    throw "S3 upload failed."
}

Write-Host "S3 upload completed successfully."
Write-Host "S3 location: s3://$S3Bucket/$S3Key"
Write-Host "StockAI PostgreSQL backup completed successfully."

exit 0
