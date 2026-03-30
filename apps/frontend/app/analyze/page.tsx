import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PrTab } from "@/components/analyze/pr-tab"
import { RepoTab } from "@/components/analyze/repo-tab"
import { ZipTab } from "@/components/analyze/zip-tab"
import {
  FolderGit2,
  GitPullRequest,
  Sparkles,
  Upload,
} from "lucide-react"

const scanOptions = [
  {
    title: "GitHub Repository",
    description: "Run a full repository scan for code health, risks, architecture, and AI insights.",
    icon: FolderGit2,
  },
  {
    title: "ZIP Upload",
    description: "Upload a project archive and analyze it without connecting to GitHub.",
    icon: Upload,
  },
  {
    title: "Pull Request Review",
    description: "Focus on changed files to review riskier PRs faster before merge.",
    icon: GitPullRequest,
  },
]

export default function AnalyzePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-premium-grid bg-white/[0.02] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-8 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_25%)] pointer-events-none" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3.5 w-3.5" />
                Start a new analysis
              </div>

              <h1 className="text-gradient-premium text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Analyze code with one clean workflow.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Choose a repository, ZIP archive, or pull request to generate code health,
                findings, architecture signals, ML predictions, and grounded AI insights.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              {scanOptions.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-medium text-white">{item.title}</div>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">
                      {item.description}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <Card className="rounded-[28px]">
          <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="repo" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-3">
                <TabsTrigger value="repo">GitHub Repo</TabsTrigger>
                <TabsTrigger value="zip">ZIP Upload</TabsTrigger>
                <TabsTrigger value="pr">PR Review</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="repo">
                  <RepoTab />
                </TabsContent>

                <TabsContent value="zip">
                  <ZipTab />
                </TabsContent>

                <TabsContent value="pr">
                  <PrTab />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}