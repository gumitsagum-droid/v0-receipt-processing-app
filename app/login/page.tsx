import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage() {
  const user = await getSession()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">DecontUfr</h1>
          <p className="text-muted-foreground mt-2">Gestioneaza bonurile tale fiscal</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
