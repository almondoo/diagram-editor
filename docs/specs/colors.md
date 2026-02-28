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
