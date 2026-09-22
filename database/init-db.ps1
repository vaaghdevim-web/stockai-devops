$ErrorActionPreference = "Stop"

$DatabaseContainer = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "stockai-postgres" }
$DatabaseName = if ($env:DB_NAME) { $env:DB_NAME } else { "stockai" }
$DatabaseUser = if ($env:DB_USER) { $env:DB_USER } else { "stockai" }

$DbRoot = Join-Path $PSScriptRoot "..\backend\src\main\resources\db"

$SqlFiles = @(
    "schema_v2.4.sql"
    "indexes_migration.sql"
    "security_user_password_migration.sql"
    "mfa_user_secret_migration.sql"
    "seed_factory_master_data.sql"
)

Write-Host "StockAI database initialization started."
Write-Host "Container: $DatabaseContainer"
Write-Host "Database: $DatabaseName"
Write-Host "User: $DatabaseUser"

# Check whether the database already contains the StockAI schema.
$tableCount = docker exec $DatabaseContainer psql -U $DatabaseUser -d $DatabaseName -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"

if ($LASTEXITCODE -ne 0) {
    throw "Unable to connect to database."
}

$tableCount = [int]$tableCount.Trim()

Write-Host "Detected public table count: $tableCount"

if ($tableCount -gt 0) {
    Write-Host "Existing database detected."
    Write-Host "Skipping base schema and seed initialization."
    Write-Host "Database initialization completed successfully."
    exit 0
}

Write-Host "Fresh database detected."
Write-Host "Running full initialization."

foreach ($SqlFile in $SqlFiles) {
    $SqlPath = Join-Path $DbRoot $SqlFile

    if (-not (Test-Path $SqlPath)) {
        throw "SQL file not found: $SqlPath"
    }

    Write-Host "Running: $SqlFile"

    docker cp $SqlPath "${DatabaseContainer}:/tmp/$SqlFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy SQL file: $SqlFile"
    }

    docker exec $DatabaseContainer `
        psql `
        -U $DatabaseUser `
        -d $DatabaseName `
        -v ON_ERROR_STOP=1 `
        -f "/tmp/$SqlFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Database script failed: $SqlFile"
    }

    docker exec $DatabaseContainer `
        rm -f "/tmp/$SqlFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to remove temporary SQL file: $SqlFile"
    }
}

Write-Host "StockAI database initialization completed successfully."
