import type { ReactNode } from "react"

export type StudioIconName = "arrow" | "box" | "chart" | "check" | "chevron" | "compare" | "cube" | "dashboard" | "download" | "export" | "file" | "leaf" | "menu" | "moon" | "move" | "plus" | "rotate" | "settings" | "spark" | "sun" | "upload" | "warning" | "x" | "zoom"

export function StudioIcon({
  name,
  size = 18,
}: {
  name: StudioIconName
  size?: number
}) {
  const paths: Record<StudioIconName, ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    box: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
      </>
    ),
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    compare: (
      <>
        <path d="M8 4H4v16h4M16 4h4v16h-4M8 12h8M12 8l4 4-4 4" />
      </>
    ),
    cube: (
      <>
        <path d="m12 2 8.5 5v10L12 22l-8.5-5V7L12 2Z" />
        <path d="m3.8 7.2 8.2 4.9 8.2-4.9M12 12v9.4" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
      </>
    ),
    export: (
      <>
        <path d="M14 3h7v7m0-7-9 9" />
        <path d="M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l5 5v15H6V2Z" />
        <path d="M14 2v6h5M9 13h7M9 17h7" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 9 5 16c4 1 9-1 11-5" />
        <path d="M4 20c2-5 6-8 12-9" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.7a8.5 8.5 0 1 0 12 11.8Z" />,
    move: (
      <>
        <path d="M12 2v20M2 12h20m-4-4 4 4-4 4M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    rotate: (
      <>
        <path d="M20 7V3m0 0h-4m4 0-3.2 3.2A8 8 0 1 0 20 13" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z" />
        <path d="m18.5 15 .6 2.1 1.9.9-1.9.9-.6 2.1-.6-2.1L16 18l1.9-.9.6-2.1Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 15v5h16v-5" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    zoom: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5M10.5 7v7M7 10.5h7" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
