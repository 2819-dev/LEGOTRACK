"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Minifig3D, Piece3D } from "@/components/Minifig3D";

type Piece = {
  id: string;
  category: "helmet" | "hair" | "head" | "shirt" | "pants";
  label: string | null;
  image_data: string;
  image_back?: string | null;
  quantity: number;
  taken_count: number;
  available: number;
  isTaken: boolean;
};

type Selection = {
  helmet_id: string | null;
  hair_id: string | null;
  head_id: string | null;
  shirt_id: string | null;
  pants_id: string | null;
};

type PieceRequest = {
  id: string;
  piece_id: string;
  piece_label: string | null;
  category: string;
  image_data: string;
  from_name?: string;
  to_name?: string;
};

type Exclusive = {
  id: string;
  name: string;
  quantity: number;
  available: number;
  isTaken: boolean;
  helmet_id: string | null;
  hair_id: string | null;
  head_id: string | null;
  shirt_id: string | null;
  pants_id: string | null;
  helmet_image?: string | null;
  hair_image?: string | null;
  head_image?: string | null;
  shirt_image?: string | null;
  pants_image?: string | null;
  helmet_back?: string | null;
  hair_back?: string | null;
  head_back?: string | null;
  shirt_back?: string | null;
  pants_back?: string | null;
};

