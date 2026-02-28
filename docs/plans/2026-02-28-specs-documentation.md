# 仕様書作成 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** コードベース全体から機能ドメイン単位の仕様書を `docs/specs/` に作成する

**Architecture:** 既存の `docs/dsl-syntax.md` を `docs/specs/` に移動・拡充し、10個の機能別仕様書 + README索引を作成。各仕様書は統一フォーマット（概要 → API → 動作仕様 → デフォルト値 → 関連ファイル）で記述。

**Tech Stack:** Markdown

---

### Task 1: ディレクトリ作成・既存ファイル移動

**Files:**
- Create: `docs/specs/` ディレクトリ
- Move: `docs/dsl-syntax.md` → `docs/specs/dsl-syntax.md`
- Delete: `docs/dsl-syntax.md`（移動により削除）

**Step 1: ディレクトリ作成と移動**

```bash
mkdir -p docs/specs
git mv docs/dsl-syntax.md docs/specs/dsl-syntax.md
```

**Step 2: コミット**

```bash
git add docs/specs/dsl-syntax.md
git commit -m "docs: move dsl-syntax.md to docs/specs/"
```

---

### Task 2: dsl-syntax.md を拡充

**Files:**
- Modify: `docs/specs/dsl-syntax.md`

既存の内容をベースに以下を追加・更新:

**追加内容:**
- `_explicitProps` の説明（パーサーが追跡する明示的プロパティ）
- `_needsPosition` フラグの説明（autoLayout 対象マーク）
- ノードの `borderWidth`, `fontSize` プロパティ
- エッジの `thickness`, `curve` プロパティのデフォルト値明記
- グループのネスト時の座標解釈（絶対座標変換）
- プロパティ記法の引用符ルール詳細

**Step 1: dsl-syntax.md を拡充**

以下の内容で `docs/specs/dsl-syntax.md` を更新する。既存の構造を維持しつつ不足情報を補完:

1. 概要セクションに「パーサー内部フラグ」小節を追加
2. node プロパティテーブルに `borderWidth`(デフォルト2), `fontSize`(デフォルト13) を追加
3. edge プロパティに `curve` の選択肢 `smooth | straight` を明記
4. group セクションに「座標の解釈」小節を追加（ブロック構文内は親グループからの相対座標 → パーサーが絶対座標に変換）
5. style セクションの対応プロパティに完全なリストを追加

**Step 2: コミット**

```bash
git add docs/specs/dsl-syntax.md
git commit -m "docs: expand dsl-syntax.md with complete property details"
```

---

### Task 3: parser.md 作成

**Files:**
- Create: `docs/specs/parser.md`

**内容:**

```markdown
# パーサー仕様

## 概要

DSLコード文字列を解析し、ノード・エッジ・グループ・ノート・エラーの構造化データに変換する。

## API

### parseDSL

- **シグネチャ**: `parseDSL(code: string): ParseResult`
- **入力**: DSLコード文字列（複数行）
- **出力**: `ParseResult { nodes: DiagramNode[], edges: DiagramEdge[], groups: DiagramGroup[], notes: DiagramNote[], errors: ParseError[] }`

### parseProps

- **シグネチャ**: `parseProps(str: string): Record<string, string>`
- **入力**: プロパティ文字列（例: `shape=rect color=#6366f1`）
- **出力**: key-valueペア

## 動作仕様

### パース処理フロー

1. コードを行単位に分割
2. 各行をセグメント化（空行・コメント・DSL要素）
3. ブロック構文（`{` で開始、`}` で終了）を検出しグループ化
4. 各セグメントを `parseSegment()` で解析:
   - `node`: ID・ラベル・プロパティを抽出。x/y未指定なら `_needsPosition: true`
   - `edge`: from・演算子・to・プロパティを抽出。EDGE_OP_MAP で arrow/style を決定
   - `group`: ID・ラベル・プロパティを抽出。ブロック内の子要素を再帰パース
   - `note`: ID・テキスト・プロパティを抽出
   - `style`: 対象ノードIDとプロパティを抽出し、既存ノードにマージ
5. グループのネスト処理: 子要素の相対座標を絶対座標に変換（offsetX, offsetY加算）

### エラー検出

- `ParseError { line: number, message: string }`
- 検出対象: 不明なキーワード、不正な構文、参照先ノード未定義

### _explicitProps

パーサーはノードごとに明示的に指定されたプロパティ名を `_explicitProps: Set<string>` として記録する。
syncNodes が code 変更時に「コードで指定された値」と「ドラッグで変更された値」を区別するために使用。

## デフォルト値

