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

  it("groupキーワードを紫色でハイライトする", () => {
    const tokens = highlightLine('group g1 "グループ"');
    const kwToken = tokens.find((t) => t.text === "group");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("noteキーワードを紫色でハイライトする", () => {
    const tokens = highlightLine('note n1 "メモ"');
    const kwToken = tokens.find((t) => t.text === "note");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("styleキーワードを紫色でハイライトする", () => {
    const tokens = highlightLine("style a { color=#ff0000 }");
    const kwToken = tokens.find((t) => t.text === "style");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("矢印->をオレンジ色でハイライトする", () => {
    const tokens = highlightLine("edge a -> b");
    const arrowToken = tokens.find((t) => t.text === "->");
    expect(arrowToken).toBeDefined();
    expect(arrowToken!.color).toBe("#f97316");
  });

  it("各種エッジ演算子をオレンジ色でハイライトする", () => {
    for (const op of ["<-->", "<->", "<--", "-->", "<-", "->", "--"]) {
      const tokens = highlightLine(`edge a ${op} b`);
      const arrowToken = tokens.find((t) => t.text === op);
      expect(arrowToken).toBeDefined();
      expect(arrowToken!.color).toBe("#f97316");
    }
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

  it("falseをオレンジ色でハイライトする", () => {
    const tokens = highlightLine("node a { dashed=false }");
    const boolToken = tokens.find((t) => t.text === "false");
    expect(boolToken).toBeDefined();
    expect(boolToken!.color).toBe("#f97316");
  });

  it("波括弧を黄色でハイライトする", () => {
    const tokens = highlightLine("node a { shape=rect }");
    const openBrace = tokens.find((t) => t.text === "{");
    const closeBrace = tokens.find((t) => t.text === "}");
    expect(openBrace).toBeDefined();
    expect(openBrace!.color).toBe("#fbbf24");
    expect(closeBrace).toBeDefined();
    expect(closeBrace!.color).toBe("#fbbf24");
  });

  it("} のみの行を黄色でハイライトする", () => {
    const tokens = highlightLine("}");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ text: "}", color: "#fbbf24" });
  });

  it("インデント付きの } のみの行", () => {
    const tokens = highlightLine("  }");
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ text: "  ", color: "#e2e8f0" });
    expect(tokens[1]).toEqual({ text: "}", color: "#fbbf24" });
  });

  it("= 記号をグレーでハイライトする", () => {
    const tokens = highlightLine("node a { shape=rect }");
    const eqToken = tokens.find((t) => t.text === "=");
    expect(eqToken).toBeDefined();
    expect(eqToken!.color).toBe("#94a3b8");
  });

  it("プロパティ値の文字列リテラルを緑色でハイライトする", () => {
    const tokens = highlightLine('edge a -> b { label="テスト" }');
    const strToken = tokens.find((t) => t.text === '"テスト"');
    expect(strToken).toBeDefined();
    expect(strToken!.color).toBe("#34d399");
  });

  it("通常のテキスト値をデフォルト色でハイライトする", () => {
    const tokens = highlightLine("node a { shape=rect }");
    const valToken = tokens.find((t) => t.text === "rect");
    expect(valToken).toBeDefined();
    expect(valToken!.color).toBe("#e2e8f0");
  });

  it("インデント付きのnode行", () => {
    const tokens = highlightLine("  node a \"A\"");
    expect(tokens[0].text).toBe("  ");
    expect(tokens[0].color).toBe("#e2e8f0");
    const kwToken = tokens.find((t) => t.text === "node");
    expect(kwToken).toBeDefined();
    expect(kwToken!.color).toBe("#c084fc");
  });

  it("プロパティのみの行 (ブロック内)", () => {
    const tokens = highlightLine("  shape=rect color=#ff0000");
    const shapeToken = tokens.find((t) => t.text === "shape");
    expect(shapeToken).toBeDefined();
    expect(shapeToken!.color).toBe("#60a5fa");
    const colorValToken = tokens.find((t) => t.text === "#ff0000");
    expect(colorValToken).toBeDefined();
    expect(colorValToken!.color).toBe("#ff0000");
  });

  it("認識されない行はデフォルト色で返す", () => {
    const tokens = highlightLine("unknown text here");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].color).toBe("#e2e8f0");
  });

  it("全トークンを結合すると元の行に戻る", () => {
    const lines = [
      'node a "テスト" { shape=rect color=#6366f1 x=100 }',
      "edge a -> b { animate=true }",
      'group g1 "G" { color=#fff }',
      'note n1 "メモ" { x=10 y=20 }',
      "style a { color=#ff0000 }",
      "// コメント",
      "  }",
      "",
    ];
    for (const line of lines) {
      const tokens = highlightLine(line);
      const reconstructed = tokens.map((t) => t.text).join("");
      expect(reconstructed).toBe(line);
    }
  });
});
