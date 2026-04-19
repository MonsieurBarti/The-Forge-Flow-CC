import { describe, expect, it } from "vitest";
import {
  resolveEffectiveTier,
  signalsToPolicyTier,
} from "../../../../src/domain/helpers/tier-resolver.js";

describe("signalsToPolicyTier", () => {
  it("low+low → haiku", () => {
    expect(signalsToPolicyTier({ complexity: "low", risk: { level: "low", tags: [] } })).toBe("haiku");
  });
  it("low+medium → sonnet", () => {
    expect(signalsToPolicyTier({ complexity: "low", risk: { level: "medium", tags: [] } })).toBe("sonnet");
  });
  it("medium+low → sonnet", () => {
    expect(signalsToPolicyTier({ complexity: "medium", risk: { level: "low", tags: [] } })).toBe("sonnet");
  });
  it("medium+medium → sonnet", () => {
    expect(signalsToPolicyTier({ complexity: "medium", risk: { level: "medium", tags: [] } })).toBe("sonnet");
  });
  it("high+low → opus", () => {
    expect(signalsToPolicyTier({ complexity: "high", risk: { level: "low", tags: [] } })).toBe("opus");
  });
  it("medium+high → opus", () => {
    expect(signalsToPolicyTier({ complexity: "medium", risk: { level: "high", tags: [] } })).toBe("opus");
  });
  it("high+high → opus", () => {
    expect(signalsToPolicyTier({ complexity: "high", risk: { level: "high", tags: ["auth"] } })).toBe("opus");
  });
  it("low+high → opus", () => {
    expect(signalsToPolicyTier({ complexity: "low", risk: { level: "high", tags: ["auth"] } })).toBe("opus");
  });
  it("high+medium → opus", () => {
    expect(signalsToPolicyTier({ complexity: "high", risk: { level: "medium", tags: [] } })).toBe("opus");
  });
});

describe("resolveEffectiveTier", () => {
  it("uses policy_tier when above min_tier", () => {
    expect(resolveEffectiveTier("opus", "haiku")).toEqual({ tier: "opus", min_tier_applied: false });
  });
  it("applies min_tier floor when policy is below", () => {
    expect(resolveEffectiveTier("haiku", "sonnet")).toEqual({ tier: "sonnet", min_tier_applied: true });
  });
  it("no override when policy_tier equals min_tier", () => {
    expect(resolveEffectiveTier("sonnet", "sonnet")).toEqual({ tier: "sonnet", min_tier_applied: false });
  });
  it("opus floor cannot be overridden by haiku policy", () => {
    expect(resolveEffectiveTier("haiku", "opus")).toEqual({ tier: "opus", min_tier_applied: true });
  });
});
