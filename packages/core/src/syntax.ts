import type { SyntaxToken } from "./types.js";

export function highlightLine(line: string): SyntaxToken[] {
  const trimmed = line.trim();
  if (!trimmed) return [{ text: line, color: "#475569" }];

  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return [{ text: line, color: "#6b7280" }];
  }

  if (trimmed === "}") {
    const indentLen = line.length - line.trimStart().length;
    const tokens: SyntaxToken[] = [];
    if (indentLen > 0) tokens.push({ text: line.slice(0, indentLen), color: "#e2e8f0" });
    tokens.push({ text: "}", color: "#fbbf24" });
    return tokens;
  }

  const tokens: SyntaxToken[] = [];
  let remaining = line;

  const kwMatch = remaining.match(/^(\s*)(node|edge|group|note|style)\b/);
  if (kwMatch) {
    if (kwMatch[1]) tokens.push({ text: kwMatch[1], color: "#e2e8f0" });
    tokens.push({ text: kwMatch[2], color: "#c084fc" });
    remaining = remaining.slice(kwMatch[0].length);

    let pos = 0;
    while (pos < remaining.length) {
      const arrowMatch = remaining.slice(pos).match(/^(\s*)(->)(\s*)/);
      if (arrowMatch) {
        if (arrowMatch[1]) tokens.push({ text: arrowMatch[1], color: "#e2e8f0" });
        tokens.push({ text: "->", color: "#f97316" });
        if (arrowMatch[3]) tokens.push({ text: arrowMatch[3], color: "#e2e8f0" });
        pos += arrowMatch[0].length;
        continue;
      }

      const strMatch = remaining.slice(pos).match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        tokens.push({ text: strMatch[1], color: "#34d399" });
        pos += strMatch[0].length;
        continue;
      }

      if (remaining[pos] === "{" || remaining[pos] === "}") {
        tokens.push({ text: remaining[pos], color: "#fbbf24" });
        pos++;
        continue;
      }

      const propMatch = remaining.slice(pos).match(/^(\w+)(=)/);
      if (propMatch) {
        tokens.push({ text: propMatch[1], color: "#60a5fa" });
        tokens.push({ text: "=", color: "#94a3b8" });
        pos += propMatch[0].length;

        const valMatch = remaining.slice(pos).match(/^(?:"([^"]*)"|(\S+?)(?=\s|}|$))/);
        if (valMatch) {
          if (valMatch[1] !== undefined) {
            tokens.push({ text: `"${valMatch[1]}"`, color: "#34d399" });
          } else {
            const val = valMatch[2];
            if (val.startsWith("#")) {
              tokens.push({ text: val, color: val });
            } else if (/^\d/.test(val)) {
              tokens.push({ text: val, color: "#fbbf24" });
            } else if (val === "true" || val === "false") {
              tokens.push({ text: val, color: "#f97316" });
            } else {
              tokens.push({ text: val, color: "#e2e8f0" });
            }
          }
          pos += valMatch[0].length;
        }
        continue;
      }

      const wsMatch = remaining.slice(pos).match(/^(\s+)/);
      if (wsMatch) {
        tokens.push({ text: wsMatch[1], color: "#e2e8f0" });
        pos += wsMatch[0].length;
        continue;
      }

      const idMatch = remaining.slice(pos).match(/^(\S+)/);
      if (idMatch) {
        tokens.push({ text: idMatch[1], color: "#e2e8f0" });
        pos += idMatch[0].length;
        continue;
      }

      tokens.push({ text: remaining[pos], color: "#e2e8f0" });
      pos++;
    }

    return tokens;
  }

  // キーワードなしのプロパティ行（改行した波括弧内: label="..." animate=true など）
  if (/^\s*\w+=/.test(line)) {
    const propTokens: SyntaxToken[] = [];
    let pos = 0;
    while (pos < line.length) {
      const strMatch = line.slice(pos).match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        propTokens.push({ text: strMatch[1], color: "#34d399" });
        pos += strMatch[0].length;
        continue;
      }

      if (line[pos] === "{" || line[pos] === "}") {
        propTokens.push({ text: line[pos], color: "#fbbf24" });
        pos++;
        continue;
      }

      const propMatch = line.slice(pos).match(/^(\w+)(=)/);
      if (propMatch) {
        propTokens.push({ text: propMatch[1], color: "#60a5fa" });
        propTokens.push({ text: "=", color: "#94a3b8" });
        pos += propMatch[0].length;

        const valMatch = line.slice(pos).match(/^(?:"([^"]*)"|(\S+?)(?=\s|}|$))/);
        if (valMatch) {
          if (valMatch[1] !== undefined) {
            propTokens.push({ text: `"${valMatch[1]}"`, color: "#34d399" });
          } else {
            const val = valMatch[2];
            if (val.startsWith("#")) {
              propTokens.push({ text: val, color: val });
            } else if (/^\d/.test(val)) {
              propTokens.push({ text: val, color: "#fbbf24" });
            } else if (val === "true" || val === "false") {
              propTokens.push({ text: val, color: "#f97316" });
            } else {
              propTokens.push({ text: val, color: "#e2e8f0" });
            }
          }
          pos += valMatch[0].length;
        }
        continue;
      }

      const wsMatch = line.slice(pos).match(/^(\s+)/);
      if (wsMatch) {
        propTokens.push({ text: wsMatch[1], color: "#e2e8f0" });
        pos += wsMatch[0].length;
        continue;
      }

      propTokens.push({ text: line[pos], color: "#e2e8f0" });
      pos++;
    }
    return propTokens;
  }

  return [{ text: line, color: "#e2e8f0" }];
}
