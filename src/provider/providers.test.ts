/**
 * Tests for provider definitions and model catalog.
 * @see .omo/plans/zcode-proxy.md Task 3
 */
import { describe, it, expect } from "bun:test";
import { getProvider, listProviders, ZAI_PROVIDER, BIGMODEL_PROVIDER } from "./providers.js";
import { MODELS, getModel, listModelIds } from "./models.js";

describe("providers", () => {
  it("getProvider returns Z.AI definition", () => {
    const p = getProvider("zai");
    expect(p.id).toBe("zai");
    expect(p.anthropicBaseURL).toBe("https://api.z.ai/api/anthropic");
    expect(p.openaiBaseURL).toBe("https://api.z.ai/api/coding/paas/v4");
    expect(p.bizHost).toBe("https://api.z.ai");
  });

  it("getProvider returns Bigmodel definition", () => {
    const p = getProvider("bigmodel");
    expect(p.id).toBe("bigmodel");
    expect(p.anthropicBaseURL).toBe("https://open.bigmodel.cn/api/anthropic");
    expect(p.openaiBaseURL).toBe("https://open.bigmodel.cn/api/coding/paas/v4");
    expect(p.bizHost).toBe("https://open.bigmodel.cn");
  });

  it("ZAI_PROVIDER constant matches getProvider('zai')", () => {
    expect(ZAI_PROVIDER).toEqual(getProvider("zai"));
  });

  it("BIGMODEL_PROVIDER constant matches getProvider('bigmodel')", () => {
    expect(BIGMODEL_PROVIDER).toEqual(getProvider("bigmodel"));
  });

  it("listProviders returns both providers", () => {
    const ids = listProviders();
    expect(ids).toContain("zai");
    expect(ids).toContain("bigmodel");
    expect(ids).toHaveLength(2);
  });

  it("getProvider throws on unknown id", () => {
    expect(() => getProvider("openai" as any)).toThrow(/Unknown provider/);
  });
});

describe("models", () => {
  it("MODELS is non-empty", () => {
    expect(MODELS.length).toBeGreaterThan(0);
  });

  it("getModel returns known model glm-4.6", () => {
    const m = getModel("glm-4.6");
    expect(m).toBeDefined();
    expect(m!.id).toBe("glm-4.6");
    expect(m!.name).toBe("glm-4.6");
    expect(m!.contextWindow).toBeGreaterThan(0);
  });

  it("getModel returns glm-4.5 with correct fields", () => {
    const m = getModel("glm-4.5");
    expect(m).toBeDefined();
    expect(m!.contextWindow).toBe(131072);
  });

  it("getModel returns undefined for unknown model", () => {
    expect(getModel("gpt-4")).toBeUndefined();
  });

  it("all models have valid id and contextWindow", () => {
    for (const m of MODELS) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });

  it("listModelIds matches MODELS length", () => {
    expect(listModelIds()).toHaveLength(MODELS.length);
  });

  it("includes key GLM models", () => {
    const ids = listModelIds();
    expect(ids).toContain("glm-4.6");
    expect(ids).toContain("glm-4.5");
    expect(ids).toContain("codegeex-4");
  });
});
