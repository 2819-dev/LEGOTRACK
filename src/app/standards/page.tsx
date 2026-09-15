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
  const [standards, setStandards] = useState<Standard[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) router.replace("/auth");
        else setUser(me.user);
      });
    fetch("/api/standards")
      .then((r) => r.json())
      .then((d) => setStandards(d.standards || []));
  }, [router]);

  if (!user) return <main className="p-8 text-center font-bold">Loading…</main>;

  const rules = standards.filter((s) => !s.is_exception);
  const exceptions = standards.filter((s) => s.is_exception);

  return (
    <AppShell user={user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">Community standards</h1>
        <p className="mt-2 text-sm text-black/70">
          We want a city that feels real — without requiring every brick detail.
        </p>
      </section>

      <div className="mt-4 space-y-3">
        {rules.map((s) => (
          <article key={s.id} className="panel">
            <h2 className="brand-title text-xl">{s.title}</h2>
            <p className="mt-1 text-sm leading-relaxed">{s.body}</p>
          </article>
        ))}
      </div>

      {exceptions.length > 0 && (
        <section className="mt-6">
          <h2 className="brand-title text-2xl text-[var(--brick-blue)]">Exceptions</h2>
          <div className="mt-3 space-y-3">
            {exceptions.map((s) => (
              <article key={s.id} className="panel border-[var(--brick-blue)]">
                <h3 className="font-extrabold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
