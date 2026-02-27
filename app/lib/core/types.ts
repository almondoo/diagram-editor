export interface DiagramNode {
  id: string;
  label: string;
  shape: string;
  color: string;
  textColor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: string;
  group: string;
  opacity: number;
  dashed: boolean;
  _needsPosition?: boolean;
  _explicitProps?: Set<string>;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  color: string;
  style: string;
  animate: boolean;
  thickness: number;
  /** "end" | "start" | "both" | "none" */
  arrow: string;
  curve: string;
  bendX: number;
  bendY: number;
}

export interface DiagramGroup {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parentGroup?: string | undefined;
}

export interface DiagramNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  _needsPosition?: boolean;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  notes: DiagramNote[];
  errors: ParseError[];
}

export interface SyntaxToken {
  text: string;
  color: string;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutDirection = "auto" | "TB" | "LR";
