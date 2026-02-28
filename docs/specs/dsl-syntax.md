# Diagram DSL シンタックス仕様

## 概要

Diagram DSL はテキストベースでダイアグラムを記述するための軽量な言語です。
ノード、エッジ、グループ、ノート、スタイルの5つの要素で構成されます。

## パーサー内部フラグ

パーサーはノード/ノートに対して以下の内部フラグを設定します。これらは DSL 構文ではなく、パーサーが内部的に管理するメタデータです。

| フラグ | 対象 | 説明 |
|---|---|---|
| `_needsPosition` | node, note | `x`/`y` が未指定の場合に `true` が設定される。`autoLayout` による自動配置の対象マーク |
| `_explicitProps` | node | パーサーがノードごとに DSL で明示的に指定されたプロパティ名を `Set<string>` で記録。`syncNodes` がコード変更時に「コードで指定された値」と「ドラッグで変更された値」を区別するために使用 |

## プロパティの記法

すべての要素で共通するプロパティの記法:

```
key=value           # 値にスペースがない場合
key="hello world"   # 値にスペースがある場合（ダブルクォート）
```

レイアウトプロパティ（`x`, `y`, `w`, `h`）はフォーマット時に除外されますが、パース時には有効です。

---

## node（ノード）

```
node <id> "ラベル" { プロパティ }
```

### プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `shape` | string | `rect` | シェイプの種類 |
| `color` | #hex | ランダム | 背景色 |
| `text` | #hex | `#ffffff` | テキスト色 |
| `border` | #hex | color と同じ | 枠線色 |
| `borderWidth` | number | `2` | 枠線の太さ (px) |
| `icon` | string | なし | アイコン名（例: aws.service.s3, aws.service.lambda） |
| `fontSize` | number | `13` | フォントサイズ (px) |
| `opacity` | number | `1` | 不透明度 (0〜1) |
| `dashed` | boolean | `false` | 枠線を破線にする |
| `x` | number | auto | X 座標 |
| `y` | number | auto | Y 座標 |
| `w` | number | `150` | 幅 (px) |
| `h` | number | `60` | 高さ (px) |

### シェイプ一覧

`rect` `stadium` `diamond` `ellipse` `circle` `cylinder` `hexagon` `parallelogram` `trapezoid`

### 例

```
node api "API Server" { shape=rect color=#6366f1 icon=aws.service.api-gateway }
node db "Database" { shape=cylinder color=#10b981 }
node check "有効？" { shape=diamond }
```

---

## edge（エッジ）

```
edge <from> <演算子> <to> { プロパティ }
```

### 演算子

演算子によって矢印の方向と線のスタイルが決まります。

| 演算子 | 矢印方向 | 線種 | 説明 |
|---|---|---|---|
| `->` | end（順方向） | 実線 | 順方向矢印 |
| `<-` | start（逆方向） | 実線 | 逆方向矢印 |
| `<->` | both（双方向） | 実線 | 双方向矢印 |
| `-->` | end（順方向） | 破線 | 順方向破線 |
| `<--` | start（逆方向） | 破線 | 逆方向破線 |
| `<-->` | both（双方向） | 破線 | 双方向破線 |
| `--` | none（なし） | 実線 | 矢印なし |

### プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `label` | "string" | なし | エッジラベル |
| `color` | #hex | `#94a3b8` | 線の色 |
| `animate` | boolean | `false` | ダッシュアニメーション |
| `thickness` | number | `1.5` | 線の太さ (px) |
| `curve` | string | `smooth` | カーブの種類（`smooth` \| `straight`） |

### 例

```
edge a -> b                          # 順方向矢印（実線）
edge a --> b { label="非同期" }       # 順方向破線 + ラベル
edge a <-> b { color=#f97316 }       # 双方向矢印（実線）
edge a -- b                          # 矢印なし
edge a <-- b { thickness=2 }         # 逆方向破線
```

---

## group（グループ）

ノードやグループをまとめるコンテナです。ネスト可能。

### フラット構文

```
group <id> "ラベル" { プロパティ }
```

### ブロック構文（ネスト）

```
group <id> "ラベル" { プロパティ
  node <id> "ラベル" { ... }
  group <child-id> "子グループ" { ... }
}
```

### 座標の解釈

ブロック構文内のノード・子グループの `x`, `y` は**親グループからの相対座標**として解釈されます。パーサーは親グループの絶対座標（`offsetX`, `offsetY`）を加算して絶対座標に変換します。

例: 親グループが `x=100 y=50` の場合、内部ノードの `x=20 y=40` は絶対座標 `(120, 90)` に変換されます。ネストが深くなっても、各レベルで親の絶対座標がオフセットとして再帰的に加算されます。

### プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `color` | #hex | ランダム | グループの色 |
| `x` | number | `0` | X 座標 |
| `y` | number | `0` | Y 座標 |
| `w` | number | `300` | 幅 (px) |
| `h` | number | `200` | 高さ (px) |

### 例

```
group backend "Backend" { color=#6366f1
  node api "FastAPI" { shape=rect x=20 y=40 }
  node worker "Worker" { shape=rect x=20 y=120 }
}
```

---

## note（ノート）

ダイアグラムに注釈テキストを追加します。

```
note <id> "テキスト" { プロパティ }
```

### プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `color` | #hex | `#fbbf24` | ノートの色 |
| `x` | number | auto | X 座標 |
| `y` | number | auto | Y 座標 |

### 例

```
note n1 "id, name, email, created_at"
note n2 "注意: このAPIは非推奨です" { color=#ef4444 x=200 y=100 }
```

---

## style（スタイル上書き）

既に定義されたノードのプロパティを後から上書きします。

```
style <nodeId> { プロパティ }
```

### 対応プロパティ

| プロパティ | 説明 |
|---|---|
| `color` | 背景色 |
| `shape` | シェイプ |
| `border` | 枠線色 |
| `borderWidth` | 枠線の太さ (px) |
| `text` | テキスト色 |

### 例

```
node a "A" { shape=rect }
style a { color=#ef4444 shape=diamond }
```

---

## コメント

```
// スラッシュ2つでコメント
# ハッシュでもコメント
```

---

## 完全な例

```
// システムアーキテクチャ
group frontend "Frontend" {
  node react "React App" { shape=rect }
  node nginx "Nginx" { shape=hexagon }
}
group backend "Backend" {
  node api "FastAPI" { shape=rect icon=aws.service.api-gateway }
  node worker "Celery Worker" { shape=rect icon=aws.service.lambda }
}
group data "Data Layer" {
  node pg "PostgreSQL" { shape=cylinder }
  node redis "Redis" { shape=hexagon icon=aws.service.elasticache }
}

edge react -> nginx { label="Proxy" }
edge nginx -> api { label="REST" animate=true }
edge api --> worker { label="Task" }
edge api -> pg { label="SQL" }
edge api -> redis { label="Cache" }
edge worker --> pg { label="Write" }
edge worker --> redis { label="Queue" }
```
