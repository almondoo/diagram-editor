/** 補完コンテキストの型 */
export type CompletionContext =
  | { type: "keyword"; prefix: string }
  | { type: "nodeId"; prefix: string }
  | { type: "edgeOperator"; prefix: string }
  | { type: "property"; prefix: string; blockType: string }
  | { type: "value"; prefix: string; property: string; blockType: string };

/** 補完候補 */
export interface CompletionItem {
  text: string;
  kind: "keyword" | "property" | "value" | "id" | "operator";
  suffix?: string; // 挿入時に追加する文字（例: " ", "="）
}

const KEYWORDS = ["node", "edge", "group", "note", "style"];

const EDGE_OPERATORS = ["->", "<-", "<->", "-->", "<--", "<-->", "--"];

const PROPERTY_MAP: Record<string, string[]> = {
  node: ["shape", "color", "text", "icon", "opacity", "dashed", "x", "y", "w", "h"],
  edge: ["label", "color", "animate", "thickness", "curve"],
  group: ["color", "x", "y", "w", "h"],
  note: ["color", "x", "y"],
  style: ["color", "shape", "text"],
};

const SHAPES = ["rect", "stadium", "diamond", "ellipse", "circle", "cylinder", "hexagon", "parallelogram", "trapezoid"];

const BOOLEANS = ["true", "false"];
const CURVES = ["smooth", "straight"];

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

const VALUE_MAP: Record<string, string[]> = {
  shape: SHAPES,
  animate: BOOLEANS,
  dashed: BOOLEANS,
  curve: CURVES,
  color: COLOR_PRESETS,
  text: COLOR_PRESETS,
};

const EDGE_OP_RE = /^<-->|^<->|^<--|^-->|^<-|^->|^--/;

/**
 * カーソル行とカーソル位置からコンテキストを判定する。
 * @param line カーソルがある行のテキスト
 * @param col カーソルの行内オフセット（0-indexed）
 * @param blockHeaderLine このブロックのヘッダー行（{ } ブロック内にいる場合）。空文字 = トップレベル
 * @param _allLines 全体の行テキスト配列（ブロック検出用）
 */
export function getCompletionContext(
  line: string,
  col: number,
  blockHeaderLine: string,
  _allLines: string[],
): CompletionContext | null {
  const beforeCursor = line.slice(0, col);
  const trimmedBefore = beforeCursor.trimStart();

  // コメント行 → 補完なし
  if (trimmedBefore.startsWith("//") || trimmedBefore.startsWith("#")) return null;

  // 空入力 → 補完なし
  if (trimmedBefore.length === 0) return null;

  // ブロック内にいるか判定
  const inBlock = blockHeaderLine.length > 0;
  const blockType = inBlock ? (blockHeaderLine.match(/^\s*(node|edge|group|note|style)\b/)?.[1] ?? "") : "";

  // ブロック内: プロパティ or 値 or グループ内のキーワード
  if (inBlock) {
    // グループブロック内で行頭にキーワード入力 → keyword コンテキスト
    if (blockType === "group") {
      const kwMatch = trimmedBefore.match(/^(node|edge|group|note|style)\b/);
      if (!kwMatch) {
        // キーワードの途中の可能性
        const partialKw = trimmedBefore.match(/^([a-z]+)$/);
        if (partialKw && KEYWORDS.some((k) => k.startsWith(partialKw[1]!))) {
          return { type: "keyword", prefix: partialKw[1]! };
        }
      }
    }

    // プロパティ=値 の値部分
    const valueMatch = trimmedBefore.match(/(\w+)=(\S*)$/);
    if (valueMatch) {
      return { type: "value", prefix: valueMatch[2]!, property: valueMatch[1]!, blockType };
    }

    // プロパティ名の途中
    const propMatch = trimmedBefore.match(/(?:^|\s)(\w*)$/);
    if (propMatch) {
      return { type: "property", prefix: propMatch[1]!, blockType };
    }

    return null;
  }

  // トップレベル: edge行の解析
  const edgeLineMatch = trimmedBefore.match(/^edge\s+/);
  if (edgeLineMatch) {
    const afterEdge = trimmedBefore.slice(edgeLineMatch[0].length);

    // "edge " の直後 → nodeId (from)
    if (!afterEdge || /^\S*$/.test(afterEdge)) {
      return { type: "nodeId", prefix: afterEdge };
    }

    // "edge from " の後
    const fromMatch = afterEdge.match(/^(\S+)\s+/);
    if (fromMatch) {
      const afterFrom = afterEdge.slice(fromMatch[0].length);

      // オペレーターの途中
      if (!afterFrom.includes(" ")) {
        // 完全なオペレーター + スペース があるか
        const opMatch = afterFrom.match(EDGE_OP_RE);
        if (opMatch && opMatch[0] === afterFrom) {
          // オペレーターが完了しているがスペースがない
          return { type: "edgeOperator", prefix: afterFrom };
        }
        if (!opMatch || opMatch[0].length < afterFrom.length) {
          return { type: "edgeOperator", prefix: afterFrom };
        }
      }

      // "edge from OP " の後 → nodeId (to)
      const opMatch = afterFrom.match(/^(?:<-->|<->|<--|-->|<-|->|--)\s+/);
      if (opMatch) {
        const afterOp = afterFrom.slice(opMatch[0].length);
        return { type: "nodeId", prefix: afterOp };
      }
    }

    return null;
  }

  // style行の解析
  const styleLineMatch = trimmedBefore.match(/^style\s+/);
  if (styleLineMatch) {
    const afterStyle = trimmedBefore.slice(styleLineMatch[0].length);
    if (/^\S*$/.test(afterStyle)) {
      return { type: "nodeId", prefix: afterStyle };
    }
    return null;
  }

  // 完成済みの行（node id "label" { ... のような）→ 補完なし
  const completedLineMatch = trimmedBefore.match(/^(node|edge|group|note|style)\b.*\{/);
  if (completedLineMatch) return null;

  // トップレベルのキーワード入力
  const partialKw = trimmedBefore.match(/^([a-z]+)$/);
  if (partialKw) {
    return { type: "keyword", prefix: partialKw[1]! };
  }

  return null;
}

/**
 * コンテキストに基づいて補完候補を生成する。
 */
export function getCompletionItems(
  context: CompletionContext,
  existingIds: string[],
): CompletionItem[] {
  const prefix = context.prefix.toLowerCase();

  switch (context.type) {
    case "keyword":
      return KEYWORDS
        .filter((k) => k.startsWith(prefix))
        .map((k) => ({ text: k, kind: "keyword" as const, suffix: " " }));

    case "nodeId":
      return existingIds
        .filter((id) => id.toLowerCase().startsWith(prefix))
        .map((id) => ({ text: id, kind: "id" as const, suffix: " " }));

    case "edgeOperator":
      return EDGE_OPERATORS
        .filter((op) => op.startsWith(context.prefix))
        .map((op) => ({ text: op, kind: "operator" as const, suffix: " " }));

    case "property": {
      const props = PROPERTY_MAP[context.blockType] ?? [];
      return props
        .filter((p) => p.startsWith(prefix))
        .map((p) => ({ text: p, kind: "property" as const, suffix: "=" }));
    }

    case "value": {
      const values = VALUE_MAP[context.property] ?? [];
      return values
        .filter((v) => v.toLowerCase().startsWith(prefix))
        .map((v) => ({ text: v, kind: "value" as const }));
    }
  }
}
