export function formatPropsString(str: string): string {
  if (!str.trim()) return "";
  const props: Record<string, string> = {};
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  const order = [
    "shape", "color", "text", "border", "borderWidth",
    "x", "y", "w", "h", "icon", "group", "fontSize", "opacity", "dashed",
    "label", "style", "animate", "thickness", "arrow", "curve",
  ];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    props[m[1]] = m[2] !== undefined ? `"${m[2]}"` : m[3];
  }
  const keys = Object.keys(props);
  keys.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((k) => `${k}=${props[k]}`).join(" ");
}

export function formatDSLCode(code: string): string {
  const lines = code.split("\n");
  const formatted: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      formatted.push("");
      continue;
    }
    if (line.startsWith("//") || line.startsWith("#")) {
      formatted.push(line);
      continue;
    }

    const nodeMatch = line.match(/^(node\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
    if (nodeMatch) {
      const props = formatPropsString(nodeMatch[2] || "");
      formatted.push(props ? `${nodeMatch[1]} { ${props} }` : nodeMatch[1]);
      continue;
    }

    const edgeMatch = line.match(/^(edge\s+\S+\s*->\s*\S+)(?:\s*\{([^}]*)\})?/);
    if (edgeMatch) {
      const props = formatPropsString(edgeMatch[2] || "");
      formatted.push(props ? `${edgeMatch[1]} { ${props} }` : edgeMatch[1]);
      continue;
    }

    const groupMatch = line.match(/^(group\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
    if (groupMatch) {
      const props = formatPropsString(groupMatch[2] || "");
      formatted.push(props ? `${groupMatch[1]} { ${props} }` : groupMatch[1]);
      continue;
    }

    const noteMatch = line.match(/^(note\s+\S+\s+"[^"]*")(?:\s*\{([^}]*)\})?/);
    if (noteMatch) {
      const props = formatPropsString(noteMatch[2] || "");
      formatted.push(props ? `${noteMatch[1]} { ${props} }` : noteMatch[1]);
      continue;
    }

    const styleMatch = line.match(/^(style\s+\S+)\s*\{([^}]*)\}/);
    if (styleMatch) {
      const props = formatPropsString(styleMatch[2] || "");
      formatted.push(props ? `${styleMatch[1]} { ${props} }` : `${styleMatch[1]} {}`);
      continue;
    }

    formatted.push(line);
  }

  return formatted.join("\n");
}
