#!/usr/bin/env node

import fs from 'fs/promises';

// Define a type for a regex match result including position information
// Note: In JavaScript we don't actually need the interface declaration
class RegexMatchPosition {
  constructor(match, line, column, endLine, endColumn) {
    this.match = match;
    this.line = line;
    this.column = column;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }
}

// Function to find regex matches with their positions
async function findRegexPositions(filePath, regexStr) {
  const content = await fs.readFile(filePath, 'utf-8');

  // Split content into lines for position calculation
  const lines = content.split('\n');

  try {
    // Create regex with global flag to find all matches
    const regex = new RegExp(regexStr, 'g');

    const matches = [];
    let match;

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

      matches.push(new RegexMatchPosition(
        matchText,
        startLine,
        startColumn,
        endLine,
        endColumn
      ));
    }

    return matches;
  } catch (error) {
    console.error(`Error processing regex: ${error.message || String(error)}`);
    return [];
  }
}

// Main function to test the functionality
async function main() {
  const filePath = process.argv[2] || './test-file.txt';
  const regexPattern = process.argv[3] || 'pattern[0-9]+';

  console.log(`Testing regex "${regexPattern}" on file "${filePath}":`);

  try {
    const matches = await findRegexPositions(filePath, regexPattern);
    console.log('\nMatches found:', matches.length);
    console.log(JSON.stringify(matches, null, 2));

    // Print the actual matches in context
    console.log('\nMatches in context:');
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const match of matches) {
      console.log(`\nMatch: "${match.match}"`);
      console.log(`Position: Line ${match.line}, Column ${match.column} to Line ${match.endLine}, Column ${match.endColumn}`);

      // Show the line with the match
      const line = lines[match.line];
      if (line) {
        console.log('Line content:', line);
        console.log('Position:    ' + ' '.repeat(match.column) + '^'.repeat(
          match.line === match.endLine ?
            match.endColumn - match.column :
            line.length - match.column
        ));
      }
    }

  } catch (error) {
    console.error('Error:', error.message || String(error));
  }
}

main().catch(console.error);
