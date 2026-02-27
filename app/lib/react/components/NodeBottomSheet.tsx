import { useState } from "react";
import { VIBRANT_COLORS } from "~/lib/core";
import type { DiagramNode, DiagramEdge } from "~/lib/core";
import { BottomSheet } from "./BottomSheet";

const SHAPES = [
  { value: "rect", label: "矩形", icon: "▭" },
  { value: "stadium", label: "角丸", icon: "⊂⊃" },
  { value: "diamond", label: "ダイヤ", icon: "◇" },
  { value: "ellipse", label: "楕円", icon: "○" },
  { value: "circle", label: "円", icon: "●" },
  { value: "cylinder", label: "DB", icon: "⊖" },
  { value: "hexagon", label: "六角", icon: "⬡" },
  { value: "parallelogram", label: "平行", icon: "▱" },
  { value: "trapezoid", label: "台形", icon: "⏢" },
] as const;

interface ConnectedEdge {
  edge: DiagramEdge;
  direction: "outgoing" | "incoming";
  targetId: string;
  targetLabel: string;
}

interface NodeBottomSheetProps {
  node: DiagramNode | null;
  edges: ConnectedEdge[];
  open: boolean;
  onClose: () => void;
  onUpdateProp: (nodeId: string, key: string, value: string) => void;
  onUpdateEdgeProp: (fromId: string, toId: string, key: string, value: string) => void;
  onDeleteEdge: (fromId: string, toId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdge: (fromId: string) => void;
}

function EdgeLabelInput({
  edge,
  onUpdate,
}: {
  edge: DiagramEdge;
  onUpdate: (fromId: string, toId: string, key: string, value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(edge.label);
  const [editing, setEditing] = useState(false);

  if (!editing && localValue !== edge.label) {
    setLocalValue(edge.label);
  }

  return (
    <input
      value={editing ? localValue : edge.label}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => {
        setLocalValue(edge.label);
        setEditing(true);
      }}
      onBlur={() => {
        setEditing(false);
        const trimmed = localValue.trim();
        if (trimmed !== edge.label) {
          onUpdate(edge.from, edge.to, "label", trimmed);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full bg-bg-overlay border border-border rounded-md px-2.5 py-1.5 text-text-primary text-[13px] outline-none font-sans box-border flex-1"
      placeholder="ラベルなし"
    />
  );
}

export function NodeBottomSheet({
  node,
  edges,
  open,
  onClose,
  onUpdateProp,
  onUpdateEdgeProp,
  onDeleteEdge,
  onDelete,
  onStartEdge,
}: NodeBottomSheetProps) {
  const [localLabel, setLocalLabel] = useState("");
  const [isEditingLabel, setIsEditingLabel] = useState(false);

  // ラベル編集開始時にlocal stateを同期
  if (open && node && !isEditingLabel && localLabel !== node.label) {
    setLocalLabel(node.label);
  }

  if (!node) return null;

  const handleLabelFocus = () => {
    setLocalLabel(node.label);
    setIsEditingLabel(true);
  };

  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    const trimmed = localLabel.trim();
    if (trimmed && trimmed !== node.label) {
      onUpdateProp(node.id, "label", trimmed);
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ノード編集">
      {/* ラベル */}
      <div className="mb-4">
        <div className="text-[11px] text-text-faint uppercase tracking-[0.1em] mb-2 font-mono">ラベル</div>
        <input
          value={isEditingLabel ? localLabel : node.label}
          onChange={(e) => setLocalLabel(e.target.value)}
          onFocus={handleLabelFocus}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
          className="w-full bg-bg-overlay border border-border rounded-md px-3 py-2 text-text-primary text-sm outline-none font-sans box-border"
          placeholder="ノード名を入力"
        />
      </div>

      {/* シェイプ */}
      <div className="mb-4">
        <div className="text-[11px] text-text-faint uppercase tracking-[0.1em] mb-2 font-mono">シェイプ</div>
        <div className="flex flex-wrap gap-1.5">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdateProp(node.id, "shape", s.value)}
              className="w-12 h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg cursor-pointer text-base"
              style={{
                background: node.shape === s.value ? "#312e81" : "#1a1f2e",
                border: `1px solid ${node.shape === s.value ? "#6366f1" : "#2d3548"}`,
                color: node.shape === s.value ? "#c7d2fe" : "#94a3b8",
              }}
            >
              <span>{s.icon}</span>
              <span className="text-[8px] leading-none">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* カラー */}
      <div className="mb-4">
        <div className="text-[11px] text-text-faint uppercase tracking-[0.1em] mb-2 font-mono">カラー</div>
        <div className="flex flex-wrap gap-1.5">
          {VIBRANT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdateProp(node.id, "color", color)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: color,
                border: node.color === color
                  ? "3px solid #e2e8f0"
                  : "2px solid transparent",
                cursor: "pointer",
                outline: node.color === color ? `2px solid ${color}` : "none",
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* エッジ一覧 */}
      {edges.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] text-text-faint uppercase tracking-[0.1em] mb-2 font-mono">エッジ ({edges.length})</div>
          <div className="flex flex-col gap-2">
            {edges.map((ce, i) => (
              <div
                key={`${ce.edge.from}-${ce.edge.to}-${i}`}
                className="bg-bg-overlay border border-border rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 mb-2 text-xs text-text-muted">
                  <span style={{
                    background: ce.direction === "outgoing" ? "#1e3a5f" : "#3a1e5f",
                    color: ce.direction === "outgoing" ? "#7dd3fc" : "#c4b5fd",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    {ce.direction === "outgoing" ? "OUT" : "IN"}
                  </span>
                  <span className="text-text-faint">
                    {ce.direction === "outgoing" ? `→ ${ce.targetLabel}` : `${ce.targetLabel} →`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <EdgeLabelInput edge={ce.edge} onUpdate={onUpdateEdgeProp} />
                  <button
                    onClick={() => onDeleteEdge(ce.edge.from, ce.edge.to)}
                    className="bg-error-surface border border-error-bg rounded-md text-error-light px-2.5 py-1.5 cursor-pointer text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            onStartEdge(node.id);
            onClose();
          }}
          className="flex-1 py-2.5 bg-primary-darker border border-primary-dark rounded-lg text-primary-lighter text-[13px] font-semibold cursor-pointer"
        >
          → エッジ追加
        </button>
        <button
          onClick={() => {
            onDelete(node.id);
            onClose();
          }}
          className="px-4 py-2.5 bg-error-surface border border-error-bg rounded-lg text-error-light text-[13px] font-semibold cursor-pointer"
        >
          削除
        </button>
      </div>
    </BottomSheet>
  );
}
