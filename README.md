# LSP Tools MCP Server

A Model Context Protocol (MCP) server providing Language Server Protocol-like functionality for text analysis.

## Features

- **Find Regex Position**: Find the 0-indexed line and column position of a regex pattern match in a file

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Start the server allowing access to a specific directory
node dist/index.js /path/to/allowed/directory
```

## Tool Documentation

### find_regex_position

This tool finds the 0-indexed line and column position of a regex pattern in a file.

**Parameters:**
- `path`: The path to the file to search in
- `regex`: The regular expression pattern to search for

**Returns:**
- An array of matches with line and column positions (0-indexed)

## License

MIT
