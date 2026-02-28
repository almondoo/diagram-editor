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
