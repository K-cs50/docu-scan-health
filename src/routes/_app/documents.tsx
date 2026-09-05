import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { StatusBadge } from "@/components/medlens/badges";
import { UploadCard } from "@/components/medlens/upload-card";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtDateTime } from "@/lib/medlens";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — MedLens" },
      {
        name: "description",
        content:
          "All uploaded prescriptions, lab reports and summaries with their processing and verification status.",
      },
      { property: "og:title", content: "Documents — MedLens" },
      { property: "og:description", content: "Every uploaded medical document in one place." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Originals are stored privately. Nothing is deleted if AI processing fails.
        </p>
      </div>

      <UploadCard compact />

      <section className="surface overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading documents…</p>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">
            Your documents could not be loaded. Please refresh to retry.
          </p>
        ) : data && data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">File</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Document date</th>
                  <th className="px-5 py-3 text-left">Uploaded</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((doc) => (
                  <tr key={doc.id} className="hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <Link
                        to="/documents/$documentId"
                        params={{ documentId: doc.id }}
                        className="font-medium hover:underline"
                      >
                        {doc.file_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{doc.document_type}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {fmtDate(doc.document_date)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {fmtDateTime(doc.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            No documents yet. Upload a PDF or photo above to begin.
          </p>
        )}
      </section>
    </div>
  );
}
