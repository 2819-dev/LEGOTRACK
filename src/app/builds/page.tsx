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
  const [isAdmin, setIsAdmin] = useState(false);
  const [actingAs, setActingAs] = useState<{ name: string } | null>(null);
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
        else {
          setUser(me.user);
          setIsAdmin(Boolean(me.isAdmin));
          setActingAs(me.actingAs || null);
        }
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

  if (!user) return <main className="loading-screen">Loading…</main>;

  return (
    <AppShell user={user} isAdmin={isAdmin} actingAs={actingAs}>
      <section className="panel space-y-4">
        <h1 className="brand-title text-[clamp(1.85rem,5vw,2.6rem)]">Submit a build</h1>
        <p className="soft-copy">
          Photo your house, car, or street. Admins review against community standards.
        </p>
        <input
          className="field"
          placeholder="Build title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="field"
          placeholder="Optional notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="file-btn">
          {image ? "Change photo" : "Take or pick a photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="Preview"
            className="max-h-56 w-full rounded-xl border-4 border-black object-contain"
          />
        )}
        <button type="button" className="lego-btn lego-btn-yellow w-full" onClick={submit}>
          Submit for review
        </button>
        {msg && <p className="text-base font-extrabold">{msg}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="brand-title text-[clamp(1.5rem,4vw,2rem)]">Your submissions</h2>
        {builds.length === 0 && (
          <p className="soft-copy text-center">None yet — snap a build and send it in!</p>
        )}
        {builds.map((b) => (
          <article key={b.id} className="panel space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-extrabold leading-tight sm:text-xl">{b.title}</h3>
              <span
                className={`status-pill shrink-0 ${
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
            {b.description && <p className="soft-copy text-[1rem]">{b.description}</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image_data}
              alt={b.title}
              className="max-h-48 w-full rounded-xl border-3 border-black object-cover"
            />
            {b.admin_notes && (
              <p className="rounded-xl bg-[#fff8d6] p-3 text-base font-bold text-black/75">
                Admin: {b.admin_notes}
              </p>
            )}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
