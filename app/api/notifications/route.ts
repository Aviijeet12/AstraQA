import { NextResponse } from 'next/server'

const SAMPLE = [
  { id: '1', title: 'Knowledge base build finished', body: 'Your KB build completed successfully.', url: '/dashboard/knowledge-base', read: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'New test cases ready', body: '3 new test cases were generated.', url: '/dashboard/test-generator', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
]

let notifications = SAMPLE

export async function GET() {
  return NextResponse.json({ notifications })
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { action, id } = data
    if (action === 'mark-read') {
      notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return NextResponse.json({ ok: true })
    }
    if (action === 'mark-all-read') {
      notifications = notifications.map((n) => ({ ...n, read: true }))
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
