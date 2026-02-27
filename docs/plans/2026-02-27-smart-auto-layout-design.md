# Smart Auto Layout 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 力学モデル（フォース配置）をデフォルトの自動レイアウトとして追加し、TB/LR の dagre 階層レイアウトも選択可能にする。ツールバーからインタラクティブに再配置でき、アニメーション付きでノードが移動する。

**Architecture:** `packages/core/src/layout.ts` に Fruchterman-Reingold フォースレイアウトを追加。既存の dagre レイアウトは TB/LR モード用に `direction` パラメータ対応。`useDiagramState` で `layoutDirection` と `isAnimating` を管理し、FLIP テクニックで SVG ノードをアニメーション。

**Tech Stack:** TypeScript, React, SVG, dagre（既存）, Fruchterman-Reingold（自前実装）

---

### Task 1: `LayoutDirection` 型を追加

**Files:**
- Modify: `packages/core/src/types.ts`（末尾に追加）
- Modify: `packages/core/src/index.ts`（エクスポート追加）

**Step 1: types.ts に型追加**

`packages/core/src/types.ts` の末尾に追加:

```typescript
export type LayoutDirection = "auto" | "TB" | "LR";
```

**Step 2: index.ts にエクスポート追加**

`packages/core/src/index.ts` の types エクスポートに `LayoutDirection` を追加:

```typescript
export type {
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  DiagramNote,
  ParseError,
  ParseResult,
  SyntaxToken,
  ViewBox,
  LayoutDirection,
} from "./types.js";
```

**Step 3: 型チェック**

Run: `docker compose exec app pnpm --filter diagram-dsl-core build`
Expected: ビルド成功

**Step 4: コミット**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat: add LayoutDirection type"
```

---

### Task 2: フォースレイアウト関数を実装

**Files:**
- Modify: `packages/core/src/layout.ts`

**Step 1: テストを書く**

`packages/core/src/__tests__/layout.test.ts` に追加:

```typescript
describe("forceLayout (direction=auto)", () => {
  it("接続されたノードが近くに配置される", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b")];
    const { nodes: result } = autoLayout(nodes, edges, [], "auto");
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    // a-b はエッジで接続 → c より近い
    const distAB = Math.hypot(byId.a!.x - byId.b!.x, byId.a!.y - byId.b!.y);
    const distAC = Math.hypot(byId.a!.x - byId.c!.x, byId.a!.y - byId.c!.y);
    expect(distAB).toBeLessThan(distAC);
  });

  it("ノードが重ならない", () => {
    const nodes = Array.from({ length: 6 }, (_, i) => makeNode(`n${i}`));
    const edges = [EDGE("n0", "n1"), EDGE("n1", "n2"), EDGE("n2", "n3")];
    const { nodes: result } = autoLayout(nodes, edges, [], "auto");
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]!;
        const b = result[j]!;
        const overlap =
          a.x < b.x + b.w && a.x + a.w > b.x &&
          a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it("グループ内ノードが近くに集まる", () => {
    const group = makeGroup("g1", 0, 0, 400, 300);
    const nodes = [
      makeNode("a", true, "g1"),
      makeNode("b", true, "g1"),
      makeNode("c", true, ""),
    ];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group], "auto");
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    // g1 内の a, b が c より近い
    const distAB = Math.hypot(byId.a!.x - byId.b!.x, byId.a!.y - byId.b!.y);
    const distAC = Math.hypot(byId.a!.x - byId.c!.x, byId.a!.y - byId.c!.y);
    expect(distAB).toBeLessThan(distAC);
  });

  it("位置確定済みノードはスキップされる", () => {
    const nodes = [makeNode("a", false), makeNode("b", true)];
    const { nodes: result } = autoLayout(nodes, [], [], "auto");
    expect(result[0]!.x).toBe(100);
    expect(result[0]!.y).toBe(100);
  });
});

