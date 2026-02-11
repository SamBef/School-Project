# Deploy KoboTrack API to Railway.
# Run from repo root. You must have run `railway login` and `railway link` once from apps/api (and selected the API service).
# Usage: .\scripts\deploy-railway.ps1
# Optional: .\scripts\deploy-railway.ps1 -FrontendUrl "https://your-site.netlify.app"

param(
    [string]$FrontendUrl = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot + "\.."

Write-Host "Checking Railway login..."
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Run: railway login"
    exit 1
}
Write-Host "Logged in as: $whoami"

Write-Host "Deploying from apps/api (linked service must be the API, e.g. eloquent-stillness)..."
Push-Location (Join-Path $repoRoot "apps\api")
try {
    railway up
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Deploy failed. Try: cd apps\api; railway link (select project, environment, and the API service); railway up --verbose"
        exit 1
    }
} finally {
    Pop-Location
}
Write-Host "Deploy triggered. Check Railway dashboard for status and public URL."

if ($FrontendUrl) {
    Write-Host "Setting FRONTEND_URL to $FrontendUrl"
    Push-Location (Join-Path $repoRoot "apps\api")
    try {
        railway variables set "FRONTEND_URL=$FrontendUrl"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: could not set FRONTEND_URL."
        } else {
            Write-Host "FRONTEND_URL set. Redeploy may run automatically."
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "To set FRONTEND_URL later, run: cd apps\api; railway variables set FRONTEND_URL=https://your-netlify-site.netlify.app"
}
