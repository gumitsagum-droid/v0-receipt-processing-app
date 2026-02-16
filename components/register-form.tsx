'use client'

import { useState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await registerAction(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-foreground">Inregistrare</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Nume complet</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Mihai Popescu"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="exemplu@email.com"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Parola</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minim 6 caractere"
              required
              minLength={6}
              className="bg-background"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Se incarca...' : 'Creaza cont'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Ai deja cont?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Autentifica-te
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
