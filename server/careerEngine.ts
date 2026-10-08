export type StudentSkillInput = { skillId: number; slug: string; name: string; proficiency: number };
export type CareerRequirementInput = { skillId: number; slug: string; name: string; demand: number; trending: boolean; importance: number; minimumProficiency: number; requirementType: "required" | "preferred"; learningOrder: number; description: string | null };

export type GapResult = {
  skillId: number;
  slug: string;
  name: string;
  requiredLevel: number;
  currentLevel: number;
  priority: "High" | "Medium" | "Low";
  priorityScore: number;
  demand: number;
  explanation: string;
  learningOrder: number;
  description: string | null;
};

export function analyzeSkillGaps(studentSkills: StudentSkillInput[], requirements: CareerRequirementInput[]): GapResult[] {
  const learnerSkills = new Map(studentSkills.map(skill => [skill.skillId, skill]));
  return requirements
    .filter(requirement => requirement.requirementType === "required")
    .flatMap(requirement => {
      const current = learnerSkills.get(requirement.skillId)?.proficiency ?? 0;
      if (current >= requirement.minimumProficiency) return [];
      const deficiency = requirement.minimumProficiency - current;
      const priorityScore = requirement.importance * 16 + requirement.demand * 6 + deficiency * 6 + (requirement.trending ? 5 : 0);
      const priority: GapResult["priority"] = priorityScore >= 108 ? "High" : priorityScore >= 60 ? "Medium" : "Low";
      const reasons = [
        `It is a ${requirement.importance >= 4 ? "core" : "supporting"} requirement for this career`,
        `the catalog records ${requirement.demand >= 4 ? "high" : "moderate"} industry demand`,
        current === 0 ? "you have not yet added this skill to your profile" : `your current level (${current}/5) is below the expected level (${requirement.minimumProficiency}/5)`,
      ];
      if (requirement.trending) reasons.push("it is marked as an emerging skill");
      return [{ skillId: requirement.skillId, slug: requirement.slug, name: requirement.name, requiredLevel: requirement.minimumProficiency, currentLevel: current, priority, priorityScore, demand: requirement.demand, explanation: reasons.join("; ") + ".", learningOrder: requirement.learningOrder, description: requirement.description }];
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.learningOrder - b.learningOrder);
}

export function calculateReadiness(requirements: CareerRequirementInput[], gaps: GapResult[], roadmapItems: Array<{ status: "not_started" | "in_progress" | "completed" }>) {
  const required = requirements.filter(item => item.requirementType === "required");
  const totalWeight = required.reduce((sum, item) => sum + item.importance, 0) || 1;
  const gapIds = new Set(gaps.map(gap => gap.skillId));
  const matchedWeight = required.filter(item => !gapIds.has(item.skillId)).reduce((sum, item) => sum + item.importance, 0);
  const skillCoverage = Math.round((matchedWeight / totalWeight) * 100);
  const completion = roadmapItems.length ? Math.round((roadmapItems.filter(item => item.status === "completed").length / roadmapItems.length) * 100) : 0;
  return { skillCoverage, roadmapCompletion: completion, score: Math.round(skillCoverage * 0.7 + completion * 0.3) };
}

export function buildPrerequisiteSequence(targetSkillIds: number[], edges: Array<{ skillId: number; prerequisiteSkillId: number }>, alreadyStartedSkillIds: Set<number>) {
  const dependencies = new Map<number, number[]>();
  edges.forEach(edge => dependencies.set(edge.skillId, [...(dependencies.get(edge.skillId) ?? []), edge.prerequisiteSkillId]));
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const ordered: number[] = [];
  const visit = (skillId: number) => {
    if (visited.has(skillId) || alreadyStartedSkillIds.has(skillId)) return;
    if (visiting.has(skillId)) return;
    visiting.add(skillId);
    (dependencies.get(skillId) ?? []).forEach(visit);
    visiting.delete(skillId);
    visited.add(skillId);
    ordered.push(skillId);
  };
  targetSkillIds.forEach(visit);
  return ordered;
}
