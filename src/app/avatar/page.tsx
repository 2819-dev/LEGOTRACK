import { Suspense } from "react";
import AvatarClient from "./AvatarClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-center font-bold">Loading…</main>}>
      <AvatarClient />
    </Suspense>
  );
}
