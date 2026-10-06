import { analyzeHtmlAndGenerateFindings, type GeneratedFinding } from "../server/lib/llm";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  companyName: string;
  websiteUrl: string;
  purchaseTier: "audit" | "blueprint";
  saveSupabase: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let companyName = "";
  let websiteUrl = "";
  let purchaseTier: "audit" | "blueprint" = "audit";
  let saveSupabase = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--company":
        companyName = args[++i] || "";
        break;
      case "--url":
        websiteUrl = args[++i] || "";
        break;
      case "--tier":
        const tier = args[++i];
        if (tier !== "audit" && tier !== "blueprint") {
          fatal(`Invalid tier "${tier}". Must be "audit" or "blueprint".`);
        }
        purchaseTier = tier as "audit" | "blueprint";
        break;
      case "--save-supabase":
        saveSupabase = true;
        break;
      case "--help":
        printUsage();
        process.exit(0);
      default:
        fatal(`Unknown argument: ${args[i]}. Use --help for usage.`);
    }
  }

  if (!companyName) fatal("--company is required.");
  if (!websiteUrl) fatal("--url is required.");

  try {
    new URL(websiteUrl);
  } catch {
    fatal(`Invalid URL: ${websiteUrl}`);
  }

  return { companyName, websiteUrl, purchaseTier, saveSupabase };
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/run-audit.ts --company "Acme Corp" --url "https://example.com" [options]

Required:
  --company <name>     Company name for the audit report
  --url <url>          Website URL to audit

Options:
  --tier <audit|blueprint>   Purchase tier (default: audit)
                             "audit" = $197 report (no remediation plans or fix code)
                             "blueprint" = includes remediation plans and fix code
  --save-supabase            Save results to Supabase (disabled by default)
  --help                     Show this help message

Environment:
  GEMINI_API_KEY                    Standard Gemini API key (preferred)
  AI_INTEGRATIONS_GEMINI_API_KEY    Replit integration key (fallback)
  AI_INTEGRATIONS_GEMINI_BASE_URL   Custom Gemini base URL (optional)
  SUPABASE_URL                      Required if --save-supabase
  SUPABASE_SERVICE_ROLE_KEY         Required if --save-supabase

Output:
  reports/<audit-id>/evidence/       Collected HTML files
  reports/<audit-id>/raw-output.json Full validated analysis (internal)
  reports/<audit-id>/audit-report.md Customer-facing audit (tier-appropriate)
  reports/<audit-id>/metadata.json   Audit metadata and status
