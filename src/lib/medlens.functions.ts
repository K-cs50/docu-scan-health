import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EXTRACTION_MODEL,
  GatewayError,
  SUMMARY_MODEL,
  callGemini,
  stripJsonFence,
  toBase64,
} from "./ai.server";

/* ------------------------------------------------------------------ */
/* Validation schema for Gemini output — nothing is stored unless it    */
/* passes this contract.                                                */
/* ------------------------------------------------------------------ */

const nullableString = z.union([z.string(), z.number(), z.null()]).optional();

const ExtractionSchema = z.object({
  document_type: z.string().default("Other medical document"),
  document_date: nullableString,
  provider: nullableString,
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        strength: nullableString,
        frequency: nullableString,
        start_date: nullableString,
        end_date: nullableString,
        source_page: z.union([z.number(), z.null()]).optional(),
        source_snippet: nullableString,
      }),
    )
    .default([]),
  lab_results: z
    .array(
      z.object({
        name: z.string().min(1),
        value: nullableString,
        unit: nullableString,
        reference_range: nullableString,
        date: nullableString,
        source_page: z.union([z.number(), z.null()]).optional(),
        source_snippet: nullableString,
      }),
    )
    .default([]),
  conditions: z
    .array(
      z.object({
        name: z.string().min(1),
        source_page: z.union([z.number(), z.null()]).optional(),
        source_snippet: nullableString,
      }),
    )
    .default([]),
  procedures: z
    .array(
      z.object({
        name: z.string().min(1),
        date: nullableString,
        source_page: z.union([z.number(), z.null()]).optional(),
        source_snippet: nullableString,
      }),
    )
    .default([]),
  notes: z
    .array(
      z.object({
        text: z.string().min(1),
        source_page: z.union([z.number(), z.null()]).optional(),
      }),
    )
    .default([]),
});

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const EXTRACTION_SYSTEM = `You are a medical document information extractor for MedLens.
Rules you must never break:
- Extract ONLY information explicitly present in the document.
- Never diagnose, never prescribe, never advise, never suggest medication or dosage changes.
- Never invent values, dates, units, reference ranges, frequencies or page numbers. Use null when absent.
- source_page must be the real page/image number the value appears on, else null.
- source_snippet must be a short verbatim quote copied from the document, else null.
Return ONLY a JSON object with exactly these keys:
{"document_type","document_date","provider","medications","lab_results","conditions","procedures","notes"}
document_type must be one of: "Prescription", "Laboratory report", "Discharge summary", "Medical report", "Other medical document".
medications: [{name,strength,frequency,start_date,end_date,source_page,source_snippet}]
lab_results: [{name,value,unit,reference_range,date,source_page,source_snippet}]
conditions: [{name,source_page,source_snippet}] — only diagnoses explicitly written in the document.
procedures: [{name,date,source_page,source_snippet}]
notes: [{text,source_page}]
No markdown, no commentary.`;

/* ------------------------------------------------------------------ */
/* Process a document: download -> Gemini -> validate -> store          */
/* ------------------------------------------------------------------ */