| 要素 | プロパティ | デフォルト |
|------|-----------|-----------|
| node | shape | "rect" |
| node | color | colorForId(id) |
| node | textColor | "#ffffff" |
| node | w, h | 150, 60（icon時は 80, 68） |
| node | borderWidth | 2 |
| node | fontSize | 13 |
| node | opacity | 1 |
| node | dashed | false |
| edge | color | "#94a3b8" |
| edge | thickness | 1.5 |
| edge | curve | "smooth" |
| edge | arrow | 演算子から決定 |
| edge | style | 演算子から決定 |
| group | color | colorForId(id) |
| group | w, h | 300, 200 |
| note | color | "#fbbf24" |

## 関連ファイル

- `app/lib/core/parser.ts`
- `app/lib/core/types.ts`
```

**Step 1: parser.md を作成**

上記の内容で `docs/specs/parser.md` を作成。

**Step 2: コミット**

```bash
git add docs/specs/parser.md
git commit -m "docs: add parser specification"
```

---

### Task 4: layout.md 作成

**Files:**
- Create: `docs/specs/layout.md`

**内容:**

```markdown
# レイアウトエンジン仕様

## 概要

ノード・エッジ・グループの位置を自動計算する。dagre（階層レイアウト）と Fruchterman-Reingold（フォースレイアウト）の2アルゴリズムを提供。

## API

### autoLayout

- **シグネチャ**: `autoLayout(nodes: DiagramNode[], edges: DiagramEdge[], groups?: DiagramGroup[], direction?: LayoutDirection): { nodes: DiagramNode[], groupUpdates: Record<string, { x, y, w, h }> }`
- **入力**: パース済みノード・エッジ・グループ、レイアウト方向
- **出力**: 位置計算済みノード配列 + グループの位置/サイズ更新マップ
- **対象**: `_needsPosition: true` のノードのみ配置。既に位置が確定しているノードはスキップ。

### getGroupDepth

- **シグネチャ**: `getGroupDepth(gid: string, groupById: Record<string, DiagramGroup>): number`
- **出力**: グループのネスト深さ（ルート=0）

## 定数

| 定数 | 値 | 説明 |
|------|-----|------|
| GROUP_LABEL_HEIGHT | 26 | グループラベル領域の高さ (px) |
| GROUP_PADDING | 12 | グループ内パディング (px) |
| NODE_SEP | 40 | dagre: 同一レイヤー内ノード間隔 |
| RANK_SEP | 80 | dagre: レイヤー間隔 |
| GROUP_GAP | 60 | グループ間の余白 |

## 動作仕様

### direction="auto"（フォースレイアウト）

1. `_needsPosition: true` のノードに初期位置をランダム割り当て
2. Fruchterman-Reingold シミュレーション（300イテレーション）:
   - ノード間反発力
   - エッジ接続ノード間引力
   - グループ内引力（同グループノードの重心方向）
   - 全体の中心引力
3. グループフィッティング: メンバーノード + 子グループを包含するサイズに再計算
4. トップレベルグループを dagre で再配置（重なり解消）
5. フリーノード（グループ未所属）をグループ群の下に配置

### direction="TB" / "LR"（dagre レイアウト）

1. グループをボトムアップ順に処理（リーフから親へ）
2. 各グループ内ノードを dagre でレイアウト（ローカル座標）
3. 子グループを配置 → グループサイズを自動フィット
4. トップレベルグループを dagre で再配置
5. フリーノードを dagre でレイアウト（resolveOverlap で既存要素との衝突回避）

### _needsPosition フラグ

- DSL で x/y が未指定のノードに `_needsPosition: true` が設定される
- autoLayout は `_needsPosition: true` のノードのみ配置する
- 配置後、フラグは維持される（syncNodes が次回コード変更時にリセット判断）

### FLIPアニメーション連携

DiagramEditor が autoLayout 前後の位置差分を計算し、CSS transform で補間アニメーションを実行。
autoLayout 自体はアニメーションを行わない。

## 関連ファイル

- `app/lib/core/layout.ts`
- `app/lib/react/DiagramEditor.tsx`（FLIPアニメーション部分）
```

**Step 1: layout.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/layout.md
git commit -m "docs: add layout engine specification"
```

---

### Task 5: geometry.md 作成

**Files:**
- Create: `docs/specs/geometry.md`

**内容:**

