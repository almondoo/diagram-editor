export type {
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  DiagramNote,
  ParseError,
  ParseResult,
  SyntaxToken,
  ViewBox,
  LayoutDirection,
} from "./types";

export { VIBRANT_COLORS, randomColor, randomPosition, colorForId, COLOR_PRESETS } from "./colors";
export type { ColorPreset } from "./colors";
export { parseProps, parseDSL } from "./parser";
export { autoLayout, GROUP_LABEL_HEIGHT, GROUP_PADDING, getGroupDepth } from "./layout";
export { formatPropsString, formatDSLCode } from "./formatter";
export { highlightLine } from "./syntax";
export { getShapePath, getNodeCenter, getEdgePoints, buildEdgePath } from "./geometry";
export { escapeXml, generateExportSVG } from "./svg-export";
export { getCompletionContext, getCompletionItems } from "./autocomplete";
export type { CompletionContext, CompletionItem } from "./autocomplete";
export { AWS_ICON_NAMES } from "./icon-list";
