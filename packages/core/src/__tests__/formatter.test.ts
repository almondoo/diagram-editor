import { describe, it, expect } from "vitest";
import { formatPropsString, formatDSLCode } from "../formatter.js";

describe("formatPropsString", () => {
  it("空文字列は空文字を返す", () => {
    expect(formatPropsString("")).toBe("");
    expect(formatPropsString("   ")).toBe("");
  });

  it("プロパティを決まった順序に並べる", () => {
    const result = formatPropsString("shape=rect color=#6366f1");
    expect(result).toBe("shape=rect color=#6366f1");
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
    expect(result).toBe('node a "テスト" { shape=rect color=#6366f1 }');
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

describe("x/y/w/h exclusion", () => {
  it("formatPropsString excludes x, y, w, h", () => {
    const result = formatPropsString("shape=rect color=#fff x=100 y=200 w=150 h=60");
    expect(result).toBe("shape=rect color=#fff");
  });

  it("formatDSLCode strips x/y/w/h from node lines", () => {
    const code = 'node a "A" { shape=rect color=#6366f1 x=100 y=200 w=150 h=60 }';
    const result = formatDSLCode(code);
    expect(result).toBe('node a "A" { shape=rect color=#6366f1 }');
  });

  it("formatDSLCode preserves color in node lines", () => {
    const code = 'node a "A" { color=#ff0000 }';
    const result = formatDSLCode(code);
    expect(result).toContain("color=#ff0000");
  });
});

describe("nested block syntax", () => {
  it("ネストグループブロック構文をフォーマットする", () => {
    const code = `group outer "外側" {color=#6366f1
  group inner  "内側"  {color=#f59e0b  x=20  y=40}
  node n1 "ノード"  {shape=rect  x=50  y=80}
}`;
    const result = formatDSLCode(code);
    // ブロック構造が保たれる (outer の開きブレースがある)
    expect(result).toContain('group outer "外側"');
    expect(result).toContain('{');
    // inner と n1 がインデント付きで含まれる
    expect(result).toContain('group inner "内側" { color=#f59e0b }');
    expect(result).toContain('node n1 "ノード" { shape=rect }');
    // ブロックが閉じられる
    const lines = result.split('\n');
    expect(lines[lines.length - 1].trim()).toBe('}');
  });
});
