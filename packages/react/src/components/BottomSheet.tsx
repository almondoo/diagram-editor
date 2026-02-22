import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // 背景タップで閉じる
  useEffect(() => {
    if (!open) return;
    const handleTouch = (e: TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleMouse = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 少し遅延して登録（開いた直後のタップで閉じないように）
    const timer = setTimeout(() => {
      document.addEventListener("touchstart", handleTouch);
      document.addEventListener("mousedown", handleMouse);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("mousedown", handleMouse);
    };
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const sheetStyle: CSSProperties = {
    background: "#0f1219",
    borderTop: "1px solid #2d3548",
    borderRadius: "16px 16px 0 0",
    maxHeight: "70vh",
    overflow: "auto",
    animation: "bottomSheetSlideUp 0.25s ease-out",
    WebkitOverflowScrolling: "touch",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px 8px",
    borderBottom: "1px solid #1e293b",
    position: "sticky",
    top: 0,
    background: "#0f1219",
    zIndex: 1,
  };

  const handleStyle: CSSProperties = {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: "#475569",
    margin: "8px auto 0",
  };

  return (
    <div style={overlayStyle}>
      <div ref={sheetRef} style={sheetStyle}>
        <div style={handleStyle} />
        {title && (
          <div style={headerStyle}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{title}</span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: "12px 16px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
