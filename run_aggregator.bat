@echo off

REM ====================================================================================================
REM File Aggregator Batch Script
REM ====================================================================================================
REM
REM This batch script runs a Python script that aggregates files from the Agentopia project directory
REM into a temporary 'code_heap' folder. This is useful for quickly gathering all relevant project files
REM for review, sharing, or processing.
REM
REM The script does the following:
REM 1. Runs the Python script 'aggregate_files.py' located in the Agentopia project directory
REM 2. Sets the source directory to scan for files (the Agentopia project folder)
REM 3. Sets the destination directory for aggregated files (the 'code_heap' folder)
REM 4. Specifies file extensions to include (.js, .jsx, .css, .json, .md)
REM
REM After running, it displays a completion message and waits for user input before closing.
REM
REM Usage: Simply double-click this batch file or run it from the command line.
REM ====================================================================================================

python C:\Users\scott\Documents\Agentopia\agentopia\aggregate_files.py ^
C:\Users\scott\Documents\Agentopia\agentopia ^
C:\Users\scott\Documents\Agentopia\agentopia\code_heap ^
--extensions .js .jsx .css .json .md

echo File aggregation complete. Files are in C:\Users\scott\Documents\Agentopia\agentopia\code_heap
pause