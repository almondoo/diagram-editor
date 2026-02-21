import { useState, useEffect } from "react";

export function useSplitPane(containerRef: React.RefObject<HTMLDivElement | null>, initialPos = 42) {
  const [splitPos, setSplitPos] = useState(initialPos);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const move = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(20, Math.min(70, pct)));
    };
    const up = () => setIsResizing(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [isResizing, containerRef]);

  return { splitPos, isResizing, setIsResizing };
}
