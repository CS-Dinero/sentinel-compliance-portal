import Airtable from "airtable";
import { shieldAuditPatchFields, shieldFindingCreateFields } from "./writeShield";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";

let base: Airtable.Base | null = null;
let auditsTable: Airtable.Table<any> | null = null;
let findingsTable: Airtable.Table<any> | null = null;

function initAirtable() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn("[Airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID - Airtable operations will fail");
    return false;
  }
  
  Airtable.configure({
    apiKey: AIRTABLE_API_KEY,
  });
  
  base = Airtable.base(AIRTABLE_BASE_ID);
  auditsTable = base("Audits");
  findingsTable = base("Findings");
  console.log("[Airtable] Initialized successfully");
  return true;
}

const isInitialized = initAirtable();

function ensureInitialized() {
  if (!isInitialized || !auditsTable || !findingsTable) {
    throw new Error("Airtable not configured - missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID secrets");
  }
}

export { auditsTable, findingsTable };

export interface AuditRecord {
  id: string;
  client?: string[];
  client_email?: string;
  purchase_tier?: string;
  html_home?: string;
  html_contact?: string;
  html_privacy?: string;
  policy_text?: string;
  tech_stack_json?: string;
  forms_detected_json?: string;
  bot_a_status?: string;
  bot_b_status?: string;
  exec_summary?: string;
  risk_analysis?: string;
  remediation_overview?: string;
  last_error?: string;
  scan_completed_at?: string;
}

export interface FindingRecord {
  audit?: string[];
  severity?: string;
  status?: string;
  category?: string;
  finding_title?: string;
  remediation_plan?: string;
  ai_fix_code?: string;
  edge_score_component?: number;
}

export async function getAuditRecord(recordId: string): Promise<AuditRecord | null> {
  try {
    ensureInitialized();
    const record = await auditsTable!.find(recordId);
    return {
      id: record.id,
      client: record.get("client") as string[] | undefined,
      client_email: record.get("client_email") as string | undefined,
      purchase_tier: record.get("purchase_tier") as string | undefined,
      html_home: record.get("html_home") as string | undefined,
      html_contact: record.get("html_contact") as string | undefined,
      html_privacy: record.get("html_privacy") as string | undefined,
      policy_text: record.get("policy_text") as string | undefined,
      tech_stack_json: record.get("tech_stack_json") as string | undefined,
      forms_detected_json: record.get("forms_detected_json") as string | undefined,
      bot_a_status: record.get("bot_a_status") as string | undefined,
      bot_b_status: record.get("bot_b_status") as string | undefined,
      exec_summary: record.get("exec_summary") as string | undefined,
      risk_analysis: record.get("risk_analysis") as string | undefined,
      remediation_overview: record.get("remediation_overview") as string | undefined,
      last_error: record.get("last_error") as string | undefined,
      scan_completed_at: record.get("scan_completed_at") as string | undefined,
    };
  } catch (error) {
    console.error("Error fetching audit record:", error);
    return null;
  }
}

export async function updateAuditRecord(
  recordId: string,
  fields: Partial<{
    bot_b_status: string;
    exec_summary: string;
    risk_analysis: string;
    remediation_overview: string;
    last_error: string;
    scan_completed_at: string;
  }>
): Promise<boolean> {
  try {
    ensureInitialized();
    const safeFields = shieldAuditPatchFields(fields);
    if (Object.keys(safeFields).length === 0) {
      console.error("[Airtable] PATCH aborted - all fields were blocked by Write Shield");
      return false;
    }
    await auditsTable!.update(recordId, safeFields);
    return true;
  } catch (error) {
    console.error("Error updating audit record:", error);
    return false;
  }
}

export async function createFindingRecord(fields: FindingRecord): Promise<string | null> {
  try {
    ensureInitialized();
    const safeFields = shieldFindingCreateFields(fields);
    if (Object.keys(safeFields).length === 0) {
      console.error("[Airtable] CREATE aborted - all fields were blocked by Write Shield");
      return null;
    }
    const record = await findingsTable!.create(safeFields as any) as any;
    return record.id;
  } catch (error) {
    console.error("Error creating finding record:", error);
    return null;
  }
}

export async function createFindingsBatch(
  findings: FindingRecord[]
): Promise<{ created: number; failed: number }> {
  ensureInitialized();
  let created = 0;
  let failed = 0;

  // Airtable batch limit is 10 records at a time
  const batchSize = 10;
  for (let i = 0; i < findings.length; i += batchSize) {
    const batch = findings.slice(i, i + batchSize);
    try {
      const records = batch.map((f) => {
        const safeFields = shieldFindingCreateFields(f);
        return { fields: safeFields };
      });
      const validRecords = records.filter((r) => Object.keys(r.fields).length > 0);
      if (validRecords.length === 0) {
        console.error("[Airtable] Batch CREATE aborted - all fields were blocked");
        failed += batch.length;
        continue;
      }
      await findingsTable!.create(validRecords as any);
      created += validRecords.length;
      failed += batch.length - validRecords.length;
    } catch (error) {
      console.error("Error creating findings batch:", error);
      failed += batch.length;
    }
  }

  return { created, failed };
}
