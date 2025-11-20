import { NextResponse } from "next/server"

export const runtime = "nodejs"

type TestCase = {
  id: string
  feature: string
  scenario: string
  steps: string[]
  expectedResult: string
  type: "positive" | "negative"
}

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: "" }))

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'prompt'" }, { status: 400 })
  }

  // Placeholder deterministic test cases – replace with real LLM integration.
  const testCases: TestCase[] = [
    {
      id: "TC-001",
      feature: "Checkout Flow",
      scenario: `Happy path checkout for: ${prompt.slice(0, 80)}`,
      steps: [
        "Navigate to product page",
        "Add item to cart",
        "Proceed to checkout",
        "Enter valid customer details",
        "Enter valid payment information",
        "Click 'Place Order'",
      ],
      expectedResult: "Order confirmation page is displayed with order ID",
      type: "positive",
    },
    {
      id: "TC-002",
      feature: "Checkout Flow",
      scenario: "Payment fails with invalid or expired card",
      steps: [
        "Navigate to product page",
        "Add item to cart",
        "Proceed to checkout",
        "Enter valid customer details",
        "Enter invalid or expired card details",
        "Click 'Place Order'",
      ],
      expectedResult: "Clear validation error is shown and order is not created",
      type: "negative",
    },
  ]

  return NextResponse.json({ testCases })
}
