# Diagram Rename & Template New Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ダイアグラムの名前変更・削除ボタン（ホーム一覧・エディタ）、テンプレートを新規ダイアグラムとして作成、ノードラベルの折り返し表示、ノードのUIリサイズを実装する。

**Architecture:** `useLocalDiagrams` に `renameDiagram` を追加し、ホームの `DiagramCard` に名前変更・削除ボタン、`AppHeader` に名前表示・編集を追加。テンプレート選択は `navigate('/diagrams/new', { state: { templateCode } })` で新規遷移に変更。`ShapeNode.tsx` のテキスト省略を折り返し表示に変更。`useDiagramState` に `setNodeSize` を追加し、`useNodeDrag` でリサイズを処理、`ShapeNode` にリサイズハンドルを追加。

**Tech Stack:** React, TypeScript, React Router v7, localStorage, SVG

---

### Task 1: `useLocalDiagrams` に `renameDiagram` を追加

**Files:**
- Modify: `apps/web/app/hooks/useLocalDiagrams.ts`

テストファイルはなし（純粋な localStorage 操作なので型チェックで確認）。

**Step 1: `renameDiagram` 関数を追加する**

`deleteDiagram` の直後に以下を追加：

```ts
const renameDiagram = useCallback((id: string, name: string) => {
  setSavedDiagrams((prev) => {
    const next = prev.map((d) => (d.id === id ? { ...d, name } : d));
    saveToStorage(next);
    return next;
  });
}, []);
```

return 文に `renameDiagram` を追加：

```ts
return { savedDiagrams, saveDiagram, deleteDiagram, renameDiagram };
```

**Step 2: 型チェックを実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 3: コミット**

```bash
git add apps/web/app/hooks/useLocalDiagrams.ts
git commit -m "feat: add renameDiagram to useLocalDiagrams"
```

---

### Task 2: ホーム一覧でのインライン名前変更

**Files:**
- Modify: `apps/web/app/routes/home.tsx`

**Step 1: `DiagramCard` にインライン名前変更 UI を追加する**

`home.tsx` の `DiagramCard` を以下のように変更する。

`useLocalDiagrams` から `renameDiagram` を受け取る。`DiagramCard` の props に `id: string` と `onRename: (id: string, name: string) => void` を追加。

```tsx
// home.tsx の useLocalDiagrams 呼び出しを変更
const { savedDiagrams, deleteDiagram, renameDiagram } = useLocalDiagrams();
```

`DiagramCard` に `id` と `onRename` props を追加し、呼び出し側で渡す：

```tsx
<DiagramCard
  key={d.id}
  id={d.id}
  name={d.name}
  savedAt={d.savedAt}
  onClick={() => navigate(`/diagrams/${d.id}`)}
  onDelete={() => deleteDiagram(d.id)}
  onRename={renameDiagram}
/>
```

**Step 2: `DiagramCard` コンポーネントにインライン編集・削除確認ロジックを実装する**

カード構造: 左側に名前（ダブルクリックで編集）、右側に「✎ 名前変更」「🗑 削除」ボタン。削除は2段階確認（1クリック目で確認状態、2クリック目で実行）。

```tsx
function DiagramCard({
  id,
  name,
  savedAt,
  onClick,
  onDelete,
  onRename,
}: {
  id: string;
  name: string;
  savedAt: number;
  onClick: () => void;
  onDelete: () => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) onRename(id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div
      onClick={() => { setConfirmDelete(false); onClick(); }}
      onMouseLeave={() => setConfirmDelete(false)}
      style={{
        background: "#0f1219",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#4338ca";
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              width: "100%",
              background: "#131720",
              border: "1px solid #4338ca",
              borderRadius: 4,
              padding: "2px 6px",
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: 600,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#e2e8f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onDoubleClick={startEdit}
            title="ダブルクリックで名前変更"
          >
            {name}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          {new Date(savedAt).toLocaleDateString("ja-JP")}
        </div>
      </div>
      {/* アクションボタン */}
      <div
        style={{ display: "flex", gap: 4, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: "transparent",
              border: "none",
              color: "#475569",
              cursor: "pointer",
              fontSize: 13,
              padding: "4px 6px",
              borderRadius: 4,
              lineHeight: 1,
            }}
            title="名前変更"
          >
            ✎
          </button>
        )}
        <button
          onClick={handleDeleteClick}
          style={{
            background: confirmDelete ? "#7f1d1d" : "transparent",
            border: confirmDelete ? "1px solid #ef4444" : "none",
            color: confirmDelete ? "#fca5a5" : "#475569",
            cursor: "pointer",
            fontSize: confirmDelete ? 11 : 13,
            padding: "4px 6px",
            borderRadius: 4,
            lineHeight: 1,
            fontWeight: confirmDelete ? 600 : 400,
            whiteSpace: "nowrap",
          }}
          title="削除"
        >
          {confirmDelete ? "確認？" : "🗑"}
        </button>
      </div>
    </div>
  );
}
```

