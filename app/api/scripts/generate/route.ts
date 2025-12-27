import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { retrieveChunks } from "@/lib/rag";

export const runtime = "nodejs"

type IncomingTestCase = {
  id: string
  feature: string
  scenario: string
  steps: string[]
  expectedResult: string
  type: "positive" | "negative"
}

type ScriptLanguage = "python" | "javascript" | "typescript" | "java" | "csharp" | "ruby";

type SeleniumPrefs = {
  browser: "chrome" | "firefox" | "edge" | "safari";
  implicitWaitSeconds: number;
  headless: boolean;
};

const safeIdent = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "case";

const stepsAsComments = (steps: string[], indent: string) =>
  steps.map((s, i) => `${indent}// ${i + 1}. ${s}`).join("\n");

const stepsAsCommentsHash = (steps: string[], indent: string) =>
  steps.map((s, i) => `${indent}# ${i + 1}. ${s}`).join("\n");

function makeRagHeader(mode: string, chunks: Array<{ text: string }>) {
  if (chunks.length === 0) return "";
  const body = chunks
    .slice(0, 4)
    .map((c, i) => "# KB Context " + String(i + 1) + "\n# " + c.text.replace(/\r?\n/g, "\n# "))
    .join("\n# ---\n");
  return "# RAG mode: " + mode + "\n" + body + "\n\n";
}

function normalizePrefs(input: Partial<SeleniumPrefs> | null | undefined): SeleniumPrefs {
  const b = input?.browser;
  const browser = b === "firefox" || b === "edge" || b === "safari" ? b : "chrome";
  const implicitWaitSecondsRaw = typeof input?.implicitWaitSeconds === "number" ? input.implicitWaitSeconds : 10;
  const implicitWaitSeconds = Number.isFinite(implicitWaitSecondsRaw)
    ? Math.max(0, Math.min(600, Math.floor(implicitWaitSecondsRaw)))
    : 10;
  const headless = input?.headless === true;
  return { browser, implicitWaitSeconds, headless };
}

