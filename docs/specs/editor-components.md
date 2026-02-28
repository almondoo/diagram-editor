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