```markdown
# ジオメトリ計算仕様

## 概要

SVGシェイプのパス生成、ノード中心座標の計算、エッジの始終点（ノード境界との交差点）計算を提供する。
ShapeNode, EdgeLine, svg-export が共通利用。

## API

### getShapePath

- **シグネチャ**: `getShapePath(shape: string, x: number, y: number, w: number, h: number): string | null`
- **入力**: シェイプ種類、左上座標(x,y)、幅(w)、高さ(h)
- **出力**: SVG path の `d` 属性文字列。rect/ellipse/circle/cylinder は `null`（SVG 固有要素で描画）

### シェイプ別パス

| シェイプ | パス | null |
|---------|------|------|
| rect | - | null（SVG `<rect>` で描画） |
| stadium | 角丸長方形パス | string |
| diamond | ひし形パス | string |
| parallelogram | 平行四辺形パス（左上/右下に10pxオフセット） | string |
| hexagon | 六角形パス（左右に15%オフセット） | string |
| trapezoid | 台形パス（上辺が短い） | string |
| ellipse | - | null（SVG `<ellipse>` で描画） |
| circle | - | null（SVG `<ellipse>` で描画） |
| cylinder | - | null（SVG `<path>` + `<ellipse>` で個別描画） |

### getNodeCenter

- **シグネチャ**: `getNodeCenter(n: DiagramNode): { x: number, y: number }`
- **出力**: ノードの中心座標 `{ x: n.x + n.w/2, y: n.y + n.h/2 }`

### getEdgePoints

- **シグネチャ**: `getEdgePoints(fromNode: DiagramNode, toNode: DiagramNode): { from: {x,y}, to: {x,y} }`
- **動作**: 各ノードの中心から相手ノード中心への角度を計算し、ノード境界上の交差点を返す
- **アルゴリズム**: 楕円・矩形の半サイズを角度で内分して境界点を取得

### buildEdgePath

- **シグネチャ**: `buildEdgePath(from: {x,y}, to: {x,y}, curve: string, bendX?: number, bendY?: number): { pathD: string, labelX: number, labelY: number }`
- **curve="straight"**: 直線パス `M from L to`
- **curve="smooth"（デフォルト）**: Quadratic Bézier `M from Q control to`
  - bend指定あり: コントロールポイント = from/to中点 + (bendX, bendY)
  - bend指定なし: コントロールポイント = from/to中点 + 法線方向オフセット
- **labelX/labelY**: ラベル表示位置（パス中点）

## 関連ファイル

- `app/lib/core/geometry.ts`
- `app/lib/react/components/ShapeNode.tsx`
- `app/lib/react/components/EdgeLine.tsx`
- `app/lib/core/svg-export.ts`
```

**Step 1: geometry.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/geometry.md
git commit -m "docs: add geometry specification"
```

---

### Task 6: state-management.md 作成

**Files:**
- Create: `docs/specs/state-management.md`

**内容:**

```markdown
# ステート管理仕様

## 概要

DSLコード文字列と描画位置状態の二層モデルでダイアグラムの状態を管理する。
コード変更時の同期、ドラッグ操作のコード書き戻し、Undo/Redo を提供。

## API

### useDiagramState

- **シグネチャ**: `useDiagramState(initialCode: string): DiagramState`
- **入力**: 初期DSLコード
- **出力**: DiagramState インターフェース（下記）

### DiagramState インターフェース

#### 状態

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| code | string | DSLコード文字列 |
| parsed | ParseResult | パース結果（表示用に加工済み） |
| nodeById | Record<string, DiagramNode> | パース直後のノードマップ |
| groupById | Record<string, DiagramGroup> | パース直後のグループマップ |
| nodeStates | Record<string, DiagramNode> | ドラッグ位置反映済みノード |
| groupStates | Record<string, DiagramGroup> | ドラッグ位置反映済みグループ |
| noteStates | Record<string, DiagramNote> | ドラッグ位置反映済みノート |
| bendStates | Record<string, {bendX, bendY}> | エッジベンドポイント |
| layoutDirection | LayoutDirection | "auto" / "TB" / "LR" |
| isAnimating | boolean | FLIPアニメーション中フラグ |
| fitViewRequested | boolean | fitView要求フラグ |
| colorPreset | ColorPreset | カラープリセット |
| canUndo / canRedo | boolean | Undo/Redo可否 |

#### レイアウト操作

| メソッド | 説明 |
|---------|------|
| setNodeLayout(nodeId, x, y) | ノード位置を設定（グループ自動拡張付き） |
| setNodeSize(nodeId, w, h, x?, y?) | ノードサイズ変更 |
| setGroupLayout(groupId, dx, dy) | グループを相対移動（子要素も一括移動） |
| setGroupSize(groupId, w, h, x?, y?) | グループサイズ変更 |
| setNoteLayout(noteId, x, y) | ノート位置を設定 |
| multiMoveLayout(selectedIds, dx, dy) | 複数要素を一括相対移動 |

#### 要素追加・削除

| メソッド | 説明 |
|---------|------|
| addNode(shape, parentGroupId?) | ノード追加（DSLコードに行追加） |
| addNote() | ノート追加 |
| addGroup(parentGroupId?) | グループ追加 |
| addEdge(fromId, toId) | エッジ追加 |
| deleteNode(nodeId) | ノード削除（関連エッジも削除） |
| deleteGroup(groupId) | グループ削除 |
| deleteNote(noteId) | ノート削除 |
| deleteEdge(fromId, toId) | エッジ削除 |

