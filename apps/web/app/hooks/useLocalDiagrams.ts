import { useState, useCallback, useRef } from "react";
import type { DiagramNode, DiagramGroup, DiagramNote } from "diagram-dsl-core";

const STORAGE_KEY = "diagramcraft_saved_diagrams";

export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;
  noteStates: Record<string, DiagramNote>;
  savedAt: number;
}

function loadFromStorage(): SavedDiagram[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const diagrams = Array.isArray(parsed) ? (parsed as SavedDiagram[]) : [];
    return diagrams.map((d) => ({ ...d, groupStates: d.groupStates ?? {}, noteStates: d.noteStates ?? {} }));
  } catch {
    return [];
  }
}

function saveToStorage(diagrams: SavedDiagram[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
  } catch {
    // QuotaExceededError 等 - メモリ上のステートは維持
  }
}

export function useLocalDiagrams() {
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(loadFromStorage);
  const savedDiagramsRef = useRef(savedDiagrams);
  savedDiagramsRef.current = savedDiagrams;

  const saveDiagram = useCallback(
    (
      name: string,
      id: string | null,
      code: string,
      nodeStates: Record<string, DiagramNode>,
      groupStates: Record<string, DiagramGroup>,
      noteStates: Record<string, DiagramNote>
    ): SavedDiagram => {
      const prev = savedDiagramsRef.current;
      const existingIdx = id ? prev.findIndex((d) => d.id === id) : -1;
      const entry: SavedDiagram = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `d${Date.now()}`,
        name,
        code,
        nodeStates,
        groupStates,
        noteStates,
        savedAt: Date.now(),
      };
      const next =
        existingIdx >= 0
          ? prev.map((d, i) => (i === existingIdx ? entry : d))
          : [...prev, entry];
      saveToStorage(next);
      setSavedDiagrams(next);
      return entry;
    },
    []
  );

  const deleteDiagram = useCallback((id: string) => {
    setSavedDiagrams((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const renameDiagram = useCallback((id: string, name: string) => {
    setSavedDiagrams((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, name } : d));
      saveToStorage(next);
      return next;
    });
  }, []);

  return { savedDiagrams, saveDiagram, deleteDiagram, renameDiagram };
}
