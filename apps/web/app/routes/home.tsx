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
    <div className="min-h-screen bg-bg-deepest text-text-primary font-sans">
      {/* ヘッダー */}
      <header className="flex items-center px-6 h-12 bg-bg-raised border-b border-border-subtle gap-2.5">
        <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-purple flex items-center justify-center text-sm font-bold">
          ◈
        </div>
        <span className="text-[15px] font-bold tracking-tight">
          DiagramCraft
        </span>
        <span className="text-[9px] bg-primary-darker text-primary-pale px-1.5 py-0.5 rounded-[4px] font-semibold tracking-[0.05em] uppercase">
          Code → Diagram
        </span>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-[1200px] mx-auto" style={{ padding: isMobile ? "20px 16px" : "40px 48px" }}>
        {/* タイトルと新規作成ボタン */}
        <div
          className="flex justify-between"
          style={{
            flexDirection: isMobile ? "column" as const : "row" as const,
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 12 : 0,
            marginBottom: isMobile ? 20 : 32,
          }}
        >
          <h1 className="text-[22px] font-bold text-text-primary m-0 tracking-tight">
            マイ作品
          </h1>
          <Link
            to="/diagrams/new"
            className="bg-primary-darker border border-primary-dark text-primary-lighter px-4 py-1.5 rounded-md cursor-pointer text-[13px] font-semibold no-underline inline-flex items-center gap-1.5"
          >
            + 新規作成
          </Link>
        </div>

        {/* ダイアグラム一覧 */}
        {savedDiagrams.length === 0 ? (
          <div className="text-center py-20 text-text-dimmed">
            <div className="text-[40px] mb-4">◈</div>
            <p className="text-sm m-0">
              保存済みのダイアグラムはありません
            </p>
            <p className="text-xs mt-2 text-border-faint">
              「+ 新規作成」からダイアグラムを作成しましょう
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
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
      className="bg-bg-panel border border-border-subtle rounded-[10px] px-5 py-4 cursor-pointer flex items-center justify-between gap-3 transition-[border-color] duration-150 hover:border-primary-dark"
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="w-full bg-bg-overlay border border-primary-dark rounded-[4px] px-1.5 py-0.5 text-text-primary text-sm font-semibold outline-none box-border"
          />
        ) : (
          <div
            className="text-sm font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap"
            onDoubleClick={startEdit}
            title="ダブルクリックで名前変更"
          >
            {name}
          </div>
        )}
        <div className="text-[11px] text-text-dimmed mt-1">
          {new Date(savedAt).toLocaleDateString("ja-JP")}
        </div>
      </div>
      {/* アクションボタン */}
      <div
        className="flex gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {!editing && (
          <button
            onClick={startEdit}
            className="bg-transparent border-none text-text-dimmed cursor-pointer text-[13px] px-1.5 py-1 rounded-[4px] leading-none"
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
