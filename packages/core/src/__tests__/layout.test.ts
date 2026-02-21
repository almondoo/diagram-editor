import { describe, it, expect } from "vitest";
import { autoLayout } from "../layout.js";
import type { DiagramNode, DiagramEdge } from "../types.js";

function makeNode(id: string, needsPos = true): DiagramNode {
  return {
    id,
    label: id,
    shape: "rect",
    color: "#6366f1",
    textColor: "#ffffff",
    x: needsPos ? NaN : 100,
    y: needsPos ? NaN : 100,
    w: 150,
    h: 60,
    icon: "",
    group: "",
    fontSize: 13,
    borderColor: "",
    borderWidth: 2,
    opacity: 1,
    dashed: false,
    _needsPosition: needsPos,
  };
}

describe("autoLayout", () => {
  it("ノードが空の場合はそのまま返す", () => {
    expect(autoLayout([], [])).toEqual([]);
  });

  it("__RANDOM__カラーを解決する", () => {
    const nodes = [{ ...makeNode("a"), color: "__RANDOM__" }];
    const result = autoLayout(nodes, []);
    expect(result[0].color).not.toBe("__RANDOM__");
    expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("位置なしノードに座標を割り当てる", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const result = autoLayout(nodes, []);
    expect(result[0].x).not.toBeNaN();
    expect(result[0].y).not.toBeNaN();
    expect(result[1].x).not.toBeNaN();
    expect(result[1].y).not.toBeNaN();
  });

  it("_needsPositionが削除される", () => {
    const nodes = [makeNode("a")];
    const result = autoLayout(nodes, []);
    expect(result[0]._needsPosition).toBeUndefined();
  });

  it("位置があるノードは変更しない", () => {
    const nodes = [makeNode("a", false)];
    const result = autoLayout(nodes, []);
    expect(result[0].x).toBe(100);
    expect(result[0].y).toBe(100);
  });

  it("エッジに基づいてレイヤーを割り当てる", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges: DiagramEdge[] = [
      { from: "a", to: "b", label: "", color: "#fff", style: "solid", animate: false, thickness: 1.5, arrow: "end", curve: "smooth" },
      { from: "b", to: "c", label: "", color: "#fff", style: "solid", animate: false, thickness: 1.5, arrow: "end", curve: "smooth" },
    ];
    const result = autoLayout(nodes, edges);
    // a -> b -> c のトポロジーで a が最初のレイヤー
    expect(result[0].x).toBeLessThan(result[1].x);
    expect(result[1].x).toBeLessThan(result[2].x);
  });

  it("循環グラフでクラッシュしない", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: DiagramEdge[] = [
      { from: "a", to: "b", label: "", color: "#fff", style: "solid", animate: false, thickness: 1.5, arrow: "end", curve: "smooth" },
      { from: "b", to: "a", label: "", color: "#fff", style: "solid", animate: false, thickness: 1.5, arrow: "end", curve: "smooth" },
    ];
    expect(() => autoLayout(nodes, edges)).not.toThrow();
  });
});
