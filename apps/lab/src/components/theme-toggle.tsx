import { Kbd } from "@workspace/ui/components/kbd";
import type { Theme } from "@/lib/use-theme";

/** Sun / moon glyphs drawn inline so the toggle needs no icon dependency. */
function SunGlyph() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      aria-label={`Switch to ${next} mode`}
      className="flex items-center gap-2 border border-border px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground"
      onClick={onToggle}
      title={`Switch to ${next} mode (D)`}
      type="button"
    >
      {theme === "dark" ? <MoonGlyph /> : <SunGlyph />}
      <span className="capitalize">{theme}</span>
      <Kbd>D</Kbd>
    </button>
  );
}
