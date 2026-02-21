import { useState, useEffect, useRef, useCallback } from "react";
import type { Route } from "./+types/home";
import { DiagramEditor, useDiagramState } from "diagram-dsl-react";
import { TEMPLATES } from "~/data/templates";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";
import { AppHeader } from "~/components/AppHeader";
import { SaveModal } from "~/components/SaveModal";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "DiagramCraft — Code → Diagram" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Home() {
  const state = useDiagramState(TEMPLATES.architecture);
  const { savedDiagrams, saveDiagram, deleteDiagram } = useLocalDiagrams();
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback(() => {
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const handleSave = useCallback(() => {
    if (currentDiagramId) {
      const name = savedDiagrams.find((d) => d.id === currentDiagramId)?.name ?? "無題";
      const saved = saveDiagram(name, currentDiagramId, state.code, state.nodeStates, state.groupStates);
      setCurrentDiagramId(saved.id);
      showToast();
    } else {
      setShowSaveModal(true);
    }
  }, [currentDiagramId, state.code, state.nodeStates, state.groupStates, savedDiagrams, saveDiagram, showToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#080a10",
        overflow: "hidden",
      }}
    >
      <AppHeader
        onLoadTemplate={(code) => {
          state.loadTemplate(code);
          setCurrentDiagramId(null);
        }}
        onSave={handleSave}
        saveLabel={currentDiagramId ? "更新" : "保存"}
        savedDiagrams={savedDiagrams}
        currentDiagramId={currentDiagramId}
        onLoadSaved={(d) => {
          state.loadSaved(d.code, d.nodeStates, d.groupStates);
          setCurrentDiagramId(d.id);
        }}
        onDeleteDiagram={(id) => {
          deleteDiagram(id);
          if (id === currentDiagramId) setCurrentDiagramId(null);
        }}
      />
      <DiagramEditor state={state} style={{ flex: 1 }} />
      {showSaveModal && (
        <SaveModal
          existingNames={savedDiagrams.map((d) => d.name)}
          onSave={(name) => {
            const saved = saveDiagram(name, null, state.code, state.nodeStates, state.groupStates);
            setCurrentDiagramId(saved.id);
          }}
          onClose={() => setShowSaveModal(false)}
        />
      )}
      {toastVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1e2435",
            border: "1px solid #4338ca",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 12,
            color: "#a5b4fc",
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
          }}
        >
          <span style={{ color: "#6366f1" }}>✓</span> 保存しました
        </div>
      )}
    </div>
  );
}
