import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

import { RepoTab } from "@/components/analyze/repo-tab"
import { ZipTab } from "@/components/analyze/zip-tab"
import { PrTab } from "@/components/analyze/pr-tab"

export default function AnalyzePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Analyze</h1>
          <p className="text-sm text-muted-foreground">
            Start a repository, ZIP, or PR scan and get health, findings, AI insights, and
            actionable fixes.
          </p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Start a new analysis</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="repo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
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