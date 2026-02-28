# テンプレートギャラリー実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** テンプレート一覧ページ (`/templates`) を新設し、約40-50個のテンプレートをカテゴリ分類グリッドで表示する。AppHeaderからテンプレートドロップダウンを削除する。

**Architecture:** `app/data/templates.ts` を `Template[]` 配列に変更し、カテゴリ・名前・説明を付与。新規 `routes/templates.tsx` でカテゴリタブ付きグリッド表示。各カードは `parseDSL` + `autoLayout` + `generateExportSVG` を活用してSVGサムネイルを描画する。サムネイルは既存の `generateExportSVG` の文字列SVGを `dangerouslySetInnerHTML` で表示。

**Tech Stack:** React, React Router v7, TypeScript, Tailwind CSS v4, 既存のcore モジュール（parseDSL, autoLayout, generateExportSVG）

---

### Task 1: テンプレートデータ構造の変更

**Files:**
- Modify: `app/data/templates.ts`

**Step 1: Template型を定義し、既存テンプレートを新構造に変換**

`app/data/templates.ts` を全面書き換え。既存の `TEMPLATES: Record<string, string>` と `TEMPLATE_LABELS` を統合し、`Template[]` 配列に変更する。

```typescript
export type TemplateCategory = "aws" | "ai-data" | "flowchart" | "sequence" | "state" | "other";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  code: string;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  aws: "AWSアーキテクチャ",
  "ai-data": "AI/ML・データ基盤",
  flowchart: "フローチャート",
  sequence: "シーケンス図",
  state: "状態遷移図",
  other: "その他",
};

export const TEMPLATES: Template[] = [
  // 既存テンプレート（8個、カテゴリ再分類）
  {
    id: "flowchart",
    name: "フローチャート",
    description: "基本的なフローチャート（開始→処理→判定→終了）",
    category: "flowchart",
    code: `...既存のflowchartコード...`,
  },
  // ...他の既存テンプレート
  // ...新規AWSテンプレート（約30個）
  // ...新規AI/MLテンプレート（約10個）
];
```

既存の `architecture` と `serverless` は `category: "aws"` に分類。
既存の `data-pipeline` は `category: "ai-data"` に分類。
`empty` は `category: "other"` に分類。

**Step 2: 既存テンプレートの参照箇所を更新**

`TEMPLATES` の型が変わるため、参照箇所を更新する必要がある：

- `app/components/AppHeader.tsx` — テンプレートドロップダウン（Task 3で削除する）
- `app/routes/diagram.tsx:25` — `TEMPLATES.architecture` → `TEMPLATES.find(t => t.id === "architecture")!.code`

`diagram.tsx` の変更:
```typescript
// Before:
const state = useDiagramState(
  initialDiagram?.code ?? templateCode ?? TEMPLATES.architecture
);

// After:
const defaultCode = TEMPLATES.find(t => t.id === "architecture")!.code;
const state = useDiagramState(
  initialDiagram?.code ?? templateCode ?? defaultCode
);
```

**Step 3: 新規AWSテンプレートを追加（約30個）**

各テンプレートは既存テンプレートのスタイルに合わせて作成。利用可能なAWSアイコン:

- `aws.service.elb`, `aws.service.ec2`, `aws.service.rds`, `aws.service.aurora`
- `aws.service.s3`, `aws.service.cloudfront`, `aws.service.api-gateway`
- `aws.service.lambda`, `aws.service.dynamodb`, `aws.service.ecs`
- `aws.service.eks`, `aws.service.ecr`, `aws.service.fargate`
- `aws.service.sqs`, `aws.service.sns`, `aws.service.eventbridge`
- `aws.service.step-functions`, `aws.service.cognito`
- `aws.service.cloudwatch`, `aws.service.cloudtrail`
- `aws.service.waf`, `aws.service.shield`
- `aws.service.kinesis`, `aws.service.data-firehose`
- `aws.service.glue`, `aws.service.athena`, `aws.service.redshift`
- `aws.service.quicksight`, `aws.service.emr`
- `aws.service.sagemaker`, `aws.service.bedrock`
- `aws.service.comprehend`, `aws.service.rekognition`, `aws.service.transcribe`
- `aws.service.iot-core`, `aws.service.msk`
- `aws.service.codebuild`, `aws.service.codedeploy`, `aws.service.codepipeline`, `aws.service.codecommit`
- `aws.service.elasticache`, `aws.service.efs`
- `aws.service.backup`, `aws.service.organizations`, `aws.service.dms`
- `aws.service.tgw`, `aws.service.guardduty`, `aws.service.security-hub`
- `aws.service.route-53`, `aws.service.vpc`
- `aws.service.appsync`, `aws.service.transfer-family`
- `aws.service.opensearch-service`, `aws.service.lake-formation`
- `aws.resource.vpc.nat-gateway` (resourceカテゴリ)

