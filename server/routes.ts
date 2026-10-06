import type { Express } from "express";
import { createServer, type Server } from "http";
import { createClient } from "@supabase/supabase-js";
import { processAudit } from "./lib/processor";
import { z } from "zod";

const processAuditSchema = z.object({
  audit_record_id: z.string().min(1),
  source: z.string().optional(),
});

const stripeWebhookSchema = z.object({
  audit_record_id: z.string().min(1),
});

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  return createClient(url, serviceKey);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Alternative health endpoint matching Gateway pattern
  app.get("/auth/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Main webhook endpoint for processing audits
  app.post("/bot-b/process-audit", async (req, res) => {
    try {
      // Verify webhook secret
      const webhookSecret = process.env.SENTINEL_WEBHOOK_SECRET;
      const providedSecret = req.headers["x-sentinel-webhook-secret"];
      
      if (!webhookSecret || providedSecret !== webhookSecret) {
        console.log("[Bot B] Unauthorized request - invalid webhook secret");
        return res.status(403).json({
          ok: false,
          error: "Forbidden - invalid webhook secret",
        });
      }

      // Validate request body
      const parseResult = processAuditSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: "Invalid request body",
          details: parseResult.error.errors,
        });
      }

      const { audit_record_id, source } = parseResult.data;
      console.log(`[Bot B] Received process-audit request for ${audit_record_id} from ${source || "unknown"}`);

      // Return immediately with QUEUED status (fast response)
      res.json({
        ok: true,
        audit_record_id,
        status: "QUEUED",
      });

      // Process asynchronously (don't await in response path)
      setImmediate(async () => {
        try {
          const result = await processAudit(audit_record_id);
          console.log(`[Bot B] Processing result:`, result);
        } catch (error) {
          console.error(`[Bot B] Async processing error:`, error);
        }
      });
    } catch (error) {
      console.error("[Bot B] Error in process-audit endpoint:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    }
  });

  // Stripe payment webhook — updates paid_at to activate "Engineering Sprint Active" badge
  app.post("/bot-b/stripe-webhook", async (req, res) => {
    try {
      // Verify webhook secret
      const webhookSecret = process.env.SENTINEL_WEBHOOK_SECRET;
      const providedSecret = req.headers["x-sentinel-webhook-secret"];

      if (!webhookSecret || providedSecret !== webhookSecret) {
        console.log("[Bot B] stripe-webhook: unauthorized request");
        return res.status(403).json({
          ok: false,
          error: "Forbidden - invalid webhook secret",
        });
      }

      // Validate request body
      const parseResult = stripeWebhookSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: "Invalid request body",
          details: parseResult.error.errors,
        });
      }

      const { audit_record_id } = parseResult.data;
      console.log(`[Bot B] stripe-webhook: updating paid_at for ticket ${audit_record_id}`);

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("tickets")
        .update({ paid_at: new Date().toISOString() })
        .eq("audit_record_id", audit_record_id)
        .select();

      if (error) {
        console.error("[Bot B] stripe-webhook: Supabase update failed:", error);
        return res.status(500).json({
          ok: false,
          error: "Failed to update ticket",
          details: error.message,
        });
      }

      if (!data || data.length === 0) {
        console.log(`[Bot B] stripe-webhook: no ticket found for audit_record_id=${audit_record_id}`);
        return res.status(404).json({
          ok: false,
          error: "No ticket found for the given audit_record_id",
        });
      }

      console.log(`[Bot B] stripe-webhook: paid_at set for ${data.length} ticket(s) — Engineering Sprint Active badge triggered`);

      return res.json({
        ok: true,
        audit_record_id,
        updated: data.length,
        badge: "Engineering Sprint Active",
      });
    } catch (error) {
      console.error("[Bot B] stripe-webhook error:", error);
      return res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    }
  });

  return httpServer;
}