#### 要素編集

| メソッド | 説明 |
|---------|------|
| updateNodeProp(nodeId, key, value) | ノードプロパティを正規表現でコード書き戻し |
| updateEdgeProp(fromId, toId, key, value) | エッジプロパティをコード書き戻し |
| reconnectEdge(origFrom, origTo, newFrom, newTo) | エッジ端点を変更 |
| updateEdgeBend(fromId, toId, bendX, bendY) | エッジベンドポイント更新 |

#### ユーティリティ

| メソッド | 説明 |
|---------|------|
| exportSVG() | SVGエクスポート（ダウンロード） |
| formatCode() | DSLコードフォーマット |
| resetLayout(dir?) | 全ノードを再レイアウト |
| loadTemplate(code) | テンプレートコードを読込 |
| loadSaved(code, nodeStates, groupStates, noteStates?, bendStates?) | 保存データを読込 |
| undo() / redo() | 操作履歴の移動 |
| pushSnapshot() | 現在状態をスナップショット保存 |

## 動作仕様

### 二層ステートモデル

```
Layer 1: code (DSL文字列)
  ↓ parseDSL()
  ↓ syncNodes/syncGroups/syncNotes
Layer 2: nodeStates / groupStates / noteStates (位置・サイズ)
  ↓ autoLayout() (for _needsPosition nodes)
  ↓ enforceGroupContainment()
Final: parsed (表示用 ParseResult)
```

- **code 層**: DSL文字列。コードエディタ入力、ドラッグ書き戻し、要素追加/削除で更新
- **位置層**: ドラッグ/リサイズで直接更新。code変更時はsync関数で同期

### 同期処理

#### syncNodes(parsedNodes, prevStates) → nodeStates

- 新規ノード: デフォルト値で初期化、x/y未指定なら `_needsPosition: true`
- 既存ノード: `_explicitProps` に含まれるプロパティのみコードから更新、それ以外は位置層を維持
- アイコン追加/削除時: デフォルトサイズを変更（icon有: 80×68, 無: 150×60）
- グループ変更時: `_needsPosition: true` で再配置

#### syncGroups(parsedGroups, prevStates) → groupStates

- 既存グループ: x/y/w/h は位置層を維持、label/color/parentGroup はコードから更新
- 新規子グループ: 親グループの左上 + パディングに配置
- 新規ルートグループ: パース値をそのまま使用

#### syncNotes(parsedNotes, prevStates) → noteStates

- 既存ノート: x/y は位置層を維持、text/color はコードから更新
- 新規ノート: パース値を使用

### Undo/Redo

- スナップショット方式: `{ code, nodeStates, groupStates, noteStates, bendStates }` を保存
- undoStack / redoStack をRefで管理
- コード編集は300msデバウンスでスナップショット作成
- ドラッグ終了時に pushSnapshot() を呼び出し

### グループ自動拡張

setNodeLayout() でノードがグループ境界を超えた場合、グループを自動拡張:
- 上: `group.y = node.y - GROUP_LABEL_HEIGHT - GROUP_PADDING`
- 左: `group.x = node.x - GROUP_PADDING`
- 右: `group.w = (node.x + node.w + GROUP_PADDING) - group.x`
- 下: `group.h = (node.y + node.h + GROUP_PADDING) - group.y`

## 関連ファイル

- `app/lib/react/hooks/useDiagramState.ts`
- `app/lib/react/hooks/syncNodes.ts`
- `app/lib/react/hooks/syncGroups.ts`
- `app/lib/react/hooks/syncNotes.ts`
```

**Step 1: state-management.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/state-management.md
git commit -m "docs: add state management specification"
```

---

### Task 7: drag-interaction.md 作成

**Files:**
- Create: `docs/specs/drag-interaction.md`

**内容:**

