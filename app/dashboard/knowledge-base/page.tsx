"use client"

import type React from "react"

import { useState } from "react"
import { useApp, type FileData } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, Trash2, CheckCircle2, Loader2, FileCode } from "lucide-react"
import { cn } from "@/lib/utils"

export default function KnowledgeBasePage() {
  const { files, addFile, removeFile, kbStatus, setKbStatus } = useApp()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [buildProgress, setBuildProgress] = useState(0)
  const [buildStep, setBuildStep] = useState<string>("")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = async (fileList: File[]) => {
    if (!fileList.length) return

    const formData = new FormData()
    fileList.forEach((file) => formData.append("files", file))

    setUploadProgress(10)

    try {
      const res = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        setUploadProgress(0)
        return
      }

      const data = await res.json()

      const uploaded: FileData[] = (data.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        type: file.type?.split("/").pop() || "unknown",
        uploadDate: new Date(file.uploadedAt || Date.now()),
      }))

      uploaded.forEach((f) => addFile(f))
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 400)
    } catch (e) {
      setUploadProgress(0)
    }
  }

  const handleBuildKB = async () => {
    if (files.length === 0) return

    setKbStatus("building")
    setBuildProgress(10)
    setBuildStep("Starting knowledge base build...")

    try {
      setBuildStep("Parsing documents...")
      setBuildProgress(30)

      const res = await fetch("/api/knowledge-base/build", { method: "POST" })

      if (!res.ok) {
        setKbStatus("empty")
        setBuildProgress(0)
        setBuildStep("")
        return
      }

      const data = await res.json()

      setBuildStep(data.message || "Finalizing Knowledge Base...")
      setBuildProgress(100)
      setKbStatus("ready")
    } catch (e) {
      setKbStatus("empty")
      setBuildProgress(0)
      setBuildStep("")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Builder</h1>
        <p className="text-muted-foreground">
          Upload your documentation to train the AI agent on your application's context.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Upload & Files */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Drag and drop files here or click to browse. Supported formats: .md, .txt, .json, .pdf, .html
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer relative",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".md,.txt,.json,.pdf,.html"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop files here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                </div>
                {uploadProgress > 0 && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-background/80 backdrop-blur-sm">
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files ({files.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.size} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Preview & Build Status */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Knowledge Base Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6">
              <div className="flex items-center justify-center py-8">
                {kbStatus === "empty" && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <FileCode className="h-8 w-8" />
                    </div>
                    <p className="font-medium">No Knowledge Base</p>
                    <p className="text-sm text-muted-foreground">Upload files to get started</p>
                  </div>
                )}
                {kbStatus === "building" && (
                  <div className="text-center space-y-4 w-full">
                    <div className="relative inline-flex h-16 w-16 items-center justify-center">
                      <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium animate-pulse">{buildStep}</p>
                      <Progress value={buildProgress} className="h-2 w-full" />
                    </div>
                  </div>
                )}
                {kbStatus === "ready" && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <p className="font-medium text-green-500">Ready for Generation</p>
                    <p className="text-sm text-muted-foreground">Last updated: Just now</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <Button
                  className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                  disabled={files.length === 0 || kbStatus === "building"}
                  onClick={handleBuildKB}
                >
                  {kbStatus === "building"
                    ? "Building..."
                    : kbStatus === "ready"
                      ? "Rebuild Knowledge Base"
                      : "Build Knowledge Base"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel (Placeholder) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">File Preview</CardTitle>
                <Tabs defaultValue="preview" className="w-[120px]">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="preview" className="text-xs">
                      View
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs">
                      Code
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] rounded-md border bg-muted/50 p-4 flex items-center justify-center text-muted-foreground text-sm">
                Select a file to preview content
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
