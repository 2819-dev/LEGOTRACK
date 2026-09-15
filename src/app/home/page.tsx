"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Me = { user: { id: string; name: string; role: string }; avatarComplete: boolean };

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
    return <main className="p-8 text-center font-bold">Loading…</main>;
  }

  return (
    <AppShell user={me.user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">City desk</h1>
        <p className="mt-2 text-sm text-black/70">
          Check the rules, build to scale, and keep track of what you own in the city.
        </p>
        {!me.avatarComplete && (
          <Link
            href="/avatar?onboarding=1"
            className="mt-4 block rounded-lg border-3 border-black bg-[var(--brick-yellow)] px-3 py-3 text-center text-sm font-extrabold"
          >
            Finish your minifig avatar →
          </Link>
        )}
      </section>

      {mine.length > 0 && (
        <section className="panel mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="brand-title text-xl">Your stuff</h2>
            <Link href="/city" className="text-xs font-bold underline">
              See everyone
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mine.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="w-28 shrink-0 overflow-hidden rounded-md border-2 border-black bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_data} alt="" className="h-20 w-full object-cover" />
                <p className="truncate px-1.5 py-1 text-[11px] font-extrabold">{item.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-3">
        <Link href="/city" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Who owns what</h2>
          <p className="text-sm text-black/70">Buildings, cars, and sets — and who they belong to.</p>
        </Link>
        <Link href="/standards" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Community standards</h2>
          <p className="text-sm text-black/70">Cars must fit the roads. Houses must look like houses.</p>
        </Link>
        <Link href="/builds" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Submit a build</h2>
          <p className="text-sm text-black/70">Photo it, send it in, get it approved for the city.</p>
        </Link>
        <Link href="/avatar" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Avatar builder</h2>
          <p className="text-sm text-black/70">Mix real scanned hair, heads, shirts, and pants.</p>
        </Link>
      </div>
    </AppShell>
  );
}
