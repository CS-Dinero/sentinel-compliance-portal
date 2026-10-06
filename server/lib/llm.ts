import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
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

Focus on:
1. Security vulnerabilities (XSS, CSRF, insecure forms, missing HTTPS)
2. Privacy compliance (cookie consent, data collection practices, privacy policy)
3. GDPR/CCPA compliance issues
4. Accessibility issues (WCAG compliance)
5. Performance concerns
6. Missing security headers

Generate 5-15 findings based on the severity of issues found. Be specific and actionable.
Return ONLY valid JSON, no markdown formatting.`;

  try {
    const responseText = await generateWithRetry(prompt);
    
    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse LLM response as JSON, using fallback");
      return {
        findings: [{
          severity: "INFO",
          category: "Audit",
          finding_title: "Audit completed with parsing error",
          status: "OPEN",
          remediation_plan: "Manual review required - LLM response could not be parsed",
          edge_score_component: 50,
        }],
        exec_summary: "The automated audit completed but encountered parsing issues. Manual review is recommended.",
        risk_analysis: "Unable to fully assess risk due to parsing error.",
        remediation_overview: "Please conduct a manual security review.",
      };
    }

    return {
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      exec_summary: parsed.exec_summary || "",
      risk_analysis: parsed.risk_analysis || "",
      remediation_overview: parsed.remediation_overview || "",
    };
  } catch (error) {
    console.error("LLM analysis failed:", error);
    throw error;
  }
}
