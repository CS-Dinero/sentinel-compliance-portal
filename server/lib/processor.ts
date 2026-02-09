import {
  getAuditRecord,
  updateAuditRecord,
  createFindingsBatch,
  type FindingRecord,
} from "./airtable";
import { analyzeHtmlAndGenerateFindings, type GeneratedFinding } from "./llm";
import { generateCacheKey, getCachedRemediation, setCachedRemediation } from "./cache";

export interface ProcessResult {
  ok: boolean;
  audit_record_id: string;
  findings_created?: number;
  status: "COMPLETE" | "FAILED" | "PENDING";
  error?: string;
}

export async function processAudit(auditRecordId: string): Promise<ProcessResult> {
  console.log(`[Bot B] Starting audit processing for: ${auditRecordId}`);

  // Update status to RUNNING
  await updateAuditRecord(auditRecordId, { bot_b_status: "RUNNING" });

  try {
    // Fetch the audit record
    const audit = await getAuditRecord(auditRecordId);
    if (!audit) {
      throw new Error(`Audit record not found: ${auditRecordId}`);
    }

    // Validate required field
    if (!audit.html_home) {
      throw new Error("Missing required field: html_home");
    }

    // Generate findings using LLM
    const result = await analyzeHtmlAndGenerateFindings(
      audit.html_home,
      audit.html_contact,
      audit.html_privacy,
      audit.policy_text,
      audit.tech_stack_json,
      audit.forms_detected_json
    );

    // Apply caching for remediation plans
    const findingsWithCache = result.findings.map((finding: GeneratedFinding) => {
      const cacheKey = generateCacheKey({
        finding_title: finding.finding_title,
        category: finding.category,
        severity: finding.severity,
        evidence_snippet: finding.evidence_snippet,
      });

      const cachedRemediation = getCachedRemediation(cacheKey);
      if (cachedRemediation) {
        finding.remediation_plan = cachedRemediation;
      } else {
        setCachedRemediation(cacheKey, finding.remediation_plan);
      }

      return finding;
    });

    // Prepare findings for Airtable
    const findingRecords: FindingRecord[] = findingsWithCache.map((f: GeneratedFinding) => ({
      audit: [auditRecordId],
      severity: f.severity,
      status: f.status || "OPEN",
      category: f.category,
      finding_title: f.finding_title,
      remediation_plan: f.remediation_plan,
      ai_fix_code: f.ai_fix_code,
      edge_score_component: f.edge_score_component,
    }));

    // Write findings to Airtable in batches
    const { created, failed } = await createFindingsBatch(findingRecords);
    console.log(`[Bot B] Created ${created} findings, ${failed} failed`);

    // Update audit record with results
    const now = new Date().toISOString();
    await updateAuditRecord(auditRecordId, {
      bot_b_status: "COMPLETE",
      exec_summary: result.exec_summary,
      risk_analysis: result.risk_analysis,
      remediation_overview: result.remediation_overview,
      scan_completed_at: now,
      last_error: "",
    });

    console.log(`[Bot B] Audit processing complete for: ${auditRecordId}`);

    return {
      ok: true,
      audit_record_id: auditRecordId,
      findings_created: created,
      status: "COMPLETE",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Bot B] Audit processing failed for ${auditRecordId}:`, errorMessage);

    // Check if it's a rate limit error - mark as PENDING instead of FAILED
    const isRateLimitError =
      errorMessage.includes("429") ||
      errorMessage.includes("quota") ||
      errorMessage.toLowerCase().includes("rate limit");

    const status = isRateLimitError ? "PENDING" : "FAILED";

    await updateAuditRecord(auditRecordId, {
      bot_b_status: status,
      last_error: errorMessage,
    });

    return {
      ok: false,
      audit_record_id: auditRecordId,
      status: status,
      error: errorMessage,
    };
  }
}
