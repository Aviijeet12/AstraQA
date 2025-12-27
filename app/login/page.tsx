import LoginClient from "./login-client"

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const raw = sp.callbackUrl
  const callbackUrl = Array.isArray(raw) ? raw[0] : raw

  return <LoginClient callbackUrl={callbackUrl || "/dashboard"} />
}
