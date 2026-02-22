import { describe, it, expect } from "vitest";
import { parseDSL, parseProps } from "../parser.js";

describe("parseProps", () => {
  it("キー=値を解析する", () => {
    expect(parseProps("shape=rect color=#6366f1")).toEqual({
      shape: "rect",
      color: "#6366f1",
    });
  });

  it("ダブルクォートの値を解析する", () => {
    expect(parseProps('label="hello world"')).toEqual({ label: "hello world" });
  });

  it("空文字列は空オブジェクト", () => {
    expect(parseProps("")).toEqual({});
  });

  it("複数のプロパティを解析する", () => {
    const result = parseProps("shape=rect color=#fff x=100 y=200 w=150 h=60");
    expect(result).toEqual({
      shape: "rect",
      color: "#fff",
      x: "100",
      y: "200",
      w: "150",
      h: "60",
    });
  });

  it("余分なスペースがあっても解析する", () => {
    const result = parseProps("shape = rect  color = #fff");
    expect(result.shape).toBe("rect");
    expect(result.color).toBe("#fff");
  });

  it("ダブルクォート内のスペースを保持する", () => {
    const result = parseProps('label="hello  world  test"');
    expect(result.label).toBe("hello  world  test");
  });

  it("真偽値を文字列として解析する", () => {
    expect(parseProps("animate=true dashed=false")).toEqual({
      animate: "true",
      dashed: "false",
    });
  });

  it("数値を文字列として解析する", () => {
    expect(parseProps("thickness=2.5 fontSize=16")).toEqual({
      thickness: "2.5",
      fontSize: "16",
    });
  });
});

