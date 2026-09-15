"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type UserRow = {
  id: string;
  name: string;
  role: string;
  created_at: string;
  avatar_complete: boolean;
};

type Piece = {
  id: string;
  category: string;
  label: string | null;
  image_data: string;
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

const CATEGORIES = ["hair", "head", "shirt", "pants"] as const;

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [tab, setTab] = useState<"scan" | "users" | "reviews" | "rules">("scan");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [scanPreview, setScanPreview] = useState<Piece[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<"player" | "admin">("player");

  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleBody, setRuleBody] = useState("");
  const [ruleException, setRuleException] = useState(false);

  async function loadAll() {
    const [u, b, s, p] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/builds").then((r) => r.json()),
      fetch("/api/standards").then((r) => r.json()),
      fetch("/api/avatar/pieces").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setBuilds(b.builds || []);
    setStandards(s.standards || []);
    setPieces(p.pieces || []);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) {
          router.replace("/auth");
          return;
        }
        if (me.user.role !== "admin") {
          router.replace("/home");
          return;
        }
        setUser(me.user);
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
          body: JSON.stringify({ image: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg(data.error || "Scan failed");
          return;
        }
        setScanPreview(data.pieces || []);
        setMsg("Split into hair / head / shirt / pants. Reassign tabs if needed.");
        loadAll();
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
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

  if (!user) return <main className="p-8 text-center font-bold">Loading…</main>;

  return (
    <AppShell user={user}>
      <section className="panel">
        <h1 className="brand-title text-3xl">Admin panel</h1>
        <p className="mt-1 text-sm text-black/70">
          Scan minifigs, manage people, review builds, edit city rules.
        </p>
      </section>

      <div className="mt-3 flex gap-1 overflow-x-auto">
        {(
          [
            ["scan", "Scan pieces"],
            ["users", "People"],
            ["reviews", "Reviews"],
            ["rules", "Rules"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md border-2 border-black px-3 py-1.5 text-sm font-bold ${
              tab === id ? "bg-black text-white" : "bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}

      {tab === "scan" && (
        <section className="panel mt-4 space-y-3">
          <h2 className="brand-title text-xl">Scan minifig / pieces</h2>
          <p className="text-sm text-black/70">
            Upload a full figure or a tray of parts. Full characters are always saved as separate
            hair, head, shirt, and pants — never as one locked outfit.
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => onScanFile(e.target.files?.[0] || null)}
          />
          {busy && <p className="text-sm font-semibold">Splitting…</p>}
          <div className="grid grid-cols-2 gap-2">
            {scanPreview.map((p) => (
              <div key={p.id} className="rounded-lg border-2 border-black p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_data} alt="" className="h-24 w-full object-contain" />
                <select
                  className="field mt-2 text-sm"
                  value={p.category}
                  onChange={(e) => reassign(p.id, e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <h3 className="pt-2 font-extrabold">Library ({pieces.length})</h3>
          <div className="grid grid-cols-4 gap-2">
            {pieces.slice(0, 24).map((p) => (
              <div key={p.id} className="rounded border-2 border-black bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_data} alt="" className="h-14 w-full object-contain" />
                <p className="truncate text-center text-[10px] font-bold capitalize">{p.category}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "users" && (
        <section className="panel mt-4 space-y-3">
          <h2 className="brand-title text-xl">Add person</h2>
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
          <button type="button" className="lego-btn lego-btn-primary w-full" onClick={addUser}>
            Add
          </button>
          <ul className="space-y-2 pt-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between border-b border-black/10 py-2">
                <div>
                  <p className="font-extrabold">{u.name}</p>
                  <p className="text-xs text-black/60">
                    {u.role}
                    {u.avatar_complete ? " · avatar ready" : " · no avatar"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "reviews" && (
        <section className="mt-4 space-y-3">
          {builds.map((b) => (
            <article key={b.id} className="panel space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <h3 className="font-extrabold">{b.title}</h3>
                  <p className="text-xs text-black/60">
                    {b.user_name || "player"} · {b.status}
                  </p>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image_data}
                alt={b.title}
                className="max-h-48 w-full rounded-md border-2 border-black object-cover"
              />
              {b.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border-2 border-black bg-[var(--brick-green)] px-2 py-2 text-sm font-bold text-white"
                    onClick={() => review(b.id, "approved", "Looks good for the city.")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md border-2 border-black bg-[var(--brick-red)] px-2 py-2 text-sm font-bold text-white"
                    onClick={() =>
                      review(
                        b.id,
                        "rejected",
                        "Needs more realism / better scale — check the standards."
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
          {builds.length === 0 && <p className="text-sm font-semibold">No submissions yet.</p>}
        </section>
      )}

      {tab === "rules" && (
        <section className="panel mt-4 space-y-3">
          <h2 className="brand-title text-xl">Add standard</h2>
          <input
            className="field"
            placeholder="Title"
            value={ruleTitle}
            onChange={(e) => setRuleTitle(e.target.value)}
          />
          <textarea
            className="field min-h-24"
            placeholder="Body"
            value={ruleBody}
            onChange={(e) => setRuleBody(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={ruleException}
              onChange={(e) => setRuleException(e.target.checked)}
            />
            Mark as exception
          </label>
          <button type="button" className="lego-btn lego-btn-primary w-full" onClick={addRule}>
            Save rule
          </button>
          <ul className="space-y-2 pt-2">
            {standards.map((s) => (
              <li key={s.id} className="rounded-lg border-2 border-black p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold">
                      {s.title}
                      {s.is_exception ? " (exception)" : ""}
                    </p>
                    <p className="text-sm">{s.body}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-bold text-[var(--brick-red)]"
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
