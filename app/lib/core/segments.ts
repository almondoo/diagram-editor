import type { ParseError } from "./types";

function countChar(s: string, ch: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ch) count++;
  }
  return count;
}

export interface Segment {
  text: string;
  startLine: number;
}

/**
 * コードをセグメントに分割する。
 * セグメントは単一行 or マルチラインブロック（{...} が複数行にまたがる場合）。
 * errors を渡すと、閉じられていないブロックのエラーを追加する。
 */
export function extractSegments(
  code: string,
  errors?: ParseError[],
): Segment[] {
  const segments: Segment[] = [];
  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      i++;
      continue;
    }

    const opens = countChar(line, "{");
    const closes = countChar(line, "}");

    if (opens > closes) {
      // マルチラインブロックの開始
      const startLine = i + 1;
      let depth = opens - closes;
      const blockLines = [line];
      i++;
      while (i < lines.length && depth > 0) {
        const bLine = lines[i]!.trim();
        const bo = countChar(bLine, "{");
        const bc = countChar(bLine, "}");
        depth += bo - bc;
        blockLines.push(bLine);
        i++;
      }
      if (depth > 0 && errors) {
        errors.push({ line: startLine, message: "構文エラー: ブロックが閉じられていません" });
      }
      segments.push({ text: blockLines.join("\n"), startLine });
    } else {
      segments.push({ text: line, startLine: i + 1 });
      i++;
    }
  }

  return segments;
}

export interface FormatterSegment {
  type: "line" | "block";
  text: string;
}

/**
 * フォーマッタ用セグメント分割。
 * 空行を保持し、startLine を含まない（フォーマッタでは行番号不要）。
 */
export function extractFormatterSegments(code: string): FormatterSegment[] {
  const segments: FormatterSegment[] = [];
  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i]!;
    const line = raw.trim();

    if (!line) {
      segments.push({ type: "line", text: "" });
      i++;
      continue;
    }

    const opens = countChar(line, "{");
    const closes = countChar(line, "}");

    if (opens > closes) {
      // マルチラインブロック
      let depth = opens - closes;
      const blockLines = [line];
      i++;
      while (i < lines.length && depth > 0) {
        const bLine = lines[i]!.trim();
        const bo = countChar(bLine, "{");
        const bc = countChar(bLine, "}");
        depth += bo - bc;
        blockLines.push(bLine);
        i++;
      }
      segments.push({ type: "block", text: blockLines.join("\n") });
    } else {
      segments.push({ type: "line", text: line });
      i++;
    }
  }

  return segments;
}
