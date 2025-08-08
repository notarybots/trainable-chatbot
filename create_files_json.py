#!/usr/bin/env python3
import os
import json
import subprocess
import base64

def get_git_files():
    """Get list of files tracked by git"""
    result = subprocess.run(['git', 'ls-files'], 
                          capture_output=True, text=True, cwd='/home/ubuntu/trainable_chatbot')
    if result.returncode == 0:
        return [f.strip() for f in result.stdout.split('\n') if f.strip()]
    return []

def is_binary_file(filepath):
    """Check if file is binary"""
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            return b'\x00' in chunk
    except:
        return True

def read_file_content(filepath):
    """Read file content, handling both text and binary files"""
    try:
        if is_binary_file(filepath):
            # For binary files, we'll encode as base64
            with open(filepath, 'rb') as f:
                content = base64.b64encode(f.read()).decode('utf-8')
                return f"[BINARY FILE - BASE64 ENCODED]\n{content}"
        else:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                return f.read()
    except Exception as e:
        return f"[ERROR READING FILE: {str(e)}]"

def main():
    os.chdir('/home/ubuntu/trainable_chatbot')
    
    git_files = get_git_files()
    files_data = []
    
    print(f"Processing {len(git_files)} files...")
    
    for i, file_path in enumerate(git_files, 1):
        if os.path.exists(file_path):
            content = read_file_content(file_path)
            files_data.append({
                "path": file_path,
                "content": content
            })
            print(f"[{i}/{len(git_files)}] Added: {file_path}")
        else:
            print(f"[{i}/{len(git_files)}] Skipped (not found): {file_path}")
    
    # Write to file as formatted JSON
    with open('/home/ubuntu/files_to_push.json', 'w', encoding='utf-8') as f:
        json.dump(files_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nCreated JSON file with {len(files_data)} files")
    print("File saved to: /home/ubuntu/files_to_push.json")

if __name__ == '__main__':
    main()