function renderScript(testCase: IncomingTestCase, language: ScriptLanguage, prefs: SeleniumPrefs) {
  const id = safeIdent(testCase.id);
  const browser = prefs.browser;
  const headless = prefs.headless;
  const implicitWaitSeconds = prefs.implicitWaitSeconds;

  if (language === "python") {
    return `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def _build_driver():
    browser = "${browser}"
    headless = ${headless ? "True" : "False"}
    implicit_wait_seconds = ${implicitWaitSeconds}

    if browser == "firefox":
        options = webdriver.FirefoxOptions()
        if headless:
            options.add_argument("-headless")
        driver = webdriver.Firefox(options=options)
    elif browser == "edge":
        options = webdriver.EdgeOptions()
        if headless:
            options.add_argument("--headless=new")
        driver = webdriver.Edge(options=options)
    elif browser == "safari":
        driver = webdriver.Safari()
    else:
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        driver = webdriver.Chrome(options=options)

    driver.implicitly_wait(implicit_wait_seconds)
    try:
        driver.maximize_window()
    except Exception:
        pass
    return driver


def test_${id}():
    """${testCase.feature} - ${testCase.scenario}"""
    driver = _build_driver()

    try:
        print("Starting Test Case: ${testCase.scenario}")

        # TODO: Map generated steps to concrete locators
        # High-level steps from the test case:
${stepsAsCommentsHash(testCase.steps, "        ")}

        driver.get("https://example.com")
        WebDriverWait(driver, ${implicitWaitSeconds}).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        print("✅ Expected Result: ${testCase.expectedResult}")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_${id}()
`;
  }

  if (language === "javascript") {
    return `// Selenium WebDriver (Node.js)
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');

async function buildDriver() {
  const browser = '${browser}';
  const headless = ${headless ? "true" : "false"};
  const implicitWaitMs = ${implicitWaitSeconds} * 1000;

  let builder = new Builder().forBrowser(browser);

  if (browser === 'chrome') {
    const options = new chrome.Options();
    if (headless) options.addArguments('--headless=new');
    builder = builder.setChromeOptions(options);
  } else if (browser === 'firefox') {
    const options = new firefox.Options();
    if (headless) options.addArguments('-headless');
    builder = builder.setFirefoxOptions(options);
  } else if (browser === 'edge') {
    const options = new edge.Options();
    if (headless) options.addArguments('--headless=new');
    builder = builder.setEdgeOptions(options);
  }

  const driver = await builder.build();
  await driver.manage().setTimeouts({ implicit: implicitWaitMs });
  return driver;
}

async function test_${id}() {
  // ${testCase.feature} - ${testCase.scenario}
  const driver = await buildDriver();

  try {
    console.log('Starting Test Case: ${testCase.scenario}');

    // TODO: Map generated steps to concrete locators
${stepsAsComments(testCase.steps, "    ")}

    await driver.get('https://example.com');
    await driver.wait(until.elementLocated(By.css('body')), ${implicitWaitSeconds} * 1000);

    console.log('✅ Expected Result: ${testCase.expectedResult}');
  } finally {
    await driver.quit();
  }
}

test_${id}();
`;
  }

  if (language === "typescript") {
    return `// Selenium WebDriver (TypeScript)
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';
import edge from 'selenium-webdriver/edge';

async function buildDriver() {
  const browser = '${browser}' as const;
  const headless = ${headless ? "true" : "false"};
  const implicitWaitMs = ${implicitWaitSeconds} * 1000;

  let builder = new Builder().forBrowser(browser);

  if (browser === 'chrome') {
    const options = new chrome.Options();
    if (headless) options.addArguments('--headless=new');
    builder = builder.setChromeOptions(options);
  } else if (browser === 'firefox') {
    const options = new firefox.Options();
    if (headless) options.addArguments('-headless');
    builder = builder.setFirefoxOptions(options);
  } else if (browser === 'edge') {
    const options = new edge.Options();
    if (headless) options.addArguments('--headless=new');
    builder = builder.setEdgeOptions(options);
  }

  const driver = await builder.build();
  await driver.manage().setTimeouts({ implicit: implicitWaitMs });
  return driver;
}

async function test_${id}(): Promise<void> {
  // ${testCase.feature} - ${testCase.scenario}
  const driver = await buildDriver();

  try {
    console.log('Starting Test Case: ${testCase.scenario}');

    // TODO: Map generated steps to concrete locators
${stepsAsComments(testCase.steps, "    ")}

    await driver.get('https://example.com');
    await driver.wait(until.elementLocated(By.css('body')), ${implicitWaitSeconds} * 1000);

    console.log('✅ Expected Result: ${testCase.expectedResult}');
  } finally {
    await driver.quit();
  }
}

void test_${id}();
`;
  }

  if (language === "java") {
    return `// Selenium WebDriver (Java)
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.safari.SafariDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class Test_${id} {
  public static void main(String[] args) {
    String browser = "${browser}";
    boolean headless = ${headless ? "true" : "false"};
    int implicitWaitSeconds = ${implicitWaitSeconds};

    WebDriver driver;

    if ("firefox".equals(browser)) {
      FirefoxOptions options = new FirefoxOptions();
      if (headless) options.addArguments("-headless");
      driver = new FirefoxDriver(options);
    } else if ("edge".equals(browser)) {
      EdgeOptions options = new EdgeOptions();
      if (headless) options.addArguments("--headless=new");
      driver = new EdgeDriver(options);
    } else if ("safari".equals(browser)) {
      driver = new SafariDriver();
    } else {
      ChromeOptions options = new ChromeOptions();
      if (headless) options.addArguments("--headless=new");
      driver = new ChromeDriver(options);
    }

    driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(implicitWaitSeconds));
    try {
      System.out.println("Starting Test Case: ${testCase.scenario}");

      // TODO: Map generated steps to concrete locators
${testCase.steps.map((s, i) => `      // ${i + 1}. ${s}`).join("\n")}

      driver.get("https://example.com");
      new WebDriverWait(driver, Duration.ofSeconds(${implicitWaitSeconds}))
        .until(ExpectedConditions.presenceOfElementLocated(By.tagName("body")));

      System.out.println("✅ Expected Result: ${testCase.expectedResult}");
    } finally {
      driver.quit();
    }
  }
}
`;
  }

  if (language === "csharp") {
    return `// Selenium WebDriver (C#)
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Edge;
using OpenQA.Selenium.Firefox;
using OpenQA.Selenium.Safari;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using System;

