import { describe, expect, it } from "vitest";
import { analyzeSkillGaps, buildPrerequisiteSequence, calculateReadiness } from "./careerEngine";

const requirements = [
  { skillId: 1, slug: "python", name: "Python", demand: 5, trending: true, importance: 5, minimumProficiency: 3, requirementType: "required" as const, learningOrder: 1, description: "A core programming skill." },
  { skillId: 2, slug: "communication", name: "Communication", demand: 4, trending: false, importance: 2, minimumProficiency: 2, requirementType: "required" as const, learningOrder: 2, description: "A supporting professional skill." },
  { skillId: 3, slug: "aws", name: "AWS", demand: 5, trending: false, importance: 3, minimumProficiency: 2, requirementType: "preferred" as const, learningOrder: 3, description: "A preferred cloud skill." },
];

describe("career engine", () => {
  it("finds only required skills below the configured proficiency and orders them by deterministic priority", () => {
    const gaps = analyzeSkillGaps([{ skillId: 2, slug: "communication", name: "Communication", proficiency: 1 }], requirements);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toMatchObject({ skillId: 1, priority: "High", currentLevel: 0, requiredLevel: 3 });
    expect(gaps[1]).toMatchObject({ skillId: 2, priority: "Medium", currentLevel: 1, requiredLevel: 2 });
    expect(gaps.map(gap => gap.skillId)).not.toContain(3);
    expect(gaps[0]?.explanation).toContain("core requirement");
  });

  it("calculates readiness from weighted skill coverage and persisted roadmap status", () => {
    const gaps = analyzeSkillGaps([{ skillId: 1, slug: "python", name: "Python", proficiency: 3 }, { skillId: 2, slug: "communication", name: "Communication", proficiency: 2 }], requirements);
    const readiness = calculateReadiness(requirements, gaps, [{ status: "completed" as const }, { status: "in_progress" as const }]);
    expect(readiness).toEqual({ skillCoverage: 100, roadmapCompletion: 50, score: 85 });
  });

  it("places unstarted prerequisites before dependent roadmap skills", () => {
    const ordered = buildPrerequisiteSequence([30], [{ skillId: 30, prerequisiteSkillId: 20 }, { skillId: 20, prerequisiteSkillId: 10 }], new Set());
    expect(ordered).toEqual([10, 20, 30]);
    expect(buildPrerequisiteSequence([30], [{ skillId: 30, prerequisiteSkillId: 20 }], new Set([20]))).toEqual([30]);
  });
});
