---
title: "Job Application Agent Implementation Guide"
series: "Mastra~"
description: "A step-by-step guide to building the Quiver offline-first PWA."
---

# Implementation Guide: AI Job Application Agent

## Overview

Build an AI-powered workflow system that automates job application customization. Users submit job postings via a simple API, and the system asynchronously generates tailored resumes and cover letters based on a canonical resume stored in JSON Resume format. The system prioritizes minimal friction—a single POST request kicks off the entire process.

## Background & Context

### System Context

This tool solves a specific pain point in job searching: the tedious process of customizing applications for each position. Rather than manually tailoring your resume and cover letter for dozens of jobs, you maintain one canonical resume in structured format, and the AI agent workflow handles the customization.

The system consists of:

-  **REST API**: Hono-based endpoints for submitting jobs and retrieving results
-  **Agent Workflow**: Multi-step AI pipeline using Mastra framework
-  **Background Processing**: Async job processing via Cloudflare Queues or Workflows
-  **Data Layer**: PostgreSQL (via Hyperdrive) or D1 for storing resume, jobs, and generated materials

This is a personal tool designed for your own use, optimizing for:

-  Speed of submission (minimal friction to apply to a job)
-  Varying levels of involvement (auto-generated for bulk applications, manual review for priority jobs)
-  Extensibility (easy to add research layers and UI later)

### Technical Background

**JSON Resume Format**: An open-source standard for structured resume data. It defines schemas for basics (name, contact), work experience, education, skills, projects, etc. This gives you a portable, machine-readable resume that can be used across multiple tools. Your existing work porting the spec to Zod provides type safety throughout the codebase.

**Mastra Framework**: An AI agent orchestration framework that simplifies building multi-step workflows. Key features:

-  Agent definitions with instructions and LLM configuration
-  Tool system for discrete operations (parse, match, generate)
-  Workflow engine that chains agents/tools together
-  Built-in integrations with OpenAI, Anthropic, and other LLM providers

**Agent Architecture Pattern**: Instead of one large prompt, you break the task into specialized agents:

-  **Parser Agent**: Extracts structured data from unstructured job postings
-  **Matcher Agent**: Analyzes fit between your resume and job requirements
-  **Generator Agent**: Creates tailored application materials

This separation improves quality (each agent is focused), debuggability (you can test each step), and extensibility (easy to add research agents later).

**Async Processing Pattern**: Job processing takes 30-120 seconds (multiple LLM calls), so synchronous HTTP requests don't work. The pattern:

1. API receives request, creates job record, returns job ID immediately
2. Background worker picks up job from queue
3. Worker executes multi-step workflow
4. Results stored in database
5. User polls for results or receives webhook notification

### Why This Approach?

**Why Mastra instead of LangChain or raw LLM calls?**
Mastra is purpose-built for agentic workflows and provides cleaner abstractions than LangChain. Compared to raw LLM calls, it handles orchestration, state management, and retries. Since you're building a workflow-heavy system (parse → match → generate), Mastra's step chaining is more natural than managing state yourself.

**Why JSON Resume as canonical format?**
It's an established standard, portable across tools, and you've already invested in Zod schemas for it. The structured format makes it easy for AI agents to query specific sections ("find experiences with keywords X") versus parsing freeform text.

**Why async API instead of real-time streaming?**
The workflow involves multiple sequential LLM calls that can't be easily streamed. Async keeps the API responsive and lets you submit multiple jobs in parallel. It also decouples the API from the processing layer.

**Why Cloudflare?**

-  **Global edge deployment**: Low latency API responses from anywhere
-  **Integrated services**: Queues, Workflows, Hyperdrive, D1 all work together seamlessly
-  **Cost-effective**: Pay-per-request pricing ideal for personal tools
-  **No cold starts**: Workers start instantly

## Architecture & Design Decisions

### High-Level Architecture

```
┌─────────────┐
│   Client    │
│ (curl/app)  │
└──────┬──────┘
       │ POST /jobs
       ▼
┌─────────────────────────────────────────────┐
│        Cloudflare Worker (Hono API)         │
│  - POST /jobs: Create job, queue processing │
│  - GET /jobs/:id: Retrieve results          │
│  - PUT /resume: Update canonical resume     │
└──────┬──────────────────────────────────────┘
       │ Enqueue job
       ▼
┌─────────────────────────────────────────────┐
│   Option A: Cloudflare Queues               │
│   Option B: Cloudflare Workflows            │
└──────┬──────────────────────────────────────┘
       │ Process job
       ▼
┌─────────────────────────────────────────────┐
│        Mastra Workflow Pipeline             │
│                                             │
│  1. Parser Agent (gpt-4o-mini)              │
│     ↓ (structured job data)                 │
│  2. Matcher Agent (gpt-4o)                  │
│     ↓ (relevance scores, matched items)     │
│  3. Generator Agent (gpt-4o)                │
│     ↓ (resume + cover letter)               │
│  4. Save Results                            │
└──────┬──────────────────────────────────────┘
       │ Store results
       ▼
┌─────────────────────────────────────────────┐
│   Option A: PostgreSQL via Hyperdrive       │
│   Option B: Cloudflare D1 (SQLite)          │
└─────────────────────────────────────────────┘
```

### Key Design Decisions

**Decision 1: Separate agents for parse/match/generate**

Each agent has a focused responsibility, making the system more maintainable and testable. You can iterate on the matching logic without touching the parser, or improve generation without breaking earlier steps. This also makes it easy to A/B test different prompts for each stage.

