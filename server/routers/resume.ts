import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { skillSeeds } from "../catalog";

const CATALOG_SKILL_NAMES = skillSeeds.map(s => s.name);

const resumeParseSchema = {
  name: "resume_parse_result",
  schema: {
    type: "object",
    properties: {
      educationLevel: {
        type: "string",
        enum: ["Undergraduate", "Postgraduate", "Diploma", "Self-directed learning", ""],
        description: "Highest level of education found in the resume",
      },
      degree: { type: "string", description: "Degree name or program, e.g. B.Tech Computer Science" },
      institution: { type: "string", description: "University or college name" },
      graduationYear: { type: ["number", "null"], description: "Graduation year as an integer, or null if unknown" },
      bio: { type: "string", description: "A concise 2-3 sentence professional summary derived from the resume" },
      interests: {
        type: "array",
        items: { type: "string" },
        maxItems: 8,
        description: "Key professional interests extracted from the resume",
      },
      preferredDomains: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
        description: "Domains like Engineering, AI, Data, Product, Cloud, Security, etc.",
      },
      workPreference: { type: "string", description: "Work preference like Remote, Hybrid, On-site, Collaborative" },
      careerGoal: { type: "string", description: "Inferred career goal based on resume content" },
      skills: {
        type: "array",
        description: "Skills matched to the catalog. Only include skills present in the provided catalog list.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact skill name from the catalog" },
            proficiency: {
              type: "number",
              description: "Proficiency level 1 (beginner) to 5 (advanced)",
            },
          },
          required: ["name", "proficiency"],
          additionalProperties: false,
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
          },
          required: ["title", "description"],
          additionalProperties: false,
        },
      },
      certifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            issuer: { type: "string" },
            year: { type: ["number", "null"] },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
      experiences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            organization: { type: "string" },
            durationMonths: { type: "number" },
          },
          required: ["title", "organization", "durationMonths"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "educationLevel", "degree", "institution", "graduationYear", "bio",
      "interests", "preferredDomains", "workPreference", "careerGoal",
      "skills", "projects", "certifications", "experiences",
    ],
    additionalProperties: false,
  },
  strict: true,
};

export const resumeRouter = router({
  parse: protectedProcedure
    .input(
      z.object({
        /** Base64-encoded file contents */
        fileBase64: z.string().max(4_000_000),
        mimeType: z.enum(["application/pdf", "text/plain"]),
        fileName: z.string().max(260),
      })
    )
    .mutation(async ({ input }) => {
      const { fileBase64, mimeType, fileName } = input;

      const catalogList = CATALOG_SKILL_NAMES.map((n, i) => `${i + 1}. ${n}`).join("\n");

      const systemPrompt = `You are a professional resume parser for a career guidance platform.
Extract structured profile information from the provided resume.

When matching skills, ONLY use skill names from the following catalog (match as many as apply):
${catalogList}

For proficiency levels:
1 = Beginner / foundational exposure
2 = Basic working knowledge
3 = Intermediate, used in projects
4 = Proficient, used professionally
5 = Advanced / expert

Return JSON strictly matching the schema. Use empty strings for missing text fields, empty arrays for missing lists, and null for missing numeric fields.`;

      const userContent: Array<{ type: string; [key: string]: unknown }> = [
        {
          type: "text",
          text: `Parse the following resume file "${fileName}" and extract all profile information.`,
        },
      ];

      if (mimeType === "application/pdf") {
        userContent.push({
          type: "file_url",
          file_url: {
            url: `data:application/pdf;base64,${fileBase64}`,
            mime_type: "application/pdf",
          },
        });
      } else {
        // Plain text: decode and embed as text
        const decoded = Buffer.from(fileBase64, "base64").toString("utf-8");
        userContent.push({ type: "text", text: decoded });
      }

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent as never },
        ],
        outputSchema: resumeParseSchema,
        maxTokens: 2000,
      });

      const raw = result.choices[0]?.message?.content;
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      return JSON.parse(text) as {
        educationLevel: string;
        degree: string;
        institution: string;
        graduationYear: number | null;
        bio: string;
        interests: string[];
        preferredDomains: string[];
        workPreference: string;
        careerGoal: string;
        skills: Array<{ name: string; proficiency: number }>;
        projects: Array<{ title: string; description: string; url?: string }>;
        certifications: Array<{ name: string; issuer?: string; year?: number | null }>;
        experiences: Array<{ title: string; organization: string; durationMonths: number }>;
      };
    }),
});
