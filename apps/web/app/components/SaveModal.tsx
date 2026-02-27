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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-panel border border-border rounded-[10px] px-7 py-6 min-w-80 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="text-sm font-semibold text-text-primary mb-4">
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
          className="w-full bg-bg-overlay border border-border rounded-md px-3 py-2 text-text-primary text-[13px] outline-none box-border"
        />
        {showOverwriteWarning && (
          <div className="text-[11px] text-error mt-2">
            「{name}」はすでに存在します。上書きしますか？
          </div>
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={onClose}
            className="bg-transparent border border-border text-text-faint px-3.5 py-1.5 rounded-[5px] cursor-pointer text-xs"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="border-none px-3.5 py-1.5 rounded-[5px] text-xs font-semibold"
            style={{
              background: name.trim() ? "#4338ca" : "#1e293b",
              color: name.trim() ? "#e0e7ff" : "#475569",
              cursor: name.trim() ? "pointer" : "default",
            }}
          >
            {showOverwriteWarning ? "上書き保存" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
