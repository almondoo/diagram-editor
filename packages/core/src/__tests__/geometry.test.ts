import { describe, it, expect } from "vitest";
import { getShapePath, getNodeCenter, getEdgePoints, computeEdgeRoute, buildEdgePath } from "../geometry.js";
import type { DiagramNode } from "../types.js";

function makeNode(overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id: "n",
    label: "test",
    shape: "rect",
    color: "#6366f1",
    textColor: "#ffffff",
    x: 0,
    y: 0,
    w: 150,
    h: 60,
    icon: "",
    group: "",
    fontSize: 13,
    borderColor: "",
    borderWidth: 2,
    opacity: 1,
    dashed: false,
    ...overrides,
  };
}

describe("getShapePath", () => {
  it("stadiumのパスを返す", () => {
    const path = getShapePath("stadium", 0, 0, 150, 60);
    expect(path).toBeTruthy();
    expect(path).toContain("M");
    expect(path).toContain("A");
  });

  it("diamondのパスを返す", () => {
    const path = getShapePath("diamond", 0, 0, 150, 60);
    expect(path).toBeTruthy();
    expect(path).toContain("Z");
  });

  it("diamond パスが正しい頂点を持つ", () => {
    const path = getShapePath("diamond", 10, 20, 100, 50);
    expect(path).not.toBeNull();
    // 上: (60,20), 右: (110,45), 下: (60,70), 左: (10,45)
    expect(path).toContain("M60,20");
    expect(path).toContain("L110,45");
    expect(path).toContain("L60,70");
    expect(path).toContain("L10,45");
  });

  it("ellipseはnullを返す", () => {
    expect(getShapePath("ellipse", 0, 0, 150, 60)).toBeNull();
  });

  it("circleはnullを返す", () => {
    expect(getShapePath("circle", 0, 0, 150, 60)).toBeNull();
  });

  it("cylinderはnullを返す", () => {
    expect(getShapePath("cylinder", 0, 0, 150, 60)).toBeNull();
  });

  it("rectはnullを返す (デフォルト)", () => {
    expect(getShapePath("rect", 0, 0, 150, 60)).toBeNull();
  });

  it("hexagonのパスを返す", () => {
    const path = getShapePath("hexagon", 0, 0, 150, 60);
    expect(path).toBeTruthy();
    expect(path).toContain("Z");
  });

  it("parallelogramのパスを返す", () => {
    const path = getShapePath("parallelogram", 0, 0, 150, 60);
    expect(path).toBeTruthy();
    expect(path).toContain("Z");
  });

  it("trapezoidのパスを返す", () => {
    const path = getShapePath("trapezoid", 0, 0, 150, 60);
    expect(path).toBeTruthy();
    expect(path).toContain("Z");
  });

  it("未知のシェイプはnullを返す", () => {
    expect(getShapePath("unknown", 0, 0, 150, 60)).toBeNull();
  });
});

describe("getNodeCenter", () => {
  it("ノードの中心座標を返す", () => {
    const node = makeNode({ x: 100, y: 200, w: 150, h: 60 });
    const center = getNodeCenter(node);
    expect(center.x).toBe(175); // 100 + 150/2
    expect(center.y).toBe(230); // 200 + 60/2
  });

  it("原点のノードの中心", () => {
    const node = makeNode({ x: 0, y: 0, w: 100, h: 100 });
    const center = getNodeCenter(node);
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });

  it("小さなノードの中心", () => {
    const node = makeNode({ x: 10, y: 20, w: 2, h: 2 });
    const center = getNodeCenter(node);
    expect(center.x).toBe(11);
    expect(center.y).toBe(21);
  });
});

