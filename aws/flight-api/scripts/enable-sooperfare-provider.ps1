$ErrorActionPreference = "Stop"

$functionName = "travelian-flight-api-FlightApiFunction-kEhQZ5X7mt0M"
$profile = "travelian-admin"
$region = "us-east-1"

aws ssm get-parameter `
  --profile $profile `
  --region $region `
  --name "/travelian/providers/sooperfare" `
  --query "Parameter.{Name:Name,Type:Type,Version:Version}" `
  --output json

$configuration = aws lambda get-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName | ConvertFrom-Json

$variables = @{}
$configuration.Environment.Variables.PSObject.Properties | ForEach-Object {
  $variables[$_.Name] = [string]$_.Value
}

$providers = @($variables["ENABLED_PROVIDERS"].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($providers -notcontains "sooperfare") {
  $providers += "sooperfare"
}
$variables["ENABLED_PROVIDERS"] = ($providers -join ",")

$environment = @{ Variables = $variables } | ConvertTo-Json -Depth 10 -Compress
$envFile = Join-Path $env:TEMP "travelian-enable-sooperfare.json"
$environment | Set-Content -LiteralPath $envFile -Encoding ascii

aws lambda update-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName `
  --environment "file://$envFile" `
  --query LastModified `
  --output text

aws lambda wait function-updated `
  --profile $profile `
  --region $region `
  --function-name $functionName

Remove-Item -LiteralPath $envFile -Force

aws lambda get-function-configuration `
  --profile $profile `
  --region $region `
  --function-name $functionName `
  --query "Environment.Variables.ENABLED_PROVIDERS" `
  --output text
