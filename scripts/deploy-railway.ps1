# Deploy KoboTrack API to Railway.
# Run from repo root. You must have run `railway login` and `railway link` once first.
# Usage: .\scripts\deploy-railway.ps1
# Optional: .\scripts\deploy-railway.ps1 -FrontendUrl "https://your-site.netlify.app"

param(
    [string]$FrontendUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Checking Railway login..."
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Run: railway login"
    exit 1
}
Write-Host "Logged in as: $whoami"

Write-Host "Deploying to Railway (service uses root directory apps/api)..."
railway up
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed."
    exit 1
}
Write-Host "Deploy triggered. Check Railway dashboard for status and public URL."

if ($FrontendUrl) {
    Write-Host "Setting FRONTEND_URL to $FrontendUrl"
    railway variables set "FRONTEND_URL=$FrontendUrl"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: could not set FRONTEND_URL."
    } else {
        Write-Host "FRONTEND_URL set. Redeploy may run automatically."
    }
} else {
    Write-Host "To set FRONTEND_URL later, run: railway variables set FRONTEND_URL=https://your-netlify-site.netlify.app"
}
