"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Code2, Copy, Download, Terminal, Check, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function ScriptGeneratorPage() {
  const { selectedTestCase, generatedScript, setGeneratedScript } = useApp()
  const [isGenerating, setIsGenerating] = useState(false)
  const [displayedScript, setDisplayedScript] = useState("")
  const [language, setLanguage] = useState<
    "python" | "javascript" | "typescript" | "java" | "csharp" | "ruby"
  >("python")
  const [kbStatus, setKbStatus] = useState<"empty" | "building" | "ready">("empty")
  const [kbUpdatedAt, setKbUpdatedAt] = useState<Date | null>(null)
  const [latestUploadAt, setLatestUploadAt] = useState<Date | null>(null)
  const { toast } = useToast()

  const languageMeta = useMemo(() => {
    const byLang: Record<
      string,
      { label: string; ext: string; mime: string; run: { install: string[]; run: string[] } }
    > = {
      python: {
        label: "Python",
        ext: "py",
        mime: "text/x-python",
        run: {
          install: ["pip install selenium"],
          run: ["python test_case.py"],
        },
      },
      javascript: {
        label: "JavaScript",
        ext: "js",
        mime: "application/javascript",
        run: {
          install: ["npm i selenium-webdriver"],
          run: ["node test_case.js"],
        },
      },
      typescript: {
        label: "TypeScript",
        ext: "ts",
        mime: "text/plain",
        run: {
          install: ["npm i selenium-webdriver ts-node", "npm i -D typescript"],
          run: ["npx ts-node test_case.ts"],
        },
      },
      java: {
        label: "Java",
        ext: "java",
        mime: "text/x-java-source",
        run: {
          install: ["Add Selenium Java dependency (Maven/Gradle)"],
          run: ["javac Test_case.java", "java Test_case"],
        },
      },
      csharp: {
        label: "C#",
        ext: "cs",
        mime: "text/plain",
        run: {
          install: ["dotnet add package Selenium.WebDriver"],
          run: ["dotnet run"],
        },
      },
      ruby: {
        label: "Ruby",
        ext: "rb",
        mime: "text/x-ruby",
        run: {
          install: ["gem install selenium-webdriver"],
          run: ["ruby test_case.rb"],
        },
      },
    }

    return byLang[language]
  }, [language])

  useEffect(() => {
    let cancelled = false

    const loadKb = async () => {
      try {
        const res = await fetch("/api/knowledge-base/state")
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const status = String(data.kbStatus || "empty")
        if (status === "ready" || status === "building" || status === "empty") {
          setKbStatus(status)
        }

        const updated = data.kbUpdatedAt ? new Date(data.kbUpdatedAt) : null
        if (updated && !Number.isNaN(updated.getTime())) setKbUpdatedAt(updated)

        const uploads: Date[] = (data.files || [])
          .map((f: any) => new Date(f.uploadedAt))
          .filter((d: Date) => !Number.isNaN(d.getTime()))

        if (uploads.length > 0) {
          uploads.sort((a, b) => b.getTime() - a.getTime())
          setLatestUploadAt(uploads[0])
        } else {
          setLatestUploadAt(null)
        }
      } catch {
        // ignore
      }
    }

    loadKb()

    return () => {
      cancelled = true
    }
  }, [])

  const kbIsStale = useMemo(() => {
    if (kbStatus !== "ready") return false
    if (!kbUpdatedAt) return false
    if (!latestUploadAt) return false
    return latestUploadAt.getTime() > kbUpdatedAt.getTime() + 1000
  }, [kbStatus, kbUpdatedAt, latestUploadAt])

  const generationBlockedReason =
    kbStatus === "building"
      ? "Knowledge base is building. Please wait."
      : kbStatus === "empty"
        ? "Knowledge base is missing. Upload files and build it first."
        : kbIsStale
          ? "Knowledge base is stale. Rebuild to include the latest uploads."
          : null

  const handleGenerate = async () => {
    if (!selectedTestCase) return
    if (generationBlockedReason) return

    setIsGenerating(true)
    setDisplayedScript("")
    setGeneratedScript(null)

    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testCase: selectedTestCase, language }),
      })

      if (!res.ok) {
        let message = `Generation failed (${res.status})`
        try {
          const err = await res.json()
          if (typeof err?.message === "string") message = err.message
          if (typeof err?.error === "string") message = err.error
        } catch {
          // ignore
        }

        toast({
          title: "Script generation failed",
          description: message,
          variant: "destructive",
        })
        setIsGenerating(false)
        return
      }

      const data = await res.json()
      const script: string = data.script || ""

      setDisplayedScript(script)
      setGeneratedScript(script)
    } catch (e) {
      toast({
        title: "Script generation failed",
        description: "Network error while generating the script.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedScript)
    toast({
      title: "Copied to clipboard",
      description: "The generated script has been copied to your clipboard.",
    })
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([displayedScript], { type: languageMeta.mime })
    element.href = URL.createObjectURL(file)
    element.download = `test_${selectedTestCase?.id.toLowerCase()}.${languageMeta.ext}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Download started",
      description: `${languageMeta.label} script is downloading.`,
    })
  }

  if (!selectedTestCase) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6 p-6">
        <div className="p-6 rounded-full bg-muted/50">
          <Code2 className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">No Test Case Selected</h2>
          <p className="text-muted-foreground max-w-md">
            Please go to the Test Generator page and select a test case to generate a script for.
          </p>
        </div>
        <Link href="/dashboard/test-generator">
          <Button size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Test Generator
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Selenium Script Generator</h1>
        <p className="text-muted-foreground">Turn your test case into executable code instantly.</p>
      </div>

      {kbStatus === "empty" && (
        <Alert variant="destructive">
          <AlertTitle>Knowledge Base Missing</AlertTitle>
          <AlertDescription>Upload files and build the knowledge base before generating scripts.</AlertDescription>
        </Alert>
      )}

      {kbStatus === "building" && (
        <Alert>
          <AlertTitle>Knowledge Base Building</AlertTitle>
          <AlertDescription>Wait for the build to finish, then generate scripts.</AlertDescription>
        </Alert>
      )}

      {kbIsStale && (
        <Alert variant="destructive">
          <AlertTitle>Knowledge Base Needs Rebuild</AlertTitle>
          <AlertDescription>
            New files were uploaded after the last build. Rebuild the knowledge base to include the latest changes.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Test Case Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Selected Test Case</CardTitle>
                <Badge variant="outline">{selectedTestCase.id}</Badge>
              </div>
              <CardDescription>Feature: {selectedTestCase.feature}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Script Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="csharp">C#</SelectItem>
                    <SelectItem value="ruby">Ruby</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h4 className="font-medium mb-2">Scenario</h4>
                <p className="text-sm text-muted-foreground">{selectedTestCase.scenario}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Steps</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {selectedTestCase.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Expected Result</h4>
                <div className="flex gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4 mt-0.5" />
                  {selectedTestCase.expectedResult}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                onClick={handleGenerate}
                disabled={isGenerating || Boolean(generationBlockedReason)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Code...
                  </>
                ) : (
                  <>
                    <Code2 className="mr-2 h-5 w-5" />
                    {generatedScript ? "Regenerate Script" : "Generate Script"}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full min-h-[600px] flex flex-col overflow-hidden border-primary/20 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <span className="ml-2 text-xs font-mono text-muted-foreground">
                  test_{selectedTestCase.id.toLowerCase()}.{languageMeta.ext}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!displayedScript}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!displayedScript}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-[#0F1117] p-0 overflow-hidden relative group">
              {!displayedScript && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50">
                  <Terminal className="h-16 w-16 mb-4 opacity-20" />
                  <p>Click "Generate Script" to build the automation code</p>
                </div>
              )}
              <ScrollArea className="h-full w-full">
                <pre className="p-6 font-mono text-sm leading-relaxed">
                  <code className="text-gray-300">
                    {displayedScript || ""}
                    {isGenerating && (
                      <span className="animate-pulse inline-block w-2 h-4 bg-primary ml-1 align-middle" />
                    )}
                  </code>
                </pre>
              </ScrollArea>
            </div>
          </Card>

          {generatedScript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>1. Install dependencies:</p>
                  <div className="bg-muted p-2 rounded font-mono text-xs whitespace-pre-wrap">
                    {languageMeta.run.install.join("\n")}
                  </div>
                  <p>
                    2. Download the script or copy the code to a file named{" "}
                    <span className="font-mono text-foreground">test_case.{languageMeta.ext}</span>
                  </p>
                  <p>3. Run the script from your terminal:</p>
                  <div className="bg-muted p-2 rounded font-mono text-xs whitespace-pre-wrap">
                    {languageMeta.run.run.join("\n")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: You may need the correct browser driver (e.g., ChromeDriver) on your PATH.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
