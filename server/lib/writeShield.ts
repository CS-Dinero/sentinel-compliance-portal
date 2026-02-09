type Fields = Record<string, any>;

const READ_ONLY_DENYLIST = new Set<string>([
  "edge_score",
  "record_id",
  "client_id",
  "client_record_id_lookup",
  "client_record_id",
  "client_email (from client)",
  "Id",
]);

const AUDITS_WRITE_ALLOWLIST = new Set<string>([
  "bot_b_status",
  "overall_status",
  "scan_completed_at",
  "last_error",
  "exec_summary",
  "risk_analysis",
  "remediation_overview",
  "findings_raw",
  "artifacts_raw",
  "analysis_metadata",
]);

export function shieldAuditPatchFields(input: Fields): Fields {
  const safe: Fields = {};
  const violations: string[] = [];

  for (const [k, v] of Object.entries(input || {})) {
    if (READ_ONLY_DENYLIST.has(k)) {
      violations.push(`DENIED(read-only): ${k}`);
      continue;
    }
    if (!AUDITS_WRITE_ALLOWLIST.has(k)) {
      violations.push(`DENIED(not-allowlisted): ${k}`);
      continue;
    }
    safe[k] = v;
  }

  if (violations.length) {
    console.error("[WRITE_SHIELD] blocked fields:", violations);
  }

  return safe;
}

const FINDINGS_WRITE_ALLOWLIST = new Set<string>([
  "audit",
  "client",
  "title",
  "finding_title",
  "severity",
  "status",
  "description",
  "recommendation",
  "remediation_plan",
  "surface_area",
  "category",
  "edge_score_component",
  "ai_fix_code",
]);

export function shieldFindingCreateFields(input: Fields): Fields {
  const safe: Fields = {};
  const violations: string[] = [];

  for (const [k, v] of Object.entries(input || {})) {
    if (READ_ONLY_DENYLIST.has(k)) {
      violations.push(`DENIED(read-only): ${k}`);
      continue;
    }
    if (!FINDINGS_WRITE_ALLOWLIST.has(k)) {
      violations.push(`DENIED(not-allowlisted): ${k}`);
      continue;
    }
    safe[k] = v;
  }

  if (violations.length) {
    console.error("[WRITE_SHIELD_FINDING] blocked fields:", violations);
  }

  return safe;
}
