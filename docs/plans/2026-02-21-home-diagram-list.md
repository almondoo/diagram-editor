# ホームページ ダイアグラム一覧 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ホームページ（`/`）をダイアグラム一覧にし、エディタを `/diagrams/new` と `/diagrams/:id` に移動する

**Architecture:** React Router v7 のファイルベースルーティングで3ルートを設定。現 `home.tsx` の内容を `diagram.tsx` に移動し、`home.tsx` は一覧ページに書き換える。`useParams` で id を取得し、localStorage から初期状態を復元。保存後 `useNavigate` でリダイレクト。

**Tech Stack:** React Router v7, React, TypeScript, インラインスタイル（Tailwindなし）

---

### Task 1: routes.ts にルートを追加

**Files:**
- Modify: `apps/web/app/routes.ts`

**Step 1: ファイルを編集**

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("diagrams/new", "routes/diagram.tsx"),
  route("diagrams/:id", "routes/diagram.tsx"),
] satisfies RouteConfig;
```

**Step 2: 型チェックで確認（diagram.tsx がまだないのでエラーが出るが routes.ts 自体は問題ないことを確認）**

```bash
docker compose exec app pnpm --filter diagram-editor-web typecheck 2>&1 | head -20
```

Expected: `routes/diagram.tsx` not found のエラーが出る（次タスクで解消）

---

### Task 2: routes/diagram.tsx を新規作成（エディタページ）

現 `home.tsx` の内容をほぼそのまま移動し、URL パラメータで初期状態を制御する。

**Files:**
- Create: `apps/web/app/routes/diagram.tsx`

**Step 1: ファイルを作成**

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { DiagramEditor, useDiagramState } from "diagram-dsl-react";
import { TEMPLATES } from "~/data/templates";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";
import { AppHeader } from "~/components/AppHeader";
import { SaveModal } from "~/components/SaveModal";

export function meta() {
  return [
    { title: "DiagramCraft — Code → Diagram" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Diagram() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedDiagrams, saveDiagram } = useLocalDiagrams();

  const initialDiagram = id ? savedDiagrams.find((d) => d.id === id) : null;
  const state = useDiagramState(initialDiagram?.code ?? TEMPLATES.architecture);

  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(
    id ?? null
  );
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // id が変わったとき（/diagrams/new → /diagrams/:id へのリダイレクト後など）に同期
  useEffect(() => {
    if (id) {
      const diagram = savedDiagrams.find((d) => d.id === id);
      if (diagram) {
        state.loadSaved(diagram.code, diagram.nodeStates, diagram.groupStates);
        setCurrentDiagramId(id);
      }
    } else {
      setCurrentDiagramId(null);
    }
    // state は useDiagramState の安定した参照なので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback(() => {
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const handleSave = useCallback(() => {
    if (currentDiagramId) {
      const name =
        savedDiagrams.find((d) => d.id === currentDiagramId)?.name ?? "無題";
      const saved = saveDiagram(
        name,
        currentDiagramId,
        state.code,
        state.nodeStates,
        state.groupStates
      );
      setCurrentDiagramId(saved.id);
      showToast();
    } else {
      setShowSaveModal(true);
    }
  }, [
    currentDiagramId,
    state.code,
    state.nodeStates,
    state.groupStates,
    savedDiagrams,
    saveDiagram,
    showToast,
  ]);

  const handleModalSave = useCallback(
    (name: string) => {
      const saved = saveDiagram(
        name,
        null,
        state.code,
        state.nodeStates,
        state.groupStates
      );
      setCurrentDiagramId(saved.id);
      setShowSaveModal(false);
      showToast();
      // /diagrams/new の場合は保存後に /diagrams/:id にリダイレクト
      navigate(`/diagrams/${saved.id}`, { replace: true });
    },
    [state.code, state.nodeStates, state.groupStates, saveDiagram, navigate, showToast]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#080a10",
        overflow: "hidden",
      }}
    >
      <AppHeader
        onLoadTemplate={(code) => {
          state.loadTemplate(code);
          setCurrentDiagramId(null);
        }}
        onSave={handleSave}
        saveLabel={currentDiagramId ? "更新" : "保存"}
      />
      <DiagramEditor state={state} style={{ flex: 1 }} />
      {showSaveModal && (
        <SaveModal
          existingNames={savedDiagrams.map((d) => d.name)}
          onSave={handleModalSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
      {toastVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1e2435",
            border: "1px solid #4338ca",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 12,
            color: "#a5b4fc",
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
          }}
        >
          <span style={{ color: "#6366f1" }}>✓</span> 保存しました
        </div>
      )}
    </div>
  );
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-editor-web typecheck
```

Expected: AppHeader の型エラーが出る（次タスクで解消）

---

### Task 3: AppHeader.tsx から「マイ作品」を削除しホームリンクを追加

不要になった props（`savedDiagrams`, `currentDiagramId`, `onLoadSaved`, `onDeleteDiagram`）を削除し、「← 一覧へ」リンクを追加する。

**Files:**
- Modify: `apps/web/app/components/AppHeader.tsx`

**Step 1: ファイルを書き換え**

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { TEMPLATES } from "~/data/templates";

interface AppHeaderProps {
  onLoadTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
}

