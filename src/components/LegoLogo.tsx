export function LegoLogo({
  className = "",
  text = "LEGOTRACK",
  playful = true,
}: {
  className?: string;
  text?: string;
  playful?: boolean;
}) {
  return (
    <span
      className={`lego-logo ${playful ? "logo-play" : "logo-colors"} ${className}`.trim()}
      aria-label={text}
    >
      {text.split("").map((ch, i) => (
        <span key={`${ch}-${i}`}>{ch}</span>
      ))}
    </span>
  );
}
