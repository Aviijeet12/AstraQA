"use client"

import { signOut, useSession } from "next-auth/react"
import { Bell, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function DashboardHeader() {
  const { data } = useSession()
  const email = data?.user?.email || ""
  const name = data?.user?.name || ""
  const initials = (name || email || "QA")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setNotifications(d.notifications || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'mark-read', id }), headers: { 'content-type': 'application/json' } })
    setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)))
  }

  const router = useRouter()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-md">
      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search test cases..."
              className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
            />
          </div>
        </form>
      </div>
      <div className="flex items-center gap-4">
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-white text-[10px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-auto">
                {notifications.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No notifications</div>
                )}
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onSelect={async () => {
                      await markRead(n.id)
                      router.push(n.url || '/dashboard')
                    }}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className={`text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {n.title}
                      </div>
                      {!n.read && (
                        <span className="text-xs text-muted-foreground">New</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                  </DropdownMenuItem>
                ))}
                {notifications.length > 0 && (
                  <div className="px-2 py-2">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'mark-all-read' }), headers: { 'content-type': 'application/json' } })
                      setNotifications((prev) => prev.map((p) => ({ ...p, read: true })))
                    }}>
                      Mark all read
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage alt={name || email || "user"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage alt={name || email || "user"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{name || email}</div>
                  <div className="text-xs text-muted-foreground">{email}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard/profile')}>Open Profile</Button>
              </div>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
