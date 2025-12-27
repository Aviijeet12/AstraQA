"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { SessionProvider } from "next-auth/react"

export type FileData = {
  id: string
  name: string
  size: string
  type: string
  uploadDate: Date
}

export type TestCase = {
  id: string
  feature: string
  scenario: string
  steps: string[]
  expectedResult: string
  type: "positive" | "negative"
}

type AppContextType = {
  files: FileData[]
  addFile: (file: FileData) => void
  removeFile: (id: string) => void
  setFiles: (files: FileData[]) => void
  selectedFileId: string | null
  setSelectedFileId: (id: string | null) => void
  kbStatus: "empty" | "building" | "ready"
  setKbStatus: (status: "empty" | "building" | "ready") => void
  testCases: TestCase[]
  setTestCases: (cases: TestCase[]) => void
  selectedTestCase: TestCase | null
  setSelectedTestCase: (testCase: TestCase | null) => void
  generatedScript: string | null
  setGeneratedScript: (script: string | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileData[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [kbStatus, setKbStatus] = useState<"empty" | "building" | "ready">("empty")
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)

  const addFile = (file: FileData) => {
    setFiles((prev) => [...prev, file])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <SessionProvider>
      <AppContext.Provider
        value={{
          files,
          addFile,
          removeFile,
          setFiles,
          selectedFileId,
          setSelectedFileId,
          kbStatus,
          setKbStatus,
          testCases,
          setTestCases,
          selectedTestCase,
          setSelectedTestCase,
          generatedScript,
          setGeneratedScript,
        }}
      >
        {children}
      </AppContext.Provider>
    </SessionProvider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
