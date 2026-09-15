"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/city", label: "City" },
  { href: "/avatar", label: "Avatar" },
  { href: "/standards", label: "Rules" },
  { href: "/builds", label: "Builds" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="page-wrap flex min-h-dvh flex-col pt-[max(0.65rem,env(safe-area-inset-top))]">
      <header className="sticky top-0 z-20 mt-1 rounded-[1.2rem] border-4 border-black bg-[var(--brick-yellow)] px-4 py-4 shadow-[6px_6px_0_#111] sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="lego-logo text-left text-[clamp(1.4rem,4.2vw,1.95rem)] leading-none">
              LEGOTRACK
            </p>
            <p className="mt-1.5 text-base font-extrabold text-black/70 sm:text-lg">
              Hi, {user.name}!
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user.role === "admin" && (
              <Link href="/admin" className="chip min-h-12 bg-white px-4 text-sm sm:text-base">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="chip min-h-12 bg-black px-4 text-sm text-white sm:text-base"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`chip shrink-0 min-h-12 px-4 text-base ${active ? "chip-active" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="stack flex-1 py-5 sm:py-7">{children}</div>
    </div>
  );
}
