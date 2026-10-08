import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { careerSkills, careers, industryTrends, skills } from "../../drizzle/schema";
import { ensureCatalogSeeded } from "../catalog";
import { getCatalog, getDb, getRegisteredUsers } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  return next({ ctx });
});

const skillInput = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(90).regex(/^[a-z0-9-]+$/), domain: z.string().trim().min(2).max(80), difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]), demand: z.number().int().min(1).max(5), trending: z.boolean(), description: z.string().max(800).optional() });
const careerInput = z.object({ name: z.string().trim().min(2).max(140), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/), domain: z.string().trim().min(2).max(80), description: z.string().trim().min(20).max(1200), growthIndicator: z.enum(["Moderate", "Strong", "High"]), demand: z.number().int().min(1).max(5) });

export const adminRouter = router({
  overview: adminProcedure.query(async () => {
    await ensureCatalogSeeded();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." });
    const [catalog, registeredUsers, mappings] = await Promise.all([
      getCatalog(),
      getRegisteredUsers(),
      db.select({ id: careerSkills.id, careerId: careers.id, careerName: careers.name, skillId: skills.id, skillName: skills.name, requirementType: careerSkills.requirementType, importance: careerSkills.importance, minimumProficiency: careerSkills.minimumProficiency, learningOrder: careerSkills.learningOrder }).from(careerSkills).innerJoin(careers, eq(careerSkills.careerId, careers.id)).innerJoin(skills, eq(careerSkills.skillId, skills.id)),
    ]);
    return { ...catalog, users: registeredUsers, mappings };
  }),
  createSkill: adminProcedure.input(skillInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." }); await db.insert(skills).values({ ...input, description: input.description || null }); return getCatalog(); }),
  updateSkill: adminProcedure.input(skillInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." }); const { id, ...values } = input; await db.update(skills).set({ ...values, description: values.description || null }).where(eq(skills.id, id)); return getCatalog(); }),
  createCareer: adminProcedure.input(careerInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." }); await db.insert(careers).values(input); return getCatalog(); }),
  updateCareer: adminProcedure.input(careerInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." }); const { id, ...values } = input; await db.update(careers).set(values).where(eq(careers.id, id)); return getCatalog(); }),
  saveMapping: adminProcedure.input(z.object({ careerId: z.number().int().positive(), skillId: z.number().int().positive(), requirementType: z.enum(["required", "preferred"]), importance: z.number().int().min(1).max(5), minimumProficiency: z.number().int().min(1).max(5), learningOrder: z.number().int().min(1).max(30) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." });
    await db.insert(careerSkills).values(input).onDuplicateKeyUpdate({ set: { requirementType: input.requirementType, importance: input.importance, minimumProficiency: input.minimumProficiency, learningOrder: input.learningOrder } });
    return input;
  }),
  deleteMapping: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." });
    await db.delete(careerSkills).where(eq(careerSkills.id, input.id));
    return { success: true };
  }),
  updateTrend: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(2).max(160), summary: z.string().min(10).max(1000), relatedDomain: z.string().min(2).max(80), impact: z.enum(["Low", "Medium", "High"]), active: z.boolean() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is unavailable." }); const { id, ...values } = input; await db.update(industryTrends).set(values).where(eq(industryTrends.id, id)); return getCatalog(); }),
});
