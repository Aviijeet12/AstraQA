"use client"

import { useState } from "react"
import { useApp, type TestCase } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TestGeneratorPage() {
  const { kbStatus, testCases, setTestCases, setSelectedTestCase } = useApp()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    try {
      const res = await fetch("/api/tests/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        setIsGenerating(false)
        return
      }

      const data = await res.json()
      const newTestCases: TestCase[] = data.testCases || []

      setTestCases(newTestCases)
    } catch (e) {
      // swallow for now; you can add toast notifications later
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectTestCase = (testCase: TestCase) => {
    setSelectedTestCase(testCase)
    router.push("/dashboard/script-generator")
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Test Case Generator</h1>
        <p className="text-muted-foreground">
          Describe the feature or scenario you want to test, and our AI will generate comprehensive test cases.
        </p>
      </div>

      {kbStatus === "empty" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Knowledge Base Missing</AlertTitle>
          <AlertDescription>
            You haven't built a knowledge base yet. The AI might lack context about your application.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-fit sticky top-24">
            <CardHeader>
              <CardTitle>Scenario Description</CardTitle>
              <CardDescription>Be specific about what you want to test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Generate test cases for the user registration flow, including edge cases for password validation."
                className="min-h-[200px] resize-none text-base p-4"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button
                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Test Cases
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          {testCases.length === 0 ? (
            <div className="h-[400px] rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Sparkles className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-lg font-medium">No test cases generated yet</p>
              <p className="text-sm">Enter a prompt and click generate to see results</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Generated Results ({testCases.length})</h2>
                <Button variant="outline" size="sm" onClick={() => setTestCases([])}>
                  Clear Results
                </Button>
              </div>

              {testCases.map((testCase) => (
                <Card
                  key={testCase.id}
                  className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{testCase.id}</Badge>
                          <Badge
                            variant={testCase.type === "positive" ? "default" : "destructive"}
                            className={
                              testCase.type === "positive"
                                ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20"
                                : ""
                            }
                          >
                            {testCase.type === "positive" ? "Positive Flow" : "Negative Flow"}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{testCase.scenario}</CardTitle>
                        <CardDescription>Feature: {testCase.feature}</CardDescription>
                      </div>
                      <Button onClick={() => handleSelectTestCase(testCase)}>
                        Select & Generate Script
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="steps" className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline bg-muted/30 px-4 rounded-md">
                          <span className="text-sm font-medium">View Test Steps & Expected Result</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Steps
                              </h4>
                              <ol className="list-decimal list-inside space-y-1 text-sm">
                                {testCase.steps.map((step, index) => (
                                  <li key={index} className="pl-2 py-1 border-b border-border/50 last:border-0">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Expected Result
                              </h4>
                              <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 flex gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                {testCase.expectedResult}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
