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

  if (!user) return <main className="p-8 text-center font-bold">Loading…</main>;

  const filtered = owners
    .map((o) => ({
      ...o,
      items: o.items.filter((i) => filter === "all" || i.kind === filter),
    }))
    .filter((o) => o.items.length > 0);

  return (
    <AppShell user={user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">Who owns what</h1>
        <p className="mt-2 text-sm text-black/70">
          Every approved building, vehicle, and set in the city has an owner.
        </p>
      </section>

      <div className="mt-3 flex gap-1 overflow-x-auto">
        {(["all", "building", "vehicle", "set", "other"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-md border-2 border-black px-3 py-1.5 text-sm font-bold capitalize ${
              filter === k ? "bg-black text-white" : "bg-white"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm font-semibold text-black/60">
            Nothing claimed yet. Approve builds or assign catalog sets to people.
          </p>
        )}
        {filtered.map((group) => (
          <section key={group.owner_id} className="panel space-y-3">
            <h2 className="brand-title text-xl">{group.owner_name}</h2>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-md border-2 border-black bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_data}
                    alt={item.title}
                    className="h-28 w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs font-bold uppercase text-black/50">{item.kind}</p>
                    <p className="text-sm font-extrabold leading-tight">{item.title}</p>
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