**Step 3: 型チェックを実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add apps/web/app/routes/home.tsx
git commit -m "feat: inline rename on diagram card (double-click)"
```

---

### Task 3: AppHeader にダイアグラム名表示・インライン編集を追加

**Files:**
- Modify: `apps/web/app/components/AppHeader.tsx`
- Modify: `apps/web/app/routes/diagram.tsx`

**Step 1: `AppHeader` に props を追加する**

`AppHeaderProps` に以下を追加：

```ts
interface AppHeaderProps {
  onLoadTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;        // 保存済みの場合のみ渡す
  onRenameDiagram?: (name: string) => void;  // 保存済みの場合のみ渡す
}
```

**Step 2: AppHeader にダイアグラム名表示・インライン編集 UI を追加する**

`AppHeader` 関数内に以下のステートを追加：

```ts
const [editingName, setEditingName] = useState(false);
const [editNameValue, setEditNameValue] = useState("");
const nameInputRef = useRef<HTMLInputElement>(null);
```

ヘッダー内のテンプレートドロップダウンと保存ボタンの間（`<div style={{ flex: 1 }} />`の前）に追加：

```tsx
{/* ダイアグラム名 */}
{currentDiagramName !== undefined && (
  <div style={{ marginLeft: 16, display: "flex", alignItems: "center" }}>
    {editingName ? (
      <input
        ref={nameInputRef}
        value={editNameValue}
        onChange={(e) => setEditNameValue(e.target.value)}
        onBlur={() => {
          const trimmed = editNameValue.trim();
          if (trimmed && trimmed !== currentDiagramName) {
            onRenameDiagram?.(trimmed);
          }
          setEditingName(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const trimmed = editNameValue.trim();
            if (trimmed && trimmed !== currentDiagramName) {
              onRenameDiagram?.(trimmed);
            }
            setEditingName(false);
          }
          if (e.key === "Escape") setEditingName(false);
        }}
        autoFocus
        style={{
          background: "#131720",
          border: "1px solid #4338ca",
          borderRadius: 4,
          padding: "2px 8px",
          color: "#e2e8f0",
          fontSize: 12,
          outline: "none",
          minWidth: 120,
          maxWidth: 240,
        }}
      />
    ) : (
      <span
        onClick={() => {
          setEditNameValue(currentDiagramName);
          setEditingName(true);
        }}
        title="クリックで名前変更"
        style={{
          fontSize: 12,
          color: "#94a3b8",
          cursor: "pointer",
          padding: "2px 6px",
          borderRadius: 4,
          maxWidth: 240,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "inline-block",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLSpanElement).style.color = "#e2e8f0";
          (e.currentTarget as HTMLSpanElement).style.background = "#1e293b";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLSpanElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLSpanElement).style.background = "transparent";
        }}
      >
        {currentDiagramName}
      </span>
    )}
  </div>
)}
```

**Step 3: `diagram.tsx` から AppHeader に props を渡す**

`diagram.tsx` の `AppHeader` 呼び出しを変更：

```tsx
const currentDiagramName = currentDiagramId
  ? savedDiagrams.find((d) => d.id === currentDiagramId)?.name
  : undefined;

