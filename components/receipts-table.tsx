'use client'

import { useEffect } from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Receipt } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Download, Pencil, Check, X, FileText, Trash2 } from 'lucide-react'

interface ReceiptsTableProps {
  receipts: Receipt[]
  showUserColumn?: boolean
  canDownload?: boolean
  canEdit?: boolean
  canEditAllFields?: boolean // Doar admini pot edita Suma, Magazin, Data, Nr. Bon
  canEditAvans?: boolean // Doar Boss si Stelian pot edita Avans spre Decontare
  isBoss?: boolean // Boss poate sterge bonuri
}

export function ReceiptsTable({ 
  receipts: initialReceipts, 
  showUserColumn = false,
  canDownload = false,
  canEdit = false,
  canEditAllFields = false, // false = doar Avans si Observatii, true = toate campurile
  canEditAvans = false, // false = nu poate edita Avans spre Decontare
  isBoss = false
}: ReceiptsTableProps) {
  const router = useRouter()
  // State local pentru actualizari instant (optimistic updates)
  const [receipts, setReceipts] = useState(initialReceipts)
  
  // Sincronizeaza state-ul local cu props cand se schimba datele din server
  useEffect(() => {
    setReceipts(initialReceipts)
  }, [initialReceipts])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    storeName: '',
    date: '',
    receiptNumber: ''
  })
  const [saving, setSaving] = useState(false)
  
  // Inline editing for avansDecont and observatiiLucrare
  const [editingField, setEditingField] = useState<{ id: string, field: 'avansDecont' | 'avansDate' | 'observatiiLucrare' } | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<string | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const [savingField, setSavingField] = useState(false)

  const startEditing = (receipt: Receipt) => {
    setEditingId(receipt.id)
    setEditForm({
      amount: (receipt.amount || 0).toString(),
      storeName: receipt.storeName || '',
      date: receipt.date || '',
      receiptNumber: receipt.receiptNumber || ''
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ amount: '', storeName: '', date: '', receiptNumber: '' })
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm('Esti sigur ca vrei sa stergi acest bon? Aceasta actiune este ireversibila.')) return
    setDeletingReceipt(receiptId)
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' })
      if (response.ok) {
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
    } finally {
      setDeletingReceipt(null)
    }
  }

  const startFieldEdit = (receiptId: string, field: 'avansDecont' | 'avansDate' | 'observatiiLucrare', currentValue: string) => {
    setEditingField({ id: receiptId, field })
    setFieldValue(currentValue || '')
  }

  const cancelFieldEdit = () => {
    setEditingField(null)
    setFieldValue('')
  }

  const saveFieldEdit = async () => {
    if (!editingField) return
    setSavingField(true)
    
    // Salveaza valorile inainte de a reseta state-ul
    const fieldId = editingField.id
    const fieldName = editingField.field
    const newValue = fieldValue
    
    try {
      const response = await fetch(`/api/receipts/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: newValue })
      })

      if (response.ok) {
        const data = await response.json()
        const updatedReceipt = data.receipt
        
        // Actualizeaza instant in UI (optimistic update)
        if (updatedReceipt) {
          setReceipts(prev => prev.map(r => 
            r.id === fieldId 
              ? { 
                  ...r, 
                  ...updatedReceipt // Foloseste toate datele din receipt actualizat
                } 
              : r
          ))
        }
        
        setEditingField(null)
        setFieldValue('')
      }
    } catch (error) {
      console.error('Error saving field:', error)
    } finally {
      setSavingField(false)
    }
  }

  const saveEditing = async (receiptId: string) => {
    setSaving(true)
    try {
      // Gaseste bonul original pentru a compara
      const originalReceipt = receipts.find(r => r.id === receiptId)
      if (!originalReceipt) return
      
      // Doar trimite campurile care au fost modificate si nu sunt goale
      const updates: Record<string, unknown> = {}
      
      if (editForm.amount !== '' && editForm.amount !== (originalReceipt.amount || 0).toString()) {
        updates.amount = editForm.amount
      }
      if (editForm.storeName !== '' && editForm.storeName !== (originalReceipt.storeName || '')) {
        updates.storeName = editForm.storeName
      }
      if (editForm.date !== '' && editForm.date !== (originalReceipt.date || '')) {
        updates.date = editForm.date
      }
      if (editForm.receiptNumber !== '' && editForm.receiptNumber !== (originalReceipt.receiptNumber || '')) {
        updates.receiptNumber = editForm.receiptNumber
      }
      
      // Daca nu sunt modificari, doar inchide editarea
      if (Object.keys(updates).length === 0) {
        setEditingId(null)
        return
      }
      
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        const updatedReceipt = data.receipt
        
        // Actualizeaza instant in UI (optimistic update)
        setReceipts(prev => prev.map(r => 
          r.id === receiptId 
            ? { 
                ...r, 
                ...updatedReceipt // Foloseste toate datele din receipt actualizat
              } 
            : r
        ))
        
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nu exista bonuri inregistrate
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showUserColumn && (
                <TableHead className="text-foreground font-semibold whitespace-nowrap">Nume</TableHead>
              )}
              <TableHead className="text-foreground font-semibold whitespace-nowrap">Suma</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap">Magazin</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap">Data</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap">Nr. Bon</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap">Card Firma</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap bg-green-100 dark:bg-green-900/30">Avans spre Decontare</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap bg-green-50 dark:bg-green-900/20">Data Avans</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap bg-gray-100 dark:bg-gray-800">Observatii Lucrare</TableHead>
              <TableHead className="text-foreground font-semibold whitespace-nowrap text-center">Poza</TableHead>
              {isBoss && <TableHead className="text-foreground font-semibold whitespace-nowrap text-center">Actiuni</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id} className="hover:bg-muted/30">
                {showUserColumn && (
                  <TableCell className="font-medium text-foreground">
                    <button
                      onClick={() => {
                        // Extrage luna si anul din data bonului (format DD.MM.YYYY)
                        const dateParts = receipt.date.split('.')
                        let month = ''
                        let year = ''
                        if (dateParts.length === 3) {
                          month = dateParts[1] // Luna
                          year = dateParts[2] // Anul
                        }
                        const link = document.createElement('a')
                        link.href = `/api/generate-pdf?userName=${encodeURIComponent(receipt.userName)}&month=${month}&year=${year}`
                        link.download = `decont-${receipt.userName}-${month}-${year}.html`
                        link.click()
                      }}
                      className="flex items-center gap-1 hover:text-primary hover:underline cursor-pointer"
                      title="Click pentru a descarca decontul PDF pentru luna acestui bon"
                    >
                      {receipt.userName}
                      <FileText className="w-3 h-3 opacity-50" />
                    </button>
                  </TableCell>
                )}
                <TableCell className="text-foreground font-semibold text-accent">
                  {editingId === receipt.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="w-24 h-8"
                    />
                  ) : (
                    (receipt.amount || 0).toFixed(2)
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  {editingId === receipt.id ? (
                    <Input
                      value={editForm.storeName}
                      onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                      className="w-32 h-8"
                    />
                  ) : (
                    receipt.storeName
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  {editingId === receipt.id ? (
                    <Input
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-28 h-8"
                      placeholder="DD.MM.YYYY"
                    />
                  ) : (
                    receipt.date
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {editingId === receipt.id ? (
                    <Input
                      value={editForm.receiptNumber}
                      onChange={(e) => setEditForm({ ...editForm, receiptNumber: e.target.value })}
                      className="w-24 h-8"
                    />
                  ) : (
                    receipt.receiptNumber
                  )}
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {receipt.cardFirma || '-'}
                </TableCell>
                <TableCell 
                  className="text-foreground"
                  style={receipt.modifiedByColor ? { 
                    backgroundColor: `${receipt.modifiedByColor}20`,
                    borderLeft: `3px solid ${receipt.modifiedByColor}`
                  } : { backgroundColor: 'rgb(240 253 244)' }}
                >
                  {/* Avans spre Decontare - doar Boss si Stelian pot edita */}
                  {canEditAvans && editingField?.id === receipt.id && editingField?.field === 'avansDecont' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        className="w-24 h-7 text-sm"
                        placeholder="suma in RON"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={saveFieldEdit}
                        disabled={savingField}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={cancelFieldEdit}
                        disabled={savingField}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : canEditAvans ? (
                    <div>
                      <button
                        onClick={() => startFieldEdit(receipt.id, 'avansDecont', receipt.avansDecont || '')}
                        className="w-full text-left hover:bg-green-100 dark:hover:bg-green-800/20 px-2 py-1 rounded cursor-pointer min-h-[28px]"
                        title="Click pentru a edita"
                      >
                        {receipt.avansDecont || '-'}
                      </button>
                      {receipt.modifiedBy && (
                        <div className="text-xs px-2 mt-1 flex items-center gap-1" style={{ color: receipt.modifiedByColor }}>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: receipt.modifiedByColor }}
                          />
                          {receipt.modifiedBy}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="px-2 py-1">{receipt.avansDecont || '-'}</span>
                      {receipt.modifiedBy && (
                        <div className="text-xs px-2 mt-1 flex items-center gap-1" style={{ color: receipt.modifiedByColor }}>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: receipt.modifiedByColor }}
                          />
                          {receipt.modifiedBy}
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-foreground bg-green-50/50 dark:bg-green-900/10">
                  {/* Data Avans - doar Boss si Stelian pot edita */}
                  {canEditAvans && editingField?.id === receipt.id && editingField?.field === 'avansDate' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        className="w-36 h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={saveFieldEdit}
                        disabled={savingField}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={cancelFieldEdit}
                        disabled={savingField}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : canEditAvans ? (
                    <button
                      onClick={() => startFieldEdit(receipt.id, 'avansDate', receipt.avansDate || '')}
                      className="w-full text-left hover:bg-green-100 dark:hover:bg-green-800/20 px-2 py-1 rounded cursor-pointer min-h-[28px]"
                      title="Click pentru a edita data avansului"
                    >
                      {receipt.avansDate || '-'}
                    </button>
                  ) : (
                    <span className="px-2 py-1">{receipt.avansDate || '-'}</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground bg-gray-50 dark:bg-gray-800/50">
                  {editingField?.id === receipt.id && editingField?.field === 'observatiiLucrare' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        className="w-40 h-7 text-sm"
                        placeholder="Observatii..."
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={saveFieldEdit}
                        disabled={savingField}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={cancelFieldEdit}
                        disabled={savingField}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startFieldEdit(receipt.id, 'observatiiLucrare', receipt.observatiiLucrare || '')}
                      className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-1 rounded cursor-pointer min-h-[28px]"
                      title="Click pentru a edita"
                    >
                      {receipt.observatiiLucrare || '-'}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {/* Butonul de editare completa (creion) doar pentru admini cu canEditAllFields */}
                    {canEditAllFields && editingId === receipt.id ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => saveEditing(receipt.id)}
                          disabled={saving}
                          className="text-accent hover:text-accent"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={cancelEditing}
                          disabled={saving}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : canEditAllFields && editingId === null ? (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => startEditing(receipt)}
                        title="Editeaza toate campurile"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : null}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedImage(receipt.imageUrl)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">
                            Bon - {receipt.storeName} - {receipt.date}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <img
                            src={receipt.imageUrl || "/placeholder.svg"}
                            alt="Bon fiscal"
                            className="w-full max-h-[70vh] object-contain rounded-lg"
                          />
                        </div>
                        {canDownload && (
                          <div className="mt-4 flex justify-end">
                            <Button asChild>
                              <a 
                                href={receipt.imageUrl} 
                                download={`bon-${receipt.storeName}-${receipt.date}.jpg`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Descarca
                              </a>
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    {canDownload && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        asChild
                      >
                        <a 
                          href={receipt.imageUrl} 
                          download={`bon-${receipt.storeName}-${receipt.date}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
                {isBoss && (
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      disabled={deletingReceipt === receipt.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export default ReceiptsTable