export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ documentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docError) throw new Error("Could not read the document record.");
    if (!doc) throw new Error("Document not found.");

    await supabase
      .from("documents")
      .update({ status: "PROCESSING", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", doc.id);

    const fail = async (status: string, message: string) => {
      await supabase
        .from("documents")
        .update({ status, error_message: message, updated_at: new Date().toISOString() })
        .eq("id", doc.id);
      await supabase.from("audit_logs").insert({
        user_id: userId,
        entity_type: "document",
        entity_id: doc.id,
        document_id: doc.id,
        action: status === "FAILED" ? "PROCESSING_FAILED" : "REVIEW_REQUIRED",
        detail: message,
      });
      return { ok: false as const, status, message };
    };

    // 1. Download the original file (kept safe in private storage regardless of AI result)
    const { data: blob, error: dlError } = await supabase.storage
      .from("medical-documents")
      .download(doc.storage_path);
    if (dlError || !blob) return fail("FAILED", "The uploaded file could not be read.");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64 = toBase64(bytes);
    const dataUrl = `data:${doc.mime_type};base64,${base64}`;

    // 2. Gemini structured extraction (document understanding + classification)
    let raw: string;
    try {
      raw = await callGemini({
        model: EXTRACTION_MODEL,
        system: EXTRACTION_SYSTEM,
        content: [
          {
            type: "text",
            text: `Extract the structured medical information from this document (file name: ${doc.file_name}).`,
          },
          doc.mime_type === "application/pdf"
            ? { type: "file" as const, file: { filename: doc.file_name, file_data: dataUrl } }
            : { type: "image_url" as const, image_url: { url: dataUrl } },
        ],
      });
    } catch (error) {
      const message =
        error instanceof GatewayError
          ? error.message
          : "The AI service could not be reached. You can retry.";
      return fail("FAILED", message);
    }

    // 3. Strict validation before anything is stored
    let parsed: z.infer<typeof ExtractionSchema>;
    try {
      parsed = ExtractionSchema.parse(JSON.parse(stripJsonFence(raw)));
    } catch {
      return fail(
        "REVIEW REQUIRED",
        "The extracted information did not pass validation, so nothing was saved. The original document is kept — you can retry.",
      );
    }

    // 4. Replace previous extraction for this document, then store
    await supabase.from("extracted_records").delete().eq("document_id", doc.id);
    await supabase.from("medications").delete().eq("document_id", doc.id);

    const records = [
      ...parsed.lab_results.map((r) => ({
        kind: "lab_result",
        label: r.name,
        value: str(r.value),
        unit: str(r.unit),
        reference_range: str(r.reference_range),
        record_date: str(r.date) ?? str(parsed.document_date),
        source_page: typeof r.source_page === "number" ? r.source_page : null,
        source_snippet: str(r.source_snippet),
      })),
      ...parsed.medications.map((m) => ({
        kind: "medication",
        label: m.name,
        value: [str(m.strength), str(m.frequency)].filter(Boolean).join(" · ") || null,
        unit: null,
        reference_range: null,
        record_date: str(m.start_date) ?? str(parsed.document_date),
        source_page: typeof m.source_page === "number" ? m.source_page : null,
        source_snippet: str(m.source_snippet),
      })),
      ...parsed.conditions.map((c) => ({
        kind: "condition",
        label: c.name,
        value: null,
        unit: null,
        reference_range: null,
        record_date: str(parsed.document_date),
        source_page: typeof c.source_page === "number" ? c.source_page : null,
        source_snippet: str(c.source_snippet),
      })),
      ...parsed.procedures.map((p) => ({
        kind: "procedure",
        label: p.name,
        value: null,
        unit: null,
        reference_range: null,
        record_date: str(p.date) ?? str(parsed.document_date),
        source_page: typeof p.source_page === "number" ? p.source_page : null,
        source_snippet: str(p.source_snippet),
      })),
      ...parsed.notes.map((n) => ({
        kind: "note",
        label: n.text.slice(0, 120),
        value: n.text,
        unit: null,
        reference_range: null,
        record_date: str(parsed.document_date),
        source_page: typeof n.source_page === "number" ? n.source_page : null,
        source_snippet: null,
      })),
    ].map((r) => ({
      ...r,
      user_id: userId,
      document_id: doc.id,
      original_value: r.value,
      provenance: "DOCUMENT",
      verification_status: "UNVERIFIED",
    }));

    let insertedMedRecords: Array<{ id: string; label: string }> = [];
    if (records.length) {
      const { data: inserted, error: insertError } = await supabase
        .from("extracted_records")
        .insert(records)
        .select("id,label,kind");
      if (insertError) return fail("FAILED", "The extracted information could not be saved.");
      insertedMedRecords = (inserted ?? [])
        .filter((r) => r.kind === "medication")
        .map((r) => ({ id: r.id, label: r.label }));
    }

    if (parsed.medications.length) {
      const meds = parsed.medications.map((m) => ({
        user_id: userId,
        document_id: doc.id,
        record_id: insertedMedRecords.find((r) => r.label === m.name)?.id ?? null,
        name: m.name,
        strength: str(m.strength),
        frequency: str(m.frequency),
        start_date: str(m.start_date),
        end_date: str(m.end_date),
        verification_status: "UNVERIFIED",
      }));
      await supabase.from("medications").insert(meds);
    }

    await supabase
      .from("documents")
      .update({
        status: "READY",
        error_message: null,
        document_type: parsed.document_type,
        document_date: str(parsed.document_date),
        provider: str(parsed.provider),
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert([
      {
        user_id: userId,
        entity_type: "document",
        entity_id: doc.id,
        document_id: doc.id,
        action: "DOCUMENT_PROCESSED",
        detail: `Classified as ${parsed.document_type} by Gemini (${EXTRACTION_MODEL}).`,
      },
      {
        user_id: userId,
        entity_type: "document",
        entity_id: doc.id,
        document_id: doc.id,
        action: "INFORMATION_EXTRACTED",
        detail: `${records.length} item(s) extracted — all marked UNVERIFIED.`,
      },
    ]);

    return { ok: true as const, count: records.length, documentType: parsed.document_type };
  });

/* ------------------------------------------------------------------ */
/* AI summary — validated (verified/edited) information only            */
/* ------------------------------------------------------------------ */

export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: records } = await supabase
      .from("extracted_records")
      .select("kind,label,value,unit,record_date,verification_status")
      .in("verification_status", ["VERIFIED", "EDITED"])
      .order("created_at", { ascending: true });

    if (!records || records.length === 0) {
      return {
        ok: false as const,
        message:
          "No verified information yet. Verify at least one extracted item before generating a summary.",
      };
    }

    const lines = records
      .map(
        (r) =>
          `- [${r.kind}] ${r.label}: ${r.value ?? "Not available in source."}${
            r.unit ? " " + r.unit : ""
          } (date: ${r.record_date ?? "Not available in source."}, ${r.verification_status})`,
      )
      .join("\n");

    let summary: string;
    try {
      summary = await callGemini({
        model: SUMMARY_MODEL,
        system: `You write plain-language summaries of already-verified medical record data for MedLens.
Hard rules: never diagnose, never prescribe, never recommend treatment or medication changes, never add any fact that is not in the provided list, never invent dates or values.
Write 4-7 short sentences. Begin with exactly: "Based on the uploaded records..."`,
        content: `Verified information:\n${lines}`,
      });
    } catch (error) {
      const message =
        error instanceof GatewayError ? error.message : "The AI service could not be reached.";
      return { ok: false as const, message };
    }

    const { data: saved } = await supabase
      .from("ai_summaries")
      .insert({ user_id: userId, summary, model: SUMMARY_MODEL })
      .select("id,summary,created_at")
      .single();

    await supabase.from("audit_logs").insert({
      user_id: userId,
      entity_type: "summary",
      entity_id: saved?.id ?? null,
      action: "AI_SUMMARY_GENERATED",
      detail: `Generated from ${records.length} verified item(s) by ${SUMMARY_MODEL}.`,
    });

    return { ok: true as const, summary, model: SUMMARY_MODEL };
  });
