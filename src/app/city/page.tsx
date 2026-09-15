"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type Property = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  image_data: string;
  owner_name: string;
  owner_id: string;
};

type OwnerGroup = {
  owner_id: string;
  owner_name: string;
  items: Property[];
};

export default function CityPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [owners, setOwners] = useState<OwnerGroup[]>([]);
  const [filter, setFilter] = useState<"all" | "building" | "vehicle" | "set" | "other">("all");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) router.replace("/auth");
        else setUser(me.user);
      });
    fetch("/api/city")
      .then((r) => r.json())
      .then((d) => setOwners(d.owners || []));
  }, [router]);

  if (!user) return <main className="loading-screen">Loading…</main>;

  const filtered = owners
    .map((o) => ({
      ...o,
      items: o.items.filter((i) => filter === "all" || i.kind === filter),
    }))
    .filter((o) => o.items.length > 0);

  return (
    <AppShell user={user}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">Who owns what</h1>
        <p className="soft-copy mt-3">
          Every approved building, vehicle, and set in the city has an owner.
        </p>
      </section>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {(["all", "building", "vehicle", "set", "other"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`chip shrink-0 capitalize ${filter === k ? "chip-active" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="stack">
        {filtered.length === 0 && (
          <p className="soft-copy text-center">
            Nothing claimed yet. Approve builds or assign catalog sets to people.
          </p>
        )}
        {filtered.map((group) => (
          <section key={group.owner_id} className="panel space-y-4">
            <h2 className="brand-title text-[clamp(1.4rem,3.8vw,1.9rem)]">{group.owner_name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.items.map((item) => (
                <article key={item.id} className="tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_data}
                    alt={item.title}
                    className="h-32 w-full object-cover sm:h-36"
                  />
                  <div className="space-y-1 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-black/50">
                      {item.kind}
                    </p>
                    <p className="text-base font-extrabold leading-tight">{item.title}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
