"use client"

import { ReactNode, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  ChevronRight,
  FileSearch,
  GitCompare,
  Home,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/analyze", label: "Analyze", icon: FileSearch },
  { href: "/history", label: "History", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/team", label: "Team Mode", icon: Users },
]

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
        active
          ? "border border-white/10 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
          : "text-zinc-400 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={[
            "h-4 w-4 transition-colors",
            active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300",
          ].join(" ")}
        />
        <span>{label}</span>
      </div>
      <ChevronRight
        className={[
          "h-4 w-4 transition-all",
          active
            ? "translate-x-0 text-zinc-400"
            : "text-zinc-700 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100",
        ].join(" ")}
      />
    </Link>
  )
}

function pageMeta(pathname: string) {
  if (pathname.startsWith("/analyze")) {
    return {
      eyebrow: "Analysis workflow",
      title: "Start, upload, and run scans",
    }
  }

  if (pathname.startsWith("/scanning")) {
    return {
      eyebrow: "Live scan progress",
      title: "Track staged scan execution",
    }
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      eyebrow: "Scan dashboard",
      title: "Review code health and AI insights",
    }
  }

  if (pathname.startsWith("/history")) {
    return {
      eyebrow: "Scan history",
      title: "Reopen previous scans and reports",
    }
  }

  if (pathname.startsWith("/compare")) {
    return {
      eyebrow: "Scan comparison",
      title: "Measure changes between scans",
    }
  }

  if (pathname.startsWith("/team")) {
    return {
      eyebrow: "Team mode",
      title: "Track engineering risk across scans",
    }
  }

  return {
    eyebrow: "Premium AI Code Intelligence",
    title: "Analyze, compare, and track engineering risk",
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const meta = useMemo(() => pageMeta(pathname), [pathname])

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,transparent_80%,rgba(255,255,255,0.02))]" />

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex md:flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-white/5">
                <span className="text-sm font-semibold tracking-wide">N</span>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-white">
                  DevLens AI
                </div>
                <div className="text-xs text-zinc-400">Developer Intelligence</div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-4">
            <div className="mb-3 px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Navigation
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                  />
                )
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" />
                Local workspace
              </div>
              <p className="text-xs leading-5 text-zinc-400">
                Analyze repos, compare scans, and review team-wide engineering risk.
              </p>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden">
            <div className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-[#080808] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-white">
                    DevLens AI
                  </div>
                  <div className="text-xs text-zinc-400">Developer Intelligence</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === item.href
                      : pathname.startsWith(item.href)

                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active}
                      onClick={() => setMobileOpen(false)}
                    />
                  )
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="relative flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white md:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                    {meta.eyebrow}
                  </div>
                  <div className="text-sm text-zinc-300">{meta.title}</div>
                </div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                Local Dev
              </div>
            </div>
          </header>

          <div className="px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}