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
});
