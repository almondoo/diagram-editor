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
