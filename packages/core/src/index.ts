export type {
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  DiagramNote,
  ParseError,
  ParseResult,
  SyntaxToken,
  ViewBox,
} from "./types.js";

export { VIBRANT_COLORS, randomColor, randomPosition, colorForId, COLOR_PRESETS } from "./colors.js";
export type { ColorPreset } from "./colors.js";
export { parseProps, parseDSL } from "./parser.js";
export { autoLayout, GROUP_LABEL_HEIGHT, GROUP_PADDING, getGroupDepth } from "./layout.js";
export { formatPropsString, formatDSLCode } from "./formatter.js";
export { highlightLine } from "./syntax.js";
export { getShapePath, getNodeCenter, getEdgePoints, buildEdgePath } from "./geometry.js";
export { escapeXml, generateExportSVG } from "./svg-export.js";
export { getCompletionContext, getCompletionItems } from "./autocomplete.js";
export type { CompletionContext, CompletionItem } from "./autocomplete.js";
export { AWS_ICON_NAMES } from "./icon-list.js";
