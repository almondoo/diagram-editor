import { useEffect, useRef } from "react";
import type { CompletionItem } from "~/lib/core";

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
      className="absolute z-[100] bg-surface-alt border border-border-faint rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.4)] max-h-[232px] overflow-y-auto py-1 min-w-40 font-mono text-xs"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
    >
      {items.map((item, i) => (
        <div
          key={`${item.text}-${i}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className="px-2.5 py-1 cursor-pointer flex items-center gap-2"
          style={{
            background: i === selectedIndex ? "#334155" : "transparent",
            color: i === selectedIndex ? "#f1f5f9" : "#cbd5e1",
          }}
        >
          <span
            className="text-[9px] font-semibold bg-black/30 px-1 py-px rounded-[3px] min-w-5 text-center"
            style={{ color: kindColor[item.kind] ?? "#94a3b8" }}
          >
            {kindLabel[item.kind] ?? ""}
          </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
