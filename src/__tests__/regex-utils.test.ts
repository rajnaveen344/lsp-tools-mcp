import path from "path";
import { findRegexPositionsInContent, findRegexPositionsInFile } from "../utils/regex-utils.js";

describe("Regex Utilities", () => {
  describe("findRegexPositionsInContent", () => {
    it("should find basic patterns in a single line", () => {
      const content = "This is a test with pattern123 in it";
      const result = findRegexPositionsInContent(content, "pattern[0-9]+");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        match: "pattern123",
        line: 0,
        column: 20,
        endLine: 0,
        endColumn: 30
      });
    });

    it("should find multiple patterns in a single line", () => {
      const content = "pattern123 and pattern456 are both here";
      const result = findRegexPositionsInContent(content, "pattern[0-9]+");

      expect(result).toHaveLength(2);
      expect(result[0].match).toBe("pattern123");
      expect(result[1].match).toBe("pattern456");
    });

    it("should find patterns across multiple lines", () => {
      const content = "First line\nSecond line with pattern123\nThird line";
      const result = findRegexPositionsInContent(content, "pattern[0-9]+");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        match: "pattern123",
        line: 1,
        column: 17,
        endLine: 1,
        endColumn: 27
      });
    });

    it("should handle patterns that span multiple lines", () => {
      const content = "First line\npattern\n123\nFourth line";
      const result = findRegexPositionsInContent(content, "pattern\\n123");

      expect(result).toHaveLength(1);
      expect(result[0].line).toBe(1);
      expect(result[0].endLine).toBe(2);
    });

    it("should handle empty content", () => {
      const content = "";
      const result = findRegexPositionsInContent(content, "pattern");

      expect(result).toHaveLength(0);
    });

    it("should handle no matches", () => {
      const content = "This content has no matches";
      const result = findRegexPositionsInContent(content, "pattern[0-9]+");

      expect(result).toHaveLength(0);
    });

    it("should throw an error for invalid regex", () => {
      const content = "Test content";
      expect(() => {
        findRegexPositionsInContent(content, "(unclosed");
      }).toThrow();
    });
  });

  describe("findRegexPositionsInFile", () => {
    const testFilePath = path.join(process.cwd(), "src/__tests__/test-sample.txt");

    it("should find patterns in a file", async () => {
      const result = await findRegexPositionsInFile(testFilePath, "pattern[0-9]+");

      // Verify we found all three patterns
      expect(result.length).toBe(3);

      // Find the matches by their text content
      const pattern123Match = result.find(match => match.match === "pattern123");
      const pattern456Match = result.find(match => match.match === "pattern456");
      const pattern789Match = result.find(match => match.match === "pattern789");

      // Verify each match exists
      expect(pattern123Match).toBeDefined();
      expect(pattern456Match).toBeDefined();
      expect(pattern789Match).toBeDefined();

      // Verify positions for pattern123 (line 2: "Some with pattern123 to test.")
      expect(pattern123Match).toEqual({
        match: "pattern123",
        line: 2,
        column: 10,
        endLine: 2,
        endColumn: 20
      });

      // Verify positions for pattern456 (line 3: "And another pattern456 on this line.")
      expect(pattern456Match).toEqual({
        match: "pattern456",
        line: 3,
        column: 12,
        endLine: 3,
        endColumn: 22
      });

      // Verify positions for pattern789 (line 6: "There's also a pattern789 at the beginning of this line.")
      expect(pattern789Match).toEqual({
        match: "pattern789",
        line: 6,
        column: 15,
        endLine: 6,
        endColumn: 25
      });
    });

    it("should find multiline patterns in a file", async () => {
      const result = await findRegexPositionsInFile(
        testFilePath,
        "multiline pattern\\nthat spans"
      );

      expect(result.length).toBe(1);

      // Verify positions for the multiline pattern
      const multilineMatch = result[0];
      expect(multilineMatch.match).toBe("multiline pattern\nthat spans");
      expect(multilineMatch.line).toBe(7);  // Line index of "And a multiline pattern"
      expect(multilineMatch.column).toBe(6); // Column index where "multiline pattern" starts (after "And a ")
      expect(multilineMatch.endLine).toBe(8); // Line index of "that spans"
      expect(multilineMatch.endColumn).toBe(10); // Column index where "that spans" ends
    });

    it("should throw an error for non-existent file", async () => {
      await expect(findRegexPositionsInFile(
        "non-existent-file.txt",
        "pattern"
      )).rejects.toThrow();
    });
  });
});
