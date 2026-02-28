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
