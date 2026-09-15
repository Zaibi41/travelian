#!/usr/bin/env python3
import zipfile
import os
from pathlib import Path
from datetime import datetime

def create_lambda_zip(source_dir, output_zip):
    """Create a Lambda deployment ZIP file"""
    print(f"Creating ZIP archive: {output_zip}")
    print(f"Source directory: {source_dir}")
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        source_path = Path(source_dir)
        
        # Add node_modules
        node_modules = source_path / 'node_modules'
        if node_modules.exists():
            print("Adding node_modules...")
            for root, dirs, files in os.walk(node_modules):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(source_path)
                    zipf.write(file_path, arcname)
                    
        # Add package.json
        package_json = source_path / 'package.json'
        if package_json.exists():
            print("Adding package.json...")
            zipf.write(package_json, 'package.json')
            
        # Add src directory
        src_dir = source_path / 'src'
        if src_dir.exists():
            print("Adding src/...")
            for root, dirs, files in os.walk(src_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(source_path)
                    zipf.write(file_path, arcname)
    
    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"\n[SUCCESS] Created {output_zip}")
    print(f"Size: {size_mb:.2f} MB")
    return output_zip

if __name__ == '__main__':
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_zip = f'deploy-lambda-flight-display-fixes-{timestamp}.zip'
    source_dir = 'aws/flight-api'
    
    create_lambda_zip(source_dir, output_zip)