describe("direction=TB", () => {
  it("a→b→c が上から下に配置される", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges, [], "TB");
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    expect(byId.a!.y).toBeLessThan(byId.b!.y);
    expect(byId.b!.y).toBeLessThan(byId.c!.y);
  });
});

describe("direction=LR", () => {
  it("a→b→c が左から右に配置される (既存と同じ)", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges, [], "LR");
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    expect(byId.a!.x).toBeLessThan(byId.b!.x);
    expect(byId.b!.x).toBeLessThan(byId.c!.x);
  });
});
```

**Step 2: テストが失敗することを確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: 新テストが FAIL（autoLayout が第4引数を受け付けない）

**Step 3: autoLayout に direction パラメータを追加**

`packages/core/src/layout.ts` を修正:

1. `LayoutDirection` を import:
```typescript
import type { DiagramNode, DiagramEdge, DiagramGroup, LayoutDirection } from "./types.js";
```

2. `autoLayout` のシグネチャを変更:
```typescript
export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
  direction: LayoutDirection = "auto",
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> }
```

3. 既存の dagre 呼び出し箇所の `rankdir: "LR"` を `rankdir: direction === "TB" ? "TB" : "LR"` に変更（`layoutGroupNodesDagre`, `layoutFreeNodesDagre`, `layoutGroupsDagre` 内の3箇所）。これらの関数に `rankdir` パラメータを追加する。

4. `direction === "auto"` の場合にフォースレイアウトを呼ぶ分岐を追加:

```typescript
if (direction === "auto") {
  return forceLayout(nodes, edges, groups);
}
// 以降は既存の dagre ベースレイアウト（direction = "TB" | "LR"）
```

**Step 4: フォースレイアウト関数を実装**

`packages/core/src/layout.ts` に `forceLayout` 関数を追加:

```typescript
/** Fruchterman-Reingold フォースレイアウト */
function forceLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[],
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  const groupById: Record<string, DiagramGroup> = {};
  groups.forEach((g) => (groupById[g.id] = g));

  // _needsPosition のノードのみ処理対象
  const toLayout = nodes.filter((n) => n._needsPosition);
  const fixed = nodes.filter((n) => !n._needsPosition);
  if (toLayout.length === 0) {
    nodes.forEach((n) => delete n._needsPosition);
    return { nodes, groupUpdates: {} };
  }

  // 全ノード（fixed含む）のインデックスマップ
  const allNodes = [...toLayout, ...fixed];
  const idxMap = new Map<string, number>();
  allNodes.forEach((n, i) => idxMap.set(n.id, i));

  // 初期位置: 円形配置
  const cx = 400, cy = 300;
  const radius = Math.max(150, toLayout.length * 30);
  toLayout.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / toLayout.length;
    n.x = cx + radius * Math.cos(angle) - n.w / 2;
    n.y = cy + radius * Math.sin(angle) - n.h / 2;
  });

  // 力の定数
  const area = (800 * 600);
  const k = Math.sqrt(area / allNodes.length); // 理想距離
  const ITERATIONS = 300;
  let temperature = Math.max(800, radius * 2);
  const coolingFactor = temperature / (ITERATIONS + 1);

  // グループメンバーセット
  const groupMembers: Record<string, Set<string>> = {};
  nodes.forEach((n) => {
    if (n.group && groupById[n.group]) {
      (groupMembers[n.group] ??= new Set()).add(n.id);
    }
  });

  // 速度ベクトル
  const dx = new Float64Array(allNodes.length);
  const dy = new Float64Array(allNodes.length);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    dx.fill(0);
    dy.fill(0);

    // 反発力（全ペア）
    for (let i = 0; i < allNodes.length; i++) {
      const ni = allNodes[i]!;
      const ncx = ni.x + ni.w / 2;
      const ncy = ni.y + ni.h / 2;
      for (let j = i + 1; j < allNodes.length; j++) {
        const nj = allNodes[j]!;
        const mcx = nj.x + nj.w / 2;
        const mcy = nj.y + nj.h / 2;
        let ddx = ncx - mcx;
        let ddy = ncy - mcy;
        const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
        // ノードサイズを考慮した最小距離
        const minDist = (ni.w + nj.w) / 2 + 20;
        const effectiveDist = Math.max(1, dist - minDist + 20);
        const force = (k * k) / effectiveDist;
        const fx = (ddx / dist) * force;
        const fy = (ddy / dist) * force;
        dx[i] += fx;
        dy[i] += fy;
        dx[j] -= fx;
        dy[j] -= fy;
      }
    }

    // 引力（エッジ）
    for (const edge of edges) {
      const si = idxMap.get(edge.from);
      const ti = idxMap.get(edge.to);
      if (si === undefined || ti === undefined) continue;
      const sn = allNodes[si]!;
      const tn = allNodes[ti]!;
      const ddx = (tn.x + tn.w / 2) - (sn.x + sn.w / 2);
      const ddy = (tn.y + tn.h / 2) - (sn.y + sn.h / 2);
      const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
      const force = (dist * dist) / k;
      const fx = (ddx / dist) * force;
      const fy = (ddy / dist) * force;
      dx[si] += fx;
      dy[si] += fy;
      dx[ti] -= fx;
      dy[ti] -= fy;
    }

    // グループ内引力（同グループのノード同士をより強く引き合わせる）
    for (const members of Object.values(groupMembers)) {
      const memberArr = [...members];
      for (let i = 0; i < memberArr.length; i++) {
        for (let j = i + 1; j < memberArr.length; j++) {
          const si = idxMap.get(memberArr[i]!);
          const ti = idxMap.get(memberArr[j]!);
          if (si === undefined || ti === undefined) continue;
          const sn = allNodes[si]!;
          const tn = allNodes[ti]!;
          const ddx = (tn.x + tn.w / 2) - (sn.x + sn.w / 2);
          const ddy = (tn.y + tn.h / 2) - (sn.y + sn.h / 2);
          const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
          const force = dist * 0.3; // グループ凝集力
          const fx = (ddx / dist) * force;
          const fy = (ddy / dist) * force;
          dx[si] += fx;
          dy[si] += fy;
          dx[ti] -= fx;
          dy[ti] -= fy;
        }
      }
    }

    // 中心引力
    for (let i = 0; i < allNodes.length; i++) {
      const n = allNodes[i]!;
      dx[i] += (cx - (n.x + n.w / 2)) * 0.01;
      dy[i] += (cy - (n.y + n.h / 2)) * 0.01;
    }

    // 位置更新（temperature で制限、fixed ノードは動かさない）
    for (let i = 0; i < toLayout.length; i++) {
      const n = toLayout[i]!;
      const disp = Math.max(1, Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]));
      const scale = Math.min(disp, temperature) / disp;
      n.x += dx[i] * scale;
      n.y += dy[i] * scale;
    }

    temperature -= coolingFactor;
    if (temperature <= 0) break;
  }

  // グループフィッティング
  const groupUpdates: Record<string, DiagramGroup> = {};
  const childGroupsMap: Record<string, DiagramGroup[]> = {};
  groups.forEach((g) => {
    if (g.parentGroup) (childGroupsMap[g.parentGroup] ??= []).push(g);
  });

  // ボトムアップでグループを再計算
  const getDepth = (gid: string): number => getGroupDepth(gid, groupById);
  const sortedGroups = [...groups].sort((a, b) => getDepth(b.id) - getDepth(a.id));

  for (const g of sortedGroups) {
    const members = nodes.filter((n) => n.group === g.id);
    const children = (childGroupsMap[g.id] ?? []).map((c) => groupUpdates[c.id] ?? c);
    if (members.length > 0 || children.length > 0) {
      groupUpdates[g.id] = computeGroupFit(members, children, g);
    }
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}
```

**Step 5: テスト実行**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: 全テスト PASS

**Step 6: 既存テストの互換性確認**

既存テストは `autoLayout(nodes, edges)` と `autoLayout(nodes, edges, [group])` で呼び出し。第4引数なし = `"auto"` がデフォルトになるため、既存テストの一部で期待値の修正が必要な場合がある（LR固定前提のテスト `"エッジに基づいてレイヤーを割り当てる"` など）。フォースレイアウトでは x の順序は保証されないため、このテストの direction を明示的に `"LR"` に変更する。

修正対象テスト:
- `"エッジに基づいてレイヤーを割り当てる"` → `autoLayout(nodes, edges, [], "LR")`
- `"グループ間エッジを考慮してdagreがグループを配置する"` → `autoLayout(nodes, edges, [g1, g2, g3], "LR")`
- `"グループ内のエッジに基づいてノードを並べる"` → `autoLayout(nodes, edges, [group], "LR")`

**Step 7: テスト再実行**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: 全テスト PASS

**Step 8: ビルド**

Run: `docker compose exec app pnpm --filter diagram-dsl-core build`
Expected: ビルド成功

**Step 9: コミット**

```bash
git add packages/core/src/layout.ts packages/core/src/__tests__/layout.test.ts
git commit -m "feat: add force layout algorithm and direction parameter to autoLayout"
```

---

### Task 3: useDiagramState にレイアウト方向・アニメーション管理を追加

**Files:**
- Modify: `packages/react/src/hooks/useDiagramState.ts`

**Step 1: DiagramState 型を更新**

`DiagramState` インターフェースに追加:

```typescript
layoutDirection: LayoutDirection;
setLayoutDirection: (dir: LayoutDirection) => void;
isAnimating: boolean;
resetLayout: (dir?: LayoutDirection) => void;  // 既存を拡張
```

**Step 2: ステートを追加**

`useDiagramState` 関数内に追加:

```typescript
const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>("auto");
const [isAnimating, setIsAnimating] = useState(false);
```

**Step 3: autoLayout 呼び出しに direction を渡す**

`useMemo` 内の `autoLayout` 呼び出しを変更:

```typescript
return autoLayout(nodes, parsedRaw.edges, displayGroups, layoutDirection);
```

**Step 4: resetLayout を改修**

```typescript
const resetLayout = (dir?: LayoutDirection) => {
  pushSnapshot();
  if (dir !== undefined) setLayoutDirection(dir);
  setIsAnimating(true);
  setNodeStates((prev) => {
    const updated: Record<string, DiagramNode> = {};
    for (const [id, node] of Object.entries(prev)) {
      updated[id] = { ...node, _needsPosition: true };
    }
    return updated;
  });
  setTimeout(() => setIsAnimating(false), 350);
};
```

**Step 5: return に追加**

`useDiagramState` の return オブジェクトに追加:
- `layoutDirection`
- `setLayoutDirection`
- `isAnimating`

**Step 6: 型チェック**

Run: `docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: ビルド成功

