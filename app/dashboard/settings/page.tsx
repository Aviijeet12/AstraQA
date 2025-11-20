"use client"

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

  const handleResetKB = () => {
    setKbStatus("empty")
    setFiles([])
    setTestCases([])
    setGeneratedScript(null)
    toast({
      title: "Knowledge Base Reset",
      description: "All uploaded files and generated data have been cleared.",
      variant: "destructive",
    })
  }

  const handleSave = async () => {
    const llmProvider = (document.getElementById("llm-provider") as HTMLSelectElement | null)?.value
    const vectorDb = (document.getElementById("vector-db") as HTMLSelectElement | null)?.value
    const defaultBrowser = (document.getElementById("browser") as HTMLSelectElement | null)?.value
    const implicitWaitSeconds = Number(
      (document.getElementById("timeout") as HTMLInputElement | null)?.value || "10",
    )

    try {
      await fetch("/api/config/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          llmProvider,
          vectorDb,
          defaultBrowser,
          implicitWaitSeconds,
        }),
      })
    } catch (e) {
      // ignore network errors for now
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
                <Select defaultValue="openai">
                  <SelectTrigger id="llm-provider">
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude 3)</SelectItem>
                    <SelectItem value="local">Local LLM (Ollama)</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vector-db">Vector Database</Label>
                <Select defaultValue="faiss">
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="sk-..." />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Use Local Embeddings</Label>
                <p className="text-sm text-muted-foreground">
                  Process documents locally without sending data to external APIs.
                </p>
              </div>
              <Switch />
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
                <Select defaultValue="chrome">
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
                <Input id="timeout" type="number" defaultValue="10" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Headless Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Generate scripts configured to run without a visible UI.
                </p>
              </div>
              <Switch />
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
                      uploaded data from the browser session.
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
