'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function CleanupImagesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleCleanup = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/cron/cleanup-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (response.ok) {
        setResult(data.message || `${data.cleared} bonuri procesate, ${data.deletedImages} poze sterse`)
      } else {
        setResult(`Eroare: ${data.error}`)
      }
    } catch {
      setResult('Eroare la curatare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Trash2 className="w-4 h-4" />
            Sterge pozele din lunile anterioare
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sterge pozele din lunile anterioare?</AlertDialogTitle>
            <AlertDialogDescription>
              Aceasta actiune va sterge pozele bonurilor din lunile trecute. Pozele din luna curenta raman vizibile.
              <strong className="block mt-2">Datele bonurilor (magazin, suma, data, nr bon) raman in baza de date</strong> si decontul poate fi descarcat in continuare.
              Doar imaginile se sterg pentru a economisi spatiu de stocare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuleaza</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se sterge...
                </>
              ) : (
                'Da, sterge pozele'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result && (
        <p className="text-sm text-muted-foreground">{result}</p>
      )}
    </div>
  )
}
