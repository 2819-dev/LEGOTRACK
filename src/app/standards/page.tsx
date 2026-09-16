"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type Standard = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_exception: boolean;
};

export default function StandardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [playerMode, setPlayerMode] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [standards, setStandards] = useState<Standard[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) router.replace("/auth");
        else {
          setUser(me.user);
          setIsAdmin(Boolean(me.isAdmin));
          setCanAdmin(Boolean(me.canAdmin));
          setPlayerMode(Boolean(me.playerMode));
          setActingAs(me.actingAs || null);
        }
      });
    fetch("/api/standards")
      .then((r) => r.json())
      .then((d) => setStandards(d.standards || []));
  }, [router]);

  if (!user) return <main className="loading-screen">Loading…</main>;

  const rules = standards.filter((s) => !s.is_exception);
  const exceptions = standards.filter((s) => s.is_exception);

  return (
    <AppShell user={user} isAdmin={isAdmin} canAdmin={canAdmin} playerMode={playerMode} actingAs={actingAs} mustChangePassword={mustChangePassword}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">Community rules</h1>
        <p className="soft-copy mt-3">
          We want a city that feels real — without requiring every brick detail.
        </p>
      </section>

      <div className="stack">
        {rules.map((s, i) => (
          <article key={s.id} className="panel">
            <div className="mb-2 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-black bg-[var(--brick-yellow)] text-lg font-extrabold">
                {i + 1}
              </span>
              <h2 className="brand-title pt-1 text-[clamp(1.3rem,3.5vw,1.7rem)]">{s.title}</h2>
            </div>
            <p className="soft-copy pl-0 sm:pl-[3.25rem]">{s.body}</p>
          </article>
        ))}
      </div>

      {exceptions.length > 0 && (
        <section className="space-y-4">
          <h2 className="brand-title text-[clamp(1.5rem,4vw,2rem)] text-[var(--brick-blue)]">
            Exceptions
          </h2>
          <div className="stack">
            {exceptions.map((s) => (
              <article key={s.id} className="panel border-[var(--brick-blue)] bg-[#eff6ff]">
                <h3 className="text-lg font-extrabold sm:text-xl">{s.title}</h3>
                <p className="soft-copy mt-2">{s.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
