param(
  [string]$Profile = "travelian-admin",
  [string]$Region = "us-east-1",
  [Parameter(Mandatory = $true)]
  [string]$Bucket,
  [string]$DistributionId = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $SkipBuild) {
  npm.cmd run build
}

aws sts get-caller-identity --profile $Profile --region $Region | Out-Host

aws s3 sync dist "s3://$Bucket" `
  --profile $Profile `
  --region $Region `
  --delete `
  --cache-control "public,max-age=31536000,immutable" `
  --exclude "index.html" `
  --exclude "sitemap.xml" `
  --exclude "robots.txt" `
  --exclude "travelian-brand-logo_old.png" `
  --exclude "package-images/*"

aws s3 cp dist/index.html "s3://$Bucket/index.html" `
  --profile $Profile `
  --region $Region `
  --cache-control "no-cache,no-store,must-revalidate" `
  --content-type "text/html"

if (Test-Path "dist/sitemap.xml") {
  aws s3 cp dist/sitemap.xml "s3://$Bucket/sitemap.xml" `
    --profile $Profile `
    --region $Region `
    --cache-control "public,max-age=3600" `
    --content-type "application/xml"
}

if (Test-Path "dist/robots.txt") {
  aws s3 cp dist/robots.txt "s3://$Bucket/robots.txt" `
    --profile $Profile `
    --region $Region `
    --cache-control "public,max-age=3600" `
    --content-type "text/plain"
}

if (-not [string]::IsNullOrWhiteSpace($DistributionId)) {
  aws cloudfront create-invalidation `
    --profile $Profile `
    --region $Region `
    --distribution-id $DistributionId `
    --paths "/*" | Out-Host
}

Write-Host "Deploy complete."