public class Test_${id} {
  public static void Main() {
    string browser = "${browser}";
    bool headless = ${headless ? "true" : "false"};
    int implicitWaitSeconds = ${implicitWaitSeconds};

    IWebDriver driver;

    if (browser == "firefox") {
      var options = new FirefoxOptions();
      if (headless) options.AddArgument("-headless");
      driver = new FirefoxDriver(options);
    } else if (browser == "edge") {
      var options = new EdgeOptions();
      if (headless) options.AddArgument("--headless=new");
      driver = new EdgeDriver(options);
    } else if (browser == "safari") {
      driver = new SafariDriver();
    } else {
      var options = new ChromeOptions();
      if (headless) options.AddArgument("--headless=new");
      driver = new ChromeDriver(options);
    }

    driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(implicitWaitSeconds);
    try {
      Console.WriteLine("Starting Test Case: ${testCase.scenario}");

      // TODO: Map generated steps to concrete locators
${testCase.steps.map((s, i) => `      // ${i + 1}. ${s}`).join("\n")}

      driver.Navigate().GoToUrl("https://example.com");
      var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(${implicitWaitSeconds}));
      wait.Until(ExpectedConditions.ElementExists(By.CssSelector("body")));

      Console.WriteLine("✅ Expected Result: ${testCase.expectedResult}");
    } finally {
      driver.Quit();
    }
  }
}
`;
  }

  // ruby
  return `# Selenium WebDriver (Ruby)
require 'selenium-webdriver'

def test_${id}
  # ${testCase.feature} - ${testCase.scenario}
  browser = :${browser}
  headless = ${headless ? "true" : "false"}
  implicit_wait_seconds = ${implicitWaitSeconds}

  options = case browser
            when :firefox
              opts = Selenium::WebDriver::Firefox::Options.new
              opts.add_argument('-headless') if headless
              opts
            when :edge
              opts = Selenium::WebDriver::Edge::Options.new
              opts.add_argument('--headless=new') if headless
              opts
            when :safari
              nil
            else
              opts = Selenium::WebDriver::Chrome::Options.new
              opts.add_argument('--headless=new') if headless
              opts
            end

  driver = options ? Selenium::WebDriver.for(browser, options: options) : Selenium::WebDriver.for(browser)
  driver.manage.timeouts.implicit_wait = implicit_wait_seconds

  begin
    puts "Starting Test Case: ${testCase.scenario}"

    # TODO: Map generated steps to concrete locators
${testCase.steps.map((s, i) => `    # ${i + 1}. ${s}`).join("\n")}

    driver.navigate.to 'https://example.com'
    Selenium::WebDriver::Wait.new(timeout: ${implicitWaitSeconds}).until { driver.find_element(css: 'body') }

    puts "✅ Expected Result: ${testCase.expectedResult}"
  ensure
    driver.quit
  end
end

test_${id}
`;
}

export async function POST(req: Request) {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const { testCase, language } = (await req.json().catch(() => ({}))) as {
    testCase?: IncomingTestCase
    language?: ScriptLanguage
  }

  if (!testCase) {
    return NextResponse.json({ error: "Missing 'testCase' payload" }, { status: 400 })
  }

  const lang: ScriptLanguage =
    language === "python" ||
    language === "javascript" ||
    language === "typescript" ||
    language === "java" ||
    language === "csharp" ||
    language === "ruby"
      ? language
      : "python";

  const rawSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { browser: true, implicitWaitSeconds: true, headless: true },
  });

  const savedBrowser =
    rawSettings?.browser === "chrome" ||
    rawSettings?.browser === "firefox" ||
    rawSettings?.browser === "edge" ||
    rawSettings?.browser === "safari"
      ? rawSettings.browser
      : undefined;

  const prefs = normalizePrefs(
    rawSettings
      ? {
          browser: savedBrowser,
          implicitWaitSeconds: rawSettings.implicitWaitSeconds ?? undefined,
          headless: rawSettings.headless ?? undefined,
        }
      : undefined,
  );

  const script = renderScript(testCase, lang, prefs);

  // Retrieve KB context (best-effort) and prepend as comments.
  let scriptWithContext = script
  try {
    const rag = await retrieveChunks({
      userId,
      query: `${testCase.feature}\n${testCase.scenario}\n${testCase.steps.join("\n")}`,
      topK: 4,
    })
    if (lang === "python" || lang === "ruby") {
      // those templates use # comments already
      scriptWithContext = makeRagHeader(rag.mode, rag.chunks) + script
    } else {
      // convert header to // comments for JS/TS/Java/C#
      const header = makeRagHeader(rag.mode, rag.chunks)
      const jsHeader = header
        .split("\n")
        .map((l) => (l.startsWith("#") ? "//" + l.slice(1) : "// " + l))
        .join("\n")
      scriptWithContext = jsHeader + "\n" + script
    }
  } catch {
    // ignore retrieval issues
  }

  await prisma.script.create({
    data: {
      userId,
      testCaseId: testCase.id,
      language: lang,
      code: scriptWithContext,
    },
  })

  return NextResponse.json({ script: scriptWithContext, language: lang })
}
