import type { SyntaxToken } from "./types.js";

/** プロパティ値の型に応じた色を返す */
function getValueColor(val: string): string {
  if (val.startsWith("#")) return val;
  if (/^\d/.test(val)) return "#fbbf24";
  if (val === "true" || val === "false") return "#f97316";
  return "#e2e8f0";
}

/**
 * 文字列 source の位置 pos から1つのプロパティトークン群を解析して tokens に追加する。
 * 戻り値は消費した文字数。0 を返した場合はこの位置で認識できるトークンがない。
 */
function tokenizePropStep(source: string, pos: number, tokens: SyntaxToken[]): number {
  const rest = source.slice(pos);

  const strMatch = rest.match(/^("(?:[^"\\]|\\.)*")/);
  if (strMatch) {
    tokens.push({ text: strMatch[1], color: "#34d399" });
    return strMatch[0].length;
  }

  if (source[pos] === "{" || source[pos] === "}") {
    tokens.push({ text: source[pos], color: "#fbbf24" });
    return 1;
  }

  const propMatch = rest.match(/^(\w+)(=)/);
  if (propMatch) {
    tokens.push({ text: propMatch[1], color: "#60a5fa" });
    tokens.push({ text: "=", color: "#94a3b8" });
    let consumed = propMatch[0].length;

    const valMatch = source.slice(pos + consumed).match(/^(?:"([^"]*)"|(\S+?)(?=\s|}|$))/);
    if (valMatch) {
      if (valMatch[1] !== undefined) {
        tokens.push({ text: `"${valMatch[1]}"`, color: "#34d399" });
      } else {
        tokens.push({ text: valMatch[2], color: getValueColor(valMatch[2]) });
      }
      consumed += valMatch[0].length;
    }
    return consumed;
  }

  const wsMatch = rest.match(/^(\s+)/);
  if (wsMatch) {
    tokens.push({ text: wsMatch[1], color: "#e2e8f0" });
    return wsMatch[0].length;
  }

  const idMatch = rest.match(/^(\S+)/);
  if (idMatch) {
    tokens.push({ text: idMatch[1], color: "#e2e8f0" });
    return idMatch[0].length;
  }

  tokens.push({ text: source[pos], color: "#e2e8f0" });
  return 1;
}

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
      const arrowMatch = remaining.slice(pos).match(/^(\s*)(<-->|<->|<--|-->|<-|->|--)(\s*)/);
      if (arrowMatch) {
        if (arrowMatch[1]) tokens.push({ text: arrowMatch[1], color: "#e2e8f0" });
        tokens.push({ text: arrowMatch[2], color: "#f97316" });
        if (arrowMatch[3]) tokens.push({ text: arrowMatch[3], color: "#e2e8f0" });
        pos += arrowMatch[0].length;
        continue;
      }

      pos += tokenizePropStep(remaining, pos, tokens);
    }

    return tokens;
  }

  // キーワードなしのプロパティ行（改行した波括弧内: label="..." animate=true など）
  if (/^\s*\w+=/.test(line)) {
    const propTokens: SyntaxToken[] = [];
    let pos = 0;
    while (pos < line.length) {
      pos += tokenizePropStep(line, pos, propTokens);
    }
    return propTokens;
  }

  return [{ text: line, color: "#e2e8f0" }];
}
