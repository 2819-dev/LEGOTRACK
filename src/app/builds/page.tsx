"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type Build = {
  id: string;
  title: string;
  description: string | null;
  image_data: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
};

export default function BuildsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/builds");
    const data = await res.json();
    setBuilds(data.builds || []);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) router.replace("/auth");
        else setUser(me.user);
      });
    refresh();
  }, [router]);

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setMsg("");
    const res = await fetch("/api/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, image }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Submit failed");
      return;
    }
    setTitle("");
    setDescription("");
    setImage("");
    setMsg("Submitted for review!");
    refresh();
  }

  if (!user) return <main className="p-8 text-center font-bold">Loading…</main>;

  return (
    <AppShell user={user}>
      <section className="panel space-y-3">
        <h1 className="brand-title text-3xl">Submit a build</h1>
        <p className="text-sm text-black/70">
          Photo your house, car, or street. Admins review against community standards.
        </p>
        <input
          className="field"
          placeholder="Build title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="field min-h-24"
          placeholder="Optional notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Preview" className="max-h-48 rounded-lg border-2 border-black object-contain" />
        )}
        <button type="button" className="lego-btn lego-btn-primary w-full" onClick={submit}>
          Submit for review
        </button>
        {msg && <p className="text-sm font-bold">{msg}</p>}
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="brand-title text-2xl">Your submissions</h2>
        {builds.length === 0 && <p className="text-sm font-semibold text-black/60">None yet.</p>}
        {builds.map((b) => (
          <article key={b.id} className="panel">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-extrabold">{b.title}</h3>
              <span
                className={`rounded-full border-2 border-black px-2 py-0.5 text-xs font-bold uppercase ${
                  b.status === "approved"
                    ? "bg-[var(--brick-green)] text-white"
                    : b.status === "rejected"
                      ? "bg-[var(--brick-red)] text-white"
                      : "bg-[var(--brick-yellow)]"
                }`}
              >
                {b.status}
              </span>
            </div>
            {b.description && <p className="mt-1 text-sm">{b.description}</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image_data}
              alt={b.title}
              className="mt-2 max-h-40 w-full rounded-md border-2 border-black object-cover"
            />
            {b.admin_notes && (
              <p className="mt-2 text-sm font-semibold text-black/70">Admin: {b.admin_notes}</p>
            )}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
