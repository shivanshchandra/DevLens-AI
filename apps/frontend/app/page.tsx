import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">DevLens AI</h1>
          <p className="text-muted-foreground">
            Paste a GitHub repo or upload a ZIP → get a health score, risks, fixes, and AI guidance.
          </p>

          <div className="flex gap-3">
            <Button asChild>
              <a href="/analyze">Analyze Repository</a> 
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">View History</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Health Score</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Single grade combining quality, security, and maintainability.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PR Reviewer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Analyze pull requests and flag risky changes in changed files only.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fix Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Actionable patches and refactor steps for top issues.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
