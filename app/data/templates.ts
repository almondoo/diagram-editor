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
  // ── 既存テンプレート ──────────────────────────────
  {
    id: "flowchart",
    name: "フローチャート",
    description: "基本的なフローチャート（開始→処理→判定→終了）",
    category: "flowchart",
    code: `// 🔄 フローチャート
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
  },
  {
    id: "sequence",
    name: "シーケンス図",
    description: "API リクエスト・レスポンスのシーケンス",
    category: "sequence",
    code: `// 📨 シーケンス図
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
  },
  {
    id: "architecture",
    name: "AWS Webアプリ",
    description: "CloudFront + ECS + Aurora のWebアプリ構成",
    category: "aws",
    code: `// 🏗️ AWS アーキテクチャ
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
  },
  {
    id: "serverless",
    name: "サーバーレス",
    description: "API Gateway + Lambda + DynamoDB のサーバーレス構成",
    category: "aws",
    code: `// ⚡ サーバーレスアーキテクチャ
node cf "CloudFront" { icon=aws.service.cloudfront }
node s3 "S3 Bucket" { icon=aws.service.s3 }
group api "API Backend" { color=#f97316
  node apigw "API Gateway" { icon=aws.service.api-gateway }
  node lambda1 "Auth Function" { icon=aws.service.lambda }
  node lambda2 "API Function" { icon=aws.service.lambda }
  node cognito "Cognito" { icon=aws.service.cognito }
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
}
group async "非同期処理" { color=#8b5cf6
  node sqs "SQS Queue" { icon=aws.service.sqs }
  node lambda3 "Worker" { icon=aws.service.lambda }
}

edge cf -> s3 { label="Static" }
edge cf -> apigw { label="API" }
edge apigw -> lambda1 { label="Auth" }
edge apigw -> lambda2 { label="Request" }
edge lambda1 -> cognito { label="Verify" }
edge lambda2 -> dynamo { label="CRUD" }
edge lambda2 --> sqs { label="Enqueue" }
edge sqs -> lambda3 { label="Process" animate=true }
edge lambda3 --> s3 { label="Store" }`,
  },
  {
    id: "data-pipeline",
    name: "データパイプライン",
    description: "Firehose + Glue + Athena のデータ分析基盤",
    category: "ai-data",
    code: `// 📊 データパイプライン
node source "Data Source" { shape=cylinder }
group ingestion "Ingestion" { color=#22c55e
  node firehose "Firehose" { icon=aws.service.data-firehose }
  node lambda "Transform" { icon=aws.service.lambda }
  node s3raw "Raw Data" { icon=aws.service.s3 }
}
group processing "Processing" { color=#f97316
  node glue "Glue ETL" { icon=aws.service.glue }
  node s3proc "Processed" { icon=aws.service.s3 }
}
group analytics "Analytics" { color=#8b5cf6
  node athena "Athena" { icon=aws.service.athena }
  node redshift "Redshift" { icon=aws.service.redshift }
  node quicksight "QuickSight" { icon=aws.service.quicksight }
}

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
  },
  {
    id: "mindmap",
    name: "マインドマップ",
    description: "プロジェクト計画のマインドマップ",
    category: "other",
    code: `// 🧠 マインドマップ
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
  },
  {
    id: "state",
    name: "状態遷移図",
    description: "非同期データ取得の状態遷移",
    category: "state",
    code: `// 🔀 状態遷移図
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
  },
  {
    id: "empty",
    name: "空のダイアグラム",
    description: "構文ガイド付きの空テンプレート",
    category: "other",
    code: `// ✨ 新規ダイアグラム
// 構文ガイド:
//   node <id> "ラベル" { shape=rect color=#hex }
//   edge <from> -> <to> { label="text" color=#hex }
//   group <id> "ラベル" {
//     node <id> "ラベル" { ... }
//   }
//   note <id> "テキスト" { color=#hex }
//
// Shapes: rect, stadium, diamond, ellipse, cylinder,
//         parallelogram, hexagon, trapezoid, circle
//
// Operators: -> <- <-> --> <-- <--> --
// Edge options: animate=true, thickness=2

node a "ノードA" { shape=rect }
node b "ノードB" { shape=rect }
edge a -> b { label="接続" }`,
  },

  // ── 新規 AWS テンプレート ──────────────────────────────
  {
    id: "aws-3tier",
    name: "3層Webアプリ",
    description: "ALB + EC2 + RDS の定番3層構成",
    category: "aws",
    code: `// 🏗️ 3層Webアプリ
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
    node nat "NAT GW" { icon=aws.resource.vpc.nat-gateway }
  }
  group private "Private Subnet" { color=#3b82f6
    node ec2a "EC2" { icon=aws.service.ec2 }
    node ec2b "EC2" { icon=aws.service.ec2 }
  }
  group db "DB Subnet" { color=#f59e0b
    node rds1 "RDS Primary" { icon=aws.service.rds }
    node rds2 "RDS Standby" { icon=aws.service.rds }
  }
}
node route53 "Route 53" { icon=aws.service.route-53 }

edge route53 -> alb { label="DNS" }
edge alb -> ec2a { label="HTTP" }
edge alb -> ec2b { label="HTTP" }
edge ec2a -> rds1 { label="SQL" }
edge ec2b -> rds1 { label="SQL" }
edge rds1 --> rds2 { label="Replication" }`,
  },
  {
    id: "aws-serverless-api",
    name: "サーバーレスAPI",
    description: "API Gateway + Lambda + DynamoDB",
    category: "aws",
    code: `// ⚡ サーバーレスAPI
group api "API" { color=#f97316
  node apigw "API Gateway" { icon=aws.service.api-gateway }
  node authFn "Authorizer" { icon=aws.service.lambda }
  node getFn "GET Handler" { icon=aws.service.lambda }
  node postFn "POST Handler" { icon=aws.service.lambda }
}
node cognito "Cognito" { icon=aws.service.cognito }
node dynamo "DynamoDB" { icon=aws.service.dynamodb }

edge apigw -> authFn { label="Auth" }
edge authFn -> cognito { label="Verify" }
edge apigw -> getFn { label="GET" }
edge apigw -> postFn { label="POST" }
edge getFn -> dynamo { label="Query" }
edge postFn -> dynamo { label="Put" }`,
  },
  {
    id: "aws-microservices",
    name: "マイクロサービス",
    description: "ECS Fargate + ALB + RDS のマイクロサービス構成",
    category: "aws",
    code: `// 🐳 マイクロサービス
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
  }
  group private "Private Subnet" { color=#3b82f6
    node svcA "User Service" { icon=aws.service.fargate }
    node svcB "Order Service" { icon=aws.service.fargate }
    node svcC "Payment Service" { icon=aws.service.fargate }
    node rdsA "Users DB" { icon=aws.service.aurora }
    node rdsB "Orders DB" { icon=aws.service.aurora }
  }
}
node ecr "ECR" { icon=aws.service.ecr }
node sqs "SQS" { icon=aws.service.sqs }

edge alb -> svcA { label="/users" }
edge alb -> svcB { label="/orders" }
edge alb -> svcC { label="/payments" }
edge svcA -> rdsA { label="SQL" }
edge svcB -> rdsB { label="SQL" }
edge svcB --> sqs { label="Event" }
edge sqs -> svcC { label="Process" animate=true }
edge ecr --> svcA { label="Image" }`,
  },
  {
    id: "aws-static-site",
    name: "静的サイトホスティング",
    description: "S3 + CloudFront + Route53",
    category: "aws",
    code: `// 🌐 静的サイトホスティング
node route53 "Route 53" { icon=aws.service.route-53 }
node cf "CloudFront" { icon=aws.service.cloudfront }
node waf "WAF" { icon=aws.service.waf }
node s3 "S3 (Origin)" { icon=aws.service.s3 }
node s3logs "S3 (Logs)" { icon=aws.service.s3 }

edge route53 -> cf { label="DNS" }
edge waf -> cf { label="Filter" }
edge cf -> s3 { label="Origin" }
edge cf --> s3logs { label="Access Log" }`,
  },
  {
    id: "aws-cicd",
    name: "CI/CDパイプライン",
    description: "CodeCommit → CodeBuild → CodeDeploy",
    category: "aws",
    code: `// 🚀 CI/CDパイプライン
group cicd "CI/CD Pipeline" { color=#f97316
  node repo "CodeCommit" { icon=aws.service.codecommit }
  node cp "CodePipeline" { icon=aws.service.codepipeline }
  node build "CodeBuild" { icon=aws.service.codebuild }
  node deploy "CodeDeploy" { icon=aws.service.codedeploy }
  node ecr "ECR" { icon=aws.service.ecr }
}
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node ecs "ECS" { icon=aws.service.ecs }
  }
}
node sns "SNS" { icon=aws.service.sns }

edge repo -> cp { label="Push" animate=true }
edge cp -> build { label="Build" }
edge build -> ecr { label="Push Image" }
edge cp -> deploy { label="Deploy" }
edge deploy -> ecs { label="Update" }
edge cp --> sns { label="Notify" }`,
  },
  {
    id: "aws-data-lake",
    name: "データレイク",
    description: "S3 + Glue + Athena + QuickSight",
    category: "aws",
    code: `// 🗃️ データレイク
node sources "Data Sources" { shape=cylinder }
group lake "Data Lake" { color=#22c55e
  node s3raw "S3 Raw Zone" { icon=aws.service.s3 }
  node s3curated "S3 Curated Zone" { icon=aws.service.s3 }
  node glue "Glue Crawler" { icon=aws.service.glue }
  node catalog "Glue Catalog" { icon=aws.service.glue }
}
group analytics "Analytics" { color=#8b5cf6
  node athena "Athena" { icon=aws.service.athena }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge sources -> s3raw { label="Ingest" }
edge s3raw -> glue { label="Crawl" }
edge glue -> catalog { label="Schema" }
edge glue -> s3curated { label="Transform" }
edge s3curated -> athena { label="Query" }
edge athena -> qs { label="Visualize" }`,
  },
  {
    id: "aws-streaming",
    name: "リアルタイムストリーミング",
    description: "Kinesis + Lambda + DynamoDB",
    category: "aws",
    code: `// 📡 リアルタイムストリーミング
node producer "Producer" { shape=rect }
group streaming "Stream Processing" { color=#f97316
  node kinesis "Kinesis Data Stream" { icon=aws.service.kinesis }
  node lambdaProc "Processor" { icon=aws.service.lambda }
  node firehose "Firehose" { icon=aws.service.data-firehose }
}
group storage "Storage" { color=#3b82f6
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
  node s3 "S3 Archive" { icon=aws.service.s3 }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge producer -> kinesis { label="Put Records" animate=true }
edge kinesis -> lambdaProc { label="Process" }
edge lambdaProc -> dynamo { label="Write" }
edge kinesis -> firehose { label="Archive" }
edge firehose -> s3 { label="Store" }
edge lambdaProc --> cw { label="Metrics" }`,
  },
  {
    id: "aws-eks",
    name: "コンテナオーケストレーション",
    description: "EKS + ECR + ALB",
    category: "aws",
    code: `// ☸️ EKS コンテナオーケストレーション
node ecr "ECR" { icon=aws.service.ecr }
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
  }
  group private "Private Subnet" { color=#3b82f6
    node podA "Pod A" { icon=aws.service.eks }
    node podB "Pod B" { icon=aws.service.eks }
    node podC "Pod C" { icon=aws.service.eks }
    node rds "Aurora" { icon=aws.service.aurora }
  }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge alb -> podA { label="Route" }
edge alb -> podB { label="Route" }
edge alb -> podC { label="Route" }
edge ecr --> podA { label="Pull" }
edge podA -> rds { label="SQL" }
edge podB -> rds { label="SQL" }
edge podA --> cw { label="Logs" }`,
  },
  {
    id: "aws-messaging",
    name: "メッセージングシステム",
    description: "SQS + SNS + Lambda のイベント駆動構成",
    category: "aws",
    code: `// 📬 メッセージングシステム
node api "API Gateway" { icon=aws.service.api-gateway }
node sns "SNS Topic" { icon=aws.service.sns }
group queues "Message Queues" { color=#f97316
  node sqsOrder "SQS (Order)" { icon=aws.service.sqs }
  node sqsNotify "SQS (Notify)" { icon=aws.service.sqs }
  node sqsAudit "SQS (Audit)" { icon=aws.service.sqs }
}
group handlers "Lambda Handlers" { color=#3b82f6
  node fnOrder "Order Fn" { icon=aws.service.lambda }
  node fnNotify "Notify Fn" { icon=aws.service.lambda }
  node fnAudit "Audit Fn" { icon=aws.service.lambda }
}

edge api -> sns { label="Publish" }
edge sns -> sqsOrder { label="Fan-out" }
edge sns -> sqsNotify { label="Fan-out" }
edge sns -> sqsAudit { label="Fan-out" }
edge sqsOrder -> fnOrder { label="Process" animate=true }
edge sqsNotify -> fnNotify { label="Process" animate=true }
edge sqsAudit -> fnAudit { label="Process" animate=true }`,
  },
  {
    id: "aws-iot",
    name: "IoTプラットフォーム",
    description: "IoT Core + Kinesis + S3 + Lambda",
    category: "aws",
    code: `// 📱 IoTプラットフォーム
node devices "IoT Devices" { shape=rect }
group iot "IoT Ingestion" { color=#22c55e
  node iotcore "IoT Core" { icon=aws.service.iot-core }
  node rules "IoT Rules" { icon=aws.service.iot-core }
}
group processing "Backend Processing" { color=#3b82f6
  node kinesis "Kinesis" { icon=aws.service.kinesis }
  node lambda "Lambda" { icon=aws.service.lambda }
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
  node s3 "S3" { icon=aws.service.s3 }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge devices -> iotcore { label="MQTT" animate=true }
edge iotcore -> rules { label="Route" }
edge rules -> kinesis { label="Stream" }
edge rules -> lambda { label="Alert" }
edge kinesis -> s3 { label="Archive" }
edge lambda -> dynamo { label="Store" }
edge lambda --> cw { label="Alarm" }`,
  },
  {
    id: "aws-ml-pipeline",
    name: "機械学習パイプライン",
    description: "SageMaker + S3 + Lambda + API Gateway",
    category: "aws",
    code: `// 🤖 機械学習パイプライン
group training "Training" { color=#f97316
  node s3data "S3 Training Data" { icon=aws.service.s3 }
  node sage "SageMaker" { icon=aws.service.sagemaker }
  node s3model "S3 Model" { icon=aws.service.s3 }
}
group inference "Inference" { color=#3b82f6
  node endpoint "SageMaker Endpoint" { icon=aws.service.sagemaker }
  node lambda "Lambda" { icon=aws.service.lambda }
  node apigw "API Gateway" { icon=aws.service.api-gateway }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge s3data -> sage { label="Train" }
edge sage -> s3model { label="Model Artifact" }
edge s3model -> endpoint { label="Deploy" }
edge apigw -> lambda { label="Request" }
edge lambda -> endpoint { label="Inference" }
edge sage --> cw { label="Metrics" }`,
  },
  {
    id: "aws-multi-region",
    name: "マルチリージョンHA",
    description: "Route53 + ALB + Aurora Global",
    category: "aws",
    code: `// 🌍 マルチリージョンHA
node r53 "Route 53" { icon=aws.service.route-53 }
group regionA "Region A (Primary)" { color=#22c55e
  node albA "ALB" { icon=aws.service.elb }
  node ecsA "ECS" { icon=aws.service.ecs }
  node auroraA "Aurora Primary" { icon=aws.service.aurora }
}
group regionB "Region B (Standby)" { color=#3b82f6
  node albB "ALB" { icon=aws.service.elb }
  node ecsB "ECS" { icon=aws.service.ecs }
  node auroraB "Aurora Replica" { icon=aws.service.aurora }
}

edge r53 -> albA { label="Active" }
edge r53 --> albB { label="Failover" }
edge albA -> ecsA
edge albB -> ecsB
edge ecsA -> auroraA { label="Write" }
edge ecsB -> auroraB { label="Read" }
edge auroraA --> auroraB { label="Global Replication" }`,
  },
  {
    id: "aws-vpn",
    name: "VPN接続",
    description: "VPC + VPN Gateway + オンプレ接続",
    category: "aws",
    code: `// 🔒 VPN接続
node onprem "オンプレDC" { shape=rect }
group vpc "VPC" { color=#8b5cf6
  node vgw "VPN Gateway" { icon=aws.service.vpc }
  node tgw "Transit Gateway" { icon=aws.service.tgw }
  group private "Private Subnet" { color=#3b82f6
    node ec2 "EC2" { icon=aws.service.ec2 }
    node rds "RDS" { icon=aws.service.rds }
  }
}

edge onprem -> vgw { label="IPsec VPN" }
edge vgw -> tgw { label="Route" }
edge tgw -> ec2
edge tgw -> rds
edge ec2 -> rds { label="SQL" }`,
  },
  {
    id: "aws-batch",
    name: "バッチ処理",
    description: "Step Functions + Lambda + S3",
    category: "aws",
    code: `// ⏱️ バッチ処理
node trigger "EventBridge" { icon=aws.service.eventbridge }
node sfn "Step Functions" { icon=aws.service.step-functions }
group etl "ETL Pipeline" { color=#3b82f6
  node fn1 "Extract" { icon=aws.service.lambda }
  node fn2 "Transform" { icon=aws.service.lambda }
  node fn3 "Load" { icon=aws.service.lambda }
}
node s3in "S3 Input" { icon=aws.service.s3 }
node s3out "S3 Output" { icon=aws.service.s3 }
node sns "SNS" { icon=aws.service.sns }

edge trigger -> sfn { label="Schedule" }
edge sfn -> fn1 { label="Step 1" }
edge fn1 -> fn2 { label="Step 2" }
edge fn2 -> fn3 { label="Step 3" }
edge fn1 -> s3in { label="Read" }
edge fn3 -> s3out { label="Write" }
edge sfn --> sns { label="Complete" }`,
  },
  {
    id: "aws-monitoring",
    name: "監視・ログ",
    description: "CloudWatch + CloudTrail + SNS",
    category: "aws",
    code: `// 📊 監視・ログ
node app "Application" { shape=rect }
group monitoring "Monitoring" { color=#3b82f6
  node cw "CloudWatch" { icon=aws.service.cloudwatch }
  node cwlogs "CW Logs" { icon=aws.service.cloudwatch }
  node ct "CloudTrail" { icon=aws.service.cloudtrail }
}
group alerting "Alerting" { color=#ef4444
  node alarm "CW Alarm" { icon=aws.service.cloudwatch }
  node sns "SNS" { icon=aws.service.sns }
}
node s3 "S3 Logs" { icon=aws.service.s3 }

edge app -> cw { label="Metrics" }
edge app -> cwlogs { label="Logs" }
edge ct -> s3 { label="Audit Trail" }
edge cw -> alarm { label="Threshold" }
edge alarm -> sns { label="Alert" }
edge cwlogs --> s3 { label="Archive" }`,
  },
  {
    id: "aws-waf",
    name: "WAF + Shield構成",
    description: "CloudFront + WAF + ALB のセキュリティ構成",
    category: "aws",
    code: `// 🛡️ WAF + Shield構成
node users "Users" { shape=rect }
node shield "Shield" { icon=aws.service.shield }
node waf "WAF" { icon=aws.service.waf }
node cf "CloudFront" { icon=aws.service.cloudfront }
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
  }
  group private "Private Subnet" { color=#3b82f6
    node ecs "ECS" { icon=aws.service.ecs }
  }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge users -> shield { label="Request" }
edge shield -> waf { label="DDoS Filter" }
edge waf -> cf { label="WAF Rules" }
edge cf -> alb { label="Origin" }
edge alb -> ecs { label="HTTP" }
edge waf --> cw { label="Metrics" }`,
  },
  {
    id: "aws-cognito",
    name: "Cognito認証フロー",
    description: "Cognitoユーザー認証・認可の流れ",
    category: "aws",
    code: `// 🔐 Cognito認証フロー
node client "Client App" { shape=rect }
node cognito "Cognito" { icon=aws.service.cognito }
group backend "API Backend" { color=#3b82f6
  node apigw "API Gateway" { icon=aws.service.api-gateway }
  node lambda "Lambda" { icon=aws.service.lambda }
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
}

edge client -> cognito { label="Sign In" }
edge cognito -> client { label="JWT Token" }
edge client -> apigw { label="API + Token" }
edge apigw -> cognito { label="Verify" }
edge apigw -> lambda { label="Authorized" }
edge lambda -> dynamo { label="Query" }`,
  },
  {
    id: "aws-eventbridge",
    name: "EventBridgeイベント駆動",
    description: "EventBridge + Lambda のイベント駆動構成",
    category: "aws",
    code: `// ⚡ EventBridgeイベント駆動
node srcA "Service A" { shape=rect }
node srcB "Service B" { shape=rect }
group events "Event Routing" { color=#f97316
  node eb "EventBridge" { icon=aws.service.eventbridge }
  node rule1 "Order Rule" { icon=aws.service.eventbridge }
  node rule2 "Audit Rule" { icon=aws.service.eventbridge }
}
group handlers "Handlers" { color=#3b82f6
  node fn1 "Process Order" { icon=aws.service.lambda }
  node fn2 "Audit Logger" { icon=aws.service.lambda }
}
node sqs "SQS DLQ" { icon=aws.service.sqs }

edge srcA -> eb { label="Events" }
edge srcB -> eb { label="Events" }
edge eb -> rule1 { label="Match" }
edge eb -> rule2 { label="Match" }
edge rule1 -> fn1 { label="Invoke" }
edge rule2 -> fn2 { label="Invoke" }
edge fn1 --> sqs { label="Failed" }`,
  },
  {
    id: "aws-cache",
    name: "ElastiCacheキャッシュ構成",
    description: "ElastiCache + RDS のキャッシュ戦略",
    category: "aws",
    code: `// ⚡ ElastiCacheキャッシュ構成
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node app "Application" { icon=aws.service.ecs }
    node cache "ElastiCache" { icon=aws.service.elasticache }
    node rds "RDS" { icon=aws.service.rds }
  }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge app -> cache { label="Cache Hit?" }
edge cache -> app { label="Hit: Return" }
edge app -> rds { label="Miss: Query" }
edge rds -> app { label="Result" }
edge app --> cache { label="Set Cache" }
edge cache --> cw { label="Metrics" }`,
  },
  {
    id: "aws-image-processing",
    name: "S3画像処理パイプライン",
    description: "S3 + Lambda による画像処理自動化",
    category: "aws",
    code: `// 🖼️ S3画像処理パイプライン
group storage "Storage" { color=#22c55e
  node s3upload "S3 Upload" { icon=aws.service.s3 }
  node s3thumb "S3 Thumbnails" { icon=aws.service.s3 }
}
group processing "Processing" { color=#3b82f6
  node lambda "Processor" { icon=aws.service.lambda }
  node rekognition "Rekognition" { icon=aws.service.rekognition }
}
node dynamo "DynamoDB" { icon=aws.service.dynamodb }
node sns "SNS" { icon=aws.service.sns }

edge s3upload -> lambda { label="S3 Event" animate=true }
edge lambda -> s3thumb { label="Resize" }
edge lambda -> rekognition { label="Analyze" }
edge rekognition -> dynamo { label="Tags" }
edge lambda --> sns { label="Complete" }`,
  },
  {
    id: "aws-blue-green",
    name: "ECS Blue/Greenデプロイ",
    description: "CodeDeploy + ECS のBlue/Green構成",
    category: "aws",
    code: `// 🔄 ECS Blue/Greenデプロイ
node pipeline "CodePipeline" { icon=aws.service.codepipeline }
node deploy "CodeDeploy" { icon=aws.service.codedeploy }
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
  }
  group private "Private Subnet" { color=#3b82f6
    node ecsBlue "ECS Blue" { icon=aws.service.ecs }
    node ecsGreen "ECS Green" { icon=aws.service.ecs }
  }
}
node ecr "ECR" { icon=aws.service.ecr }

edge pipeline -> deploy { label="Deploy" }
edge deploy -> alb { label="Switch" }
edge alb -> ecsBlue { label="Current" }
edge alb --> ecsGreen { label="New" }
edge ecr -> ecsGreen { label="Pull" }`,
  },
  {
    id: "aws-aurora-serverless",
    name: "Aurora Serverless + API",
    description: "Aurora Serverless + API Gateway 構成",
    category: "aws",
    code: `// 🗄️ Aurora Serverless + API
node apigw "API Gateway" { icon=aws.service.api-gateway }
node lambda "Lambda" { icon=aws.service.lambda }
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node aurora "Aurora Serverless" { icon=aws.service.aurora }
  }
}
node s3 "S3" { icon=aws.service.s3 }
node secrets "Secrets Manager" { shape=rect }

edge apigw -> lambda { label="Request" }
edge lambda -> aurora { label="Data API" }
edge lambda -> s3 { label="Files" }
edge lambda -> secrets { label="Credentials" }`,
  },
  {
    id: "aws-edge",
    name: "CloudFront + Lambda@Edge",
    description: "CloudFront + Lambda@Edge による Edge Computing",
    category: "aws",
    code: `// ⚡ CloudFront + Lambda@Edge
node client "Client" { shape=rect }
node cf "CloudFront" { icon=aws.service.cloudfront }
node edgeFn "Lambda@Edge" { icon=aws.service.lambda }
node s3 "S3 Origin" { icon=aws.service.s3 }
node apigw "API Gateway" { icon=aws.service.api-gateway }

edge client -> cf { label="Request" }
edge cf -> edgeFn { label="Viewer Request" }
edge edgeFn -> cf { label="Modify" }
edge cf -> s3 { label="Static" }
edge cf -> apigw { label="API" }`,
  },
  {
    id: "aws-sftp",
    name: "Transfer Family（SFTP）",
    description: "Transfer Family + S3 のSFTP構成",
    category: "aws",
    code: `// 📂 Transfer Family（SFTP）
node partner "External Partner" { shape=rect }
group ingestion "Ingestion" { color=#22c55e
  node transfer "Transfer Family" { icon=aws.service.transfer-family }
  node s3 "S3" { icon=aws.service.s3 }
}
group processing "Processing" { color=#3b82f6
  node lambda "Lambda" { icon=aws.service.lambda }
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
}

edge partner -> transfer { label="SFTP Upload" }
edge transfer -> s3 { label="Store" }
edge s3 -> lambda { label="S3 Event" animate=true }
edge lambda -> dynamo { label="Register" }`,
  },
  {
    id: "aws-dwh",
    name: "Redshift DWH",
    description: "Redshift + Glue ETL データウェアハウス",
    category: "aws",
    code: `// 📊 Redshift DWH
node sources "Data Sources" { shape=cylinder }
group etl "ETL" { color=#f97316
  node s3 "S3 Staging" { icon=aws.service.s3 }
  node glue "Glue ETL" { icon=aws.service.glue }
}
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node redshift "Redshift" { icon=aws.service.redshift }
  }
}
group analytics "Analytics" { color=#22c55e
  node athena "Athena" { icon=aws.service.athena }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge sources -> s3 { label="Extract" }
edge s3 -> glue { label="Transform" }
edge glue -> redshift { label="Load" }
edge redshift -> qs { label="BI" }
edge s3 -> athena { label="Ad-hoc" }`,
  },
  {
    id: "aws-graphql",
    name: "AppSync GraphQL API",
    description: "AppSync + DynamoDB + Lambda",
    category: "aws",
    code: `// 🔗 AppSync GraphQL API
node client "Client" { shape=rect }
node appsync "AppSync" { icon=aws.service.appsync }
node cognito "Cognito" { icon=aws.service.cognito }
node dynamo "DynamoDB" { icon=aws.service.dynamodb }
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node lambda "Lambda Resolver" { icon=aws.service.lambda }
    node rds "Aurora" { icon=aws.service.aurora }
  }
}

edge client -> appsync { label="GraphQL" }
edge appsync -> cognito { label="Auth" }
edge appsync -> dynamo { label="Direct Resolver" }
edge appsync -> lambda { label="Custom Resolver" }
edge lambda -> rds { label="SQL" }`,
  },
  {
    id: "aws-shared-storage",
    name: "EFS共有ストレージ",
    description: "EFS + ECS による共有ファイルシステム",
    category: "aws",
    code: `// 📁 EFS共有ストレージ
group vpc "VPC" { color=#8b5cf6
  group public "Public Subnet" { color=#22c55e
    node alb "ALB" { icon=aws.service.elb }
  }
  group private "Private Subnet" { color=#3b82f6
    node taskA "Task A" { icon=aws.service.fargate }
    node taskB "Task B" { icon=aws.service.fargate }
    node efs "EFS" { icon=aws.service.efs }
  }
}
node backup "AWS Backup" { icon=aws.service.backup }

edge alb -> taskA
edge alb -> taskB
edge taskA -> efs { label="Mount" }
edge taskB -> efs { label="Mount" }
edge efs --> backup { label="Backup" }`,
  },
  {
    id: "aws-backup",
    name: "AWS Backup 統合バックアップ",
    description: "AWS Backup による一元バックアップ管理",
    category: "aws",
    code: `// 💾 AWS Backup 統合バックアップ
node backup "AWS Backup" { icon=aws.service.backup }
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node rds "RDS" { icon=aws.service.rds }
    node efs "EFS" { icon=aws.service.efs }
    node ec2 "EC2 (EBS)" { icon=aws.service.ec2 }
  }
}
node dynamo "DynamoDB" { icon=aws.service.dynamodb }
node s3vault "S3 Backup Vault" { icon=aws.service.s3 }

edge backup -> rds { label="Snapshot" }
edge backup -> efs { label="Backup" }
edge backup -> dynamo { label="Backup" }
edge backup -> ec2 { label="AMI/Snapshot" }
edge backup -> s3vault { label="Store" }`,
  },
  {
    id: "aws-organizations",
    name: "Organizations マルチアカウント",
    description: "Organizations によるマルチアカウント管理",
    category: "aws",
    code: `// 🏢 Organizations マルチアカウント
node org "Organizations" { icon=aws.service.organizations }
node mgmt "Management Account" { shape=rect }
group securityOU "Security OU" { color=#f59e0b
  node security "Security Account" { shape=rect }
  node guardduty "GuardDuty" { icon=aws.service.guardduty }
  node sechub "Security Hub" { icon=aws.service.security-hub }
}
group workloadOU "Workload OU" { color=#3b82f6
  node prod "Production Account" { shape=rect }
  node dev "Development Account" { shape=rect }
}

edge org -> mgmt { label="Root" }
edge org -> security { label="Security OU" }
edge org -> prod { label="Prod OU" }
edge org -> dev { label="Dev OU" }
edge security -> guardduty { label="Monitor" }
edge security -> sechub { label="Findings" }`,
  },
  {
    id: "aws-dms",
    name: "DMS データベース移行",
    description: "DMS によるデータベース移行",
    category: "aws",
    code: `// 🔄 DMS データベース移行
node source "Source DB" { shape=cylinder }
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node dms "DMS" { icon=aws.service.dms }
    node target "Aurora" { icon=aws.service.aurora }
  }
}
node s3 "S3 (CDC)" { icon=aws.service.s3 }
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge source -> dms { label="Full Load" }
edge dms -> target { label="Migrate" }
edge dms --> s3 { label="CDC Logs" }
edge dms --> cw { label="Monitor" }`,
  },
  {
    id: "aws-transit-gateway",
    name: "Transit Gateway マルチVPC",
    description: "Transit Gateway によるVPC間接続",
    category: "aws",
    code: `// 🌐 Transit Gateway マルチVPC
node tgw "Transit Gateway" { icon=aws.service.tgw }
group vpcA "VPC A (Production)" { color=#22c55e
  node ec2a "EC2" { icon=aws.service.ec2 }
}
group vpcB "VPC B (Staging)" { color=#f59e0b
  node ec2b "EC2" { icon=aws.service.ec2 }
}
group vpcC "VPC C (Shared Services)" { color=#3b82f6
  node rds "RDS" { icon=aws.service.rds }
  node ad "Active Directory" { shape=rect }
}
node onprem "オンプレミス" { shape=rect }

edge tgw -> vpcA
edge tgw -> vpcB
edge tgw -> vpcC
edge onprem -> tgw { label="VPN" }`,
  },
  {
    id: "aws-security",
    name: "セキュリティ監視",
    description: "GuardDuty + Security Hub 構成",
    category: "aws",
    code: `// 🔍 セキュリティ監視
group detection "Detection" { color=#f59e0b
  node guardduty "GuardDuty" { icon=aws.service.guardduty }
  node ct "CloudTrail" { icon=aws.service.cloudtrail }
  node config "AWS Config" { shape=rect }
}
group response "Aggregation & Response" { color=#ef4444
  node sechub "Security Hub" { icon=aws.service.security-hub }
  node eb "EventBridge" { icon=aws.service.eventbridge }
  node sns "SNS" { icon=aws.service.sns }
  node lambda "Remediation" { icon=aws.service.lambda }
}

edge guardduty -> sechub { label="Findings" }
edge ct -> sechub { label="Events" }
edge config -> sechub { label="Compliance" }
edge sechub -> eb { label="Alert" }
edge eb -> sns { label="Notify" }
edge eb -> lambda { label="Auto-Fix" }`,
  },

  // ── 新規 AI/ML・データ基盤テンプレート ──────────────────────────────
  {
    id: "ai-chatbot",
    name: "Bedrock AI チャットボット",
    description: "Bedrock + Lambda のAIチャットボット",
    category: "ai-data",
    code: `// 🤖 Bedrock AI チャットボット
node client "Client" { shape=rect }
group backend "Backend" { color=#3b82f6
  node apigw "API Gateway" { icon=aws.service.api-gateway }
  node lambda "Lambda" { icon=aws.service.lambda }
  node bedrock "Bedrock" { icon=aws.service.bedrock }
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
}

edge client -> apigw { label="Message" }
edge apigw -> lambda { label="Request" }
edge lambda -> bedrock { label="Invoke Model" }
edge lambda -> dynamo { label="History" }
edge bedrock -> lambda { label="Response" }`,
  },
  {
    id: "ai-rag",
    name: "Bedrock RAG",
    description: "Bedrock + OpenSearch + S3 によるRAG構成",
    category: "ai-data",
    code: `// 🧠 Bedrock RAG
group ingestion "Ingestion Pipeline" { color=#22c55e
  node docs "Documents" { shape=cylinder }
  node s3 "S3" { icon=aws.service.s3 }
  node embedFn "Embed Lambda" { icon=aws.service.lambda }
}
group query "Query Pipeline" { color=#3b82f6
  node apigw "API Gateway" { icon=aws.service.api-gateway }
  node queryFn "Query Lambda" { icon=aws.service.lambda }
}
node bedrock "Bedrock" { icon=aws.service.bedrock }
node opensearch "OpenSearch" { icon=aws.service.opensearch-service }

edge docs -> s3 { label="Upload" }
edge s3 -> embedFn { label="Trigger" }
edge embedFn -> bedrock { label="Embed" }
edge embedFn -> opensearch { label="Index" }
edge apigw -> queryFn { label="Query" }
edge queryFn -> opensearch { label="Search" }
edge queryFn -> bedrock { label="Generate" }`,
  },
  {
    id: "ai-mlops",
    name: "SageMaker MLOps",
    description: "SageMaker + Step Functions + ECR のMLOps",
    category: "ai-data",
    code: `// ⚙️ SageMaker MLOps
group training "Training Pipeline" { color=#f97316
  node repo "CodeCommit" { icon=aws.service.codecommit }
  node pipeline "Step Functions" { icon=aws.service.step-functions }
  node ecr "ECR" { icon=aws.service.ecr }
  node s3data "S3 Data" { icon=aws.service.s3 }
  node sage "SageMaker Training" { icon=aws.service.sagemaker }
  node s3model "S3 Model" { icon=aws.service.s3 }
}
group serving "Serving" { color=#3b82f6
  node endpoint "SageMaker Endpoint" { icon=aws.service.sagemaker }
}
node cw "CloudWatch" { icon=aws.service.cloudwatch }

edge repo -> pipeline { label="Trigger" }
edge pipeline -> ecr { label="Build Image" }
edge pipeline -> sage { label="Train" }
edge s3data -> sage { label="Data" }
edge sage -> s3model { label="Model" }
edge pipeline -> endpoint { label="Deploy" }
edge endpoint --> cw { label="Monitor" }`,
  },
  {
    id: "ai-text-analysis",
    name: "Comprehend テキスト分析",
    description: "Comprehend によるテキスト分析パイプライン",
    category: "ai-data",
    code: `// 📝 Comprehend テキスト分析
group pipeline "Analysis Pipeline" { color=#3b82f6
  node s3input "S3 Input" { icon=aws.service.s3 }
  node lambda "Lambda" { icon=aws.service.lambda }
  node comprehend "Comprehend" { icon=aws.service.comprehend }
}
group output "Output" { color=#22c55e
  node dynamo "DynamoDB" { icon=aws.service.dynamodb }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge s3input -> lambda { label="Trigger" }
edge lambda -> comprehend { label="Analyze" }
edge comprehend -> lambda { label="Sentiment/Entities" }
edge lambda -> dynamo { label="Store Results" }
edge dynamo -> qs { label="Visualize" }`,
  },
  {
    id: "ai-image-analysis",
    name: "Rekognition 画像分析",
    description: "Rekognition による画像分析パイプライン",
    category: "ai-data",
    code: `// 📷 Rekognition 画像分析
group pipeline "Analysis Pipeline" { color=#3b82f6
  node s3 "S3 Images" { icon=aws.service.s3 }
  node lambda "Lambda" { icon=aws.service.lambda }
  node rekognition "Rekognition" { icon=aws.service.rekognition }
}
node dynamo "DynamoDB" { icon=aws.service.dynamodb }
node sns "SNS" { icon=aws.service.sns }

edge s3 -> lambda { label="Upload Event" animate=true }
edge lambda -> rekognition { label="Detect" }
edge rekognition -> lambda { label="Labels/Faces" }
edge lambda -> dynamo { label="Store" }
edge lambda --> sns { label="Alert" }`,
  },
  {
    id: "ai-speech",
    name: "Transcribe 音声分析",
    description: "Transcribe + Comprehend の音声分析パイプライン",
    category: "ai-data",
    code: `// 🎤 Transcribe 音声分析
group pipeline "Analysis Pipeline" { color=#3b82f6
  node s3audio "S3 Audio" { icon=aws.service.s3 }
  node transcribe "Transcribe" { icon=aws.service.transcribe }
  node s3text "S3 Transcript" { icon=aws.service.s3 }
  node comprehend "Comprehend" { icon=aws.service.comprehend }
}
node dynamo "DynamoDB" { icon=aws.service.dynamodb }

edge s3audio -> transcribe { label="Transcribe" }
edge transcribe -> s3text { label="Text" }
edge s3text -> comprehend { label="Analyze" }
edge comprehend -> dynamo { label="Insights" }`,
  },
  {
    id: "data-lakehouse",
    name: "データレイクハウス",
    description: "S3 + Glue + Lake Formation + Athena + Redshift",
    category: "ai-data",
    code: `// 🏠 データレイクハウス
node sources "Data Sources" { shape=cylinder }
group lake "Data Lake" { color=#22c55e
  node s3 "S3 Data Lake" { icon=aws.service.s3 }
  node lakeform "Lake Formation" { icon=aws.service.lake-formation }
  node glue "Glue ETL" { icon=aws.service.glue }
}
group analytics "Analytics" { color=#8b5cf6
  node athena "Athena" { icon=aws.service.athena }
  node redshift "Redshift" { icon=aws.service.redshift }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge sources -> s3 { label="Ingest" }
edge s3 -> lakeform { label="Govern" }
edge lakeform -> glue { label="Catalog" }
edge glue -> s3 { label="Transform" }
edge s3 -> athena { label="Query" }
edge s3 -> redshift { label="Load" }
edge athena -> qs { label="BI" }
edge redshift -> qs { label="BI" }`,
  },
  {
    id: "data-emr",
    name: "EMRデータ基盤",
    description: "S3 + EMR + Glue + Athena + QuickSight",
    category: "ai-data",
    code: `// 🔥 EMRデータ基盤
group storage "Storage" { color=#22c55e
  node s3raw "S3 Raw" { icon=aws.service.s3 }
  node s3proc "S3 Processed" { icon=aws.service.s3 }
}
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node emr "EMR" { icon=aws.service.emr }
  }
}
group analytics "Analytics" { color=#f97316
  node glue "Glue Catalog" { icon=aws.service.glue }
  node athena "Athena" { icon=aws.service.athena }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge s3raw -> emr { label="Spark Job" }
edge emr -> s3proc { label="Output" }
edge s3proc -> glue { label="Register" }
edge glue -> athena { label="Query" }
edge athena -> qs { label="Visualize" }`,
  },
  {
    id: "data-realtime-etl",
    name: "リアルタイムETL",
    description: "Kinesis + Glue Streaming + S3 + Redshift",
    category: "ai-data",
    code: `// ⚡ リアルタイムETL
node producer "Producer" { shape=rect }
group etl "ETL Pipeline" { color=#f97316
  node kinesis "Kinesis" { icon=aws.service.kinesis }
  node glue "Glue Streaming" { icon=aws.service.glue }
}
group storage "Storage & Analytics" { color=#3b82f6
  node s3 "S3" { icon=aws.service.s3 }
  node redshift "Redshift" { icon=aws.service.redshift }
  node qs "QuickSight" { icon=aws.service.quicksight }
}

edge producer -> kinesis { label="Stream" animate=true }
edge kinesis -> glue { label="ETL" }
edge glue -> s3 { label="Store" }
edge glue -> redshift { label="Load" }
edge redshift -> qs { label="Dashboard" }`,
  },
  {
    id: "data-kafka",
    name: "MSKイベントストリーミング",
    description: "MSK（Kafka）によるイベントストリーミング基盤",
    category: "ai-data",
    code: `// 📨 MSKイベントストリーミング
node producerA "Service A" { shape=rect }
node producerB "Service B" { shape=rect }
group vpc "VPC" { color=#8b5cf6
  group private "Private Subnet" { color=#3b82f6
    node msk "MSK (Kafka)" { icon=aws.service.msk }
    node consumerB "Consumer B" { icon=aws.service.ecs }
  }
}
node consumerA "Consumer A" { icon=aws.service.lambda }
node s3 "S3 Archive" { icon=aws.service.s3 }
node opensearch "OpenSearch" { icon=aws.service.opensearch-service }

edge producerA -> msk { label="Produce" }
edge producerB -> msk { label="Produce" }
edge msk -> consumerA { label="Consume" animate=true }
edge msk -> consumerB { label="Consume" animate=true }
edge msk -> s3 { label="Archive" }
edge consumerB -> opensearch { label="Index" }`,
  },
];
