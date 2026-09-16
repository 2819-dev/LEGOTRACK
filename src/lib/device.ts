/** Client-side device helpers for the basement kiosk lock. */

export function isIPad9FamilyKiosk(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPad =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIPad) return false;

  // iPad 7/8/9 (10.2" home-button): CSS 810×1080 @2x
  const shortSide = Math.min(screen.width, screen.height);
  const longSide = Math.max(screen.width, screen.height);
  const sizeOk = shortSide >= 780 && shortSide <= 830 && longSide >= 1020 && longSide <= 1120;
  const dpr = window.devicePixelRatio || 1;
  const dprOk = dpr >= 1.8 && dpr <= 2.2;
  return sizeOk && dprOk;
}

export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const ua = navigator.userAgent || "";
  return shortSide < 700 || /iPhone|Android.+Mobile/i.test(ua);
}

export function isAdminAllowedPath(pathname: string): boolean {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/** Always reachable even when the Access Denied gate is on. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}
