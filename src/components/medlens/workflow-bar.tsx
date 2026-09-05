import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Understand", "Verify", "Organize", "Compare"];

export function WorkflowBar({ active, className }: { active?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}>
      {STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-semibold tracking-wide uppercase",
              active === step
                ? "border-primary/30 bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {step}
          </span>
          {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
        </span>
      ))}
    </div>
  );
}
