import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { DiagramEditor, useDiagramState } from "~/lib/react";
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

  // id が変わったとき、または savedDiagrams がストレージから遅延ロードされたときに同期
  const loadedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) {
      setCurrentDiagramId(null);
      loadedForIdRef.current = null;
      return;
    }
    if (id === loadedForIdRef.current) return;
    const diagram = savedDiagrams.find((d) => d.id === id);
    if (!diagram) return;
    state.loadSaved(diagram.code, diagram.nodeStates, diagram.groupStates, diagram.noteStates, diagram.bendStates);
    setCurrentDiagramId(id);
    loadedForIdRef.current = id;
    // state は useDiagramState の安定した参照なので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, savedDiagrams]);

  // テンプレート選択: 同一ルート内で navigate した場合、コンポーネントが
  // 再マウントされないため location.key の変化で loadTemplate を呼ぶ
  const { loadTemplate } = state;
  const prevLocationKeyRef = useRef(location.key);
  useEffect(() => {
    if (location.key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = location.key;
    if (templateCode) {
      loadTemplate(templateCode);
      setCurrentDiagramId(null);
    }
  }, [location.key, templateCode, loadTemplate]);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback(() => {
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const { code, nodeStates, groupStates, noteStates, bendStates } = state;

  const handleSave = useCallback(() => {
    if (currentDiagramId) {
      const name =
        savedDiagrams.find((d) => d.id === currentDiagramId)?.name ?? "無題";
      const saved = saveDiagram(name, currentDiagramId, code, nodeStates, groupStates, noteStates, bendStates);
      setCurrentDiagramId(saved.id);
      showToast();
    } else {
      setShowSaveModal(true);
    }
  }, [currentDiagramId, code, nodeStates, groupStates, noteStates, bendStates, savedDiagrams, saveDiagram, showToast]);

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
      const saved = saveDiagram(name, null, code, nodeStates, groupStates, noteStates, bendStates);
      setCurrentDiagramId(saved.id);
      setShowSaveModal(false);
      showToast();
      // /diagrams/new の場合は保存後に /diagrams/:id にリダイレクト
      navigate(`/diagrams/${saved.id}`, { replace: true });
    },
    [code, nodeStates, groupStates, noteStates, bendStates, saveDiagram, navigate, showToast]
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
    <div className="w-screen h-screen flex flex-col bg-bg-deepest overflow-hidden">
      <AppHeader
        onCreateFromTemplate={(code) => {
          navigate("/diagrams/new", { state: { templateCode: code } });
        }}
        onSave={handleSave}
        saveLabel={currentDiagramId ? "更新" : "保存"}
        {...(currentDiagramName !== undefined && { currentDiagramName })}
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
        <div className="fixed bottom-6 right-6 bg-surface-hover border border-primary-dark rounded-lg px-[18px] py-2.5 text-xs text-primary-pale font-semibold z-[2000] shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center gap-2 font-sans">
          <span className="text-primary">✓</span> 保存しました
        </div>
      )}
    </div>
  );
}
