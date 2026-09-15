export function MinifigStack({
  hair,
  head,
  shirt,
  pants,
  size = "md",
}: {
  hair?: string | null;
  head?: string | null;
  shirt?: string | null;
  pants?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "h-36 w-24"
      : size === "lg"
        ? "h-72 w-44 sm:h-80 sm:w-48"
        : "h-52 w-32";

  const slot = (src: string | null | undefined, label: string, h: string) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`${h} w-full object-contain`} />
    ) : (
      <div className={`flex ${h} w-full items-center justify-center bg-black/5 text-[10px] font-bold`}>
        {label}
      </div>
    );

  return (
    <div
      className={`relative flex ${dims} flex-col items-center overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0_#111]`}
    >
      {slot(hair, "hair", "h-[18%]")}
      {slot(head, "head", "h-[28%]")}
      {slot(shirt, "shirt", "h-[28%]")}
      {slot(pants, "pants", "h-[26%]")}
    </div>
  );
}
