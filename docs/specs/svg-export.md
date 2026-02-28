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
