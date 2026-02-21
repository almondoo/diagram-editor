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
edge error -> input { label="再入力" style=dashed }
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
edge server -> cache { label="Update" style=dashed }
edge server -> res1
edge res1 -> client { label="HTTP Response" }`,

  er: `// 🗃️ ER図
node users "Users" { shape=rect }
node posts "Posts" { shape=rect }
node comments "Comments" { shape=rect }
node tags "Tags" { shape=rect }
node post_tags "PostTags" { shape=diamond }

note n1 "id, name, email, created_at"
note n2 "id, user_id, title, body"
note n3 "id, post_id, user_id, body"

edge users -> posts { label="1:N" thickness=2 }
edge users -> comments { label="1:N" thickness=2 }
edge posts -> comments { label="1:N" thickness=2 }
edge posts -> post_tags { label="M" }
edge tags -> post_tags { label="N" }`,

  architecture: `// 🏗️ システムアーキテクチャ
group frontend "Frontend" { x=30 y=20 w=250 h=160 }
group backend "Backend" { x=330 y=20 w=250 h=160 }
group data "Data Layer" { x=180 y=250 w=250 h=160 }

node react "React App" { shape=rect group=frontend icon=⚛️ }
node nginx "Nginx" { shape=hexagon group=frontend }
node api "FastAPI" { shape=rect group=backend icon=⚡ }
node worker "Celery Worker" { shape=rect group=backend icon=🔄 }
node pg "PostgreSQL" { shape=cylinder group=data }
node redis "Redis" { shape=hexagon group=data icon=🗄️ }

edge react -> nginx { label="Proxy" }
edge nginx -> api { label="REST" animate=true }
edge api -> worker { label="Task" style=dashed }
edge api -> pg { label="SQL" }
edge api -> redis { label="Cache" }
edge worker -> pg { label="Write" style=dashed }
edge worker -> redis { label="Queue" style=dashed }`,

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
edge retry -> loading { label="Yes" style=dashed }
edge retry -> idle { label="No / Max" style=dashed }
edge success -> idle { label="reset()" style=dashed }`,

  empty: `// ✨ 新規ダイアグラム
// 構文ガイド:
//   node <id> "ラベル" { shape=rect color=#hex x=0 y=0 }
//   edge <from> -> <to> { label="text" color=#hex style=dashed }
//   group <id> "ラベル" { color=#hex x=0 y=0 w=300 h=200 }
//   note <id> "テキスト" { x=0 y=0 color=#hex }
//
// Shapes: rect, stadium, diamond, ellipse, cylinder,
//         parallelogram, hexagon, trapezoid, circle
//
// Edge options: style=solid|dashed, animate=true,
//               arrow=end|both|none, thickness=2

node a "ノードA" { shape=rect }
node b "ノードB" { shape=rect }
edge a -> b { label="接続" }`,
};
