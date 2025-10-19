# ====================================================================
# CLEANUP DUPLICATE PARTICIPANTS - PowerShell Script
# ====================================================================
# This script will connect to your PostgreSQL database and clean up
# duplicate participant records.
#
# PREREQUISITES:
# 1. PostgreSQL command-line tools (psql) must be installed
# 2. You must know your database connection details
# ====================================================================

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  DUPLICATE PARTICIPANTS CLEANUP SCRIPT" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Get database connection details
Write-Host "Enter your database connection details:" -ForegroundColor Yellow
Write-Host ""

$dbHost = Read-Host "Database Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Database Port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$dbName = Read-Host "Database Name"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    Write-Host "Error: Database name is required!" -ForegroundColor Red
    exit 1
}

$dbUser = Read-Host "Database User (default: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

Write-Host ""
Write-Host "Connecting to: $dbHost`:$dbPort/$dbName as $dbUser" -ForegroundColor Green
Write-Host ""

# Step 1: Check for duplicates
Write-Host "Step 1: Checking for duplicate records..." -ForegroundColor Yellow
Write-Host ""

$checkQuery = @"
SELECT
    COUNT(*) as duplicate_groups,
    SUM(cnt - 1) as records_to_delete
FROM (
    SELECT \"roomId\", \"userId\", COUNT(*) as cnt
    FROM room_participant
    GROUP BY \"roomId\", \"userId\"
    HAVING COUNT(*) > 1
) duplicates;
"@

$env:PGPASSWORD = Read-Host "Database Password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
$env:PGPASSWORD = $plainPassword

# Run check query
$result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $checkQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error connecting to database!" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host "Duplicate check results:" -ForegroundColor Cyan
Write-Host $result
Write-Host ""

# Ask for confirmation
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Remove duplicate participant records (keeping the most recent)" -ForegroundColor Yellow
Write-Host "  2. Add a UNIQUE constraint to prevent future duplicates" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Step 2: Cleaning up duplicates..." -ForegroundColor Yellow
Write-Host ""

# The cleanup SQL
$cleanupSQL = @"
-- Remove duplicates keeping the most recent record
DELETE FROM room_participant
WHERE id NOT IN (
    SELECT DISTINCT ON (\"roomId\", \"userId\") id
    FROM room_participant
    ORDER BY \"roomId\", \"userId\", \"updatedAt\" DESC NULLS LAST
);

-- Add unique constraint if it doesn't exist
DO `$`$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_room_participant'
    ) THEN
        ALTER TABLE room_participant
        ADD CONSTRAINT unique_room_participant UNIQUE (\"roomId\", \"userId\");
    END IF;
END `$`$;

-- Verify no duplicates remain
SELECT
    COUNT(*) as remaining_duplicates
FROM (
    SELECT \"roomId\", \"userId\", COUNT(*) as cnt
    FROM room_participant
    GROUP BY \"roomId\", \"userId\"
    HAVING COUNT(*) > 1
) duplicates;
"@

# Execute cleanup
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $cleanupSQL

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cleanup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart your NestJS application" -ForegroundColor White
    Write-Host "  2. Test seat movements in your app" -ForegroundColor White
    Write-Host "  3. Verify users can only sit in one seat at a time" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
}

# Clear password from environment
$env:PGPASSWORD = $null
