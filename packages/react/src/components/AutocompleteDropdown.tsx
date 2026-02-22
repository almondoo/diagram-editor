import { useEffect, useRef } from "react";
import type { CompletionItem } from "diagram-dsl-core";

interface AutocompleteDropdownProps {
  items: CompletionItem[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (item: CompletionItem) => void;
}

export function AutocompleteDropdown({ items, selectedIndex, position, onSelect }: AutocompleteDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const selected = el.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  const kindLabel: Record<string, string> = {
    keyword: "KW",
    property: "P",
    value: "V",
    id: "ID",
    operator: "OP",
  };

  const kindColor: Record<string, string> = {
    keyword: "#c084fc",
    property: "#60a5fa",
    value: "#34d399",
    id: "#fbbf24",
    operator: "#f97316",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 100,
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        maxHeight: 8 * 28 + 8,
        overflowY: "auto",
        padding: "4px 0",
        minWidth: 160,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
      }}
      ref={listRef}
    >
      {items.map((item, i) => (
        <div
          key={`${item.text}-${i}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          style={{
            padding: "4px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: i === selectedIndex ? "#334155" : "transparent",
            color: i === selectedIndex ? "#f1f5f9" : "#cbd5e1",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: kindColor[item.kind] ?? "#94a3b8",
              background: "rgba(0,0,0,0.3)",
              padding: "1px 4px",
              borderRadius: 3,
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {kindLabel[item.kind] ?? ""}
          </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