`);
}

function fatal(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// URL safety checks
// ---------------------------------------------------------------------------

function isUrlSafe(urlStr: string): boolean {
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

// ---------------------------------------------------------------------------
// HTML collection
// ---------------------------------------------------------------------------

interface CollectedPage {
  url: string;
  html: string | null;
  status: number | null;
  error: string | null;
  collectedAt: string;
}

interface CollectionResult {
  homepage: CollectedPage;
  contact: CollectedPage | null;
  privacy: CollectedPage | null;
  terms: CollectedPage | null;
  coverageLimitations: string[];
}

const FETCH_TIMEOUT = 15000;

async function fetchPage(url: string): Promise<CollectedPage> {
  const collectedAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SentinelComplianceAuditor/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    const html = await response.text();
    return { url, html, status: response.status, error: null, collectedAt };
  } catch (err: any) {
    const error =
      err.name === "AbortError"
        ? `Timeout after ${FETCH_TIMEOUT}ms`
        : err.message || String(err);
    return { url, html: null, status: null, error, collectedAt };
  }
}

function discoverLinks(
  baseUrl: string,
  html: string
): { contact: string | null; privacy: string | null; terms: string | null } {
  const base = new URL(baseUrl);
  const candidates = {
    contact: null as string | null,
    privacy: null as string | null,
    terms: null as string | null,
  };

  const linkPatterns: Record<keyof typeof candidates, RegExp[]> = {
    contact: [/contact/i],
    privacy: [/privacy/i, /privacy.policy/i, /datenschutz/i],
    terms: [/terms/i, /tos\b/i, /terms.of.service/i, /terms.and.conditions/i],
  };

  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    for (const [key, patterns] of Object.entries(linkPatterns)) {
      if (candidates[key as keyof typeof candidates]) continue;
      if (patterns.some((p) => p.test(href))) {
        try {
          const resolved = new URL(href, base).toString();
          const resolvedHost = new URL(resolved).hostname;
          if (resolvedHost === base.hostname) {
            candidates[key as keyof typeof candidates] = resolved;
          }
        } catch {}
      }
    }
  }

  return candidates;
}

async function collectEvidence(websiteUrl: string): Promise<CollectionResult> {
  if (!isUrlSafe(websiteUrl)) {
    fatal(`URL is not safe for collection (private/local network): ${websiteUrl}`);
  }

  console.log(`[collect] Fetching homepage: ${websiteUrl}`);
  const homepage = await fetchPage(websiteUrl);

  if (!homepage.html || homepage.status !== 200) {
    fatal(
      `Homepage collection failed: ${homepage.error || `HTTP ${homepage.status}`}. ` +
        `Cannot proceed without homepage HTML.`
    );
  }

  const discovered = discoverLinks(websiteUrl, homepage.html);
  const coverageLimitations: string[] = [];

  const fetchOrNote = async (
    name: string,
    url: string | null
  ): Promise<CollectedPage | null> => {
    if (!url) {
      coverageLimitations.push(
        `No ${name} page link discovered in homepage HTML. This does not confirm the page is absent — it may be loaded dynamically or linked from other pages.`
      );
      return null;
    }
    console.log(`[collect] Fetching ${name}: ${url}`);
    const page = await fetchPage(url);
    if (!page.html) {
      coverageLimitations.push(
        `${name} page at ${url} could not be fetched: ${page.error}. This is a collection limitation, not a confirmed policy absence.`
      );
    }
    return page;
  };

  const [contact, privacy, terms] = await Promise.all([
    fetchOrNote("contact", discovered.contact),
    fetchOrNote("privacy", discovered.privacy),
    fetchOrNote("terms", discovered.terms),
  ]);

  return { homepage, contact, privacy, terms, coverageLimitations };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

interface AuditMetadata {
  auditId: string;
  companyName: string;
  websiteUrl: string;
  purchaseTier: string;
  collectedAt: string;
  analysisCompletedAt: string | null;
  pagesCollected: string[];
  coverageLimitations: string[];
  findingsCount: number;
  status: "GENERATED_AWAITING_REVIEW" | "COLLECTION_FAILED" | "ANALYSIS_FAILED";
  supabaseSaved: boolean;
}

function generateAuditReport(
  meta: AuditMetadata,
  findings: GeneratedFinding[],
  execSummary: string,
  riskAnalysis: string,
  tier: "audit" | "blueprint"
): string {
  const lines: string[] = [];

  lines.push(`# Sentinel Compliance Audit Report`);
  lines.push(``);
  lines.push(`> **STATUS: GENERATED — AWAITING HUMAN REVIEW**`);
  lines.push(`> This report was generated by automated analysis and has not yet been reviewed by a compliance specialist.`);
  lines.push(`> Findings must be verified against collected evidence before delivery.`);
  lines.push(``);
  lines.push(`**Company:** ${meta.companyName}`);
  lines.push(`**Website:** ${meta.websiteUrl}`);
  lines.push(`**Audit ID:** ${meta.auditId}`);
  lines.push(`**Date:** ${meta.collectedAt}`);
  lines.push(`**Pages Collected:** ${meta.pagesCollected.join(", ") || "Homepage only"}`);
  lines.push(``);

  if (meta.coverageLimitations.length > 0) {
    lines.push(`## Coverage Limitations`);
    lines.push(``);
    for (const lim of meta.coverageLimitations) {
      lines.push(`- ${lim}`);
    }
    lines.push(``);
  }

  lines.push(`## Executive Summary`);
  lines.push(``);
  lines.push(execSummary);
  lines.push(``);

  lines.push(`## Risk Analysis`);
  lines.push(``);
  lines.push(riskAnalysis);
  lines.push(``);

  lines.push(`## Findings`);
  lines.push(``);

  if (findings.length === 0) {
    lines.push(`No actionable findings were identified from the collected evidence.`);
  } else {
    const bySeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
    for (const sev of bySeverity) {
      const sevFindings = findings.filter((f) => f.severity === sev);
      if (sevFindings.length === 0) continue;

      lines.push(`### ${sev} (${sevFindings.length})`);
      lines.push(``);

      for (const f of sevFindings) {
        lines.push(`#### ${f.finding_title}`);
        lines.push(``);
        lines.push(`- **Category:** ${f.category}`);
        lines.push(`- **Status:** ${f.status}`);
        if (f.evidence_snippet) {
          lines.push(`- **Evidence:** ${f.evidence_snippet}`);
        }
        lines.push(``);

        if (tier === "blueprint") {
          if (f.remediation_plan) {
            lines.push(`**Remediation Plan:**`);
            lines.push(``);
            lines.push(f.remediation_plan);
            lines.push(``);
          }
          if (f.ai_fix_code) {
            lines.push(`**Suggested Fix:**`);
            lines.push(``);
            lines.push("```");
            lines.push(f.ai_fix_code);
            lines.push("```");
            lines.push(``);
          }
        }
      }
    }
  }

  if (tier === "audit") {
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`*Detailed remediation plans and code fixes are available in the Sentinel Blueprint ($300 upgrade).*`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*Report generated by Sentinel Compliance Engine. Awaiting human review before delivery.*`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Supabase (opt-in)
// ---------------------------------------------------------------------------

async function saveToSupabase(
  meta: AuditMetadata,
  findings: GeneratedFinding[],
  execSummary: string,
  riskAnalysis: string,
  remediationOverview: string
): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --save-supabase"
    );
  }

  const supabase = createClient(url, key);

  // Probe schema before writing — check that the audits table exists and has expected columns
  const { error: probeError } = await supabase
    .from("audits")
    .select("id")
    .limit(0);

  if (probeError) {
    throw new Error(
      `Supabase schema probe failed on "audits" table: ${probeError.message}. ` +
        `Verify the table exists and RLS allows service-role access.`
    );
  }

  const { error: insertError } = await supabase.from("audits").insert({
    id: meta.auditId,
    company_name: meta.companyName,
    website_url: meta.websiteUrl,
    purchase_tier: meta.purchaseTier,
    findings_count: meta.findingsCount,
    exec_summary: execSummary,
    risk_analysis: riskAnalysis,
    remediation_overview: remediationOverview,
    findings_json: JSON.stringify(findings),
    status: meta.status,
    collected_at: meta.collectedAt,
    analysis_completed_at: meta.analysisCompletedAt,
    coverage_limitations: meta.coverageLimitations,
  });

  if (insertError) {
    throw new Error(`Supabase insert failed: ${insertError.message}`);
  }

  console.log(`[supabase] Saved audit ${meta.auditId} to Supabase.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    fatal(
      "No Gemini API key found. Set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY."
    );
  }

  const auditId = `aud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const auditDir = path.join("reports", auditId);
  const evidenceDir = path.join(auditDir, "evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });

  console.log(`\n=== Sentinel Manual Audit Runner ===`);
  console.log(`Audit ID:  ${auditId}`);
  console.log(`Company:   ${args.companyName}`);
  console.log(`URL:       ${args.websiteUrl}`);
  console.log(`Tier:      ${args.purchaseTier}`);
  console.log(`Output:    ${auditDir}/`);
  console.log(``);

  // --- Step 1: Collect evidence ---
  console.log(`[1/4] Collecting website evidence...`);
  const evidence = await collectEvidence(args.websiteUrl);

  const pagesCollected: string[] = ["homepage"];
  fs.writeFileSync(
    path.join(evidenceDir, "homepage.html"),
    evidence.homepage.html!
  );

  if (evidence.contact?.html) {
    fs.writeFileSync(path.join(evidenceDir, "contact.html"), evidence.contact.html);
    pagesCollected.push("contact");
  }
  if (evidence.privacy?.html) {
    fs.writeFileSync(path.join(evidenceDir, "privacy.html"), evidence.privacy.html);
    pagesCollected.push("privacy");
  }
  if (evidence.terms?.html) {
    fs.writeFileSync(path.join(evidenceDir, "terms.html"), evidence.terms.html);
    pagesCollected.push("terms");
  }

  const collectionManifest = {
    homepage: { url: evidence.homepage.url, status: evidence.homepage.status, collectedAt: evidence.homepage.collectedAt },
    contact: evidence.contact ? { url: evidence.contact.url, status: evidence.contact.status, error: evidence.contact.error, collectedAt: evidence.contact.collectedAt } : null,
    privacy: evidence.privacy ? { url: evidence.privacy.url, status: evidence.privacy.status, error: evidence.privacy.error, collectedAt: evidence.privacy.collectedAt } : null,
    terms: evidence.terms ? { url: evidence.terms.url, status: evidence.terms.status, error: evidence.terms.error, collectedAt: evidence.terms.collectedAt } : null,
    coverageLimitations: evidence.coverageLimitations,
  };
  fs.writeFileSync(
    path.join(evidenceDir, "manifest.json"),
    JSON.stringify(collectionManifest, null, 2)
  );

  console.log(`  Collected: ${pagesCollected.join(", ")}`);
  if (evidence.coverageLimitations.length > 0) {
    console.log(`  Limitations: ${evidence.coverageLimitations.length} noted`);
  }

  // --- Step 2: Run analysis ---
  console.log(`[2/4] Running Gemini analysis...`);
  const result = await analyzeHtmlAndGenerateFindings(
    evidence.homepage.html!,
    evidence.contact?.html || undefined,
    evidence.privacy?.html || undefined
  );

  const analysisCompletedAt = new Date().toISOString();
  console.log(`  Findings: ${result.findings.length}`);
  console.log(`  Summaries: exec_summary, risk_analysis, remediation_overview`);

  // --- Step 3: Save outputs ---
  console.log(`[3/4] Saving outputs...`);

  // Full raw output (internal — includes remediation plans regardless of tier)
  fs.writeFileSync(
    path.join(auditDir, "raw-output.json"),
    JSON.stringify(
      {
        auditId,
        companyName: args.companyName,
        websiteUrl: args.websiteUrl,
        purchaseTier: args.purchaseTier,
        analysisCompletedAt,
        ...result,
      },
      null,
      2
    )
  );

  const meta: AuditMetadata = {
    auditId,
    companyName: args.companyName,
    websiteUrl: args.websiteUrl,
    purchaseTier: args.purchaseTier,
    collectedAt: evidence.homepage.collectedAt,
    analysisCompletedAt,
    pagesCollected,
    coverageLimitations: evidence.coverageLimitations,
    findingsCount: result.findings.length,
    status: "GENERATED_AWAITING_REVIEW",
    supabaseSaved: false,
  };

  // Customer-facing report (tier-appropriate)
  const report = generateAuditReport(
    meta,
    result.findings,
    result.exec_summary,
    result.risk_analysis,
    args.purchaseTier
  );
  fs.writeFileSync(path.join(auditDir, "audit-report.md"), report);

  // --- Step 4: Optional Supabase save ---
  if (args.saveSupabase) {
    console.log(`[4/4] Saving to Supabase...`);
    try {
      await saveToSupabase(
        meta,
        result.findings,
        result.exec_summary,
        result.risk_analysis,
        result.remediation_overview
      );
      meta.supabaseSaved = true;
    } catch (err: any) {
      console.error(`[4/4] Supabase save FAILED: ${err.message}`);
      meta.supabaseSaved = false;
      // Record failure but don't exit — local files are still saved
    }
  } else {
    console.log(`[4/4] Supabase save skipped (use --save-supabase to enable).`);
  }

  // Save metadata last (includes supabaseSaved status)
  fs.writeFileSync(
    path.join(auditDir, "metadata.json"),
    JSON.stringify(meta, null, 2)
  );

  console.log(``);
  console.log(`=== Audit Complete ===`);
  console.log(`Status:   ${meta.status}`);
  console.log(`Findings: ${meta.findingsCount}`);
  console.log(`Report:   ${path.join(auditDir, "audit-report.md")}`);
  console.log(`Raw JSON: ${path.join(auditDir, "raw-output.json")}`);
  console.log(`Evidence: ${evidenceDir}/`);
  if (args.saveSupabase) {
    console.log(`Supabase: ${meta.supabaseSaved ? "saved" : "FAILED"}`);
  }
  console.log(``);
  console.log(`⚠  This report requires human review before customer delivery.`);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
