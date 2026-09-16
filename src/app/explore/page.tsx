"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Item = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  image_data: string;
  owner_id: string;
  owner_name: string;
  owner_job: string | null;
  builder_id: string | null;
  builder_name: string | null;
};

export default function ExplorePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [playerMode, setPlayerMode] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "building" | "vehicle" | "set" | "other">("all");
  const [selected, setSelected] = useState<Item | null>(null);

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
  }, [router]);

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  if (!user) return <main className="loading-screen">Loading…</main>;

  const shown = items.filter((i) => filter === "all" || i.kind === filter);

  return (
    <AppShell user={user} isAdmin={isAdmin} canAdmin={canAdmin} playerMode={playerMode} actingAs={actingAs} mustChangePassword={mustChangePassword}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">Explore</h1>
        <p className="soft-copy mt-3">City inventory by type.</p>
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

      {shown.length === 0 && (
        <p className="soft-copy text-center">No items yet.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="tile text-left transition-transform active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_data} alt="" className="h-32 w-full object-cover sm:h-36" />
            <div className="space-y-1 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-black/45">
                {item.kind}
              </p>
              <p className="text-base font-extrabold leading-tight">{item.title}</p>
              <p className="text-sm font-bold text-black/60">{item.owner_name}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <article
            className="panel max-h-[85dvh] w-full max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.image_data}
              alt={selected.title}
              className="max-h-56 w-full rounded-xl border-3 border-black object-cover"
            />
            <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-black/45">
              {selected.kind}
            </p>
            <h2 className="brand-title mt-1 text-[clamp(1.4rem,4vw,1.9rem)]">{selected.title}</h2>
            {selected.description && (
              <p className="soft-copy mt-2 text-[1rem]">{selected.description}</p>
            )}
            <div className="mt-4 space-y-3 rounded-xl border-3 border-black bg-[#fff8d6] p-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-black/50">Owner</p>
                <Link
                  href={`/people/${selected.owner_id}`}
                  className="text-lg font-extrabold underline"
                >
                  {selected.owner_name}
                </Link>
                {selected.owner_job && (
                  <p className="text-sm font-bold text-black/65">{selected.owner_job}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase text-black/50">Built by</p>
                {selected.builder_id ? (
                  <Link
                    href={`/people/${selected.builder_id}`}
                    className="text-lg font-extrabold underline"
                  >
                    {selected.builder_name}
                  </Link>
                ) : (
                  <p className="text-base font-extrabold">
                    {selected.owner_name}
                    <span className="text-sm font-bold text-black/50"> (assigned)</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="lego-btn mt-5 w-full"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </article>
        </div>
      )}
    </AppShell>
  );
}
