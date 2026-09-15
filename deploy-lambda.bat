@echo off
aws lambda update-function-code ^
  --function-name travelian-flight-api-FlightApiFunction ^
  --region us-east-1 ^
  --profile travelian-admin ^
  --zip-file fileb://deploy-lambda-flight-display-fixes-20260915-121338.zip
