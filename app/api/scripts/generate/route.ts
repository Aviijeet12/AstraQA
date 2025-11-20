import { NextResponse } from "next/server"

export const runtime = "nodejs"

type IncomingTestCase = {
  id: string
  feature: string
  scenario: string
  steps: string[]
  expectedResult: string
  type: "positive" | "negative"
}

export async function POST(req: Request) {
  const { testCase } = (await req.json().catch(() => ({}))) as { testCase?: IncomingTestCase }

  if (!testCase) {
    return NextResponse.json({ error: "Missing 'testCase' payload" }, { status: 400 })
  }

  const safeId = testCase.id.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "case"

  const script = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


def test_${safeId}():
    """${testCase.feature} - ${testCase.scenario}"""
    driver = webdriver.Chrome()
    driver.maximize_window()

    try:
        print("Starting Test Case: ${testCase.scenario}")

        # TODO: Map generated steps to concrete locators
        # High-level steps from the test case:
${testCase.steps
  .map((step, index) => `        # ${index + 1}. ${step}`)
  .join("\n")}

        # Example navigation (replace with real URL and locators)
        driver.get("https://example.com")
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        # Add concrete Selenium commands here based on your application under test

        print("✅ Expected Result: ${testCase.expectedResult}")

    except Exception as e:
        print(f"❌ Test Failed: {str(e)}")
        driver.save_screenshot("error_screenshot.png")
        raise

    finally:
        driver.quit()


if __name__ == "__main__":
    test_${safeId}()
`

  return NextResponse.json({ script })
}
