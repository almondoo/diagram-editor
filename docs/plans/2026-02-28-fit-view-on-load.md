# テンプレート選択・ダイアグラム読み込み時の自動 fitView 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** テンプレート選択時と保存済みダイアグラム読み込み時に、ダイアグラムを画面全体にフィットさせる。

**Architecture:** `DiagramState` に `fitViewRequested` フラグを追加し、`loadTemplate`/`loadSaved` でセット。`DiagramEditor` でフラグを検知し、レンダリング後の次フレームで `fitView` を実行。

**Tech Stack:** React, TypeScript

---

### Task 1: `useDiagramState` に `fitViewRequested` フラグを追加

**Files:**
- Modify: `app/lib/react/hooks/useDiagramState.ts:134-176` (DiagramState interface)
- Modify: `app/lib/react/hooks/useDiagramState.ts:956-980` (loadTemplate)
- Modify: `app/lib/react/hooks/useDiagramState.ts:1044-1056` (loadSaved)
- Modify: `app/lib/react/hooks/useDiagramState.ts:1058-1099` (return object)

**Step 1: `DiagramState` interface に追加**

`app/lib/react/hooks/useDiagramState.ts` の `DiagramState` interface（134行目）に以下を追加:

```typescript
fitViewRequested: boolean;
clearFitViewRequest: () => void;
```

**Step 2: state と関数を定義**

`useDiagramState` 関数内（`isAnimating` の近く、186行目付近）に追加:

```typescript
const [fitViewRequested, setFitViewRequested] = useState(false);
const clearFitViewRequest = useCallback(() => setFitViewRequested(false), []);
```

**Step 3: `loadTemplate` で `fitViewRequested` をセット**

`loadTemplate` 関数（956行目）の末尾に追加:

```typescript
setFitViewRequested(true);
```

**Step 4: `loadSaved` で `fitViewRequested` をセット**

`loadSaved` 関数（1044行目）の末尾に追加:

```typescript
setFitViewRequested(true);
```

**Step 5: return object に追加**

return オブジェクト（1058行目）に追加:

```typescript
fitViewRequested,
clearFitViewRequest,
```

**Step 6: typecheck を実行**

Run: `docker compose exec app pnpm typecheck`
Expected: PASS

**Step 7: コミット**

```bash
git add app/lib/react/hooks/useDiagramState.ts
git commit -m "feat: add fitViewRequested flag to DiagramState"
```

---

### Task 2: `DiagramEditor` で `fitViewRequested` を検知して `fitView` を実行

**Files:**
- Modify: `app/lib/react/DiagramEditor.tsx:61-68` (state destructure)
- Modify: `app/lib/react/DiagramEditor.tsx:148-156` (fitView useEffect 付近)

**Step 1: state から `fitViewRequested` と `clearFitViewRequest` を取得**

`app/lib/react/DiagramEditor.tsx` の state destructure（61-68行目）に追加:

```typescript
const {
  code, setCode, parsed, nodeById, groupById, noteStates,
  setNodeLayout, setNodeSize, setGroupLayout, setGroupSize, setNoteLayout, multiMoveLayout,
  addNode, addNote, addGroup, addEdge, updateNodeProp, updateEdgeProp, deleteEdge, deleteNode, deleteGroup, deleteNote, reconnectEdge, updateEdgeBend, exportSVG, formatCode, resetLayout,
  colorPreset, setColorPreset,
  undo, redo, canUndo, canRedo, pushSnapshot,
  isAnimating, layoutDirection,
  fitViewRequested, clearFitViewRequest,
} = state;
```

**Step 2: `fitViewRequested` を検知する `useEffect` を追加**

既存の fitView useEffect（148-156行目）の後に追加:

```typescript
// loadTemplate / loadSaved 後の自動 fitView
useEffect(() => {
  if (!fitViewRequested) return;
  clearFitViewRequest();
  // 次フレームでレイアウト計算完了後に fitView を実行
  const id = requestAnimationFrame(() => {
    fitView(parsed.nodes, parsed.groups);
  });
  return () => cancelAnimationFrame(id);
}, [fitViewRequested, clearFitViewRequest, fitView, parsed.nodes, parsed.groups]);
```

**Step 3: typecheck → lint → build を実行**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint && docker compose exec app pnpm build`
Expected: PASS

**Step 4: コミット**

```bash
git add app/lib/react/DiagramEditor.tsx
git commit -m "feat: auto fitView on template select and diagram load"
```

---

### Task 3: 初回表示時も fitView を実行

**Files:**
- Modify: `app/lib/react/hooks/useDiagramState.ts:186` (fitViewRequested 初期値)

**Step 1: `fitViewRequested` の初期値を `true` に変更**

```typescript
const [fitViewRequested, setFitViewRequested] = useState(true);
```

これにより初回レンダリング時（ダイアグラムページを直接開いた時）も画面にフィットする。

**Step 2: typecheck → lint → build を実行**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint && docker compose exec app pnpm build`
Expected: PASS

**Step 3: コミット**

```bash
git add app/lib/react/hooks/useDiagramState.ts
git commit -m "feat: auto fitView on initial diagram render"
```
