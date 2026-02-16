'use client'

import React from "react"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Loader2 } from 'lucide-react'

// Compress image to reduce file size
async function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      
      // Calculate new dimensions (max 1920px on longest side)
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
      
      // Start with quality 0.8 and reduce if needed
      let quality = 0.8
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }
            
            // If still too large and quality > 0.3, try again with lower quality
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

export function ReceiptUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  const handleFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Te rog selecteaza o imagine')
      return
    }
    
    try {
      // Compress the image if larger than 2MB
      let processedFile = selectedFile
      if (selectedFile.size > 2 * 1024 * 1024) {
        processedFile = await compressImage(selectedFile, 2)
      }
      
      setFile(processedFile)
      setError(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(processedFile)
    } catch {
      setError('Eroare la procesarea imaginii')
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
    }
  }, [handleFile])

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError(null)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Check file size client-side (after compression should be < 4MB)
      if (file.size > 4 * 1024 * 1024) {
        throw new Error('Fisierul este prea mare. Incearca o poza mai mica.')
      }

      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[v0] Non-JSON response:', text)
        throw new Error('Eroare de server. Te rog incearca din nou.')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Eroare la incarcare')
      }
      
      // Log AI extraction result for debugging
      if (data.aiError) {
        console.error('[v0] AI extraction failed:', data.aiError)
        setError(`Bonul a fost incarcat, dar extragerea automata a esuat: ${data.aiError}`)
      }
      
      clearFile()
      router.refresh()
    } catch (err) {
      console.error('[v0] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Eroare la incarcare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Incarca bon nou</CardTitle>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground mb-2">Trage si pune poza cu bonul aici</p>
            <p className="text-sm text-muted-foreground mb-4">sau</p>
            <label>
              <Button variant="outline" asChild>
                <span>Selecteaza fisier</span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleChange}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
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
            <p className="text-sm text-muted-foreground">{file?.name}</p>
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
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
