import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { listLLMModels, invokeLLM } from "../_core/llm";
import { ensureCatalogSeeded } from "../catalog";
import { analyzeSkillGaps, calculateReadiness } from "../careerEngine";
import { getActiveRoadmap, getCareer, getCareerRequirements, getCatalog, getLatestCareerPrediction, getProfileBundle, getRoadmapSkillGraph, saveCareerPrediction, setTargetCareer, updateRoadmapItem } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const predictionSchema = z.object({
  predictions: z.array(z.object({ slug: z.string().min(1), score: z.number().min(0).max(100), explanation: z.string().min(20).max(500) })).min(3).max(5),
  profileSummary: z.string().min(20).max(500),
});

function profileForAnalysis(bundle: Awaited<ReturnType<typeof getProfileBundle>>) {
  const safeSkills = (bundle.skills || []).filter((s): s is NonNullable<typeof s> => Boolean(s));
  return {
    education: [bundle.profile?.educationLevel, bundle.profile?.degree, bundle.profile?.institution].filter(Boolean).join(" · ") || "Not provided",
    interests: bundle.profile?.interests ?? [],
    preferredDomains: bundle.profile?.preferredDomains ?? [],
    careerGoal: bundle.profile?.careerGoal ?? "Not provided",
    skills: safeSkills.map(skill => ({ name: skill.name, level: skill.proficiency, domain: skill.domain })),
    projects: (bundle.projects || []).map(project => project.title),
    certifications: (bundle.certifications || []).map(item => item.name),
    experience: (bundle.experiences || []).map(item => ({ title: item.title, months: item.durationMonths })),
  };
}

async function getAnalysisModel() {
  const { data } = await listLLMModels();
  return data.find(model => model.id === "gpt-5-mini")?.id ?? data.find(model => model.id.startsWith("gpt-"))?.id ?? data[0]?.id;
}

async function buildCareerSnapshot(userId: number, careerId: number) {
  const [career, requirements, profile, roadmap] = await Promise.all([getCareer(careerId), getCareerRequirements(careerId), getProfileBundle(userId), getActiveRoadmap(userId)]);
  if (!career) throw new TRPCError({ code: "NOT_FOUND", message: "That career is no longer available." });
  const gaps = analyzeSkillGaps(profile.skills, requirements);
  const relevantItems = roadmap?.careerId === careerId ? roadmap.items : [];
  return { career, requirements, gaps, readiness: calculateReadiness(requirements, gaps, relevantItems), roadmap: roadmap?.careerId === careerId ? roadmap : null };
}

