import os
import shutil
import datetime
import argparse
import fnmatch

"""
File Aggregator Script

To facilitate sharing source code files with AI agents, This script aggregates files 
from a source directory into a temporary directory, respecting
.gitignore rules and ignoring specific folders like 'node_modules' and 'code_heap'.

Key features:
1. Parses .gitignore file to respect ignore rules
2. Ignores 'node_modules' folders and the 'code_heap' directory
3. Copies only files with specified extensions
4. Flattens directory structure in the destination
5. Handles file name conflicts in the destination
6. Optionally filters files based on modification date

Usage:
python aggregate_files.py <source_dir> <temp_dir> [--extensions ext1 ext2 ...] [--modified-after YYYY-MM-DD]
"""

def parse_gitignore(gitignore_path):
    """
    Parse the .gitignore file and return a list of ignore patterns.
    """
    ignore_patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    ignore_patterns.append(line)
    return ignore_patterns

def should_ignore(path, ignore_patterns, code_heap_path):
    """
    Determine if a file or directory should be ignored based on ignore patterns
    and specific rules (node_modules, code_heap).
    """
    # Ignore node_modules folders
    if 'node_modules' in path.split(os.path.sep):
        return True
    
    # Ignore the code_heap folder
    if os.path.abspath(path).startswith(code_heap_path):
        return True
    
    for pattern in ignore_patterns:
        if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(os.path.basename(path), pattern):
            return True
    return False

def clear_directory(directory):
    """
    Remove all files and subdirectories from the specified directory.
    """
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        if os.path.isfile(item_path):
            os.unlink(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
    print(f"Cleared all contents from {directory}")

def aggregate_files(source_dir, temp_dir, file_extensions, ignore_patterns, modified_after=None):
    """
    Aggregate files from source_dir to temp_dir, respecting ignore patterns and file extensions.
    """
    source_dir = os.path.abspath(source_dir)
    temp_dir = os.path.abspath(temp_dir)
    
    # Clear the temporary directory
    clear_directory(temp_dir)

    # Walk through the source directory
    for root, _, files in os.walk(source_dir):
        if should_ignore(root, ignore_patterns, temp_dir):
            continue
        
        for file in files:
            # Check if the file has a relevant extension
            if file.endswith(tuple(file_extensions)):
                source_path = os.path.join(root, file)
                relative_path = os.path.relpath(source_path, source_dir)
                
                # Check if the file should be ignored
                if should_ignore(relative_path, ignore_patterns, temp_dir):
                    continue

                # If modified_after is specified, check the file's modification time
                if modified_after:
                    mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(source_path))
                    if mod_time < modified_after:
                        continue

                # Generate a unique name for the file in the temp directory
                base_name = os.path.basename(source_path)
                name, ext = os.path.splitext(base_name)
                counter = 1
                dest_path = os.path.join(temp_dir, base_name)
                while os.path.exists(dest_path):
                    dest_path = os.path.join(temp_dir, f"{name}_{counter}{ext}")
                    counter += 1

                # Copy the file to the temporary directory
                shutil.copy2(source_path, dest_path)
                print(f"Copied: {source_path} to {dest_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aggregate files into a temporary directory.")
    parser.add_argument("source_dir", help="Source directory to scan for files")
    parser.add_argument("temp_dir", help="Temporary directory to copy files to")
    parser.add_argument("--extensions", nargs="+", default=[".py", ".js", ".jsx", ".css", ".json", ".md"],
                        help="File extensions to include (default: .py .js .jsx .css .json .md)")
    parser.add_argument("--modified-after", help="Only include files modified after this date (YYYY-MM-DD)")

    args = parser.parse_args()

    modified_after = None
    if args.modified_after:
        modified_after = datetime.datetime.strptime(args.modified_after, "%Y-%m-%d")

    gitignore_path = os.path.join(args.source_dir, '.gitignore')
    ignore_patterns = parse_gitignore(gitignore_path)

    # Add code_heap to ignore patterns
    ignore_patterns.append('code_heap')

    aggregate_files(args.source_dir, args.temp_dir, args.extensions, ignore_patterns, modified_after)
    print(f"Files have been aggregated in: {args.temp_dir}")