const TABS = ["exclusive", "helmet", "hair", "head", "shirt", "pants"] as const;

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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("shirt");
  const [sel, setSel] = useState<Selection>({
    helmet_id: null,
    hair_id: null,
    head_id: null,
    shirt_id: null,
    pants_id: null,
  });
  const [previewPiece, setPreviewPiece] = useState<Piece | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [incoming, setIncoming] = useState<PieceRequest[]>([]);

  const [nameDraft, setNameDraft] = useState("");
  const [jobDraft, setJobDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");
  const [exclusives, setExclusives] = useState<Exclusive[]>([]);
  const [exclusiveId, setExclusiveId] = useState<string | null>(null);
  const [avatarImages, setAvatarImages] = useState<Record<string, string | null>>({});

  async function reloadPiecesAndRequests() {
    const [piecesRes, reqRes, exRes] = await Promise.all([
      fetch("/api/avatar/pieces"),
      fetch("/api/piece-requests"),
      fetch("/api/exclusive-minifigs"),
    ]);
    const p = await piecesRes.json();
    setPieces(p.pieces || []);
    const r = await reqRes.json();
    setIncoming(r.incoming || []);
    const e = await exRes.json();
    setExclusives(e.exclusives || []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/avatar/pieces"),
      fetch("/api/avatar"),
      fetch("/api/piece-requests"),
      fetch("/api/exclusive-minifigs"),
    ]).then(async ([meRes, piecesRes, avatarRes, reqRes, exRes]) => {
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
      setMustChangePassword(Boolean(me.mustChangePassword));
      const p = await piecesRes.json();
      setPieces(p.pieces || []);
      const a = await avatarRes.json();
      if (a.avatar) {
        setSel({
          helmet_id: a.avatar.helmet_id,
          hair_id: a.avatar.hair_id,
          head_id: a.avatar.head_id,
          shirt_id: a.avatar.shirt_id,
          pants_id: a.avatar.pants_id,
        });
        setExclusiveId(a.avatar.exclusive_id || null);
        setAvatarImages({
          helmet: a.avatar.helmet_image,
          helmetBack: a.avatar.helmet_back,
          hair: a.avatar.hair_image,
          hairBack: a.avatar.hair_back,
          head: a.avatar.head_image,
          headBack: a.avatar.head_back,
          shirt: a.avatar.shirt_image,
          shirtBack: a.avatar.shirt_back,
          pants: a.avatar.pants_image,
          pantsBack: a.avatar.pants_back,
        });
        if (a.avatar.exclusive_id) setTab("exclusive");
      }
      const r = await reqRes.json();
      setIncoming(r.incoming || []);
      const e = await exRes.json();
      setExclusives(e.exclusives || []);
    });
  }, [router]);

  const byTab = useMemo(
    () => (tab === "exclusive" ? [] : pieces.filter((p) => p.category === tab)),
    [pieces, tab]
  );
  const preview = useMemo(() => {
    const find = (id: string | null) => pieces.find((p) => p.id === id);
    const helmet = find(sel.helmet_id);
    const hair = find(sel.hair_id);
    const head = find(sel.head_id);
    const shirt = find(sel.shirt_id);
    const pants = find(sel.pants_id);
    return {
      helmet: helmet?.image_data || avatarImages.helmet || null,
      hair: hair?.image_data || avatarImages.hair || null,
      head: head?.image_data || avatarImages.head || null,
      shirt: shirt?.image_data || avatarImages.shirt || null,
      pants: pants?.image_data || avatarImages.pants || null,
      helmetBack: helmet?.image_back || avatarImages.helmetBack || null,
      hairBack: hair?.image_back || avatarImages.hairBack || null,
      headBack: head?.image_back || avatarImages.headBack || null,
      shirtBack: shirt?.image_back || avatarImages.shirtBack || null,
      pantsBack: pants?.image_back || avatarImages.pantsBack || null,
    };
  }, [pieces, sel, avatarImages]);

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sel),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Could not save");
      return;
    }
    setMsg("Avatar saved");
    await reloadPiecesAndRequests();
    if (onboarding) router.push("/home");
  }

  async function choosePiece(p: Piece) {
    setPreviewPiece(p);
    if (p.isTaken) return;
    const key = `${p.category}_id` as keyof Selection;
    setExclusiveId(null);
    setSel((s) => {
      const next = { ...s, [key]: p.id };
      if (p.category === "helmet") next.hair_id = null;
      if (p.category === "hair") next.helmet_id = null;
      return next;
    });
  }

  async function chooseExclusive(ex: Exclusive) {
    if (ex.isTaken && exclusiveId !== ex.id) {
      setMsg("This exclusive minifig is unavailable");
      return;
    }
    setMsg("");
    setSaving(true);
    const res = await fetch("/api/exclusive-minifigs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclusiveId: ex.id }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Could not equip exclusive");
      return;
    }
    setExclusiveId(ex.id);
    setSel({
      helmet_id: ex.helmet_id,
      hair_id: ex.hair_id,
      head_id: ex.head_id,
      shirt_id: ex.shirt_id,
      pants_id: ex.pants_id,
    });
    setAvatarImages({
      helmet: ex.helmet_image || null,
      helmetBack: ex.helmet_back || null,
      hair: ex.hair_image || null,
      hairBack: ex.hair_back || null,
      head: ex.head_image || null,
      headBack: ex.head_back || null,
      shirt: ex.shirt_image || null,
      shirtBack: ex.shirt_back || null,
      pants: ex.pants_image || null,
      pantsBack: ex.pants_back || null,
    });
    setPreviewPiece(null);
    setMsg("Exclusive minifig selected");
    await reloadPiecesAndRequests();
  }

  async function requestPiece(p: Piece) {
    setMsg("");
    const res = await fetch("/api/piece-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pieceId: p.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Could not request");
      return;
    }
    setMsg(data.note || "Request sent");
    await reloadPiecesAndRequests();
  }

  async function handleRequest(id: string, action: "approve" | "decline") {
    const res = await fetch("/api/piece-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Could not update request");
      return;
    }
    setMsg(data.note || (action === "approve" ? "Approved" : "Declined"));
    await reloadPiecesAndRequests();
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
      u ? { ...u, name: data.profile.name, job: data.profile.job } : u
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
      mustChangePassword={mustChangePassword}
    >
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">
          {onboarding ? "Create avatar" : "Account"}
        </h1>
        <p className="soft-copy mt-3">
          Available pieces are listed first. Taken pieces appear below.
        </p>
      </section>

      {incoming.length > 0 && (
        <section className="panel space-y-3 border-[var(--brick-blue)] bg-[#dbeafe]">
          <h2 className="brand-title text-[clamp(1.2rem,3vw,1.5rem)]">Piece requests</h2>
          {incoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border-3 border-black bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image_data} alt="" className="h-14 w-14 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">
                  {r.from_name} requested your {r.piece_label || r.category}
                </p>
                <p className="text-xs font-bold text-black/55">
                  Approving releases this piece from your avatar.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="chip min-h-10 bg-[#bbf7d0] px-3 text-xs"
                  onClick={() => handleRequest(r.id, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="chip min-h-10 bg-[#fecaca] px-3 text-xs"
                  onClick={() => handleRequest(r.id, "decline")}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

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
              placeholder="Job title"
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
              placeholder="Optional"
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

      <section className="panel flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Minifig3D
          helmet={preview.helmet}
          hair={preview.hair}
          head={preview.head}
          shirt={preview.shirt}
          pants={preview.pants}
          helmetBack={preview.helmetBack}
          hairBack={preview.hairBack}
          headBack={preview.headBack}
          shirtBack={preview.shirtBack}
          pantsBack={preview.pantsBack}
          className="h-80 w-full max-w-sm sm:h-[22rem] sm:w-52"
        />
        <div className="w-full flex-1 space-y-3">
          <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Avatar</h2>
          <p className="soft-copy">
            {exclusiveId
              ? "Exclusive minifig selected. Parts cannot be swapped."
              : "Choose parts or an exclusive minifig."}
          </p>
          {previewPiece && !exclusiveId && (
            <Piece3D
              front={previewPiece.image_data}
              back={previewPiece.image_back}
              label={previewPiece.label || previewPiece.category}
              className="h-56 w-full"
            />
          )}
        </div>
      </section>

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

      {tab === "exclusive" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {exclusives.length === 0 && (
            <p className="soft-copy col-span-full text-center">No exclusive minifigs yet.</p>
          )}
          {exclusives.map((ex) => {
            const active = exclusiveId === ex.id;
            return (
              <button
                key={ex.id}
                type="button"
                disabled={ex.isTaken && !active}
                onClick={() => chooseExclusive(ex)}
                className={`tile space-y-2 p-3 text-left ${ex.isTaken && !active ? "piece-taken" : ""} ${
                  active ? "ring-4 ring-[var(--brick-blue)]" : ""
                }`}
              >
                <Minifig3D
                  helmet={ex.helmet_image}
                  hair={ex.hair_image}
                  head={ex.head_image}
                  shirt={ex.shirt_image}
                  pants={ex.pants_image}
                  helmetBack={ex.helmet_back}
                  hairBack={ex.hair_back}
                  headBack={ex.head_back}
                  shirtBack={ex.shirt_back}
                  pantsBack={ex.pants_back}
                  autoRotate={false}
                  className="h-52 w-full"
                />
                <p className="truncate text-sm font-extrabold">{ex.name}</p>
                <p className="text-[11px] font-bold text-black/55">
                  {ex.isTaken && !active
                    ? "Taken"
                    : `${ex.available} available · ${ex.quantity} total`}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {exclusiveId && (
            <p className="soft-copy col-span-full text-center">
              Clear the exclusive minifig by picking a part below.
            </p>
          )}
          {byTab.length === 0 && (
            <p className="soft-copy col-span-full text-center">
              No {tab} pieces available.
            </p>
          )}
          {byTab.map((p) => {
            const key = `${p.category}_id` as keyof Selection;
            const active = !exclusiveId && sel[key] === p.id;
            return (
              <div
                key={p.id}
                className={`tile relative p-2 ${p.isTaken ? "piece-taken" : ""} ${
                  active ? "ring-4 ring-[var(--brick-blue)]" : ""
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => choosePiece(p)}>
                  <div className="checker mb-2 flex h-28 items-center justify-center rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_data}
                      alt={p.label || p.category}
                      className="h-24 w-full object-contain"
                    />
                  </div>
                  <p className="truncate text-sm font-extrabold">{p.label || p.category}</p>
                  <p className="text-[11px] font-bold text-black/55">
                    {p.isTaken
                      ? "Taken"
                      : `${p.available} available · ${p.quantity} total`}
                  </p>
                </button>
                {p.isTaken && (
                  <button
                    type="button"
                    className="chip mt-2 min-h-10 w-full bg-[var(--brick-yellow)] text-xs"
                    onClick={() => requestPiece(p)}
                  >
                    Request
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab !== "exclusive" && (
        <button
          type="button"
          className="lego-btn lego-btn-yellow w-full"
          disabled={saving || Boolean(exclusiveId)}
          onClick={save}
        >
          {saving ? "Saving…" : onboarding ? "Continue" : "Save avatar"}
        </button>
      )}
      {msg && <p className="text-center text-base font-extrabold">{msg}</p>}
    </AppShell>
  );
}
