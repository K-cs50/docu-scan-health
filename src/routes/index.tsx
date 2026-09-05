import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, GitCompare, ShieldCheck, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkflowBar } from "@/components/medlens/workflow-bar";
import { Chip } from "@/components/medlens/badges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedLens — From messy medical documents to a traceable record" },
      {
        name: "description",
        content:
          "Upload prescriptions, lab reports and discharge summaries. MedLens structures them with Gemini, shows where every value came from, and lets you verify each one.",
      },
      { property: "og:title", content: "MedLens — Clinical information intelligence" },
      {
        property: "og:description",
        content: "Structured, traceable, user-verified medical records powered by Gemini.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileText,
    title: "Understand any document",
    body: "Gemini classifies prescriptions, lab reports and discharge summaries, then extracts structured fields — never inventing what is not written.",
  },
  {
    icon: ShieldCheck,
    title: "Provenance on every value",
    body: "Each value is labelled DOCUMENT, USER, CALCULATED or AI, with the source file, page and verbatim snippet.",
  },
  {
    icon: GitCompare,
    title: "What changed?",
    body: "Compare two reports side by side. Differences are computed by application code and labelled CALCULATED — never interpreted.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-lg font-bold tracking-tight">
            Med<span className="text-primary">Lens</span>
          </span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "register" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-gradient">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Chip tone="document">AI-powered clinical information intelligence</Chip>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
            From a messy medical document to a traceable patient record in seconds.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            MedLens reads your prescriptions, laboratory reports and discharge summaries, turns them
            into structured information you can check line by line, and keeps every value tied to
            its source. It never diagnoses, prescribes or advises.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "register" }}>
                <Upload className="size-4" /> Start with a document
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
          <WorkflowBar className="mt-10" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface p-6">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>

        <div className="surface mt-8 flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Safety boundary</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            MedLens organises information — it is not a diagnostic or treatment system. It will
            never diagnose a condition, prescribe medication or suggest a dosage change. Missing
            information is always shown as <em>“Not available in source.”</em> and AI-extracted
            values start as <strong>UNVERIFIED</strong> until you confirm them.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        MedLens · information organisation only · not medical advice
      </footer>
    </div>
  );
}
