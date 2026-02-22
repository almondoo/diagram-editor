import { describe, it, expect } from "vitest";
import { getCompletionContext, getCompletionItems } from "../autocomplete.js";

describe("getCompletionContext", () => {
  it("行頭の入力はkeywordコンテキスト", () => {
    const ctx = getCompletionContext("no", 2, "", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });

  it("インデント付きの行頭もkeywordコンテキスト", () => {
    const ctx = getCompletionContext("  no", 4, "", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });

  it("edge の後はnodeIdコンテキスト（from）", () => {
    const ctx = getCompletionContext("edge s", 6, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "s" });
  });

  it("edge from の後にオペレーター入力中はedgeOperatorコンテキスト", () => {
    const ctx = getCompletionContext("edge a1 -", 9, "", []);
    expect(ctx).toEqual({ type: "edgeOperator", prefix: "-" });
  });

  it("edge from OP の後はnodeIdコンテキスト（to）", () => {
    const ctx = getCompletionContext("edge a1 -> b", 12, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "b" });
  });

  it("style の後はnodeIdコンテキスト", () => {
    const ctx = getCompletionContext("style s", 7, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "s" });
  });

  it("{ } ブロック内のプロパティ入力はpropertyコンテキスト", () => {
    const ctx = getCompletionContext("  sh", 4, "node a1 \"test\" {", []);
    expect(ctx).toEqual({ type: "property", prefix: "sh", blockType: "node" });
  });

  it("プロパティ=の後はvalueコンテキスト", () => {
    const ctx = getCompletionContext("  shape=st", 10, "node a1 \"test\" {", []);
    expect(ctx).toEqual({ type: "value", prefix: "st", property: "shape", blockType: "node" });
  });

  it("コメント行では補完なし", () => {
    const ctx = getCompletionContext("// no", 5, "", []);
    expect(ctx).toBeNull();
  });

  it("空行では補完なし", () => {
    const ctx = getCompletionContext("", 0, "", []);
    expect(ctx).toBeNull();
  });

  it("node id \"label\" の後に { を入力済みはnullを返す", () => {
    const ctx = getCompletionContext('node a1 "test" {', 17, "", []);
    expect(ctx).toBeNull();
  });

  it("groupブロック内のnode行頭はkeywordコンテキスト", () => {
    const ctx = getCompletionContext("  no", 4, "group g1 \"test\" {", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });
});

describe("getCompletionItems", () => {
  it("keywordコンテキストでnから始まる候補", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "n" }, []);
    expect(items.map((i) => i.text)).toEqual(["node", "note"]);
  });

  it("nodeIdコンテキストで定義済みIDを候補にする", () => {
    const ids = ["server", "client", "db"];
    const items = getCompletionItems({ type: "nodeId", prefix: "s" }, ids);
    expect(items.map((i) => i.text)).toEqual(["server"]);
  });

  it("edgeOperatorコンテキストで->から始まる候補", () => {
    const items = getCompletionItems({ type: "edgeOperator", prefix: "-" }, []);
    expect(items.map((i) => i.text)).toContain("->");
    expect(items.map((i) => i.text)).toContain("--");
  });

  it("propertyコンテキストでnodeのshから始まるプロパティ", () => {
    const items = getCompletionItems({ type: "property", prefix: "sh", blockType: "node" }, []);
    expect(items.map((i) => i.text)).toEqual(["shape"]);
  });

  it("valueコンテキストでshape=の候補", () => {
    const items = getCompletionItems({ type: "value", prefix: "", property: "shape", blockType: "node" }, []);
    expect(items.map((i) => i.text)).toContain("rect");
    expect(items.map((i) => i.text)).toContain("circle");
  });

  it("プレフィックスが空のkeywordは全キーワードを返す", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "" }, []);
    expect(items.map((i) => i.text)).toEqual(["node", "edge", "group", "note", "style"]);
  });

  it("valueコンテキストでanimate=の候補", () => {
    const items = getCompletionItems({ type: "value", prefix: "", property: "animate", blockType: "edge" }, []);
    expect(items.map((i) => i.text)).toEqual(["true", "false"]);
  });

  it("マッチしない場合は空配列", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "xyz" }, []);
    expect(items).toEqual([]);
  });
});