**Step 7: コミット**

```bash
git add packages/react/src/hooks/useDiagramState.ts
git commit -m "feat: add layoutDirection and isAnimating to useDiagramState"
```

---

### Task 4: FLIP アニメーションを DiagramEditor に実装

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: アニメーションオフセットの状態管理**

DiagramEditor コンポーネント内にアニメーション用の state を追加:

```typescript
const [animOffsets, setAnimOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
```

**Step 2: isAnimating 変化時にオフセットを計算**

`isAnimating` が `false` → `true` に変わった瞬間に、旧座標を ref に保持。新座標との差分を `animOffsets` にセット。次のフレームでオフセットを 0 にクリアして CSS transition がアニメーションする。

```typescript
const prevPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

// isAnimating が true になる直前の位置を保持
useEffect(() => {
  if (!state.isAnimating) {
    // アニメーション中でないとき、現在の位置をスナップショット
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of parsed.nodes) positions[n.id] = { x: n.x, y: n.y };
    for (const g of parsed.groups) positions[g.id] = { x: g.x, y: g.y };
    for (const n of parsed.notes) positions[n.id] = { x: n.x, y: n.y };
    prevPositionsRef.current = positions;
  }
}, [parsed, state.isAnimating]);
```

ただし実際のFLIPでは resetLayout の呼び出し前に位置を保持する必要がある。`resetLayout` をラップする:

