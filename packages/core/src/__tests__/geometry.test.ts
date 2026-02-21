import { describe, it, expect } from "vitest";
import { getShapePath, getNodeCenter, getEdgePoints } from "../geometry.js";
import type { DiagramNode } from "../types.js";

function makeNode(x: number, y: number, w = 150, h = 60): DiagramNode {
  return {
    id: "n",
    label: "test",
    shape: "rect",
    color: "#6366f1",
    textColor: "#ffffff",
    x, y, w, h,
    icon: "",
    group: "",
    fontSize: 13,
    borderColor: "",
    borderWidth: 2,
    opacity: 1,
    dashed: false,
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
  });

  it("parallelogramのパスを返す", () => {
    const path = getShapePath("parallelogram", 0, 0, 150, 60);
    expect(path).toBeTruthy();
  });

  it("trapezoidのパスを返す", () => {
    const path = getShapePath("trapezoid", 0, 0, 150, 60);
    expect(path).toBeTruthy();
  });
});

describe("getNodeCenter", () => {
  it("ノードの中心座標を返す", () => {
    const node = makeNode(100, 200, 150, 60);
    const center = getNodeCenter(node);
    expect(center.x).toBe(175); // 100 + 150/2
    expect(center.y).toBe(230); // 200 + 60/2
  });
});

describe("getEdgePoints", () => {
  it("2つのノード間のエッジ接点を計算する", () => {
    const from = makeNode(0, 0, 150, 60);
    const to = makeNode(300, 0, 150, 60);
    const { from: fp, to: tp } = getEdgePoints(from, to);

    // fromノードの右辺付近
    expect(fp.x).toBeGreaterThan(75);  // 中心より右
    expect(fp.y).toBeCloseTo(30, 0);   // y中心付近

    // toノードの左辺付近
    expect(tp.x).toBeLessThan(375);    // 中心より左
    expect(tp.y).toBeCloseTo(30, 0);   // y中心付近
  });

  it("垂直方向のエッジを計算する", () => {
    const from = makeNode(0, 0, 150, 60);
    const to = makeNode(0, 200, 150, 60);
    const { from: fp, to: tp } = getEdgePoints(from, to);

    expect(fp.x).toBeCloseTo(75, 0);  // x中心付近
    expect(fp.y).toBeGreaterThan(30); // fromノードの下辺付近
    expect(tp.x).toBeCloseTo(75, 0);  // x中心付近
    expect(tp.y).toBeLessThan(230);   // toノードの上辺付近
  });
});
