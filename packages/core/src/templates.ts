export const TEMPLATES: Record<string, string> = {
  flowchart: `// 🔄 フローチャート
node start "開始" { shape=stadium color=#10b981 x=300 y=40 w=120 h=50 }
node input "データ入力" { shape=parallelogram color=#6366f1 x=280 y=140 w=160 h=55 }
node process "データ処理" { shape=rect color=#3b82f6 x=280 y=240 w=160 h=55 }
node check "有効？" { shape=diamond color=#f59e0b x=295 y=350 w=130 h=80 }
node output "結果出力" { shape=parallelogram color=#8b5cf6 x=280 y=490 w=160 h=55 }
node end "終了" { shape=stadium color=#ef4444 x=300 y=590 w=120 h=50 }
node error "エラー処理" { shape=rect color=#ef4444 x=520 y=350 w=150 h=55 }

edge start -> input { color=#10b981 }
edge input -> process {}
edge process -> check {}
edge check -> output { label="Yes" color=#10b981 }
edge check -> error { label="No" color=#ef4444 }
edge error -> input { label="再入力" color=#f59e0b style=dashed }
edge output -> end { color=#ef4444 }`,

  sequence: `// 📨 シーケンス図
node client "Client" { shape=rect color=#6366f1 x=80 y=40 w=120 h=50 }
node server "API Server" { shape=rect color=#3b82f6 x=300 y=40 w=120 h=50 }
node db "Database" { shape=cylinder color=#10b981 x=520 y=40 w=120 h=50 }
node cache "Cache" { shape=hexagon color=#f59e0b x=520 y=280 w=120 h=55 }

node req1 "GET /users" { shape=rect color=#1e293b x=160 y=130 w=140 h=40 }
node req2 "SELECT *" { shape=rect color=#1e293b x=380 y=190 w=130 h=40 }
node res2 "Results" { shape=rect color=#1e293b x=380 y=260 w=130 h=40 }
node res1 "200 OK + JSON" { shape=rect color=#1e293b x=160 y=340 w=150 h=40 }

edge client -> req1 {}
edge req1 -> server { label="HTTP Request" color=#6366f1 }
edge server -> req2 {}
edge req2 -> db { label="SQL Query" color=#3b82f6 }
edge db -> res2 { label="Row Data" color=#10b981 }
edge res2 -> server {}
edge server -> cache { label="Update" color=#f59e0b style=dashed }
edge server -> res1 {}
edge res1 -> client { label="HTTP Response" color=#8b5cf6 }`,

  er: `// 🗃️ ER図
node users "Users" { shape=rect color=#6366f1 x=80 y=160 w=150 h=55 border=#818cf8 }
node posts "Posts" { shape=rect color=#3b82f6 x=340 y=60 w=150 h=55 border=#60a5fa }
node comments "Comments" { shape=rect color=#10b981 x=600 y=160 w=150 h=55 border=#34d399 }
node tags "Tags" { shape=rect color=#f59e0b x=340 y=300 w=150 h=55 border=#fbbf24 }
node post_tags "PostTags" { shape=diamond color=#8b5cf6 x=355 y=180 w=120 h=70 }

note n1 "id, name, email, created_at" { x=50 y=240 color=#818cf8 }
note n2 "id, user_id, title, body" { x=310 y=10 color=#60a5fa }
note n3 "id, post_id, user_id, body" { x=570 y=240 color=#34d399 }

edge users -> posts { label="1:N" color=#6366f1 thickness=2 }
edge users -> comments { label="1:N" color=#10b981 thickness=2 }
edge posts -> comments { label="1:N" color=#3b82f6 thickness=2 }
edge posts -> post_tags { label="M" color=#8b5cf6 }
edge tags -> post_tags { label="N" color=#f59e0b }`,

  architecture: `// 🏗️ システムアーキテクチャ
group frontend "Frontend" { color=#6366f1 x=30 y=20 w=250 h=160 }
group backend "Backend" { color=#3b82f6 x=330 y=20 w=250 h=160 }
group data "Data Layer" { color=#10b981 x=180 y=250 w=250 h=160 }

node react "React App" { shape=rect color=#6366f1 x=60 y=60 w=130 h=45 group=frontend icon=⚛️ }
node nginx "Nginx" { shape=hexagon color=#059669 x=80 y=120 w=120 h=50 group=frontend }
node api "FastAPI" { shape=rect color=#3b82f6 x=370 y=60 w=130 h=45 group=backend icon=⚡ }
node worker "Celery Worker" { shape=rect color=#8b5cf6 x=370 y=120 w=130 h=45 group=backend icon=🔄 }
node pg "PostgreSQL" { shape=cylinder color=#10b981 x=210 y=300 w=130 h=55 group=data }
node redis "Redis" { shape=hexagon color=#ef4444 x=380 y=300 w=110 h=55 group=data icon=🗄️ }

edge react -> nginx { label="Proxy" }
edge nginx -> api { label="REST" color=#3b82f6 animate=true }
edge api -> worker { label="Task" color=#8b5cf6 style=dashed }
edge api -> pg { label="SQL" color=#10b981 }
edge api -> redis { label="Cache" color=#ef4444 }
edge worker -> pg { label="Write" color=#10b981 style=dashed }
edge worker -> redis { label="Queue" color=#ef4444 style=dashed }`,

  mindmap: `// 🧠 マインドマップ
node center "プロジェクト計画" { shape=stadium color=#6366f1 x=300 y=250 w=180 h=55 fontSize=15 }

node design "デザイン" { shape=rect color=#ec4899 x=80 y=80 w=130 h=45 }
node dev "開発" { shape=rect color=#3b82f6 x=520 y=80 w=130 h=45 }
node test "テスト" { shape=rect color=#10b981 x=80 y=420 w=130 h=45 }
node deploy "デプロイ" { shape=rect color=#f59e0b x=520 y=420 w=130 h=45 }

node ui "UI/UX" { shape=rect color=#f472b6 x=10 y=20 w=100 h=35 }
node brand "ブランド" { shape=rect color=#f472b6 x=160 y=20 w=100 h=35 }
node front "フロント" { shape=rect color=#60a5fa x=470 y=20 w=100 h=35 }
node back "バックエンド" { shape=rect color=#60a5fa x=610 y=20 w=120 h=35 }
node unit "単体テスト" { shape=rect color=#34d399 x=10 y=480 w=110 h=35 }
node e2e "E2Eテスト" { shape=rect color=#34d399 x=150 y=480 w=110 h=35 }
node ci "CI/CD" { shape=rect color=#fbbf24 x=480 y=480 w=100 h=35 }
node infra "インフラ" { shape=rect color=#fbbf24 x=620 y=480 w=100 h=35 }

edge center -> design { color=#ec4899 thickness=2 }
edge center -> dev { color=#3b82f6 thickness=2 }
edge center -> test { color=#10b981 thickness=2 }
edge center -> deploy { color=#f59e0b thickness=2 }
edge design -> ui { color=#f472b6 }
edge design -> brand { color=#f472b6 }
edge dev -> front { color=#60a5fa }
edge dev -> back { color=#60a5fa }
edge test -> unit { color=#34d399 }
edge test -> e2e { color=#34d399 }
edge deploy -> ci { color=#fbbf24 }
edge deploy -> infra { color=#fbbf24 }`,

  state: `// 🔀 状態遷移図
node idle "待機中" { shape=stadium color=#6366f1 x=300 y=50 w=140 h=50 }
node loading "読込中" { shape=rect color=#3b82f6 x=100 y=200 w=140 h=50 }
node success "成功" { shape=rect color=#10b981 x=300 y=350 w=140 h=50 }
node error "エラー" { shape=rect color=#ef4444 x=500 y=200 w=140 h=50 }
node retry "リトライ" { shape=diamond color=#f59e0b x=510 y=345 w=120 h=70 }

edge idle -> loading { label="fetch()" color=#3b82f6 }
edge loading -> success { label="200 OK" color=#10b981 }
edge loading -> error { label="Error" color=#ef4444 }
edge error -> retry { label="retry?" color=#f59e0b }
edge retry -> loading { label="Yes" color=#3b82f6 style=dashed }
edge retry -> idle { label="No / Max" color=#6366f1 style=dashed }
edge success -> idle { label="reset()" color=#6366f1 style=dashed }`,

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

node a "ノードA" { shape=rect color=#6366f1 x=100 y=150 }
node b "ノードB" { shape=rect color=#3b82f6 x=400 y=150 }
edge a -> b { label="接続" }`,
};
