import { count, eq } from "drizzle-orm";
import { getDb } from "./db";
import { careerSkills, careers, industryTrends, skillPrerequisites, skills } from "../drizzle/schema";

type SkillSeed = { slug: string; name: string; domain: string; difficulty: string; demand: number; trending: boolean; description: string };
type Requirement = { skill: string; type: "required" | "preferred"; importance: number; minimum: number; order: number };
type CareerSeed = { slug: string; name: string; domain: string; description: string; growth: string; demand: number; requirements: Requirement[] };

const rawSkillSeeds: Array<[string, string, string, string, number, boolean, string]> = [
  ["python","Python","Programming","Intermediate",5,true,"General-purpose language used across data, automation and backend work."],
  ["java","Java","Programming","Intermediate",4,false,"Object-oriented language common in enterprise applications."],
  ["javascript","JavaScript","Programming","Intermediate",5,false,"Core language for browser and full-stack applications."],
  ["typescript","TypeScript","Programming","Intermediate",5,true,"Typed JavaScript for scalable web development."],
  ["csharp","C#","Programming","Intermediate",3,false,"Object-oriented language for .NET applications."],
  ["cpp","C++","Programming","Advanced",3,false,"Systems programming language with performance focus."],
  ["sql","SQL","Data","Beginner",5,false,"Language for querying and managing relational data."],
  ["postgresql","PostgreSQL","Data","Intermediate",4,true,"Advanced open-source relational database."],
  ["mysql","MySQL","Data","Beginner",4,false,"Widely used relational database system."],
  ["mongodb","MongoDB","Data","Intermediate",3,false,"Document database for flexible data models."],
  ["data-modeling","Data Modeling","Data","Intermediate",4,false,"Designing reliable analytical and transactional data structures."],
  ["data-visualization","Data Visualization","Data","Intermediate",4,true,"Communicating insights through meaningful charts and dashboards."],
  ["excel","Excel","Data","Beginner",4,false,"Spreadsheet analysis and reporting fundamentals."],
  ["power-bi","Power BI","Data","Intermediate",4,false,"Business intelligence reporting and dashboard platform."],
  ["tableau","Tableau","Data","Intermediate",3,false,"Interactive visual analytics platform."],
  ["statistics","Statistics","Data Science","Intermediate",5,false,"Foundations for evidence-based data analysis."],
  ["pandas","pandas","Data Science","Intermediate",5,false,"Python library for structured data analysis."],
  ["numpy","NumPy","Data Science","Intermediate",5,false,"Python library for numerical computing."],
  ["scikit-learn","scikit-learn","Data Science","Advanced",5,false,"Python toolkit for classical machine learning."],
  ["machine-learning","Machine Learning","AI","Advanced",5,true,"Modeling patterns from data for predictions and decisions."],
  ["deep-learning","Deep Learning","AI","Advanced",5,true,"Neural-network methods for complex modeling tasks."],
  ["llm-applications","LLM Applications","AI","Advanced",5,true,"Building useful applications with large language models."],
  ["prompt-engineering","Prompt Engineering","AI","Intermediate",4,true,"Designing instructions and evaluations for language-model systems."],
  ["spring-boot","Spring Boot","Backend","Advanced",4,false,"Java framework for production web services."],
  ["nodejs","Node.js","Backend","Intermediate",5,false,"JavaScript runtime for server-side applications."],
  ["rest-api","REST APIs","Backend","Intermediate",5,false,"Designing interoperable HTTP application interfaces."],
  ["graphql","GraphQL","Backend","Advanced",3,true,"Query language for flexible service APIs."],
  ["authentication","Authentication","Security","Intermediate",5,false,"Secure identity, session and access-control patterns."],
  ["react","React","Frontend","Intermediate",5,false,"Component-based library for web interfaces."],
  ["nextjs","Next.js","Frontend","Advanced",5,true,"React framework for production web applications."],
  ["html-css","HTML & CSS","Frontend","Beginner",5,false,"Core technologies for accessible responsive interfaces."],
  ["ux-research","UX Research","Design","Intermediate",4,false,"Research methods for understanding user needs."],
  ["figma","Figma","Design","Beginner",4,false,"Collaborative interface design and prototyping tool."],
  ["accessibility","Accessibility","Design","Intermediate",5,true,"Inclusive design and development standards."],
  ["testing","Software Testing","Quality","Intermediate",5,false,"Unit, integration and end-to-end quality practices."],
  ["qa-automation","QA Automation","Quality","Advanced",4,false,"Automated verification of application behavior."],
  ["git","Git","Engineering","Beginner",5,false,"Version control for collaborative development."],
  ["docker","Docker","DevOps","Intermediate",5,false,"Containerizing applications for consistent delivery."],
  ["kubernetes","Kubernetes","DevOps","Advanced",4,true,"Orchestrating containerized workloads at scale."],
  ["ci-cd","CI/CD","DevOps","Intermediate",5,false,"Automating build, test and deployment pipelines."],
  ["linux","Linux","DevOps","Intermediate",4,false,"Command-line and server operating-system fundamentals."],
  ["aws","AWS","Cloud","Intermediate",5,false,"Cloud computing platform services."],
  ["azure","Azure","Cloud","Intermediate",4,false,"Microsoft cloud platform services."],
  ["gcp","Google Cloud","Cloud","Intermediate",4,false,"Google cloud platform services."],
  ["cloud","Cloud Fundamentals","Cloud","Beginner",5,false,"Core concepts for building and operating cloud-based services."],
  ["terraform","Terraform","Cloud","Advanced",4,true,"Infrastructure-as-code tool for repeatable cloud environments."],
  ["networking","Networking","Security","Intermediate",4,false,"Protocols, connectivity and network troubleshooting."],
  ["cybersecurity","Cybersecurity","Security","Intermediate",5,true,"Protecting systems, applications and information."],
  ["threat-modeling","Threat Modeling","Security","Advanced",4,true,"Systematically identifying and reducing security risks."],
  ["agile","Agile Delivery","Product","Beginner",4,false,"Iterative product and software delivery practices."],
  ["product-analytics","Product Analytics","Product","Intermediate",4,true,"Measuring behavior to improve digital products."],
  ["communication","Communication","Professional","Beginner",5,false,"Clear collaboration, documentation and stakeholder communication."],
  ["problem-solving","Problem Solving","Professional","Beginner",5,false,"Breaking down ambiguous problems into actionable work."],
  ["system-design","System Design","Engineering","Advanced",4,true,"Designing reliable and maintainable software systems."],
  ["data-engineering","Data Engineering","Data","Advanced",5,true,"Building reliable pipelines and data platforms."],
  ["etl","ETL","Data","Intermediate",4,false,"Extracting, transforming and loading data reliably."],
];

