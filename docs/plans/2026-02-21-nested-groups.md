# Nested Groups & Auto-layout Overlap Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** グループのネスト（ブロック構文）と、auto-layoutでグループが重ならないようにするdagre group-level layoutの実装。

**Architecture:**
- `DiagramGroup` に `parentGroup?: string` を追加してネスト構造を表現する
- パーサーをマルチラインブロック対応に拡張し、相対座標→絶対座標変換を行う
- auto-layout でグループ自体を dagre でレイアウトして重なりを解消する
- レンダリング時はグループを深さ順（親→子）にソートして z-order を正しくする

**Tech Stack:** TypeScript, dagre (@dagrejs/dagre), React, Vitest

---

## Task 1: Auto-layout Group Overlap Fix

グループが重なる問題を修正する。`layout.ts` に グループレベルの dagre レイアウトを追加する。

**Files:**
- Modify: `packages/core/src/layout.ts`
- Modify: `packages/core/src/__tests__/layout.test.ts`

**Step 1: 失敗するテストを書く**

`packages/core/src/__tests__/layout.test.ts` の末尾に追加:

```typescript
it("複数グループが重ならないようにauto-layoutする", () => {
  // 同じ位置 (0,0) に2つのグループ → auto-layout後は重ならない
  const g1 = makeGroup("g1", 0, 0, 300, 200);
  const g2 = makeGroup("g2", 0, 0, 300, 200);
  const nodes = [
    makeNode("a", true, "g1"),
    makeNode("b", true, "g2"),
  ];
  const { groupUpdates } = autoLayout(nodes, [], [g1, g2]);
  const rg1 = groupUpdates["g1"] ?? g1;
  const rg2 = groupUpdates["g2"] ?? g2;
  // 水平方向または垂直方向に重なっていないことを確認
  const overlapX = rg1.x + rg1.w + 20 > rg2.x && rg2.x + rg2.w + 20 > rg1.x;
  const overlapY = rg1.y + rg1.h + 20 > rg2.y && rg2.y + rg2.h + 20 > rg1.y;
  expect(overlapX && overlapY).toBe(false);
});

it("グループ間エッジを考慮してdagreがグループを配置する", () => {
  const g1 = makeGroup("g1", 0, 0, 200, 150);
  const g2 = makeGroup("g2", 0, 0, 200, 150);
  const g3 = makeGroup("g3", 0, 0, 200, 150);
  const nodes = [
    makeNode("a", true, "g1"),
    makeNode("b", true, "g2"),
    makeNode("c", true, "g3"),
  ];
  // a->b, b->c のエッジ → dagre は g1→g2→g3 の順に配置
  const edges = [EDGE("a", "b"), EDGE("b", "c")];
  const { groupUpdates } = autoLayout(nodes, edges, [g1, g2, g3]);
  const rg1 = groupUpdates["g1"] ?? g1;
  const rg2 = groupUpdates["g2"] ?? g2;
  const rg3 = groupUpdates["g3"] ?? g3;
  // g1 → g2 → g3 の順に x が増える (LR layout)
  expect(rg1.x).toBeLessThan(rg2.x);
  expect(rg2.x).toBeLessThan(rg3.x);
});
```

**Step 2: テストを実行して失敗を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL (グループが重なっているため)

**Step 3: `layout.ts` に `layoutGroupsDagre` 関数を追加**

`packages/core/src/layout.ts` の `autoLayout` 関数の前に追加:

```typescript
const GROUP_GAP = 60; // グループ間の余白

/** グループ自体を dagre でレイアウトして重なりを解消する */
function layoutGroupsDagre(
  groups: DiagramGroup[],
  groupUpdates: Record<string, DiagramGroup>,
  edges: DiagramEdge[],
  allNodes: DiagramNode[],
): Record<string, DiagramGroup> {
  if (groups.length <= 1) return groupUpdates;

  const effectiveGroups = groups.map((g) => groupUpdates[g.id] ?? g);

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    nodesep: GROUP_GAP,
    ranksep: GROUP_GAP * 1.5,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  // グループを dagre ノードとして追加
  effectiveGroups.forEach((g) => {
    graph.setNode(g.id, { width: g.w, height: g.h });
  });

  // ノードレベルのエッジからグループ間エッジを推定
  const nodeToGroup: Record<string, string> = {};
  allNodes.forEach((n) => {
    if (n.group) nodeToGroup[n.id] = n.group;
  });
  const addedEdges = new Set<string>();
  edges.forEach((e) => {
    const fromGroup = nodeToGroup[e.from];
    const toGroup = nodeToGroup[e.to];
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = `${fromGroup}->${toGroup}`;
      if (!addedEdges.has(key)) {
        graph.setEdge(fromGroup, toGroup);
        addedEdges.add(key);
      }
    }
  });

  dagre.layout(graph);

  const result: Record<string, DiagramGroup> = { ...groupUpdates };
  effectiveGroups.forEach((g) => {
    const pos = graph.node(g.id);
    result[g.id] = { ...g, x: pos.x - g.w / 2, y: pos.y - g.h / 2 };
  });
  return result;
}
```

**Step 4: `autoLayout` 関数を修正して `layoutGroupsDagre` を呼び出す**

`packages/core/src/layout.ts` の `autoLayout` 関数内、`groupUpdates` を計算した後に追加:

現在のコード（変更前）:
```typescript
  // フリーノードを dagre でレイアウト（全グループの下から開始）
  const freeToLayout = freeNodes.filter((n) => n._needsPosition);
```

変更後（その前に挿入）:
```typescript
  // グループ自体を dagre でレイアウト（重なり解消）
  const repositionedGroups = layoutGroupsDagre(groups, groupUpdates, edges, nodes);
  // グループ位置の変化をノードに適用
  for (const [groupId, newG] of Object.entries(repositionedGroups)) {
    const oldG = groupUpdates[groupId] ?? groupById[groupId];
    if (!oldG) continue;
    const dx = newG.x - oldG.x;
    const dy = newG.y - oldG.y;
    if (dx !== 0 || dy !== 0) {
      nodes.forEach((n) => {
        if (n.group === groupId) {
          n.x += dx;
          n.y += dy;
        }
      });
    }
    groupUpdates[groupId] = newG;
  }

  // フリーノードを dagre でレイアウト（全グループの下から開始）
  const freeToLayout = freeNodes.filter((n) => n._needsPosition);
```

**Step 5: テストを実行して合格を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: PASS

**Step 6: typecheck を実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 7: コミット**

```bash
git add packages/core/src/layout.ts packages/core/src/__tests__/layout.test.ts
git commit -m "fix: reposition groups with dagre to prevent overlap in auto-layout"
```

---