export function AppHeader({
  onLoadTemplate,
  onSave,
  saveLabel,
}: AppHeaderProps) {
  const [templateHovered, setTemplateHovered] = useState<string | null>(null);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        height: 48,
        background: "#0c0e14",
        borderBottom: "1px solid #1e293b",
        flexShrink: 0,
        fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
        color: "#e2e8f0",
      }}
    >
      {/* ブランディング（ホームリンク） */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ◈
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
          DiagramCraft
        </span>
        <span
          style={{
            fontSize: 9,
            background: "#312e81",
            color: "#a5b4fc",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Code → Diagram
        </span>
      </Link>

      {/* テンプレートボタン */}
      <div style={{ display: "flex", gap: 4, marginLeft: 24, alignItems: "center" }}>
        <span
          style={{
            fontSize: 10,
            color: "#64748b",
            marginRight: 4,
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          テンプレート
        </span>
        {Object.entries(TEMPLATES)
          .filter(([k]) => k !== "empty")
          .map(([key, val]) => (
            <button
              key={key}
              onClick={() => onLoadTemplate(val)}
              onMouseEnter={() => setTemplateHovered(key)}
              onMouseLeave={() => setTemplateHovered(null)}
              style={{
                background: templateHovered === key ? "#1e293b" : "#131720",
                border: `1px solid ${templateHovered === key ? "#475569" : "#2d3548"}`,
                color: "#94a3b8",
                padding: "3px 10px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                transition: "all 0.15s",
              }}
            >
              {key === "flowchart"
                ? "フローチャート"
                : key === "sequence"
                  ? "シーケンス"
                  : key === "er"
                    ? "ER図"
                    : key === "architecture"
                      ? "アーキテクチャ"
                      : key === "mindmap"
                        ? "マインドマップ"
                        : key === "state"
                          ? "状態遷移"
                          : key}
            </button>
          ))}
        <button
          onClick={() => onLoadTemplate(TEMPLATES.empty)}
          onMouseEnter={() => setTemplateHovered("empty")}
          onMouseLeave={() => setTemplateHovered(null)}
          style={{
            background: templateHovered === "empty" ? "#1e293b" : "#131720",
            border: `1px solid ${templateHovered === "empty" ? "#475569" : "#2d3548"}`,
            color: "#64748b",
            padding: "3px 10px",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            transition: "all 0.15s",
          }}
        >
          + 新規
        </button>
      </div>

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        style={{
          background: "#312e81",
          border: "1px solid #4338ca",
          color: "#c7d2fe",
          padding: "3px 12px",
          borderRadius: 5,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          marginLeft: 8,
        }}
      >
        {saveLabel}
      </button>

      <div style={{ flex: 1 }} />
    </header>
  );
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-editor-web typecheck
```

Expected: home.tsx の型エラーが出る（次タスクで解消）

---

### Task 4: home.tsx を一覧ページに書き換え

**Files:**
- Modify: `apps/web/app/routes/home.tsx`

**Step 1: ファイルを書き換え**

```tsx
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";

export function meta() {
  return [
    { title: "DiagramCraft — マイ作品" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { savedDiagrams, deleteDiagram } = useLocalDiagrams();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080a10",
        color: "#e2e8f0",
        fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          height: 48,
          background: "#0c0e14",
          borderBottom: "1px solid #1e293b",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ◈
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
          DiagramCraft
        </span>
        <span
          style={{
            fontSize: 9,
            background: "#312e81",
            color: "#a5b4fc",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Code → Diagram
        </span>
      </header>

      {/* メインコンテンツ */}
      <main style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>
        {/* タイトルと新規作成ボタン */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#e2e8f0",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            マイ作品
          </h1>
          <Link
            to="/diagrams/new"
            style={{
              background: "#312e81",
              border: "1px solid #4338ca",
              color: "#c7d2fe",
              padding: "6px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            + 新規作成
          </Link>
        </div>

        {/* ダイアグラム一覧 */}
        {savedDiagrams.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "#475569",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
            <p style={{ fontSize: 14, margin: 0 }}>
              保存済みのダイアグラムはありません
            </p>
            <p style={{ fontSize: 12, margin: "8px 0 0", color: "#334155" }}>
              「+ 新規作成」からダイアグラムを作成しましょう
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {savedDiagrams.map((d) => (
              <DiagramCard
                key={d.id}
                name={d.name}
                savedAt={d.savedAt}
                onClick={() => navigate(`/diagrams/${d.id}`)}
                onDelete={() => deleteDiagram(d.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DiagramCard({
  name,
  savedAt,
  onClick,
  onDelete,
}: {
  name: string;
  savedAt: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0f1219",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#4338ca";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b";
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#e2e8f0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          {new Date(savedAt).toLocaleDateString("ja-JP")}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "#475569",
          cursor: "pointer",
          fontSize: 16,
          padding: "4px 6px",
          borderRadius: 4,
          flexShrink: 0,
          lineHeight: 1,
        }}
        title="削除"
      >
        ×
      </button>
    </div>
  );
}
```

**Step 2: 型チェック（全体）**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

---

### Task 5: ビルド確認・動作テスト・コミット

**Step 1: ビルド確認**

```bash
docker compose exec app pnpm -r build
```

Expected: エラーなし

**Step 2: ブラウザで動作確認**

http://localhost:5173 を開いて以下を確認：

1. `/` → マイ作品一覧が表示される
2. 「+ 新規作成」クリック → `/diagrams/new` に遷移し、エディタが開く
3. Cmd+S → 保存モーダルが開く
4. 名前を入力して保存 → `/diagrams/{id}` にリダイレクトされる
5. ブラウザバック → `/` 一覧に戻る
6. 一覧のカードクリック → `/diagrams/{id}` にエディタが開く
7. ヘッダーの「DiagramCraft」ロゴクリック → `/` 一覧に戻る

**Step 3: コミット**

```bash
git add apps/web/app/routes.ts \
        apps/web/app/routes/diagram.tsx \
        apps/web/app/routes/home.tsx \
        apps/web/app/components/AppHeader.tsx
git commit -m "feat: add diagram list home page and move editor to /diagrams/:id"
```
