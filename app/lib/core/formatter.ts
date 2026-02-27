import { extractFormatterSegments } from "./segments";

export function formatPropsString(str: string): string {
  if (!str.trim()) return "";
  const props: Record<string, string> = {};
  const LAYOUT_PROPS = new Set(["x", "y", "w", "h", "arrow", "style"]);
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  const order = [
    "shape", "color", "text",
    "icon", "opacity", "dashed",
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

const CATEGORY_ORDER: Record<string, number> = {
  group: 0,
  node: 1,
  edge: 2,
  note: 3,
  style: 4,
};

function getSegmentCategory(text: string): string {
  const firstLine = text.split("\n")[0]!.trim();
  if (!firstLine) return "empty";
  if (firstLine.startsWith("//") || firstLine.startsWith("#")) return "comment";
  if (firstLine.startsWith("group")) return "group";
  if (firstLine.startsWith("node")) return "node";
  if (firstLine.startsWith("edge")) return "edge";
  if (firstLine.startsWith("note")) return "note";
  if (firstLine.startsWith("style")) return "style";
  return "comment";
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

  // ボディのセグメントを再帰的にフォーマット＆並び替え
  const bodySegments = extractFormatterSegments(body);
  const childEntries = bodySegments.map((seg) => ({
    formatted:
      seg.type === "block"
        ? formatBlock(seg.text, indentLevel + 1)
        : seg.text.trim()
          ? `${childIndent}${formatSingleLine(seg.text.trim())}`
          : "",
    category: getSegmentCategory(seg.text),
  }));

  interface ChildGroup {
    leading: string[];
    element: string;
    category: string;
  }
  const childGroups: ChildGroup[] = [];
  let childPending: string[] = [];

  for (const { formatted, category } of childEntries) {
    if (category === "empty" || category === "comment") {
      if (formatted) childPending.push(formatted);
    } else {
      childGroups.push({ leading: childPending, element: formatted, category });
      childPending = [];
    }
  }

  childGroups.sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99),
  );

  const formattedChildren: string[] = [];
  let prevCat: string | null = null;

  for (const g of childGroups) {
    if (prevCat !== null && g.category !== prevCat) {
      if (g.leading.length === 0 || g.leading[0] !== "") {
        formattedChildren.push("");
      }
    }
    formattedChildren.push(...g.leading);
    formattedChildren.push(g.element);
    prevCat = g.category;
  }
  formattedChildren.push(...childPending);

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

  // Format and categorize each segment
  const entries = segments.map((seg) => ({
    formatted:
      seg.type === "block"
        ? formatBlock(seg.text, 0)
        : formatSingleLine(seg.text),
    category: getSegmentCategory(seg.text),
  }));

  // Build logical groups: leading empties/comments + DSL element
  interface LogicalGroup {
    leading: string[];
    element: string;
    category: string;
  }
  const groups: LogicalGroup[] = [];
  let pending: string[] = [];

  for (const { formatted, category } of entries) {
    if (category === "empty" || category === "comment") {
      pending.push(formatted);
    } else {
      groups.push({ leading: pending, element: formatted, category });
      pending = [];
    }
  }

  // Stable sort by category order (group > node > edge > note > style)
  groups.sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99),
  );

  // Build output
  const lines: string[] = [];
  let prevCategory: string | null = null;

  for (const g of groups) {
    if (prevCategory !== null && g.category !== prevCategory) {
      // Add blank line between different categories if not already separated
      if (g.leading.length === 0 || g.leading[0] !== "") {
        lines.push("");
      }
    }
    lines.push(...g.leading);
    lines.push(g.element);
    prevCategory = g.category;
  }

  // Trailing empties/comments
  lines.push(...pending);

  return lines.join("\n");
}
