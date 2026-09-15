"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type Piece = {
  id: string;
  category: "hair" | "head" | "shirt" | "pants";
  label: string | null;
  image_data: string;
};

type Selection = {
  hair_id: string | null;
  head_id: string | null;
  shirt_id: string | null;
  pants_id: string | null;
};

const TABS = ["hair", "head", "shirt", "pants"] as const;

export default function AvatarClient() {
  const router = useRouter();
  const params = useSearchParams();
  const onboarding = params.get("onboarding") === "1";
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("hair");
  const [sel, setSel] = useState<Selection>({
    hair_id: null,
    head_id: null,
    shirt_id: null,
    pants_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/auth/me"), fetch("/api/avatar/pieces"), fetch("/api/avatar")]).then(
      async ([meRes, piecesRes, avatarRes]) => {
        const me = await meRes.json();
        if (!me.user) {
          router.replace("/auth");
          return;
        }
        setUser(me.user);
        const p = await piecesRes.json();
        setPieces(p.pieces || []);
        const a = await avatarRes.json();
        if (a.avatar) {
          setSel({
            hair_id: a.avatar.hair_id,
            head_id: a.avatar.head_id,
            shirt_id: a.avatar.shirt_id,
            pants_id: a.avatar.pants_id,
          });
        }
      }
    );
  }, [router]);

  const byTab = useMemo(() => pieces.filter((p) => p.category === tab), [pieces, tab]);
  const preview = useMemo(() => {
    const find = (id: string | null) => pieces.find((p) => p.id === id)?.image_data;
    return {
      hair: find(sel.hair_id),
      head: find(sel.head_id),
      shirt: find(sel.shirt_id),
      pants: find(sel.pants_id),
    };
  }, [pieces, sel]);

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sel),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Could not save");
      return;
    }
    setMsg("Saved!");
    if (onboarding) router.push("/home");
  }

  if (!user) return <main className="p-8 text-center font-bold">Loading…</main>;

  return (
    <AppShell user={user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">
          {onboarding ? "Create your avatar" : "Avatar builder"}
        </h1>
        <p className="mt-1 text-sm text-black/70">
          Pieces come from real minifigs scanned in admin — always split into separate parts.
        </p>
      </section>

      <div className="panel mt-4 flex justify-center bg-[linear-gradient(180deg,#dbeafe,#fff)]">
        <div className="relative flex h-64 w-40 flex-col items-center overflow-hidden rounded-xl border-3 border-black bg-white">
          {preview.hair ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.hair} alt="" className="h-[18%] w-full object-contain" />
          ) : (
            <div className="flex h-[18%] w-full items-center justify-center bg-black/5 text-[10px]">
              hair
            </div>
          )}
          {preview.head ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.head} alt="" className="h-[28%] w-full object-contain" />
          ) : (
            <div className="flex h-[28%] w-full items-center justify-center bg-black/5 text-[10px]">
              head
            </div>
          )}
          {preview.shirt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.shirt} alt="" className="h-[28%] w-full object-contain" />
          ) : (
            <div className="flex h-[28%] w-full items-center justify-center bg-black/5 text-[10px]">
              shirt
            </div>
          )}
          {preview.pants ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.pants} alt="" className="h-[26%] w-full object-contain" />
          ) : (
            <div className="flex h-[26%] w-full items-center justify-center bg-black/5 text-[10px]">
              pants
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md border-2 border-black px-3 py-1.5 text-sm font-bold capitalize ${
              tab === t ? "bg-black text-white" : "bg-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {byTab.length === 0 && (
          <p className="col-span-3 text-sm font-semibold text-black/60">
            No {tab} pieces yet. Admin can scan them in.
          </p>
        )}
        {byTab.map((p) => {
          const key = `${p.category}_id` as keyof Selection;
          const active = sel[key] === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSel((s) => ({ ...s, [key]: p.id }))}
              className={`overflow-hidden rounded-lg border-3 p-1 ${
                active ? "border-[var(--brick-blue)] bg-[#e8f1ff]" : "border-black bg-white"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_data}
                alt={p.label || p.category}
                className="h-20 w-full object-contain"
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="lego-btn lego-btn-primary mt-6 w-full"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : onboarding ? "Continue" : "Save avatar"}
      </button>
      {msg && <p className="mt-2 text-center text-sm font-bold">{msg}</p>}
    </AppShell>
  );
}
