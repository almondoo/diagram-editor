import { describe, it, expect } from "vitest";
import { escapeXml, generateExportSVG } from "../svg-export.js";
import type { ParseResult } from "../types.js";

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
});

describe("generateExportSVG", () => {
  const emptyResult: ParseResult = {
    nodes: [],
    edges: [],
    groups: [],
    notes: [],
    errors: [],
  };

  it("空のパース結果はnullを返す", () => {
    expect(generateExportSVG(emptyResult)).toBeNull();
  });

  it("ノードがある場合はSVG文字列を返す", () => {
    const result: ParseResult = {
      ...emptyResult,
      nodes: [{
        id: "a",
        label: "テスト",
        shape: "rect",
        color: "#6366f1",
        textColor: "#ffffff",
        x: 100, y: 100, w: 150, h: 60,
        icon: "", group: "", fontSize: 13,
        borderColor: "", borderWidth: 2,
        opacity: 1, dashed: false,
      }],
    };
    const svg = generateExportSVG(result);
    expect(svg).not.toBeNull();
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("xmlns=");
  });

  it("グループのみでもSVGを返す", () => {
    const result: ParseResult = {
      ...emptyResult,
      groups: [{
        id: "g1", label: "グループ",
        color: "#6366f1", x: 0, y: 0, w: 300, h: 200,
      }],
    };
    const svg = generateExportSVG(result);
    expect(svg).not.toBeNull();
  });

  it("ノードのラベルが18文字超の場合に省略される", () => {
    const result: ParseResult = {
      ...emptyResult,
      nodes: [{
        id: "a",
        label: "これは非常に長いラベルテキストです超長い",
        shape: "rect",
        color: "#6366f1",
        textColor: "#ffffff",
        x: 0, y: 0, w: 150, h: 60,
        icon: "", group: "", fontSize: 13,
        borderColor: "", borderWidth: 2,
        opacity: 1, dashed: false,
      }],
    };
    const svg = generateExportSVG(result);
    expect(svg).toContain("…");
  });
});
