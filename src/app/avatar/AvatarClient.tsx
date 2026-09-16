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
  const [user, setUser] = useState<{
    id?: string;
    name: string;
    role: string;
    job?: string | null;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [playerMode, setPlayerMode] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
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

  const [nameDraft, setNameDraft] = useState("");
  const [jobDraft, setJobDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/auth/me"), fetch("/api/avatar/pieces"), fetch("/api/avatar")]).then(
      async ([meRes, piecesRes, avatarRes]) => {
        const me = await meRes.json();
        if (!me.user) {
          router.replace("/auth");
          return;
        }
        setUser(me.user);
        setNameDraft(me.user.name || "");
        setJobDraft(me.user.job || "");
        setIsAdmin(Boolean(me.isAdmin));
        setCanAdmin(Boolean(me.canAdmin));
        setPlayerMode(Boolean(me.playerMode));
        setActingAs(me.actingAs || null);
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

  async function saveAccount() {
    setAccountBusy(true);
    setAccountMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameDraft,
        job: jobDraft,
        password: newPassword || undefined,
        currentPassword: currentPassword || undefined,
      }),
    });
    const data = await res.json();
    setAccountBusy(false);
    if (!res.ok) {
      setAccountMsg(data.error || "Could not update account");
      return;
    }
    setUser((u) =>
      u
        ? {
            ...u,
            name: data.profile.name,
            job: data.profile.job,
          }
        : u
    );
    setNameDraft(data.profile.name);
    setJobDraft(data.profile.job || "");
    setCurrentPassword("");
    setNewPassword("");
    setAccountMsg("Account saved");
  }

  if (!user) return <main className="loading-screen">Loading…</main>;

  return (
    <AppShell
      user={user}
      isAdmin={isAdmin}
      canAdmin={canAdmin}
      playerMode={playerMode}
      actingAs={actingAs}
    >
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">
          {onboarding ? "Create your avatar" : "Me"}
        </h1>
        <p className="soft-copy mt-3">
          Build your minifig, and change your name or password anytime.
        </p>
      </section>

      {!onboarding && (
        <section className="panel space-y-4">
          <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Your account</h2>
          <label className="block text-base font-extrabold">
            Username
            <input
              className="field mt-2"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
          </label>
          <label className="block text-base font-extrabold">
            Job
            <input
              className="field mt-2"
              placeholder="Builder, mayor…"
              value={jobDraft}
              onChange={(e) => setJobDraft(e.target.value)}
            />
          </label>
          {!canAdmin && (
            <label className="block text-base font-extrabold">
              Current password
              <input
                className="field mt-2"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          )}
          <label className="block text-base font-extrabold">
            New password
            <input
              className="field mt-2"
              type="password"
              placeholder={canAdmin ? "Leave blank to keep" : "Leave blank to keep"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            className="lego-btn lego-btn-yellow w-full"
            disabled={accountBusy}
            onClick={saveAccount}
          >
            {accountBusy ? "Saving…" : "Save account"}
          </button>
          {accountMsg && <p className="text-center text-base font-extrabold">{accountMsg}</p>}
        </section>
      )}

      <section className="panel">
        <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Avatar builder</h2>
        <p className="soft-copy mt-2">
          Pick real scanned pieces — hair, head, shirt, and pants.
        </p>
      </section>

      <div className="panel flex justify-center bg-[linear-gradient(180deg,#dbeafe,#fffef5)] py-6 sm:py-8">
        <div className="relative flex h-72 w-44 flex-col items-center overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[5px_5px_0_#111] sm:h-80 sm:w-48">
          {preview.hair ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.hair} alt="" className="h-[18%] w-full object-contain" />
          ) : (
            <div className="flex h-[18%] w-full items-center justify-center bg-black/5 text-xs font-bold">
              hair
            </div>
          )}
          {preview.head ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.head} alt="" className="h-[28%] w-full object-contain" />
          ) : (
            <div className="flex h-[28%] w-full items-center justify-center bg-black/5 text-xs font-bold">
              head
            </div>
          )}
          {preview.shirt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.shirt} alt="" className="h-[28%] w-full object-contain" />
          ) : (
            <div className="flex h-[28%] w-full items-center justify-center bg-black/5 text-xs font-bold">
              shirt
            </div>
          )}
          {preview.pants ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.pants} alt="" className="h-[26%] w-full object-contain" />
          ) : (
            <div className="flex h-[26%] w-full items-center justify-center bg-black/5 text-xs font-bold">
              pants
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`chip shrink-0 capitalize ${tab === t ? "chip-active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {byTab.length === 0 && (
          <p className="soft-copy col-span-full text-center">
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
              className={`tile min-h-[5.5rem] p-2 transition-transform active:scale-[0.97] ${
                active ? "bg-[#dbeafe] ring-4 ring-[var(--brick-blue)]" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_data}
                alt={p.label || p.category}
                className="h-24 w-full object-contain sm:h-28"
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="lego-btn lego-btn-yellow w-full"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : onboarding ? "Continue" : "Save avatar"}
      </button>
      {msg && <p className="text-center text-base font-extrabold">{msg}</p>}
    </AppShell>
  );
}
