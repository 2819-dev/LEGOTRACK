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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-20 border-b-4 border-black bg-[var(--brick-yellow)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="lego-logo text-[1.35rem] leading-none">LEGOTRACK</p>
            <p className="text-xs text-black/70">Hi, {user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <Link href="/admin" className="rounded-md border-2 border-black bg-white px-2 py-1 text-xs font-bold">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border-2 border-black bg-black px-2 py-1 text-xs font-bold text-white"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md border-2 border-black px-3 py-1.5 text-sm font-bold ${
                  active ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 px-4 py-5">{children}</div>
    </div>
  );
}
