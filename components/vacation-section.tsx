'use client'

import React from "react"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Vacation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, Loader2, Calendar, Eye, Pencil } from 'lucide-react'

interface VacationSectionProps {
  vacations: Vacation[]
  vacationStats: Map<string, {
    totalAlocat: number
    anAnterior: number
    concediuLegal: number
    concediuMedical: number
    concediuFaraPlata: number
    concediuSpecial: number
    remaining: number
  }>
  isAdmin: boolean
  currentUserName?: string
}

export function VacationSection({ vacations, vacationStats, isAdmin, currentUserName }: VacationSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [anAnteriorValue, setAnAnteriorValue] = useState('')
  const [savingAnAnterior, setSavingAnAnterior] = useState(false)
  
  const [formData, setFormData] = useState({
    type: '' as 'legal' | 'medical' | 'fara_plata' | 'special' | '',
    days: '',
    startDate: '',
    endDate: '',
    file: null as File | null,
    preview: null as string | null
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFormData(prev => ({ ...prev, file }))
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, preview: e.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setFormData({
      type: '',
      days: '',
      startDate: '',
      endDate: '',
      file: null,
      preview: null
    })
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleSubmit = async () => {
    if (!formData.file || !formData.type || !formData.days || !formData.startDate) {
      setError('Te rog completeaza toate campurile obligatorii')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = new FormData()
      data.append('file', formData.file)
      data.append('type', formData.type)
      data.append('days', formData.days)
      data.append('startDate', formData.startDate)
      data.append('endDate', formData.endDate || formData.startDate)

      const response = await fetch('/api/vacation', {
        method: 'POST',
        body: data
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Eroare la incarcare')
      }

      resetForm()
      setDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcare')
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'legal': return 'Odihna CO'
      case 'medical': return 'Medical'
      case 'fara_plata': return 'Fara plata'
      case 'special': return 'Special'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'legal': return 'bg-blue-100 text-blue-800'
      case 'medical': return 'bg-orange-100 text-orange-800'
      case 'fara_plata': return 'bg-amber-100 text-amber-800'
      case 'special': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditAnAnterior = (userName: string, currentValue: number) => {
    setEditingUser(userName)
    setAnAnteriorValue(currentValue.toString())
  }

  const handleSaveAnAnterior = async () => {
    if (!editingUser) return
    
    const daysToSave = parseInt(anAnteriorValue, 10) || 0
    
    setSavingAnAnterior(true)
    setError(null)
    
    try {
      const response = await fetch('/api/vacation/an-anterior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: editingUser,
          days: daysToSave
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Eroare la salvare')
      }

      setEditingUser(null)
      setAnAnteriorValue('')
      
      // Force refresh
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvarea zilelor anterioare')
    } finally {
      setSavingAnAnterior(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setAnAnteriorValue('')
  }

  // Calculeaza totaluri per utilizator - filtreaza pentru user curent daca nu e admin
  const userSummary = Array.from(vacationStats.entries())
    .filter(([userName]) => isAdmin || userName === currentUserName)
    .map(([userName, stats]) => ({
      userName,
      ...stats
    }))

  return (
    <Card className="border-border mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Concedii
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Adauga Concediu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adauga Concediu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tip Concediu *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'legal' | 'medical' | 'fara_plata' | 'special') => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteaza tipul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Concediu Odihna CO</SelectItem>
                    <SelectItem value="medical">Concediu Medical</SelectItem>
                    <SelectItem value="fara_plata">Concediu Fara Plata</SelectItem>
                    <SelectItem value="special">Concediu Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Numar Zile *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.days}
                  onChange={(e) => setFormData(prev => ({ ...prev, days: e.target.value }))}
                  placeholder="Ex: 5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inceput *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Sfarsit</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Poza Document *</Label>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.preview ? (
                    <img 
                      src={formData.preview || "/placeholder.svg"} 
                      alt="Preview" 
                      className="max-h-32 mx-auto rounded"
                    />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p>Click pentru a selecta poza</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Se incarca...
                  </>
                ) : (
                  'Salveaza Concediu'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Sumar concedii */}
        {userSummary.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-foreground">
              {isAdmin ? 'Sumar Concedii per Angajat' : 'Sumar Concedii'}
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Nume</TableHead>
                    <TableHead className="font-semibold bg-emerald-100 dark:bg-emerald-900/30">Alocat</TableHead>
                    <TableHead className="font-semibold bg-indigo-100 dark:bg-indigo-900/30">An Anterior</TableHead>
                    <TableHead className="font-semibold bg-blue-100 dark:bg-blue-900/30">Odihna CO</TableHead>
                    <TableHead className="font-semibold bg-orange-100 dark:bg-orange-900/30">Medical</TableHead>
                    <TableHead className="font-semibold bg-amber-100 dark:bg-amber-900/30">Fara Plata</TableHead>
                    <TableHead className="font-semibold bg-purple-100 dark:bg-purple-900/30">Special</TableHead>
                    <TableHead className="font-semibold bg-green-100 dark:bg-green-900/30">Total Disponibil</TableHead>
                    <TableHead className="font-semibold bg-green-200 dark:bg-green-800/30">Ramas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSummary.map((user) => (
                    <TableRow key={user.userName}>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell className="bg-emerald-50 dark:bg-emerald-900/10">{user.totalAlocat}</TableCell>
                      <TableCell className="bg-indigo-50 dark:bg-indigo-900/10">
                        {editingUser === user.userName ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={anAnteriorValue}
                              onChange={(e) => setAnAnteriorValue(e.target.value)}
                              className="w-16 h-7 text-sm"
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={handleSaveAnAnterior}
                              disabled={savingAnAnterior}
                              className="h-7 px-2"
                            >
                              {savingAnAnterior ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={handleCancelEdit}
                              className="h-7 px-2"
                            >
                              X
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.anAnterior}</span>
                            {isAdmin && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEditAnAnterior(user.userName, user.anAnterior)}
                                className="h-6 px-2 text-xs bg-transparent"
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="bg-blue-50 dark:bg-blue-900/10">{user.concediuLegal}</TableCell>
                      <TableCell className="bg-orange-50 dark:bg-orange-900/10">{user.concediuMedical}</TableCell>
                      <TableCell className="bg-amber-50 dark:bg-amber-900/10">{user.concediuFaraPlata}</TableCell>
                      <TableCell className="bg-purple-50 dark:bg-purple-900/10">{user.concediuSpecial || 0}</TableCell>
                      <TableCell className="bg-green-50 dark:bg-green-900/10 font-semibold">{user.totalAlocat + user.anAnterior}</TableCell>
                      <TableCell className="bg-green-100 dark:bg-green-800/10 font-bold text-green-700 dark:text-green-400">{user.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Lista concedii */}
        {vacations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nu exista concedii inregistrate
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {isAdmin && <TableHead className="font-semibold">Nume</TableHead>}
                  <TableHead className="font-semibold">Tip</TableHead>
                  <TableHead className="font-semibold">Zile</TableHead>
                  <TableHead className="font-semibold">Data Inceput</TableHead>
                  <TableHead className="font-semibold">Data Sfarsit</TableHead>
                  <TableHead className="font-semibold text-center">Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((vacation) => (
                  <TableRow key={vacation.id}>
                    {isAdmin && <TableCell className="font-medium">{vacation.userName}</TableCell>}
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(vacation.type)}`}>
                        {getTypeLabel(vacation.type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{vacation.days}</TableCell>
                    <TableCell>{vacation.startDate}</TableCell>
                    <TableCell>{vacation.endDate}</TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>
                              Document Concediu - {getTypeLabel(vacation.type)}
                            </DialogTitle>
                          </DialogHeader>
                          <img
                            src={vacation.imageUrl || "/placeholder.svg"}
                            alt="Document concediu"
                            className="w-full max-h-[70vh] object-contain rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
