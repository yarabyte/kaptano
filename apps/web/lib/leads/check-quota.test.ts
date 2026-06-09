import { describe, it, expect } from "vitest";
import { effectivePlanTier } from "@/lib/leads/check-quota";

describe("effectivePlanTier", () => {
  const future = new Date(Date.now() + 86400000);
  const past = new Date(Date.now() - 86400000);

  it("returns FREE for FREE plan", () => {
    expect(effectivePlanTier("FREE", "ACTIVE", future)).toBe("FREE");
  });

  it("returns paid tier when active and not expired", () => {
    expect(effectivePlanTier("STARTER", "ACTIVE", future)).toBe("STARTER");
  });

  it("downgrades to FREE when subscription expired", () => {
    expect(effectivePlanTier("GROWTH", "ACTIVE", past)).toBe("FREE");
  });

  it("downgrades to FREE when PAST_DUE", () => {
    expect(effectivePlanTier("SCALE", "PAST_DUE", future)).toBe("FREE");
  });

  it("downgrades to FREE when CANCELED", () => {
    expect(effectivePlanTier("STARTER", "CANCELED", future)).toBe("FREE");
  });
});
