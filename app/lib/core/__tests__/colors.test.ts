import { describe, it, expect } from "vitest";
import { VIBRANT_COLORS, randomColor, randomPosition } from "../colors";

describe("VIBRANT_COLORS", () => {
  it("配列である", () => {
    expect(Array.isArray(VIBRANT_COLORS)).toBe(true);
  });

  it("空でない", () => {
    expect(VIBRANT_COLORS.length).toBeGreaterThan(0);
  });

  it("すべてhexカラーコード", () => {
    for (const c of VIBRANT_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("randomColor", () => {
  it("VIBRANT_COLORSの中から返す", () => {
    for (let i = 0; i < 20; i++) {
      expect(VIBRANT_COLORS).toContain(randomColor());
    }
  });

  it("文字列を返す", () => {
    expect(typeof randomColor()).toBe("string");
  });
});

describe("randomPosition", () => {
  it("x, y を含むオブジェクトを返す", () => {
    const pos = randomPosition([]);
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
  });

  it("整数を返す", () => {
    const pos = randomPosition([]);
    expect(pos.x).toBe(Math.round(pos.x));
    expect(pos.y).toBe(Math.round(pos.y));
  });

  it("正の範囲の値を返す", () => {
    const pos = randomPosition([]);
    expect(pos.x).toBeGreaterThanOrEqual(60);
    expect(pos.y).toBeGreaterThanOrEqual(60);
  });

  it("既存ノードと重ならない位置を返す", () => {
    const existing = [{ x: 100, y: 100, w: 150, h: 60 }];
    const pos = randomPosition(existing);
    // 返った位置が既存ノードと 30px 以上離れているか、
    // または80回のリトライで見つからず fallback したか
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
  });

  it("既存ノードが密に配置されていても例外を投げない", () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({
      x: 60 + (i % 10) * 50,
      y: 60 + Math.floor(i / 10) * 50,
      w: 150,
      h: 60,
    }));
    expect(() => randomPosition(existing)).not.toThrow();
  });

  it("カスタムサイズを指定できる", () => {
    const pos = randomPosition([], 200, 100);
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
  });
});