const handleRenameDiagram = useCallback(
  (name: string) => {
    if (!currentDiagramId) return;
    renameDiagram(currentDiagramId, name);
  },
  [currentDiagramId, renameDiagram]
);
```

`useLocalDiagrams` の呼び出しを変更：

```ts
const { savedDiagrams, saveDiagram, renameDiagram } = useLocalDiagrams();
```

AppHeader に props を追加：

```tsx
<AppHeader
  onLoadTemplate={(code) => {
    state.loadTemplate(code);
    setCurrentDiagramId(null);
  }}
  onSave={handleSave}
  saveLabel={currentDiagramId ? "更新" : "保存"}
  currentDiagramName={currentDiagramName}
  onRenameDiagram={handleRenameDiagram}
/>
```

**Step 4: 型チェックを実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 5: コミット**

```bash
git add apps/web/app/components/AppHeader.tsx apps/web/app/routes/diagram.tsx
git commit -m "feat: show and edit diagram name in editor header"
```

---

### Task 4: テンプレート選択を新規ダイアグラム作成に変更

**Files:**
- Modify: `apps/web/app/components/AppHeader.tsx`
- Modify: `apps/web/app/routes/diagram.tsx`

**Goal:** テンプレート選択時に現在のダイアグラムを上書きせず、`/diagrams/new` に `location.state` でテンプレートコードを渡して遷移する。

**Step 1: `AppHeader` の `onLoadTemplate` を `onCreateFromTemplate` にリネームする**

`AppHeaderProps` を変更：

```ts
interface AppHeaderProps {
  onCreateFromTemplate: (code: string) => void;  // 旧: onLoadTemplate
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;
  onRenameDiagram?: (name: string) => void;
}
```

コンポーネント内の参照も `onLoadTemplate` → `onCreateFromTemplate` に変更。

**Step 2: `diagram.tsx` の `onLoadTemplate` ハンドラを変更する**

旧コード：

```tsx
onLoadTemplate={(code) => {
  state.loadTemplate(code);
  setCurrentDiagramId(null);
}}
```

新コード：

```tsx
onCreateFromTemplate={(code) => {
  navigate("/diagrams/new", { state: { templateCode: code } });
}}
```

**Step 3: `diagram.tsx` で `location.state.templateCode` を読み取る**

`useLocation` をインポートし、初期コードとして使用する：

```tsx
import { useNavigate, useParams, useLocation } from "react-router";

// ...

