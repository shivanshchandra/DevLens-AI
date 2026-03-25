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
  "Why is this repo risky?",
  "Which files should I fix first?",
  "What are the biggest architecture problems?",
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

export function ScanChat({ scanId }: { scanId: string }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<ScanChatResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedQuestion = question.trim()

  const canAsk = useMemo(() => trimmedQuestion.length >= 2 && !loading, [trimmedQuestion, loading])

  async function askChat(nextQuestion?: string) {
    const finalQuestion = (nextQuestion ?? question).trim()
    if (finalQuestion.length < 2) return

    setLoading(true)
    setError(null)

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
        <CardHeader className="space-y-2">
          <CardTitle>AI Chat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask grounded questions about this scan. Answers are based on scan findings, architecture,
            ML, and refactor targets.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something like: Why is this repo risky?"
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
              <p className="text-sm leading-6">{answer.answer}</p>
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
                  <span className="text-sm text-muted-foreground">No matched sections returned.</span>
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
                        <span className="font-medium">{citation.label}</span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {citation.filePath ? <p>File: {citation.filePath}</p> : null}
                        {citation.section ? <p>Section: {citation.section}</p> : null}
                        {citation.reason ? <p>Reason: {citation.reason}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No citations returned for this answer.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}