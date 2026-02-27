import { useEffect, useRef, type ReactNode } from "react";

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
    const handleOutsideInteraction = (e: Event) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 少し遅延して登録（開いた直後のタップで閉じないように）
    const timer = setTimeout(() => {
      document.addEventListener("touchstart", handleOutsideInteraction);
      document.addEventListener("mousedown", handleOutsideInteraction);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("touchstart", handleOutsideInteraction);
      document.removeEventListener("mousedown", handleOutsideInteraction);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex flex-col justify-end">
      <div ref={sheetRef} className="bg-bg-panel border-t border-border rounded-t-2xl max-h-[70vh] overflow-auto animate-slide-up [-webkit-overflow-scrolling:touch]">
        <div className="w-9 h-1 rounded-sm bg-text-dimmed mt-2 mx-auto" />
        {title && (
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border-subtle sticky top-0 bg-bg-panel z-[1]">
            <span className="text-sm font-semibold text-text-primary">{title}</span>
            <button
              onClick={onClose}
              className="bg-transparent border-none text-text-muted text-lg cursor-pointer px-2 py-1 leading-none"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-4 pt-3 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
