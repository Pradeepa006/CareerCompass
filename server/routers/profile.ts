import { z } from "zod";
import { addCertification, addExperience, addProfileProject, getProfileBundle, replaceStudentSkills, saveProfile } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const profileInput = z.object({
  educationLevel: z.string().max(80).optional(),
  degree: z.string().max(160).optional(),
  institution: z.string().max(200).optional(),
  graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
  bio: z.string().max(1200).optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(12),
  preferredDomains: z.array(z.string().trim().min(1).max(80)).max(8),
  workPreference: z.string().max(80).optional(),
  careerGoal: z.string().max(500).optional(),
});

function completion(bundle: Awaited<ReturnType<typeof getProfileBundle>>) {
  const profile = bundle.profile;
  const values = [profile?.educationLevel, profile?.degree, profile?.institution, profile?.interests.length, bundle.skills.length, bundle.projects.length, bundle.certifications.length, bundle.experiences.length, profile?.careerGoal];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const bundle = await getProfileBundle(ctx.user.id);
    return { ...bundle, completion: completion(bundle) };
  }),
  save: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const bundle = await saveProfile(ctx.user.id, input);
    return { ...bundle, completion: completion(bundle) };
  }),
  replaceSkills: protectedProcedure.input(z.array(z.object({ skillId: z.number().int().positive(), proficiency: z.number().int().min(1).max(5) })).max(30)).mutation(async ({ ctx, input }) => {
    const bundle = await replaceStudentSkills(ctx.user.id, input);
    return { ...bundle, completion: completion(bundle) };
  }),
  addProject: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(160), description: z.string().max(1000).optional(), url: z.string().url().max(500).optional().or(z.literal("")) })).mutation(async ({ ctx, input }) => {
    const bundle = await addProfileProject(ctx.user.id, input);
    return { ...bundle, completion: completion(bundle) };
  }),
  addCertification: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), issuer: z.string().max(160).optional(), year: z.number().int().min(1950).max(2100).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const bundle = await addCertification(ctx.user.id, input);
    return { ...bundle, completion: completion(bundle) };
  }),
  addExperience: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(160), organization: z.string().max(160).optional(), description: z.string().max(1000).optional(), durationMonths: z.number().int().min(0).max(600) })).mutation(async ({ ctx, input }) => {
    const bundle = await addExperience(ctx.user.id, input);
    return { ...bundle, completion: completion(bundle) };
  }),
});
