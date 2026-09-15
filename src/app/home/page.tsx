"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Me = { user: { id: string; name: string; role: string }; avatarComplete: boolean };

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.replace("/auth");
        else setMe(d);
      });
  }, [router]);

  if (!me?.user) {
    return <main className="p-8 text-center font-bold">Loading…</main>;
  }

  return (
    <AppShell user={me.user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">City desk</h1>
        <p className="mt-2 text-sm text-black/70">
          Check the rules before you build. Submit photos so the city stays cohesive.
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

      <div className="mt-4 grid gap-3">
        <Link href="/standards" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Community standards</h2>
          <p className="text-sm text-black/70">Roads, cars, houses, tone — plus allowed exceptions.</p>
        </Link>
        <Link href="/builds" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Build review</h2>
          <p className="text-sm text-black/70">Submit a build photo for approval.</p>
        </Link>
        <Link href="/avatar" className="panel block hover:bg-[#fffef8]">
          <h2 className="brand-title text-xl">Avatar builder</h2>
          <p className="text-sm text-black/70">Mix real scanned hair, heads, shirts, and pants.</p>
        </Link>
      </div>
    </AppShell>
  );
}
