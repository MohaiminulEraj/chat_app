# ====================================================================
# AUTO CLEANUP DUPLICATE PARTICIPANTS (Using .env file)
# ====================================================================

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  DUPLICATE PARTICIPANTS CLEANUP (AUTO)" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Database connection from .env
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "kitty"
$dbUser = "postgres"
$dbPassword = "password"

Write-Host "Connecting to database..." -ForegroundColor Green
Write-Host "  Host: $dbHost" -ForegroundColor White
Write-Host "  Port: $dbPort" -ForegroundColor White
Write-Host "  Database: $dbName" -ForegroundColor White
Write-Host "  User: $dbUser" -ForegroundColor White
Write-Host ""

# Set password environment variable
$env:PGPASSWORD = $dbPassword

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

# Run check query
$result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $checkQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error connecting to database!" -ForegroundColor Red
    Write-Host $result
    $env:PGPASSWORD = $null
    exit 1
}

Write-Host "Duplicate check results:" -ForegroundColor Cyan
Write-Host $result
Write-Host ""

# Step 2: Show sample duplicates
Write-Host "Step 2: Showing sample duplicate records..." -ForegroundColor Yellow
Write-Host ""

$showDuplicatesQuery = @"
SELECT
    \"roomId\",
    \"userId\",
    COUNT(*) as duplicate_count,
    STRING_AGG(\"seatNumber\"::text, ', ') as seat_numbers
FROM room_participant
GROUP BY \"roomId\", \"userId\"
HAVING COUNT(*) > 1
LIMIT 5;
"@

psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $showDuplicatesQuery

Write-Host ""

# Ask for confirmation
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Remove duplicate participant records (keeping the most recent)" -ForegroundColor Yellow
Write-Host "  2. Add a UNIQUE constraint to prevent future duplicates" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Red
    $env:PGPASSWORD = $null
    exit 0
}

Write-Host ""
Write-Host "Step 3: Cleaning up duplicates..." -ForegroundColor Yellow
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
        RAISE NOTICE 'UNIQUE constraint added successfully';
    ELSE
        RAISE NOTICE 'UNIQUE constraint already exists';
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
    Write-Host "Step 4: Verifying constraint..." -ForegroundColor Yellow

    $verifyConstraintQuery = @"
    SELECT
        conname as constraint_name,
        contype as constraint_type
    FROM pg_constraint
    WHERE conname = 'unique_room_participant';
"@

    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $verifyConstraintQuery

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart your NestJS application (Ctrl+C then 'npm run start:dev')" -ForegroundColor White
    Write-Host "  2. Test seat movements in your app" -ForegroundColor White
    Write-Host "  3. Verify users can only sit in one seat at a time" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
