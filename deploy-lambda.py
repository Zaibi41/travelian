#!/usr/bin/env python3
import boto3
import sys
import os

os.environ['AWS_PROFILE'] = 'travelian-admin'

def deploy_lambda(zip_file, function_name, region='us-east-1'):
    """Deploy Lambda function"""
    session = boto3.Session(profile_name='travelian-admin', region_name=region)
    client = session.client('lambda')
    
    print(f"Using profile: travelian-admin")
    print(f"Reading {zip_file}...")
    with open(zip_file, 'rb') as f:
        zip_content = f.read()
    
    print(f"Package size: {len(zip_content):,} bytes ({len(zip_content)/1024/1024:.2f} MB)")
    print(f"Deploying to {function_name}...")
    print("(This may take 15-30 seconds...)")
    
    response = client.update_function_code(
        FunctionName=function_name,
        ZipFile=zip_content
    )
    
    print(f"\n{'='*60}")
    print(f"[SUCCESS] Lambda function deployed successfully!")
    print(f"{'='*60}")
    print(f"Function: {response['FunctionName']}")
    print(f"Last Modified: {response['LastModified']}")
    print(f"Code Size: {response['CodeSize']:,} bytes")
    print(f"Runtime: {response.get('Runtime', 'N/A')}")
    print(f"State: {response.get('State', 'Active')}")
    print(f"{'='*60}\n")
    
    return response

if __name__ == '__main__':
    zip_file = 'deploy-lambda-flight-display-fixes-20260915-122514.zip'
    function_name = 'travelian-flight-api-FlightApiFunction-kEhQZ5X7mt0M'
    
    try:
        deploy_lambda(zip_file, function_name)
        print("All flight display fixes are now LIVE!")
        print("Test at: https://travelian.pk/flights")
    except Exception as e:
        print(f"\n[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
