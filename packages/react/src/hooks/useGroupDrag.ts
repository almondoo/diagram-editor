import { useState, useEffect, useRef } from "react";
import type { DiagramGroup } from "diagram-dsl-core";

export type ResizeHandle = "se" | "s" | "e";

interface GroupDragInfo {
  groupId: string;
  type: "move" | "resize";
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
}

export function useGroupDrag(
  groupById: Record<string, DiagramGroup>,
  zoom: number,
  setGroupLayout: (groupId: string, dx: number, dy: number) => void,
  setGroupSize: (groupId: string, newW: number, newH: number) => void,
) {
  const [dragInfo, setDragInfo] = useState<GroupDragInfo | null>(null);

  // Ref で最新の groupById を参照（effect の再登録を減らすため）
  const groupByIdRef = useRef(groupById);
  groupByIdRef.current = groupById;

  const handleGroupMoveMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragInfo({ groupId, type: "move", startClientX: e.clientX, startClientY: e.clientY });
  };

  const handleGroupResizeMouseDown = (
    e: React.MouseEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragInfo({ groupId, type: "resize", handle, startClientX: e.clientX, startClientY: e.clientY });
  };

  useEffect(() => {
    if (!dragInfo) return;

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startClientX) / zoom;
      const dy = (e.clientY - dragInfo.startClientY) / zoom;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      if (dragInfo.type === "move") {
        setGroupLayout(dragInfo.groupId, dx, dy);
      } else {
        const g = groupByIdRef.current[dragInfo.groupId];
        if (!g) return;
        const handle = dragInfo.handle ?? "se";
        const newW = handle === "s" ? g.w : Math.max(120, g.w + dx);
        const newH = handle === "e" ? g.h : Math.max(80, g.h + dy);
        setGroupSize(dragInfo.groupId, newW, newH);
      }

      setDragInfo((d) => d ? { ...d, startClientX: e.clientX, startClientY: e.clientY } : null);
    };

    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, zoom, setGroupLayout, setGroupSize]);

  return { handleGroupMoveMouseDown, handleGroupResizeMouseDown };
}
