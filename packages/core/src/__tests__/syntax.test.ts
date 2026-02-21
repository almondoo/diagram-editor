import { describe, it, expect } from "vitest";
import { highlightLine } from "../syntax.js";

describe("highlightLine", () => {
  it("空行はグレーのトークンを返す", () => {
    const tokens = highlightLine("");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].color).toBe("#475569");
  });

  it("コメント行はグレーのトークンを返す", () => {
    const tokens = highlightLine("// コメント");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].color).toBe("#6b7280");
  });

  it("#コメントもグレーのトークンを返す", () => {
    const tokens = highlightLine("# コメント");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].color).toBe("#6b7280");
  });

  it("nodeキーワードを紫色でハイライトする", () => {
    const tokens = highlightLine('node a "ラベル"');
    const kwToken = tokens.find((t) => t.text === "node");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("edgeキーワードを紫色でハイライトする", () => {
    const tokens = highlightLine("edge a -> b");
    const kwToken = tokens.find((t) => t.text === "edge");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("矢印->をオレンジ色でハイライトする", () => {
    const tokens = highlightLine("edge a -> b");
    const arrowToken = tokens.find((t) => t.text === "->");
    expect(arrowToken).toBeDefined();
    expect(arrowToken!.color).toBe("#f97316");
  });

  it("文字列リテラルを緑色でハイライトする", () => {
    const tokens = highlightLine('node a "テスト"');
    const strToken = tokens.find((t) => t.text === '"テスト"');
    expect(strToken).toBeDefined();
    expect(strToken!.color).toBe("#34d399");
  });

  it("プロパティキーを青色でハイライトする", () => {
    const tokens = highlightLine("node a { shape=rect }");
    const propToken = tokens.find((t) => t.text === "shape");
    expect(propToken).toBeDefined();
    expect(propToken!.color).toBe("#60a5fa");
  });

  it("hex色値をその色でハイライトする", () => {
    const tokens = highlightLine("node a { color=#6366f1 }");
    const colorToken = tokens.find((t) => t.text === "#6366f1");
    expect(colorToken).toBeDefined();
    expect(colorToken!.color).toBe("#6366f1");
  });

  it("数値を黄色でハイライトする", () => {
    const tokens = highlightLine("node a { x=100 }");
    const numToken = tokens.find((t) => t.text === "100");
    expect(numToken).toBeDefined();
    expect(numToken!.color).toBe("#fbbf24");
  });

  it("真偽値をオレンジ色でハイライトする", () => {
    const tokens = highlightLine("edge a -> b { animate=true }");
    const boolToken = tokens.find((t) => t.text === "true");
    expect(boolToken).toBeDefined();
    expect(boolToken!.color).toBe("#f97316");
  });
});
