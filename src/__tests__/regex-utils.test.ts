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

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(match => match.match === "pattern123")).toBe(true);
      expect(result.some(match => match.match === "pattern456")).toBe(true);
    });

    it("should throw an error for non-existent file", async () => {
      await expect(findRegexPositionsInFile(
        "non-existent-file.txt",
        "pattern"
      )).rejects.toThrow();
    });
  });
});