新規テンプレートの一覧:
1. `aws-3tier` — 3層Webアプリ（ALB + EC2 + RDS）
2. `aws-serverless-api` — サーバーレスAPI（API Gateway + Lambda + DynamoDB）
3. `aws-microservices` — マイクロサービス（ECS Fargate + ALB + RDS）
4. `aws-static-site` — 静的サイトホスティング（S3 + CloudFront + Route53）
5. `aws-cicd` — CI/CDパイプライン（CodeCommit + CodeBuild + CodeDeploy）
6. `aws-data-lake` — データレイク（S3 + Glue + Athena + QuickSight）
7. `aws-streaming` — リアルタイムストリーミング（Kinesis + Lambda + DynamoDB）
8. `aws-eks` — コンテナオーケストレーション（EKS + ECR + ALB）
9. `aws-messaging` — メッセージングシステム（SQS + SNS + Lambda）
10. `aws-iot` — IoTプラットフォーム（IoT Core + Kinesis + S3 + Lambda）
11. `aws-ml-pipeline` — 機械学習パイプライン（SageMaker + S3 + Lambda + API Gateway）
12. `aws-multi-region` — マルチリージョンHA（Route53 + ALB + Aurora Global）
13. `aws-vpn` — VPN接続（VPC + VPN Gateway + Direct Connect）
14. `aws-batch` — バッチ処理（Step Functions + Lambda + S3）
15. `aws-monitoring` — 監視・ログ（CloudWatch + CloudTrail + SNS）
16. `aws-waf` — WAF + Shield構成（CloudFront + WAF + ALB）
17. `aws-cognito` — Cognitoユーザー認証フロー
18. `aws-eventbridge` — EventBridgeイベント駆動アーキテクチャ
19. `aws-cache` — ElastiCache + RDS キャッシュ構成
20. `aws-image-processing` — S3 + Lambda画像処理パイプライン
21. `aws-blue-green` — ECS Blue/Greenデプロイ
22. `aws-aurora-serverless` — Aurora Serverless + API Gateway
23. `aws-edge` — CloudFront + Lambda@Edge
24. `aws-sftp` — Transfer Family（SFTP）+ S3
25. `aws-dwh` — Redshift + Glue ETL データウェアハウス
26. `aws-graphql` — AppSync GraphQL API
27. `aws-shared-storage` — EFS + ECS 共有ストレージ
28. `aws-backup` — AWS Backup 統合バックアップ
29. `aws-organizations` — Organizations マルチアカウント構成
30. `aws-dms` — DMS データベース移行
31. `aws-transit-gateway` — Transit Gateway マルチVPC接続
32. `aws-security` — GuardDuty + Security Hub セキュリティ監視

**Step 4: 新規AI/ML・データ基盤テンプレートを追加（約10個）**

33. `ai-chatbot` — Bedrock + Lambda AI チャットボット
34. `ai-rag` — Bedrock RAG（OpenSearch + S3 + Lambda）
35. `ai-mlops` — SageMaker MLOps（Step Functions + ECR + S3）
36. `ai-text-analysis` — Comprehend テキスト分析パイプライン
37. `ai-image-analysis` — Rekognition 画像分析パイプライン
38. `ai-speech` — Transcribe + Comprehend 音声分析
39. `data-lakehouse` — データレイクハウス（S3 + Glue + Lake Formation + Athena + Redshift）
40. `data-emr` — EMRベースデータ基盤（S3 + EMR + Glue + Athena + QuickSight）
41. `data-realtime-etl` — リアルタイムETL（Kinesis + Glue Streaming + S3 + Redshift）
42. `data-kafka` — MSK（Kafka）イベントストリーミング基盤

**Step 5: typecheck を実行して型エラーがないか確認**

Run: `docker compose exec app pnpm typecheck`
Expected: 成功（型エラーなし）

**Step 6: コミット**

```bash
git add app/data/templates.ts app/routes/diagram.tsx
git commit -m "feat: restructure templates data with categories and add 40+ templates"
```

---

### Task 2: テンプレートギャラリーページの作成

**Files:**
- Create: `app/routes/templates.tsx`
- Modify: `app/routes.ts`

**Step 1: ルート追加**

`app/routes.ts` に `/templates` ルートを追加:

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("templates", "routes/templates.tsx"),
  route("diagrams/new", "routes/diagram.tsx", { id: "diagram-new" }),
  route("diagrams/:id", "routes/diagram.tsx", { id: "diagram-edit" }),
] satisfies RouteConfig;
```

**Step 2: テンプレートギャラリーページを作成**

`app/routes/templates.tsx` を新規作成:

- ヘッダー: ロゴ + 「マイ作品」リンク（ホームページと同様のスタイル）
- カテゴリタブ: 「全て」+ 各カテゴリ。選択中のタブはハイライト
- テンプレートグリッド: カテゴリ別セクション、各カードにSVGサムネイル + 名前 + 説明
- クリック: `navigate("/diagrams/new", { state: { templateCode: template.code } })`

SVGサムネイルは `generateExportSVG` を使用:
```typescript
import { parseDSL, autoLayout, generateExportSVG } from "~/lib/core";

