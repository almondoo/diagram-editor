export const TEMPLATES: Record<string, string> = {
  flowchart: `// 🔄 フローチャート
node start "開始" { shape=stadium }
node input "データ入力" { shape=parallelogram }
node process "データ処理" { shape=rect }
node check "有効？" { shape=diamond }
node output "結果出力" { shape=parallelogram }
node end "終了" { shape=stadium }
node error "エラー処理" { shape=rect }

edge start -> input
edge input -> process
edge process -> check
edge check -> output { label="Yes" }
edge check -> error { label="No" }
edge error --> input { label="再入力" }
edge output -> end`,

  sequence: `// 📨 シーケンス図
node client "Client" { shape=rect }
node server "API Server" { shape=rect }
node db "Database" { shape=cylinder }
node cache "Cache" { shape=hexagon }

node req1 "GET /users" { shape=rect }
node req2 "SELECT *" { shape=rect }
node res2 "Results" { shape=rect }
node res1 "200 OK + JSON" { shape=rect }

edge client -> req1
edge req1 -> server { label="HTTP Request" }
edge server -> req2
edge req2 -> db { label="SQL Query" }
edge db -> res2 { label="Row Data" }
edge res2 -> server
edge server --> cache { label="Update" }
edge server -> res1
edge res1 -> client { label="HTTP Response" }`,

  architecture: `// 🏗️ AWS アーキテクチャ
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
    node nat "NAT Gateway" { icon=aws.resource.vpc.nat-gateway }
  }
  group private "Private Subnet" { color=#3b82f6
    node ecs "ECS Service" { icon=aws.service.ecs }
    node rds "Aurora" { icon=aws.service.aurora }
    node cache "ElastiCache" { icon=aws.service.elasticache }
  }
}
node cf "CloudFront" { icon=aws.service.cloudfront }
node s3 "S3 Bucket" { icon=aws.service.s3 }

edge cf -> alb { label="HTTPS" animate=true }
edge alb -> ecs { label="HTTP" }
edge ecs -> rds { label="SQL" }
edge ecs -> cache { label="Redis" }
edge cf -> s3 { label="Static" }
edge ecs --> s3 { label="Upload" }`,

  serverless: `// ⚡ サーバーレスアーキテクチャ
node apigw "API Gateway" { icon=aws.service.api-gateway }
node lambda1 "Auth Function" { icon=aws.service.lambda }
node lambda2 "API Function" { icon=aws.service.lambda }
node dynamo "DynamoDB" { icon=aws.service.dynamodb }
node s3 "S3 Bucket" { icon=aws.service.s3 }
node cognito "Cognito" { icon=aws.service.cognito }
node cf "CloudFront" { icon=aws.service.cloudfront }
node sqs "SQS Queue" { icon=aws.service.sqs }
node lambda3 "Worker" { icon=aws.service.lambda }

edge cf -> s3 { label="Static" }
edge cf -> apigw { label="API" }
edge apigw -> lambda1 { label="Auth" }
edge apigw -> lambda2 { label="Request" }
edge lambda1 -> cognito { label="Verify" }
edge lambda2 -> dynamo { label="CRUD" }
edge lambda2 --> sqs { label="Enqueue" }
edge sqs -> lambda3 { label="Process" animate=true }
edge lambda3 --> s3 { label="Store" }`,

  "data-pipeline": `// 📊 データパイプライン
node source "Data Source" { shape=cylinder }
node firehose "Firehose" { icon=aws.service.data-firehose }
node s3raw "Raw Data" { icon=aws.service.s3 }
node glue "Glue ETL" { icon=aws.service.glue }
node s3proc "Processed" { icon=aws.service.s3 }
node athena "Athena" { icon=aws.service.athena }
node quicksight "QuickSight" { icon=aws.service.quicksight }
node redshift "Redshift" { icon=aws.service.redshift }
node lambda "Transform" { icon=aws.service.lambda }

edge source -> firehose { label="Stream" animate=true }
edge firehose -> s3raw { label="Store" }
edge firehose -> lambda { label="Transform" }
edge lambda -> s3raw
edge s3raw -> glue { label="ETL" }
edge glue -> s3proc { label="Parquet" }
edge s3proc -> athena { label="Query" }
edge s3proc -> redshift { label="Load" }
edge athena -> quicksight { label="BI" }
edge redshift -> quicksight { label="BI" }`,

  mindmap: `// 🧠 マインドマップ
node center "プロジェクト計画" { shape=stadium fontSize=15 }

node design "デザイン" { shape=rect }
node dev "開発" { shape=rect }
node test "テスト" { shape=rect }
node deploy "デプロイ" { shape=rect }

node ui "UI/UX" { shape=rect }
node brand "ブランド" { shape=rect }
node front "フロント" { shape=rect }
node back "バックエンド" { shape=rect }
node unit "単体テスト" { shape=rect }
node e2e "E2Eテスト" { shape=rect }
node ci "CI/CD" { shape=rect }
node infra "インフラ" { shape=rect }

edge center -> design { thickness=2 }
edge center -> dev { thickness=2 }
edge center -> test { thickness=2 }
edge center -> deploy { thickness=2 }
edge design -> ui
edge design -> brand
edge dev -> front
edge dev -> back
edge test -> unit
edge test -> e2e
edge deploy -> ci
edge deploy -> infra`,

  state: `// 🔀 状態遷移図
node idle "待機中" { shape=stadium }
node loading "読込中" { shape=rect }
node success "成功" { shape=rect }
node error "エラー" { shape=rect }
node retry "リトライ" { shape=diamond }

edge idle -> loading { label="fetch()" }
edge loading -> success { label="200 OK" }
edge loading -> error { label="Error" }
edge error -> retry { label="retry?" }
edge retry --> loading { label="Yes" }
edge retry --> idle { label="No / Max" }
edge success --> idle { label="reset()" }`,

  empty: `// ✨ 新規ダイアグラム
// 構文ガイド:
//   node <id> "ラベル" { shape=rect color=#hex x=0 y=0 }
//   edge <from> -> <to> { label="text" color=#hex }
//   group <id> "ラベル" {
//     node <id> "ラベル" { ... }
//   }
//   note <id> "テキスト" { x=0 y=0 color=#hex }
//
// Shapes: rect, stadium, diamond, ellipse, cylinder,
//         parallelogram, hexagon, trapezoid, circle
//
// Operators: -> <- <-> --> <-- <--> --
// Edge options: animate=true, thickness=2

node a "ノードA" { shape=rect }
node b "ノードB" { shape=rect }
edge a -> b { label="接続" }`,
};
