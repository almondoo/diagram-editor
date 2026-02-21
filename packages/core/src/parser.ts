import type { ParseResult, DiagramNode } from "./types.js";
import { randomColor } from "./colors.js";

export function parseProps(str: string): Record<string, string> {
  const props: Record<string, string> = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    props[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return props;
}

export function parseDSL(code: string): ParseResult {
  const nodes: DiagramNode[] = [];
  const edges: ParseResult["edges"] = [];
  const groups: ParseResult["groups"] = [];
  const notes: ParseResult["notes"] = [];
  const errors: ParseResult["errors"] = [];
  const lines = code.split("\n");
  const nodeMap: Record<string, DiagramNode> = {};

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) return;

    try {
      // Group: group g1 "Label" { color=#hex }
      const groupMatch = line.match(/^group\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
      if (groupMatch) {
        const props = parseProps(groupMatch[3] || "");
        groups.push({
          id: groupMatch[1],
          label: groupMatch[2],
          color: props.color || randomColor(),
          x: parseFloat(props.x) || 0,
          y: parseFloat(props.y) || 0,
          w: parseFloat(props.w) || 300,
          h: parseFloat(props.h) || 200,
        });
        return;
      }

      // Note: note n1 "text" { x=100 y=100 }
      const noteMatch = line.match(/^note\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
      if (noteMatch) {
        const props = parseProps(noteMatch[3] || "");
        notes.push({
          id: noteMatch[1],
          text: noteMatch[2],
          x: parseFloat(props.x) || 50,
          y: parseFloat(props.y) || 50,
          color: props.color || "#fbbf24",
        });
        return;
      }

      // Node: node id "Label" { shape=rect color=#hex x=0 y=0 w=140 h=60 icon=⚙️ }
      const nodeMatch = line.match(/^node\s+(\S+)\s+"([^"]*)"(?:\s*\{([^}]*)\})?/);
      if (nodeMatch) {
        const props = parseProps(nodeMatch[3] || "");
        const id = nodeMatch[1];
        const hasX = props.x !== undefined;
        const hasY = props.y !== undefined;
        const node: DiagramNode = {
          id,
          label: nodeMatch[2],
          shape: props.shape || "rect",
          color: props.color || "__RANDOM__",
          textColor: props.text || "#ffffff",
          x: hasX ? parseFloat(props.x) : NaN,
          y: hasY ? parseFloat(props.y) : NaN,
          w: parseFloat(props.w) || 150,
          h: parseFloat(props.h) || 60,
          icon: props.icon || "",
          group: props.group || "",
          fontSize: parseFloat(props.fontSize) || 13,
          borderColor: props.border || "",
          borderWidth: parseFloat(props.borderWidth) || 2,
          opacity: parseFloat(props.opacity) || 1,
          dashed: props.dashed === "true",
          _needsPosition: !hasX || !hasY,
          _explicitProps: new Set(['id', 'label', ...Object.keys(props)]),
        };
        nodes.push(node);
        nodeMap[id] = node;
        return;
      }

      // Edge: edge from -> to { label="text" color=#hex style=dashed animate=true }
      const edgeMatch = line.match(/^edge\s+(\S+)\s*->\s*(\S+)(?:\s*\{([^}]*)\})?/);
      if (edgeMatch) {
        const props = parseProps(edgeMatch[3] || "");
        edges.push({
          from: edgeMatch[1],
          to: edgeMatch[2],
          label: props.label || "",
          color: props.color || "#94a3b8",
          style: props.style || "solid",
          animate: props.animate === "true",
          thickness: parseFloat(props.thickness) || 1.5,
          arrow: props.arrow || "end",
          curve: props.curve || "smooth",
        });
        return;
      }

      // Style shorthand: style id { props }
      const styleMatch = line.match(/^style\s+(\S+)\s*\{([^}]*)\}/);
      if (styleMatch) {
        const id = styleMatch[1];
        const props = parseProps(styleMatch[2]);
        if (nodeMap[id]) {
          Object.assign(nodeMap[id], {
            ...(props.color && { color: props.color }),
            ...(props.shape && { shape: props.shape }),
            ...(props.border && { borderColor: props.border }),
            ...(props.text && { textColor: props.text }),
          });
        }
        return;
      }

      if (line.length > 0) {
        errors.push({ line: idx + 1, message: `構文エラー: "${line}"` });
      }
    } catch (e) {
      errors.push({ line: idx + 1, message: (e as Error).message });
    }
  });

  return { nodes, edges, groups, notes, errors };
}