**Decision 2: Store parsed job data in database**

The parser's output (structured job requirements, skills, etc.) is saved alongside the raw posting. This enables:

-  Debugging (you can see what the parser extracted)
-  Re-running later stages without re-parsing
-  Analytics (which requirements appear most often)
-  Manual editing (you can fix parser mistakes before matching)

**Decision 3: Simple confidence scoring**

The matcher outputs relevance scores for each experience. We calculate overall confidence (high/medium/low) based on average scores. This helps you decide which jobs need manual review. High confidence = probably fine to auto-apply, Low confidence = read the generated materials carefully.

**Decision 4: Markdown for resume output**

Generated resumes are stored as markdown instead of formatted documents. This keeps the AI focused on content (not formatting), makes diffs easier to review, and gives you flexibility to convert to PDF/DOCX later with your own templates.

**Decision 5: Cloudflare-native infrastructure**

Using Cloudflare's integrated services (Workers, Queues/Workflows, Hyperdrive/D1) provides:

-  Single deployment target
-  Built-in connection pooling for databases
-  Durable execution for long-running workflows
-  No separate Redis/queue infrastructure to manage

### Alternative Approaches Considered

**Alternative 1: Monolithic prompt instead of agent pipeline**

You could use a single large prompt that does parse + match + generate in one call. This would be simpler and faster (one LLM call instead of three).

**Why not chosen**: Quality suffers when you ask the model to do too much in one step. Specialized agents produce better results. The step-by-step approach also makes debugging easier—you can see exactly where things go wrong.

**Alternative 2: BullMQ + Redis instead of Cloudflare Queues**

Traditional Redis-based queue with separate worker process.

**Why not chosen**: Requires managing separate Redis instance and worker deployment. Cloudflare Queues/Workflows are integrated into the platform with built-in retry logic and observability.

**Alternative 3: Self-hosted PostgreSQL**

Run your own Postgres instance on a VPS.

**Why not chosen**: Connection limits become problematic with serverless. Hyperdrive solves this with built-in connection pooling. Alternatively, D1 is fully managed and works natively with Workers.

**Alternative 4: Railway/Render deployment**

Deploy to traditional PaaS with Node.js runtime.

**When it might be better**: If you need features Workers don't support, or if you already have infrastructure there. The tradeoff is more complex deployment and potentially higher costs for low-traffic personal tools.

## Implementation Milestones

### Milestone 1: Project Setup & Database Schema

**Goal**: Initialize the project, set up database, and define core data models.

**Changes Required**:

-  Create new Cloudflare Workers project with Hono
-  Install dependencies (Drizzle, Hono, Zod)
-  Define database schema
-  Set up Hyperdrive or D1
-  Create Zod schemas for resume and job data

**Implementation Details**:

1. **Initialize project**:

```bash
npm create cloudflare@latest job-agent -- --template hono
cd job-agent
npm install drizzle-orm zod
npm install -D drizzle-kit
```

2. **Configure wrangler.jsonc** for Hyperdrive:

```jsonc
{
   "$schema": "node_modules/wrangler/config-schema.json",
   "name": "job-agent",
   "main": "src/index.ts",
   "compatibility_date": "2024-09-23",
   "compatibility_flags": ["nodejs_compat"],
   "hyperdrive": [
      {
         "binding": "HYPERDRIVE",
         "id": "<your-hyperdrive-id>"
      }
   ]
}
```

Or for D1:

```jsonc
{
   "$schema": "node_modules/wrangler/config-schema.json",
   "name": "job-agent",
   "main": "src/index.ts",
   "compatibility_date": "2024-09-23",
   "d1_databases": [
      {
         "binding": "DB",
         "database_name": "job-agent-db",
         "database_id": "<your-d1-id>"
      }
   ]
}
```

3. **Define database schema** (`src/db/schema.ts`):

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
// Or for Postgres: import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

