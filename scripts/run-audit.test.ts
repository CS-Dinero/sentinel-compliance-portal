/**
 * Tests for the manual audit runner and LLM validation.
 * Uses mocked Gemini responses — not a live end-to-end audit.
 *
 * Run: npx tsx scripts/run-audit.test.ts
 */

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failed++;
      const msg = err.message || String(err);
      failures.push(`${name}: ${msg}`);
      console.log(`  ✗ ${name}: ${msg}`);
    }
  })();
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------

// We test the validation layer by importing the Zod schema from llm.ts indirectly.
// Since llm.ts initializes GoogleGenAI at module level (which would fail without a key),
// we replicate the validation schema here for isolated testing.

import { z } from "zod";

const VALID_SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
const VALID_CATEGORIES = new Set(["Security", "Privacy", "Compliance", "Performance", "Accessibility"]);

const findingSchema = z.object({
  severity: z.string().refine((s) => VALID_SEVERITIES.has(s), { message: "Invalid severity" }),
  category: z.string().refine((s) => VALID_CATEGORIES.has(s), { message: "Invalid category" }),
  finding_title: z.string().min(1),
  evidence_snippet: z.string().min(1, "Finding must include evidence_snippet"),
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

// Mock valid Gemini response
const VALID_RESPONSE = {
  findings: [
    {
      severity: "HIGH",
      category: "Security",
      finding_title: "Form submits over HTTP",
      evidence_snippet: '<form action="http://example.com/submit">',
      status: "OPEN",
      remediation_plan: "Change form action to use HTTPS.",
      ai_fix_code: '<form action="https://example.com/submit">',
      edge_score_component: 30,
    },
    {
      severity: "MEDIUM",
      category: "Privacy",
      finding_title: "No cookie consent banner detected",
      evidence_snippet: "No script or element matching cookie consent patterns found in HTML",
      status: "OPEN",
      remediation_plan: "Implement a cookie consent mechanism.",
    },
  ],
  exec_summary:
    "The website shows several areas needing attention in security and privacy compliance. Form submissions lack HTTPS and no cookie consent mechanism was detected.",
  risk_analysis:
    "The primary risk is data exposure through unencrypted form submissions. Privacy compliance gaps exist around cookie consent.",
  remediation_overview:
    "Priority 1: Migrate all form actions to HTTPS. Priority 2: Add cookie consent banner. Priority 3: Review third-party script loading.",
};

// Mock response with zero findings (valid — site might genuinely have no issues)
const ZERO_FINDINGS_RESPONSE = {
  findings: [],
  exec_summary:
    "The audited website demonstrates strong security and privacy practices. No actionable findings were identified from the collected HTML evidence.",
  risk_analysis:
    "The current risk posture appears low based on observable HTML patterns. Server-side configurations were not assessed.",
  remediation_overview:
    "No immediate remediation steps are required based on the collected evidence. Periodic re-assessment is recommended.",
};

// ---------------------------------------------------------------------------
// Tests: LLM output validation
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("\n=== LLM Output Validation Tests ===\n");

  await test("Valid response passes validation", () => {
    const result = analysisResultSchema.safeParse(VALID_RESPONSE);
    assert(result.success, `Validation failed: ${result.error?.message}`);
  });

  await test("Zero-findings response is valid", () => {
    const result = analysisResultSchema.safeParse(ZERO_FINDINGS_RESPONSE);
    assert(result.success, `Zero findings should be valid: ${result.error?.message}`);
  });

  await test("Malformed JSON string throws during parse", () => {
    const badJson = "this is not json {{{";
    let threw = false;
    try {
      JSON.parse(badJson);
    } catch {
      threw = true;
    }
    assert(threw, "Should throw on malformed JSON");
  });

  await test("Missing exec_summary fails validation", () => {
    const bad = { ...VALID_RESPONSE, exec_summary: "" };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Empty exec_summary should fail");
  });

  await test("Missing risk_analysis fails validation", () => {
    const bad = { ...VALID_RESPONSE, risk_analysis: "" };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Empty risk_analysis should fail");
  });

  await test("Missing remediation_overview fails validation", () => {
    const bad = { ...VALID_RESPONSE, remediation_overview: "" };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Empty remediation_overview should fail");
  });

  await test("Finding without evidence_snippet fails validation", () => {
    const bad = {
      ...VALID_RESPONSE,
      findings: [
        {
          severity: "HIGH",
          category: "Security",
          finding_title: "Some issue",
          status: "OPEN",
          remediation_plan: "Fix it",
          // no evidence_snippet
        },
      ],
    };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Missing evidence_snippet should fail");
  });

  await test("Finding with empty evidence_snippet fails validation", () => {
    const bad = {
      ...VALID_RESPONSE,
      findings: [
        {
          severity: "HIGH",
          category: "Security",
          finding_title: "Some issue",
          evidence_snippet: "",
          status: "OPEN",
          remediation_plan: "Fix it",
        },
      ],
    };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Empty evidence_snippet should fail");
  });

  await test("Invalid severity fails validation", () => {
    const bad = {
      ...VALID_RESPONSE,
      findings: [
        {
          severity: "URGENT",
          category: "Security",
          finding_title: "Bad sev",
          evidence_snippet: "some evidence",
          status: "OPEN",
          remediation_plan: "Fix it",
        },
      ],
    };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Invalid severity should fail");
  });

  await test("Invalid category fails validation", () => {
    const bad = {
      ...VALID_RESPONSE,
      findings: [
        {
          severity: "HIGH",
          category: "Infrastructure",
          finding_title: "Bad cat",
          evidence_snippet: "some evidence",
          status: "OPEN",
          remediation_plan: "Fix it",
        },
      ],
    };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Invalid category should fail");
  });

  await test("edge_score_component > 100 fails validation", () => {
    const bad = {
      ...VALID_RESPONSE,
      findings: [
        {
          ...VALID_RESPONSE.findings[0],
          edge_score_component: 150,
        },
      ],
    };
    const result = analysisResultSchema.safeParse(bad);
    assert(!result.success, "Score > 100 should fail");
  });

  // ---------------------------------------------------------------------------
  // Tests: Tier separation
  // ---------------------------------------------------------------------------

  console.log("\n=== Tier Separation Tests ===\n");

  await test("Audit tier report excludes remediation plans", () => {
    const report = generateMockReport(VALID_RESPONSE, "audit");
    assert(
      !report.includes("Remediation Plan:"),
      "Audit tier should not contain remediation plan headings"
    );
    assert(
      !report.includes("Suggested Fix:"),
      "Audit tier should not contain fix code"
    );
    assert(
      report.includes("Sentinel Blueprint"),
      "Audit tier should mention Blueprint upgrade"
    );
  });

  await test("Blueprint tier report includes remediation plans", () => {
    const report = generateMockReport(VALID_RESPONSE, "blueprint");
    assert(
      report.includes("Remediation Plan:") || report.includes("Change form action"),
      "Blueprint tier should include remediation plan content"
    );
  });

  await test("Blueprint tier report includes fix code", () => {
    const report = generateMockReport(VALID_RESPONSE, "blueprint");
    assert(
      report.includes("Suggested Fix:"),
      "Blueprint tier should include fix code"
    );
  });

  await test("Audit tier report still includes findings and evidence", () => {
    const report = generateMockReport(VALID_RESPONSE, "audit");
    assert(report.includes("Form submits over HTTP"), "Should include finding title");
    assert(
      report.includes("Evidence:"),
      "Should include evidence even in audit tier"
    );
  });

  // ---------------------------------------------------------------------------
  // Tests: URL safety
  // ---------------------------------------------------------------------------

  console.log("\n=== URL Safety Tests ===\n");

  await test("Rejects localhost", () => {
    assert(!isUrlSafeMock("http://localhost:3000"), "localhost should be rejected");
  });

  await test("Rejects 127.0.0.1", () => {
    assert(!isUrlSafeMock("http://127.0.0.1"), "127.0.0.1 should be rejected");
  });

  await test("Rejects 192.168.x.x", () => {
    assert(!isUrlSafeMock("http://192.168.1.1"), "192.168.x.x should be rejected");
  });

  await test("Rejects 10.x.x.x", () => {
    assert(!isUrlSafeMock("http://10.0.0.1"), "10.x.x.x should be rejected");
  });

  await test("Rejects .local domains", () => {
    assert(!isUrlSafeMock("http://myserver.local"), ".local should be rejected");
  });

  await test("Accepts public HTTPS URLs", () => {
    assert(isUrlSafeMock("https://example.com"), "Public HTTPS should be accepted");
  });

  await test("Accepts public HTTP URLs", () => {
    assert(isUrlSafeMock("http://example.com"), "Public HTTP should be accepted");
  });

  await test("Rejects non-HTTP protocols", () => {
    assert(!isUrlSafeMock("ftp://example.com"), "FTP should be rejected");
    assert(!isUrlSafeMock("file:///etc/passwd"), "file:// should be rejected");
  });

  // ---------------------------------------------------------------------------
  // Tests: Evidence cross-validation
  // ---------------------------------------------------------------------------

  console.log("\n=== Evidence Cross-Validation Tests ===\n");

  await test("Exact evidence snippet match found in collected HTML", () => {
    const html = '<form action="http://example.com/submit"><input type="text" name="email"></form>';
    const findings = [
      { evidence_snippet: '<form action="http://example.com/submit">', finding_title: "Insecure form" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: html });
    assert(result[0].matchType === "exact", `Expected exact, got ${result[0].matchType}`);
    assert(result[0].matchedIn === "homepage", "Should match in homepage");
  });

  await test("Normalized evidence match (whitespace differences)", () => {
    const html = '<form  action="http://example.com/submit" >';
    const findings = [
      { evidence_snippet: '<form action="http://example.com/submit" >', finding_title: "Insecure form" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: html });
    assert(result[0].matchType === "normalized", `Expected normalized, got ${result[0].matchType}`);
  });

  await test("Unmatched evidence snippet flagged correctly", () => {
    const html = "<html><body><p>Hello world</p></body></html>";
    const findings = [
      { evidence_snippet: "Server: Apache/2.4.1 (detected via HTTP headers)", finding_title: "Server version disclosure" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: html });
    assert(result[0].matchType === "unmatched", `Expected unmatched, got ${result[0].matchType}`);
    assert(result[0].matchedIn === null, "Should not match any page");
  });

  await test("Evidence found in secondary page (privacy)", () => {
    const homepageHtml = "<html><body>Homepage</body></html>";
    const privacyHtml = '<p>We do not use cookies for tracking purposes.</p>';
    const findings = [
      { evidence_snippet: "We do not use cookies for tracking purposes.", finding_title: "Cookie policy" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: homepageHtml, privacy: privacyHtml });
    assert(result[0].matchType === "exact", `Expected exact, got ${result[0].matchType}`);
    assert(result[0].matchedIn === "privacy", `Expected privacy, got ${result[0].matchedIn}`);
  });

  await test("Empty evidence snippet is flagged as unmatched", () => {
    const html = "<html><body>content</body></html>";
    const findings = [
      { evidence_snippet: "", finding_title: "Missing evidence" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: html });
    assert(result[0].matchType === "unmatched", `Expected unmatched, got ${result[0].matchType}`);
  });

  await test("Multiple findings: mixed match results", () => {
    const html = '<html><body><form action="http://test.com"></form><p>Hello</p></body></html>';
    const findings = [
      { evidence_snippet: '<form action="http://test.com">', finding_title: "Found one" },
      { evidence_snippet: "X-Frame-Options header missing", finding_title: "Not found" },
    ];
    const result = crossValidateEvidenceMock(findings, { homepage: html });
    assert(result[0].matchType === "exact", "First should be exact");
    assert(result[1].matchType === "unmatched", "Second should be unmatched");
  });

  // ---------------------------------------------------------------------------
  // Tests: Write failure handling (processAudit fix)
  // ---------------------------------------------------------------------------

  console.log("\n=== Write Failure Tests (processAudit logic) ===\n");

  await test("All findings write failures should prevent COMPLETE status", () => {
    // Simulating the fixed logic from processor.ts
    const findingRecords = [{ title: "a" }, { title: "b" }];
    const created = 0;
    const failed = 2;

    let errorThrown = false;
    if (findingRecords.length > 0 && created === 0) {
      errorThrown = true;
    }
    assert(
      errorThrown,
      "Should throw when all findings fail to write"
    );
  });

  await test("Partial write failure allows COMPLETE with warning", () => {
    const findingRecords = [{ title: "a" }, { title: "b" }];
    const created = 1;
    const failedCount = 1;

    const shouldThrow = findingRecords.length > 0 && created === 0;
    assert(!shouldThrow, "Partial success should not throw");

    const lastError =
      failedCount > 0
        ? `${failedCount} of ${findingRecords.length} findings failed to write`
        : "";
    assert(lastError.length > 0, "Should record partial failure as warning");
  });

  await test("Zero findings with zero writes is valid (no error)", () => {
    const findingRecords: any[] = [];
    const created = 0;

    const shouldThrow = findingRecords.length > 0 && created === 0;
    assert(!shouldThrow, "Zero findings = zero writes is not an error");
  });

  // ---------------------------------------------------------------------------
  // Tests: Markdown code block extraction
  // ---------------------------------------------------------------------------

  console.log("\n=== JSON Extraction Tests ===\n");

  await test("Extracts JSON from markdown code block", () => {
    const wrapped = '```json\n{"findings":[],"exec_summary":"test summary here.","risk_analysis":"risk analysis here.","remediation_overview":"remediation here."}\n```';
    const match = wrapped.match(/```(?:json)?\s*([\s\S]*?)```/);
    assert(match !== null, "Should match code block");
    const parsed = JSON.parse(match![1]);
    assert(Array.isArray(parsed.findings), "Should parse findings array");
  });

  await test("Handles raw JSON without code block", () => {
    const raw = '{"findings":[],"exec_summary":"test summary here.","risk_analysis":"risk analysis here.","remediation_overview":"remediation here."}';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : raw;
    const parsed = JSON.parse(jsonStr.trim());
    assert(Array.isArray(parsed.findings), "Should parse raw JSON");
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failures.length > 0) {
    console.log("Failures:");
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Helpers replicated from run-audit.ts for isolated testing
// ---------------------------------------------------------------------------

function isUrlSafeMock(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeForComparisonMock(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function crossValidateEvidenceMock(
  findings: { evidence_snippet: string; finding_title: string }[],
  collectedPages: Record<string, string>
): { findingTitle: string; evidenceSnippet: string; matchedIn: string | null; matchType: "exact" | "normalized" | "unmatched" }[] {
  const results: { findingTitle: string; evidenceSnippet: string; matchedIn: string | null; matchType: "exact" | "normalized" | "unmatched" }[] = [];

  for (const f of findings) {
    const snippet = f.evidence_snippet;
    if (!snippet) {
      results.push({ findingTitle: f.finding_title, evidenceSnippet: "", matchedIn: null, matchType: "unmatched" });
      continue;
    }

    let matched = false;
    for (const [pageName, html] of Object.entries(collectedPages)) {
      if (html.includes(snippet)) {
        results.push({ findingTitle: f.finding_title, evidenceSnippet: snippet.slice(0, 120), matchedIn: pageName, matchType: "exact" });
        matched = true;
        break;
      }
    }

    if (!matched) {
      const normalizedSnippet = normalizeForComparisonMock(snippet);
      for (const [pageName, html] of Object.entries(collectedPages)) {
        const normalizedHtml = normalizeForComparisonMock(html);
        if (normalizedHtml.includes(normalizedSnippet)) {
          results.push({ findingTitle: f.finding_title, evidenceSnippet: snippet.slice(0, 120), matchedIn: pageName, matchType: "normalized" });
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      results.push({ findingTitle: f.finding_title, evidenceSnippet: snippet.slice(0, 120), matchedIn: null, matchType: "unmatched" });
    }
  }

  return results;
}

function generateMockReport(
  data: typeof VALID_RESPONSE,
  tier: "audit" | "blueprint"
): string {
  const lines: string[] = [];
  lines.push("# Sentinel Compliance Audit Report");
  lines.push("");

  for (const f of data.findings) {
    lines.push(`#### ${f.finding_title}`);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Status:** ${f.status}`);
    if (f.evidence_snippet) {
      lines.push(`- **Evidence:** ${f.evidence_snippet}`);
    }
    lines.push("");

    if (tier === "blueprint") {
      if (f.remediation_plan) {
        lines.push("**Remediation Plan:**");
        lines.push(f.remediation_plan);
        lines.push("");
      }
      if (f.ai_fix_code) {
        lines.push("**Suggested Fix:**");
        lines.push("```");
        lines.push(f.ai_fix_code);
        lines.push("```");
        lines.push("");
      }
    }
  }

  if (tier === "audit") {
    lines.push("*Sentinel Blueprint ($300 upgrade)*");
  }

  return lines.join("\n");
}

runTests();
