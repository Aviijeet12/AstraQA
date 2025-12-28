import Link from "next/link"
import { Button } from "@/components/ui/button"
import AuthLink from "@/components/auth-link"
import { ArrowRight, Bot, Upload, FileText, Code2, PlayCircle, CheckCircle2 } from "lucide-react"

export default function HowItWorksPage() {
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
            <Link href="/how-it-works" className="text-primary transition-colors">
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
            <AuthLink href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </AuthLink>
          </div>
        </div>
      </header>

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-6">How AstraQA Engine Works</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our AI-driven pipeline transforms your requirements into executable tests in minutes, not days.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute left-[50%] top-0 bottom-0 w-px bg-border hidden md:block -translate-x-1/2"></div>

            {/* Step 1 */}
            <div className="relative grid md:grid-cols-2 gap-8 mb-16 items-center">
              <div className="md:text-right md:pr-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 md:hidden">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">1. Upload Knowledge</h3>
                <p className="text-muted-foreground">
                  Start by uploading your Product Requirement Documents (PRDs), user stories, or design files. Our
                  engine parses and indexes this information to understand your application's logic.
                </p>
              </div>
              <div className="relative md:pl-12">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary hidden md:block z-10"></div>
                <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">PRD_v2.0.pdf</div>
                      <div className="text-xs text-muted-foreground">Processed successfully</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded w-full"></div>
                    <div className="h-2 bg-muted rounded w-3/4"></div>
                    <div className="h-2 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative grid md:grid-cols-2 gap-8 mb-16 items-center">
              <div className="order-2 md:order-1 md:pr-12">
                <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify Login Functionality</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Test Invalid Credentials</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Check Password Reset Flow</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Validate Session Timeout</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 md:pl-12">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary hidden md:block z-10"></div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 md:hidden">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">2. Generate Scenarios</h3>
                <p className="text-muted-foreground">
                  The AI analyzes your documentation to generate comprehensive test scenarios. It covers happy paths,
                  edge cases, and negative testing scenarios automatically.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative grid md:grid-cols-2 gap-8 mb-16 items-center">
              <div className="md:text-right md:pr-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 md:hidden">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">3. Create Scripts</h3>
                <p className="text-muted-foreground">
                  Select the scenarios you want to automate, and AstraQA Engine generates production-ready Selenium
                  Python scripts. The code is clean, commented, and ready to run.
                </p>
              </div>
              <div className="relative md:pl-12">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary hidden md:block z-10"></div>
                <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg font-mono text-xs">
                  <div className="text-blue-400">def</div> <div className="inline text-yellow-400">test_login</div>
                  (driver):
                  <div className="pl-4 text-muted-foreground"># Navigate to login page</div>
                  <div className="pl-4">
                    driver.get(<span className="text-green-400">"/login"</span>)
                  </div>
                  <div className="pl-4 text-muted-foreground"># Enter credentials</div>
                  <div className="pl-4">
                    driver.find_element(By.ID, <span className="text-green-400">"email"</span>).send_keys(user)
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 md:pr-12">
                <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                      <PlayCircle className="h-6 w-6" />
                    </div>
                    <div className="font-bold">Tests Passed</div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 md:pl-12">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary hidden md:block z-10"></div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 md:hidden">
                  <PlayCircle className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">4. Execute & Verify</h3>
                <p className="text-muted-foreground">
                  Download the scripts and run them in your CI/CD pipeline or local environment. Verify your application
                  stability with every build.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-24 text-center">
            <AuthLink href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Your First Test
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </AuthLink>
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
