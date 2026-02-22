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
    opacity: 1,
    dashed: false,
    _needsPosition: needsPos,
  };
}

function makeGroup(id: string, x = 0, y = 0, w = 300, h = 200, parentGroup?: string): DiagramGroup {
  return { id, label: id, x, y, w, h, color: "#6366f1", ...(parentGroup !== undefined ? { parentGroup } : {}) };
}

const EDGE = (from: string, to: string): DiagramEdge => ({
  from, to, label: "", color: "#fff", style: "solid",
  animate: false, thickness: 1.5, arrow: "end", curve: "smooth",
  bendX: 0, bendY: 0,
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
    expect(result[0]!.color).not.toBe("__RANDOM__");
    expect(result[0]!.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("位置なしノードに座標を割り当てる", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]!.x).not.toBeNaN();
    expect(result[0]!.y).not.toBeNaN();
    expect(result[1]!.x).not.toBeNaN();
    expect(result[1]!.y).not.toBeNaN();
  });

  it("_needsPositionが削除される", () => {
    const nodes = [makeNode("a")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]!._needsPosition).toBeUndefined();
  });

  it("位置があるノードは変更しない", () => {
    const nodes = [makeNode("a", false)];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]!.x).toBe(100);
    expect(result[0]!.y).toBe(100);
  });

  it("エッジに基づいてレイヤーを割り当てる (a < b < c)", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges);
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    expect(byId.a!.x).toBeLessThan(byId.b!.x);
    expect(byId.b!.x).toBeLessThan(byId.c!.x);
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
    expect(groupUpdates["g1"]!.w).toBeGreaterThan(0);
    expect(groupUpdates["g1"]!.h).toBeGreaterThan(0);
  });

  it("グループ自動フィット: groupUpdates のサイズが全ノードを含む", () => {
    const group = makeGroup("g1", 0, 0, 400, 300);
    const nodes = [makeNode("a", true, "g1"), makeNode("b", true, "g1")];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
    const g = groupUpdates["g1"]!;
    // 全メンバーノードが groupUpdates の枠内に入っている
    for (const n of result.filter(n => n.group === "g1")) {
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y).toBeGreaterThanOrEqual(g.y);
      expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w + 1); // 1px 余裕
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h + 1);
    }
  });

  it("複数グループが重ならないようにauto-layoutする", () => {
    // 同じ位置 (0,0) に2つのグループ → auto-layout後は重ならない
    const g1 = makeGroup("g1", 0, 0, 300, 200);
    const g2 = makeGroup("g2", 0, 0, 300, 200);
    const nodes = [
      makeNode("a", true, "g1"),
      makeNode("b", true, "g2"),
    ];
    const { groupUpdates } = autoLayout(nodes, [], [g1, g2]);
    const rg1 = groupUpdates["g1"] ?? g1;
    const rg2 = groupUpdates["g2"] ?? g2;
    // 水平方向または垂直方向に重なっていないことを確認 (20px の余白)
    const overlapX = rg1.x + rg1.w + 20 > rg2.x && rg2.x + rg2.w + 20 > rg1.x;
    const overlapY = rg1.y + rg1.h + 20 > rg2.y && rg2.y + rg2.h + 20 > rg1.y;
    expect(overlapX && overlapY).toBe(false);
  });

  it("グループ間エッジを考慮してdagreがグループを配置する", () => {
    const g1 = makeGroup("g1", 0, 0, 200, 150);
    const g2 = makeGroup("g2", 0, 0, 200, 150);
    const g3 = makeGroup("g3", 0, 0, 200, 150);
    const nodes = [
      makeNode("a", true, "g1"),
      makeNode("b", true, "g2"),
      makeNode("c", true, "g3"),
    ];
    // a->b, b->c のエッジ → dagre は g1→g2→g3 の順に配置 (LR)
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { groupUpdates } = autoLayout(nodes, edges, [g1, g2, g3]);
    const rg1 = groupUpdates["g1"] ?? g1;
    const rg2 = groupUpdates["g2"] ?? g2;
    const rg3 = groupUpdates["g3"] ?? g3;
    // g1 → g2 → g3 の順に x が増える (LR layout)
    expect(rg1.x).toBeLessThan(rg2.x);
    expect(rg2.x).toBeLessThan(rg3.x);
  });

  it("全ノードが既配置ならgroupUpdatesは空", () => {
    const nodes = [makeNode("a", false), makeNode("b", false)];
    const { groupUpdates } = autoLayout(nodes, []);
    expect(groupUpdates).toEqual({});
  });

  it("単一ノードでもレイアウトが動作する", () => {
    const nodes = [makeNode("a")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]!.x).not.toBeNaN();
    expect(result[0]!.y).not.toBeNaN();
  });

  it("グループに属しないフリーノードがグループの下に配置される", () => {
    const group = makeGroup("g1", 0, 0, 300, 200);
    const nodes = [
      makeNode("a", true, "g1"),
      makeNode("free", true, ""),
    ];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
    const g = groupUpdates["g1"] ?? group;
    const freeNode = result.find(n => n.id === "free")!;
    // フリーノードはグループの下に配置される
    expect(freeNode.y).toBeGreaterThanOrEqual(g.y + g.h);
  });

  it("グループ内のエッジに基づいてノードを並べる", () => {
    const group = makeGroup("g1", 0, 0, 500, 300);
    const nodes = [
      makeNode("a", true, "g1"),
      makeNode("b", true, "g1"),
      makeNode("c", true, "g1"),
    ];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges, [group]);
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    // a -> b -> c の順に x が増える (LR layout)
    expect(byId.a!.x).toBeLessThan(byId.b!.x);
    expect(byId.b!.x).toBeLessThan(byId.c!.x);
  });

  it("複数の__RANDOM__カラーが全て解決される", () => {
    const nodes = [
      { ...makeNode("a"), color: "__RANDOM__" },
      { ...makeNode("b"), color: "__RANDOM__" },
      { ...makeNode("c"), color: "__RANDOM__" },
    ];
    const { nodes: result } = autoLayout(nodes, []);
    for (const n of result) {
      expect(n.color).not.toBe("__RANDOM__");
      expect(n.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("parentGroupがあるグループはdagreの対象外", () => {
    const parent = makeGroup("parent", 0, 0, 500, 400);
    const child = makeGroup("child", 10, 10, 200, 150, "parent");
    const nodes = [
      makeNode("a", true, "parent"),
      makeNode("b", true, "child"),
    ];
    expect(() => autoLayout(nodes, [], [parent, child])).not.toThrow();
  });
});