describe("parseDSL", () => {
  it("nodeを解析する", () => {
    const result = parseDSL('node a "ノードA" { shape=rect color=#6366f1 x=100 y=50 }');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: "a",
      label: "ノードA",
      shape: "rect",
      color: "#6366f1",
      x: 100,
      y: 50,
    });
  });

  it("edgeを解析する", () => {
    const result = parseDSL("edge a -> b { label=\"接続\" color=#94a3b8 }");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      from: "a",
      to: "b",
      label: "接続",
      color: "#94a3b8",
    });
  });

  it("groupを解析する", () => {
    const result = parseDSL('group g1 "グループ" { color=#6366f1 x=0 y=0 w=300 h=200 }');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      id: "g1",
      label: "グループ",
      color: "#6366f1",
      x: 0,
      y: 0,
      w: 300,
      h: 200,
    });
  });

  it("noteを解析する", () => {
    const result = parseDSL('note n1 "メモ" { x=50 y=50 color=#fbbf24 }');
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({
      id: "n1",
      text: "メモ",
      x: 50,
      y: 50,
      color: "#fbbf24",
    });
  });

  it("styleショートハンドを解析する", () => {
    const code = `node a "A" { shape=rect color=#111111 x=0 y=0 }\nstyle a { color=#6366f1 shape=diamond }`;
    const result = parseDSL(code);
    expect(result.nodes[0].color).toBe("#6366f1");
    expect(result.nodes[0].shape).toBe("diamond");
  });

  it("コメント行を無視する", () => {
    const result = parseDSL("// これはコメント\n# これもコメント");
    expect(result.nodes).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("不正な構文はエラーを返す", () => {
    const result = parseDSL("invalid syntax here");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(1);
  });

  it("x,yがない場合は_needsPositionがtrue", () => {
    const result = parseDSL('node a "A" { shape=rect color=#111 }');
    expect(result.nodes[0]._needsPosition).toBe(true);
  });

  it("x,yがある場合は_needsPositionがfalse", () => {
    const result = parseDSL('node a "A" { shape=rect color=#111 x=100 y=50 }');
    expect(result.nodes[0]._needsPosition).toBe(false);
  });

  it("デフォルト値が正しく設定される", () => {
    const result = parseDSL('node a "A"');
    const node = result.nodes[0];
    expect(node.shape).toBe("rect");
    expect(node.textColor).toBe("#ffffff");
    expect(node.w).toBe(150);
    expect(node.h).toBe(60);
    expect(node.fontSize).toBe(13);
    expect(node.borderWidth).toBe(2);
    expect(node.opacity).toBe(1);
    expect(node.dashed).toBe(false);
  });

  it("空文字列は空の結果を返す", () => {
    const result = parseDSL("");
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
    expect(result.notes).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("複数のノードとエッジを解析する", () => {
    const code = `node a "A" { x=0 y=0 }
node b "B" { x=200 y=0 }
node c "C" { x=400 y=0 }
edge a -> b
edge b -> c`;
    const result = parseDSL(code);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("重複ノードIDはエラーになる", () => {
    const code = `node a "A" { x=0 y=0 }\nnode a "重複" { x=100 y=100 }`;
    const result = parseDSL(code);
    expect(result.nodes).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("重複ID");
  });

  it("重複ノートIDはエラーになる", () => {
    const code = `note n1 "メモ1" { x=0 y=0 }\nnote n1 "メモ2" { x=100 y=100 }`;
    const result = parseDSL(code);
    expect(result.notes).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("重複ID");
  });

  it("noteの位置がない場合は_needsPositionがtrue", () => {
    const result = parseDSL('note n1 "メモ"');
    expect(result.notes[0]._needsPosition).toBe(true);
  });

  it("noteのデフォルトカラー", () => {
    const result = parseDSL('note n1 "メモ" { x=0 y=0 }');
    expect(result.notes[0].color).toBe("#fbbf24");
  });

  it("edgeのデフォルト値", () => {
    const result = parseDSL("edge a -> b");
    const edge = result.edges[0];
    expect(edge.label).toBe("");
    expect(edge.color).toBe("#94a3b8");
    expect(edge.animate).toBe(false);
    expect(edge.thickness).toBe(1.5);
    expect(edge.curve).toBe("smooth");
  });

  it("edgeのプロパティを全て解析する", () => {
    const result = parseDSL('edge a -> b { label="テスト" color=#ff0000 animate=true thickness=3 curve=straight }');
    const edge = result.edges[0];
    expect(edge.label).toBe("テスト");
    expect(edge.color).toBe("#ff0000");
    expect(edge.animate).toBe(true);
    expect(edge.thickness).toBe(3);
    expect(edge.curve).toBe("straight");
  });

  it("nodeのプロパティを全て解析する", () => {
    const result = parseDSL('node a "A" { shape=diamond color=#ff0000 text=#000000 x=10 y=20 w=200 h=80 icon=🎨 fontSize=16 border=#333 borderWidth=3 opacity=0.5 dashed=true }');
    const node = result.nodes[0];
    expect(node.shape).toBe("diamond");
    expect(node.color).toBe("#ff0000");
    expect(node.textColor).toBe("#000000");
    expect(node.x).toBe(10);
    expect(node.y).toBe(20);
    expect(node.w).toBe(200);
    expect(node.h).toBe(80);
    expect(node.icon).toBe("🎨");
    expect(node.fontSize).toBe(16);
    expect(node.borderColor).toBe("#333");
    expect(node.borderWidth).toBe(3);
    expect(node.opacity).toBe(0.5);
    expect(node.dashed).toBe(true);
  });

  it("styleでborderとtextColorを変更する", () => {
    const code = `node a "A" { x=0 y=0 }\nstyle a { border=#ff0000 text=#00ff00 }`;
    const result = parseDSL(code);
    expect(result.nodes[0].borderColor).toBe("#ff0000");
    expect(result.nodes[0].textColor).toBe("#00ff00");
  });

  it("存在しないノードへのstyleはエラーにならない", () => {
    const code = `style nonexistent { color=#ff0000 }`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
  });

  it("未閉じブロックはエラーになる", () => {
    const code = `group g1 "G1" { color=#6366f1\n  node a "A" { x=0 y=0 }`;
    const result = parseDSL(code);
    expect(result.errors.some(e => e.message.includes("閉じられていません"))).toBe(true);
  });

  it("groupのデフォルトサイズ", () => {
    const result = parseDSL('group g1 "G" { color=#6366f1 }');
    expect(result.groups[0].w).toBe(300);
    expect(result.groups[0].h).toBe(200);
  });

  it("コメントの後にノードがあっても解析する", () => {
    const code = `// コメント\nnode a "A" { x=0 y=0 }`;
    const result = parseDSL(code);
    expect(result.nodes).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("空行を含むコードを正しく解析する", () => {
    const code = `node a "A" { x=0 y=0 }\n\n\nnode b "B" { x=200 y=0 }`;
    const result = parseDSL(code);
    expect(result.nodes).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });
});

describe("_explicitProps tracking", () => {
  it("tracks explicitly set props in node", () => {
    const result = parseDSL('node a "A" { shape=rect color=#ff0000 }');
    const node = result.nodes[0];
    expect(node._explicitProps).toBeDefined();
    expect(node._explicitProps!.has("shape")).toBe(true);
    expect(node._explicitProps!.has("color")).toBe(true);
    expect(node._explicitProps!.has("label")).toBe(true);
    expect(node._explicitProps!.has("x")).toBe(false);
    expect(node._explicitProps!.has("y")).toBe(false);
  });

  it("tracks label as always explicit", () => {
    const result = parseDSL('node b "B Label"');
    const node = result.nodes[0];
    expect(node._explicitProps!.has("label")).toBe(true);
    expect(node._explicitProps!.has("shape")).toBe(false);
  });

  it("tracks x and y when explicitly set", () => {
    const result = parseDSL('node c "C" { x=100 y=200 }');
    const node = result.nodes[0];
    expect(node._explicitProps!.has("x")).toBe(true);
    expect(node._explicitProps!.has("y")).toBe(true);
  });

  it("tracks id as always explicit", () => {
    const result = parseDSL('node myNode "N"');
    expect(result.nodes[0]._explicitProps!.has("id")).toBe(true);
  });

  it("tracks all explicitly set props", () => {
    const result = parseDSL('node a "A" { shape=diamond color=#fff icon=🎨 fontSize=16 }');
    const props = result.nodes[0]._explicitProps!;
    expect(props.has("shape")).toBe(true);
    expect(props.has("color")).toBe(true);
    expect(props.has("icon")).toBe(true);
    expect(props.has("fontSize")).toBe(true);
  });
});

describe("nested group block syntax", () => {
  it("ネストグループ（ブロック構文）を解析する", () => {
    const code = `group outer "外側" { color=#6366f1
  group inner "内側" { color=#f59e0b x=20 y=40 w=150 h=120 }
  node n1 "ノード" { shape=rect x=50 y=80 }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(2);
    // outer グループ: 絶対座標 (0,0)
    expect(result.groups[0]).toMatchObject({ id: "outer", parentGroup: undefined });
    // inner グループ: outer の位置 (0,0) + 相対座標 (20,40) = (20,40)
    expect(result.groups[1]).toMatchObject({ id: "inner", parentGroup: "outer", x: 20, y: 40 });
    // n1: outer の位置 (0,0) + 相対座標 (50,80) = (50,80), group="outer"
    expect(result.nodes[0]).toMatchObject({ id: "n1", group: "outer", x: 50, y: 80 });
  });

  it("3階層ネストグループを解析する", () => {
    const code = `group lv1 "L1" { x=10 y=10
  group lv2 "L2" { x=20 y=20
    group lv3 "L3" { x=10 y=10 w=100 h=80 }
    node n1 "N1" { x=10 y=20 }
  }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]).toMatchObject({ id: "lv1", x: 10, y: 10, parentGroup: undefined });
    expect(result.groups[1]).toMatchObject({ id: "lv2", x: 30, y: 30, parentGroup: "lv1" });
    // lv3: lv1(10,10) + lv2(20,20) + lv3(10,10) = (40,40)
    expect(result.groups[2]).toMatchObject({ id: "lv3", x: 40, y: 40, parentGroup: "lv2" });
    // n1: lv1(10,10) + lv2(20,20) + n1(10,20) = (40,50)
    expect(result.nodes[0]).toMatchObject({ id: "n1", group: "lv2", x: 40, y: 50 });
  });

  it("ブロック内の edge は通常通り解析される", () => {
    const code = `group g1 "G1" {
  node a "A" { x=20 y=20 }
  node b "B" { x=20 y=100 }
  edge a -> b { label="接続" }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", label: "接続" });
  });

  it("ブロック構文でnoteを含むグループを解析する", () => {
    const code = `group g1 "G1" {
  node a "A" { x=20 y=20 }
  note n1 "メモ" { x=100 y=20 }
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.nodes).toHaveLength(1);
    expect(result.notes).toHaveLength(1);
    expect(result.nodes[0].group).toBe("g1");
  });

  it("空のグループブロックを解析する", () => {
    const code = `group g1 "空グループ" { color=#6366f1
}`;
    const result = parseDSL(code);
    expect(result.errors).toHaveLength(0);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].id).toBe("g1");
  });
});

describe("edge operators", () => {
  it("-> は arrow=end, style=solid", () => {
    const result = parseDSL("edge a -> b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "end", style: "solid" });
  });

  it("<- は arrow=start, style=solid", () => {
    const result = parseDSL("edge a <- b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "start", style: "solid" });
  });

  it("<-> は arrow=both, style=solid", () => {
    const result = parseDSL("edge a <-> b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "both", style: "solid" });
  });

  it("--> は arrow=end, style=dashed", () => {
    const result = parseDSL("edge a --> b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "end", style: "dashed" });
  });

  it("<-- は arrow=start, style=dashed", () => {
    const result = parseDSL("edge a <-- b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "start", style: "dashed" });
  });

  it("<--> は arrow=both, style=dashed", () => {
    const result = parseDSL("edge a <--> b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "both", style: "dashed" });
  });

  it("-- は arrow=none, style=solid", () => {
    const result = parseDSL("edge a -- b");
    expect(result.edges[0]).toMatchObject({ from: "a", to: "b", arrow: "none", style: "solid" });
  });

  it("演算子とプロパティを組み合わせられる", () => {
    const result = parseDSL('edge a --> b { label="テスト" color=#ff0000 }');
    expect(result.edges[0]).toMatchObject({
      from: "a", to: "b", arrow: "end", style: "dashed",
      label: "テスト", color: "#ff0000",
    });
  });
});
