import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, CheckCircle2, Play } from "lucide-react"

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">AstraQA Engine</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/how-it-works" className="hover:text-primary transition-colors">
              How it Works
            </Link>
            <Link href="/demo" className="text-primary transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-primary hidden sm:block"
            >
              Log in
            </Link>
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6 backdrop-blur-sm">
              <Play className="mr-2 h-3.5 w-3.5" />
              <span>Interactive Walkthrough</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-6">See AstraQA Engine in Action</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Follow this simple guide to understand how to leverage our AI engine for your testing needs.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Sidebar Guide */}
            <div className="lg:col-span-1 space-y-8">
              <div className="relative pl-8 border-l-2 border-border">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary"></div>
                <h3 className="text-xl font-bold mb-2">1. Dashboard Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Your command center for all testing activities. View recent runs, stats, and quick actions.
                </p>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>

              <div className="relative pl-8 border-l-2 border-border">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-muted border-2 border-background"></div>
                <h3 className="text-xl font-bold mb-2">2. Knowledge Base</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your project documentation. The AI needs context to generate accurate tests.
                </p>
                <Link href="/dashboard/knowledge-base">
                  <Button variant="outline" size="sm">
                    Try Uploading
                  </Button>
                </Link>
              </div>

              <div className="relative pl-8 border-l-2 border-border">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-muted border-2 border-background"></div>
                <h3 className="text-xl font-bold mb-2">3. Test Generator</h3>
                <p className="text-muted-foreground mb-4">
                  Ask the AI to generate test cases based on your uploaded knowledge. Review and select the best ones.
                </p>
                <Link href="/dashboard/test-generator">
                  <Button variant="outline" size="sm">
                    Generate Tests
                  </Button>
                </Link>
              </div>

              <div className="relative pl-8 border-l-2 border-border">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-muted border-2 border-background"></div>
                <h3 className="text-xl font-bold mb-2">4. Script Generator</h3>
                <p className="text-muted-foreground mb-4">
                  Convert your selected test cases into actual Python Selenium code ready for execution.
                </p>
                <Link href="/dashboard/script-generator">
                  <Button variant="outline" size="sm">
                    Get Code
                  </Button>
                </Link>
              </div>
            </div>

            {/* Main Content Preview */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="bg-muted/50 border-b border-border p-4 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="ml-4 text-xs text-muted-foreground font-mono">astraqa-demo.mp4</div>
                </div>
                <div className="aspect-video bg-black/5 relative flex items-center justify-center group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                  <div className="h-16 w-16 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-lg font-bold mb-1">Watch the full workflow</h3>
                    <p className="text-sm text-white/80">From requirement to code in 60 seconds</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h4 className="font-bold">Context Aware</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Understands your specific application logic, not just generic web elements.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h4 className="font-bold">Self-Healing</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scripts are generated with robust selectors that resist minor UI changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-background py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">AstraQA Engine</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AstraQA Engine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