const location = useLocation();
const templateCode = (location.state as { templateCode?: string } | null)?.templateCode;
const state = useDiagramState(
  initialDiagram?.code ?? templateCode ?? TEMPLATES.architecture
);
```

ただし、`/diagrams/new` → 保存後 `/diagrams/:id` に遷移するとき `location.state` が残って余計に初期化しないよう、`useDiagramState` は初回マウント時のみ初期コードを使うため問題なし。

**Step 4: 型チェックを実行**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 5: lint を実行**

```bash
docker compose exec app pnpm -r lint
```

Expected: エラーなし

**Step 6: コミット**

```bash
git add apps/web/app/components/AppHeader.tsx apps/web/app/routes/diagram.tsx
git commit -m "feat: template selection creates new diagram instead of overwriting"
```

---

---

### Task 5: ノードラベルの折り返し表示

**Files:**
- Modify: `packages/react/src/components/ShapeNode.tsx`

**背景:** 現在 `label.length > 18 ? label.slice(0, 17) + "…" : label` で18文字以上を省略している。代わりにノードの `w` に合わせてテキストを折り返す。

**Step 1: `wrapText` ユーティリティ関数を `ShapeNode.tsx` に追加する**

コンポーネントの外（ファイル先頭）に追加：

```ts
/**
 * ノード幅に合わせて label を複数行に折り返す。
 * charWidth は "IBM Plex Sans" の近似値 (fontSize × 0.55)。
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor((maxWidth - 16) / charWidth));
  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // 単語自体が最大幅を超える場合は強制改行
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    }
  }
  if (current) lines.push(current);
  return lines;
}
```

**Step 2: `textEl` の実装を折り返し版に置き換える**

旧コード（`textEl` 変数）：

```tsx
const textEl = (
  <text
    x={x + w / 2}
    y={y + h / 2 + (icon ? 4 : 1)}
    textAnchor="middle"
    dominantBaseline="middle"
    fill={textColor}
    fontSize={fontSize}
    fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
    fontWeight="500"
    style={{ pointerEvents: "none", userSelect: "none" }}
  >
    {icon && (
      <tspan x={x + w / 2} dy="-8" fontSize={fontSize + 4}>
        {icon}
      </tspan>
    )}
    <tspan x={x + w / 2} dy={icon ? fontSize + 4 : 0}>
      {label.length > 18 ? label.slice(0, 17) + "…" : label}
    </tspan>
  </text>
);
```

新コード：

```tsx
const lines = wrapText(label, w, fontSize);
const lineHeight = Math.ceil(fontSize * 1.35);
const textBlockH = lines.length * lineHeight;
// アイコンがある場合は上にずらす
const iconOffset = icon ? lineHeight : 0;
const startY = y + h / 2 - (textBlockH - lineHeight) / 2 + iconOffset / 2;

const textEl = (
  <text
    x={x + w / 2}
    y={startY}
    textAnchor="middle"
    dominantBaseline="middle"
    fill={textColor}
    fontSize={fontSize}
    fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
    fontWeight="500"
    style={{ pointerEvents: "none", userSelect: "none" }}
  >
    {icon && (
      <tspan x={x + w / 2} dy={-iconOffset} fontSize={fontSize + 4}>
        {icon}
      </tspan>
    )}
    {lines.map((line, i) => (
      <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : lineHeight}>
        {line}
      </tspan>
    ))}
  </text>
);
```

**Step 3: ビルドして型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react build
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add packages/react/src/components/ShapeNode.tsx
git commit -m "feat: wrap node label text instead of truncating"
```

---

### Task 6: ノードのUIリサイズ

**Files:**
- Modify: `packages/react/src/hooks/useDiagramState.ts`
- Modify: `packages/react/src/hooks/useNodeDrag.ts`
- Modify: `packages/react/src/components/ShapeNode.tsx`
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: `useDiagramState` に `setNodeSize` を追加する**

`DiagramState` インターフェースに追加：

```ts
setNodeSize: (nodeId: string, w: number, h: number) => void;
```

`useDiagramState` 関数内（`setNoteLayout` の直後）に実装を追加：

```ts
const setNodeSize = useCallback((nodeId: string, w: number, h: number) => {
  setNodeStates((prev) => {
    const n = prev[nodeId];
    if (!n) return prev;
    return { ...prev, [nodeId]: { ...n, w: Math.max(60, w), h: Math.max(30, h) } };
  });
}, []);
```

return 文に `setNodeSize` を追加。

**Step 2: `useNodeDrag` をリサイズ対応に拡張する**

`DragInfo` 型に `type` を追加：

```ts
interface DragInfo {
  nodeId: string;
  startX: number;
  startY: number;
  type: "move" | "resize";
  isMulti: boolean;
}
```

関数シグネチャに `setNodeSize` を追加：

```ts
export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  selectedIds: Set<string>,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  setNodeSize: (nodeId: string, w: number, h: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
)
```

`handleNodeMouseDown` を move 用として更新（`type: "move"` を追加）：

```ts
const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
  e.stopPropagation();
  if (e.button === 1 || e.button === 2) return;
  const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
  setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY, type: "move", isMulti });
};
```

リサイズ用ハンドラを追加：

```ts
const handleNodeResizeMouseDown = (e: React.MouseEvent, nodeId: string) => {
  e.stopPropagation();
  if (e.button !== 0) return;
  setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY, type: "resize", isMulti: false });
};
```

`handleMove` 内でリサイズ処理に分岐：

```ts
const handleMove = (e: MouseEvent) => {
  const dx = (e.clientX - dragInfo.startX) / zoom;
  const dy = (e.clientY - dragInfo.startY) / zoom;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

  if (dragInfo.type === "resize") {
    const node = nodeById[dragInfo.nodeId];
    if (!node) return;
    setNodeSize(dragInfo.nodeId, node.w + dx, node.h + dy);
  } else if (dragInfo.isMulti) {
    onMultiMove(dx, dy);
  } else {
    const node = nodeById[dragInfo.nodeId];
    if (!node) return;
    setNodeLayout(dragInfo.nodeId, Math.round(node.x + dx), Math.round(node.y + dy));
  }
  setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
};
```

return 文に `handleNodeResizeMouseDown` を追加：

```ts
return { handleNodeMouseDown, handleNodeResizeMouseDown };
```

**Step 3: `ShapeNode` にリサイズハンドル props と描画を追加する**

`ShapeNodeProps` に追加：

```ts
interface ShapeNodeProps {
  node: DiagramNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
}
```

`memo` の引数にも `onResizeMouseDown` を追加（ただし ref パターンを使わず直接受け取る）。
比較関数は変更なし（`onResizeMouseDown` は毎回変わる可能性があるが、選択時のみ表示するためパフォーマンス影響は小さい）。

各 `return` ブロックの `</g>` 直前にリサイズハンドルを追加（全シェイプ共通）：

```tsx
{isSelected && onResizeMouseDown && (
  <rect
    x={x + w - 5}
    y={y + h - 5}
    width={10}
    height={10}
    rx={2}
    fill="#818cf8"
    stroke="#1e1b4b"
    strokeWidth={1}
    style={{ cursor: "se-resize", pointerEvents: "all" }}
    onMouseDown={(e) => {
      e.stopPropagation();
      onResizeMouseDown(e);
    }}
  />
)}
```

**Step 4: `DiagramEditor.tsx` を更新する**

`useNodeDrag` の呼び出しに `setNodeSize` を追加：

```ts
const { handleNodeMouseDown, handleNodeResizeMouseDown } =
  useNodeDrag(nodeById, zoom, selectedIds, setNodeLayout, setNodeSize, onMultiMove);
```

`ShapeNode` の呼び出しに `onResizeMouseDown` を追加：

```tsx
<ShapeNode
  key={node.id}
  node={node}
  isSelected={isSelected(node.id)}
  onMouseDown={(e) => {
    if (!isSelected(node.id)) selectSingle(node.id);
    handleNodeMouseDown(e, node.id);
  }}
  onResizeMouseDown={(e) => handleNodeResizeMouseDown(e, node.id)}
/>
```

`state` の分割代入に `setNodeSize` を追加：

```ts
const {
  code, setCode, parsed, nodeById, groupById, noteStates,
  setNodeLayout, setNodeSize, setGroupLayout, setGroupSize, setNoteLayout, multiMoveLayout,
  addNode, exportSVG, formatCode, resetLayout,
} = state;
```

**Step 5: ビルドして型チェックと lint**

```bash
docker compose exec app pnpm --filter diagram-dsl-react build
docker compose exec app pnpm -r typecheck
docker compose exec app pnpm -r lint
```

Expected: エラーなし

**Step 6: コミット**

```bash
git add packages/react/src/hooks/useDiagramState.ts packages/react/src/hooks/useNodeDrag.ts packages/react/src/components/ShapeNode.tsx packages/react/src/DiagramEditor.tsx
git commit -m "feat: add node resize via drag handle on selected nodes"
```

---

### Task 7: 動作確認

ブラウザで `http://localhost:5173` を開き以下を確認：

1. **ホーム一覧での名前変更・削除**
   - カード名をダブルクリック → 入力フィールドになる。Enter で確定
   - ✎ ボタンをクリック → 同様に編集開始
   - 🗑 ボタンをクリック → 「確認？」に変わる。再クリックで削除
   - マウスアウトで確認状態がリセットされる

2. **エディタ画面での名前変更**
   - 保存済みダイアグラムを開く → AppHeader に名前が表示される
   - 名前をクリック → 入力フィールドになる。Enter で確定
   - 未保存 `/diagrams/new` → 名前フィールドが表示されない

3. **テンプレート新規追加**
   - テンプレートを選択 → `/diagrams/new` に遷移し選択テンプレートが表示される
   - 元のダイアグラムはホームで確認すると変更されていない

4. **ノードラベル折り返し**
   - 長いラベル（「このノードは長い名前を持っています」）を設定したとき、ノード幅に合わせて折り返される
   - 省略記号（…）が表示されない

5. **ノードリサイズ**
   - ノードを選択すると右下に小さな紫のハンドルが現れる
   - ハンドルをドラッグするとノードが拡大・縮小する
   - 最小サイズ（幅60px・高さ30px）以下にはならない
