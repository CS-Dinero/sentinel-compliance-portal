import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[LLM] No Gemini API key found. Set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY.");
}

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const ai = new GoogleGenAI({
  apiKey: apiKey || "missing-key",
  ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
});

const VALID_SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
const VALID_CATEGORIES = new Set(["Security", "Privacy", "Compliance", "Performance", "Accessibility"]);

const findingSchema = z.object({
  severity: z.string().refine((s) => VALID_SEVERITIES.has(s), { message: "Invalid severity" }),
  category: z.string().refine((s) => VALID_CATEGORIES.has(s), { message: "Invalid category" }),
  finding_title: z.string().min(1),
  evidence_snippet: z.string().min(1, "Finding must include evidence_snippet referencing collected HTML"),
  status: z.string().default("OPEN"),
  remediation_plan: z.string().min(1),
  ai_fix_code: z.string().optional(),
  edge_score_component: z.number().min(0).max(100).optional(),
});

const analysisResultSchema = z.object({
  findings: z.array(findingSchema),
  exec_summary: z.string().min(10, "exec_summary must be substantive"),
  risk_analysis: z.string().min(10, "risk_analysis must be substantive"),
  remediation_overview: z.string().min(10, "remediation_overview must be substantive"),
});

const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000;
const MAX_DELAY = 128000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("503") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit") ||
    errorMsg.toLowerCase().includes("overloaded")
  );
}

export async function generateWithRetry(prompt: string): Promise<string> {
  let lastError: Error | null = null;
  let delay = INITIAL_DELAY;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error)) {
        throw lastError;
      }

      console.log(`LLM attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
      delay = Math.min(delay * 2, MAX_DELAY);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export interface Finding {
  severity: string;
  category: string;
  finding_title: string;
  evidence_snippet?: string;
}

export interface GeneratedFinding extends Finding {
  status: string;
  remediation_plan: string;
  ai_fix_code?: string;
  edge_score_component?: number;
}

export async function analyzeHtmlAndGenerateFindings(
  htmlHome: string,
  htmlContact?: string,
  htmlPrivacy?: string,
  policyText?: string,
  techStackJson?: string,
  formsDetectedJson?: string
): Promise<{
  findings: GeneratedFinding[];
  exec_summary: string;
  risk_analysis: string;
  remediation_overview: string;
}> {
  const htmlSnippet = htmlHome.slice(0, 15000);
  const contactSnippet = htmlContact?.slice(0, 5000) || "";
  const privacySnippet = htmlPrivacy?.slice(0, 5000) || "";
  const policySnippet = policyText?.slice(0, 5000) || "";

  const prompt = `You are a website security and compliance auditor. Analyze the following website HTML and generate a security audit report.

HTML Home Page (truncated):
${htmlSnippet}

${contactSnippet ? `Contact Page HTML (truncated):\n${contactSnippet}\n` : ""}
${privacySnippet ? `Privacy Page HTML (truncated):\n${privacySnippet}\n` : ""}
${policySnippet ? `Policy Text (truncated):\n${policySnippet}\n` : ""}
${techStackJson ? `Tech Stack:\n${techStackJson}\n` : ""}
${formsDetectedJson ? `Forms Detected:\n${formsDetectedJson}\n` : ""}

Generate a JSON response with the following structure:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "Security|Privacy|Compliance|Performance|Accessibility",
      "finding_title": "Brief title of the finding",
      "evidence_snippet": "Exact quote or reference from the collected HTML that supports this finding",
      "status": "OPEN",
      "remediation_plan": "Detailed steps to fix this issue",
      "ai_fix_code": "Code snippet if applicable",
      "edge_score_component": 0-100
    }
  ],
  "exec_summary": "2-3 paragraph executive summary of the audit findings",
  "risk_analysis": "Analysis of overall risk posture and key vulnerabilities",
  "remediation_overview": "Prioritized overview of recommended remediation steps"
}

IMPORTANT RULES:
- Every finding MUST include an "evidence_snippet" field referencing specific content from the provided HTML.
- Do NOT infer security headers, server configurations, or vulnerabilities that cannot be observed in the provided HTML.
- If no issues are found, return an empty findings array — do not invent issues.
- Only report what the HTML evidence supports.

Focus on:
1. Security vulnerabilities (XSS, CSRF, insecure forms, missing HTTPS)
2. Privacy compliance (cookie consent, data collection practices, privacy policy)
3. GDPR/CCPA compliance issues
4. Accessibility issues (WCAG compliance)
5. Performance concerns
6. Missing security headers (only if observable in HTML meta tags or scripts)

Generate findings based on the severity of issues actually found. Be specific and evidence-based.
Return ONLY valid JSON, no markdown formatting.`;

  const responseText = await generateWithRetry(prompt);

  let rawJson: unknown;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
    rawJson = JSON.parse(jsonStr.trim());
  } catch (parseErr) {
    throw new Error(
      `LLM returned malformed JSON. First 500 chars: ${responseText.slice(0, 500)}`
    );
  }

  const validated = analysisResultSchema.safeParse(rawJson);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`LLM output failed validation: ${issues}`);
  }

  return validated.data;
}
