import type { ParseResult, DiagramNode, DiagramGroup } from "./types.js";
import { colorForId } from "./colors.js";

const EDGE_OP_MAP: Record<string, { arrow: string; style: string }> = {
  "<-->": { arrow: "both",  style: "dashed" },
  "<->":  { arrow: "both",  style: "solid" },
  "<--":  { arrow: "start", style: "dashed" },
  "-->":  { arrow: "end",   style: "dashed" },
  "<-":   { arrow: "start", style: "solid" },
  "->":   { arrow: "end",   style: "solid" },
  "--":   { arrow: "none",  style: "solid" },
};

export function parseProps(str: string): Record<string, string> {
  const props: Record<string, string> = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    props[m[1]!] = m[2] !== undefined ? m[2] : m[3]!;
  }
  return props;
}

interface ParseContext {
  nodes: DiagramNode[];
  edges: ParseResult["edges"];
  groups: DiagramGroup[];
  notes: ParseResult["notes"];
  errors: ParseResult["errors"];
  nodeMap: Record<string, DiagramNode>;
  noteIdSet: Set<string>;
}

/**
 * コードをセグメントに分割する。
 * セグメントは単一行 or マルチラインブロック（{...} が複数行にまたがる場合）。
 */
function extractSegments(
  code: string,
  errors?: ParseResult["errors"],
): Array<{ text: string; startLine: number }> {
  const segments: Array<{ text: string; startLine: number }> = [];
  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      i++;
      continue;
    }

    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;

    if (opens > closes) {
      // マルチラインブロックの開始
      const startLine = i + 1;
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

/**
 * マルチラインブロックのボディを抽出する。
 * ヘッダー行（line 0）と末尾の閉じ括弧行を除いた内側のテキストを返す。
 */
function extractMultilineBlockBody(blockText: string): string {
  const lines = blockText.split("\n");
  // ヘッダー行（lines[0]）をスキップ、末尾の "}" のみの行もスキップ
  const bodyLines = lines.slice(1);
  // 末尾が "}" だけの行なら除去
  if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1]!.trim() === "}") {
    bodyLines.pop();
  }
  return bodyLines.join("\n");
}

export function parseDSL(code: string): ParseResult {
  const nodes: DiagramNode[] = [];
  const edges: ParseResult["edges"] = [];
  const groups: ParseResult["groups"] = [];
  const notes: ParseResult["notes"] = [];
  const errors: ParseResult["errors"] = [];
  const nodeMap: Record<string, DiagramNode> = {};

  const segments = extractSegments(code, errors);

  const ctx: ParseContext = { nodes, edges, groups, notes, errors, nodeMap, noteIdSet: new Set() };

  for (const seg of segments) {
    parseSegment(seg.text, seg.startLine, null, 0, 0, ctx);
  }

  return { nodes, edges, groups, notes, errors };
}

