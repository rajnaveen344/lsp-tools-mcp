#!/bin/bash

# Define the file path and regex pattern
FILE_PATH="./test-file.txt"
REGEX_PATTERN="pattern[0-9]+"

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

# Send request to the MCP server and show full response
echo "Request:"
echo "$REQUEST"
echo
echo "Response:"
echo "$REQUEST" | node dist/index.js $(pwd)
