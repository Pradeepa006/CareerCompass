import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Ignored, fallback below
  }

  // If authenticateRequest fails or returns null, check for local session token
  if (!user && process.env.NODE_ENV === "development") {
    const cookies = opts.req.headers.cookie ? parseCookie(opts.req.headers.cookie) : {};
    const token = cookies[COOKIE_NAME];

    if (token) {
      const session = await sdk.verifySession(token);
      if (session) {
        user = {
          id: 1,
          openId: session.openId,
          name: session.name || "Local User",
          email: "dev@example.com",
          loginMethod: "local",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
