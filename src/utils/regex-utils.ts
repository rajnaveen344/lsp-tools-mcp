import fs from "fs/promises";

// Define a type for a regex match result including position information
export interface RegexMatchPosition {
  match: string;
  line: number;  // 0-indexed
  column: number; // 0-indexed
  endLine: number; // 0-indexed
  endColumn: number; // 0-indexed
}

/**
 * Function to find regex matches with their positions in a file
 * @param filePath Path to the file to search in
 * @param regexStr Regular expression pattern to search for
 * @returns Array of matches with their positions
 */
export async function findRegexPositionsInFile(filePath: string, regexStr: string): Promise<RegexMatchPosition[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return findRegexPositionsInContent(content, regexStr);
}

/**
 * Function to find regex matches with their positions in a string
 * @param content The text content to search in
 * @param regexStr Regular expression pattern to search for
 * @returns Array of matches with their positions
 */
export function findRegexPositionsInContent(content: string, regexStr: string): RegexMatchPosition[] {
  // Split content into lines for position calculation
  const lines = content.split("\n");

  try {
    // Create regex with global flag to find all matches
    const regex = new RegExp(regexStr, "g");

    const matches: RegexMatchPosition[] = [];
    let match: RegExpExecArray | null;

    // Process each match
    while ((match = regex.exec(content)) !== null) {
      const matchText = match[0];
      const matchStartIndex = match.index;

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
