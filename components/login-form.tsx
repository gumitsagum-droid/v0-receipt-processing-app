'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // State pentru schimbare parola
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [cpEmail, setCpEmail] = useState('')
  const [cpNewPassword, setCpNewPassword] = useState('')
  const [cpConfirmPassword, setCpConfirmPassword] = useState('')
  const [cpError, setCpError] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpSuccess, setCpSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await loginAction(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }
  
  const handleChangePassword = async () => {
    setCpError('')
    
    if (!cpEmail) {
      setCpError('Introdu adresa de email')
      return
    }
    if (!cpNewPassword || cpNewPassword.length < 6) {
      setCpError('Parola noua trebuie sa aiba minim 6 caractere')
      return
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError('Parolele nu coincid')
      return
    }
    
    setCpLoading(true)
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cpEmail, newPassword: cpNewPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCpSuccess(true)
        setTimeout(() => {
          setChangePasswordOpen(false)
          setCpSuccess(false)
          setCpEmail('')
          setCpNewPassword('')
          setCpConfirmPassword('')
        }, 2000)
      } else {
        setCpError(data.error || 'A aparut o eroare')
      }
    } catch {
      setCpError('A aparut o eroare de conexiune')
    } finally {
      setCpLoading(false)
    }
  }
  
  const openChangePassword = () => {
    setCpEmail('')
    setCpNewPassword('')
    setCpConfirmPassword('')
    setCpError('')
    setCpSuccess(false)
    setChangePasswordOpen(true)
  }

  return (
    <>
      <Card className="border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-foreground">Autentificare</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Parola</Label>
                <button
                  type="button"
                  onClick={openChangePassword}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Ai uitat parola?
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Parola ta"
                required
                className="bg-background"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Se incarca...' : 'Autentificare'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Nu ai cont?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Inregistreaza-te
            </Link>
          </p>
        </CardFooter>
      </Card>
      
      {/* Dialog Schimbare Parola */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Schimbare Parola
            </DialogTitle>
            <DialogDescription>
              Introdu email-ul tau si noua parola pentru a o reseta.
            </DialogDescription>
          </DialogHeader>
          
          {cpSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-foreground font-medium">Parola a fost schimbata cu succes!</p>
              <p className="text-sm text-muted-foreground">Te poti autentifica cu noua parola.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cp-email">Email</Label>
                  <Input
                    id="cp-email"
                    type="email"
                    placeholder="exemplu@email.com"
                    value={cpEmail}
                    onChange={(e) => setCpEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-new-password">Parola Noua</Label>
                  <Input
                    id="cp-new-password"
                    type="password"
                    placeholder="Minim 6 caractere"
                    value={cpNewPassword}
                    onChange={(e) => setCpNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-confirm-password">Confirma Parola Noua</Label>
                  <Input
                    id="cp-confirm-password"
                    type="password"
                    placeholder="Repeta parola noua"
                    value={cpConfirmPassword}
                    onChange={(e) => setCpConfirmPassword(e.target.value)}
                  />
                </div>
                {cpError && (
                  <p className="text-sm text-destructive">{cpError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setChangePasswordOpen(false)}
                  disabled={cpLoading}
                  className="bg-transparent"
                >
                  Anuleaza
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={cpLoading}
                >
                  {cpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se salveaza...
                    </>
                  ) : (
                    'Schimba Parola'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
