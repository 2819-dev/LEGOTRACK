"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Me = {
  user: { id: string; name: string; role: string };
  isAdmin?: boolean;
  actingAs?: { name: string } | null;
  avatarComplete: boolean;
};

type Mine = {
  id: string;
  kind: string;
  title: string;
  image_data: string;
};

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.replace("/auth");
        else setMe(d);
      });
    fetch("/api/city?mine=1")
      .then((r) => r.json())
      .then((d) => setMine(d.properties || []));
  }, [router]);

  if (!me?.user) {
    return <main className="loading-screen">Loading…</main>;
  }

  return (
    <AppShell user={me.user} isAdmin={Boolean(me.isAdmin)} actingAs={me.actingAs || null}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">City desk</h1>
        <p className="soft-copy mt-3">
          Check the rules, build to scale, and keep track of what you own in the city.
        </p>
        {!me.avatarComplete && (
          <Link
            href="/avatar?onboarding=1"
            className="lego-btn lego-btn-yellow mt-5 w-full text-center text-[clamp(1rem,2.4vw,1.25rem)]"
          >
            Finish your minifig
          </Link>
        )}
      </section>

      {mine.length > 0 && (
        <section className="panel">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Your stuff</h2>
            <Link href="/city" className="chip min-h-11 bg-[#dbeafe] px-3 text-sm">
              See everyone
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {mine.slice(0, 8).map((item) => (
              <div key={item.id} className="tile w-32 shrink-0 sm:w-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_data} alt="" className="h-24 w-full object-cover sm:h-28" />
                <p className="truncate px-2 py-2 text-sm font-extrabold">{item.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="stack">
        <Link href="/explore" className="panel block transition-transform active:translate-y-0.5">
          <h2 className="brand-title text-[clamp(1.4rem,4vw,1.85rem)]">Explore the city</h2>
          <p className="soft-copy mt-2">
            Browse every building, car, and set — see who owns it and who built it.
          </p>
        </Link>
        <Link href="/people" className="panel block transition-transform active:translate-y-0.5">
          <h2 className="brand-title text-[clamp(1.4rem,4vw,1.85rem)]">Meet people</h2>
          <p className="soft-copy mt-2">
            See minifigs, jobs, and what each person owns or built.
          </p>
        </Link>
        <Link href="/builds" className="panel block transition-transform active:translate-y-0.5">
          <h2 className="brand-title text-[clamp(1.4rem,4vw,1.85rem)]">Submit a build</h2>
          <p className="soft-copy mt-2">
            Photo it, send it in, get it approved for the city.
          </p>
        </Link>
        <Link href="/standards" className="panel block transition-transform active:translate-y-0.5">
          <h2 className="brand-title text-[clamp(1.4rem,4vw,1.85rem)]">Community rules</h2>
          <p className="soft-copy mt-2">
            Cars must fit the roads. Houses must look like houses.
          </p>
        </Link>
        <Link href="/avatar" className="panel block transition-transform active:translate-y-0.5">
          <h2 className="brand-title text-[clamp(1.4rem,4vw,1.85rem)]">Avatar builder</h2>
          <p className="soft-copy mt-2">
            Mix real scanned hair, heads, shirts, and pants.
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
