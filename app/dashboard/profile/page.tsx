"use client"

import { useSession } from "next-auth/react"

export default function ProfilePage() {
  const { data, status } = useSession()

  if (status === "loading") return <div className="p-8">Loading...</div>

  const user = data?.user

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="mt-4 space-y-2">
        <div>
          <strong>Name: </strong>
          {user?.name ?? "—"}
        </div>
        <div>
          <strong>Email: </strong>
          {user?.email ?? "—"}
        </div>
      </div>
    </div>
  )
}