```typescript
const handleResetLayout = useCallback((dir?: LayoutDirection) => {
  // 現在位置をスナップショット
  const positions: Record<string, { x: number; y: number }> = {};
  for (const n of parsed.nodes) positions[n.id] = { x: n.x, y: n.y };
  for (const g of parsed.groups) positions[g.id] = { x: g.x, y: g.y };
  for (const n of parsed.notes) positions[n.id] = { x: n.x, y: n.y };
  prevPositionsRef.current = positions;
  resetLayout(dir);
}, [parsed, resetLayout]);
```

**Step 3: レイアウト完了後にオフセットを計算・クリア**

```typescript
useEffect(() => {
  if (!state.isAnimating) return;
  const prev = prevPositionsRef.current;
  if (Object.keys(prev).length === 0) return;

  // 新位置との差分を計算
  const offsets: Record<string, { dx: number; dy: number }> = {};
  for (const n of parsed.nodes) {
    const p = prev[n.id];
    if (p) offsets[n.id] = { dx: p.x - n.x, dy: p.y - n.y };
  }
  for (const g of parsed.groups) {
    const p = prev[g.id];
    if (p) offsets[g.id] = { dx: p.x - g.x, dy: p.y - g.y };
  }
  for (const n of parsed.notes) {
    const p = prev[n.id];
    if (p) offsets[n.id] = { dx: p.x - n.x, dy: p.y - n.y };
  }
  setAnimOffsets(offsets);

  // 次フレームでオフセットをクリア → transition が発火
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setAnimOffsets({});
    });
  });
}, [state.isAnimating, parsed]);
```

