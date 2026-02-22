import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";
import { useViewport } from "diagram-dsl-react";

export function meta() {
  return [
    { title: "DiagramCraft — マイ作品" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { savedDiagrams, deleteDiagram, renameDiagram } = useLocalDiagrams();
  const { isMobile } = useViewport();

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
      <main style={{ padding: isMobile ? "20px 16px" : "40px 48px", maxWidth: 1200, margin: "0 auto" }}>
        {/* タイトルと新規作成ボタン */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" as const : "row" as const,
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 0,
            marginBottom: isMobile ? 20 : 32,
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
                id={d.id}
                name={d.name}
                savedAt={d.savedAt}
                onClick={() => navigate(`/diagrams/${d.id}`)}
                onDelete={() => deleteDiagram(d.id)}
                onRename={renameDiagram}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DiagramCard({
  id,
  name,
  savedAt,
  onClick,
  onDelete,
  onRename,
}: {
  id: string;
  name: string;
  savedAt: number;
  onClick: () => void;
  onDelete: () => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) onRename(id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div
      onClick={() => { setConfirmDelete(false); onClick(); }}
      onMouseLeave={() => setConfirmDelete(false)}
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
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              width: "100%",
              background: "#131720",
              border: "1px solid #4338ca",
              borderRadius: 4,
              padding: "2px 6px",
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: 600,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#e2e8f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onDoubleClick={startEdit}
            title="ダブルクリックで名前変更"
          >
            {name}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          {new Date(savedAt).toLocaleDateString("ja-JP")}
        </div>
      </div>
      {/* アクションボタン */}
      <div
        style={{ display: "flex", gap: 4, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!editing && (
          <button
            onClick={startEdit}
            style={{
              background: "transparent",
              border: "none",
              color: "#475569",
              cursor: "pointer",
              fontSize: 13,
              padding: "4px 6px",
              borderRadius: 4,
              lineHeight: 1,
            }}
            title="名前変更"
          >
            ✎
          </button>
        )}
        <button
          onClick={handleDeleteClick}
          style={{
            background: confirmDelete ? "#7f1d1d" : "transparent",
            border: confirmDelete ? "1px solid #ef4444" : "none",
            color: confirmDelete ? "#fca5a5" : "#475569",
            cursor: "pointer",
            fontSize: confirmDelete ? 11 : 13,
            padding: "4px 6px",
            borderRadius: 4,
            lineHeight: 1,
            fontWeight: confirmDelete ? 600 : 400,
            whiteSpace: "nowrap",
          }}
          title="削除"
        >
          {confirmDelete ? "確認？" : "🗑"}
        </button>
      </div>
    </div>
  );
}
