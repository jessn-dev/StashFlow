import LoginUI from './LoginUI'

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ message?: string; mode?: string }> }>) {
  const params = await searchParams
  const mode = params?.mode as 'login' | 'signup' | 'forgot' | undefined
  return <LoginUI initialMode={mode} message={params?.message} />
}
