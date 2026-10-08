import { z } from "zod";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { assistantRouter } from "./routers/assistant";
import { careerRouter } from "./routers/career";
import { profileRouter } from "./routers/profile";
import { resumeRouter } from "./routers/resume";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(z.object({ username: z.string() })).mutation(async ({ input, ctx }) => {
      // Create a mock user session cookie
      const sessionToken = await sdk.createSessionToken(`mock-dev-user-${input.username}`, {
        name: input.username,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  career: careerRouter,
  assistant: assistantRouter,
  admin: adminRouter,
  resume: resumeRouter,
});

export type AppRouter = typeof appRouter;
