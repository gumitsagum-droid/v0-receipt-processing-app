'use client'

import React, { useRef, useState, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, X, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Compress image to reduce file size
async function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      
      const maxDimension = 1920
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension
          width = maxDimension
        } else {
          width = (width / height) * maxDimension
          height = maxDimension
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      let quality = 0.8
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }
            
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.1
              tryCompress()
              return
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      
      tryCompress()
    }
    
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = URL.createObjectURL(file)
  })
}

export function ActionButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualData, setManualData] = useState({
    amount: '',
    storeName: '',
    date: '',
    receiptNumber: '',
  })
  const router = useRouter()

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Te rog selecteaza o imagine')
      return
    }
    
    try {
      let processedFile = selectedFile
      if (selectedFile.size > 2 * 1024 * 1024) {
        processedFile = await compressImage(selectedFile, 2)
      }
      
      setFile(processedFile)
      setError(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
        setDialogOpen(true)
      }
      reader.readAsDataURL(processedFile)
    } catch {
      setError('Eroare la procesarea imaginii')
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    await handleFile(selectedFile)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError(null)
    setDialogOpen(false)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    
    try {
      if (file.size > 4 * 1024 * 1024) {
        throw new Error('Fisierul este prea mare. Incearca o poza mai mica.')
      }

      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Eroare de server. Te rog incearca din nou.')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Eroare la incarcare')
      }
      
      if (data.aiError) {
        setError(`Bonul a fost incarcat, dar extragerea automata a esuat: ${data.aiError}`)
      }
      
      clearFile()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcare')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualData.amount || !manualData.storeName || !manualData.date) {
      setManualError('Suma, magazinul si data sunt obligatorii')
      return
    }
    setManualLoading(true)
    setManualError(null)
    try {
      const response = await fetch('/api/receipts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Eroare la salvare')
      }
      setManualOpen(false)
      setManualData({ amount: '', storeName: '', date: '', receiptNumber: '' })
      router.refresh()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Eroare la salvare')
    } finally {
      setManualLoading(false)
    }
  }

  const scrollToTable = () => {
    const tableSection = document.getElementById('receipts-table')
    if (tableSection) {
      tableSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-8">
        <Button 
          size="lg" 
          onClick={handleUploadClick}
          className="flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Incarca poza
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => setManualOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adauga manual
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incarca bon nou</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {preview && (
              <div className="relative">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Preview bon"
                  className="w-full max-h-64 object-contain rounded-lg border border-border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearFile}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
            <Button 
              onClick={handleUpload} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se proceseaza bonul...
                </>
              ) : (
                'Incarca si proceseaza'
              )}
            </Button>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adauga bon manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Magazin / Furnizor *</Label>
              <Input
                id="storeName"
                placeholder="Ex: HORNBACH"
                value={manualData.storeName}
                onChange={(e) => setManualData(prev => ({ ...prev, storeName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Suma (RON) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Ex: 150.50"
                value={manualData.amount}
                onChange={(e) => setManualData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data (DD.MM.YYYY) *</Label>
              <Input
                id="date"
                placeholder="Ex: 16.02.2026"
                value={manualData.date}
                onChange={(e) => setManualData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Nr. Bon (optional)</Label>
              <Input
                id="receiptNumber"
                placeholder="Ex: 12345678"
                value={manualData.receiptNumber}
                onChange={(e) => setManualData(prev => ({ ...prev, receiptNumber: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleManualSubmit}
              disabled={manualLoading}
              className="w-full"
            >
              {manualLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se salveaza...
                </>
              ) : (
                'Salveaza bon'
              )}
            </Button>
            {manualError && (
              <p className="text-sm text-destructive">{manualError}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