**Step 4: 各コンポーネントをアニメーション用 `<g>` でラップ**

ShapeNode, GroupBox, NoteBox をラップ:

```tsx
// ShapeNode のラッピング例
{parsed.nodes.map((node) => {
  const offset = animOffsets[node.id];
  const hasOffset = offset && (offset.dx !== 0 || offset.dy !== 0);
  return (
    <g
      key={node.id}
      transform={hasOffset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
      style={Object.keys(animOffsets).length > 0 && !hasOffset
        ? { transition: "transform 300ms ease-out" }
        : hasOffset
        ? { transition: "none" }
        : undefined
      }
    >
      <ShapeNode ... />
    </g>
  );
})}
```

**注意:** オフセットが設定されている間は `transition: none`（瞬時に旧位置へ）、オフセットがクリアされると `transition: transform 300ms ease-out`（新位置へアニメーション）。

ただし、このアプローチでは全ノードが `animOffsets` の有無でスタイルが切り替わるため、もっとシンプルにするなら:

```tsx
const isFlipping = Object.keys(animOffsets).length > 0;

<g
  key={node.id}
  transform={offset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
  style={state.isAnimating && !isFlipping
    ? { transition: "transform 300ms ease-out" }
    : undefined
  }
>
```

**Step 5: handleResetLayout を Toolbar に渡す**

`onResetLayout={handleResetLayout}` に変更。

**Step 6: 型チェック・ビルド**

Run: `docker compose exec app pnpm -r build`
Expected: ビルド成功

**Step 7: コミット**

```bash
git add packages/react/src/DiagramEditor.tsx
git commit -m "feat: add FLIP animation for layout transitions"
```

---

### Task 5: ツールバーにレイアウト方向ドロップダウンを追加

**Files:**
- Modify: `packages/react/src/components/Toolbar.tsx`
- Modify: `packages/react/src/DiagramEditor.tsx`（props 追加）

**Step 1: Toolbar の props を拡張**

```typescript
interface ToolbarProps {
  // ... 既存
  onResetLayout: (dir?: LayoutDirection) => void;  // 既存を拡張
  layoutDirection: LayoutDirection;
}
```

