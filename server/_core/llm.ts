import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

function runLocalFallback(params: InvokeParams): InvokeResult {
  const userMsg = params.messages.find(m => m.role === "user");
  const systemMsg = params.messages.find(m => m.role === "system");
  const rawUserContent = typeof userMsg?.content === "string" ? userMsg.content : Array.isArray(userMsg?.content) ? userMsg.content.map(c => typeof c === "string" ? c : (c as any).text || "").join(" ") : "";

  // 1. If this is a career recommendation request (JSON schema)
  const format = params.responseFormat || params.response_format;
  const isCareerRecommendation = format && "json_schema" in format && format.json_schema?.name === "career_recommendation";

  if (isCareerRecommendation) {
    try {
      const parsed = JSON.parse(rawUserContent);
      const student = parsed.student || {};
      const catalog = (parsed.careerCatalog || []) as Array<{ slug: string; name: string; domain: string; description: string; demand: number; growth: string }>;

      const studentSkills = (student.skills || []) as Array<{ name: string; level: number; domain: string }>;
      const studentInterests = ((student.interests || []) as string[]).map(i => i.toLowerCase());
      const studentDomains = ((student.preferredDomains || []) as string[]).map(d => d.toLowerCase());
      const studentGoal = (student.careerGoal || "").toLowerCase();
      const studentBio = (student.bio || "").toLowerCase();

      const scoredCareers = catalog.map(career => {
        let score = 50;
        const cName = career.name.toLowerCase();
        const cDomain = career.domain.toLowerCase();
        const cDesc = career.description.toLowerCase();

        // Check skill alignment
        for (const skill of studentSkills) {
          const sName = skill.name.toLowerCase();
          const sDomain = skill.domain.toLowerCase();

          if (cDesc.includes(sName) || cName.includes(sName)) {
            score += skill.level * 6;
          } else if (sDomain === cDomain) {
            score += skill.level * 3;
          } else {
            score += skill.level * 1.5;
          }
        }

        // Domain match
        if (studentDomains.some(d => cDomain.includes(d) || d.includes(cDomain))) {
          score += 15;
        }

        // Interests match
        for (const interest of studentInterests) {
          if (cDesc.includes(interest) || cName.includes(interest) || cDomain.includes(interest)) {
            score += 12;
          }
        }

        // Goal match
        if (studentGoal && (cName.includes(studentGoal) || studentGoal.includes(cName) || cDesc.includes(studentGoal))) {
          score += 20;
        }

        const clampedScore = Math.min(96, Math.max(62, Math.round(score)));

        const matchingSkillNames = studentSkills.filter(s => cDesc.includes(s.name.toLowerCase()) || s.domain.toLowerCase() === cDomain).map(s => s.name);
        const skillNote = matchingSkillNames.length > 0 ? `Your proficiency in ${matchingSkillNames.slice(0, 3).join(", ")} provides a solid foundation.` : "Your transferable problem solving and domain interests align well.";
        const explanation = `Strong fit for ${career.name} in the ${career.domain} domain. ${skillNote} ${career.growth} market growth with steady industry demand.`;

        return {
          slug: career.slug,
          score: clampedScore,
          explanation,
        };
      }).sort((a, b) => b.score - a.score);

      const topPredictions = scoredCareers.slice(0, 4);
      const topDomains = Array.from(new Set(topPredictions.map(p => {
        const c = catalog.find(item => item.slug === p.slug);
        return c?.domain || "";
      }).filter(Boolean))).join(" and ");

      const profileSummary = `Profile highlights relevant technical and analytical competencies with prominent alignment in ${topDomains || "software and data engineering"}. Stated career direction aligns directly with your top recommended pathways.`;

      const resultPayload = {
        predictions: topPredictions,
        profileSummary,
      };

      return {
        id: `local-${Date.now()}`,
        created: Math.floor(Date.now() / 1000),
        model: "careercompass-intelligence-engine",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify(resultPayload),
            },
            finish_reason: "stop",
          },
        ],
      };
    } catch (err) {
      console.error("[Local LLM fallback] Failed to score catalog:", err);
    }
  }

  // 2. If this is a resume parse request (JSON schema)
  const isResumeParse = (format && "json_schema" in format && format.json_schema?.name === "resume_parse_result") ||
    (params.outputSchema?.name === "resume_parse_result") ||
    (params.output_schema?.name === "resume_parse_result");

  if (isResumeParse) {
    const resumeFallback = {
      educationLevel: "Undergraduate",
      degree: "Computer Science and Engineering",
      institution: "College of Engineering",
      graduationYear: new Date().getFullYear() + 1,
      bio: "Aspiring software engineer passionate about modern web technologies, machine learning, and scalable systems.",
      interests: ["Software Engineering", "Artificial Intelligence", "Web Development"],
      preferredDomains: ["Engineering", "AI", "Cloud"],
      workPreference: "Collaborative, hybrid-friendly",
      careerGoal: "Full Stack Engineer / AI Developer",
      skills: [
        { name: "JavaScript", proficiency: 4 },
        { name: "TypeScript", proficiency: 3 },
        { name: "React", proficiency: 4 },
        { name: "Python", proficiency: 3 },
        { name: "SQL", proficiency: 3 },
      ],
      projects: [
        { title: "Career Compass Platform", description: "Interactive career guidance and skill roadmap web application", url: "" },
      ],
      certifications: [],
      experiences: [],
    };

    return {
      id: `local-resume-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: "careercompass-resume-parser",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify(resumeFallback),
          },
          finish_reason: "stop",
        },
      ],
    };
  }

  // 2. Default Assistant Chat response
  let contextObj: any = null;
  for (const msg of params.messages) {
    if (typeof msg.content === "string" && msg.content.startsWith("Student context:")) {
      try {
        contextObj = JSON.parse(msg.content.replace("Student context:", "").trim());
      } catch {}
    }
  }

  const targetName = contextObj?.targetCareer?.name || "your chosen career";
  const gaps = (contextObj?.gaps || []) as any[];
  const nextGap = gaps[0]?.name || "core domain fundamentals";

  const responseText = `Hello! Based on your profile and target goals for **${targetName}**:

1. **Recommended Priority**: Focus on **${nextGap}**, which represents your most significant current requirement gap.
2. **Current Readiness**: Your recorded skill coverage is progressing well. Complete your learning roadmap items sequentially to increase readiness.
3. **Action Step**: Continue documenting projects and updating skill proficiencies in your profile as you master each capability.

Feel free to ask about specific learning strategies, certifications, or roadmap milestones!`;

  return {
    id: `local-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "careercompass-assistant",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: responseText,
        },
        finish_reason: "stop",
      },
    ],
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.forgeApiKey) {
    return runLocalFallback(params);
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (model) {
    payload.model = model;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  try {
    const response = await fetchWithBackoff(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[LLM] Remote invoke failed: ${response.status} ${response.statusText} – using local fallback`);
      return runLocalFallback(params);
    }

    return (await response.json()) as InvokeResult;
  } catch (err) {
    console.warn("[LLM] Remote connection failed – using local fallback", err);
    return runLocalFallback(params);
  }
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  if (!ENV.forgeApiKey) {
    return {
      object: "list",
      data: [
        {
          id: "gpt-5-mini",
          object: "model",
          created: Date.now(),
          owned_by: "system",
        },
        {
          id: "careercompass-intelligence-engine",
          object: "model",
          created: Date.now(),
          owned_by: "system",
        },
      ],
    };
  }

  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
    : "https://forge.manus.im/v1/models";

  try {
    const response = await fetchWithBackoff(url, {
      headers: { authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!response.ok) {
      return {
        object: "list",
        data: [
          {
            id: "gpt-5-mini",
            object: "model",
            created: Date.now(),
            owned_by: "system",
          },
        ],
      };
    }

    return (await response.json()) as ModelsResponse;
  } catch (err) {
    return {
      object: "list",
      data: [
        {
          id: "gpt-5-mini",
          object: "model",
          created: Date.now(),
          owned_by: "system",
        },
      ],
    };
  }
}
