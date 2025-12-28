"use client"

import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "next-auth/react"

type Props = {
  href: string
  children: ReactNode
}

export default function AuthLink({ href, children }: Props) {
  const router = useRouter()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    const session = await getSession()
    if (!session) {
      const cb = encodeURIComponent(href)
      router.push(`/login?callbackUrl=${cb}`)
      return
    }
    router.push(href)
  }

  return (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  )
}
