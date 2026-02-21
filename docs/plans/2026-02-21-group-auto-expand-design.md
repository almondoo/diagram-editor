# グループ自動拡張 設計ドキュメント

**日付**: 2026-02-21
**ステータス**: 承認済み

## 概要

group内のnodeをドラッグで移動させる際、groupの枠外に動かそうとしているときにgroupの枠を自動的に伸ばす機能を実装する。

## 要件

- ノードがグループ境界に達したらリアルタイムでグループを拡張する
- ノードは常にグループ内に留まる（グループ外には出せない）
- 境界に達した時点で即座に拡張する（ドロップ時ではなく）

## 変更ファイル

`packages/react/src/hooks/useDiagramState.ts` のみ

## アーキテクチャ

### 変更前（クランプロジック）

```ts
// ノードをグループ境界内に収めるクランプ
clampedX = Math.max(group.x + GROUP_PADDING, Math.min(group.x + group.w - node.w - GROUP_PADDING, x));
clampedY = Math.max(group.y + GROUP_LABEL_H + GROUP_PADDING, Math.min(group.y + group.h - node.h - GROUP_PADDING, y));
```

### 変更後（拡張ロジック）

ノードが境界に達したらグループを拡張し、ノードはグループ内の目標位置に配置する。

### 拡張条件と計算

定数：
- `GROUP_PADDING = 12`
- `GROUP_LABEL_H = 26`

各方向の拡張ロジック：

| 方向 | 条件 | グループへの変更 |
|------|------|-----------------|
| 左 | `x < group.x + GROUP_PADDING` | `group.x` を左に移動、`group.w` を拡大 |
| 右 | `x + node.w > group.x + group.w - GROUP_PADDING` | `group.w` を拡大 |
| 上 | `y < group.y + GROUP_LABEL_H + GROUP_PADDING` | `group.y` を上に移動、`group.h` を拡大 |
| 下 | `y + node.h > group.y + group.h - GROUP_PADDING` | `group.h` を拡大 |

### データフロー

```
ノードドラッグ → setNodeLayout(nodeId, x, y)
  → ノードのグループを取得
  → 各方向のはみ出しを計算
  → グループの x/y/w/h を調整（setGroupStates）
  → ノードを拡張後のグループ内に配置（setNodeStates）
```

## 制約

- ノードは常にグループ内に留まる
- グループの最小サイズは維持（120x80）
- 既存の `setGroupLayout`/`setGroupSize` との整合性を維持
