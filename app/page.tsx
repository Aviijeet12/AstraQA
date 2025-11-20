import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, CheckCircle2, Code2, FileText } from "lucide-react"
import HeroBackground from "@/components/hero-background"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">AstraQA Engine</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/how-it-works" className="hover:text-primary transition-colors">
              How it Works
            </Link>
            <Link href="/demo" className="hover:text-primary transition-colors">
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-48 min-h-screen flex flex-col justify-center">
          <HeroBackground />

          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-6">
              AstraQA Engine
            </h1>

            <p className="mx-auto max-w-2xl text-xl text-muted-foreground mb-10 leading-relaxed">
              Upload requirements, understand context, and generate production-ready Selenium scripts automatically. The
              future of testing is here.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-105"
                >
                  Start Automating
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all bg-transparent"
                >
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Abstract UI Preview */}
            <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-border/50 bg-card/50 p-2 backdrop-blur-sm shadow-2xl">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 to-purple-500/30 opacity-30 blur-lg"></div>
              <div className="relative rounded-lg border border-border bg-background/90 overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center">
                <div className="grid grid-cols-3 gap-8 p-8 w-full h-full opacity-80">
                  <div className="col-span-1 space-y-4">
                    <div className="h-8 w-3/4 rounded bg-muted animate-pulse"></div>
                    <div className="h-4 w-full rounded bg-muted/50"></div>
                    <div className="h-4 w-5/6 rounded bg-muted/50"></div>
                    <div className="h-32 w-full rounded bg-muted/30 mt-8 border border-dashed border-muted-foreground/20 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-4 border-l border-border/50 pl-8">
                    <div className="flex gap-2 mb-8">
                      <div className="h-3 w-3 rounded-full bg-red-500/50"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500/50"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="space-y-3 font-mono text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">➜</span>
                        <span>Analyzing requirements...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary">➜</span>
                        <span>Generating test cases...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-foreground">Test Case #124: Checkout Flow Validation</span>
                      </div>
                      <div className="p-4 rounded bg-muted/20 border border-border/50 mt-4">
                        <span className="text-blue-400">def</span>{" "}
                        <span className="text-yellow-400">test_checkout_flow</span>(driver):
                        <br />
                        &nbsp;&nbsp;driver.get(<span className="text-green-400">"https://example.com/cart"</span>)
                        <br />
                        &nbsp;&nbsp;driver.find_element(By.ID, <span className="text-green-400">"checkout-btn"</span>
                        ).click()
                        <br />
                        &nbsp;&nbsp;<span className="text-muted-foreground"># AI Generated Script</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Everything you need to automate</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From document parsing to script generation, our agent handles the heavy lifting so you can focus on
                quality.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Link
                href="/dashboard/knowledge-base"
                className="group block relative overflow-hidden rounded-2xl border border-border/50 bg-background p-8 hover:border-primary/50 transition-colors"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Knowledge Base</h3>
                <p className="text-muted-foreground">
                  Upload PRDs, user stories, and design docs. Our agent parses and understands your application's
                  context instantly.
                </p>
              </Link>

              <Link
                href="/dashboard/test-generator"
                className="group block relative overflow-hidden rounded-2xl border border-border/50 bg-background p-8 hover:border-primary/50 transition-colors"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Smart Test Cases</h3>
                <p className="text-muted-foreground">
                  Generate comprehensive positive and negative test scenarios based on your uploaded documentation.
                </p>
              </Link>

              <Link
                href="/dashboard/script-generator"
                className="group block relative overflow-hidden rounded-2xl border border-border/50 bg-background p-8 hover:border-primary/50 transition-colors"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Selenium Scripts</h3>
                <p className="text-muted-foreground">
                  Convert test cases into executable Selenium Python scripts ready for your CI/CD pipeline.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-primary/5"></div>
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">Ready to modernize your QA process?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
              Join forward-thinking teams using AI to accelerate their testing workflows.
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
              >
                Start Building Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">AstraQA Engine</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
          </div>
        </div>
      </footer>
    </div>
  )
}
