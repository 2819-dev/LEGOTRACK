import type { Metadata, Viewport } from "next";
import { Bungee, Nunito } from "next/font/google";
import "./globals.css";

const brick = Bungee({
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
