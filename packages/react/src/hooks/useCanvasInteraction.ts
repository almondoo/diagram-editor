import { useState, useEffect, useCallback } from "react";
import type { DiagramNode, DiagramGroup } from "diagram-dsl-core";

export function useCanvasInteraction(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent, onDeselect: () => void) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      onDeselect();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  useEffect(() => {
    if (!isPanning || !panStart) return;
    const move = (e: MouseEvent) => setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const up = () => setIsPanning(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [isPanning, panStart]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z - 0.15));

  const fitView = useCallback(
    (nodes: DiagramNode[], groups: DiagramGroup[]) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      // コンテンツのバウンディングボックスを計算
      const rects = [
        ...nodes.map((n) => ({ x: n.x, y: n.y, r: n.x + n.w, b: n.y + n.h })),
        ...groups.map((g) => ({ x: g.x, y: g.y, r: g.x + g.w, b: g.y + g.h })),
      ].filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));

      if (rects.length === 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.r));
      const maxY = Math.max(...rects.map((r) => r.b));
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const { width: svgW, height: svgH } = svgEl.getBoundingClientRect();
      const pad = 40;
      const newZoom = Math.max(0.2, Math.min(3, Math.min(
        (svgW - pad * 2) / contentW,
        (svgH - pad * 2) / contentH,
      )));

      // コンテンツを中央に配置するパン
      setPan({
        x: pad - minX * newZoom + (svgW - pad * 2 - contentW * newZoom) / 2,
        y: pad - minY * newZoom + (svgH - pad * 2 - contentH * newZoom) / 2,
      });
      setZoom(newZoom);
    },
    [svgRef],
  );

  return { zoom, pan, isPanning, handleCanvasMouseDown, handleWheel, zoomIn, zoomOut, fitView };
}
