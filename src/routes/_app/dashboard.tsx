import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip, StatusBadge } from "@/components/medlens/badges";
import { UploadCard } from "@/components/medlens/upload-card";
import { WorkflowBar } from "@/components/medlens/workflow-bar";
import { supabase } from "@/integrations/supabase/client";
import { generateSummary } from "@/lib/medlens.functions";
import { fmtDate, fmtDateTime } from "@/lib/medlens";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MedLens" },
      {
        name: "description",
        content:
          "Overview of your documents, medications, verification progress and recent record activity.",
      },
      { property: "og:title", content: "Dashboard — MedLens" },
      { property: "og:description", content: "Your traceable medical record at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const runSummary = useServerFn(generateSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [patient, documents, records, medications, events, summary] = await Promise.all([
        supabase.from("patients").select("*").limit(1).maybeSingle(),
        supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("extracted_records").select("id,verification_status"),
        supabase.from("medications").select("id,verification_status"),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(6),
        supabase
          .from("ai_summaries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        patient: patient.data,
        documents: documents.data ?? [],
        records: records.data ?? [],
        medications: medications.data ?? [],
        events: events.data ?? [],
        summary: summary.data,
      };
    },
  });

  const summaryMutation = useMutation({
    mutationFn: async () => runSummary({}),
    onSuccess: (result) => {
      if (result.ok) toast.success("AI summary generated from verified information.");
      else toast.error(result.message);
      qc.invalidateQueries();
    },
    onError: () => toast.error("The AI summary could not be generated. You can retry."),
  });

  const records = data?.records ?? [];
  const verified = records.filter(
    (r) => r.verification_status === "VERIFIED" || r.verification_status === "EDITED",
  ).length;
  const unverified = records.filter((r) => r.verification_status === "UNVERIFIED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {data?.patient?.full_name ? `${data.patient.full_name}'s records` : "Your records"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a document, let Gemini structure it, then verify every value before it counts.
          </p>
        </div>
        <WorkflowBar />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documents" value={data?.documents.length ?? 0} hint="Most recent 5 shown" />
        <Stat label="Extracted items" value={records.length} hint="Across all documents" />
        <Stat label="Verified" value={verified} hint="Confirmed by you" />
        <Stat label="Awaiting review" value={unverified} hint="Still UNVERIFIED" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <UploadCard />

          <section className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Recent documents</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/documents">View all</Link>
              </Button>
            </div>
            {isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : data?.documents.length ? (
              <ul className="mt-4 divide-y divide-border">
                {data.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        to="/documents/$documentId"
                        params={{ documentId: doc.id }}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {doc.file_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type} · {fmtDate(doc.document_date)}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No documents yet. Upload one above to see MedLens work end to end.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-display text-base font-semibold">AI summary</h2>
            </div>
            <Chip tone="ai" className="mt-3">
              AI-generated summary
            </Chip>
            <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
              {data?.summary?.summary ??
                "No summary yet. Verify at least one extracted item, then generate a summary built only from verified information."}
            </p>
            {data?.summary && (
              <p className="mt-2 text-xs text-muted-foreground">
                Generated {fmtDateTime(data.summary.created_at)} · {data.summary.model}
              </p>
            )}
            <Button
              className="mt-4 w-full"
              variant="outline"
              disabled={summaryMutation.isPending}
              onClick={() => summaryMutation.mutate()}
            >
              {summaryMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {data?.summary ? "Regenerate summary" : "Generate summary"}
            </Button>
          </section>

          <section className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Recent activity</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/timeline">Timeline</Link>
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {data?.events.length ? (
                data.events.map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="font-medium">{e.action.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmtDateTime(e.created_at)} · {e.detail ?? ""}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">Nothing recorded yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="surface p-5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
