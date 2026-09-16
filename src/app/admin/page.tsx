"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AppQrCard } from "@/components/AppQrCard";

type UserRow = {
  id: string;
  name: string;
  role: string;
  job: string | null;
  created_at: string;
  avatar_complete: boolean;
  password_plain?: string | null;
  must_change_password?: boolean;
};

type Piece = {
  id: string;
  category: string;
  label: string | null;
  image_data: string;
  image_back?: string | null;
  quantity?: number;
};

type Build = {
  id: string;
  title: string;
  description: string | null;
  image_data: string;
  status: string;
  admin_notes: string | null;
  user_name?: string;
};

type Standard = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_exception: boolean;
};

type CatalogSet = {
  id: string;
  name: string;
  image_data: string;
  notes: string | null;
  owner_id: string | null;
  owner_name: string | null;
};

const CATEGORIES = ["helmet", "hair", "head", "shirt", "pants"] as const;

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: string; name: string; role: string } | null>(null);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
  const [tab, setTab] = useState<"scan" | "sets" | "pieces" | "users" | "reviews" | "rules">(
    "scan"
  );
  const [scanMode, setScanMode] = useState<"pieces" | "set">("pieces");
  const [setName, setSetName] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [catalog, setCatalog] = useState<CatalogSet[]>([]);
  const [scanPreview, setScanPreview] = useState<Piece[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<"player" | "admin">("player");
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { name: string; role: string; password: string; job: string }>
  >({});

  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleBody, setRuleBody] = useState("");
  const [ruleException, setRuleException] = useState(false);
  const [accessGateEnabled, setAccessGateEnabled] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);

  async function loadAll() {
    const [u, b, s, p, c, gate] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/builds?all=1").then((r) => r.json()),
      fetch("/api/standards").then((r) => r.json()),
      fetch("/api/avatar/pieces").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/settings/access-gate", { cache: "no-store" }).then((r) => r.json()),
    ]);
    const list = (u.users || []) as UserRow[];
    setUsers(list);
    setBuilds(b.builds || []);
    setStandards(s.standards || []);
    setPieces(p.pieces || []);
    setCatalog(c.sets || []);
    setAccessGateEnabled(Boolean(gate.accessGateEnabled));
    setEditDrafts((prev) => {
      const next = { ...prev };
      for (const person of list) {
        const storedPass = person.password_plain || "";
        const existing = next[person.id];
        next[person.id] = {
          name: existing?.name || person.name,
          role: existing?.role || person.role,
          job: existing?.job ?? person.job ?? "",
          // Always show the stored password so admin can view/edit it.
          password: storedPass,
        };
      }
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (me) => {
        if (!me.user) {
          router.replace("/auth");
          return;
        }
        if (!me.canAdmin) {
          router.replace("/home");
          return;
        }
        if (me.playerMode) {
          await fetch("/api/admin/player-mode", { method: "DELETE" });
        }
        if (me.actingAs) {
          await fetch("/api/admin/act-as", { method: "DELETE" });
        }
        setUser(me.realUser || me.user);
        setActingAs(null);
        loadAll();
      });
  }, [router]);

  async function onScanFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/admin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: reader.result,
            mode: scanMode,
            name: setName || file.name.replace(/\.[^.]+$/, ""),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg(data.error || "Scan failed");
          return;
        }
        if (data.mode === "set") {
          setScanPreview([]);
          setSetName("");
          setMsg(data.note || "Set saved to catalog.");
          setTab("sets");
        } else {
          setScanPreview(data.pieces || []);
          setMsg(data.note || "Pieces saved.");
        }
        loadAll();
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function setPieceQuantity(id: string, quantity: number) {
    await fetch("/api/admin/scan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantity }),
    });
    loadAll();
  }

  async function reassign(id: string, category: string) {
    await fetch("/api/admin/scan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category }),
    });
    setScanPreview((prev) => prev.map((p) => (p.id === id ? { ...p, category } : p)));
    loadAll();
  }

  async function assignSetOwner(id: string, owner_id: string) {
    await fetch("/api/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, owner_id: owner_id || null }),
    });
    loadAll();
  }

  async function deleteSet(id: string) {
    await fetch(`/api/catalog?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  async function addUser() {
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, password: newPass, role: newRole }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not add user");
      return;
    }
    setNewName("");
    setNewPass("");
    setMsg(`Added ${data.user.name}`);
    loadAll();
  }

  function draft(id: string) {
    return editDrafts[id] || { name: "", role: "player", password: "", job: "" };
  }

  function setDraft(
    id: string,
    patch: Partial<{ name: string; role: string; password: string; job: string }>
  ) {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: { ...draft(id), ...patch },
    }));
  }

  async function saveUser(id: string) {
    setBusy(true);
    setMsg("");
    const d = draft(id);
    const person = users.find((u) => u.id === id);
    const passwordChanged =
      Boolean(d.password) && d.password !== (person?.password_plain || "");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: d.name,
        role: d.role,
        job: d.job,
        password: passwordChanged ? d.password : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not save user");
      return;
    }
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        name: data.user.name,
        role: data.user.role,
        job: data.user.job || "",
        password: data.user.password_plain || d.password || "",
      },
    }));
    setMsg(`Saved ${data.user.name}`);
    if (user?.id === id) setUser({ ...user, name: data.user.name, role: data.user.role });
    loadAll();
  }

  async function deleteUser(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? Builds and ownership will be removed.`)) return;
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not delete user");
      return;
    }
    setMsg(`Deleted ${name}`);
    loadAll();
  }

  async function actAsUser(id: string, name: string) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/act-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not switch");
      return;
    }
    setMsg(`Signed in as ${name}`);
    router.push("/home");
  }

  async function playAsPlayer() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/player-mode", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Could not enter player mode");
      return;
    }
    router.push("/home");
  }

  async function deletePiece(id: string) {
    if (!window.confirm("Delete this piece?")) return;
    setBusy(true);
    await fetch(`/api/admin/scan?id=${id}`, { method: "DELETE" });
    setBusy(false);
    setScanPreview((prev) => prev.filter((p) => p.id !== id));
    loadAll();
  }

  async function saveRule(id: string, patch: Partial<Standard>) {
    setBusy(true);
    const res = await fetch("/api/standards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Could not save rule");
      return;
    }
    loadAll();
  }

  async function review(id: string, status: "approved" | "rejected", admin_notes: string) {
    await fetch("/api/builds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, admin_notes }),
    });
    loadAll();
  }

  async function addRule() {
    const res = await fetch("/api/standards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ruleTitle,
        body: ruleBody,
        is_exception: ruleException,
        sort_order: standards.length + 1,
      }),
    });
    if (res.ok) {
      setRuleTitle("");
      setRuleBody("");
      setRuleException(false);
      loadAll();
    }
  }

  async function deleteRule(id: string) {
    await fetch(`/api/standards?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  async function toggleAccessGate() {
    const next = !accessGateEnabled;
    setGateBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/access-gate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessGateEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not update access gate");
        return;
      }
      setAccessGateEnabled(Boolean(data.accessGateEnabled));
      setMsg(
        data.accessGateEnabled
          ? "Access gate enabled."
          : "Access gate disabled."
      );
    } finally {
      setGateBusy(false);
    }
  }

  if (!user) return <main className="loading-screen">Loading…</main>;

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://legotrack-449.netlify.app";

  return (
    <AppShell user={user} isAdmin canAdmin actingAs={actingAs} mustChangePassword={false}>
      <section className="panel">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">Admin</h1>
        <p className="soft-copy mt-3">
          Scan inventory, manage users, review builds, and edit rules.
        </p>
        <button
          type="button"
          className="lego-btn lego-btn-blue mt-5 w-full"
          disabled={busy}
          onClick={playAsPlayer}
        >
          Switch to player mode
        </button>
      </section>

      <AppQrCard url={appUrl} />

      <section className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="brand-title text-[clamp(1.2rem,3.2vw,1.5rem)]">Access gate</h2>
          <p className="soft-copy mt-1.5 text-[0.95rem]">
            {accessGateEnabled
              ? "On — only the kiosk and admin accounts can sign in."
              : "Off — all devices can sign in."}
          </p>
        </div>
        <button
          type="button"
          disabled={gateBusy}
          onClick={toggleAccessGate}
          className={`min-h-[3.25rem] shrink-0 rounded-xl border-4 border-black px-5 text-base font-extrabold touch-manipulation ${
            accessGateEnabled ? "bg-[var(--brick-red)] text-white" : "bg-[var(--brick-yellow)]"
          } ${gateBusy ? "opacity-50" : ""}`}
        >
          {gateBusy ? "Saving…" : accessGateEnabled ? "Turn OFF" : "Turn ON"}
        </button>
      </section>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {(
          [
            ["scan", "Scan"],
            ["pieces", "Pieces"],
            ["sets", "Sets"],
            ["users", "People"],
            ["reviews", "Reviews"],
            ["rules", "Rules"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`chip shrink-0 ${tab === id ? "chip-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <p className="rounded-xl border-3 border-black bg-white px-4 py-3 text-base font-extrabold">
          {msg}
        </p>
      )}

      {tab === "scan" && (
        <section className="panel space-y-5">
          <div>
            <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Scan</h2>
            <p className="soft-copy mt-2 text-[1rem]">
              Place pieces on a plain floor with space between them, then take a photo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScanMode("pieces")}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border-4 border-black px-2 text-center text-sm font-extrabold touch-manipulation sm:text-base ${
                scanMode === "pieces" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Pieces
              <span className="mt-1 text-[11px] font-bold opacity-70">Multiple</span>
            </button>
            <button
              type="button"
              onClick={() => setScanMode("set")}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border-4 border-black px-2 text-center text-sm font-extrabold touch-manipulation sm:text-base ${
                scanMode === "set" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Set
              <span className="mt-1 text-[11px] font-bold opacity-70">Catalog</span>
            </button>
          </div>

          {scanMode === "set" && (
            <input
              className="field"
              placeholder="Set name"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
            />
          )}

          <label className={`file-btn min-h-[4.5rem] text-lg ${busy ? "opacity-50" : ""}`}>
            {busy
              ? scanMode === "pieces"
                ? "Scanning…"
                : "Saving…"
              : "Add photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              onChange={(e) => onScanFile(e.target.files?.[0] || null)}
            />
          </label>

          {scanMode === "pieces" && scanPreview.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-extrabold">Scan results</h3>
              <div className="grid grid-cols-2 gap-3">
                {scanPreview.map((p) => (
                  <div key={p.id} className="tile space-y-2 p-3">
                    <div className="checker flex h-32 items-center justify-center rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_data} alt="" className="h-28 w-full object-contain" />
                    </div>
                    <select
                      className="field min-h-12 text-base capitalize"
                      value={p.category}
                      onChange={(e) => reassign(p.id, e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <label className="block text-xs font-extrabold uppercase text-black/55">
                      Qty
                      <input
                        className="field mt-1 min-h-11"
                        type="number"
                        min={1}
                        max={99}
                        defaultValue={p.quantity || 1}
                        onBlur={(e) => setPieceQuantity(p.id, Number(e.target.value) || 1)}
                      />
                    </label>
                    <button
                      type="button"
                      className="chip min-h-10 w-full border-[var(--brick-red)] bg-[#fecaca] text-sm"
                      onClick={() => deletePiece(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "pieces" && (
        <section className="panel space-y-4">
          <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">
            Piece library ({pieces.length})
          </h2>
          <p className="soft-copy">
            Edit category, quantity, or remove pieces.
          </p>
          {pieces.length === 0 && (
            <p className="soft-copy text-center">No pieces yet.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pieces.map((p) => (
              <div key={p.id} className="tile space-y-2 p-3">
                <div className="checker flex h-28 items-center justify-center rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_data} alt="" className="h-24 w-full object-contain" />
                </div>
                <p className="truncate text-sm font-extrabold">{p.label || p.category}</p>
                <select
                  className="field min-h-12 text-base capitalize"
                  value={p.category}
                  onChange={(e) => reassign(p.id, e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-extrabold uppercase text-black/55">
                  Qty
                  <input
                    className="field mt-1 min-h-11"
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={p.quantity || 1}
                    onBlur={(e) => setPieceQuantity(p.id, Number(e.target.value) || 1)}
                  />
                </label>
                <button
                  type="button"
                  className="chip min-h-10 w-full border-[var(--brick-red)] bg-[#fecaca] text-sm"
                  disabled={busy}
                  onClick={() => deletePiece(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "sets" && (
        <section className="stack">
          <p className="soft-copy">
            Assign an owner to each set.
          </p>
          {catalog.length === 0 && (
            <p className="soft-copy text-center">No sets yet.</p>
          )}
          {catalog.map((s) => (
            <article key={s.id} className="panel space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image_data}
                alt={s.name}
                className="max-h-48 w-full rounded-xl border-3 border-black bg-[#fff8d6] object-contain"
              />
              <h3 className="text-lg font-extrabold sm:text-xl">{s.name}</h3>
              <label className="block text-base font-extrabold">
                Owner
                <select
                  className="field mt-2"
                  value={s.owner_id || ""}
                  onChange={(e) => assignSetOwner(s.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="chip min-h-11 border-[var(--brick-red)] bg-[#fecaca] text-sm"
                onClick={() => deleteSet(s.id)}
              >
                Delete set
              </button>
            </article>
          ))}
        </section>
      )}

      {tab === "users" && (
        <section className="stack">
          <div className="panel space-y-4">
            <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Add user</h2>
            <input
              className="field"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="field"
              placeholder="Password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            <select
              className="field"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "player" | "admin")}
            >
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-sm font-bold text-black/55">
              New players must change their password on first sign-in.
            </p>
            <button
              type="button"
              className="lego-btn lego-btn-yellow w-full"
              disabled={busy}
              onClick={addUser}
            >
              Add
            </button>
          </div>

          {users.map((u) => {
            const d = draft(u.id);
            const isSelf = user.id === u.id;
            return (
              <article key={u.id} className="panel space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-black/55">
                    {u.avatar_complete ? "Avatar complete" : "No avatar"}
                    {isSelf ? " · you" : ""}
                  </p>
                  {isSelf ? (
                    <button
                      type="button"
                      className="chip min-h-11 bg-[#bbf7d0] px-3 text-sm"
                      disabled={busy}
                      onClick={playAsPlayer}
                    >
                      Player mode
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chip min-h-11 bg-[#7dd3fc] px-3 text-sm"
                      disabled={busy}
                      onClick={() => actAsUser(u.id, u.name)}
                    >
                      Sign in as
                    </button>
                  )}
                </div>
                <label className="block text-base font-extrabold">
                  Name
                  <input
                    className="field mt-2"
                    value={d.name}
                    onChange={(e) => setDraft(u.id, { name: e.target.value })}
                  />
                </label>
                <label className="block text-base font-extrabold">
                  Job
                  <input
                    className="field mt-2"
                    placeholder="Job title"
                    value={d.job}
                    onChange={(e) => setDraft(u.id, { job: e.target.value })}
                  />
                </label>
                <label className="block text-base font-extrabold">
                  Role
                  <select
                    className="field mt-2"
                    value={d.role}
                    onChange={(e) => setDraft(u.id, { role: e.target.value })}
                  >
                    <option value="player">Player</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="block text-base font-extrabold">
                  Password
                  <input
                    className="field mt-2"
                    type="text"
                    autoComplete="off"
                    value={d.password}
                    onChange={(e) => setDraft(u.id, { password: e.target.value })}
                  />
                </label>
                {u.must_change_password ? (
                  <p className="text-sm font-bold text-black/55">
                    Password change required on next sign-in.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="lego-btn lego-btn-yellow text-[clamp(0.95rem,2.2vw,1.2rem)]"
                    disabled={busy}
                    onClick={() => saveUser(u.id)}
                  >
                    Save
                  </button>
                  {!isSelf ? (
                    <button
                      type="button"
                      className="lego-btn lego-btn-red text-[clamp(0.95rem,2.2vw,1.2rem)]"
                      disabled={busy}
                      onClick={() => deleteUser(u.id, u.name)}
                    >
                      Delete
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {tab === "reviews" && (
        <section className="stack">
          {builds.map((b) => (
            <article key={b.id} className="panel space-y-3">
              <div>
                <h3 className="text-lg font-extrabold sm:text-xl">{b.title}</h3>
                <p className="mt-1 text-sm font-bold text-black/60">
                  {b.user_name || "player"} · {b.status}
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image_data}
                alt={b.title}
                className="max-h-52 w-full rounded-xl border-3 border-black object-cover"
              />
              {b.status === "pending" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="lego-btn lego-btn-green text-[clamp(0.95rem,2.2vw,1.2rem)]"
                    onClick={() =>
                      review(b.id, "approved", "Approved.")
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="lego-btn lego-btn-red text-[clamp(0.95rem,2.2vw,1.2rem)]"
                    onClick={() =>
                      review(b.id, "rejected", "Rejected.")
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
          {builds.length === 0 && (
            <p className="soft-copy text-center">No submissions yet.</p>
          )}
        </section>
      )}

      {tab === "rules" && (
        <section className="panel space-y-4">
          <h2 className="brand-title text-[clamp(1.35rem,3.5vw,1.75rem)]">Add standard</h2>
          <input
            className="field"
            placeholder="Title"
            value={ruleTitle}
            onChange={(e) => setRuleTitle(e.target.value)}
          />
          <textarea
            className="field"
            placeholder="Body"
            value={ruleBody}
            onChange={(e) => setRuleBody(e.target.value)}
          />
          <label className="flex min-h-12 items-center gap-3 text-base font-extrabold">
            <input
              type="checkbox"
              className="h-6 w-6 accent-[var(--brick-blue)]"
              checked={ruleException}
              onChange={(e) => setRuleException(e.target.checked)}
            />
            Mark as exception
          </label>
          <button type="button" className="lego-btn lego-btn-yellow w-full" onClick={addRule}>
            Save rule
          </button>
          <ul className="space-y-3 pt-2">
            {standards.map((s) => (
              <li key={s.id} className="tile space-y-3 p-4">
                <label className="block text-base font-extrabold">
                  Title
                  <input
                    className="field mt-2"
                    value={s.title}
                    onChange={(e) =>
                      setStandards((list) =>
                        list.map((row) =>
                          row.id === s.id ? { ...row, title: e.target.value } : row
                        )
                      )
                    }
                  />
                </label>
                <label className="block text-base font-extrabold">
                  Body
                  <textarea
                    className="field mt-2"
                    value={s.body}
                    onChange={(e) =>
                      setStandards((list) =>
                        list.map((row) =>
                          row.id === s.id ? { ...row, body: e.target.value } : row
                        )
                      )
                    }
                  />
                </label>
                <label className="flex min-h-12 items-center gap-3 text-base font-extrabold">
                  <input
                    type="checkbox"
                    className="h-6 w-6 accent-[var(--brick-blue)]"
                    checked={s.is_exception}
                    onChange={(e) =>
                      setStandards((list) =>
                        list.map((row) =>
                          row.id === s.id ? { ...row, is_exception: e.target.checked } : row
                        )
                      )
                    }
                  />
                  Exception
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="lego-btn lego-btn-yellow text-[clamp(0.95rem,2.2vw,1.2rem)]"
                    disabled={busy}
                    onClick={() =>
                      saveRule(s.id, {
                        title: s.title,
                        body: s.body,
                        is_exception: s.is_exception,
                      })
                    }
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="lego-btn lego-btn-red text-[clamp(0.95rem,2.2vw,1.2rem)]"
                    onClick={() => deleteRule(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