```markdown
# ドラッグ操作仕様

## 概要

ノード・グループ・エッジ・ノートのマウス/タッチドラッグ操作、キャンバスのズーム/パン、範囲選択を管理する。

## フック一覧

### useNodeDrag

- **シグネチャ**: `useNodeDrag(nodeById, zoom, selectedIds, setNodeLayout, setNodeSize, onMultiMove, onDragEnd?)`
- **出力**: `{ handleNodeMouseDown, handleNodeResizeMouseDown, handleNodeTouchStart }`

**ドラッグ種類:**
- **Move（単体）**: 初期位置からの絶対delta計算 → `setNodeLayout(nodeId, startX + dx, startY + dy)`
- **Move（複数選択）**: 前回位置からの相対delta計算 → `onMultiMove(dx, dy)`
- **Resize**: ハンドル方向に応じたサイズ変更 → `setNodeSize()`
  - ハンドル: n, s, e, w, se

**座標変換**: `delta = (clientX - startX) / zoom`
**閾値**: マウス1px、タッチ3px

### useGroupDrag

- **シグネチャ**: `useGroupDrag(groupById, zoom, selectedIds, setGroupLayout, setGroupSize, onMultiMove, onDragEnd?)`
- **出力**: `{ handleGroupMoveMouseDown, handleGroupMoveTouchStart, handleGroupResizeMouseDown, handleGroupResizeTouchStart }`

**ドラッグ種類:**
- **Move**: 前回位置からの相対delta計算 → `setGroupLayout(groupId, dx, dy)`
- **Resize**: ハンドル方向に応じたサイズ変更（最小 w=120, h=80）→ `setGroupSize()`
  - ハンドル: n, w, e, s, se

### useEdgeDrag

- **シグネチャ**: `useEdgeDrag(nodeById, edges, zoom, updateEdgeBend, reconnectEdge, svgRef, panRef, onDragEnd?)`
- **出力**: `{ edgeDragInfo, handleEdgeMoveMouseDown, handleEdgeEndpointMouseDown }`

**ドラッグ種類:**
- **Bend**: エッジ中央のベンドポイント移動 → `updateEdgeBend(fromId, toId, bendX, bendY)`
  - 座標: スクリーンピクセル / zoom
- **Reconnect**: エッジ端点を別ノードに接続変更 → `reconnectEdge()`
  - 座標: SVGキャンバス座標（pan考慮: `(clientX - rect.left - panRef.x) / zoom`）
  - マウスアップ時にヒットテスト → 対象ノード検出

### useEdgeCreation

- **シグネチャ**: `useEdgeCreation(nodeById, zoom, addEdge, svgRef, panRef)`
- **出力**: `{ edgeCreationDragInfo, handleConnectionPointMouseDown }`

**動作**: ノードの接続ポイントからドラッグ開始 → マウスアップ時にヒットテスト → `addEdge(fromId, targetId)`
- 座標: SVGキャンバス座標（pan考慮）

### useCanvasInteraction

- **シグネチャ**: `useCanvasInteraction(svgRef, svgGroupRef, gridRef, gridLargeRef)`
- **出力**: `{ zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView }`

**操作:**
- **Ctrl+ホイール/トラックパッド**: ズーム（0.2〜3.0、画面中心基準）
- **2本指スクロール**: パン（deltaX/Y）
- **Space+ドラッグ**: パン
- **タッチ1本指（背景のみ）**: パン
- **タッチ2本指ピンチ**: ズーム

**fitView(nodes, groups)**:
1. 全ノード・グループのバウンディングボックスを計算
2. 40pxパディングで収まるズーム率を算出
3. コンテンツを中心に配置

**applyPanDirect(x, y)**: SVGグループとグリッドパターンの transform を直接更新（React再レンダリング回避）

### useMultiSelect

- **シグネチャ**: `useMultiSelect()`
- **出力**: `{ selectedIds, setSelectedIds, selectionRect, startSelectionRect, updateSelectionRect, endSelectionRect, clearSelection, selectSingle, isSelected }`

**動作**: 背景ドラッグで選択矩形を描画 → 矩形内のノード・グループ・ノートを選択
- 最小矩形サイズ: 4px（ノイズ除去）

## 座標系

| 座標系 | 用途 | 変換 |
|-------|------|------|
| スクリーン座標 | マウスイベント clientX/Y | 入力 |
| キャンバス座標 | SVG内の実座標 | `(clientX - rect.left - pan.x) / zoom` |
| デルタ座標 | 移動量 | `(clientX - prevX) / zoom` |

## 関連ファイル

- `app/lib/react/hooks/useNodeDrag.ts`
- `app/lib/react/hooks/useGroupDrag.ts`
- `app/lib/react/hooks/useEdgeDrag.ts`
- `app/lib/react/hooks/useEdgeCreation.ts`
- `app/lib/react/hooks/useCanvasInteraction.ts`
- `app/lib/react/hooks/useMultiSelect.ts`
- `app/lib/react/DiagramEditor.tsx`（ノートドラッグ部分）
```

**Step 1: drag-interaction.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/drag-interaction.md
git commit -m "docs: add drag interaction specification"
```

---

### Task 8: svg-export.md 作成

**Files:**
- Create: `docs/specs/svg-export.md`

**内容:**

```markdown
# SVGエクスポート仕様

## 概要

ParseResult からスタンドアロンの SVG 文字列を生成する。ファイルダウンロード用。

## API

### generateExportSVG

- **シグネチャ**: `generateExportSVG(parsed: ParseResult): string | null`
- **入力**: パース済みダイアグラムデータ
- **出力**: SVG文字列。ノードが存在しない場合は `null`

### escapeXml