## Task 2: DiagramGroup 型に parentGroup を追加

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/__tests__/layout.test.ts` (makeGroup helper)

**Step 1: `types.ts` を修正**

`packages/core/src/types.ts` の `DiagramGroup` インターフェースに `parentGroup?: string` を追加:

```typescript
export interface DiagramGroup {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parentGroup?: string;
}
```

**Step 2: typecheck を実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし（`parentGroup` はオプショナルなので既存コードに影響なし）

**Step 3: コミット**

```bash
git add packages/core/src/types.ts
git commit -m "feat: add parentGroup field to DiagramGroup type"
```

---

## Task 3: パーサーをマルチラインブロック対応に拡張

**Files:**
- Modify: `packages/core/src/parser.ts`
- Modify: `packages/core/src/__tests__/parser.test.ts`

**Step 1: 失敗するテストを書く**

`packages/core/src/__tests__/parser.test.ts` の末尾に追加:

```typescript
describe("nested group block syntax", () => {
  it("ネストグループ（ブロック構文）を解析する", () => {
    const code = `group outer "外側" { color=#6366f1
  group inner "内側" { color=#f59e0b x=20 y=40 w=150 h=120 }
  node n1 "ノード" { shape=rect x=50 y=80 }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(2);
    // outer グループ
    expect(result.groups[0]).toMatchObject({ id: "outer", parentGroup: undefined });
    // inner グループ: outer の位置 (0,0) + 相対座標 (20,40) = (20,40)
    expect(result.groups[1]).toMatchObject({ id: "inner", parentGroup: "outer", x: 20, y: 40 });
    // n1: outer の位置 (0,0) + 相対座標 (50,80) = (50,80), group="outer"
    expect(result.nodes[0]).toMatchObject({ id: "n1", group: "outer", x: 50, y: 80 });
  });

  it("3階層ネストグループを解析する", () => {
    const code = `group lv1 "L1" { x=10 y=10
  group lv2 "L2" { x=20 y=20
    group lv3 "L3" { x=10 y=10 w=100 h=80 }
    node n1 "N1" { x=10 y=20 }
  }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]).toMatchObject({ id: "lv1", x: 10, y: 10, parentGroup: undefined });
    expect(result.groups[1]).toMatchObject({ id: "lv2", x: 30, y: 30, parentGroup: "lv1" });
    // lv3: lv1(10,10) + lv2(20,20) + lv3(10,10) = (40,40)
    expect(result.groups[2]).toMatchObject({ id: "lv3", x: 40, y: 40, parentGroup: "lv2" });
    // n1: lv1(10,10) + lv2(20,20) + n1(10,20) = (40,50)
    expect(result.nodes[0]).toMatchObject({ id: "n1", group: "lv2", x: 40, y: 50 });
  });

  it("既存のフラット構文が引き続き動作する", () => {
    const code = `group g1 "グループ" { color=#6366f1 x=0 y=0 w=300 h=200 }
node n1 "ノード" { shape=rect group=g1 x=50 y=60 }`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ id: "g1", x: 0, y: 0 });
    expect(result.nodes[0]).toMatchObject({ id: "n1", group: "g1", x: 50, y: 60 });
  });

  it("ブロック内の edge は通常通り解析される", () => {
    const code = `group g1 "G1" {
  node a "A" { x=20 y=20 }
  node b "B" { x=20 y=100 }
  edge a -> b { label="接続" }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", label: "接続" });
  });
});
```

**Step 2: テストを実行して失敗を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL

**Step 3: `parser.ts` をマルチラインブロック対応に書き直す**

`packages/core/src/parser.ts` を以下に置き換える:

```typescript
import type { ParseResult, DiagramNode, DiagramGroup } from "./types.js";
import { randomColor } from "./colors.js";

export function parseProps(str: string): Record<string, string> {
  const props: Record<string, string> = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    props[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return props;
}

/**
 * コードをセグメントに分割する。
 * セグメントは単一行 or マルチラインブロック（{...} が複数行にまたがる場合）。
 */
function extractSegments(code: string): Array<{ text: string; startLine: number }> {
  const segments: Array<{ text: string; startLine: number }> = [];
  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
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
        const bLine = lines[i].trim();
        const bo = (bLine.match(/\{/g) ?? []).length;
        const bc = (bLine.match(/\}/g) ?? []).length;
        depth += bo - bc;
        blockLines.push(bLine);
        i++;
      }
      segments.push({ text: blockLines.join("\n"), startLine });
    } else {
      segments.push({ text: line, startLine: i + 1 });
      i++;
    }
  }

  return segments;
}

/** ブロックのボディ（外側の {} を除いた内側のテキスト）を抽出する */
function extractBlockBody(blockText: string): string {
  const firstOpen = blockText.indexOf("{");
  const lastClose = blockText.lastIndexOf("}");
  if (firstOpen === -1 || lastClose === -1) return "";
  return blockText.slice(firstOpen + 1, lastClose).trim();
}

export function parseDSL(code: string): ParseResult {
  const nodes: DiagramNode[] = [];
  const edges: ParseResult["edges"] = [];
  const groups: ParseResult["groups"] = [];
  const notes: ParseResult["notes"] = [];
  const errors: ParseResult["errors"] = [];
  const nodeMap: Record<string, DiagramNode> = {};

  const segments = extractSegments(code);

  for (const seg of segments) {
    parseSegment(seg.text, seg.startLine, null, 0, 0, nodes, edges, groups, notes, errors, nodeMap);
  }

  return { nodes, edges, groups, notes, errors };
}

function parseSegment(
  text: string,
  startLine: number,
  parentGroupId: string | null,
  offsetX: number,
  offsetY: number,
  nodes: DiagramNode[],
  edges: ParseResult["edges"],
  groups: DiagramGroup[],
  notes: ParseResult["notes"],
  errors: ParseResult["errors"],
  nodeMap: Record<string, DiagramNode>,
): void {
  const firstLine = text.split("\n")[0].trim();
  if (!firstLine || firstLine.startsWith("//") || firstLine.startsWith("#")) return;

  try {
    // Group: group id "label" { ... }
    const groupHeaderMatch = firstLine.match(/^group\s+(\S+)\s+"([^"]*)"(?:\s*\{(.*))?/);
    if (groupHeaderMatch) {
      const isMultiLine = text.includes("\n");

      if (isMultiLine) {
        // ブロック構文: ヘッダー行のプロパティを取得
        // ヘッダー行の { から行末まで（閉じ } なし）がプロパティ文字列
        const headerPropsStr = groupHeaderMatch[3] ?? "";
        const props = parseProps(headerPropsStr);

        const relX = parseFloat(props.x) || 0;
        const relY = parseFloat(props.y) || 0;
        const absX = offsetX + relX;
        const absY = offsetY + relY;

        const group: DiagramGroup = {
          id: groupHeaderMatch[1],
          label: groupHeaderMatch[2],
          color: props.color || randomColor(),
          x: absX,
          y: absY,
          w: parseFloat(props.w) || 300,
          h: parseFloat(props.h) || 200,
          ...(parentGroupId != null ? { parentGroup: parentGroupId } : {}),
        };
        groups.push(group);

        // ブロックボディを再帰的に解析
        const body = extractBlockBody(text);
        const bodySegments = extractSegments(body);
        for (const bodySeg of bodySegments) {
          parseSegment(
            bodySeg.text,
            startLine + bodySeg.startLine,
            group.id,
            absX,
            absY,
            nodes,
            edges,
            groups,
            notes,
            errors,
            nodeMap,
          );
        }
      } else {
        // フラット構文: 従来通り
        const props = parseProps(groupHeaderMatch[3] || "");
        const group: DiagramGroup = {
          id: groupHeaderMatch[1],
          label: groupHeaderMatch[2],
          color: props.color || randomColor(),
          x: parseFloat(props.x) || 0,
          y: parseFloat(props.y) || 0,
          w: parseFloat(props.w) || 300,
          h: parseFloat(props.h) || 200,
          ...(parentGroupId != null ? { parentGroup: parentGroupId } : {}),
        };
        groups.push(group);
      }
      return;
    }

    // Note: note n1 "text" { x=100 y=100 }
    const noteMatch = firstLine.match(/^note\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
    if (noteMatch) {
      const props = parseProps(noteMatch[3] || "");
      notes.push({
        id: noteMatch[1],
        text: noteMatch[2],
        x: offsetX + (parseFloat(props.x) || 50),
        y: offsetY + (parseFloat(props.y) || 50),
        color: props.color || "#fbbf24",
      });
      return;
    }

    // Node: node id "Label" { shape=rect ... }
    const nodeMatch = firstLine.match(/^node\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
    if (nodeMatch) {
      const props = parseProps(nodeMatch[3] || "");
      const id = nodeMatch[1];
      const hasX = props.x !== undefined;
      const hasY = props.y !== undefined;

      // group=xxx が明示されていればそちらを優先、なければ親グループ
      const groupId = props.group || parentGroupId || "";

      const node: DiagramNode = {
        id,
        label: nodeMatch[2],
        shape: props.shape || "rect",
        color: props.color || "__RANDOM__",
        textColor: props.text || "#ffffff",
        x: hasX ? offsetX + parseFloat(props.x) : NaN,
        y: hasY ? offsetY + parseFloat(props.y) : NaN,
        w: parseFloat(props.w) || 150,
        h: parseFloat(props.h) || 60,
        icon: props.icon || "",
        group: groupId,
        fontSize: parseFloat(props.fontSize) || 13,
        borderColor: props.border || "",
        borderWidth: parseFloat(props.borderWidth) || 2,
        opacity: parseFloat(props.opacity) || 1,
        dashed: props.dashed === "true",
        _needsPosition: !hasX || !hasY,
        _explicitProps: new Set(["id", "label", ...Object.keys(props)]),
      };
      nodes.push(node);
      nodeMap[id] = node;
      return;
    }

    // Edge: edge from -> to { ... }
    const edgeMatch = firstLine.match(/^edge\s+(\S+)\s*->\s*(\S+)(?:\s*\{([^}]*)\})?/);
    if (edgeMatch) {
      const props = parseProps(edgeMatch[3] || "");
      edges.push({
        from: edgeMatch[1],
        to: edgeMatch[2],
        label: props.label || "",
        color: props.color || "#94a3b8",
        style: props.style || "solid",
        animate: props.animate === "true",
        thickness: parseFloat(props.thickness) || 1.5,
        arrow: props.arrow || "end",
        curve: props.curve || "smooth",
      });
      return;
    }

    // Style shorthand: style id { props }
    const styleMatch = firstLine.match(/^style\s+(\S+)\s*\{([^}]*)\}/);
    if (styleMatch) {
      const id = styleMatch[1];
      const props = parseProps(styleMatch[2]);
      if (nodeMap[id]) {
        Object.assign(nodeMap[id], {
          ...(props.color && { color: props.color }),
          ...(props.shape && { shape: props.shape }),
          ...(props.border && { borderColor: props.border }),
          ...(props.text && { textColor: props.text }),
        });
      }
      return;
    }

    if (firstLine.length > 0) {
      errors.push({ line: startLine, message: `構文エラー: "${firstLine}"` });
    }
  } catch (e) {
    errors.push({ line: startLine, message: (e as Error).message });
  }
}
```

**Step 4: テストを実行して合格を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: 全テスト PASS

**Step 5: typecheck を実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 6: コミット**

```bash
git add packages/core/src/parser.ts packages/core/src/__tests__/parser.test.ts
git commit -m "feat: support nested group block syntax in DSL parser"
```

---

## Task 4: フォーマッターをブロック構文対応に更新

**Files:**
- Modify: `packages/core/src/formatter.ts`
- Modify: `packages/core/src/__tests__/formatter.test.ts`

**Step 1: 既存のフォーマッタテストを確認して理解する**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test -- --reporter=verbose
```

**Step 2: 失敗するテストを書く**

`packages/core/src/__tests__/formatter.test.ts` を読んで、末尾に追加:

```typescript
it("ネストグループブロック構文をフォーマットする", () => {
  const code = `group outer "外側" {color=#6366f1
  group inner  "内側"  {color=#f59e0b  x=20  y=40}
  node n1 "ノード"  {shape=rect  x=50  y=80}
}`;
  const result = formatDSLCode(code);
  // ブロック構造が保たれる
  expect(result).toContain('group outer "外側" {');
  expect(result).toContain('group inner "内側" { color=#f59e0b }');
  expect(result).toContain('node n1 "ノード" { shape=rect }');
  // ブロックが正しく閉じられる
  expect(result).toContain("}");
});
```

**Step 3: テストを実行して失敗を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL（フォーマッターがマルチラインブロックを処理できない）

**Step 4: `formatter.ts` をブロック構文対応に更新**

`packages/core/src/formatter.ts` を以下に置き換える:

```typescript
export function formatPropsString(str: string): string {
  if (!str.trim()) return "";
  const props: Record<string, string> = {};
  const LAYOUT_PROPS = new Set(["x", "y", "w", "h"]);
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  const order = [
    "shape", "color", "text", "border", "borderWidth",
    "icon", "group", "fontSize", "opacity", "dashed",
    "label", "style", "animate", "thickness", "arrow", "curve",
  ];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    if (!LAYOUT_PROPS.has(m[1])) {
      props[m[1]] = m[2] !== undefined ? `"${m[2]}"` : m[3];
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

export function formatDSLCode(code: string): string {
  // マルチラインブロックをセグメントに分割して処理
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

interface FormatterSegment {
  type: "line" | "block";
  text: string;
}

function extractFormatterSegments(code: string): FormatterSegment[] {
  const segments: FormatterSegment[] = [];
  const lines = code.split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
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
        const bLine = lines[i].trim();
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

  // ヘッダー行を取得（最初の行）
  const firstLine = blockText.split("\n")[0].trim();
  const openIdx = firstLine.indexOf("{");
  const headerBase = openIdx >= 0 ? firstLine.slice(0, openIdx).trim() : firstLine;
  const headerPropsStr = openIdx >= 0 ? firstLine.slice(openIdx + 1) : "";
  const headerProps = formatPropsString(headerPropsStr);

  // ボディ（最初の { から最後の } の内側）を取得
  const firstOpen = blockText.indexOf("{");
  const lastClose = blockText.lastIndexOf("}");
  const body = firstOpen >= 0 && lastClose > firstOpen
    ? blockText.slice(firstOpen + 1, lastClose).trim()
    : "";

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

function formatSingleLine(line: string): string {
  if (!line || line.startsWith("//") || line.startsWith("#")) return line;

  const nodeMatch = line.match(/^(node\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
  if (nodeMatch) {
    const props = formatPropsString(nodeMatch[2] || "");
    return props ? `${nodeMatch[1]} { ${props} }` : nodeMatch[1];
  }

  const edgeMatch = line.match(/^(edge\s+\S+\s*->\s*\S+)(?:\s*\{([^}]*)\})?/);
  if (edgeMatch) {
    const props = formatPropsString(edgeMatch[2] || "");
    return props ? `${edgeMatch[1]} { ${props} }` : edgeMatch[1];
  }

  const groupMatch = line.match(/^(group\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
  if (groupMatch) {
    const props = formatPropsString(groupMatch[2] || "");
    return props ? `${groupMatch[1]} { ${props} }` : groupMatch[1];
  }

  const noteMatch = line.match(/^(note\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
  if (noteMatch) {
    const props = formatPropsString(noteMatch[2] || "");
    return props ? `${noteMatch[1]} { ${props} }` : noteMatch[1];
  }

  const styleMatch = line.match(/^(style\s+\S+)\s*\{([^}]*)\}/);
  if (styleMatch) {
    const props = formatPropsString(styleMatch[2] || "");
    return props ? `${styleMatch[1]} { ${props} }` : `${styleMatch[1]} {}`;
  }

  return line;
}
```

**Step 5: テストを実行して合格を確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: 全テスト PASS

**Step 6: typecheck を実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 7: コミット**

```bash
git add packages/core/src/formatter.ts packages/core/src/__tests__/formatter.test.ts
git commit -m "feat: support nested group block syntax in formatter"
```

---

## Task 5: レンダリングの z-order と setGroupLayout のネスト対応

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`
- Modify: `packages/react/src/hooks/useDiagramState.ts`

**Step 1: DiagramEditor.tsx でグループを深さ順にソートしてレンダリング**

`packages/react/src/DiagramEditor.tsx` の SVG レンダリング部分を修正する。

現在のコード:
```tsx
{parsed.groups.map((g) => (
  <GroupBox
    key={g.id}
    group={g}
    onMoveMouseDown={(e) => handleGroupMoveMouseDown(e, g.id)}
    onResizeMouseDown={(e, handle) => handleGroupResizeMouseDown(e, g.id, handle)}
  />
))}
```

修正後（グループを深さ順でソート）:

SVG の `<g transform=...>` の中の `{parsed.groups.map...}` の前に、ソートロジックを追加する。
`parsed.groups.map(...)` を以下に変更:

```tsx
{[...parsed.groups]
  .sort((a, b) => {
    // 深さを計算: parentGroup がある方が後（子を手前に描画）
    const depthA = getGroupDepth(a.id, parsed.groups);
    const depthB = getGroupDepth(b.id, parsed.groups);
    return depthA - depthB;
  })
  .map((g) => (
    <GroupBox
      key={g.id}
      group={g}
      onMoveMouseDown={(e) => handleGroupMoveMouseDown(e, g.id)}
      onResizeMouseDown={(e, handle) => handleGroupResizeMouseDown(e, g.id, handle)}
    />
  ))}
```

`DiagramEditor` コンポーネントの外（ファイルトップレベル）に `getGroupDepth` ヘルパーを追加:

```tsx
function getGroupDepth(groupId: string, groups: import("diagram-dsl-core").DiagramGroup[]): number {
  const group = groups.find((g) => g.id === groupId);
  if (!group?.parentGroup) return 0;
  return 1 + getGroupDepth(group.parentGroup, groups);
}
```

**Step 2: useDiagramState.ts の setGroupLayout をネストグループ対応に更新**

`packages/react/src/hooks/useDiagramState.ts` の `setGroupLayout` を修正する。

現在:
```typescript
const setGroupLayout = useCallback((groupId: string, dx: number, dy: number) => {
  setGroupStates((prev) => {
    const g = prev[groupId];
    if (!g) return prev;
    return { ...prev, [groupId]: { ...g, x: g.x + dx, y: g.y + dy } };
  });
  setNodeStates((prev) => {
    let changed = false;
    const updates: Record<string, DiagramNode> = {};
    for (const [id, node] of Object.entries(prev)) {
      if (node.group === groupId) {
        updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
        changed = true;
      }
    }
    return changed ? { ...prev, ...updates } : prev;
  });
}, []);
```

修正後（子グループも含めて再帰的に移動）:

```typescript
const setGroupLayout = useCallback((groupId: string, dx: number, dy: number) => {
  // 再帰的に全子孫グループIDを収集する（groupStatesRef を使用）
  const collectDescendants = (id: string): string[] => {
    const children = Object.values(groupStatesRef.current).filter(
      (g) => g.parentGroup === id,
    );
    return [id, ...children.flatMap((c) => collectDescendants(c.id))];
  };

  const groupsToMove = collectDescendants(groupId);

  setGroupStates((prev) => {
    const updates: Record<string, DiagramGroup> = {};
    for (const gid of groupsToMove) {
      const g = prev[gid];
      if (g) updates[gid] = { ...g, x: g.x + dx, y: g.y + dy };
    }
    return { ...prev, ...updates };
  });
  setNodeStates((prev) => {
    let changed = false;
    const updates: Record<string, DiagramNode> = {};
    for (const [id, node] of Object.entries(prev)) {
      if (groupsToMove.includes(node.group)) {
        updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
        changed = true;
      }
    }
    return changed ? { ...prev, ...updates } : prev;
  });
}, []);
```

**Step 3: typecheck を実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 4: lint を実行**

```bash
docker compose exec app pnpm -r lint
```

Expected: エラーなし

**Step 5: コミット**

```bash
git add packages/react/src/DiagramEditor.tsx packages/react/src/hooks/useDiagramState.ts
git commit -m "feat: render nested groups in z-order and move child groups with parent"
```

---

## Task 6: packages をビルドして動作確認

**Step 1: packages をビルド**

```bash
docker compose exec app pnpm -r build
```

Expected: エラーなし

**Step 2: 全テストを実行**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: 全テスト PASS

**Step 3: ブラウザで動作確認**

http://localhost:5173 を開いて:
1. **auto-layout overlap 修正の確認**: 「アーキテクチャ」テンプレートを開き、「自動配置」ボタンをクリック → グループが重ならずきれいに並ぶことを確認
2. **マイ作品の確認**: マイ作品から保存済みダイアグラムを開き、自動配置 → グループが重ならないことを確認
3. **ネストグループの確認**: エディタに以下を入力して確認:

```
group outer "外側グループ" { color=#6366f1
  group inner "内側グループ" { color=#f59e0b x=20 y=60 w=200 h=150
    node n1 "ノード1" { shape=rect x=20 y=30 }
    node n2 "ノード2" { shape=circle x=20 y=100 }
  }
  node n3 "外側のノード" { shape=rect x=250 y=80 }
}
edge n1 -> n3 { label="接続" }
```

確認ポイント:
- 内側グループが外側グループの中に描画される
- n1, n2 が内側グループ内に描画される
- n3 が外側グループ内（内側グループの外）に描画される
- ドラッグして外側グループを移動すると内側グループと全ノードも一緒に動く

**Step 4: 最終コミット（問題なければ）**

```bash
git add -A
git commit -m "feat: complete nested groups and auto-layout overlap fix"
```
