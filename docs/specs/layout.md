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
