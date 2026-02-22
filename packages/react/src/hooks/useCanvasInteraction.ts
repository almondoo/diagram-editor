import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode, DiagramGroup } from "diagram-dsl-core";

export function useCanvasInteraction(
  svgRef: React.RefObject<SVGSVGElement | null>,
  svgGroupRef: React.RefObject<SVGGElement | null>,
  gridRef: React.RefObject<SVGPatternElement | null>,
  gridLargeRef: React.RefObject<SVGPatternElement | null>,
) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const applyPanDirect = useCallback((x: number, y: number) => {
    panRef.current = { x, y };
    const t = `translate(${x},${y}) scale(${zoomRef.current})`;
    svgGroupRef.current?.setAttribute("transform", t);
    gridRef.current?.setAttribute("patternTransform", t);
    gridLargeRef.current?.setAttribute("patternTransform", t);
  }, [svgGroupRef, gridRef, gridLargeRef]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) setIsSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // wheel・タッチイベントをキャンバスコンテナに passive:false で直接登録
  // スワイプナビゲーションを防止し、スクロール→パン、Ctrl+スクロール→ズームに対応
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // ピンチズーム（トラックパッド）またはCtrl+ホイール
        setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.005)));
      } else {
        // 2本指スクロール → パン（React 再レンダリングをバイパスして DOM 直接操作）
        applyPanDirect(
          panRef.current.x - e.deltaX,
          panRef.current.y - e.deltaY,
        );
      }
    };

    // タッチパン（1本指スワイプ）& ピンチズーム（2本指）
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let initialPinchDist = 0;
    let initialPinchZoom = 1;
    let isPinching = false;

    const getDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const isBgTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return target === svgRef.current || target.getAttribute("data-bg") === "true";
    };

    let isSingleFingerPan = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        isSingleFingerPan = false;
        initialPinchDist = getDist(e.touches[0], e.touches[1]);
        initialPinchZoom = zoomRef.current;
        touchStartPanX = panRef.current.x;
        touchStartPanY = panRef.current.y;
      } else if (e.touches.length === 1 && !isPinching && isBgTarget(e.target)) {
        // 背景タッチのみパン（ノード・グループ上のタッチはスキップ）
        e.preventDefault();
        isSingleFingerPan = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartPanX = panRef.current.x;
        touchStartPanY = panRef.current.y;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const scale = dist / initialPinchDist;
        const newZoom = Math.max(0.2, Math.min(3, initialPinchZoom * scale));
        setZoom(newZoom);
      } else if (e.touches.length === 1 && isSingleFingerPan) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        applyPanDirect(touchStartPanX + dx, touchStartPanY + dy);
      }
    };

    const onTouchEnd = () => {
      isPinching = false;
      isSingleFingerPan = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [svgRef, applyPanDirect]);

  const handleCanvasMouseDown = (e: React.MouseEvent, onDeselect: () => void) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      onDeselect();
      if (isSpaceHeld) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      }
      // Space なしの場合は選択矩形モード（DiagramEditor.tsx が処理）
    }
  };

  useEffect(() => {
    if (!isPanning) return;
    const move = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      applyPanDirect(
        e.clientX - panStartRef.current.x,
        e.clientY - panStartRef.current.y,
      );
    };
    const up = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isPanning, applyPanDirect]);

  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z - 0.15));

  const fitView = useCallback(
    (nodes: DiagramNode[], groups: DiagramGroup[]) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const rects = [
        ...nodes.map((n) => ({ x: n.x, y: n.y, r: n.x + n.w, b: n.y + n.h })),
        ...groups.map((g) => ({ x: g.x, y: g.y, r: g.x + g.w, b: g.y + g.h })),
      ].filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));

      if (rects.length === 0) {
        setZoom(1);
        applyPanDirect(0, 0);
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
        applyPanDirect(0, 0);
        return;
      }

      const { width: svgW, height: svgH } = svgEl.getBoundingClientRect();
      const pad = 40;
      const newZoom = Math.max(0.2, Math.min(3, Math.min(
        (svgW - pad * 2) / contentW,
        (svgH - pad * 2) / contentH,
      )));

      applyPanDirect(
        pad - minX * newZoom + (svgW - pad * 2 - contentW * newZoom) / 2,
        pad - minY * newZoom + (svgH - pad * 2 - contentH * newZoom) / 2,
      );
      setZoom(newZoom);
    },
    [svgRef, applyPanDirect],
  );

  return { zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView };
}
