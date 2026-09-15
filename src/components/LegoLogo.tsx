export function LegoLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`lego-logo ${className}`.trim()} aria-label="LEGOTRACK">
      LEGOTRACK
    </span>
  );
}