export const careerRouter = router({
  catalog: publicProcedure.query(async () => { await ensureCatalogSeeded(); return getCatalog(); }),
  latestAnalysis: protectedProcedure.query(async ({ ctx }) => getLatestCareerPrediction(ctx.user.id)),
  analyze: protectedProcedure.mutation(async ({ ctx }) => {
    await ensureCatalogSeeded();
    const [profile, catalog] = await Promise.all([getProfileBundle(ctx.user.id), getCatalog()]);
    if (!profile.skills.length && !(profile.profile?.interests.length)) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one skill or interest before requesting career analysis." });
    const model = await getAnalysisModel();
    if (!model) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Career analysis is temporarily unavailable because no analysis model is configured." });
    try {
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "You are CareerCompass, a careful career-guidance assistant. Assess fit only against the supplied curated career catalog. A score is a suitability estimate for this profile, not a prediction or guarantee of career success. Return between 3 and 5 different career recommendations, balance transferable skills with stated interests, and do not invent qualifications." },
          { role: "user", content: JSON.stringify({ student: profileForAnalysis(profile), careerCatalog: catalog.careers.map(item => ({ slug: item.slug, name: item.name, domain: item.domain, description: item.description, demand: item.demand, growth: item.growthIndicator })) }) },
        ],
        response_format: { type: "json_schema", json_schema: { name: "career_recommendation", strict: true, schema: { type: "object", properties: { predictions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { slug: { type: "string" }, score: { type: "number" }, explanation: { type: "string" } }, required: ["slug", "score", "explanation"], additionalProperties: false } }, profileSummary: { type: "string" } }, required: ["predictions", "profileSummary"], additionalProperties: false } } },
      });
      const content = response.choices[0]?.message.content;
      const parsed = predictionSchema.parse(JSON.parse(typeof content === "string" ? content : "{}"));
      const careersBySlug = new Map(catalog.careers.map(career => [career.slug, career]));
      const results = parsed.predictions.flatMap(prediction => {
        const career = careersBySlug.get(prediction.slug);
        return career ? [{ ...prediction, careerId: career.id, careerName: career.name, domain: career.domain, growthIndicator: career.growthIndicator, score: Math.round(prediction.score) }] : [];
      }).sort((a, b) => b.score - a.score);
      if (results.length < 3) throw new Error("The analysis response did not contain enough catalog careers.");
      await saveCareerPrediction(ctx.user.id, { profileSummary: parsed.profileSummary, predictions: results }, model);
      return { profileSummary: parsed.profileSummary, predictions: results, notice: "Suitability scores estimate alignment with the provided profile and curated catalog; they are not guarantees of career outcomes." };
    } catch (error) {
      console.error("[Career analysis] LLM request failed", error);
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Career analysis is temporarily unavailable. Your profile was not changed; please try again shortly." });
    }
  }),
  details: protectedProcedure.input(z.object({ careerId: z.number().int().positive() })).query(({ ctx, input }) => buildCareerSnapshot(ctx.user.id, input.careerId)),
  selectTarget: protectedProcedure.input(z.object({ careerId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await ensureCatalogSeeded();
    const career = await getCareer(input.careerId);
    if (!career) throw new TRPCError({ code: "NOT_FOUND", message: "That target career is no longer available." });
    await setTargetCareer(ctx.user.id, input.careerId);
    return buildCareerSnapshot(ctx.user.id, input.careerId);
  }),
  roadmap: protectedProcedure.query(async ({ ctx }) => {
    const roadmap = await getActiveRoadmap(ctx.user.id);
    if (!roadmap) return null;
    return buildCareerSnapshot(ctx.user.id, roadmap.careerId);
  }),
  journey: protectedProcedure.query(async ({ ctx }) => {
    const roadmap = await getActiveRoadmap(ctx.user.id);
    if (!roadmap) return null;
    const snapshot = await buildCareerSnapshot(ctx.user.id, roadmap.careerId);
    const graph = await getRoadmapSkillGraph(roadmap.id);
    return { ...snapshot, graph };
  }),
  analytics: protectedProcedure.query(async ({ ctx }) => {
    const [profile, roadmap] = await Promise.all([getProfileBundle(ctx.user.id), getActiveRoadmap(ctx.user.id)]);
    const safeSkills = (profile.skills || []).filter((s): s is NonNullable<typeof s> => Boolean(s));
    if (!roadmap) return { profile, roadmap: null, readiness: null, gaps: [], skillDistribution: safeSkills.map(skill => ({ name: skill.name, level: skill.proficiency, domain: skill.domain, demand: skill.demand })), progress: [] };
    const snapshot = await buildCareerSnapshot(ctx.user.id, roadmap.careerId);
    return { profile, roadmap, readiness: snapshot.readiness, gaps: snapshot.gaps, skillDistribution: safeSkills.map(skill => ({ name: skill.name, level: skill.proficiency, domain: skill.domain, demand: skill.demand })), progress: (roadmap.items || []).map((item: any) => ({ name: item.skillName, status: item.status, position: item.position })) };
  }),
  updateProgress: protectedProcedure.input(z.object({ roadmapItemId: z.number().int().positive(), status: z.enum(["not_started", "in_progress", "completed"]) })).mutation(async ({ ctx, input }) => {
    const roadmap = await updateRoadmapItem(ctx.user.id, input.roadmapItemId, input.status);
    if (!roadmap) throw new TRPCError({ code: "NOT_FOUND", message: "No active roadmap was found." });
    return buildCareerSnapshot(ctx.user.id, roadmap.careerId);
  }),
});