describe("getEdgePoints", () => {
  it("2つのノード間のエッジ接点を計算する", () => {
    const from = makeNode({ x: 0, y: 0, w: 150, h: 60 });
    const to = makeNode({ x: 300, y: 0, w: 150, h: 60 });
    const { from: fp, to: tp } = getEdgePoints(from, to);

    // fromノードの右辺付近
    expect(fp.x).toBeGreaterThan(75);  // 中心より右
    expect(fp.y).toBeCloseTo(30, 0);   // y中心付近

    // toノードの左辺付近
    expect(tp.x).toBeLessThan(375);    // 中心より左
    expect(tp.y).toBeCloseTo(30, 0);   // y中心付近
  });

  it("垂直方向のエッジを計算する", () => {
    const from = makeNode({ x: 0, y: 0, w: 150, h: 60 });
    const to = makeNode({ x: 0, y: 200, w: 150, h: 60 });
    const { from: fp, to: tp } = getEdgePoints(from, to);

    expect(fp.x).toBeCloseTo(75, 0);  // x中心付近
    expect(fp.y).toBeGreaterThan(30); // fromノードの下辺付近
    expect(tp.x).toBeCloseTo(75, 0);  // x中心付近
    expect(tp.y).toBeLessThan(230);   // toノードの上辺付近
  });

  it("斜め方向のエッジを計算する", () => {
    const from = makeNode({ x: 0, y: 0, w: 100, h: 100 });
    const to = makeNode({ x: 200, y: 200, w: 100, h: 100 });
    const { from: fp, to: tp } = getEdgePoints(from, to);

    // fromポイントはノードの右下付近
    expect(fp.x).toBeGreaterThan(50);
    expect(fp.y).toBeGreaterThan(50);
    // toポイントはノードの左上付近
    expect(tp.x).toBeLessThan(250);
    expect(tp.y).toBeLessThan(250);
  });

  it("同一位置のノード間でもクラッシュしない", () => {
    const from = makeNode({ x: 100, y: 100, w: 100, h: 100 });
    const to = makeNode({ x: 100, y: 100, w: 100, h: 100 });
    expect(() => getEdgePoints(from, to)).not.toThrow();
  });
});

describe("computeEdgeRoute", () => {
  it("障害物がない場合はnullを返す", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 200, y: 0 };
    const result = computeEdgeRoute(from, to, []);
    expect(result).toBeNull();
  });

  it("直線パス上に障害物がある場合はウェイポイントを返す", () => {
    const from = { x: 0, y: 30 };
    const to = { x: 300, y: 30 };
    const obstacle = makeNode({ x: 100, y: 0, w: 100, h: 60 });
    const result = computeEdgeRoute(from, to, [obstacle]);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
  });

  it("障害物が直線パスから離れている場合はnullを返す", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 200, y: 0 };
    const obstacle = makeNode({ x: 100, y: 200, w: 100, h: 60 });
    const result = computeEdgeRoute(from, to, [obstacle]);
    expect(result).toBeNull();
  });

  it("カスタムパディングを指定できる", () => {
    const from = { x: 0, y: 30 };
    const to = { x: 300, y: 30 };
    const obstacle = makeNode({ x: 100, y: 0, w: 100, h: 60 });
    const result = computeEdgeRoute(from, to, [obstacle], 50);
    expect(result).not.toBeNull();
  });

  it("複数の障害物がある場合、最初の障害物を迂回する", () => {
    const from = { x: 0, y: 30 };
    const to = { x: 500, y: 30 };
    const obstacles = [
      makeNode({ x: 100, y: 0, w: 100, h: 60 }),
      makeNode({ x: 300, y: 0, w: 100, h: 60 }),
    ];
    const result = computeEdgeRoute(from, to, obstacles);
    expect(result).not.toBeNull();
  });
});

describe("buildEdgePath", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 200, y: 0 };

  it("smooth曲線のパスを返す", () => {
    const result = buildEdgePath(from, to, "smooth");
    expect(result.pathD).toContain("M");
    expect(result.pathD).toContain("Q");
    expect(typeof result.labelX).toBe("number");
    expect(typeof result.labelY).toBe("number");
  });

  it("straight直線のパスを返す", () => {
    const result = buildEdgePath(from, to, "straight");
    expect(result.pathD).toContain("M");
    expect(result.pathD).toContain("L");
    expect(result.pathD).not.toContain("Q");
  });

  it("直線のラベル位置は中点", () => {
    const result = buildEdgePath(from, to, "straight");
    expect(result.labelX).toBe(100);
    expect(result.labelY).toBe(0);
  });

  it("ルートポイントがある場合はCatmull-Romパスを返す", () => {
    const routePoints = [{ x: 100, y: -50 }];
    const result = buildEdgePath(from, to, "smooth", routePoints);
    expect(result.pathD).toContain("M");
    expect(result.pathD).toContain("C");
  });

  it("ルートポイントがある場合もlabelX,labelYを返す", () => {
    const routePoints = [{ x: 100, y: -50 }];
    const result = buildEdgePath(from, to, "smooth", routePoints);
    expect(typeof result.labelX).toBe("number");
    expect(typeof result.labelY).toBe("number");
  });

  it("空のルートポイントは通常の曲線パスを返す", () => {
    const result = buildEdgePath(from, to, "smooth", []);
    expect(result.pathD).toContain("Q");
  });

  it("垂直方向のエッジ", () => {
    const vFrom = { x: 100, y: 0 };
    const vTo = { x: 100, y: 200 };
    const result = buildEdgePath(vFrom, vTo, "smooth");
    expect(result.pathD).toContain("M100,0");
  });
});
