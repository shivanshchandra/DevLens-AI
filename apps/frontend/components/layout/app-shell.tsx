import { ReactNode } from "react"
import Link from "next/link"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="hidden h-screen w-64 border-r bg-background/60 p-4 backdrop-blur md:block">
          <div className="mb-6">
            <div className="text-lg font-semibold tracking-tight">DevLens AI</div>
            <div className="text-xs text-muted-foreground">Developer Assistant</div>
          </div>

          <nav className="space-y-1 text-sm">
            <Link className="block rounded-md px-3 py-2 hover:bg-accent" href="/">
              Home
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-accent" href="/analyze">
              Analyze
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-accent" href="/history">
              History
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-accent" href="/compare">
              Compare
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-accent" href="/team">
              Team Mode
            </Link>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b bg-background/60 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Premium AI Code Intelligence
              </div>
              <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                Local Dev
              </div>
            </div>
          </header>

          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
