import { describe, expect, it } from "vitest";
import { adminRouter } from "./admin";
import type { TrpcContext } from "../_core/context";

function contextWithRole(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 1, openId: "sample-user", name: "Sample User", email: "sample@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin router authorization", () => {
  it("rejects a student before an administrator query reaches the database", async () => {
    const caller = adminRouter.createCaller(contextWithRole("user"));
    await expect(caller.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