- **シグネチャ**: `escapeXml(str: string | undefined): string`
- **エスケープ対象**: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&apos;`

## 動作仕様

### SVG構造

1. バウンディングボックス集約: 全ノード・グループ・ノートの外接矩形（±10px マージン）
2. viewBox: `minX-20 minY-20 svgW+40 svgH+40`（40px パディング）
3. 背景: `#0a0c12`（ダークテーマ）

### 描画順序

1. **グループ**: 角丸破線矩形 + ラベルテキスト
2. **ノート**: 角丸矩形 + テキスト
3. **エッジ**: パス + マーカー（矢印） + ラベル（背景付き）
4. **ノード**: シェイプ別描画

### ノード描画

| シェイプ | SVG要素 |
|---------|---------|
| ellipse/circle | `<ellipse>` |
| cylinder | `<path>` (本体) + `<ellipse>` (上面) |
| getShapePath 対応シェイプ | `<path>` |
| rect (デフォルト) | `<rect>` |

### エッジ描画

- **矢印マーカー**: SVG `<marker>` 定義。start/end/both に応じて marker-start/marker-end 付与
- **破線**: `stroke-dasharray="6,3"`
- **アニメーション**: エクスポートSVGでは非対応（静的SVG）
- **ラベル**: 背景矩形（#0f172a, opacity 0.85）+ テキスト

### アイコン対応

icon プロパティ指定時、SVG `<image>` で `/icons/{category}/{name}.svg` を参照。

## 関連ファイル

- `app/lib/core/svg-export.ts`
- `app/lib/core/geometry.ts`（getShapePath, getEdgePoints, buildEdgePath を使用）
```

**Step 1: svg-export.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/svg-export.md
git commit -m "docs: add SVG export specification"
```

---

### Task 9: editor-components.md 作成

**Files:**
- Create: `docs/specs/editor-components.md`

**内容:**

