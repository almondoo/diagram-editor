import { describe, it, expect } from "vitest";
import { autoLayout } from "../layout.js";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "../types.js";

function makeNode(id: string, needsPos = true, group = ""): DiagramNode {
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
    group,
    fontSize: 13,
    borderColor: "",
    borderWidth: 2,
    opacity: 1,
    dashed: false,
    _needsPosition: needsPos,
  };
}

function makeGroup(id: string, x = 0, y = 0, w = 300, h = 200): DiagramGroup {
  return { id, label: id, x, y, w, h, color: "#6366f1" };
}

const EDGE = (from: string, to: string): DiagramEdge => ({
  from, to, label: "", color: "#fff", style: "solid",
  animate: false, thickness: 1.5, arrow: "end", curve: "smooth",
});

describe("autoLayout", () => {
  it("ノードが空の場合は nodes:[] groupUpdates:{} を返す", () => {
    const result = autoLayout([], []);
    expect(result.nodes).toEqual([]);
    expect(result.groupUpdates).toEqual({});
  });

  it("__RANDOM__カラーを解決する", () => {
    const nodes = [{ ...makeNode("a"), color: "__RANDOM__" }];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].color).not.toBe("__RANDOM__");
    expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("位置なしノードに座標を割り当てる", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].x).not.toBeNaN();
    expect(result[0].y).not.toBeNaN();
    expect(result[1].x).not.toBeNaN();
    expect(result[1].y).not.toBeNaN();
  });

  it("_needsPositionが削除される", () => {
    const nodes = [makeNode("a")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]._needsPosition).toBeUndefined();
  });

  it("位置があるノードは変更しない", () => {
    const nodes = [makeNode("a", false)];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].x).toBe(100);
    expect(result[0].y).toBe(100);
  });

  it("エッジに基づいてレイヤーを割り当てる (a < b < c)", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges);
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    expect(byId.a.x).toBeLessThan(byId.b.x);
    expect(byId.b.x).toBeLessThan(byId.c.x);
  });

  it("循環グラフでクラッシュしない", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [EDGE("a", "b"), EDGE("b", "a")];
    expect(() => autoLayout(nodes, edges)).not.toThrow();
  });

  it("グループ内ノードはグループ枠内に配置される", () => {
    const group = makeGroup("g1", 10, 10, 400, 300);
    const nodes = [makeNode("a", true, "g1"), makeNode("b", true, "g1")];
    const { groupUpdates } = autoLayout(nodes, [], [group]);
    // グループ更新が返される
    expect(groupUpdates["g1"]).toBeDefined();
    // groupUpdates の幅・高さは正の値
    expect(groupUpdates["g1"].w).toBeGreaterThan(0);
    expect(groupUpdates["g1"].h).toBeGreaterThan(0);
  });

  it("グループ自動フィット: groupUpdates のサイズが全ノードを含む", () => {
    const group = makeGroup("g1", 0, 0, 400, 300);
    const nodes = [makeNode("a", true, "g1"), makeNode("b", true, "g1")];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
    const g = groupUpdates["g1"];
    // 全メンバーノードが groupUpdates の枠内に入っている
    for (const n of result.filter(n => n.group === "g1")) {
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y).toBeGreaterThanOrEqual(g.y);
      expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w + 1); // 1px 余裕
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h + 1);
    }
  });
});
