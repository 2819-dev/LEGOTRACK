import { Suspense } from "react";
import AvatarClient from "./AvatarClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="loading-screen">Loading…</main>}>
      <AvatarClient />
    </Suspense>
  );
}
