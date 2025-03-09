#!/bin/bash

# This script demonstrates how to use the find_regex_position tool
# from our LSP Tools MCP server

# Define the file path and regex pattern
FILE_PATH="./test-file.txt"
REGEX_PATTERN="pattern[0-9]+"

# Function to extract the result from MCP response
extract_result() {
  # Extract content from the response JSON using grep and sed
  CONTENT=$(echo "$1" | grep -o '"content":\[[^]]*\]' | sed 's/"content":\[//' | sed 's/\]//')

  # Extract the text part
  TEXT=$(echo "$CONTENT" | grep -o '"text":"[^"]*"' | sed 's/"text":"//g' | sed 's/"$//g')

  # Handle escaped quotes and newlines
  TEXT=$(echo "$TEXT" | sed 's/\\"/"/g' | sed 's/\\n/\n/g')

  echo "$TEXT"
}

# Construct MCP request as JSON
read -r -d '' REQUEST << EOM
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "mcp.callTool",
  "params": {
    "name": "find_regex_position",
    "arguments": {
      "path": "$FILE_PATH",
      "regex": "$REGEX_PATTERN"
    }
  }
}
EOM

# Send request to the MCP server and store the response
RESPONSE=$(echo "$REQUEST" | node dist/index.js $(pwd))

echo "Results for pattern '$REGEX_PATTERN':"
extract_result "$RESPONSE"

# Example for multiline pattern search
echo ""
echo "Searching for multiline pattern:"
read -r -d '' MULTILINE_REQUEST << EOM
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "mcp.callTool",
  "params": {
    "name": "find_regex_position",
    "arguments": {
      "path": "$FILE_PATH",
      "regex": "Find this[\\\\s\\\\S]*?multiple lines"
    }
  }
}
EOM

MULTILINE_RESPONSE=$(echo "$MULTILINE_REQUEST" | node dist/index.js $(pwd))
extract_result "$MULTILINE_RESPONSE"
