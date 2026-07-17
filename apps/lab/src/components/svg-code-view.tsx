import { useState } from "react";
import { highlight } from "sugar-high";
import type { Variant } from "@/lib/icons";
import { buildShippedSvg } from "@/lib/svg-string";

/**
 * Syntax-highlighted view of the shipped SVG markup for an icon, with a copy
 * button. The code is reconstructed from the shipped tuples + shared variant
 * defaults (see buildShippedSvg) — what a consumer actually renders.
 */
export function SvgCodeView({
  name,
  variant,
}: {
  name: string;
  variant: Variant;
}) {
  const [copied, setCopied] = useState(false);
  const code = buildShippedSvg(name, variant);

  const copy = () => {
    if (!code) {
      return;
    }
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="font-medium text-muted-foreground text-xs">
          Shipped SVG
          <span className="ml-1.5 text-[10px] normal-case">
            @jedd-icons/{variant === "fill" ? "react/fill" : "react"}
          </span>
        </span>
        <button
          className="text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          disabled={!code}
          onClick={copy}
          type="button"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {code ? (
        <pre className="min-h-0 flex-1 overflow-auto rounded-none border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high returns sanitized highlight markup for our own reconstructed SVG. */}
          <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
        </pre>
      ) : (
        <p className="text-muted-foreground text-xs">
          No shipped geometry for this variant.
        </p>
      )}
    </div>
  );
}
