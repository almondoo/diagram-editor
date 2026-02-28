# 保存・読込・テンプレート仕様

## 概要

ダイアグラムの localStorage 永続化とテンプレートからの新規作成を管理する。

## API

### useLocalDiagrams

- **シグネチャ**: `useLocalDiagrams(): { savedDiagrams, saveDiagram, deleteDiagram, renameDiagram }`

| メソッド | シグネチャ | 説明 |
|---------|-----------|------|
| saveDiagram | `(name, id, code, nodeStates, groupStates, noteStates, bendStates) → SavedDiagram` | 保存（既存IDは上書き） |
| deleteDiagram | `(id) → void` | 削除 |
| renameDiagram | `(id, name) → void` | 名前変更 |

### SavedDiagram 型

```typescript
{
  id: string;           // UUID
  name: string;         // 表示名
  code: string;         // DSLコード
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;
  noteStates: Record<string, DiagramNote>;
  bendStates?: Record<string, { bendX: number; bendY: number }>;
  savedAt: number;      // タイムスタンプ
}
```

### localStorage

- **キー**: `diagramcraft_saved_diagrams`
- **値**: `SavedDiagram[]` のJSON文字列
- **SSR対応**: サーバーサイドでは空配列を返す

## テンプレート

### TEMPLATES 定数

- **場所**: `app/data/templates.ts`
- **型**: `Record<string, string>`（テンプレート名 → DSLコード）

| テンプレート名 | 内容 |
|--------------|------|
| flowchart | フローチャート |
| sequence | シーケンス図 |
| architecture | システムアーキテクチャ |
| serverless | サーバーレス構成 |
| data-pipeline | データパイプライン |
| mindmap | マインドマップ |
| state | 状態遷移図 |
| empty | 空テンプレート |

### loadTemplate / loadSaved

DiagramState のメソッド:

- **loadTemplate(code)**: コードを設定し、全ステートをリセット、fitView要求
- **loadSaved(code, nodeStates, groupStates, noteStates?, bendStates?)**: 保存データから全ステートを復元、fitView要求

## 保存フロー（diagram.tsx）

1. Cmd+S → 保存処理開始
2. ID未設定（新規）→ SaveModal 表示 → 名前入力 → saveDiagram()
3. ID設定済み（更新）→ 直接 saveDiagram() で上書き
4. 保存完了 → トースト通知表示

## 関連ファイル

- `app/hooks/useLocalDiagrams.ts`
- `app/data/templates.ts`
- `app/routes/diagram.tsx`
- `app/components/SaveModal.tsx`
