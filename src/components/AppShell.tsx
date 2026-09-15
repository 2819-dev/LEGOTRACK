"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/people", label: "People" },
  { href: "/builds", label: "Builds" },
  { href: "/avatar", label: "Me" },
];

export function AppShell({
  children,
  user,
  isAdmin = false,
  actingAs = null,
}: {
  children: React.ReactNode;
  user: { name: string; role: string };
  isAdmin?: boolean;
  actingAs?: { name: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hidePlayerNav = pathname.startsWith("/admin");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function stopActingAs() {
    await fetch("/api/admin/act-as", { method: "DELETE" });
    router.refresh();
    window.location.href = "/admin";
  }

  return (
    <div
      className={`page-wrap flex min-h-dvh flex-col pt-[max(0.65rem,env(safe-area-inset-top))] ${
        hidePlayerNav
          ? "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          : "pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {actingAs && (
        <div className="mb-3 rounded-[1.1rem] border-4 border-black bg-[#7dd3fc] px-4 py-3 shadow-[5px_5px_0_#111]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold leading-snug sm:text-base">
              Using as <span className="uppercase">{actingAs.name}</span> — builds & avatar count as them
            </p>
            <button
              type="button"
              onClick={stopActingAs}
              className="chip min-h-11 shrink-0 bg-white px-3 text-sm"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 mt-1 rounded-[1.2rem] border-4 border-black bg-[var(--brick-yellow)] px-4 py-3.5 shadow-[6px_6px_0_#111] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="lego-logo text-left text-[clamp(1.35rem,4vw,1.85rem)] leading-none">
              LEGOTRACK
            </p>
            <p className="mt-1 text-sm font-extrabold text-black/70 sm:text-base">
              Hi, {user.name}!
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="chip min-h-11 bg-white px-3.5 text-sm">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="chip min-h-11 bg-black px-3.5 text-sm text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="stack flex-1 py-5 sm:py-6">{children}</div>

      {!hidePlayerNav && (
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-black bg-[var(--brick-yellow)] px-2 pt-2 shadow-[0_-4px_0_#111]"
        style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[42rem] items-stretch justify-between gap-1">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-[3.35rem] flex-1 flex-col items-center justify-center rounded-xl border-3 border-black px-1 text-center text-[0.78rem] font-extrabold leading-tight touch-manipulation sm:min-h-[3.6rem] sm:text-sm ${
                  active ? "bg-black text-white" : "bg-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
