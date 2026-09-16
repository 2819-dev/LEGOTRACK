"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function AppQrCard({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#111111", light: "#FFFDF5" },
      errorCorrectionLevel: "M",
    }).then((png) => {
      if (!cancelled) setDataUrl(png);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <section className="panel flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="brand-title text-[clamp(1.2rem,3.2vw,1.5rem)]">QR code</h2>
        <p className="soft-copy mt-1.5 text-[0.95rem]">
          Open this app on another device.
        </p>
      </div>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt="QR code for LEGOTRACK"
          className="h-56 w-56 rounded-xl border-4 border-black bg-white p-2 sm:h-64 sm:w-64"
        />
      ) : (
        <div className="flex h-56 w-56 items-center justify-center rounded-xl border-4 border-black bg-white text-sm font-extrabold sm:h-64 sm:w-64">
          Loading…
        </div>
      )}
      <p className="break-all text-sm font-extrabold text-black/70">{url}</p>
      {dataUrl && (
        <a
          href={dataUrl}
          download="legotrack-qr.png"
          className="chip min-h-11 bg-white px-4 text-sm"
        >
          Download QR
        </a>
      )}
    </section>
  );
}
