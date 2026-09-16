"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MinifigStack } from "@/components/MinifigStack";

type Person = {
  id: string;
  name: string;
  job: string | null;
  role: string;
  helmet_image: string | null;
  hair_image: string | null;
  head_image: string | null;
  shirt_image: string | null;
  pants_image: string | null;
  owns_count: number;
  built_count: number;
};

export default function PeoplePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [playerMode, setPlayerMode] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);

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
          setMustChangePassword(Boolean(me.mustChangePassword));
        }
      });
    fetch("/api/people")
      .then((r) => r.json())
      .then((d) => setPeople(d.people || []));
  }, [router]);

  if (!user) return <main className="loading-screen">Loading…</main>;

  return (
    <AppShell user={user} isAdmin={isAdmin} canAdmin={canAdmin} playerMode={playerMode} actingAs={actingAs} mustChangePassword={mustChangePassword}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">People</h1>
        <p className="soft-copy mt-3">
          Meet the city crew — tap someone to see their minifig, job, builds, and stuff.
        </p>
      </section>

      <div className="stack">
        {people.map((p) => (
          <Link
            key={p.id}
            href={`/people/${p.id}`}
            className="panel flex items-center gap-4 transition-transform active:translate-y-0.5"
          >
            <MinifigStack
              helmet={p.helmet_image}
              hair={p.hair_image}
              head={p.head_image}
              shirt={p.shirt_image}
              pants={p.pants_image}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <h2 className="brand-title text-[clamp(1.25rem,3.5vw,1.6rem)]">{p.name}</h2>
              <p className="mt-1 text-base font-extrabold text-black/70">
                {p.job || "No job yet"}
              </p>
              <p className="mt-2 text-sm font-bold text-black/55">
                Owns {p.owns_count} · Built {p.built_count}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