```markdown
# UIコンポーネント仕様

## 概要

ダイアグラムの描画・編集・操作を行うReactコンポーネント群。

## コンポーネント一覧

### DiagramEditor

メインコンポーネント。コードエディタとSVGキャンバスを統合。

- **Props**: `{ state: DiagramState, className?: string, style?: CSSProperties }`
- **レスポンシブ**: デスクトップ=左右分割（コード|キャンバス）、モバイル=キャンバスのみ+BottomSheet
- **キーボードショートカット**:
  - Cmd+Z / Cmd+Shift+Z: Undo/Redo
  - Cmd+A: 全選択
  - Delete/Backspace: 選択要素削除
  - Escape: 選択解除
- **FLIPアニメーション**: autoLayout 前後の位置差分で transform 補間

### ShapeNode

ノードをSVGで描画。9シェイプ対応。

- **Props**: `{ node, isSelected, isEdgeSource?, onMouseDown, onResizeMouseDown?, onTouchStart?, onTap?, onDoubleClick?, onConnectionPointMouseDown?, edgeCreationActive? }`
- **テキスト折り返し**: ノード幅に応じて自動改行（charWidth ≈ 13 × 0.55）
- **リサイズハンドル**: 5方向（N, S, E, W, SE）、可視ハンドル + 拡大タッチターゲット
- **接続ポイント**: 4方向（上下左右）、ホバー時に表示

### EdgeLine

エッジをSVGパスで描画。

- **Props**: `{ edge, fromNode, toNode, onMoveMouseDown?, onEndpointMouseDown?, onDoubleClick? }`
- **ヒットエリア**: 透明な太パス（14px）でクリック/ドラッグ検出
- **矢印マーカー**: SVG marker でエッジ色に対応した矢印を描画
- **ラベル**: パス中点に背景付きテキスト

### GroupBox

グループコンテナをSVG矩形で描画。

- **Props**: `{ group, isSelected?, isNested?, onMoveMouseDown, onMoveTouchStart?, onResizeMouseDown, onResizeTouchStart? }`
- **ネスト対応**: isNested=true でヘッダーストリップ + 枠線エリアのグラブゾーン
- **リサイズハンドル**: 5方向（N, W, E, S, SE）

### NoteBox

付箋メモをSVG矩形で描画。

- **Props**: `{ note, isSelected?, onMouseDown?, onTouchStart?, onDoubleClick? }`
- **自動幅計算**: `text.length × 7 + 16`（最小80px）
- **固定高**: 28px

### CodeEditor

DSLコードエディタ。シンタックス強調・オートコンプリート付き。

- **Props**: `{ code, onChange, errors, onFormat, existingIds?, focusLine? }`
- **構造**: textarea + シンタックスハイライトオーバーレイ + 行番号
- **オートコンプリート**: getCompletionContext/getCompletionItems で補完候補表示。Tab/Enterで確定、矢印キーで選択、Escで閉じる
- **エディタショートカット**:
  - Cmd+Z/Shift+Z: エディタ内Undo/Redo（独自スタック、300msマージ）
  - Cmd+X: 行カット
  - Alt+矢印: 行移動
  - Tab: 2スペース挿入
  - `{`: ブレースペア自動挿入
  - `"`: クォートペア自動挿入
  - Enter: スマートインデント

### Toolbar

操作ツールバー。

- **Props**: `{ onAddNode, onAddNote, onAddGroup, onExportSVG, onZoomIn, onZoomOut, onFitView, onResetLayout, layoutDirection, colorPreset, onSetColorPreset, canUndo?, canRedo?, onUndo?, onRedo?, isMobile? }`
- **機能**: シェイプ追加（9種）、ノート追加、グループ追加、Undo/Redo、ズーム±、fitView、レイアウト方向切替、カラープリセット切替、SVGエクスポート

### Minimap

キャンバスの小地図。

- **Props**: `{ nodes, viewBox, canvasW, canvasH }`
- **サイズ**: 160×100px、右下配置
- **描画**: 全ノードの縮小矩形 + ビューポート矩形

### SyntaxPanel

DSL構文ヘルプパネル。

- **Props**: `{ onClose }`
- **レスポンシブ**: モバイル=フルスクリーンオーバーレイ、デスクトップ=420px幅パネル

### AutocompleteDropdown

オートコンプリートドロップダウン。

- **Props**: `{ items, selectedIndex, position, onSelect }`
- **自動スクロール**: 選択項目を表示範囲内にスクロール

### BottomSheet / NodeBottomSheet

モバイル向けボトムシート。

- **BottomSheet Props**: `{ open, onClose, title?, children }`
- **NodeBottomSheet Props**: `{ node, edges, open, onClose, onUpdateProp, onUpdateEdgeProp, onDeleteEdge, onDelete, onStartEdge }`
- **NodeBottomSheet 機能**: ラベル編集、シェイプ選択（9種グリッド）、カラー選択、接続エッジ一覧、エッジ追加、ノード削除

## 関連ファイル

- `app/lib/react/DiagramEditor.tsx`
- `app/lib/react/components/` 配下の全ファイル
```

**Step 1: editor-components.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/editor-components.md
git commit -m "docs: add editor components specification"
```

---

### Task 10: persistence.md 作成

**Files:**
- Create: `docs/specs/persistence.md`

**内容:**

```markdown
# 保存・読込・テンプレート仕様

## 概要

ダイアグラムの localStorage 永続化とテンプレートからの新規作成を管理する。

## API

### useLocalDiagrams

- **シグネチャ**: `useLocalDiagrams(): { savedDiagrams, saveDiagram, deleteDiagram, renameDiagram }`

| メソッド | シグネチャ | 説明 |
|---------|-----------|------|
| saveDiagram | `(name, id, code, nodeStates, groupStates, noteStates, bendStates) → SavedDiagram` | 保存（既存IDは上書き） |
| deleteDiagram | `(id) → void` | 削除 |
| renameDiagram | `(id, name) → void` | 名前変更 |

### SavedDiagram 型

```typescript
{
  id: string;           // UUID
  name: string;         // 表示名
  code: string;         // DSLコード
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;
  noteStates: Record<string, DiagramNote>;
  bendStates?: Record<string, { bendX: number; bendY: number }>;
  savedAt: number;      // タイムスタンプ
}
```

### localStorage

- **キー**: `diagramcraft_saved_diagrams`
- **値**: `SavedDiagram[]` のJSON文字列
- **SSR対応**: サーバーサイドでは空配列を返す

## テンプレート

### TEMPLATES 定数

- **場所**: `app/data/templates.ts`
- **型**: `Record<string, string>`（テンプレート名 → DSLコード）

| テンプレート名 | 内容 |
|--------------|------|
| flowchart | フローチャート |
| sequence | シーケンス図 |
| architecture | システムアーキテクチャ |
| serverless | サーバーレス構成 |
| data-pipeline | データパイプライン |
| mindmap | マインドマップ |
| state | 状態遷移図 |
| empty | 空テンプレート |

### loadTemplate / loadSaved

DiagramState のメソッド:

- **loadTemplate(code)**: コードを設定し、全ステートをリセット、fitView要求
- **loadSaved(code, nodeStates, groupStates, noteStates?, bendStates?)**: 保存データから全ステートを復元、fitView要求

## 保存フロー（diagram.tsx）

1. Cmd+S → 保存処理開始
2. ID未設定（新規）→ SaveModal 表示 → 名前入力 → saveDiagram()
3. ID設定済み（更新）→ 直接 saveDiagram() で上書き
4. 保存完了 → トースト通知表示

## 関連ファイル

- `app/hooks/useLocalDiagrams.ts`
- `app/data/templates.ts`
- `app/routes/diagram.tsx`
- `app/components/SaveModal.tsx`
```

**Step 1: persistence.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/persistence.md
git commit -m "docs: add persistence specification"
```

---

### Task 11: colors.md 作成

**Files:**
- Create: `docs/specs/colors.md`

**内容:**

```markdown
# カラーシステム仕様

## 概要

ダイアグラム要素の配色を管理する。5つのカラープリセットとランダム/ID連動の色割り当てを提供。

## API

### 型

- **ColorPreset**: `"default" | "pastel" | "monochrome" | "ocean" | "neon"`

### 定数

#### VIBRANT_COLORS

18色のデフォルトパレット配列（COLOR_PRESETS.default.colors と同一）。

#### COLOR_PRESETS

| プリセット | 色数 | 特徴 |
|-----------|------|------|
| default | 18 | ビビッドカラー（インディゴ～青） |
| pastel | 16 | パステルトーン |
| monochrome | 8 | グレースケール |
| ocean | 12 | 青/ティール/紫系 |
| neon | 14 | ネオンカラー |

### 関数

#### randomColor

- **シグネチャ**: `randomColor(preset?: ColorPreset): string`
- **動作**: プリセットの配列からランダムに1色選択

#### colorForId

- **シグネチャ**: `colorForId(id: string, preset?: ColorPreset): string`
- **動作**: IDの文字列ハッシュから一貫した色を返す
- **アルゴリズム**: `hash = ((hash << 5) - hash + charCode) | 0` → `colors[abs(hash) % colors.length]`
- **用途**: parseDSL でノード/グループに色未指定時のデフォルト色

#### randomPosition

- **シグネチャ**: `randomPosition(existingNodes: Pick<DiagramNode, "x"|"y"|"w"|"h">[], w?: number, h?: number): { x: number, y: number }`
- **動作**: 既存ノードと重ならない位置をランダム探索（最大80試行）
- **用途**: addNode で新規ノードの初期位置決定

## 関連ファイル

- `app/lib/core/colors.ts`
```

**Step 1: colors.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/colors.md
git commit -m "docs: add color system specification"
```

---

### Task 12: README.md（索引）作成

**Files:**
- Create: `docs/specs/README.md`

**内容:**

```markdown
# Diagram Editor 仕様書

## プロジェクト概要

DSLベースのダイアグラムエディタ。テキストでノード・エッジ・グループ・ノートを記述し、リアルタイムにSVG描画する。自動レイアウト、ドラッグ操作、コード書き戻し、Undo/Redo、SVGエクスポート、localStorage永続化をサポート。

## データフロー

```
code (DSL文字列)
  → parseDSL()
  → syncNodes/syncGroups/syncNotes (コード⇔位置層の同期)
  → autoLayout() (_needsPosition ノードの自動配置)
  → SVG描画
```

## 仕様書一覧

| ファイル | 内容 |
|---------|------|
| [dsl-syntax.md](./dsl-syntax.md) | DSL文法仕様 — node, edge, group, note, style, comment の構文とプロパティ |
| [parser.md](./parser.md) | パーサー仕様 — parseDSL, parseProps, エラー検出, デフォルト値 |
| [layout.md](./layout.md) | レイアウトエンジン — dagre/force レイアウト, 方向, グループ対応 |
| [geometry.md](./geometry.md) | ジオメトリ計算 — シェイプパス生成, エッジ接続点, パス構築 |
| [state-management.md](./state-management.md) | ステート管理 — 二層モデル, 同期, Undo/Redo, DiagramState API |
| [drag-interaction.md](./drag-interaction.md) | ドラッグ操作 — ノード/グループ/エッジドラッグ, ズーム/パン, 範囲選択 |
| [svg-export.md](./svg-export.md) | SVGエクスポート — スタンドアロンSVG生成, エスケープ |
| [editor-components.md](./editor-components.md) | UIコンポーネント — DiagramEditor, ShapeNode, CodeEditor, Toolbar 等 |
| [persistence.md](./persistence.md) | 保存・読込 — localStorage永続化, テンプレート, SavedDiagram |
| [colors.md](./colors.md) | カラーシステム — 5プリセット, ランダム/ID連動色, 位置生成 |
```

**Step 1: README.md を作成**
**Step 2: コミット**

```bash
git add docs/specs/README.md
git commit -m "docs: add specs README index"
```

---

### Task 13: 最終確認

**Step 1: 全ファイルの存在確認**

```bash
ls -la docs/specs/
```

Expected: 11 files (README.md + 10 spec files)

**Step 2: dsl-syntax.md の旧パスが残っていないか確認**

```bash
ls docs/dsl-syntax.md
```

Expected: No such file (git mv で移動済み)

**Step 3: まとめコミット（必要な場合）**

全ファイルが個別コミット済みであることを確認。
