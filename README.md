# LSP Tools MCP Server

A Model Context Protocol (MCP) server providing Language Server Protocol-like functionality for text analysis.

## Features

- **Find Regex Position**: Find the 0-indexed line and column positions of regex pattern matches in a file
- **List Allowed Directories**: Get a list of directories the server is allowed to access

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Start the server allowing access to a specific directory
node dist/index.js /path/to/allowed/directory

# Start the server with multiple allowed directories
node dist/index.js /path/to/dir1 /path/to/dir2 /path/to/dir3
```

## Development

### Running Tests

The project uses Jest for testing. Run the tests with:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Linting

Lint the code with ESLint:

```bash
npm run lint
```

## Tool Documentation

### find_regex_position

This tool finds the 0-indexed line and column positions of regex pattern matches in a file.

**Parameters:**
- `path`: The path to the file to search in
- `regex`: The regular expression pattern to search for

**Returns:**
- An array of matches with the following properties:
  - `match`: The matched text
  - `line`: The starting line (0-indexed)
  - `column`: The starting column (0-indexed)
  - `endLine`: The ending line (0-indexed)
  - `endColumn`: The ending column (0-indexed, exclusive)

### list_allowed_directories

This tool lists all directories that this server is allowed to access.

**Parameters:**
- None

**Returns:**
- An array of absolute paths to allowed directories

## License

MIT