function parseSegment(
  text: string,
  startLine: number,
  parentGroupId: string | null,
  offsetX: number,
  offsetY: number,
  ctx: ParseContext,
): void {
  const firstLine = text.split("\n")[0]!.trim();
  if (!firstLine || firstLine.startsWith("//") || firstLine.startsWith("#")) return;

  try {
    // Group: group id "label" { ... }
    const groupHeaderMatch = firstLine.match(/^group\s+(\S+)\s+"([^"]*)"(?:\s*\{(.*))?/);
    if (groupHeaderMatch) {
      const props = parseProps(groupHeaderMatch[3] ?? "");
      const absX = offsetX + (parseFloat(props.x!) || 0);
      const absY = offsetY + (parseFloat(props.y!) || 0);

      const group: DiagramGroup = {
        id: groupHeaderMatch[1]!,
        label: groupHeaderMatch[2]!,
        color: props.color || colorForId(groupHeaderMatch[1]!),
        x: absX,
        y: absY,
        w: parseFloat(props.w!) || 300,
        h: parseFloat(props.h!) || 200,
        parentGroup: parentGroupId ?? undefined,
      };
      ctx.groups.push(group);

      // ブロック構文: ボディを再帰的に解析
      if (text.includes("\n")) {
        const body = extractMultilineBlockBody(text);
        const bodySegments = extractSegments(body, ctx.errors);
        for (const bodySeg of bodySegments) {
          parseSegment(
            bodySeg.text,
            startLine + bodySeg.startLine,
            group.id,
            absX,
            absY,
            ctx,
          );
        }
      }
      return;
    }

    // Note: note n1 "text" { x=100 y=100 }
    const noteMatch = firstLine.match(/^note\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
    if (noteMatch) {
      const noteId = noteMatch[1]!;
      if (ctx.noteIdSet.has(noteId)) {
        ctx.errors.push({ line: startLine, message: `重複IDエラー: ノート "${noteId}" が既に存在します` });
        return;
      }
      ctx.noteIdSet.add(noteId);
      const props = parseProps(noteMatch[3] || "");
      const hasX = props.x !== undefined;
      const hasY = props.y !== undefined;
      ctx.notes.push({
        id: noteId,
        text: noteMatch[2]!,
        x: hasX ? offsetX + parseFloat(props.x!) : NaN,
        y: hasY ? offsetY + parseFloat(props.y!) : NaN,
        color: props.color || "#fbbf24",
        _needsPosition: !hasX || !hasY,
      });
      return;
    }

    // Node: node id "Label" { shape=rect ... }
    const nodeMatch = firstLine.match(/^node\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
    if (nodeMatch) {
      const props = parseProps(nodeMatch[3] || "");
      const id = nodeMatch[1]!;
      if (ctx.nodeMap[id]) {
        ctx.errors.push({ line: startLine, message: `重複IDエラー: ノード "${id}" が既に存在します` });
        return;
      }
      const hasX = props.x !== undefined;
      const hasY = props.y !== undefined;

      // 親グループ（ブロック構文）からグループを決定
      const groupId = parentGroupId || "";

      const node: DiagramNode = {
        id,
        label: nodeMatch[2]!,
        shape: props.shape || "rect",
        color: props.color || "__RANDOM__",
        textColor: props.text || "#ffffff",
        x: hasX ? offsetX + parseFloat(props.x!) : NaN,
        y: hasY ? offsetY + parseFloat(props.y!) : NaN,
        w: parseFloat(props.w!) || (props.icon ? 80 : 150),
        h: parseFloat(props.h!) || (props.icon ? 68 : 60),
        icon: props.icon || "",
        group: groupId,
        opacity: parseFloat(props.opacity!) || 1,
        dashed: props.dashed === "true",
        _needsPosition: !hasX || !hasY,
        _explicitProps: new Set(["id", "label", ...Object.keys(props)]),
      };
      ctx.nodes.push(node);
      ctx.nodeMap[id] = node;
      return;
    }

    // Edge: edge from OP to { ... }
    // 演算子: <--> <-> <-- --> <- -> --
    const edgeMatch = firstLine.match(/^edge\s+(\S+)\s*(<-->|<->|<--|-->|<-|->|--)\s*(\S+)(?:\s*\{([^}]*)\})?/);
    if (edgeMatch) {
      const op = EDGE_OP_MAP[edgeMatch[2]!]!;
      const props = parseProps(edgeMatch[4] || "");
      ctx.edges.push({
        from: edgeMatch[1]!,
        to: edgeMatch[3]!,
        label: props.label || "",
        color: props.color || "#94a3b8",
        style: op.style,
        animate: props.animate === "true",
        thickness: parseFloat(props.thickness!) || 1.5,
        arrow: op.arrow,
        curve: props.curve || "smooth",
        bendX: parseFloat(props.bendX!) || 0,
        bendY: parseFloat(props.bendY!) || 0,
      });
      return;
    }

    // Style shorthand: style id { props }
    const styleMatch = firstLine.match(/^style\s+(\S+)\s*\{([^}]*)\}/);
    if (styleMatch) {
      const id = styleMatch[1]!;
      const props = parseProps(styleMatch[2]!);
      if (ctx.nodeMap[id]) {
        Object.assign(ctx.nodeMap[id]!, {
          ...(props.color && { color: props.color }),
          ...(props.shape && { shape: props.shape }),
          ...(props.text && { textColor: props.text }),
        });
      }
      return;
    }

    if (firstLine.length > 0) {
      ctx.errors.push({ line: startLine, message: `構文エラー: "${firstLine}"` });
    }
  } catch (e) {
    ctx.errors.push({ line: startLine, message: (e as Error).message });
  }
}