// Your canonical resume in JSON Resume format
export const canonicalResume = sqliteTable("canonical_resume", {
   id: text("id").primaryKey(),
   data: text("data", { mode: "json" }).notNull(), // JSON Resume data
   metadata: text("metadata", { mode: "json" }), // Extended tags for matching
   updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Job postings submitted for processing
export const jobs = sqliteTable("jobs", {
   id: text("id").primaryKey(),
   sourceUrl: text("source_url"),
   rawPosting: text("raw_posting").notNull(),
   parsedData: text("parsed_data", { mode: "json" }),
   status: text("status").notNull(), // pending, processing, complete, failed
   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Generated application materials
export const jobResults = sqliteTable("job_results", {
   id: text("id").primaryKey(),
   jobId: text("job_id")
      .references(() => jobs.id)
      .notNull(),
   matchedExperiences: text("matched_experiences", { mode: "json" }),
   matchedSkills: text("matched_skills", { mode: "json" }),
   generatedResume: text("generated_resume"),
   generatedCoverLetter: text("generated_cover_letter"),
   confidenceScore: text("confidence_score"), // high, medium, low
   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

4. **Create Zod schemas** (`src/schemas/resume.ts`):

```typescript
import { z } from "zod";

const basicsSchema = z.object({
   name: z.string(),
   label: z.string().optional(),
   email: z.string().email(),
   phone: z.string().optional(),
   url: z.string().url().optional(),
   summary: z.string().optional(),
   location: z
      .object({
         city: z.string().optional(),
         countryCode: z.string().optional(),
         region: z.string().optional(),
      })
      .optional(),
});

const workSchema = z.object({
   name: z.string(),
   position: z.string(),
   url: z.string().url().optional(),
   startDate: z.string(),
   endDate: z.string().optional(),
   summary: z.string().optional(),
   highlights: z.array(z.string()).optional(),
});

const skillsSchema = z.object({
   name: z.string(),
   level: z.string().optional(),
   keywords: z.array(z.string()).optional(),
});

export const jsonResumeSchema = z.object({
   basics: basicsSchema,
   work: z.array(workSchema).optional(),
   skills: z.array(skillsSchema).optional(),
   education: z
      .array(
         z.object({
            institution: z.string(),
            area: z.string().optional(),
            studyType: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
         })
      )
      .optional(),
   projects: z
      .array(
         z.object({
            name: z.string(),
            description: z.string().optional(),
            keywords: z.array(z.string()).optional(),
         })
      )
      .optional(),
});

export const resumeMetadataSchema = z.object({
   work: z
      .array(
         z.object({
            companyName: z.string(),
            tags: z.array(z.string()),
            keywords: z.array(z.string()),
            highlightsFull: z.array(z.string()).optional(),
         })
      )
      .optional(),
   skillsTaxonomy: z.record(z.array(z.string())).optional(),
});

export type JSONResume = z.infer<typeof jsonResumeSchema>;
export type ResumeMetadata = z.infer<typeof resumeMetadataSchema>;
```

5. **Create job schemas** (`src/schemas/job.ts`):

```typescript
import { z } from "zod";

export const jobPostingSchema = z.object({
   title: z.string(),
   company: z.string(),
   location: z.string().optional(),
   description: z.string(),
   requirements: z.array(z.string()),
   responsibilities: z.array(z.string()),
   skills: z.array(z.string()),
   experienceLevel: z
      .enum(["entry", "mid", "senior", "staff", "principal", "unknown"])
      .optional(),
   salary: z.string().optional(),
});

export const matchResultSchema = z.object({
   relevantExperiences: z.array(
      z.object({
         position: z.string(),
         company: z.string(),
         relevanceScore: z.number().min(0).max(1),
         matchedRequirements: z.array(z.string()),
         highlights: z.array(z.string()),
      })
   ),
   relevantSkills: z.array(
      z.object({
         skill: z.string(),
         matchedTo: z.array(z.string()),
      })
   ),
   gaps: z.array(z.string()),
   keywordsToMirror: z.array(z.string()),
   overallFit: z.number().min(0).max(1),
});

export const generatedContentSchema = z.object({
   resume: z.string(),
   coverLetter: z.string(),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type GeneratedContent = z.infer<typeof generatedContentSchema>;
```

6. **Create D1 database and run migrations**:

```bash
# Create the database
npx wrangler d1 create job-agent-db

# Generate migrations
npx drizzle-kit generate

# Apply migrations
npx wrangler d1 migrations apply job-agent-db
```

**Verification**:

-  Run `npx wrangler dev` to start local development
-  Database tables are created
-  Zod schemas compile without errors
-  `curl http://localhost:8787/health` returns 200

**Potential Issues**:

-  **D1 vs Hyperdrive**: D1 is simpler for getting started; use Hyperdrive if you need full Postgres features
-  **Schema migrations**: Drizzle Kit generates migrations, but D1 requires applying them via Wrangler
-  **JSON columns**: D1 uses `text` with `mode: 'json'` instead of native JSONB

---

### Milestone 2: Parser Agent

**Goal**: Build the agent that extracts structured data from raw job posting text.

**Changes Required**:

-  Install Mastra dependencies
-  Create Parser Agent with structured output
-  Define parsing tool
-  Test with sample job postings

**Implementation Details**:

1. **Install Mastra**:

```bash
npm install @mastra/core
```

2. **Create parser agent** (`src/agents/parser.ts`):

```typescript
import { Agent } from "@mastra/core";
import { z } from "zod";
import { jobPostingSchema, type JobPosting } from "../schemas/job";

export const parserAgent = new Agent({
   name: "Job Posting Parser",
   instructions: `
You are an expert at analyzing job postings and extracting structured information.

Your task is to read a job posting and extract:
1. Job title and company name
2. Location (if specified)
3. List of requirements (must-haves) - extract exact phrases when possible
4. List of responsibilities (what you'll be doing)
5. Required skills and technologies (be specific: "React" not "frontend framework")
6. Experience level (entry/mid/senior/staff/principal) based on years and seniority indicators
7. Salary range (if mentioned)

Be thorough and precise. Extract exact phrases from the posting when possible.
For requirements, focus on what's explicitly stated as required, not nice-to-have.
For skills, extract specific technologies, not general categories.
  `,
   model: {
      provider: "OPEN_AI",
      name: "gpt-4o-mini", // Faster and cheaper for parsing
   },
});

export async function parseJobPosting(rawText: string): Promise<JobPosting> {
   const prompt = `
Parse the following job posting and extract structured information.

Job Posting:
${rawText}

Return a JSON object with: title, company, location, description, requirements (array), 
responsibilities (array), skills (array), experienceLevel, salary.
  `;

   const result = await parserAgent.generate(prompt, {
      output: "object",
   });

   const parsed = jobPostingSchema.safeParse(result.object);

   if (!parsed.success) {
      console.error("Parser output validation failed:", parsed.error);
      throw new Error("Failed to parse job posting");
   }

   return parsed.data;
}
```

**Why gpt-4o-mini?**: Parsing is a well-defined extraction task that doesn't require deep reasoning. The mini model is significantly faster (2-3x) and cheaper (10x), and quality is sufficient for structured extraction.

3. **Create test script** (`src/agents/__tests__/parser.test.ts`):

```typescript
import { parseJobPosting } from "../parser";

const sampleJobPosting = `
Senior Full Stack Engineer - Acme Corp

Location: San Francisco, CA (Hybrid)

We're seeking a Senior Full Stack Engineer to join our platform team.

Requirements:
- 5+ years of professional software development experience
- Strong proficiency in TypeScript and React
- Experience with Node.js and Express
- Familiarity with PostgreSQL
- Experience building RESTful APIs

Nice to have:
- Experience with AWS
- Knowledge of Kubernetes

Responsibilities:
- Design and implement new features
- Collaborate with product and design teams
- Write maintainable, well-tested code
- Mentor junior engineers

Salary: $160k-$200k + equity
`;

async function testParser() {
   console.log("Testing parser agent...\n");

   const result = await parseJobPosting(sampleJobPosting);

   console.log("Parsed result:", JSON.stringify(result, null, 2));

   console.assert(
      result.title.includes("Senior"),
      'Title should include "Senior"'
   );
   console.assert(
      result.company === "Acme Corp",
      'Company should be "Acme Corp"'
   );
   console.assert(
      result.requirements.length > 3,
      "Should extract multiple requirements"
   );
   console.assert(
      result.skills.includes("TypeScript"),
      "Should identify TypeScript skill"
   );

   console.log("\n✓ Parser test passed");
}

testParser().catch(console.error);
```

**Verification**:

-  Run: `npx tsx src/agents/__tests__/parser.test.ts`
-  Parser extracts all key fields correctly
-  Requirements are split into individual items
-  Experience level is correctly inferred as "senior"
-  Test completes in < 10 seconds

**Potential Issues**:

-  **API key**: Ensure `OPENAI_API_KEY` is set in `.dev.vars`
-  **Validation failures**: If schema validation fails, make the prompt more explicit
-  **Missing fields**: Some postings lack salary/location—schema should allow optional fields

---

### Milestone 3: Matcher Agent

**Goal**: Build the agent that compares your resume against job requirements and identifies best matches.

**Changes Required**:

-  Create matcher agent with scoring logic
-  Load canonical resume from database
-  Output structured match results
-  Calculate confidence score

**Implementation Details**:

1. **Create matcher agent** (`src/agents/matcher.ts`):

```typescript
import { Agent } from "@mastra/core";
import { z } from "zod";
import {
   matchResultSchema,
   type MatchResult,
   type JobPosting,
} from "../schemas/job";
import { type JSONResume } from "../schemas/resume";

export const matcherAgent = new Agent({
   name: "Resume Matcher",
   instructions: `
You are an expert at matching candidate experience to job requirements.

Given a job posting and a candidate's resume, analyze how well they match:

1. **Identify relevant experiences**:
   - For each work experience, determine if it's relevant to this job
   - Score each experience 0.0-1.0 based on relevance
   - List which specific job requirements this experience satisfies
   - Extract the most relevant highlights from each experience

2. **Match skills**:
   - Identify which of the candidate's skills match job requirements
   - Note both exact matches and related skills

3. **Identify gaps**:
   - List requirements the candidate doesn't clearly meet
   - Be honest but not overly harsh

4. **Extract keywords to mirror**:
   - Identify important phrases from the job posting that should appear in the resume/cover letter

5. **Calculate overall fit**:
   - Provide an overall match score 0.0-1.0

Scoring guidelines:
- 0.8-1.0: Excellent match, meets most/all requirements
- 0.6-0.8: Good match, meets core requirements with some gaps
- 0.4-0.6: Moderate match, some relevant experience but notable gaps
- 0.0-0.4: Poor match, lacks most requirements
  `,
   model: {
      provider: "OPEN_AI",
      name: "gpt-4o", // Full model for reasoning
   },
});

export async function matchResumeToJob(
   jobPosting: JobPosting,
   resume: JSONResume
): Promise<MatchResult> {
   const prompt = `
# Job Posting Analysis

**Position**: ${jobPosting.title} at ${jobPosting.company}
**Location**: ${jobPosting.location || "Not specified"}
**Experience Level**: ${jobPosting.experienceLevel || "Not specified"}

**Requirements**:
${jobPosting.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

**Skills Required**:
${jobPosting.skills.join(", ")}

---

# Candidate Resume

**Name**: ${resume.basics.name}
**Summary**: ${resume.basics.summary || "Not provided"}

**Work Experience**:
${
   resume.work
      ?.map(
         (w, i) => `
${i + 1}. ${w.position} at ${w.name} (${w.startDate} - ${
            w.endDate || "Present"
         })
   ${w.summary || ""}
   Highlights:
   ${w.highlights?.map((h) => `   - ${h}`).join("\n") || "   (none listed)"}
`
      )
      .join("\n") || "No work experience listed"
}

**Skills**:
${
   resume.skills
      ?.map((s) => `- ${s.name}: ${s.keywords?.join(", ") || "no details"}`)
      .join("\n") || "No skills listed"
}

---

Analyze the match between this candidate and the job. Return structured JSON.
  `;

   const result = await matcherAgent.generate(prompt, {
      output: "object",
   });

   const parsed = matchResultSchema.safeParse(result.object);

   if (!parsed.success) {
      console.error("Matcher output validation failed:", parsed.error);
      throw new Error("Failed to match resume to job");
   }

   return parsed.data;
}

export function calculateConfidence(
   overallFit: number
): "high" | "medium" | "low" {
   if (overallFit >= 0.75) return "high";
   if (overallFit >= 0.5) return "medium";
   return "low";
}
```

**Verification**:

-  Create test with sample resume and job posting
-  Verify relevance scores are reasonable (0-1 range)
-  Check that gaps are identified honestly
-  Confidence calculation returns correct tier

**Potential Issues**:

-  **Over-optimistic matching**: Refine prompt to be honest about gaps
-  **Generic reasoning**: Ask for specific evidence in instructions
-  **Missing experiences**: Ensure resume has enough detail for matching

---

### Milestone 4: Generator Agent

**Goal**: Build the agent that creates tailored resume and cover letter content.

**Changes Required**:

-  Create generator agent
-  Implement resume and cover letter generation
-  Incorporate keywords from job posting
-  Output as clean Markdown

**Implementation Details**:

1. **Create generator agent** (`src/agents/generator.ts`):

```typescript
import { Agent } from "@mastra/core";
import {
   type MatchResult,
   type JobPosting,
   type GeneratedContent,
} from "../schemas/job";
import { type JSONResume } from "../schemas/resume";

export const generatorAgent = new Agent({
   name: "Application Generator",
   instructions: `
You are an expert resume writer and career advisor.

RESUME GENERATION:
- Focus on the 3-5 most relevant experiences (highest relevance scores)
- Use bullet points that highlight achievements matching job requirements
- Quantify accomplishments where possible (numbers, percentages, scale)
- Mirror language and terminology from the job posting naturally
- Use strong action verbs
- Format in clean Markdown
- Keep it concise - aim for 1 page equivalent

COVER LETTER GENERATION:
- Write 3-4 paragraphs
- Paragraph 1: Opening - express interest and key qualifications
- Paragraph 2-3: Evidence - highlight 2-3 most relevant experiences
- Paragraph 4: Closing - express enthusiasm and request next steps
- Use keywords from the job posting organically
- Be professional but personable
- Total length: 250-400 words

STYLE GUIDELINES:
- Professional but genuine tone
- Avoid clichés and buzzwords
- Be specific and concrete
- Show don't just tell
- Make it easy to skim
  `,
   model: {
      provider: "OPEN_AI",
      name: "gpt-4o",
   },
});

export async function generateApplicationMaterials(
   jobPosting: JobPosting,
   matchResult: MatchResult,
   fullResume: JSONResume
): Promise<GeneratedContent> {
   const resumePrompt = `
Generate a tailored resume for this job application.

Job: ${jobPosting.title} at ${jobPosting.company}

Relevant Experiences (prioritize these):
${JSON.stringify(matchResult.relevantExperiences, null, 2)}

Full Resume Data:
${JSON.stringify(fullResume, null, 2)}

Keywords to incorporate: ${matchResult.keywordsToMirror.join(", ")}

Generate a resume in Markdown format including:
- Professional summary (2-3 lines)
- Work experience (focus on most relevant roles)
- Skills section
- Education (brief)
  `;

   const coverLetterPrompt = `
Generate a cover letter for this job application.

Job: ${jobPosting.title} at ${jobPosting.company}
Key Requirements: ${jobPosting.requirements.slice(0, 5).join(", ")}

Candidate's Relevant Experience:
${JSON.stringify(matchResult.relevantExperiences.slice(0, 3), null, 2)}

Keywords to incorporate: ${matchResult.keywordsToMirror.join(", ")}

Write a 3-4 paragraph cover letter.
  `;

   const [resumeResult, coverLetterResult] = await Promise.all([
      generatorAgent.generate(resumePrompt),
      generatorAgent.generate(coverLetterPrompt),
   ]);

   return {
      resume: resumeResult.text,
      coverLetter: coverLetterResult.text,
   };
}
```

**Verification**:

-  Generated resume is valid Markdown
-  Cover letter is 3-4 paragraphs, 250-400 words
-  Keywords from job posting appear naturally
-  Content is specific to the job, not generic
-  No AI clichés ("I'm excited to apply...")

**Potential Issues**:

-  **Generic output**: Add more specific instructions about avoiding clichés
-  **Too long**: Enforce length limits in prompt
-  **Missing keywords**: Check that keywordsToMirror are actually used

---

### Milestone 5: Async Processing with Cloudflare Queues

**Goal**: Set up background job processing using Cloudflare Queues.

**Changes Required**:

-  Create Cloudflare Queue
-  Implement producer (API endpoint)
-  Implement consumer (queue handler)
-  Wire up the full workflow

**Implementation Details**:

1. **Create queue**:

```bash
npx wrangler queues create job-processing-queue
```

2. **Update wrangler.jsonc**:

```jsonc
{
   "queues": {
      "producers": [
         {
            "binding": "JOB_QUEUE",
            "queue": "job-processing-queue"
         }
      ],
      "consumers": [
         {
            "queue": "job-processing-queue",
            "max_batch_size": 1,
            "max_retries": 3,
            "dead_letter_queue": "job-processing-dlq"
         }
      ]
   }
}
```

3. **Create API with queue producer** (`src/index.ts`):

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";

type Bindings = {
   DB: D1Database;
   JOB_QUEUE: Queue;
   OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

// Submit a job for processing
app.post("/jobs", async (c) => {
   const body = await c.req.json<{ text?: string; url?: string }>();

   if (!body.text && !body.url) {
      return c.json({ error: "Must provide text or url" }, 400);
   }

   const jobId = nanoid();
   const rawPosting = body.text || `URL: ${body.url}`;

   // Insert job record
   await c.env.DB.prepare(
      "INSERT INTO jobs (id, raw_posting, status, created_at) VALUES (?, ?, ?, ?)"
   )
      .bind(jobId, rawPosting, "pending", Date.now())
      .run();

   // Enqueue for processing
   await c.env.JOB_QUEUE.send({
      jobId,
      rawPosting,
   });

   return c.json({ jobId, status: "pending" }, 202);
});

// Get job status and results
app.get("/jobs/:id", async (c) => {
   const jobId = c.req.param("id");

   const job = await c.env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
      .bind(jobId)
      .first();

   if (!job) {
      return c.json({ error: "Job not found" }, 404);
   }

   if (job.status === "complete") {
      const results = await c.env.DB.prepare(
         "SELECT * FROM job_results WHERE job_id = ?"
      )
         .bind(jobId)
         .first();

      return c.json({
         id: job.id,
         status: job.status,
         results: {
            resume: results?.generated_resume,
            coverLetter: results?.generated_cover_letter,
            confidenceScore: results?.confidence_score,
            gaps: JSON.parse(results?.matched_experiences || "[]"),
         },
      });
   }

   return c.json({
      id: job.id,
      status: job.status,
   });
});

export default app;
```

4. **Create queue consumer** (`src/queue.ts`):

```typescript
import { parseJobPosting } from "./agents/parser";
import { matchResumeToJob, calculateConfidence } from "./agents/matcher";
import { generateApplicationMaterials } from "./agents/generator";
import { nanoid } from "nanoid";

interface JobMessage {
   jobId: string;
   rawPosting: string;
}

export async function handleQueue(
   batch: MessageBatch<JobMessage>,
   env: Bindings
): Promise<void> {
   for (const message of batch.messages) {
      const { jobId, rawPosting } = message.body;

      try {
         // Update status to processing
         await env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?")
            .bind("processing", jobId)
            .run();

         // Step 1: Parse job posting
         const parsedJob = await parseJobPosting(rawPosting);

         // Save parsed data
         await env.DB.prepare("UPDATE jobs SET parsed_data = ? WHERE id = ?")
            .bind(JSON.stringify(parsedJob), jobId)
            .run();

         // Step 2: Get canonical resume
         const resumeRow = await env.DB.prepare(
            "SELECT data, metadata FROM canonical_resume LIMIT 1"
         ).first();

         if (!resumeRow) {
            throw new Error("No canonical resume found");
         }

         const resume = JSON.parse(resumeRow.data as string);

         // Step 3: Match resume to job
         const matchResult = await matchResumeToJob(parsedJob, resume);
         const confidence = calculateConfidence(matchResult.overallFit);

         // Step 4: Generate application materials
         const generated = await generateApplicationMaterials(
            parsedJob,
            matchResult,
            resume
         );

         // Step 5: Save results
         await env.DB.prepare(
            `
        INSERT INTO job_results 
        (id, job_id, matched_experiences, matched_skills, generated_resume, 
         generated_cover_letter, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
         )
            .bind(
               nanoid(),
               jobId,
               JSON.stringify(matchResult.relevantExperiences),
               JSON.stringify(matchResult.relevantSkills),
               generated.resume,
               generated.coverLetter,
               confidence,
               Date.now()
            )
            .run();

         // Update job status
         await env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?")
            .bind("complete", jobId)
            .run();

         message.ack();
      } catch (error) {
         console.error(`Failed to process job ${jobId}:`, error);

         await env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?")
            .bind("failed", jobId)
            .run();

         message.retry();
      }
   }
}
```

5. **Export queue handler** (update `src/index.ts`):

```typescript
import { handleQueue } from "./queue";

// ... existing app code ...

export default {
   fetch: app.fetch,
   queue: handleQueue,
};
```

**Verification**:

-  Submit job: `curl -X POST http://localhost:8787/jobs -H "Content-Type: application/json" -d '{"text": "..."}'`
-  Check status: `curl http://localhost:8787/jobs/{id}`
-  Job transitions: pending → processing → complete
-  Results contain resume and cover letter

**Potential Issues**:

-  **Queue not processing locally**: Use `npx wrangler dev --test-scheduled` to test queues
-  **Timeouts**: Queue consumer has 30s limit; LLM calls might exceed this
-  **No resume**: Seed the canonical_resume table before testing

---

### Milestone 6: Alternative - Cloudflare Workflows (Durable Execution)

**Goal**: Use Cloudflare Workflows for durable execution with automatic retries per step.

**Why Workflows instead of Queues?**

-  Built-in retry logic per step (not just per job)
-  State persists between steps automatically
-  Can sleep/wait for long periods
-  Better for multi-step LLM pipelines where individual steps can fail

**Changes Required**:

-  Define Workflow class
-  Update wrangler.jsonc with workflow binding
-  Trigger workflow from API

**Implementation Details**:

1. **Update wrangler.jsonc**:

```jsonc
{
   "workflows": [
      {
         "name": "job-processing-workflow",
         "binding": "JOB_WORKFLOW",
         "class_name": "JobProcessingWorkflow"
      }
   ]
}
```

2. **Create workflow** (`src/workflow.ts`):

```typescript
import {
   WorkflowEntrypoint,
   WorkflowStep,
   WorkflowEvent,
} from "cloudflare:workers";
import { parseJobPosting } from "./agents/parser";
import { matchResumeToJob, calculateConfidence } from "./agents/matcher";
import { generateApplicationMaterials } from "./agents/generator";
import { nanoid } from "nanoid";

interface WorkflowParams {
   jobId: string;
   rawPosting: string;
}

export class JobProcessingWorkflow extends WorkflowEntrypoint<
   Bindings,
   WorkflowParams
> {
   async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
      const { jobId, rawPosting } = event.payload;

      // Step 1: Parse job posting (with automatic retry)
      const parsedJob = await step.do("parse-job", async () => {
         await this.env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?")
            .bind("processing", jobId)
            .run();

         return parseJobPosting(rawPosting);
      });

      // Save parsed data
      await step.do("save-parsed", async () => {
         await this.env.DB.prepare(
            "UPDATE jobs SET parsed_data = ? WHERE id = ?"
         )
            .bind(JSON.stringify(parsedJob), jobId)
            .run();
      });

      // Step 2: Load resume
      const resume = await step.do("load-resume", async () => {
         const row = await this.env.DB.prepare(
            "SELECT data FROM canonical_resume LIMIT 1"
         ).first();

         if (!row) throw new Error("No canonical resume found");
         return JSON.parse(row.data as string);
      });

      // Step 3: Match resume to job
      const matchResult = await step.do("match-resume", async () => {
         return matchResumeToJob(parsedJob, resume);
      });

      // Step 4: Generate application materials
      const generated = await step.do("generate-materials", async () => {
         return generateApplicationMaterials(parsedJob, matchResult, resume);
      });

      // Step 5: Save results
      await step.do("save-results", async () => {
         const confidence = calculateConfidence(matchResult.overallFit);

         await this.env.DB.prepare(
            `
        INSERT INTO job_results 
        (id, job_id, matched_experiences, matched_skills, generated_resume, 
         generated_cover_letter, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
         )
            .bind(
               nanoid(),
               jobId,
               JSON.stringify(matchResult.relevantExperiences),
               JSON.stringify(matchResult.relevantSkills),
               generated.resume,
               generated.coverLetter,
               confidence,
               Date.now()
            )
            .run();

         await this.env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?")
            .bind("complete", jobId)
            .run();
      });

      return { success: true, jobId };
   }
}
```

3. **Trigger workflow from API** (update `src/index.ts`):

```typescript
app.post("/jobs", async (c) => {
   const body = await c.req.json<{ text?: string; url?: string }>();

   if (!body.text && !body.url) {
      return c.json({ error: "Must provide text or url" }, 400);
   }

   const jobId = nanoid();
   const rawPosting = body.text || `URL: ${body.url}`;

   // Insert job record
   await c.env.DB.prepare(
      "INSERT INTO jobs (id, raw_posting, status, created_at) VALUES (?, ?, ?, ?)"
   )
      .bind(jobId, rawPosting, "pending", Date.now())
      .run();

   // Start workflow
   await c.env.JOB_WORKFLOW.create({
      id: jobId,
      params: { jobId, rawPosting },
   });

   return c.json({ jobId, status: "pending" }, 202);
});
```

**Verification**:

-  Same as Milestone 5, but with better observability
-  Check Cloudflare dashboard for workflow execution status
-  Each step retries independently on failure
-  State persists even if worker restarts

---

### Milestone 7: API Refinements & Resume Management

**Goal**: Add resume upload endpoint and polish the API.

**Implementation Details**:

1. **Add resume endpoints**:

```typescript
// Get current resume
app.get("/resume", async (c) => {
   const row = await c.env.DB.prepare(
      "SELECT data, metadata, updated_at FROM canonical_resume LIMIT 1"
   ).first();

   if (!row) {
      return c.json({ error: "No resume found" }, 404);
   }

   return c.json({
      data: JSON.parse(row.data as string),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      updatedAt: row.updated_at,
   });
});

// Update resume
app.put("/resume", async (c) => {
   const body = await c.req.json();

   // Validate against schema
   const dataResult = jsonResumeSchema.safeParse(body.data || body);
   if (!dataResult.success) {
      return c.json(
         { error: "Invalid resume format", details: dataResult.error },
         400
      );
   }

   // Delete existing and insert new
   await c.env.DB.prepare("DELETE FROM canonical_resume").run();

   await c.env.DB.prepare(
      "INSERT INTO canonical_resume (id, data, metadata, updated_at) VALUES (?, ?, ?, ?)"
   )
      .bind(
         nanoid(),
         JSON.stringify(dataResult.data),
         body.metadata ? JSON.stringify(body.metadata) : null,
         Date.now()
      )
      .run();

   return c.json({ message: "Resume updated successfully" });
});
```

**Verification**:

-  Upload resume: `curl -X PUT http://localhost:8787/resume -d @resume.json`
-  Get resume: `curl http://localhost:8787/resume`
-  Invalid resume returns 400 with validation errors

---

### Milestone 8: Production Deployment

**Goal**: Deploy to Cloudflare Workers in production.

**Changes Required**:

-  Set production secrets
-  Deploy worker
-  Create production database
-  Verify end-to-end

**Implementation Details**:

1. **Set secrets**:

```bash
npx wrangler secret put OPENAI_API_KEY
```

2. **Create production D1 database**:

```bash
npx wrangler d1 create job-agent-db --location=wnam
npx wrangler d1 migrations apply job-agent-db --remote
```

3. **Create Hyperdrive config** (if using Postgres):

```bash
npx wrangler hyperdrive create job-agent-hyperdrive \
  --connection-string="postgresql://user:pass@host:5432/db"
```

4. **Deploy**:

```bash
npx wrangler deploy
```

5. **Verify deployment**:

```bash
# Health check
curl https://job-agent.<your-subdomain>.workers.dev/health

# Upload resume
curl -X PUT https://job-agent.<your-subdomain>.workers.dev/resume \
  -H "Content-Type: application/json" \
  -d @my-resume.json

# Submit a job
curl -X POST https://job-agent.<your-subdomain>.workers.dev/jobs \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior Engineer at Acme Corp..."}'
```

**Verification**:

-  Worker is deployed and responding
-  Database operations work
-  Queue/Workflow processes jobs
-  Results are returned correctly

**Potential Issues**:

-  **Cold start latency**: Workers start instantly, but first LLM call may take longer
-  **Timeout limits**: Paid plans have higher limits (30s vs 10ms CPU time on free)
-  **D1 row limits**: Free tier has limits; check pricing for production use

---

## Testing Strategy

### Unit Tests

**Parser Agent**:

-  Test with various job posting formats (structured, unstructured, minimal info)
-  Verify all fields are extracted correctly
-  Test error handling (empty input, malformed text)

**Matcher Agent**:

-  Test matching with high/medium/low fit resumes
-  Verify relevance scores are reasonable
-  Test edge case (no matching experience)

**Generator Agent**:

-  Test with different confidence levels
-  Verify no generic AI phrases
-  Test markdown formatting

### Integration Tests

**Workflow**:

-  Test complete pipeline end-to-end
-  Verify database is updated correctly
-  Test error handling (missing resume, agent failures)

**API**:

-  Test all endpoints with valid/invalid inputs
-  Verify proper status codes
-  Test concurrent job submissions

### Manual Testing

Submit 5-10 real job postings and review:

-  Does the resume accurately reflect your experience?
-  Is the cover letter compelling and specific?
-  Are confidence scores reasonable?
-  Are keywords incorporated naturally?

## Deployment Considerations

### Prerequisites

-  Cloudflare account (free tier works for testing)
-  OpenAI API key with credits
-  Optional: External PostgreSQL if using Hyperdrive

### Cloudflare Service Comparison

| Feature  | D1              | Hyperdrive + Postgres        |
| -------- | --------------- | ---------------------------- |
| Setup    | Fully managed   | Requires external DB         |
| Cost     | Pay per request | DB hosting + Hyperdrive      |
| Features | SQLite subset   | Full Postgres                |
| Best for | Simple apps     | Complex queries, existing DB |

| Feature           | Queues      | Workflows                |
| ----------------- | ----------- | ------------------------ |
| Retry granularity | Per message | Per step                 |
| State persistence | Manual      | Automatic                |
| Execution time    | 30s limit   | Hours/days               |
| Best for          | Simple jobs | Multi-step LLM pipelines |

### Rollback Plan

1. Redeploy previous version: `npx wrangler rollback`
2. Jobs in queue continue processing
3. Database changes are persistent (plan migrations carefully)

## Edge Cases & Error Handling

**Job posting parsing fails**:

-  Retry with simplified prompt
-  Fall back to basic extraction
-  Mark job as failed with helpful error message

**No canonical resume**:

-  API returns clear error immediately
-  Prompt user to upload resume first

**LLM rate limits**:

-  Workflows retry automatically with backoff
-  Consider using multiple API keys for high volume

**Low confidence matches**:

-  Still generate materials
-  Flag for manual review
-  User can regenerate with different parameters

## Performance Considerations

**Current bottleneck**: LLM API calls

-  Each job requires 3-4 LLM calls (30-90 seconds total)
-  Cannot easily parallelize due to step dependencies
-  Optimization: Use gpt-4o-mini for parsing, full model for generation

**Cloudflare-specific**:

-  Workers have 30s CPU time limit on paid plans
-  Workflows allow longer execution
-  D1 queries are fast (globally distributed)

## Security Considerations

**API security**:

-  Currently no authentication (personal tool)
-  Add API key or Cloudflare Access for production
-  Rate limit via Cloudflare WAF

**Secrets**:

-  Store OPENAI_API_KEY as Wrangler secret
-  Never commit to git
-  Rotate periodically

**Resume data**:

-  Stored in D1 (encrypted at rest)
-  Sent to OpenAI API (review their data policy)
-  Consider: Workers AI for local inference if privacy is critical

## Future Enhancements

**Phase 2: Research layer**

-  Web scraping for company info
-  News aggregation about company
-  Integrate into generation prompts

**Phase 3: UI layer**

-  Simple frontend to view jobs and results
-  Edit generated materials inline
-  Export to PDF/DOCX

**Phase 4: Intelligence improvements**

-  Learn from feedback (which applications succeed)
-  A/B test different prompt strategies
-  Vector search for better matching

## Additional Resources

**Cloudflare Documentation**:

-  Workers: https://developers.cloudflare.com/workers/
-  D1: https://developers.cloudflare.com/d1/
-  Queues: https://developers.cloudflare.com/queues/
-  Workflows: https://developers.cloudflare.com/workflows/
-  Hyperdrive: https://developers.cloudflare.com/hyperdrive/

**Mastra Framework**:

-  Docs: https://mastra.ai/docs
-  Examples: https://github.com/mastra-ai/mastra

**JSON Resume**:

-  Schema: https://jsonresume.org/schema/

**Hono Framework**:

-  Docs: https://hono.dev/
-  Cloudflare guide: https://developers.cloudflare.com/pages/framework-guides/deploy-a-hono-site/
