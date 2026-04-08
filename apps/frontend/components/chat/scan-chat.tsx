"use client"

import { useMemo, useState } from "react"

import { chatWithScan, type ScanChatResponse } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"

const SUGGESTED_QUESTIONS = [
  "What should I fix first?",
  "Why is this repo risky?",
  "Which files are riskiest?",
  "What are the biggest architecture problems?",
  "What can I improve in under 1 hour?",
  "Is this repo ready for production?",
  "Summarize this scan simply",
  "Where should I start refactoring?",
]

function confidenceVariant(confidence: string) {
  switch ((confidence || "").toLowerCase()) {
    case "high":
      return "default" as const
    case "medium":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

function splitAnswer(answer: string) {
  return answer
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function ScanChat({ scanId }: { scanId: string }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<ScanChatResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeepDive, setShowDeepDive] = useState(false)

  const trimmedQuestion = question.trim()

  const canAsk = useMemo(() => trimmedQuestion.length >= 2 && !loading, [trimmedQuestion, loading])
  const answerBlocks = useMemo(() => splitAnswer(answer?.answer ?? ""), [answer])
  const visibleBlocks = showDeepDive ? answerBlocks : answerBlocks.slice(0, 2)
  const hasDeepDive = answerBlocks.length > 2

  async function askChat(nextQuestion?: string) {
    const finalQuestion = (nextQuestion ?? question).trim()
    if (finalQuestion.length < 2) return

    setLoading(true)
    setError(null)
    setShowDeepDive(false)

    try {
      const res = await chatWithScan(scanId, { question: finalQuestion })
      setAnswer(res)
      setQuestion(finalQuestion)
    } catch (e: any) {
      const message = e?.message ?? "Failed to get chat response."
      setError(message)
      toast({
        title: "Chat request failed",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await askChat()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>AI Chat</CardTitle>
            <Badge variant="outline">Repo-focused assistant</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Ask about this repository, project, scan results, architecture, security, technical debt,
            refactor priorities, or production readiness.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something like: What should I fix first?"
              className="md:flex-1"
            />
            <Button type="submit" disabled={!canAsk}>
              {loading ? "Asking..." : "Ask"}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setQuestion(item)
                  void askChat(item)
                }}
              >
                {item}
              </Button>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            This assistant is designed for questions about the scanned repo or project. For unrelated
            questions, it will guide the user back to repository-focused prompts.
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {answer ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Chat Answer</CardTitle>
            <Badge variant={confidenceVariant(answer.confidence)}>
              Confidence: {answer.confidence}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="space-y-3">
                {visibleBlocks.map((block, index) => (
                  <p key={index} className="whitespace-pre-wrap text-sm leading-6">
                    {block}
                  </p>
                ))}
              </div>

              {hasDeepDive ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeepDive((prev) => !prev)}
                  >
                    {showDeepDive ? "Hide deep dive" : "Show deep dive"}
                  </Button>
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Matched sections</h3>
              <div className="flex flex-wrap gap-2">
                {answer.matchedSections.length > 0 ? (
                  answer.matchedSections.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No matched sections returned.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Grounding citations</h3>
              {answer.citations.length > 0 ? (
                <div className="grid gap-3">
                  {answer.citations.map((citation, index) => (
                    <div key={`${citation.label}-${index}`} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{citation.type}</Badge>
                        <span className="font-medium break-all">{citation.label}</span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {citation.filePath ? <p className="break-all">File: {citation.filePath}</p> : null}
                        {citation.section ? <p>Section: {citation.section}</p> : null}
                        {citation.reason ? <p>Reason: {citation.reason}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No citations returned for this answer.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}