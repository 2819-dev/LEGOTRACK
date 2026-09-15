"use client";

export const SET_ILLUSTRATIONS = [
  {
    id: "city-house",
    title: "City House",
    svg: (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        <rect x="30" y="90" width="140" height="80" fill="#D4D4D4" stroke="#111" strokeWidth="4" />
        <polygon points="20,90 100,30 180,90" fill="#E3000B" stroke="#111" strokeWidth="4" />
        <rect x="55" y="115" width="30" height="35" fill="#0055BF" stroke="#111" strokeWidth="3" />
        <rect x="115" y="115" width="30" height="35" fill="#0055BF" stroke="#111" strokeWidth="3" />
        <rect x="88" y="125" width="24" height="45" fill="#8B5A2B" stroke="#111" strokeWidth="3" />
        <circle cx="105" cy="148" r="3" fill="#FFD500" />
      </svg>
    ),
  },
  {
    id: "fire-truck",
    title: "Fire Truck",
    svg: (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        <rect x="25" y="85" width="130" height="50" rx="6" fill="#E3000B" stroke="#111" strokeWidth="4" />
        <rect x="120" y="60" width="45" height="40" fill="#E3000B" stroke="#111" strokeWidth="4" />
        <rect x="128" y="68" width="28" height="20" fill="#7DD3FC" stroke="#111" strokeWidth="3" />
        <circle cx="55" cy="145" r="18" fill="#222" stroke="#111" strokeWidth="3" />
        <circle cx="145" cy="145" r="18" fill="#222" stroke="#111" strokeWidth="3" />
        <rect x="40" y="70" width="18" height="20" fill="#FFD500" stroke="#111" strokeWidth="3" />
      </svg>
    ),
  },
  {
    id: "police",
    title: "Police Station",
    svg: (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        <rect x="35" y="70" width="130" height="95" fill="#0055BF" stroke="#111" strokeWidth="4" />
        <rect x="50" y="40" width="100" height="30" fill="#fff" stroke="#111" strokeWidth="4" />
        <text x="100" y="62" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111">
          POLICE
        </text>
        <rect x="55" y="95" width="28" height="28" fill="#7DD3FC" stroke="#111" strokeWidth="3" />
        <rect x="117" y="95" width="28" height="28" fill="#7DD3FC" stroke="#111" strokeWidth="3" />
        <rect x="85" y="120" width="30" height="45" fill="#111" />
      </svg>
    ),
  },
  {
    id: "spaceship",
    title: "Space Cruiser",
    svg: (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        <polygon points="100,35 160,120 100,150 40,120" fill="#00A650" stroke="#111" strokeWidth="4" />
        <circle cx="100" cy="100" r="22" fill="#7DD3FC" stroke="#111" strokeWidth="3" />
        <rect x="70" y="145" width="20" height="25" fill="#FFD500" stroke="#111" strokeWidth="3" />
        <rect x="110" y="145" width="20" height="25" fill="#FFD500" stroke="#111" strokeWidth="3" />
      </svg>
    ),
  },
  {
    id: "cafe",
    title: "Corner Cafe",
    svg: (
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        <rect x="40" y="80" width="120" height="85" fill="#F5D0A9" stroke="#111" strokeWidth="4" />
        <rect x="40" y="55" width="120" height="30" fill="#8B5A2B" stroke="#111" strokeWidth="4" />
        <rect x="58" y="100" width="35" height="40" fill="#fff" stroke="#111" strokeWidth="3" />
        <rect x="110" y="115" width="30" height="50" fill="#E3000B" stroke="#111" strokeWidth="3" />
        <circle cx="100" cy="45" r="10" fill="#00A650" stroke="#111" strokeWidth="3" />
      </svg>
    ),
  },
] as const;
