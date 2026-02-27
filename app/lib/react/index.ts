export { DiagramEditor } from "./DiagramEditor";
export { useDiagramState } from "./hooks/useDiagramState";
export type { DiagramState } from "./hooks/useDiagramState";
export { useNodeDrag } from "./hooks/useNodeDrag";
export { useCanvasInteraction } from "./hooks/useCanvasInteraction";
export { useSplitPane } from "./hooks/useSplitPane";
export { useViewport } from "./hooks/useViewport";
export type { ViewportInfo } from "./hooks/useViewport";
export { ShapeNode } from "./components/ShapeNode";
export { EdgeLine } from "./components/EdgeLine";
export { GroupBox } from "./components/GroupBox";
export { NoteBox } from "./components/NoteBox";
export { CodeEditor } from "./components/CodeEditor";
export { Toolbar } from "./components/Toolbar";
export { Minimap } from "./components/Minimap";
export { SyntaxPanel } from "./components/SyntaxPanel";

// Re-export commonly used core types for convenience
export type {
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  DiagramNote,
  ParseResult,
} from "~/lib/core";
export { parseDSL, formatDSLCode, autoLayout } from "~/lib/core";
