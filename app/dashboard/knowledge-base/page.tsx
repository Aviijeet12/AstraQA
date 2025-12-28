"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useApp, type FileData } from "@/components/app-provider"

type LastBuild = {
  id: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  processed: number;
  failed: number;
  error: string | null;
};
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, Trash2, CheckCircle2, Loader2, FileCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function KnowledgeBasePage() {

  const { toast } = useToast();
  const [lastBuildSuccessRate, setLastBuildSuccessRate] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');

    // If formatTimeAgo is not imported, import it from a utility or define a fallback
    // import { formatTimeAgo } from "@/lib/utils" // Uncomment if available
    function formatTimeAgo(date: Date) {
      // Simple fallback for demo; replace with your real util if available
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return date.toLocaleString();
    }
  const { files, addFile, setFiles, removeFile, kbStatus, setKbStatus } = useApp();
  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user?.id;

  // Add missing state for file preview and selection
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const selectedFile = files.find((f: FileData) => f.id === selectedFileId) || null;
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStep, setBuildStep] = useState<string>("");
  const [kbUpdatedAt, setKbUpdatedAt] = useState<Date | null>(null);
  const [lastBuild, setLastBuild] = useState<LastBuild | null>(null);
  // ...existing code...
  // ...existing code (all handlers, effects, and logic go here, inside the component)...
  // (No top-level returns or logic outside this function)

  // ...existing code...

  // ...existing logic and handlers should be here, before the return...
  // ...existing logic and handlers should be here, before the return...

  // Fix: Move the useEffect for file preview here
  // (Assuming you have state: selectedFile, setFilePreview, setPreviewMessage)
  // If not, please add them as needed

  React.useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      setFilePreview?.(null);
      setPreviewMessage?.(null);
      if (!selectedFile) return;
      try {
        const res = await fetch(`/api/knowledge-base/files/${encodeURIComponent(selectedFile.id)}`);
        if (!res.ok) {
          setPreviewMessage?.(`Preview unavailable (${res.status})`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.preview === "string") {
          setFilePreview?.(data.preview);
          setPreviewMessage?.(null);
          return;
        }
        if (typeof data?.message === "string") {
          setPreviewMessage?.(data.message);
          return;
        }
        setPreviewMessage?.("Preview is not available for this file.");
      } catch (e) {
        if (cancelled) return;
        setPreviewMessage?.("Preview failed to load.");
      }
    };
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedFile?.id]);

  // All handlers and logic must be inside the component
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ...all logic and handlers above...
  };

  const handleFiles = async (fileList: File[]) => {
    if (!fileList.length) return;
    const formData = new FormData();
    fileList.forEach((file) => formData.append("files", file));
    setUploadProgress(10);
    try {
      const res = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        try {
          const err = await res.json();
          if (typeof err?.error === "string") message = err.error;
          if (Array.isArray(err?.rejected) && err.rejected.length) {
            message += `: ${err.rejected.join(", ")}`;
          }
        } catch (e) {
          // ignore
        }
        toast({
          title: "Upload failed",
          description: message,
          variant: "destructive",
        });
        setUploadProgress(0);
        return;
      }
      const data = await res.json();
      const uploaded: FileData[] = (data.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        type: file.type?.split("/").pop() || "unknown",
        uploadDate: new Date(file.uploadedAt || Date.now()),
      }));
      uploaded.forEach((f) => addFile(f));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 400);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: "Network error while uploading. Please try again.",
        variant: "destructive",
      });
      setUploadProgress(0);
    }
  };

  const handleBuildKB = async () => {
    if (files.length === 0) return;
    setKbStatus("building");
    setBuildProgress(10);
    setBuildStep("Starting knowledge base build...");
    try {
      setBuildStep("Parsing documents...");
      setBuildProgress(30);
      const res = await fetch("/api/knowledge-base/build", { method: "POST" });
      if (!res.ok) {
        let message = `Build failed (${res.status})`;
        try {
          const err = await res.json();
          if (typeof err?.error === "string") message = err.error;
          if (typeof err?.message === "string") message = err.message;
        } catch (e) {
          // ignore
        }
        toast({
          title: "Build failed",
          description: message,
          variant: "destructive",
        });
        setKbStatus("empty");
        setBuildProgress(0);
        setBuildStep("");
        // Refresh state so the user can see latest run stats/errors.
        try {
          await fetch("/api/knowledge-base/state").then(async (r) => {
            if (!r.ok) return;
            const d = await r.json();
            if (d?.kbUpdatedAt) {
              const dt = new Date(d.kbUpdatedAt);
              if (!Number.isNaN(dt.getTime())) setKbUpdatedAt(dt);
            }
            if (d?.lastBuild && typeof d.lastBuild === "object") {
              const started = new Date(d.lastBuild.startedAt);
              const completed = d.lastBuild.completedAt ? new Date(d.lastBuild.completedAt) : null;
              setLastBuild({
                id: String(d.lastBuild.id),
                status: String(d.lastBuild.status || "unknown"),
                startedAt: Number.isNaN(started.getTime()) ? new Date() : started,
                completedAt: completed && !Number.isNaN(completed.getTime()) ? completed : null,
                processed: Number(d.lastBuild.processed ?? 0),
                failed: Number(d.lastBuild.failed ?? 0),
                error: typeof d.lastBuild.error === "string" ? d.lastBuild.error : null,
              });
              setLastBuildSuccessRate(
                typeof d.lastBuildSuccessRate === "number" ? d.lastBuildSuccessRate : null,
              );
            }
          });
        } catch (e) {
          // ignore
        }
        return;
      }
      const data = await res.json();
      setBuildStep(data.message || "Finalizing Knowledge Base...");
      setBuildProgress(100);
      setKbStatus(data.status === "ready" ? "ready" : "empty");
      if (data.completedAt) {
        const d = new Date(data.completedAt);
        if (!Number.isNaN(d.getTime())) setKbUpdatedAt(d);
      } else {
        setKbUpdatedAt(new Date());
      }
      // Refresh state to show latest run summary.
      try {
        const s = await fetch("/api/knowledge-base/state");
        if (s.ok) {
          const d = await s.json();
          if (d?.lastBuild && typeof d.lastBuild === "object") {
            const started = new Date(d.lastBuild.startedAt);
            const completed = d.lastBuild.completedAt ? new Date(d.lastBuild.completedAt) : null;
            setLastBuild({
              id: String(d.lastBuild.id),
              status: String(d.lastBuild.status || "unknown"),
              startedAt: Number.isNaN(started.getTime()) ? new Date() : started,
              completedAt: completed && !Number.isNaN(completed.getTime()) ? completed : null,
              processed: Number(d.lastBuild.processed ?? 0),
              failed: Number(d.lastBuild.failed ?? 0),
              error: typeof d.lastBuild.error === "string" ? d.lastBuild.error : null,
            });
          } else {
            setLastBuild(null);
          }
          setLastBuildSuccessRate(
            typeof d.lastBuildSuccessRate === "number" ? d.lastBuildSuccessRate : null,
          );
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      toast({
        title: "Build failed",
        description: "Network error while building. Please try again.",
        variant: "destructive",
      });
      setKbStatus("empty");
      setBuildProgress(0);
      setBuildStep("");
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await fetch(`/api/knowledge-base/files/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {
      // ignore
    }
    removeFile(id);
    if (selectedFileId === id) setSelectedFileId(null);
  };
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
                Drag and drop files here or click to browse. Supported formats: .md, .mdx, .txt, .json, .pdf, .html,
                .csv, .yml, .yaml, .xml, .docx, and common code files.
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
                  accept=".md,.mdx,.txt,.json,.pdf,.html,.csv,.yml,.yaml,.xml,.docx,.js,.jsx,.ts,.tsx,.py,.java,.cs,.rb,.go,.php,.sql"
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

              <div className="mt-6 rounded-lg border bg-muted/20 p-4 text-sm">
                <p className="font-medium">What should you upload?</p>
                <p className="mt-1 text-muted-foreground">
                  Upload the docs that describe how your product works (flows, rules, APIs). The better the docs, the
                  better the generated test cases and scripts.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-medium">High-value docs</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>PRD / user stories / acceptance criteria</li>
                      <li>API specs (OpenAPI/Swagger exported as JSON)</li>
                      <li>Auth rules (roles, permissions, session rules)</li>
                      <li>UI flows (happy path + edge cases)</li>
                      <li>Error codes and validation rules</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Examples</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>README / onboarding docs</li>
                      <li>Sample request/response payloads</li>
                      <li>Test data rules (formats, constraints)</li>
                      <li>Release notes / change logs</li>
                      <li>HTML exports of internal docs</li>
                    </ul>
                  </div>
                </div>
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
                      onClick={() => setSelectedFileId(file.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedFileId(file.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group w-full text-left",
                        selectedFileId === file.id && "border-primary bg-primary/5",
                      )}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteFile(file.id)
                        }}
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
                    <p className="text-sm text-muted-foreground">
                      Last updated: {kbUpdatedAt ? formatTimeAgo(kbUpdatedAt) : "—"}
                    </p>
                  </div>
                )}
              </div>

              {lastBuild && (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Latest build run</p>
                    <p
                      className={cn(
                        "text-xs",
                        lastBuild.status === "ready"
                          ? "text-green-500"
                          : lastBuild.status === "failed"
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {lastBuild.status}
                    </p>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {lastBuildSuccessRate === null ? "—" : `${lastBuildSuccessRate}%`} success • {lastBuild.processed} processed • {lastBuild.failed} failed
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started {formatTimeAgo(lastBuild.startedAt)}
                    {lastBuild.completedAt ? ` • Completed ${formatTimeAgo(lastBuild.completedAt)}` : ""}
                  </p>
                  {lastBuild.error && <p className="mt-2 text-xs text-destructive">{lastBuild.error}</p>}
                </div>
              )}

              <div className="mt-auto">
                <Button
                  className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                  disabled={files.length === 0 || kbStatus === "building" || !isLoggedIn}
                  onClick={handleBuildKB}
                >
                  {!isLoggedIn
                    ? "Login to Build"
                    : kbStatus === "building"
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
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-[120px]">
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
              <div className="h-[200px] rounded-md border bg-muted/50 p-4 text-sm overflow-auto">
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.size} • {selectedFile.type.toUpperCase()} •{" "}
                      {selectedFile.uploadDate.toLocaleString()}
                    </p>
                    <div className={cn("mt-3", previewTab === "code" ? "font-mono text-xs" : "text-muted-foreground")}
                    >
                      {previewMessage ? (
                        <p>{previewMessage}</p>
                      ) : filePreview ? (
                        <pre className="whitespace-pre-wrap">{filePreview}</pre>
                      ) : (
                        <p className="text-muted-foreground">Loading preview…</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No files uploaded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