export const skillSeeds: SkillSeed[] = rawSkillSeeds.map(([slug, name, domain, difficulty, demand, trending, description]) => ({ slug, name, domain, difficulty, demand, trending, description }));

export const careerSeeds: CareerSeed[] = [
  { slug:"software-developer", name:"Software Developer", domain:"Engineering", description:"Builds reliable software applications across the development lifecycle.", growth:"Strong", demand:5, requirements:[r("python",5,3,1),r("javascript",5,3,1),r("git",5,2,1),r("testing",4,2,2),r("sql",3,2,2),r("communication",3,2,3,"preferred")] },
  { slug:"frontend-developer", name:"Frontend Developer", domain:"Engineering", description:"Creates accessible, responsive and engaging web interfaces.", growth:"Strong", demand:5, requirements:[r("html-css",5,3,1),r("javascript",5,3,1),r("react",5,3,2),r("typescript",4,2,2),r("accessibility",4,2,3),r("figma",2,1,3,"preferred")] },
  { slug:"backend-developer", name:"Backend Developer", domain:"Engineering", description:"Develops APIs, data access layers and secure server-side services.", growth:"Strong", demand:5, requirements:[r("java",5,3,1),r("spring-boot",5,3,2),r("sql",5,3,1),r("rest-api",5,3,2),r("authentication",4,2,3),r("docker",3,2,3,"preferred")] },
  { slug:"full-stack-developer", name:"Full Stack Developer", domain:"Engineering", description:"Builds cohesive user-facing and server-side product experiences.", growth:"Strong", demand:5, requirements:[r("html-css",5,3,1),r("javascript",5,3,1),r("react",5,3,2),r("nodejs",5,3,2),r("rest-api",4,2,3),r("sql",4,2,2),r("docker",2,1,3,"preferred")] },
  { slug:"data-analyst", name:"Data Analyst", domain:"Data", description:"Turns data into understandable insights to support decisions.", growth:"Strong", demand:5, requirements:[r("sql",5,3,1),r("excel",4,3,1),r("statistics",4,2,2),r("data-visualization",5,3,2),r("power-bi",4,2,3),r("communication",4,2,3,"preferred")] },
  { slug:"data-scientist", name:"Data Scientist", domain:"Data", description:"Uses statistical and machine-learning methods to solve data problems.", growth:"Strong", demand:5, requirements:[r("python",5,3,1),r("statistics",5,3,1),r("pandas",5,3,2),r("numpy",4,2,2),r("scikit-learn",5,3,3),r("data-visualization",3,2,3,"preferred")] },
  { slug:"machine-learning-engineer", name:"Machine Learning Engineer", domain:"AI", description:"Deploys reliable machine-learning systems and model-enabled products.", growth:"High", demand:5, requirements:[r("python",5,4,1),r("machine-learning",5,3,2),r("scikit-learn",4,3,2),r("data-engineering",4,2,3),r("docker",4,2,3),r("aws",3,2,4,"preferred")] },
  { slug:"ai-engineer", name:"AI Engineer", domain:"AI", description:"Builds applied AI systems, including LLM-enabled experiences.", growth:"High", demand:5, requirements:[r("python",5,3,1),r("machine-learning",5,3,2),r("llm-applications",5,2,3),r("prompt-engineering",4,2,3),r("rest-api",4,2,2),r("cloud",2,1,4,"preferred")] },
  { slug:"cloud-engineer", name:"Cloud Engineer", domain:"Cloud", description:"Designs and operates cloud infrastructure and services.", growth:"Strong", demand:5, requirements:[r("linux",5,3,1),r("networking",4,2,1),r("aws",5,3,2),r("docker",4,2,2),r("ci-cd",4,2,3),r("terraform",2,1,4,"preferred")] },
  { slug:"devops-engineer", name:"DevOps Engineer", domain:"Cloud", description:"Improves software delivery through automation, platforms and operational practices.", growth:"Strong", demand:5, requirements:[r("linux",5,3,1),r("git",4,2,1),r("docker",5,3,2),r("ci-cd",5,3,2),r("kubernetes",4,2,3),r("aws",3,2,3,"preferred")] },
  { slug:"cybersecurity-analyst", name:"Cybersecurity Analyst", domain:"Security", description:"Assesses, monitors and reduces security risk in technology environments.", growth:"High", demand:5, requirements:[r("networking",5,3,1),r("linux",4,2,1),r("cybersecurity",5,3,2),r("threat-modeling",4,2,3),r("authentication",3,2,2),r("python",2,1,3,"preferred")] },
  { slug:"qa-engineer", name:"QA Engineer", domain:"Quality", description:"Protects product quality with intentional test design and automation.", growth:"Moderate", demand:4, requirements:[r("testing",5,3,1),r("qa-automation",5,2,2),r("javascript",3,2,1),r("rest-api",3,2,2),r("git",3,2,1),r("communication",3,2,3,"preferred")] },
  { slug:"product-manager", name:"Product Manager", domain:"Product", description:"Aligns user needs, delivery teams and measurable product outcomes.", growth:"Strong", demand:4, requirements:[r("communication",5,3,1),r("agile",5,2,1),r("product-analytics",4,2,2),r("ux-research",4,2,2),r("data-visualization",2,1,3,"preferred"),r("problem-solving",5,3,1)] },
];

