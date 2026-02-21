export { DiagramEditor } from "./DiagramEditor.js";
export { useDiagramState } from "./hooks/useDiagramState.js";
export type { DiagramState } from "./hooks/useDiagramState.js";
export { useNodeDrag } from "./hooks/useNodeDrag.js";
export { useCanvasInteraction } from "./hooks/useCanvasInteraction.js";
export { useSplitPane } from "./hooks/useSplitPane.js";
export { ShapeNode } from "./components/ShapeNode.js";
export { EdgeLine } from "./components/EdgeLine.js";
export { GroupBox } from "./components/GroupBox.js";
export { NoteBox } from "./components/NoteBox.js";
export { CodeEditor } from "./components/CodeEditor.js";
export { Toolbar } from "./components/Toolbar.js";
export { Minimap } from "./components/Minimap.js";
export { SyntaxPanel } from "./components/SyntaxPanel.js";

// Re-export core for convenience
export * from "diagram-dsl-core";
