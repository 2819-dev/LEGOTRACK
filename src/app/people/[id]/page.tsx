"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MinifigStack } from "@/components/MinifigStack";

type Person = {
  id: string;
  name: string;
  job: string | null;
  role: string;
  hair_image: string | null;
  head_image: string | null;
  shirt_image: string | null;
  pants_image: string | null;
};

type Thing = {
  id: string;
  kind?: string;
  title: string;
  description: string | null;
  image_data: string;
  status?: string;
};

export default function PersonProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || "");
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [owns, setOwns] = useState<Thing[]>([]);
  const [builds, setBuilds] = useState<Thing[]>([]);
  const [tab, setTab] = useState<"owns" | "built">("owns");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) router.replace("/auth");
        else {
          setUser(me.user);
          setIsAdmin(Boolean(me.isAdmin));
          setActingAs(me.actingAs || null);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/people/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.person) {
          setPerson(d.person);
          setOwns(d.owns || []);
          setBuilds(d.builds || []);
        }
      });
  }, [id]);

  if (!user || !person) return <main className="loading-screen">Loading…</main>;

  const list = tab === "owns" ? owns : builds;

  return (
    <AppShell user={user} isAdmin={isAdmin} actingAs={actingAs}>
      <Link href="/people" className="chip mb-1 w-fit bg-white text-sm">
        ← People
      </Link>

      <section className="panel flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <MinifigStack
          hair={person.hair_image}
          head={person.head_image}
          shirt={person.shirt_image}
          pants={person.pants_image}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">{person.name}</h1>
          <p className="mt-2 rounded-full border-3 border-black bg-[var(--brick-yellow)] px-4 py-2 text-base font-extrabold inline-block">
            {person.job || "No job yet"}
          </p>
          <p className="soft-copy mt-3 text-[1rem]">
            Owns {owns.length} · Built {builds.length}
          </p>
        </div>
      </section>

      <div className="flex gap-2.5">
        <button
          type="button"
          className={`chip flex-1 ${tab === "owns" ? "chip-active" : ""}`}
          onClick={() => setTab("owns")}
        >
          Owns
        </button>
        <button
          type="button"
          className={`chip flex-1 ${tab === "built" ? "chip-active" : ""}`}
          onClick={() => setTab("built")}
        >
          Built
        </button>
      </div>

      {list.length === 0 && (
        <p className="soft-copy text-center">
          {tab === "owns" ? "Nothing owned yet." : "No approved builds yet."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {list.map((item) => (
          <article key={item.id} className="tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_data} alt="" className="h-28 w-full object-cover" />
            <div className="p-2.5">
              {item.kind && (
                <p className="text-[11px] font-extrabold uppercase text-black/45">{item.kind}</p>
              )}
              <p className="text-sm font-extrabold leading-tight">{item.title}</p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
