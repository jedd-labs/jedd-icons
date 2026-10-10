import { type Accent, CHECKS } from "@/lib/checks";
import { getIconIssues, getIconMeta } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";

const ACCENT_TEXT: Record<Accent, string> = {
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  rose: "text-rose-600 dark:text-rose-400",
  amber: "text-amber-600 dark:text-amber-400",
  teal: "text-teal-600 dark:text-teal-400",
  orange: "text-orange-600 dark:text-orange-400",
};

/**
 * Shows the current icon's sidecar metadata plus a pass/fail breakdown of every
 * check, with the messages `icons:check` reports for the ones that fail.
 */
export function IconInspector({
  name,
  variant,
}: {
  name: string;
  variant: Variant;
}) {
  const issues = getIconIssues(name, variant);
  const meta = getIconMeta(name, variant);

  return (
    <div className="flex flex-col gap-3">
      <span className="font-medium text-muted-foreground">
        Checks &amp; metadata
      </span>

      {/* Per-check pass/fail rows */}
      <ul className="flex flex-col gap-1">
        {CHECKS.map((check) => {
          const found = issues.filter((issue) => issue.rule === check.id);
          const failed = found.length > 0;
          const onlyWarnings = found.every((i) => i.severity === "warning");
          return (
            <li className="flex items-start gap-2" key={check.id}>
              <span
                className={`mt-0.5 shrink-0 ${failed ? ACCENT_TEXT[check.accent] : "text-muted-foreground/50"}`}
              >
                {failed ? (onlyWarnings ? "!" : "✕") : "✓"}
              </span>
              <div className="flex flex-col">
                <span
                  className={
                    failed ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {check.label}
                  {failed && onlyWarnings && (
                    <span className="text-muted-foreground"> (warning)</span>
                  )}
                </span>
                {failed && (
                  <ul className={`text-[10px] ${ACCENT_TEXT[check.accent]}`}>
                    {found.map((issue) => (
                      <li key={issue.message}>{issue.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Raw sidecar JSON */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {name}.json
        </span>
        {meta ? (
          <pre className="max-h-56 overflow-auto rounded-none border border-border bg-muted/20 p-2 font-mono text-[10px] leading-relaxed">
            {JSON.stringify(meta, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground text-xs">
            No sidecar found, or it isn&apos;t valid JSON.
          </p>
        )}
      </div>
    </div>
  );
}
