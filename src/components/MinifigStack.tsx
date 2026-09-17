/**
 * Assembled minifig — one character silhouette, not separate labeled slots.
 */
export function MinifigStack({
  helmet,
  hair,
  head,
  shirt,
  pants,
  accessory,
  size = "md",
}: {
  helmet?: string | null;
  hair?: string | null;
  head?: string | null;
  shirt?: string | null;
  pants?: string | null;
  accessory?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "h-40 w-28"
      : size === "lg"
        ? "h-80 w-48 sm:h-[22rem] sm:w-52"
        : "h-56 w-36";

  const top = helmet || hair;
  const hasAny = Boolean(top || head || shirt || pants || accessory);

  return (
    <div
      className={`relative flex ${dims} flex-col items-center justify-end overflow-hidden rounded-[1.35rem] border-4 border-black bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[4px_4px_0_#111]`}
      aria-label="Minifig"
    >
      <div className="checker absolute inset-0 opacity-25" aria-hidden />
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-1 py-2">
        {top ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={top} alt="" className="h-[15%] w-full object-contain" />
        ) : null}
        {head ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={head} alt="" className="-mt-1 h-[24%] w-full object-contain" />
        ) : null}
        {accessory ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={accessory} alt="" className="-mt-1 h-[14%] w-full object-contain" />
        ) : null}
        {shirt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shirt} alt="" className="-mt-1 h-[26%] w-full object-contain" />
        ) : null}
        {pants ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pants} alt="" className="-mt-1 h-[24%] w-full object-contain" />
        ) : null}
        {!hasAny && (
          <p className="text-xs font-extrabold text-black/35">No avatar</p>
        )}
      </div>
    </div>
  );
}
