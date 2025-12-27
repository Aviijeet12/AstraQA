"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Save, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { setKbStatus, setFiles, setTestCases, setGeneratedScript } = useApp()
  const { toast } = useToast()

  const [llmProvider, setLlmProvider] = useState("gemini")
  const [vectorDb, setVectorDb] = useState("faiss")
  const [defaultBrowser, setDefaultBrowser] = useState("chrome")
  const [implicitWaitSeconds, setImplicitWaitSeconds] = useState(10)
  const [headless, setHeadless] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [useLocalEmbeddings, setUseLocalEmbeddings] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Local-only settings.
      try {
        const storedKey = localStorage.getItem("astraqa.apiKey")
        if (storedKey) setApiKey(storedKey)
        setUseLocalEmbeddings(localStorage.getItem("astraqa.useLocalEmbeddings") === "true")
      } catch {
        // ignore
      }

      try {
        const res = await fetch("/api/config/me")
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const s = data.settings
        if (!s) return

        if (typeof s.llmProvider === "string") setLlmProvider(s.llmProvider)
        if (typeof s.vectorDb === "string") setVectorDb(s.vectorDb)
        if (typeof s.browser === "string") setDefaultBrowser(s.browser)
        if (typeof s.implicitWaitSeconds === "number") setImplicitWaitSeconds(s.implicitWaitSeconds)
        if (typeof s.headless === "boolean") setHeadless(s.headless)
      } catch {
        // ignore
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleResetKB = () => {
    const run = async () => {
      try {
        const res = await fetch("/api/knowledge-base/reset", { method: "POST" })
        if (!res.ok) {
          let message = `Reset failed (${res.status})`
          try {
            const err = await res.json()
            if (typeof err?.message === "string") message = err.message
            if (typeof err?.error === "string") message = err.error
          } catch {
            // ignore
          }

          toast({
            title: "Reset failed",
            description: message,
            variant: "destructive",
          })
          return
        }

        setKbStatus("empty")
        setFiles([])
        setTestCases([])
        setGeneratedScript(null)

        toast({
          title: "Knowledge Base Reset",
          description: "All uploaded files, chunks, builds, and generated data have been deleted.",
          variant: "destructive",
        })
      } catch {
        toast({
          title: "Reset failed",
          description: "Network error while resetting your knowledge base.",
          variant: "destructive",
        })
      }
    }

    run()
  }

  const handleSave = async () => {
    let serverSaveOk = false
    let serverSaveError: string | null = null

    try {
      const res = await fetch("/api/config/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          llmProvider,
          vectorDb,
          defaultBrowser,
          implicitWaitSeconds,
          headless,
        }),
      })

      if (!res.ok) {
        serverSaveError = `Server save failed (${res.status})`
        try {
          const err = await res.json()
          if (typeof err?.message === "string") serverSaveError = err.message
          if (typeof err?.error === "string") serverSaveError = err.error
        } catch {
          // ignore
        }
      } else {
        serverSaveOk = true
      }
    } catch (e) {
      serverSaveError = "Network error while saving server settings."
    }

    try {
      localStorage.setItem("astraqa.apiKey", apiKey)
      localStorage.setItem("astraqa.useLocalEmbeddings", String(useLocalEmbeddings))
    } catch {
      // ignore
    }

    if (!serverSaveOk) {
      toast({
        title: "Save failed",
        description: serverSaveError ?? "Could not save settings to the server.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your AI configuration, API keys, and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>Configure the LLM and Vector Database settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">LLM Provider</Label>
                <Select value={llmProvider} onValueChange={setLlmProvider}>
                  <SelectTrigger id="llm-provider">
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude 3)</SelectItem>
                    <SelectItem value="local">Local LLM (Ollama)</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Test generation defaults to Hugging Face using server env var <span className="font-mono">HF_API_KEY</span>. To use Gemini instead, set <span className="font-mono">GEMINI_API_KEY</span> or provide an API key.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vector-db">Vector Database</Label>
                <Select value={vectorDb} onValueChange={setVectorDb}>
                  <SelectTrigger id="vector-db">
                    <SelectValue placeholder="Select Database" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faiss">FAISS (Local)</SelectItem>
                    <SelectItem value="chroma">ChromaDB</SelectItem>
                    <SelectItem value="qdrant">Qdrant</SelectItem>
                    <SelectItem value="pinecone">Pinecone</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Retrieval supports Postgres FTS by default and Qdrant when configured.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stored locally for convenience. Test generation uses server env <span className="font-mono">HF_API_KEY</span> by default, and will switch to Gemini when <span className="font-mono">GEMINI_API_KEY</span> is set or you provide an API key.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Use Local Embeddings</Label>
                <p className="text-sm text-muted-foreground">
                  Process documents locally without sending data to external APIs.
                </p>
              </div>
              <Switch checked={useLocalEmbeddings} onCheckedChange={setUseLocalEmbeddings} />
            </div>
          </CardContent>
        </Card>

        {/* Selenium Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Selenium Configuration</CardTitle>
            <CardDescription>Set defaults for generated scripts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="browser">Default Browser</Label>
                <Select value={defaultBrowser} onValueChange={setDefaultBrowser}>
                  <SelectTrigger id="browser">
                    <SelectValue placeholder="Select Browser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome">Google Chrome</SelectItem>
                    <SelectItem value="firefox">Mozilla Firefox</SelectItem>
                    <SelectItem value="edge">Microsoft Edge</SelectItem>
                    <SelectItem value="safari">Safari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Implicit Wait Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={implicitWaitSeconds}
                  onChange={(e) => setImplicitWaitSeconds(Number(e.target.value || "0"))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Headless Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Generate scripts configured to run without a visible UI.
                </p>
              </div>
              <Switch checked={headless} onCheckedChange={setHeadless} />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Reset Knowledge Base</h4>
                <p className="text-sm text-muted-foreground">
                  Delete all uploaded files, embeddings, and generated test cases.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset Everything
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your knowledge base and remove all
                      uploaded data from the server.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetKB}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
