import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, PlayCircle, CheckCircle2, ArrowRight, Upload, Code2 } from "lucide-react"
import Link from "next/link"
const formatTimeAgo = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  let session = null
  let userId = undefined
  try {
    session = await getServerSession(authOptions)
    userId = (session?.user as any)?.id as string | undefined
  } catch {}

  let filesCount = 0, testCasesWeek = 0, scriptsCount = 0, latestKbBuild = null;
  let recentTests: any[] = [], recentScripts: any[] = [], recent: any[] = [];
  let done = 0, failed = 0, total = 0, successRate = null;
  if (userId) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    [filesCount, testCasesWeek, scriptsCount, latestKbBuild, recentTests, recentScripts] = await Promise.all([
      prisma.file.count({ where: { userId } }),
      prisma.testCase.count({ where: { userId, createdAt: { gte: weekAgo } } }),
      prisma.script.count({ where: { userId } }),
      prisma.knowledgeBaseBuild.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
        select: { processed: true, failed: true },
      }),
      prisma.testCase.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, testId: true, scenario: true, createdAt: true },
      }),
      prisma.script.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, testCaseId: true, createdAt: true },
      }),
    ])
    done = latestKbBuild?.processed ?? 0
    failed = latestKbBuild?.failed ?? 0
    total = done + failed
    successRate = total > 0 ? Math.round((done / total) * 100) : null
    recent = [
      ...recentTests.map((t) => ({
        kind: "test" as const,
        key: `test-${t.id}`,
        title: t.scenario,
        subtitle: `${t.testId} • ${formatTimeAgo(t.createdAt)}`,
        href: "/dashboard/test-generator",
        createdAt: t.createdAt,
      })),
      ...recentScripts.map((s) => ({
        kind: "script" as const,
        key: `script-${s.id}`,
        title: "Selenium script generated",
        subtitle: `${formatTimeAgo(s.createdAt)}`,
        href: "/dashboard/script-generator",
        createdAt: s.createdAt,
      })),
        let recentTests: any[] = [], recentScripts: any[] = [], recent: any[] = [];
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your QA automation workspace.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filesCount}</div>
            <p className="text-xs text-muted-foreground">Files uploaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testCasesWeek}</div>
            <p className="text-xs text-muted-foreground">Generated in last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scripts</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scriptsCount}</div>
            <p className="text-xs text-muted-foreground">Generated scripts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate === null ? "—" : `${successRate}%`}</div>
            <p className="text-xs text-muted-foreground">KB build success</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest generated test cases and scripts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  No activity yet. Upload docs and generate test cases to get started.
                </div>
              ) : (
                recent.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {item.kind === "test" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Code2 className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </div>
                    <Link href={item.href}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start a new automation task.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/dashboard/upload">
              <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                <Upload className="mr-2 h-4 w-4" />
                Upload Documentation
                <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </Link>
            <Link href="/dashboard/test-generator">
              <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Generate Test Cases
                <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </Link>
            <Link href="/dashboard/script-generator">
              <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                <Code2 className="mr-2 h-4 w-4" />
                Generate Selenium Script
                <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
