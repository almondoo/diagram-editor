# テンプレートギャラリーページ設計

## 概要

テンプレート一覧ページ (`/templates`) を新設し、約40-50個のテンプレート（AWS中心 + AI/ML・データ基盤 + 既存テンプレート）をカテゴリ分類グリッドで表示する。既存のAppHeaderからテンプレートドロップダウンを削除する。

## データ構造

### カテゴリ

```typescript
type TemplateCategory = "aws" | "ai-data" | "flowchart" | "sequence" | "state" | "other";
```

| カテゴリID | 日本語名 | 内容 |
|---|---|---|
| `aws` | AWSアーキテクチャ | 3層Web、サーバーレス、コンテナ等 |
| `ai-data` | AI/ML・データ基盤 | Bedrock、SageMaker、データレイク等 |
| `flowchart` | フローチャート | 業務フロー、判定フロー等 |
| `sequence` | シーケンス図 | API呼び出し、認証フロー等 |
| `state` | 状態遷移図 | UI状態、注文状態等 |
| `other` | その他 | マインドマップ等 |

### テンプレート型

```typescript
interface Template {
  id: string;
  name: string;          // 日本語名
  description: string;   // 1行説明
  category: TemplateCategory;
  code: string;          // DSLコード
}
```

既存の `TEMPLATES` オブジェクト + `TEMPLATE_LABELS` マップを `Template[]` 配列に統合。

## テンプレートラインナップ

### AWS（約30個）

1. 3層Webアプリ（ALB + EC2 + RDS）
2. サーバーレスAPI（API Gateway + Lambda + DynamoDB）
3. マイクロサービス（ECS Fargate + ALB + RDS）
4. 静的サイトホスティング（S3 + CloudFront + Route53）
5. CI/CDパイプライン（CodeCommit + CodeBuild + CodeDeploy）
6. データレイク（S3 + Glue + Athena + QuickSight）
7. リアルタイムストリーミング（Kinesis + Lambda + DynamoDB）
8. コンテナオーケストレーション（EKS + ECR + ALB）
9. メッセージングシステム（SQS + SNS + Lambda）
10. IoTプラットフォーム（IoT Core + Kinesis + S3 + Lambda）
11. 機械学習パイプライン（SageMaker + S3 + Lambda + API Gateway）
12. マルチリージョンHA（Route53 + ALB + Aurora Global）
13. VPN接続（VPC + VPN Gateway + Direct Connect）
14. バッチ処理（Step Functions + Lambda + S3）
15. 監視・ログ（CloudWatch + CloudTrail + SNS）
16. WAF + Shield構成（CloudFront + WAF + ALB）
17. Cognitoユーザー認証フロー
18. EventBridgeイベント駆動アーキテクチャ
19. ElastiCache + RDS キャッシュ構成
20. S3 + Lambda画像処理パイプライン
21. ECS Blue/Greenデプロイ
22. Aurora Serverless + API Gateway
23. CloudFront + Lambda@Edge
24. Transfer Family（SFTP）+ S3
25. Redshift + Glue ETL データウェアハウス
26. AppSync GraphQL API
27. EFS + ECS 共有ストレージ
28. AWS Backup 統合バックアップ
29. Organizations マルチアカウント構成
30. DMS データベース移行
31. Transit Gateway マルチVPC接続
32. GuardDuty + Security Hub セキュリティ監視

### AI/ML・データ基盤（約10個）

33. Bedrock + Lambda AI チャットボット
34. Bedrock RAG（OpenSearch + S3 + Lambda）
35. SageMaker MLOps（Step Functions + ECR + S3）
36. Comprehend テキスト分析パイプライン
37. Rekognition 画像分析パイプライン
38. Transcribe + Comprehend 音声分析
39. データレイクハウス（S3 + Glue + Lake Formation + Athena + Redshift）
40. Databricks風データ基盤（S3 + EMR + Glue + Athena + QuickSight）
41. リアルタイムETL（Kinesis + Glue Streaming + S3 + Redshift）
42. MSK（Kafka）イベントストリーミング基盤

### 既存テンプレート（8個、カテゴリ再分類）

- flowchart → `flowchart`
- sequence → `sequence`
- architecture → `aws`
- serverless → `aws`
- data-pipeline → `ai-data`
- mindmap → `other`
- state → `state`
- empty → `other`

## ページ構造

### `/templates` ページ

```
┌──────────────────────────────────────────────┐
│  AppHeader（ロゴ + ナビ）                      │
├──────────────────────────────────────────────┤
│  テンプレートギャラリー                         │
│  [全て] [AWS] [AI/ML] [フロー] [シーケンス] ... │  ← カテゴリタブ
│                                              │
│  ■ AWSアーキテクチャ (32)                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │SVG │ │SVG │ │SVG │ │SVG │               │
│  │名前│ │名前│ │名前│ │名前│               │
│  │説明│ │説明│ │説明│ │説明│               │
│  └────┘ └────┘ └────┘ └────┘               │
│  ...                                         │
└──────────────────────────────────────────────┘
```

### カード構成

- 上部: SVGサムネイル（viewBoxでフィット）
- 中央: テンプレート名（太字）
- 下部: 1行説明文
- ホバー: ボーダーハイライト
- クリック: `/diagrams/new` へ `state: { templateCode }` で遷移

### ヘッダー変更

- AppHeaderからテンプレートドロップダウンを削除
- ホームページに「テンプレートから作成」ボタンを追加（`/templates` リンク）

## SVGサムネイルレンダリング

### 方針

`TemplateThumbnail` コンポーネントを新設:

1. `parseDSL(code)` → ノード・エッジ・グループ取得
2. `autoLayout(nodes, edges, groups)` → 座標計算
3. `getShapePath()` / `getNodeCenter()` / `getEdgePoints()` で純SVG描画
4. `viewBox` で全体をフィットさせカードサイズに縮小

既存のReactコンポーネント（`ShapeNode`、`EdgeLine`等）は使わず、純SVG要素で軽量に描画。

### パフォーマンス

- `useMemo` でパース結果キャッシュ
- IntersectionObserverで画面外カードを遅延レンダリング

## ルーティング変更

```typescript
// routes.ts に追加
route("templates", "routes/templates.tsx")
```

## ファイル構成

```
app/
├── data/templates.ts          # Template[] 配列に変更（既存 + 新規テンプレート）
├── routes/templates.tsx       # テンプレートギャラリーページ
├── components/AppHeader.tsx   # テンプレートドロップダウン削除
└── routes/home.tsx            # 「テンプレートから作成」ボタン追加
```
