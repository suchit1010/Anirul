# scripts/migrate-db.ps1 — run drizzle migrations against target database

if (-not $env:DATABASE_URL) {
  Write-Error "Error: DATABASE_URL env var not set"
  exit 1
}

Write-Host "Running DB migrations..."
pnpm --filter @workspace/db run push
if ($LASTEXITCODE -ne 0) {
  Write-Error "Migrations failed"
  exit 1
}

Write-Host "✓ Migrations completed successfully"
