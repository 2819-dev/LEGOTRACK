const WORD = "LEGOTRACK";

export function LegoLogo({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Smaller header treatment — same look, quieter motion */
  compact?: boolean;
}) {
  return (
    <span
      className={`lego-logo lego-logo-brick ${compact ? "lego-logo-compact" : ""} ${className}`.trim()}
      aria-label="LEGOTRACK"
    >
      {WORD.split("").map((ch, i) => (
        <span key={`${ch}-${i}`} style={{ ["--i" as string]: i }}>
          {ch}
        </span>
      ))}
    </span>
  );
}
