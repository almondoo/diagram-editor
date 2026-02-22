import { useState, type CSSProperties } from "react";
import { VIBRANT_COLORS } from "diagram-dsl-core";
import type { DiagramNode } from "diagram-dsl-core";
import { BottomSheet } from "./BottomSheet.js";

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

interface NodeBottomSheetProps {
  node: DiagramNode | null;
  open: boolean;
  onClose: () => void;
  onUpdateProp: (nodeId: string, key: string, value: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdge: (fromId: string) => void;
}

const sectionTitle: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: 8,
  fontFamily: "'IBM Plex Mono', monospace",
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "#131720",
  border: "1px solid #2d3548",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
  boxSizing: "border-box",
};

export function NodeBottomSheet({
  node,
  open,
  onClose,
  onUpdateProp,
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
      <div style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>ラベル</div>
        <input
          value={isEditingLabel ? localLabel : node.label}
          onChange={(e) => setLocalLabel(e.target.value)}
          onFocus={handleLabelFocus}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
          style={inputStyle}
          placeholder="ノード名を入力"
        />
      </div>

      {/* シェイプ */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>シェイプ</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdateProp(node.id, "shape", s.value)}
              style={{
                width: 48,
                height: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: node.shape === s.value ? "#312e81" : "#1a1f2e",
                border: `1px solid ${node.shape === s.value ? "#6366f1" : "#2d3548"}`,
                borderRadius: 8,
                color: node.shape === s.value ? "#c7d2fe" : "#94a3b8",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              <span>{s.icon}</span>
              <span style={{ fontSize: 8, lineHeight: 1 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* カラー */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>カラー</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

      {/* アクション */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            onStartEdge(node.id);
            onClose();
          }}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "#312e81",
            border: "1px solid #4338ca",
            borderRadius: 8,
            color: "#c7d2fe",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          → エッジ追加
        </button>
        <button
          onClick={() => {
            onDelete(node.id);
            onClose();
          }}
          style={{
            padding: "10px 16px",
            background: "#1a0a0a",
            border: "1px solid #7f1d1d",
            borderRadius: 8,
            color: "#fca5a5",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          削除
        </button>
      </div>
    </BottomSheet>
  );
}