**Step 2: ドロップダウン UI を実装**

カラープリセットのドロップダウンと同じパターンで、自動配置ボタンをドロップダウン付きに変更:

```tsx
const [showLayoutMenu, setShowLayoutMenu] = useState(false);
const layoutRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!showLayoutMenu) return;
  const handler = (e: MouseEvent) => {
    if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
      setShowLayoutMenu(false);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, [showLayoutMenu]);

const layoutOptions: { key: LayoutDirection; label: string; desc: string }[] = [
  { key: "auto", label: "自動", desc: "フォース配置" },
  { key: "TB", label: "上→下", desc: "階層レイアウト" },
  { key: "LR", label: "左→右", desc: "階層レイアウト" },
];
```

ツールバー内の既存の自動配置ボタン（`onResetLayout` を呼ぶ部分）を以下に置換:

```tsx
<div ref={layoutRef} className="relative">
  <div className="flex">
    <button
      onClick={() => onResetLayout()}
      title="ノードを自動配置"
      className={`${tbBtnCls} font-mono rounded-r-none border-r-0`}
      style={{ width: "auto", height: btnH, padding: "0 8px", fontSize: 11 }}
    >
      {isMobile ? "⊞" : "⊞ 自動配置"}
    </button>
    <button
      onClick={() => setShowLayoutMenu(!showLayoutMenu)}
      title="レイアウト方向"
      className={`${tbBtnCls} rounded-l-none`}
      style={{ width: btnW, height: btnH, fontSize: 10 }}
    >
      ▾
    </button>
  </div>
  {showLayoutMenu && (
    <div className="absolute top-full left-0 mt-1 bg-bg-raised border border-border rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
      {layoutOptions.map((opt) => (
        <button
          key={opt.key}
          onClick={() => { onResetLayout(opt.key); setShowLayoutMenu(false); }}
          className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:bg-border transition-colors"
          style={{ color: layoutDirection === opt.key ? "#a5b4fc" : "#94a3b8" }}
        >
          <span className="w-4">{layoutDirection === opt.key ? "✓" : ""}</span>
          <span className="font-medium">{opt.label}</span>
          <span className="text-text-faint ml-auto">{opt.desc}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

**Step 3: DiagramEditor から layoutDirection を Toolbar に渡す**

```tsx
<Toolbar
  // ... 既存
  onResetLayout={handleResetLayout}
  layoutDirection={state.layoutDirection}
/>
```

**Step 4: 型チェック・ビルド**

Run: `docker compose exec app pnpm -r build`
Expected: ビルド成功

**Step 5: コミット**

```bash
git add packages/react/src/components/Toolbar.tsx packages/react/src/DiagramEditor.tsx
git commit -m "feat: add layout direction dropdown to toolbar"
```

---

### Task 6: 統合テスト・動作確認

**Step 1: core テスト全実行**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: 全テスト PASS

**Step 2: 全パッケージ型チェック**

Run: `docker compose exec app pnpm -r typecheck`
Expected: エラーなし

**Step 3: 全パッケージビルド**

Run: `docker compose exec app pnpm -r build`
Expected: ビルド成功

**Step 4: ブラウザ確認**

`make preview` で http://localhost:4173 を開き、以下を確認:
- ツールバーの「自動配置」ボタンが分割ボタンに変わっている
- ▾ をクリックするとドロップダウンが開く
- 「自動」「上→下」「左→右」の3つの選択肢がある
- 各選択肢をクリックするとノードがアニメーション付きで再配置される
- 自動（フォース配置）では接続ノードが近く、非接続ノードが遠くに配置される
- TB ではノードが上から下に、LR では左から右に階層的に配置される
- Undo (Cmd+Z) で配置を元に戻せる

**Step 5: コミット（最終調整あれば）**

```bash
git add -A
git commit -m "feat: smart auto-layout with force layout, direction selection, and animation"
```
