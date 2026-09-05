import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Chip,
  ProvenanceBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/medlens/badges";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/medlens.functions";
import { NOT_IN_SOURCE, fmtDate, fmtDateTime } from "@/lib/medlens";

export const Route = createFileRoute("/_app/documents/$documentId")({
  head: () => ({
    meta: [
      { title: "Document details — MedLens" },
      {
        name: "description",
        content:
          "Structured information extracted from this document, with provenance, source snippet and verification controls.",
      },
      { property: "og:title", content: "Document details — MedLens" },
      { property: "og:description", content: "Trace every extracted value back to its source." },
    ],
  }),
  component: DocumentDetail,
});

const KIND_LABEL: Record<string, string> = {
  lab_result: "Laboratory results",
  medication: "Medications",
  condition: "Conditions stated in the document",
  procedure: "Procedures",
  note: "Notes",
};

function DocumentDetail() {
  const { documentId } = Route.useParams();
  const qc = useQueryClient();
  const runProcess = useServerFn(processDocument);
  const [retrying, setRetrying] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const [doc, records, audits] = await Promise.all([
        supabase.from("documents").select("*").eq("id", documentId).maybeSingle(),
        supabase
          .from("extracted_records")
          .select("*")
          .eq("document_id", documentId)
          .order("kind", { ascending: true }),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("document_id", documentId)
          .order("created_at", { ascending: false }),
      ]);
      return { doc: doc.data, records: records.data ?? [], audits: audits.data ?? [] };
    },
  });

  async function log(action: string, entityId: string, detail: string, before?: string | null, after?: string | null) {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    await supabase.from("audit_logs").insert({
      user_id: userRes.user.id,
      entity_type: "record",
      entity_id: entityId,
      document_id: documentId,
      action,
      detail,
      before_value: before ?? null,
      after_value: after ?? null,
    });
  }

  async function setStatus(recordId: string, label: string, status: string) {
    const { error } = await supabase
      .from("extracted_records")
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq("id", recordId);
    if (error) {
      toast.error("The change could not be saved.");
      return;
    }
    await supabase
      .from("medications")
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq("record_id", recordId);
    await log(status === "VERIFIED" ? "RECORD_VERIFIED" : "RECORD_REJECTED", recordId, label);
    toast.success(status === "VERIFIED" ? "Marked as verified." : "Marked as rejected.");
    qc.invalidateQueries();
  }

  async function saveEdit(recordId: string, label: string, previous: string | null) {
    const { error } = await supabase
      .from("extracted_records")
      .update({
        value: draft,
        verification_status: "EDITED",
        provenance: "USER",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);
    if (error) {
      toast.error("The change could not be saved.");
      return;
    }
    await log("RECORD_EDITED", recordId, label, previous, draft);
    setEditing(null);
    toast.success("Value updated — original kept in the audit history.");
    qc.invalidateQueries();
  }

  async function retry() {
    setRetrying(true);
    try {
      const result = await runProcess({ data: { documentId } });
      if (result.ok) toast.success(`Reprocessed — ${result.count} item(s) extracted.`);
      else toast.error(result.message);
    } catch {
      toast.error("Processing failed again. The original document is safe.");
    } finally {
      setRetrying(false);
      qc.invalidateQueries();
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading document…</p>;
  if (!data?.doc)
    return (
      <div className="surface p-6">
        <p className="text-sm">This document could not be found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/documents">Back to documents</Link>
        </Button>
      </div>
    );

  const doc = data.doc;
  const grouped = data.records.reduce<Record<string, typeof data.records>>((acc, r) => {
    (acc[r.kind] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/documents" className="text-xs text-muted-foreground hover:underline">
            ← All documents
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{doc.file_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={doc.status} />
            <span>{doc.document_type}</span>
            <span>· Document date: {fmtDate(doc.document_date)}</span>
            <span>· Provider: {doc.provider ?? NOT_IN_SOURCE}</span>
          </div>
        </div>
        <Button variant="outline" onClick={retry} disabled={retrying}>
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Reprocess with Gemini
        </Button>
      </div>

      {doc.error_message && (
        <div className="surface border-warning/40 bg-warning/10 p-4 text-sm">{doc.error_message}</div>
      )}

      {data.records.length === 0 ? (
        <div className="surface p-6 text-sm text-muted-foreground">
          No structured information stored for this document yet.
        </div>
      ) : (
        Object.entries(grouped).map(([kind, rows]) => (
          <section key={kind} className="surface overflow-hidden">
            <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">
              {KIND_LABEL[kind] ?? kind}
            </h2>
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.label}</span>
                        <ProvenanceBadge provenance={r.provenance} />
                        <VerificationBadge status={r.verification_status} />
                      </div>

                      {editing === r.id ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={() => saveEdit(r.id, r.label, r.value)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-1 font-mono text-sm">
                          {r.value ?? NOT_IN_SOURCE}
                          {r.unit ? ` ${r.unit}` : ""}
                          {r.reference_range ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ref {r.reference_range}
                            </span>
                          ) : null}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        Source: {doc.file_name} · Page:{" "}
                        {r.source_page ?? NOT_IN_SOURCE} · Date: {fmtDate(r.record_date)}
                      </p>
                      {r.source_snippet && (
                        <p className="mt-2 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
                          “{r.source_snippet}”
                        </p>
                      )}
                      {r.original_value && r.original_value !== r.value && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Originally extracted: {r.original_value}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, r.label, "VERIFIED")}>
                        <Check className="size-4" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(r.id);
                          setDraft(r.value ?? "");
                        }}
                      >
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, r.label, "REJECTED")}>
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="surface p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold">Audit history</h2>
          <Chip tone="neutral">Immutable log</Chip>
        </div>
        <ul className="mt-4 space-y-3 text-sm">
          {data.audits.length ? (
            data.audits.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.action.replaceAll("_", " ").toLowerCase()}</span>
                <span className="block text-xs text-muted-foreground">
                  {fmtDateTime(a.created_at)} · {a.detail ?? ""}
                  {a.before_value ? ` · was: ${a.before_value}` : ""}
                  {a.after_value ? ` · now: ${a.after_value}` : ""}
                </span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">No activity recorded yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
