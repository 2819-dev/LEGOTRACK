export function LegoLogo({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Quieter header treatment — same lockup, smaller motion */
  compact?: boolean;
}) {
  return (
    <span
      className={`lego-mark ${compact ? "lego-mark-compact" : ""} ${className}`.trim()}
      aria-label="LEGOTRACK"
    >
      <span className="lego-mark-lego">LEGO</span>
      <span className="lego-mark-stud" aria-hidden>
        <span className="lego-mark-stud-shine" />
      </span>
      <span className="lego-mark-track">
        <span className="lego-mark-rails" aria-hidden />
        TRACK
      </span>
    </span>
  );
}
