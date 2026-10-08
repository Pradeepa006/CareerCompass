import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { ensureCatalogSeeded } from "../catalog";
import { analyzeSkillGaps } from "../careerEngine";
import { getActiveRoadmap, getCareerRequirements, getCatalog, getProfileBundle } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1400) });

async function chooseAssistantModel() {
  const { data } = await listLLMModels();
  return data.find(model => model.id === "gpt-5-mini")?.id ?? data.find(model => model.id.startsWith("gpt-"))?.id ?? data[0]?.id;
}

export const assistantRouter = router({
  respond: protectedProcedure.input(z.object({ messages: z.array(messageSchema).min(1).max(8) })).mutation(async ({ ctx, input }) => {
    await ensureCatalogSeeded();
    const [profile, roadmap, catalog] = await Promise.all([getProfileBundle(ctx.user.id), getActiveRoadmap(ctx.user.id), getCatalog()]);
    const requirements = profile.target ? await getCareerRequirements(profile.target.careerId) : [];
    const gaps = requirements.length ? analyzeSkillGaps(profile.skills, requirements).slice(0, 6) : [];
    const model = await chooseAssistantModel();
    if (!model) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "CareerCompass AI is temporarily unavailable because no assistant model is configured." });
    const context = {
      profile: {
        education: [profile.profile?.educationLevel, profile.profile?.degree].filter(Boolean).join(" · ") || "Not supplied",
        interests: profile.profile?.interests ?? [],
        careerGoal: profile.profile?.careerGoal ?? "Not supplied",
        skills: profile.skills.map(skill => ({ name: skill.name, level: skill.proficiency })),
        projectCount: profile.projects.length,
        certificationCount: profile.certifications.length,
        experienceMonths: profile.experiences.reduce((total, item) => total + item.durationMonths, 0),
      },
      targetCareer: profile.target ? { name: profile.target.name, domain: profile.target.domain, demand: profile.target.demand, growth: profile.target.growthIndicator } : null,
      gaps: gaps.map(gap => ({ name: gap.name, currentLevel: gap.currentLevel, requiredLevel: gap.requiredLevel, priority: gap.priority, demand: gap.demand, reason: gap.explanation })),
      roadmap: roadmap ? { itemCount: roadmap.items.length, completed: roadmap.items.filter(item => item.status === "completed").length, next: roadmap.items.find(item => item.status !== "completed")?.skillName ?? null } : null,
      curatedTrends: catalog.trends.slice(0, 4).map(trend => ({ title: trend.title, domain: trend.relatedDomain, impact: trend.impact })),
    };
    try {
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "You are CareerCompass AI, a concise and supportive student career assistant. Use only the supplied private student context and curated catalog indicators. Explain whether a statement is based on the student's profile, deterministic application logic, curated indicators, or general guidance. Do not claim real-time labour data, access to job listings, or guarantee a career outcome. Never expose emails, identifiers, or private records. If the student has no target career, invite them to choose one. Give practical next steps in short Markdown, without excessive headings." },
          { role: "system", content: `Student context: ${JSON.stringify(context)}` },
          ...input.messages,
        ],
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Empty assistant response");
      return { content: content.trim(), notice: "CareerCompass AI uses your current profile, target, roadmap and curated indicators. It does not guarantee career outcomes." };
    } catch (error) {
      console.error("[Career assistant] LLM request failed", error);
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "CareerCompass AI is temporarily unavailable. Please try again shortly." });
    }
  }),
});
