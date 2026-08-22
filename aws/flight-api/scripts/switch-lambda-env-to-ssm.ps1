$ErrorActionPreference = "Stop"

$functionName = "travelian-flight-api-FlightApiFunction-kEhQZ5X7mt0M"
$profile = "travelian-admin"
$region = "us-east-1"

$configuration = aws lambda get-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName | ConvertFrom-Json

$variables = @{}
$configuration.Environment.Variables.PSObject.Properties | ForEach-Object {
  $variables[$_.Name] = [string]$_.Value
}

$mapping = @{
  PIA_SECRET_ID = "ssm:/travelian/providers/pia"
  EGRESS_PROXY_SECRET_ID = "ssm:/travelian/egress/proxy"
  DHILLUANDSAHI_SECRET_ID = "ssm:/travelian/providers/dhilluandsahi"
  TRAVELIAN_API_KEY_SECRET_ID = "ssm:/travelian/api/clients"
  TRAVELPORT_SECRET_ID = "ssm:/travelian/travelport/oauth"
  SOOPERFARE_SECRET_ID = "ssm:/travelian/providers/sooperfare"
  ALHAIDER_SECRET_ID = "ssm:/travelian/providers/alhaider"
  SKYPASS_CLIENT_SECRET_ID = "ssm:/travelian/api/skypass-clients"
  FLYADEAL_SECRET_ID = "ssm:/travelian/providers/flyadeal"
  AIRSIAL_SECRET_ID = "ssm:/travelian/providers/airsial"
}

foreach ($entry in $mapping.GetEnumerator()) {
  if ($variables.ContainsKey($entry.Key)) {
    $variables[$entry.Key] = $entry.Value
  }
}

$environment = @{ Variables = $variables } | ConvertTo-Json -Depth 10 -Compress
$envFile = Join-Path $env:TEMP "travelian-lambda-env-ssm.json"
$environment | Set-Content -LiteralPath $envFile -Encoding ascii

aws lambda update-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName `
  --environment "file://$envFile" | Out-Null

aws lambda wait function-updated `
  --profile $profile `
  --region $region `
  --function-name $functionName

Remove-Item -LiteralPath $envFile -Force

aws lambda get-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName `
  --query "Environment.Variables" `
  --output json