const prerequisiteSeeds = [
  ["typescript", "javascript"], ["react", "html-css"], ["react", "javascript"], ["nextjs", "react"], ["nodejs", "javascript"],
  ["spring-boot", "java"], ["rest-api", "java"], ["authentication", "rest-api"], ["postgresql", "sql"], ["data-modeling", "sql"],
  ["pandas", "python"], ["numpy", "python"], ["scikit-learn", "python"], ["scikit-learn", "statistics"], ["scikit-learn", "pandas"],
  ["machine-learning", "python"], ["machine-learning", "statistics"], ["deep-learning", "machine-learning"], ["llm-applications", "python"],
  ["data-engineering", "sql"], ["etl", "sql"], ["docker", "linux"], ["kubernetes", "docker"], ["ci-cd", "git"], ["aws", "linux"],
  ["cybersecurity", "networking"], ["threat-modeling", "cybersecurity"], ["qa-automation", "testing"], ["product-analytics", "data-visualization"],
] as const;

function r(skill: string, importance: number, minimum: number, order: number, type: "required" | "preferred" = "required"): Requirement { return { skill, importance, minimum, order, type }; }

export async function ensureCatalogSeeded() {
  const db = await getDb();
  if (!db) return; // In-memory mode: catalog is served from catalog_response.json

  const [{ value: skillCount }] = await db.select({ value: count() }).from(skills);
  if (skillCount === 0) await db.insert(skills).values(skillSeeds);
  const [{ value: careerCount }] = await db.select({ value: count() }).from(careers);
  if (careerCount === 0) await db.insert(careers).values(careerSeeds.map(({ requirements, growth, ...career }) => ({ ...career, growthIndicator: growth })));
  const [{ value: mappingCount }] = await db.select({ value: count() }).from(careerSkills);
  if (mappingCount === 0) {
    const dbSkills = await db.select({ id: skills.id, slug: skills.slug }).from(skills);
    const dbCareers = await db.select({ id: careers.id, slug: careers.slug }).from(careers);
    const skillIds = new Map(dbSkills.map(skill => [skill.slug, skill.id]));
    const careerIds = new Map(dbCareers.map(career => [career.slug, career.id]));
    const rows = careerSeeds.flatMap(career => career.requirements.flatMap(requirement => {
      const skillId = skillIds.get(requirement.skill); const careerId = careerIds.get(career.slug);
      return skillId && careerId ? [{ careerId, skillId, requirementType: requirement.type, importance: requirement.importance, minimumProficiency: requirement.minimum, learningOrder: requirement.order }] : [];
    }));
    if (rows.length) await db.insert(careerSkills).values(rows);
  }
  const prerequisiteRows = await db.select({ id: skillPrerequisites.id }).from(skillPrerequisites).limit(1);
  if (!prerequisiteRows.length) {
    const catalogSkills = await db.select({ id: skills.id, slug: skills.slug }).from(skills);
    const ids = new Map(catalogSkills.map(skill => [skill.slug, skill.id]));
    const rows = prerequisiteSeeds.flatMap(([skillSlug, prerequisiteSlug]) => {
      const skillId = ids.get(skillSlug); const prerequisiteSkillId = ids.get(prerequisiteSlug);
      return skillId && prerequisiteSkillId ? [{ skillId, prerequisiteSkillId }] : [];
    });
    if (rows.length) await db.insert(skillPrerequisites).values(rows);
  }
  const [{ value: trendCount }] = await db.select({ value: count() }).from(industryTrends);
  if (trendCount === 0) await db.insert(industryTrends).values([
    { title:"Applied AI systems", summary:"AI application skills are marked as an emerging focus in this curated catalog.", relatedDomain:"AI", impact:"High", active:true },
    { title:"Cloud-native delivery", summary:"Container, CI/CD and cloud fundamentals are consistently mapped across engineering roles.", relatedDomain:"Cloud", impact:"High", active:true },
    { title:"Accessible product quality", summary:"Accessibility and testing are included as durable, transferable software capabilities.", relatedDomain:"Engineering", impact:"Medium", active:true },
  ]);
}

export async function getCareerBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(careers).where(eq(careers.slug, slug)).limit(1);
  return rows[0];
}
