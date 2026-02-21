import { useState, useCallback } from "react";
import type { DiagramNode } from "diagram-dsl-core";

const STORAGE_KEY = "diagramcraft_saved_diagrams";

export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  nodeStates: Record<string, DiagramNode>;
  savedAt: number;
}

function loadFromStorage(): SavedDiagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedDiagram[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(diagrams: SavedDiagram[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

export function useLocalDiagrams() {
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(loadFromStorage);

  const saveDiagram = useCallback(
    (name: string, code: string, nodeStates: Record<string, DiagramNode>) => {
      setSavedDiagrams((prev) => {
        const existing = prev.findIndex((d) => d.name === name);
        const entry: SavedDiagram = {
          id: existing >= 0 ? prev[existing].id : `d${Date.now()}`,
          name,
          code,
          nodeStates,
          savedAt: Date.now(),
        };
        const next =
          existing >= 0
            ? prev.map((d, i) => (i === existing ? entry : d))
            : [...prev, entry];
        saveToStorage(next);
        return next;
      });
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

  return { savedDiagrams, saveDiagram, deleteDiagram };
}
