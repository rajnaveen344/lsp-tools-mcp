#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { findRegexPositionsInFile } from "./utils/regex-utils.js";
import { expandHome, normalizePath, validatePath } from "./utils/path-utils.js";

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: lsp-tools <allowed-directory> [additional-directories...]");
  process.exit(1);
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

// Schema definitions for the find_regex_position tool
const FindRegexPositionArgsSchema = z.object({
  path: z.string().describe("Absolute path to the file to search in. Relative paths are not supported."),
  regex: z.string().describe("Regular expression pattern to search for"),
});

// Schema for list_allowed_directories tool (empty object, no parameters needed)
const ListAllowedDirectoriesArgsSchema = z.object({});

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
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "find_regex_position",
        description:
          "Find the positions (line and column) of regex pattern matches in a file. " +
          "Returns an array of matches with their positions. " +
          "Line and column numbers are 0-indexed (first line is 0). " +
          "Each match includes: match (matched text), line (starting line), column (starting column), " +
          "endLine (ending line), and endColumn (ending column, exclusive). " +
          "IMPORTANT: The path parameter must be an absolute path. Relative paths are not supported.",
        inputSchema: zodToJsonSchema(FindRegexPositionArgsSchema),
      },
      {
        name: "list_allowed_directories",
        description:
          "Lists all directories that this server is allowed to access. " +
          "Use this to understand which paths are accessible before trying to access files. " +
          "Returns an array of absolute paths to allowed directories.",
        inputSchema: zodToJsonSchema(ListAllowedDirectoriesArgsSchema),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "find_regex_position": {
      try {
        // Validate input
        const parsed = FindRegexPositionArgsSchema.parse(args);

        // Validate path for security
        const validatedPath = await validatePath(parsed.path, allowedDirectories);

        // Find regex positions
        const positions = await findRegexPositionsInFile(validatedPath, parsed.regex);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(positions),
          }]
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    case "list_allowed_directories": {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(allowedDirectories),
        }]
      };
    }

    default:
      return {
        error: `Unknown tool: ${name}`,
      };
  }
});

// Start server with stdio transport
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LSP Tools MCP Server running on stdio");
  console.error("Allowed directories:", allowedDirectories);
}

runServer().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
