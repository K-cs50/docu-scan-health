import { cn } from "@/lib/utils";

type Tone = "document" | "user" | "calculated" | "ai" | "neutral" | "ok" | "warn" | "danger";

const toneClass: Record<Tone, string> = {
  document: "bg-primary/10 text-primary border-primary/25",
  user: "bg-info/10 text-info border-info/25",
  calculated: "bg-success/10 text-success border-success/25",
  ai: "bg-warning/15 text-warning-foreground border-warning/40",
  neutral: "bg-muted text-muted-foreground border-border",
  ok: "bg-success/12 text-success border-success/30",
  warn: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProvenanceBadge({ provenance }: { provenance: string }) {
  const map: Record<string, Tone> = {
    DOCUMENT: "document",
    USER: "user",
    CALCULATED: "calculated",
    AI: "ai",
  };
  return <Chip tone={map[provenance] ?? "neutral"}>{provenance}</Chip>;
}

export function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, Tone> = {
    VERIFIED: "ok",
    UNVERIFIED: "warn",
    EDITED: "user",
    REJECTED: "danger",
  };
  return <Chip tone={map[status] ?? "neutral"}>{status}</Chip>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Tone> = {
    READY: "ok",
    UPLOADED: "neutral",
    PROCESSING: "document",
    FAILED: "danger",
    "REVIEW REQUIRED": "warn",
  };
  return <Chip tone={map[status] ?? "neutral"}>{status}</Chip>;
}
