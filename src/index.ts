#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: lsp-tools <allowed-directory> [additional-directories...]");
  process.exit(1);
}

// Normalize all paths consistently
function normalizePath(p: string): string {
  return path.normalize(p);
}

function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Store allowed directories in normalized form
const allowedDirectories = args.map(dir =>
  normalizePath(path.resolve(expandHome(dir)))
);

// Validate that all directories exist and are accessible
await Promise.all(args.map(async (dir) => {
  try {
    const stats = await fs.stat(dir);
    if (!stats.isDirectory()) {
      console.error(`Error: ${dir} is not a directory`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing directory ${dir}:`, error);
    process.exit(1);
  }
}));

// Security utilities
async function validatePath(requestedPath: string): Promise<string> {
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath);

  const normalizedRequested = normalizePath(absolute);

  // Check if path is within allowed directories
  const isAllowed = allowedDirectories.some(dir => normalizedRequested.startsWith(dir));
  if (!isAllowed) {
    throw new Error(`Access denied - path outside allowed directories: ${absolute} not in ${allowedDirectories.join(', ')}`);
  }

  // Handle symlinks by checking their real path
  try {
    const realPath = await fs.realpath(absolute);
    const normalizedReal = normalizePath(realPath);
    const isRealPathAllowed = allowedDirectories.some(dir => normalizedReal.startsWith(dir));
    if (!isRealPathAllowed) {
      throw new Error("Access denied - symlink target outside allowed directories");
    }
    return realPath;
  } catch (error) {
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute);
    try {
      const realParentPath = await fs.realpath(parentDir);
      const normalizedParent = normalizePath(realParentPath);
      const isParentAllowed = allowedDirectories.some(dir => normalizedParent.startsWith(dir));
      if (!isParentAllowed) {
        throw new Error("Access denied - parent directory outside allowed directories");
      }
      return absolute;
    } catch {
      throw new Error(`Parent directory does not exist: ${parentDir}`);
    }
  }
}

// Schema definitions for the find_regex_position tool
const FindRegexPositionArgsSchema = z.object({
  path: z.string().describe("Path to the file to search in"),
  regex: z.string().describe("Regular expression pattern to search for"),
});

// Define a type for a regex match result including position information
interface RegexMatchPosition {
  match: string;
  line: number;  // 0-indexed
  column: number; // 0-indexed
  endLine: number; // 0-indexed
  endColumn: number; // 0-indexed
}

// Function to find regex matches with their positions
async function findRegexPositions(filePath: string, regexStr: string): Promise<RegexMatchPosition[]> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Split content into lines for position calculation
  const lines = content.split('\n');

  try {
    // Create regex with global flag to find all matches
    const regex = new RegExp(regexStr, 'g');

    const matches: RegexMatchPosition[] = [];
    let match: RegExpExecArray | null;

    // Process each match
    while ((match = regex.exec(content)) !== null) {
      const matchText = match[0];
      const matchStartIndex = match.index;
      const matchEndIndex = matchStartIndex + matchText.length;

      // Calculate line and column for start position
      let currentIndex = 0;
      let startLine = 0;
      let startColumn = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for the newline character

        if (currentIndex + lineLength > matchStartIndex) {
          startLine = i;
          startColumn = matchStartIndex - currentIndex;
          break;
        }

        currentIndex += lineLength;
      }

      // Calculate line and column for end position
      let endLine = startLine;
      let endColumn = startColumn;
      let charsRemaining = matchText.length;

      while (charsRemaining > 0 && endLine < lines.length) {
        const lineRemainder = lines[endLine].length - endColumn + 1; // +1 for newline

        if (charsRemaining <= lineRemainder) {
          endColumn += charsRemaining;
          charsRemaining = 0;
        } else {
          charsRemaining -= lineRemainder;
          endLine++;
          endColumn = 0;
        }
      }

      // Adjust end column to be exclusive (pointing to the character after the match)
      if (endColumn > 0 && lines[endLine] && endColumn <= lines[endLine].length) {
        // No adjustment needed, end column already points to the character after the match
      } else {
        // End of line or beyond, set to 0 and increment line
        endColumn = 0;
        endLine++;
      }

      matches.push({
        match: matchText,
        line: startLine,
        column: startColumn,
        endLine: endLine,
        endColumn: endColumn
      });
    }

    return matches;
  } catch (error) {
    throw new Error(`Error processing regex: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: "lsp-tools-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "find_regex_position",
        description:
          "Find the 0-indexed line and column position of a regex pattern in a file. " +
          "Returns an array of matches with their positions. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(FindRegexPositionArgsSchema) as ToolInput,
      },
      {
        name: "list_allowed_directories",
        description:
          "Returns the list of directories that this server is allowed to access. " +
          "Use this to understand which directories are available before trying to access files.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "find_regex_position": {
        const parsed = FindRegexPositionArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for find_regex_position: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const positions = await findRegexPositions(validPath, parsed.data.regex);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(positions, null, 2)
          }],
        };
      }

      case "list_allowed_directories": {
        return {
          content: [{
            type: "text",
            text: `Allowed directories:\n${allowedDirectories.join('\n')}`
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LSP Tools MCP Server running on stdio");
  console.error("Allowed directories:", allowedDirectories);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
