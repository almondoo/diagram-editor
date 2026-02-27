import { useState, useEffect, useRef } from "react";

interface SaveModalProps {
  existingNames: string[];
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SaveModal({ existingNames, onSave, onClose }: SaveModalProps) {
  const [name, setName] = useState("");
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed) && !showOverwriteWarning) {
      setShowOverwriteWarning(true);
      return;
    }
    onSave(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#0f1219",
          border: "1px solid #2d3548",
          borderRadius: 10,
          padding: "24px 28px",
          minWidth: 320,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>
          ダイアグラムを保存
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setShowOverwriteWarning(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="名前を入力"
          style={{
            width: "100%",
            background: "#131720",
            border: "1px solid #2d3548",
            borderRadius: 6,
            padding: "8px 12px",
            color: "#e2e8f0",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {showOverwriteWarning && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>
            「{name}」はすでに存在します。上書きしますか？
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #2d3548",
              color: "#64748b",
              padding: "6px 14px",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? "#4338ca" : "#1e293b",
              border: "none",
              color: name.trim() ? "#e0e7ff" : "#475569",
              padding: "6px 14px",
              borderRadius: 5,
              cursor: name.trim() ? "pointer" : "default",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {showOverwriteWarning ? "上書き保存" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
