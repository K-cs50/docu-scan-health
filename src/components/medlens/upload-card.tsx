import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/medlens.functions";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "@/lib/medlens";

export function UploadCard({ compact = false }: { compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<null | string>(null);
  const qc = useQueryClient();
  const runProcess = useServerFn(processDocument);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG, PNG or WebP medical documents can be uploaded.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is larger than 8 MB. Please upload a smaller file.");
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;

    setStage("Uploading document…");
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("medical-documents").upload(path, file, {
      contentType: file.type,
    });
    if (up.error) {
      setStage(null);
      toast.error("Upload failed. Please check your connection and try again.");
      return;
    }

    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        file_size: file.size,
        status: "UPLOADED",
      })
      .select("id")
      .single();

    if (error || !doc) {
      setStage(null);
      toast.error("The document record could not be created.");
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      entity_type: "document",
      entity_id: doc.id,
      document_id: doc.id,
      action: "DOCUMENT_UPLOADED",
      detail: file.name,
    });
    qc.invalidateQueries();

    setStage("Gemini is reading the document…");
    try {
      const result = await runProcess({ data: { documentId: doc.id } });
      if (result.ok) {
        toast.success(`${result.documentType} processed — ${result.count} item(s) extracted.`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Processing failed. The original document is safe — you can retry.");
    } finally {
      setStage(null);
      qc.invalidateQueries();
    }
  }

  return (
    <div className={compact ? "surface p-5" : "surface p-6"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold">Upload a medical document</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF or photo, up to 8 MB. Prescriptions, lab reports, discharge summaries.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={!!stage}>
          {stage ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {stage ? "Working…" : "Choose file"}
        </Button>
      </div>
      {stage && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          {stage}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
