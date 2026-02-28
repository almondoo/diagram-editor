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
