import { afterEach, describe, expect, it } from "vitest";
import { claimOAuthRedirect, resetOAuthRedirectGuard } from "./authRedirectGuard";

afterEach(resetOAuthRedirectGuard);

describe("OAuth redirect guard", () => {
  it("allows one login navigation while rejecting concurrent duplicate claims", () => {
    expect(claimOAuthRedirect()).toBe(true);
    expect(claimOAuthRedirect()).toBe(false);
    expect(claimOAuthRedirect()).toBe(false);
  });

  it("allows a new document lifecycle to claim a redirect", () => {
    expect(claimOAuthRedirect()).toBe(true);
    resetOAuthRedirectGuard();
    expect(claimOAuthRedirect()).toBe(true);
  });
});
