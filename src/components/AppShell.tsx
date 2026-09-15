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
          : "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {actingAs && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border-3 border-black bg-[#7dd3fc] px-3 py-2.5">
          <p className="text-sm font-extrabold">Using as {actingAs.name}</p>
          <button type="button" onClick={stopActingAs} className="chip min-h-10 bg-white px-3 text-sm">
            Stop
          </button>
        </div>
      )}

      <header className="sticky top-0 z-20 mt-1 rounded-xl border-3 border-black bg-[var(--brick-yellow)] px-4 py-3 shadow-[4px_4px_0_#111]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="lego-logo text-left text-[clamp(1.25rem,3.8vw,1.65rem)] leading-none">
              LEGOTRACK
            </p>
            <p className="mt-1 text-sm font-extrabold text-black/65">Hi, {user.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="chip min-h-10 bg-white px-3 text-sm">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="chip min-h-10 bg-black px-3 text-sm text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="stack flex-1 py-4 sm:py-5">{children}</div>

      {!hidePlayerNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t-3 border-black bg-[var(--brick-yellow)] px-2 pt-1.5"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-[42rem] items-stretch justify-between gap-1">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex min-h-[3.1rem] flex-1 items-center justify-center rounded-xl border-3 border-black px-1 text-center text-[0.8rem] font-extrabold touch-manipulation ${
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
