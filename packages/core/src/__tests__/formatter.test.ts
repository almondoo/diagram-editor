import { describe, it, expect } from "vitest";
import { formatPropsString, formatDSLCode } from "../formatter.js";

describe("formatPropsString", () => {
  it("空文字列は空文字を返す", () => {
    expect(formatPropsString("")).toBe("");
    expect(formatPropsString("   ")).toBe("");
  });

  it("プロパティを決まった順序に並べる", () => {
    const result = formatPropsString("x=100 shape=rect color=#6366f1");
    expect(result).toBe("shape=rect color=#6366f1 x=100");
  });

  it("ダブルクォートの値を保持する", () => {
    const result = formatPropsString('label="hello world"');
    expect(result).toBe('label="hello world"');
  });
});

describe("formatDSLCode", () => {
  it("nodeを整形する", () => {
    const input = 'node a "テスト" { x=100 shape=rect color=#6366f1 }';
    const result = formatDSLCode(input);
    expect(result).toBe('node a "テスト" { shape=rect color=#6366f1 x=100 }');
  });

  it("edgeを整形する", () => {
    const input = 'edge a -> b { animate=true color=#94a3b8 }';
    const result = formatDSLCode(input);
    expect(result).toBe('edge a -> b { color=#94a3b8 animate=true }');
  });

  it("空行を保持する", () => {
    const input = 'node a "A" { shape=rect }\n\nnode b "B" { shape=rect }';
    const result = formatDSLCode(input);
    expect(result).toContain("\n\n");
  });

  it("コメント行をそのまま保持する", () => {
    const input = "// コメント\nnode a \"A\"";
    const result = formatDSLCode(input);
    expect(result.split("\n")[0]).toBe("// コメント");
  });

  it("プロパティなしのnodeをそのまま整形", () => {
    const input = 'node a "A"';
    const result = formatDSLCode(input);
    expect(result).toBe('node a "A"');
  });
});
