import { describe, it, expect } from "vitest";
import { escapeXml, generateExportSVG } from "../svg-export.js";
import type { ParseResult, DiagramNode, DiagramEdge, DiagramGroup, DiagramNote } from "../types.js";

function makeNode(overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id: "a",
    label: "テスト",
    shape: "rect",
    color: "#6366f1",
    textColor: "#ffffff",
    x: 100, y: 100, w: 150, h: 60,
    icon: "", group: "", fontSize: 13,
    borderColor: "", borderWidth: 2,
    opacity: 1, dashed: false,
    ...overrides,
  };
}

function makeEdge(overrides: Partial<DiagramEdge> = {}): DiagramEdge {
  return {
    from: "a", to: "b",
    label: "", color: "#94a3b8",
    style: "solid", animate: false,
    thickness: 1.5, arrow: "end", curve: "smooth",
    ...overrides,
  };
}

function makeResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    nodes: [],
    edges: [],
    groups: [],
    notes: [],
    errors: [],
    ...overrides,
  };
}

describe("escapeXml", () => {
  it("undefined/nullは空文字を返す", () => {
    expect(escapeXml(undefined)).toBe("");
  });

  it("HTMLエンティティをエスケープする", () => {
    expect(escapeXml("&")).toBe("&amp;");
    expect(escapeXml("<")).toBe("&lt;");
    expect(escapeXml(">")).toBe("&gt;");
    expect(escapeXml('"')).toBe("&quot;");
    expect(escapeXml("'")).toBe("&apos;");
  });

  it("通常の文字列はそのまま返す", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });

  it("空文字列は空文字を返す", () => {
    expect(escapeXml("")).toBe("");
  });

  it("複数の特殊文字を含む文字列をエスケープする", () => {
    expect(escapeXml('<div class="test">')).toBe("&lt;div class=&quot;test&quot;&gt;");
  });

  it("& を含む文字列", () => {
    expect(escapeXml("A & B")).toBe("A &amp; B");
  });
});

describe("generateExportSVG", () => {
  it("空のパース結果はnullを返す", () => {
    expect(generateExportSVG(makeResult())).toBeNull();
  });

  it("ノードがある場合はSVG文字列を返す", () => {
    const svg = generateExportSVG(makeResult({ nodes: [makeNode()] }));
    expect(svg).not.toBeNull();
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("xmlns=");
  });

  it("グループのみでもSVGを返す", () => {
    const group: DiagramGroup = {
      id: "g1", label: "グループ",
      color: "#6366f1", x: 0, y: 0, w: 300, h: 200,
    };
    const svg = generateExportSVG(makeResult({ groups: [group] }));
    expect(svg).not.toBeNull();
  });

  it("ノートのみでもSVGを返す", () => {
    const note: DiagramNote = {
      id: "n1", text: "メモ",
      x: 50, y: 50, color: "#fbbf24",
    };
    const svg = generateExportSVG(makeResult({ notes: [note] }));
    expect(svg).not.toBeNull();
    expect(svg).toContain("メモ");
  });

  it("ノードのラベルが18文字超の場合に省略される", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ label: "これは非常に長いラベルテキストです超長い" })],
    }));
    expect(svg).toContain("…");
  });

  it("ラベルが18文字以内なら省略されない", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ label: "短いラベル" })],
    }));
    expect(svg).toContain("短いラベル");
    expect(svg).not.toContain("…");
  });

  it("背景色が設定される", () => {
    const svg = generateExportSVG(makeResult({ nodes: [makeNode()] }));
    expect(svg).toContain('fill="#0a0c12"');
  });

  it("エッジを含むSVGを生成する", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).not.toBeNull();
    expect(svg).toContain("<path");
  });

  it("ラベル付きエッジを含むSVGを生成する", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", label: "接続" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).toContain("接続");
  });

  it("破線エッジのSVGを生成する", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", style: "dashed" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).toContain("stroke-dasharray");
  });

  it("矢印マーカーを生成する (arrow=end)", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", arrow: "end" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).toContain("marker-end");
    expect(svg).toContain("<marker");
  });

  it("矢印マーカーを生成する (arrow=start)", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", arrow: "start" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).toContain("marker-start");
  });

  it("矢印マーカーを生成する (arrow=both)", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", arrow: "both" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).toContain("marker-end");
    expect(svg).toContain("marker-start");
  });

  it("矢印なしエッジにはマーカーがない (arrow=none)", () => {
    const nodes = [
      makeNode({ id: "a", x: 0, y: 0 }),
      makeNode({ id: "b", x: 300, y: 0 }),
    ];
    const edges = [makeEdge({ from: "a", to: "b", arrow: "none" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).not.toContain("marker-end");
    expect(svg).not.toContain("marker-start");
  });

  it("存在しないノードを参照するエッジはスキップされる", () => {
    const nodes = [makeNode({ id: "a", x: 0, y: 0 })];
    const edges = [makeEdge({ from: "a", to: "nonexistent" })];
    const svg = generateExportSVG(makeResult({ nodes, edges }));
    expect(svg).not.toBeNull();
    // パスは生成されない（fromNode/toNodeがないため）
  });

  it("ellipseシェイプのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ shape: "ellipse" })],
    }));
    expect(svg).toContain("<ellipse");
  });

  it("circleシェイプのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ shape: "circle" })],
    }));
    expect(svg).toContain("<ellipse");
  });

  it("cylinderシェイプのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ shape: "cylinder" })],
    }));
    expect(svg).toContain("<ellipse");
    expect(svg).toContain("<path");
  });

  it("diamondシェイプのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ shape: "diamond" })],
    }));
    expect(svg).toContain("<path");
  });

  it("stadiumシェイプのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ shape: "stadium" })],
    }));
    expect(svg).toContain("<path");
  });

  it("破線ノードのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ dashed: true })],
    }));
    expect(svg).toContain("stroke-dasharray");
  });

  it("アイコン付きノードのSVGを生成する", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ icon: "🎨" })],
    }));
    expect(svg).toContain("🎨");
  });

  it("borderColorが設定されたノードのSVG", () => {
    const svg = generateExportSVG(makeResult({
      nodes: [makeNode({ borderColor: "#ff0000" })],
    }));
    expect(svg).toContain("#ff0000");
  });

  it("グループのSVGにラベルが含まれる", () => {
    const group: DiagramGroup = {
      id: "g1", label: "テストグループ",
      color: "#6366f1", x: 0, y: 0, w: 300, h: 200,
    };
    const svg = generateExportSVG(makeResult({ groups: [group] }));
    expect(svg).toContain("テストグループ");
    expect(svg).toContain("stroke-dasharray");
  });

  it("viewBoxが設定されている", () => {
    const svg = generateExportSVG(makeResult({ nodes: [makeNode()] }));
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("width=");
    expect(svg).toContain("height=");
  });
});