function TemplateThumbnail({ code }: { code: string }) {
  const svgHtml = useMemo(() => {
    const parsed = parseDSL(code);
    // _needsPosition を全ノードに設定してレイアウト実行
    parsed.nodes.forEach(n => { n._needsPosition = true; });
    autoLayout(parsed.nodes, parsed.edges, parsed.groups);
    return generateExportSVG(parsed);
  }, [code]);

  if (!svgHtml) return null;
  return <div dangerouslySetInnerHTML={{ __html: svgHtml }} />;
}
```

注意: `dangerouslySetInnerHTML` を使うが、入力は自前のDSLパーサー出力のみで外部入力なし。

サムネイルのサイズ:
- カードの上部に表示、`aspect-ratio: 16/10` で固定
- SVGは `width: 100%`, `height: 100%` にスケール
- `overflow: hidden` でクリッピング

遅延レンダリング:
- IntersectionObserver でビューポート内のカードのみSVG生成
- `useState` + `useEffect` + `useRef` で実装

**Step 3: typecheck → lint を実行**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint`
Expected: 成功

**Step 4: コミット**

```bash
git add app/routes/templates.tsx app/routes.ts
git commit -m "feat: add template gallery page at /templates"
```

---

### Task 3: AppHeaderからテンプレートドロップダウンを削除

**Files:**
- Modify: `app/components/AppHeader.tsx`
- Modify: `app/routes/diagram.tsx`

**Step 1: AppHeader からテンプレートドロップダウンを削除**

`AppHeader.tsx` の変更:
- `onCreateFromTemplate` prop を削除
- `TEMPLATES` import を削除
- `TEMPLATE_LABELS` を削除
- テンプレートドロップダウンのUI全体（行71-114）を削除
- `showTemplates` state を削除
- ドロップダウン閉じ用の `useEffect`（行36-44）を削除

変更後の `AppHeaderProps`:
```typescript
interface AppHeaderProps {
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;
  onRenameDiagram?: (name: string) => void;
}
```

**Step 2: diagram.tsx の AppHeader 呼び出しから `onCreateFromTemplate` を削除**

```typescript
// Before:
<AppHeader
  onCreateFromTemplate={(code) => {
    void navigate("/diagrams/new", { state: { templateCode: code } });
  }}
  onSave={handleSave}
  ...
/>

// After:
<AppHeader
  onSave={handleSave}
  ...
/>
```

`diagram.tsx` から `navigate` の `onCreateFromTemplate` 用途の使用がなくなるが、`handleModalSave` の `navigate` は残る。

**Step 3: typecheck → lint → build を実行**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint && docker compose exec app pnpm build`
Expected: 成功

**Step 4: コミット**

```bash
git add app/components/AppHeader.tsx app/routes/diagram.tsx
git commit -m "feat: remove template dropdown from AppHeader"
```

---

### Task 4: ホームページにテンプレートリンクを追加

**Files:**
- Modify: `app/routes/home.tsx`

**Step 1: 「テンプレートから作成」ボタンを追加**

ホームページの「+ 新規作成」ボタンの隣に「テンプレートから作成」リンクを追加:

```tsx
<div className="flex gap-2">
  <Link
    to="/diagrams/new"
    className="bg-primary-darker border border-primary-dark text-primary-lighter px-4 py-1.5 rounded-md cursor-pointer text-[13px] font-semibold no-underline inline-flex items-center gap-1.5"
  >
    + 新規作成
  </Link>
  <Link
    to="/templates"
    className="bg-transparent border border-border-subtle text-text-muted px-4 py-1.5 rounded-md cursor-pointer text-[13px] font-semibold no-underline inline-flex items-center gap-1.5 hover:border-primary-dark hover:text-primary-lighter transition-colors"
  >
    テンプレート
  </Link>
</div>
```

**Step 2: typecheck → lint → build を実行**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint && docker compose exec app pnpm build`
Expected: 成功

**Step 3: コミット**

```bash
git add app/routes/home.tsx
git commit -m "feat: add template gallery link to home page"
```

---

### Task 5: 動作確認とビルド検証

**Step 1: 開発サーバーで動作確認**

確認項目:
1. `/templates` ページが表示される
2. カテゴリタブが機能する（全て / AWS / AI/ML / フロー / シーケンス / 状態 / その他）
3. SVGサムネイルが各カードに表示される
4. テンプレートカードをクリックすると `/diagrams/new` に遷移しDSLコードがロードされる
5. AppHeaderにテンプレートドロップダウンが表示されない
6. ホームページに「テンプレート」ボタンが表示される
7. ホームの「テンプレート」ボタンから `/templates` に遷移できる

**Step 2: 本番ビルド確認**

Run: `docker compose exec app pnpm build`
Expected: 成功

**Step 3: typecheck + lint 最終確認**

Run: `docker compose exec app pnpm typecheck && docker compose exec app pnpm lint`
Expected: 成功
