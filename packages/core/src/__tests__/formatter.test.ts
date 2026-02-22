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

  it("x, y, w, h を除外する", () => {
    const result = formatPropsString("shape=rect color=#fff x=100 y=200 w=150 h=60");
    expect(result).toBe("shape=rect color=#fff");
  });

  it("arrow, style を除外する", () => {
    const result = formatPropsString("color=#fff arrow=end style=solid");
    expect(result).toBe("color=#fff");
  });

  it("プロパティの順序を正規化する (shape が color より先)", () => {
    const result = formatPropsString("color=#fff shape=rect");
    expect(result).toBe("shape=rect color=#fff");
  });

  it("label が animate より先に来る", () => {
    const result = formatPropsString('animate=true label="test"');
    expect(result).toBe('label="test" animate=true');
  });

  it("未知のプロパティは末尾に配置される", () => {
    const result = formatPropsString("shape=rect custom=value color=#fff");
    expect(result).toBe("shape=rect color=#fff custom=value");
  });

  it("全プロパティがレイアウトプロパティなら空文字を返す", () => {
    const result = formatPropsString("x=100 y=200 w=150 h=60");
    expect(result).toBe("");
  });

  it("thickness, curve の順序", () => {
    const result = formatPropsString("curve=straight thickness=2");
    expect(result).toBe("thickness=2 curve=straight");
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

  it("edge演算子を保持する", () => {
    expect(formatDSLCode('edge a --> b { label="test" }')).toBe('edge a --> b { label="test" }');
    expect(formatDSLCode('edge a <-> b')).toBe('edge a <-> b');
    expect(formatDSLCode('edge a <-- b')).toBe('edge a <-- b');
    expect(formatDSLCode('edge a -- b')).toBe('edge a -- b');
  });

  it("arrow/styleプロパティを除外する", () => {
    const input = 'edge a -> b { arrow=end style=solid color=#94a3b8 }';
    const result = formatDSLCode(input);
    expect(result).toBe('edge a -> b { color=#94a3b8 }');
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

  it("#コメント行を保持する", () => {
    const input = "# コメント\nnode a \"A\"";
    const result = formatDSLCode(input);
    expect(result.split("\n")[0]).toBe("# コメント");
  });

  it("noteを整形する", () => {
    const input = 'note n1 "メモ" { x=100 y=200 color=#fbbf24 }';
    const result = formatDSLCode(input);
    expect(result).toBe('note n1 "メモ" { color=#fbbf24 }');
  });

  it("groupフラット構文を整形する", () => {
    const input = 'group g1 "グループ" { color=#6366f1 x=0 y=0 w=300 h=200 }';
    const result = formatDSLCode(input);
    expect(result).toBe('group g1 "グループ" { color=#6366f1 }');
  });

  it("styleを整形する", () => {
    const input = "style a { color=#ff0000 shape=diamond }";
    const result = formatDSLCode(input);
    expect(result).toBe("style a { shape=diamond color=#ff0000 }");
  });

  it("プロパティのないstyleを整形する", () => {
    const input = "style a { x=100 y=200 }";
    const result = formatDSLCode(input);
    expect(result).toBe("style a {}");
  });

  it("余分なスペースを正規化する", () => {
    const input = 'node   a   "テスト"   {   shape=rect   }';
    const result = formatDSLCode(input);
    expect(result).toBe('node a "テスト" { shape=rect }');
  });

  it("プロパティなしのedgeを整形する", () => {
    const input = "edge a -> b";
    const result = formatDSLCode(input);
    expect(result).toBe("edge a -> b");
  });

  it("複数行のコードを整形する", () => {
    const input = `node a "A" { shape=rect x=0 y=0 color=#6366f1 }
edge a -> b { color=#94a3b8 }
node b "B" { shape=diamond x=200 y=0 color=#ff0000 }`;
    const result = formatDSLCode(input);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('node a "A" { shape=rect color=#6366f1 }');
    expect(lines[1]).toBe('edge a -> b { color=#94a3b8 }');
    expect(lines[2]).toBe('node b "B" { shape=diamond color=#ff0000 }');
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

  it("深いネストもインデントが正しい", () => {
    const code = `group lv1 "L1" { color=#111
  group lv2 "L2" { color=#222
    node a "A" { shape=rect }
  }
}`;
    const result = formatDSLCode(code);
    const lines = result.split("\n");
    // lv1 はインデントなし
    expect(lines[0]).toMatch(/^group lv1/);
    // lv2 は 2スペースインデント
    expect(lines[1]).toMatch(/^ {2}group lv2/);
    // node a は 4スペースインデント
    expect(lines[2]).toMatch(/^ {4}node a/);
    // 内側の閉じ括弧は 2スペース
    expect(lines[3]).toBe("  }");
    // 外側の閉じ括弧はインデントなし
    expect(lines[4]).toBe("}");
  });

  it("空のブロック構文は単一行にフォーマットされる", () => {
    const code = `group g1 "G" { color=#111
}`;
    const result = formatDSLCode(code);
    // ボディが空なので1行にまとめる
    expect(result).toBe('group g1 "G" { color=#111 }');
  });
});
