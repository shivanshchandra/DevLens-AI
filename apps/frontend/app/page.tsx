import Link from "next/link"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  GitCompare,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react"

const features = [
  {
    title: "Code Health Score",
    description:
      "A single, explainable grade combining maintainability, security, and quality signals.",
    icon: ShieldCheck,
  },
  {
    title: "PR Risk Review",
    description:
      "Analyze pull requests and detect risky changes in touched files before merge.",
    icon: GitCompare,
  },
  {
    title: "Suggested Fixes",
    description:
      "Get practical fix suggestions and refactor guidance for the highest-priority issues.",
    icon: Wand2,
  },
]

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-premium-grid bg-white/[0.02] px-6 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-10 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_25%)] pointer-events-none" />
          <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Sparkles className="h-3.5 w-3.5" />
              Premium AI Code Intelligence
            </div>

            <h1 className="text-gradient-premium text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Understand your codebase faster.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Paste a GitHub repository or upload a ZIP to get code health,
              architecture insights, risk signals, fix suggestions, and grounded AI guidance
              in one flow.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="xl" asChild className="shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                <Link href="/analyze">
                  Analyze GitHub Repo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button variant="outline" size="xl" asChild className="border-white/10 hover:bg-white/5">
                <Link href="/dashboard/8ccd5f79-a0cf-4fcc-91a2-4b91b7cf5a85">
                  <Sparkles className="h-4 w-4 text-emerald-400 mr-2" />
                  Live Demo: NeetCode Repo
                </Link>
              </Button>

              <Button variant="ghost" size="xl" asChild className="text-zinc-400 hover:text-white">
                <Link href="/history">Scan History</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Quick Showcase:</span>
              <Link
                href="/dashboard/8ccd5f79-a0cf-4fcc-91a2-4b91b7cf5a85"
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Inspect Sample Audit (NeetCode)
              </Link>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-500">
                Repo + PR + ZIP scanning
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-500">
                AST & Secret Scanning
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-500">
                AI Fix Patches
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <Card
                key={feature.title}
                className="group rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.045] hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors group-hover:bg-white/[0.08]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                </CardHeader>

                <CardContent className="text-sm leading-6 text-zinc-400">
                  {feature.description}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
            <div className="mb-2 text-sm font-medium text-white">How it works</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "Analyze repository",
                "Track scan progress",
                "Review insights",
                "Compare and improve",
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300">
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-zinc-200">{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-2 text-sm font-medium text-white">Best next action</div>
            <p className="mb-5 text-sm leading-6 text-zinc-400">
              Start with a GitHub repository scan, then use Compare and Team Mode to turn
              results into engineering visibility.
            </p>
            <Button className="w-full" asChild>
              <Link href="/analyze">Start your first scan</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}