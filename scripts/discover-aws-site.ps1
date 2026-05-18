param(
  [string]$Profile = "travelian-admin",
  [string]$Region = "us-east-1",
  [string]$Domain = "travelian.pk"
)

$ErrorActionPreference = "Stop"

Write-Host "Caller identity"
aws sts get-caller-identity --profile $Profile --region $Region

Write-Host "`nS3 buckets containing travelian"
aws s3api list-buckets `
  --profile $Profile `
  --query "Buckets[?contains(Name, 'travelian') || contains(Name, 'travelaina') || contains(Name, 'fly-vibe')].[Name,CreationDate]" `
  --output table

Write-Host "`nCloudFront distributions matching domain"
aws cloudfront list-distributions `
  --profile $Profile `
  --query "DistributionList.Items[?contains(Aliases.Items || \`[]\`, '$Domain') || contains(DomainName, '$Domain')].[Id,DomainName,Aliases.Items,Origins.Items[0].DomainName,Status]" `
  --output table

Write-Host "`nRoute53 hosted zones"
aws route53 list-hosted-zones-by-name `
  --profile $Profile `
  --dns-name $Domain `
  --query "HostedZones[].[Id,Name,Config.PrivateZone]" `
  --output table
