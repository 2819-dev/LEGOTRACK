import type { Metadata, Viewport } from "next";
import { Bowlby_One_SC, Nunito } from "next/font/google";
import "./globals.css";

const brick = Bowlby_One_SC({
  variable: "--font-brick",
  subsets: ["latin"],
  weight: "400",
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LEGOTRACK",
  description: "LEGOTRACK — Lego city avatars, standards, and build review",
  applicationName: "LEGOTRACK",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LEGOTRACK",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFD500",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${brick.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
