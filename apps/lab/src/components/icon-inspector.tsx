import { CHECKS, getIconCheckDetail, getIconFlags } from "@/lib/checks";
import { getIconMeta } from "@/lib/icon-nodes";
import type { Variant } from "@/lib/icons";

const ACCENT_TEXT: Record<string, string> = {
  rose: "text-rose-600 dark:text-rose-400",
  amber: "text-amber-600 dark:text-amber-400",
  violet: "text-violet-600 dark:text-violet-400",
  sky: "text-sky-600 dark:text-sky-400",
  orange: "text-orange-600 dark:text-orange-400",
};

/**
 * Shows the current icon's sidecar metadata plus a pass/fail breakdown of every
 * spec check, with the specific reasons a check failed.
 */
export function IconInspector({
  name,
  variant,
}: {
  name: string;
  variant: Variant;
}) {
  const flags = getIconFlags(name);
  const detail = getIconCheckDetail(name, variant);
  const meta = getIconMeta(name, variant);

  return (
    <div className="flex flex-col gap-3">
      <span className="font-medium text-muted-foreground">
        Checks &amp; metadata
      </span>

      {/* Per-check pass/fail rows */}
      <ul className="flex flex-col gap-1">
        {CHECKS.map((check) => {
          const failed = flags.has(check.id);
          return (
            <li className="flex items-start gap-2" key={check.id}>
              <span
                className={`mt-0.5 shrink-0 ${failed ? ACCENT_TEXT[check.accent] : "text-muted-foreground/50"}`}
              >
                {failed ? "✕" : "✓"}
              </span>
              <div className="flex flex-col">
                <span
                  className={
                    failed ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {check.label}
                </span>
                {failed && (
                  <CheckReason
                    accent={check.accent}
                    detail={detail}
                    id={check.id}
                  />
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
          <p className="text-muted-foreground text-xs">No sidecar found.</p>
        )}
      </div>
    </div>
  );
}

/** The specific reason a given check failed, drawn under the check label. */
function CheckReason({
  id,
  detail,
  accent,
}: {
  id: string;
  detail: ReturnType<typeof getIconCheckDetail>;
  accent: string;
}) {
  const cls = `text-[10px] ${ACCENT_TEXT[accent] ?? "text-muted-foreground"}`;

  if (id === "metadata") {
    return (
      <ul className={cls}>
        {detail.metadataIssues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    );
  }
  if (id === "forbiddenElements") {
    return (
      <span className={cls}>
        Contains: {detail.forbiddenTags.map((t) => `<${t}>`).join(", ")}
      </span>
    );
  }
  if (id === "multiElement") {
    return (
      <span className={cls}>{detail.elementCount} top-level elements</span>
    );
  }
  if (id === "margin") {
    return (
      <span className={cls}>
        Overflows margin by {detail.marginOverflow.toFixed(2)}px
      </span>
    );
  }
  if (id === "offGrid") {
    return <span className={cls}>Coordinates fall outside 0–24</span>;
  }
  return null;
}
