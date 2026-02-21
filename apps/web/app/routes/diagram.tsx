import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { DiagramEditor, useDiagramState } from "diagram-dsl-react";
import { TEMPLATES } from "~/data/templates";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";
import { AppHeader } from "~/components/AppHeader";
import { SaveModal } from "~/components/SaveModal";

export function meta() {
  return [
    { title: "DiagramCraft — Code → Diagram" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Diagram() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { savedDiagrams, saveDiagram, renameDiagram } = useLocalDiagrams();

  const templateCode = (location.state as { templateCode?: string } | null)?.templateCode;
  const initialDiagram = id ? savedDiagrams.find((d) => d.id === id) : null;
  const state = useDiagramState(
    initialDiagram?.code ?? templateCode ?? TEMPLATES.architecture
  );

  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(
    id ?? null
  );
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // id が変わったとき（/diagrams/new → /diagrams/:id へのリダイレクト後など）に同期
  useEffect(() => {
    if (id) {
      const diagram = savedDiagrams.find((d) => d.id === id);
      if (diagram) {
        state.loadSaved(diagram.code, diagram.nodeStates, diagram.groupStates);
        setCurrentDiagramId(id);
      }
    } else {
      setCurrentDiagramId(null);
    }
    // state は useDiagramState の安定した参照なので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      const name =
        savedDiagrams.find((d) => d.id === currentDiagramId)?.name ?? "無題";
      const saved = saveDiagram(
        name,
        currentDiagramId,
        state.code,
        state.nodeStates,
        state.groupStates
      );
      setCurrentDiagramId(saved.id);
      showToast();
    } else {
      setShowSaveModal(true);
    }
  }, [
    currentDiagramId,
    state.code,
    state.nodeStates,
    state.groupStates,
    savedDiagrams,
    saveDiagram,
    showToast,
  ]);

  const currentDiagramName = currentDiagramId
    ? savedDiagrams.find((d) => d.id === currentDiagramId)?.name
    : undefined;

  const handleRenameDiagram = useCallback(
    (name: string) => {
      if (!currentDiagramId) return;
      renameDiagram(currentDiagramId, name);
    },
    [currentDiagramId, renameDiagram]
  );

  const handleModalSave = useCallback(
    (name: string) => {
      const saved = saveDiagram(
        name,
        null,
        state.code,
        state.nodeStates,
        state.groupStates
      );
      setCurrentDiagramId(saved.id);
      setShowSaveModal(false);
      showToast();
      // /diagrams/new の場合は保存後に /diagrams/:id にリダイレクト
      navigate(`/diagrams/${saved.id}`, { replace: true });
    },
    [state.code, state.nodeStates, state.groupStates, saveDiagram, navigate, showToast]
  );

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
        currentDiagramName={currentDiagramName}
        onRenameDiagram={handleRenameDiagram}
      />
      <DiagramEditor state={state} style={{ flex: 1 }} />
      {showSaveModal && (
        <SaveModal
          existingNames={savedDiagrams.map((d) => d.name)}
          onSave={handleModalSave}
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
