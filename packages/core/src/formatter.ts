export function formatPropsString(str: string): string {
  if (!str.trim()) return "";
  const props: Record<string, string> = {};
  const LAYOUT_PROPS = new Set(["x", "y", "w", "h", "arrow", "style"]);
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  const order = [
    "shape", "color", "text", "border", "borderWidth",
    "icon", "fontSize", "opacity", "dashed",
    "label", "animate", "thickness", "curve",
  ];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    if (!LAYOUT_PROPS.has(m[1]!)) {
      props[m[1]!] = m[2] !== undefined ? `"${m[2]}"` : m[3]!;
    }
  }
  const keys = Object.keys(props);
  keys.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((k) => `${k}=${props[k]}`).join(" ");
}

interface FormatterSegment {
  type: "line" | "block";
  text: string;
}

function extractFormatterSegments(code: string): FormatterSegment[] {
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

    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;

    if (opens > closes) {
      // マルチラインブロック
      let depth = opens - closes;
      const blockLines = [line];
      i++;
      while (i < lines.length && depth > 0) {
        const bLine = lines[i]!.trim();
        const bo = (bLine.match(/\{/g) ?? []).length;
        const bc = (bLine.match(/\}/g) ?? []).length;
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

function formatBlock(blockText: string, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  const childIndent = "  ".repeat(indentLevel + 1);

  // ヘッダー行（最初の行）を取得
  const firstLine = blockText.split("\n")[0]!.trim();
  const openIdx = firstLine.indexOf("{");
  const headerBase = normalizeSpaces(openIdx >= 0 ? firstLine.slice(0, openIdx) : firstLine);
  const headerPropsStr = openIdx >= 0 ? firstLine.slice(openIdx + 1) : "";
  const headerProps = formatPropsString(headerPropsStr);

  // ボディを取得（最初の行を除いた残り、最後の "}" 行を除く）
  const allLines = blockText.split("\n");
  const bodyLines = allLines.slice(1, allLines.length - 1);
  const body = bodyLines.join("\n").trim();

  if (!body) {
    // ボディが空 → 単一行として出力
    return `${indent}${headerBase}${headerProps ? ` { ${headerProps} }` : ""}`;
  }

  // ボディのセグメントを再帰的にフォーマット
  const bodySegments = extractFormatterSegments(body);
  const formattedChildren: string[] = [];

  for (const seg of bodySegments) {
    if (seg.type === "block") {
      formattedChildren.push(formatBlock(seg.text, indentLevel + 1));
    } else if (seg.text.trim()) {
      formattedChildren.push(`${childIndent}${formatSingleLine(seg.text.trim())}`);
    }
  }

  const lines = [
    `${indent}${headerBase}${headerProps ? ` { ${headerProps}` : " {"}`,
    ...formattedChildren,
    `${indent}}`,
  ];

  return lines.join("\n");
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** DSL行のヘッダーとプロパティブロックを整形する共通ヘルパー */
function formatHeaderAndProps(match: RegExpMatchArray, emptyFallback?: string): string {
  const header = normalizeSpaces(match[1]!);
  const props = formatPropsString(match[2] || "");
  if (props) return `${header} { ${props} }`;
  return emptyFallback !== undefined ? `${header} ${emptyFallback}` : header;
}

const LINE_PATTERNS: Array<{ regex: RegExp; emptyFallback?: string }> = [
  { regex: /^(node\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/ },
  { regex: /^(edge\s+\S+\s*(?:<-->|<->|<--|-->|<-|->|--)\s*\S+)(?:\s*\{([^}]*)\})?/ },
  { regex: /^(group\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/ },
  { regex: /^(note\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/ },
  { regex: /^(style\s+\S+)\s*\{([^}]*)\}/, emptyFallback: "{}" },
];

function formatSingleLine(line: string): string {
  if (!line || line.startsWith("//") || line.startsWith("#")) return line;

  for (const { regex, emptyFallback } of LINE_PATTERNS) {
    const match = line.match(regex);
    if (match) return formatHeaderAndProps(match, emptyFallback);
  }

  return line;
}

export function formatDSLCode(code: string): string {
  const segments = extractFormatterSegments(code);
  const formatted: string[] = [];

  for (const seg of segments) {
    if (seg.type === "line") {
      formatted.push(formatSingleLine(seg.text));
    } else {
      formatted.push(formatBlock(seg.text, 0));
    }
  }

  return formatted.join("\n");
}
